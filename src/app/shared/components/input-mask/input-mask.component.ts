import { forwardRef, Component, ViewChild, ElementRef, HostListener, Input, Output, Renderer2, SimpleChanges } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, COMPOSITION_BUFFER_MODE, FormControl } from '@angular/forms';
import { createNumberMask } from './createNumberMask';

String;
import {
    getSafeRawValue,
    processCaretTraps,
    safeSetSelection,
    adjustCaretPosition,
    convertMaskToPlaceholder,
    conformToMask,
    InputMaskOptions
} from './utilities';

export interface InputMaskGenerator {
    generate: (value: string) => string;
}

export interface MaskOptions {
    keepMask?: boolean,
    prefix?: string,
    suffix?: string,
    generator?: InputMaskGenerator
}

@Component({
    selector: 'input-mask',
    template: `
    <input [placeholder]="placeholder || ''" (blur)="onTouched()" #instance class="form-control" [disabled]="disabled" type="text">
    `,
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => InputMaskComponent),
            multi: true
        }
    ],
    host: {
        '(input)': '_handleInput($event.target.value)'
    },
})
export class InputMaskComponent implements ControlValueAccessor {
    @ViewChild('instance') instance: ElementRef;

    static readonly ALPHA = 'A'
    static readonly NUMERIC = '0';
    static readonly ALPHANUMERIC = 'S';
    private static readonly REGEX_MAP = new Map([
        [InputMaskComponent.ALPHA, /[A-Za-z]/],
        [InputMaskComponent.NUMERIC, /\d/],
        [InputMaskComponent.ALPHANUMERIC, /[A-Za-z]|\d/],
    ]);

    public static DEFAULT_MASKS = new Map([
        ['number', createNumberMask]
    ]);

    private value: string = null;
    private rawValue: string;
    private config: InputMaskOptions = new InputMaskOptions({});

    disabled: boolean = false;

    private state = {
        previousConformedValue: '',
        previousPlaceholder: ''
    }


    @Input()
    placeholder =  '';

    private _mask: any = [];
    @Input()
    public set mask(value: any) {
        if (Array.isArray(value)) {
            this._mask = value;
            this.config.placeholder = convertMaskToPlaceholder(value, this.config.placeholderChar);
        } else if (typeof value === 'object') {
            if (InputMaskComponent.DEFAULT_MASKS.has(value.type)) {
                let fn = InputMaskComponent.DEFAULT_MASKS.get(value.type);
                this._mask = fn(value.options);
            }
        }
    }

    public get mask() {
        return this._mask;
    }


    ngOnChanges(changes: SimpleChanges) {
        this.update(this.instance.nativeElement.value);
    }

    private _options = {};
    @Input()
    set options(options: Partial<InputMaskOptions>) {
        this.config.update(options);
    }

    constructor(private _renderer: Renderer2) {
    }

    onChange = (_: any) => { };
    registerOnChange(fn) {
        this.onChange = fn;
    }

    onTouch = () => { }
    registerOnTouched(fn) {
        this.onTouch = fn;
    }

    onTouched() {
        this.onTouch();
    }

    writeValue(value: any) {
        const normalizedValue = value == null ? '' : value;
        this._renderer.setProperty(this.instance, 'value', normalizedValue);
        this.update(value);
    }

    setDisabledState?(isDisabled: boolean) {
        this.disabled = isDisabled;
    }

    public _handleInput(value: string): void {
        this.update(value);
        this.onTouched();
        value = this.instance.nativeElement.value;
        this.updateValue(value);
    }

    private updateValue(value: string) {
        if (!this.config.keepMask) {
            value = InputMaskComponent.unmask(value, this.mask, this.config);
        }
        this.onChange(value);
    }

    update(newValue: string) {
        let mask = this.mask;
        this.rawValue = newValue;
        if (mask === false || !newValue) {
            if (this.instance.nativeElement.value == newValue) {
                this.instance.nativeElement.value = newValue;
            }

            return;
        }

        const safeRawValue = getSafeRawValue(newValue);
        this.config.currentCaretPosition = this.instance.nativeElement.selectionEnd;
        this.config.previousConformedValue = this.state.previousConformedValue;

        const previousPlaceholder = this.state.previousPlaceholder;

        let caretTrapIndexes;

        if (Array.isArray(mask)) {
            this.config.placeholder = convertMaskToPlaceholder(mask, this.config.placeholderChar);
        }

        if (typeof mask == 'function') {
            mask = mask(safeRawValue, this.config);
            if (mask === false) {
                if (this.instance.nativeElement.value == newValue) {
                    this.instance.nativeElement.value = newValue;
                }

                this.updateValue(newValue);
                return;
            }

            const { maskWithoutCaretTraps, indexes } = processCaretTraps(mask);
            mask = maskWithoutCaretTraps;
            caretTrapIndexes = indexes;
            this.config.placeholder = convertMaskToPlaceholder(mask, this.config.placeholderChar);
        }
        const { conformedValue } = conformToMask(safeRawValue, mask, this.config);
        const finalConformedValue = conformedValue;
        const adjustedCaretPosition = adjustCaretPosition({
            previousConformedValue: this.config.previousConformedValue,
            previousPlaceholder,
            conformedValue: finalConformedValue,
            placeholder: this.config.placeholder,
            rawValue: safeRawValue,
            currentCaretPosition: this.config.currentCaretPosition,
            placeholderChar: this.config.placeholderChar,
            indexesOfPipedChars: [],
            caretTrapIndexes
        });



        const inputValueShouldBeEmpty = finalConformedValue === this.config.placeholder && adjustedCaretPosition === 0
        const emptyValue = this.config.showMask ? this.config.placeholder : '';
        const inputElementValue = (inputValueShouldBeEmpty) ? emptyValue : finalConformedValue;

        this.state.previousConformedValue = inputElementValue;
        this.state.previousPlaceholder = this.config.placeholder;

        if (this.instance.nativeElement.value == inputElementValue) {
            return;
        }

        this.instance.nativeElement.value = inputElementValue;
        safeSetSelection(this.instance.nativeElement, adjustedCaretPosition);
    }

    private static unmask(maskedValue: string, mask: any, config: InputMaskOptions): string {
        if (typeof mask == 'function') {
            mask = mask(maskedValue, config);
            const { maskWithoutCaretTraps, indexes } = processCaretTraps(mask);
            mask = maskWithoutCaretTraps;
        }

        let maskLen = (mask && mask.length) || 0;
        return maskedValue.split('').filter(
            (currChar, idx) => {
                //console.log(`${currChar} : ${mask[idx] instanceof RegExp} ${ currChar !== placeholder}`);
                return (idx < maskLen) && (mask[idx] instanceof RegExp || mask[idx] instanceof String) && (currChar !== config.placeholderChar);
            }
        ).join('');
    }
}