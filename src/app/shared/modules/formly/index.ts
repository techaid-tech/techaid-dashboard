
import { NgModule, ModuleWithProviders } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from "@angular/router";
import { NgSelectModule } from '@ng-select/ng-select';
import { ReactiveFormsModule, FormControl } from "@angular/forms";
import { FormlyModule, ConfigOption } from '@ngx-formly/core';
import { FormlyBootstrapModule, FormlyFieldInput } from '@ngx-formly/bootstrap';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { PicFormlyWrapperFormField } from './wrapper/form-field.wrapper';
import { ChoiceInput } from './components/choice.component';
import { PlaceInput } from './components/place.component';
import { DateInput } from './components/date.component';
import { DateTimeInput, DateTimeInputWidget } from './components/datetime.component';
import { FileInput } from './components/file.component';
import { PicUploaderModule, FileWidgetComponent } from '@app/shared/modules/uploader';
import { MaskedInput } from './components/input-mask.component';
import { PicSharedModule } from '@app/shared';
import { GooglePlaceModule } from "ngx-google-places-autocomplete";
import { GalleryInput } from './components/gallery.component';
import { CKEditorModule } from 'ckeditor4-angular';
import { RichTextComponent } from './components/richtext.component';
import { RepeatTypeComponent } from './components/repeat.component';

export function wrongFileValidator(c: FormControl, field) {
    let match = field.templateOptions.match;
    let errors = [];

    if (c.value && c.value.file && c.value.file.name) {
        if (match && match.name && !match.disabled) {
            let val = FileWidgetComponent.normalizeValue(c.value).name;
            if (val && val.length) {
                let value = FileWidgetComponent.normalize(val);
                let cmp = FileWidgetComponent.normalize(match.name);
                let ldist = FileWidgetComponent.lavenshtein(cmp, value.substring(0, cmp.length));

                errors.push(`<div><kbd>${match.name}</kbd></div>`);

                //console.log(`'${cmp}' <=> '${value.substring(0, cmp.length)}' | ${ldist}`);

                if (ldist > match.limit && match.alternatives && match.alternatives.length) {

                    Array.from(new Set(match.alternatives)).forEach((m: string) => {
                        errors.push(`<div><kbd>${m}</kbd></div>`);
                        let cp = FileWidgetComponent.normalize(m);
                        let v = FileWidgetComponent.lavenshtein(cp, value.substring(0, cp.length));
                        //console.log(`'${cp}' <=> '${value.substring(0, cp.length)}' | ${v}`);
                        if (v <= match.limit) {
                            ldist = v;
                            cmp = cp;
                        }
                    });
                }


                let is_valid = ldist <= match.limit;

                if (is_valid) {
                    field.templateOptions.warining = {};
                } else {
                    errors = Array.from(new Set(errors));
                    field.templateOptions.warning = {
                        message: `
                        <p>Invalid file <code>${c.value.name}</code> selected.</p>
                        <p>Was Expecting:</p>
                        <hr />
                        ${errors.join('')}                    
                        `,
                        title: 'Accept file differences',
                        callback: () => {
                            match.disabled = true;
                        }
                    }
                }

                return is_valid;
            }
        }
    } else {
        field.templateOptions.warning = {};
        if (match && match.disabled) {
            match.disabled = false;
        }
    }

    return true;
}

export function wrongFileValidatorMessage(c, field) {
    let val = FileWidgetComponent.normalizeValue(field.formControl.value).name;
    return `You might have possibly selected a wrong file (${val}). The file names are significantly different.
    If you are sure you have the correct file, click on the button above to accept it as is.`
}

export function wrongExtensionValidator(c: FormControl, field) {
    if (c.value) {
        let value = FileWidgetComponent.normalizeValue(c.value);
        let extensions = field.templateOptions.extensions;
        if (extensions && extensions.length && value.name) {
            let ext = FileWidgetComponent.extname(value.name);
            if (ext.length && extensions.indexOf(ext) == -1) {
                return false;
            }
        }
    }

    return true;
}

export function wrongExtensionValidatorMessage(c: FormControl, field) {
    let val = FileWidgetComponent.normalizeValue(field.formControl.value);
    let extensions = field.templateOptions.extensions;
    let ext = FileWidgetComponent.extname(val.name);
    return `Invalid file extension "${ext}" specified. Only valid file extensions are "${extensions.join(',')}"`

}

export function emptyFileValidator(c: FormControl, field) {
    let val = c.value;
    if (val) {
        if ((typeof val.size == 'number') && val.size <= 0) {
            return false;
        }
    }

    return true;
}

export function percentageValidator(c: FormControl, field) {
    if (c.value && c.value.toString().trim()) {
        return /^-?[0-9]+\.?[0-9]+%?$/.test(c.value.toString());
    }

    return true;
}

export function numberValidator(c: FormControl, field) {
    if (c.value && c.value.toString().trim()) {
        return /^-?[0-9]+(\.[0-9]+)?$/.test(c.value.toString());
    }

    return true;
}

export const FORMLYCONFIG : ConfigOption = {
    types: [
        { name: 'folder', extends: 'file' },
        {
            name: 'mask',
            component: MaskedInput,
            wrappers: ['form-field'],
            defaultOptions: {
                templateOptions: {
                    mask: {
                        value: [],
                        options: {
                            keepMask: false
                        }
                    }
                }
            }
        },
        {
            name: 'percentage',
            component: MaskedInput,
            wrappers: ['form-field'],
            defaultOptions: {
                templateOptions: {
                    mask: {
                        options: {
                            keepMask: true,
                            showMask: false
                        },
                        value: {
                            type: 'number',
                            options: {
                                allowDecimal: true,
                                includeThousandsSeparator: false,
                                integerLimit: 1,
                                requireDecimal: true,
                                suffix: '%'
                            }
                        }
                    }
                },
                validators: {
                    pattern: percentageValidator
                }
            }
        },
        {
            name: 'number',
            component: MaskedInput,
            wrappers: ['form-field'],
            defaultOptions: {
                templateOptions: {
                    mask: {
                        options: {
                            keepMask: false,
                            showMask: true
                        },
                        value: {
                            type: 'number',
                            options: {
                                allowDecimal: true,
                                includeThousandsSeparator: true
                            }
                        }
                    }
                },
                validators: {
                    pattern: numberValidator
                }
            }
        },
        {
            name: 'choice',
            component: ChoiceInput,
            wrappers: ['form-field'],
            defaultOptions: {
                templateOptions: {
                    options: [],
                    multiple: false,
                    allowClear: true,
                    closeOnSelect: true,
                    bindLabel: "label",
                    bindValue: "value",
                    searchable: false,
                    inline: false,
                    placeholder: ""
                }
            }
        },
        {name: 'repeat', component: RepeatTypeComponent },
        {
            name: 'richtext',
            component: RichTextComponent,
            wrappers: ['form-field'],
            defaultOptions: {
                templateOptions: {
                    placeholder: "",
                    height: "100%",
                    htmlEdit: true,
                    editorConfig: {
                        height: 500,
                        allowedContent: true,
                        contentsCss: "https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css"
                    },
                    type: "divarea", // classic | divarea | inline
                    html: false,
                }
            }
        },
        {
            name: 'place',
            component: PlaceInput,
            wrappers: ['form-field'],
            defaultOptions: {
                templateOptions: {
                    placeholder: "",
                    mapOptions: {
                        componentRestrictions: { country: 'GB' },
                    }
                }
            }
        },
        {
            name: 'gallery',
            component: GalleryInput,
            wrappers: ['form-field'],
            defaultOptions: {
                templateOptions: {
                    placeholder: "",
                    prefix: ""
                }
            }
        },
        {
            name: 'date',
            component: DateInput,
            wrappers: ['form-field'],
            defaultOptions: {
                templateOptions: {
                    placeholder: "yyyy-mm-dd",
                    buttonClass: "input-group-text",
                    displayMonths: 1,
                    navigation: "select",
                    inline: true,
                    showWeekNumbers: false,
                    input_formats: [
                        'YYYY-MM-DD', 'YYYY/MM/DD', 'YYYY.MM.DD', 'YYYY MM DD',
                        'DD-MM-YYYY', 'DD/MM/YYYY', 'DD.MM.YYYY', 'DD MM YYYY',
                        'DD MMM YYYY', 'DD MMMM YYYY', 'MMM YYYY', 'MMMM YYYY',
                        'YYYYMMDD', 'DDMMYYYY'
                    ],
                    output_format: 'default'
                }
            }
        },
        {
            name: 'datetime',
            component: DateTimeInput,
            wrappers: ['form-field'],
            defaultOptions: {
                templateOptions: {
                    placeholder: "yyyy-mm-dd",
                    buttonClass: "input-group-text",
                    displayMonths: 1,
                    navigation: "select",
                    inline: true,
                    time: {
                        seconds: false,
                        meridian: false,
                        spinners: true,
                        hourStep: 1,
                        minuteStep: 1,
                        secondStep: 1,
                    },
                    showWeekNumbers: false,
                    input_formats: [
                        'YYYY-MM-DD', 'YYYY/MM/DD', 'YYYY.MM.DD', 'YYYY MM DD',
                        'DD-MM-YYYY', 'DD/MM/YYYY', 'DD.MM.YYYY', 'DD MM YYYY',
                        'DD MMM YYYY', 'DD MMMM YYYY', 'MMM YYYY', 'MMMM YYYY',
                        'YYYYMMDD', 'DDMMYYYY'
                    ],
                    output_format: 'default'
                }
            }
        },
        {
            name: 'file',
            component: FileInput,
            wrappers: ['form-field'],
            defaultOptions: {
                templateOptions: {
                    extensions: [],
                    match: {}
                },
                validators: {
                    wrong_file: {
                        expression: wrongFileValidator,
                        message: wrongFileValidatorMessage
                    },
                    wrong_extension: {
                        expression: wrongExtensionValidator,
                        message: wrongExtensionValidatorMessage
                    },
                    empty_file: {
                        expression: emptyFileValidator,
                        message: `The selected file is empty. Please select a valid file.`
                    }
                }
            }
        }
    ],
    wrappers: [
        { name: 'form-field', component: PicFormlyWrapperFormField }
    ],
    validationMessages: [
        { name: 'required', message: 'This field is required' },
        { name: 'pattern', message: "This field doesn't match the required pattern" }
    ]
}

@NgModule({
    imports: [
        CommonModule,
        ReactiveFormsModule,
        NgSelectModule,
        FormlyModule.forChild(FORMLYCONFIG),
        FormlyBootstrapModule,
        PicUploaderModule,
        PicSharedModule,
        GooglePlaceModule,
        NgbModule,
        CKEditorModule,
    ],
    declarations: [
        PicFormlyWrapperFormField,
        ChoiceInput,
        DateInput,
        DateTimeInput,
        FileInput,
        MaskedInput,
        DateTimeInputWidget,
        PlaceInput,
        GalleryInput,
        RichTextComponent,
        RepeatTypeComponent
    ],
    exports: [
        PicFormlyWrapperFormField,
        ChoiceInput,
        DateInput,
        DateTimeInput,
        FileInput,
        FormlyModule,
        FormlyBootstrapModule,
        ReactiveFormsModule,
        MaskedInput,
        DateTimeInputWidget
    ]
})
export class PicFormModule {
    static forRoot() {
        return {
            ngModule: PicFormModule,
            providers: [
            ]
        }
    }
}

