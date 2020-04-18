import { NgZone } from '@angular/core';
import { FormlyFieldConfig, FormlyFormOptions } from '@ngx-formly/core';
import { HashUtils } from '@app/shared/utils/hash_utils';
import * as _ from 'lodash';
import { debounceTime } from 'rxjs/operators';
import { Subscription, } from 'rxjs';

export class FormInterpolater {
    public model: any = {};
    public options: FormlyFormOptions = {
        formState: {
            disabled: false,
            interpolate: {
                vars: {},
                state: {}
            }
        }
    };

    formSubscription: Subscription;

    private _variables = {};
    set variables(variables: any) {
        this._variables = variables;
        this.updateVarState();
    }

    get variables() {
        return this._variables;
    }

    private fieldMap: { [key: string]: FormlyFieldConfig };
    private _fields: Array<FormlyFieldConfig> = [];
    set fields(fields) {
        fields = fields || [];
        this._fields = fields;
        this.fieldMap = this.fieldHash(this._fields);

        let fieldMap = HashUtils.flattenHash(this.fieldMap);
        let dynamic = {};
        this.options.formState.interpolate = {};

        for (let key in fieldMap) {
            let vars = HashUtils.tokenExtractVars(fieldMap[key]);
            if (vars.length) {
                vars.forEach(v => {
                    if (!dynamic[v]) dynamic[v] = [];
                    dynamic[v].push({ value: fieldMap[key], variable: key, id: key.replace(/([^\.]+).*/, '$1') });
                });
            }
        }

        if (this.formSubscription) { this.formSubscription.unsubscribe() }
        this.formSubscription = null;

        for (let key in dynamic) {
            const formField = this.fieldMap[key];
            if (formField) {
                if (!formField.hooks) { formField.hooks = {} }
                const previous = formField.hooks.onInit;
                formField.hooks.onInit = (field) => {
                    var { form, model, options } = field;
                    if (previous) {
                        previous(field);
                    }
                    let sub = form.get(field.key)
                        .valueChanges.pipe(debounceTime(500))
                        .subscribe(v => {
                            let evaluated = {};
                            let vars = _.merge({}, this.variables, this.model);
                            vars[key] = v;
                            this.interpolateFields(key, v, vars, evaluated);
                        });

                    if (!this.formSubscription) {
                        this.formSubscription = sub;
                    } else {
                        this.formSubscription.add(sub);
                    }
                };
            }
        }

        this.options.formState.interpolate.vars = dynamic;
        this.options.formState.interpolate.state = {};
        this.updateVarState();
    }

    get fields() {
        return this._fields;
    }

    updateVarState() {
        let evaluated = {};
        let vars = _.merge({}, this.variables, this.model);
        for (let key in this.options.formState.interpolate.vars) {
            let value = HashUtils.dotNotation(vars, key);
            this.interpolateFields(key, value, vars, evaluated);
        }
    }

    interpolateFields(key: string, value: any, vars: any, evaluated: any) {
        if (value === this.options.formState.interpolate.state[key]) return;
        this.options.formState.interpolate.state[key] = value;
        let props = this.options.formState.interpolate.vars[key];
        if (props && props.length) {
            props.forEach(prop => {
                if (!evaluated[prop.variable]) evaluated[prop.variable] = prop.value;
                evaluated[prop.variable] = HashUtils.interpolate(evaluated[prop.variable], vars, { ignoreDefaults: true });
                let kys = prop.variable.split('.');
                let val = kys.pop();
                let ref = HashUtils.dotNotation(this.fieldMap, kys.join('.'));

                let [__, arrKey, arrIndex] = val.match(/^([^\[]+)\s*\[([\\*0-9]+)\]\s*$/) || [null, null, null];
                if (arrIndex) {
                    ref = HashUtils.dotNotation(ref, arrKey);
                    val = +arrIndex;
                }

                if (!HashUtils.tokenExtractVars(evaluated[prop.variable]).length) {
                    if (ref) {
                        let last_val = ref[val];
                        ref[val] = evaluated[prop.variable];
                        if (val == 'defaultValue' && ref.formControl) {
                            let vl = ref.formControl.value;
                            if ((last_val === vl || !vl) && ref[val]) {
                                ref.formControl.setValue(ref[val]);
                            }
                        }
                    }
                } else {
                    ref[val] = HashUtils.interpolate(evaluated[prop.variable], vars);
                }
            });
        }
    }

    fieldHash(fields: Array<FormlyFieldConfig>) {
        var data = {}
        fields.forEach(f => {
            if (f.fieldGroup) {
                data = { ...data, ...this.fieldHash(f.fieldGroup) }
            } else if (f.key) {
                data[f.key] = f;
            }
        });

        return data;
    }
}
