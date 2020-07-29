
import { NgModule, ModuleWithProviders } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { FormlyModule, ConfigOption } from '@ngx-formly/core';
import { FormlyBootstrapModule, FormlyFieldInput } from '@ngx-formly/bootstrap';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { AppFormlyWrapperFormField } from './wrapper/form-field.wrapper';
import { ChoiceInput } from './components/choice.component';
import { PlaceInput } from './components/place.component';
import { DateInput } from './components/date.component';
import { DateTimeInput, DateTimeInputWidget } from './components/datetime.component';
import { MaskedInput } from './components/input-mask.component';
import { AppSharedModule } from '@app/shared';
import { GooglePlaceModule } from 'ngx-google-places-autocomplete';
import { GalleryInput } from './components/gallery.component';
import { CKEditorModule } from 'ckeditor4-angular';
import { RichTextComponent } from './components/richtext.component';
import { RepeatTypeComponent } from './components/repeat.component';

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

export const FORMLYCONFIG: ConfigOption = {
    types: [
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
                    bindLabel: 'label',
                    bindValue: 'value',
                    searchable: false,
                    inline: false,
                    placeholder: ''
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
                    placeholder: '',
                    height: '100%',
                    htmlEdit: true,
                    editorConfig: {
                        height: 500,
                        allowedContent: true,
                        contentsCss: 'https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0/css/bootstrap.min.css'
                    },
                    type: 'divarea', // classic | divarea | inline
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
                    placeholder: '',
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
                    placeholder: '',
                    prefix: ''
                }
            }
        },
        {
            name: 'date',
            component: DateInput,
            wrappers: ['form-field'],
            defaultOptions: {
                templateOptions: {
                    placeholder: 'yyyy-mm-dd',
                    buttonClass: 'input-group-text',
                    displayMonths: 1,
                    navigation: 'select',
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
                    placeholder: 'yyyy-mm-dd',
                    buttonClass: 'input-group-text',
                    displayMonths: 1,
                    navigation: 'select',
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
    ],
    wrappers: [
        { name: 'form-field', component: AppFormlyWrapperFormField }
    ],
    validationMessages: [
        { name: 'required', message: 'This field is required' },
        { name: 'pattern', message: 'This field doesn\'t match the required pattern' }
    ]
};

@NgModule({
    imports: [
        CommonModule,
        ReactiveFormsModule,
        NgSelectModule,
        FormlyModule.forChild(FORMLYCONFIG),
        FormlyBootstrapModule,
        AppSharedModule,
        GooglePlaceModule,
        NgbModule,
        CKEditorModule,
    ],
    declarations: [
        AppFormlyWrapperFormField,
        ChoiceInput,
        DateInput,
        DateTimeInput,
        MaskedInput,
        DateTimeInputWidget,
        PlaceInput,
        GalleryInput,
        RichTextComponent,
        RepeatTypeComponent
    ],
    exports: [
        AppFormlyWrapperFormField,
        ChoiceInput,
        DateInput,
        DateTimeInput,
        FormlyModule,
        FormlyBootstrapModule,
        ReactiveFormsModule,
        MaskedInput,
        DateTimeInputWidget
    ]
})
export class AppFormModule {
    static forRoot(): ModuleWithProviders<AppFormModule> {
    return {
        ngModule: AppFormModule,
        providers: []
    };
}
}

