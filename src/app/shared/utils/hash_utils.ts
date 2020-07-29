import * as _ from "lodash";
import * as moment from 'moment';
import { DateUtils } from './date_utils';

export interface Token {
    start: number,
    stop: number,
    name: string,
    content: string,
    mode?: string,
    embedded?: boolean,
    type?: 'variable' | 'function',
    quote?: string,
    quoteMode?: string,
    functionMode?: string,
    args?: any[],
    default?: string | Token
}


export function isObject(obj) {
    return obj && (typeof obj === "object") && obj.constructor == Object;
}

export function isNull(obj) {
    return obj === null || obj === undefined;
}

export function isBlank(obj) {
    return isNull(obj) || (typeof obj === 'string' && !obj.trim().length) || (Array.isArray(obj) && !obj.length) || (isObject(obj) && Object.keys(obj).length);
}

export function escapeRegExp(string) {
    return string.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

export interface HashProcessor {
    [key: string]: (args: string[], options?: any) => any;
}

export function flattenDeep(arr1) {
    return arr1.reduce((acc, val) => Array.isArray(val) ? acc.concat(flattenDeep(val)) : acc.concat(val), []);
}

export class HashUtils {

    static blank(obj) {
        return isBlank(obj);
    }
    static processors: HashProcessor = {
        "var": (args: string[], options) => {
            let data = null;
            for (let arg of args) {
                data = HashUtils.dotNotation(options.variables, arg) || HashUtils.dotNotation(options.env, arg);
                if (data) break;
            }

            return data;
        },
        "empy.array": (args: string[], options) => {
            return [];
        },
        "empy.object": (args: string[], options) => {
            return {};
        },
        "random.int": (args: string[]) => {
            let [min, max] = [0, 1000000];
            if (args[0]) min = +args[0];
            if (args[1]) max = +args[1];
            return Math.floor(Math.random() * (max - min + 1)) + min;
        },
        "random.value": () => {
            return Math.random();
        },
        "time.now": () => {
            return new Date();
        },
        "date.today": () => {
            return moment().startOf('day').toDate();
        },
        "self": (args: string[], options: any) => {
            return HashUtils.dotNotation(options.env, args[0]);
        },
        "date.format": (args: string[]) => {
            let [date, format] = args;
            let dt = null;

            if (typeof date == 'string') {
                for (let fmt of DateUtils.options.formats) {
                    let m = moment(date.substring(0, fmt.length), fmt, true);
                    if (m.isValid()) {
                        dt = m;
                        break;
                    }
                }
            }

            if (!dt) dt = moment(date);

            if (dt.isValid()) {
                return dt.format(format);
            }

            return null;
        },
        "date.math": (args: string[]) => {
            let [date, now] = args;
            let opts: any = {};
            if (now) {
                opts.now = now;
            }

            return DateUtils.math(date, opts);
        },
        "date.parse": (args: string[]) => {
            let [expr, format, strict] = args;

            let m = moment(expr.substring(0, format.length), format, !!strict);
            if (m.isValid()) {
                return m.toDate();
            }

            return null;
        },
    };

    static mapToProperties(properties: any, hash: any, prefix = '') {
        for (let key in hash) {
            if (hash.hasOwnProperty(key)) {
                let value = hash[key];
                if (Array.isArray(value)) {
                    let data = {};
                    for (let i = 0; i < value.length; i++) {
                        data[`${key}[${i}]`] = value[i];
                    }
                    HashUtils.mapToProperties(properties, data, prefix);
                } else if (isObject(value)) {
                    HashUtils.mapToProperties(properties, value, `${prefix}${key}.`);
                } else {
                    properties[`${prefix}${key}`] = value;
                }
            }
        }

        return properties;
    }

    static setMapForKey(key: string, value: any, hash: any, options: any = {}) {
        let keys = [key];
        if (key.match(/^([a-zA-Z_\/\\-]+(\[\s*[0-9]+\s*\])?\.)*([a-zA-Z_\/\\-]+(\[\s*[0-9]+\s*\])?)$/)) {
            keys = key.split(".").filter(v => v.trim().length);
        }

        if (typeof value == 'string' && value == '{}') value = {};
        if (typeof value == 'string' && value == '[]') value = [];
        if (typeof value == 'string' && ['null', 'nil'].indexOf(value) > -1) value = null;

        if (options.stringify) {
            value = (value === null || value === undefined) ? 'null' : value.toString();
        }

        if (keys.length) {
            let hashMap = hash;
            for (let i = 0; i < keys.length; i++) {
                let k = keys[i];
                let [__, arrKey, arrIndex] = key.match(/^([^\[]+)\s*\[([\\*0-9]+)\]\s*$/) || [null, null, null];
                let isLast = (i == (keys.length - 1));

                if (arrIndex) {
                    if (!hashMap[arrKey]) hashMap[arrKey] = [];
                    if (!Array.isArray(hashMap[arrKey])) {
                        throw new Error(`Element ${arrKey} is not an array but a ${typeof hashMap[arrKey]}`);
                    }
                    if (isLast) {
                        hashMap[arrKey][+arrIndex] = value;
                    } else {
                        if (!hashMap[arrKey][+arrIndex]) hashMap[arrKey][+arrIndex] = {};
                        hashMap = hashMap[arrKey][+arrIndex];
                    }
                } else {
                    if (isLast) {
                        if (isObject(hashMap[k]) && isObject(value)) {
                            _.merge(hashMap[k], value);
                        } else {
                            if (!_.isEmpty(hashMap[k]) && _.isEmpty(value)) {
                                // do nothing
                            } else {
                                hashMap[k] = value;
                            }
                        }
                    } else {
                        if (!hashMap[k]) hashMap[k] = {};
                        if (!isObject(hashMap[k])) {
                            throw new Error(`Element ${k} is a ${typeof hashMap[k]} not a hash.`)
                        } else {
                            hashMap = hashMap[k];
                        }
                    }
                }
            }
        }

        return hash;
    }

    static flattenHash(...hashes): any {
        let properties = {};
        flattenDeep([].concat(...hashes)).forEach(data => {
            if (isObject(data)) {
                HashUtils.mapToProperties(properties, data, "")
            }
        });

        return properties;
    }

    static mergeHashes(...hashes): any {
        let properties = HashUtils.flattenHash(...hashes);
        let data = {};
        for (let key in properties) {
            HashUtils.setMapForKey(key, properties[key], data);
        }

        return data;
    }

    static dotNotation(data: any, key: string): any {
        if (isBlank(data)) {
            return null;
        }

        if (key.trim() == '*') {
            if (Array.isArray(data)) {
                return data;
            } else if (isObject(data)) {
                let results = [];
                for (let k in data) {
                    if (data.hasOwnProperty(k)) {
                        results.push(data[k]);
                    }
                }

                return results;
            } else {
                return null;
            }
        }

        if (isObject(data) && (key in data)) {
            let value = data[key];
            if (isObject(value)) {
                let children = _.keys(data).filter(k => k.startsWith(`${key}.`));
                if (children.length) {
                    let val = {};
                    children.forEach(k => {
                        val[k.replace(`${key}.`, '')] = data[k];
                    });

                    value = HashUtils.mergeHashes(val, value);
                }
            }

            return value;
        }

        let [__, arrKey, arrIndex] = key.match(/^([^\[]+)\s*\[([\\*0-9]+)\]\s*$/) || [null, null, null];
        if (arrIndex && arrIndex.length) {
            if (data[arrKey]) {
                if (arrIndex.trim() == '*') {
                    let value = data[arrKey];
                    if (isObject(value)) {
                        let results = [];
                        for (let k in value) {
                            if (value.hasOwnProperty(k)) {
                                results.push(value[k]);
                            }
                        }
                        return results;
                    } else {
                        return value;
                    }
                } else {
                    if (Array.isArray(data[arrKey])) {
                        return data[arrKey][+arrIndex];
                    }

                    return null;
                }
            }
        }



        let vars = key.split('.').filter(x => x.trim().length);
        let value = null;

        if (vars.length > 1) {
            let keys = Array(vars.length).fill(null).map((_, i) => vars.slice(0, i + 1).join('.'));
            let primaryKey = keys.find(k => {
                let [__, arrKey, arrIndex] = k.match(/^([^\[]+)\s*\[([\\*0-9]+)\]\s*$/) || [null, null, null];
                if (arrIndex && arrIndex.trim() == '*') {
                    return Array.isArray(data[k]) || isObject(data[k]);
                } else if (!arrIndex) {
                    return isObject(data[k]);
                } else {
                    return data[arrKey] && Array.isArray(data[arrKey]) && isObject(data[arrKey][+arrIndex]);
                }
            });

            if (primaryKey) {
                vars = vars.slice(keys.findIndex(v => v == primaryKey) + 1, vars.length);
                let [__, arrKey, arrIndex] = primaryKey.match(/^([^\[]+)\s*\[([\\*0-9]+)\]\s*$/) || [null, null, null];
                if (arrIndex && arrIndex.trim() == '*') {
                    value = data[arrKey];
                    if (isObject(value)) {
                        let results = [];
                        for (let k in value) {
                            if (value.hasOwnProperty(k)) {
                                results.push(value[k]);
                            }
                        }
                        value = results;
                    }
                } else {
                    value = (!arrIndex) ? data[primaryKey] : data[arrKey][arrIndex];
                }
            } else {
                value = HashUtils.dotNotation(data, vars.shift());
            }

            if (!Array.isArray(value)) {
                while (vars.length) {
                    value = HashUtils.dotNotation(value, vars.shift());
                    if (value == undefined || value == null || Array.isArray(value)) {
                        break;
                    }
                }
            }

            if (vars.length && Array.isArray(value)) {
                value = value.map(v => HashUtils.dotNotation(v, vars.join('.')))
            }

            if (isObject(value)) {
                let children = _.keys(data).filter(k => k.startsWith(`${key}.`));
                if (children.length) {
                    let val = {};
                    children.forEach(k => {
                        val[k.replace(`${key}.`, '')] = data[k];
                    });

                    value = HashUtils.mergeHashes(val, value);
                }
            }
        } else {
            if (isObject(data)) {
                let children = _.keys(data).filter(k => k.startsWith(`${key}.`));
                if (children.length) {
                    let val = {};
                    children.forEach(k => {
                        val[k.replace(`${key}.`, '')] = data[k];
                    });
                    value = HashUtils.mergeHashes(val, value);
                }
            }
        }

        return value;
    }

    static extractTokens(expression: string, config?: any): Token[] {
        let options = {
            escape: '\\',
            open: '#$',
            start: '{',
            close: '}',
            quotes: '"\'',
            functionOpen: '(',
            functionClose: ')'
        };

        if (config) {
            options = { ...options, ...config };
        }

        const OPEN = options.open;
        const START = options.start;
        const CLOSE = options.close;
        const ESCAPE = options.escape;
        const QUOTES = options.quotes;
        const STACK: Token[] = [];

        let tokens: Token[] = [];

        let mode = 'IGNORE';
        for (let index = 0; index < expression.length; index++) {
            let char = expression[index];
            let lastChar = (index > 0) ? expression[index - 1] : '';
            let nextChar = expression[index + 1] || '';
            let isEscaped = lastChar == ESCAPE;
            let last = STACK[STACK.length - 1];

            if (['IGNORE', 'OPEN_QUOTED'].indexOf(mode) == -1 && !isEscaped && QUOTES.indexOf(char) > -1) {
                last.quote = char;
                last.quoteMode = mode;
                mode = 'OPEN_QUOTED';
                continue;
            }

            if (isEscaped && last && mode !== 'OPEN_QUOTED') {
                let content = last.content.split("");
                content.pop();
                last.content = content.join("");
            }

            switch (mode) {
                case 'OPEN_QUOTED':
                    if (!isEscaped && char == last.quote) {
                        mode = last.quoteMode;
                        delete last.mode;
                        delete last.quoteMode;
                    } else {
                        last.content = last.content.concat(char);
                    }
                    break;

                case 'START':
                    if (char == START) {
                        mode = 'VARIABLE';
                    }
                    break;

                case 'FUNCTION':
                    if (options.functionClose.indexOf(char) > -1 && !isEscaped) {
                        mode = last.functionMode;
                        if (last.content.length) {
                            last.args.push(last.content);
                        }
                    } else if (char == ',' && !isEscaped) {
                        if (last.content.length) {
                            last.args.push(last.content);
                        }

                        last.content = "";
                    } else if (OPEN.indexOf(char) > -1 && !isEscaped && nextChar == START) {
                        let embedded: Token = {
                            start: index,
                            stop: -1,
                            name: "",
                            mode: 'FUNCTION',
                            content: "",
                            embedded: true,
                            type: "variable"
                        }

                        last.args.push(embedded);
                        last.content = "";
                        STACK.push(embedded);
                        mode = 'START';
                    } else {
                        last.content = last.content.concat(char);
                    }
                    break;

                case 'VARIABLE':
                    if (!isEscaped && char == ':') {
                        mode = 'DEFAULT';
                        last.default = "";
                        if (!last.name.length) last.name = last.content;
                        last.content = "";
                    } else {
                        if (CLOSE.indexOf(char) > -1 && !isEscaped) {
                            mode = last.mode;
                            delete last.mode;
                            if (!last.name.length) last.name = last.content;
                            last.stop = index;
                            last.content = "";
                            if (last.embedded) {
                                STACK.pop();
                            } else {
                                tokens.push(STACK.pop());
                            }
                        } else if (OPEN.indexOf(char) > -1 && !isEscaped && nextChar == START) {
                            STACK.push({
                                start: index,
                                stop: -1,
                                name: "",
                                mode: mode,
                                content: "",
                                type: "variable"
                            });

                            mode = 'START';
                        } else if (options.functionOpen.indexOf(char) > -1 && !isEscaped) {
                            last.name = last.content;
                            last.type = 'function';
                            last.functionMode = mode;
                            last.args = [];
                            last.content = "";
                            mode = 'FUNCTION';
                        } else {
                            last.content = last.content.concat(char);
                        }
                    }
                    break;

                case 'DEFAULT':
                    if (CLOSE.indexOf(char) > -1 && !isEscaped) {
                        mode = last.mode;
                        delete last.mode;
                        last.stop = index;
                        if (last.content.length) last.default = last.content;
                        delete last.content;
                        if (last.embedded) {
                            STACK.pop();
                        } else {
                            tokens.push(STACK.pop());
                        }
                    } else if (OPEN.indexOf(char) > -1 && !isEscaped && nextChar == START) {
                        last.default = {
                            start: index,
                            stop: -1,
                            name: "",
                            mode: mode,
                            content: "",
                            embedded: true,
                            type: 'variable'
                        };
                        last.content = "";
                        STACK.push(last.default);
                        mode = 'START';
                    } else {
                        last.content = last.content.concat(char);
                    }
                    break;

                case 'IGNORE':
                    if (OPEN.indexOf(char) > -1 && !isEscaped && nextChar == START) {
                        STACK.push({
                            start: index,
                            stop: -1,
                            name: "",
                            mode: mode,
                            content: "",
                            type: 'variable'
                        });
                        mode = 'START';
                    }

                    break;
            }
        }

        return tokens;
    }

    static interpolate(expression: any, variables: any, options: any = {}) {
        let default_options = {
            processors: {},
            variables: variables,
            env: variables,
            key: "",
        }

        options = { ...default_options, ...options };
        if (typeof expression === 'string') {
            let expr = `${expression}`;
            if (!(expression.indexOf('#{') > -1 || expression.indexOf('${') > -1)) {
                return expression;
            }

            let tokens = HashUtils.extractTokens(expression);
            for (let token of HashUtils.extractTokens(expression)) {
                let vr = expression.substring(token.start, token.stop + 1);
                let value = HashUtils.tokenValue(token, variables, options);
                let vars = HashUtils.tokenExtractVars(expression);
                let varsData = {};
                vars.forEach(v => {
                    let vval = HashUtils.dotNotation(variables, v) || HashUtils.dotNotation(options.env, v);
                    if (vval && HashUtils.tokenExtractVars(vval).indexOf(v) == -1) {
                        varsData[v] = vval;
                    }
                });

                if (!isBlank(varsData)) {
                    value = HashUtils.interpolate(value, variables, options);
                }

                if (!isNull(value)) {
                    if (expr == vr) {
                        return value;
                    } else {
                        expr = expr.replace(new RegExp(escapeRegExp(vr), 'g'), value.toString());
                    }
                }
            };

            return expr;
        } else if (Array.isArray(expression)) {
            return expression.map(v => HashUtils.interpolate(v, variables, options));
        } else if (isObject(expression)) {
            let currentKey = options.key;
            let data = {};

            for (let key of _.keys(expression)) {
                let value = expression[key];
                options.key = (isBlank(currentKey)) ? key : `${currentKey}.${key}`;
                let val = HashUtils.interpolate(value, variables, options);
                options.env[options.key] = val;
                data[key] = val;
            }

            options.key = currentKey;
            return data;
        } else {
            return expression;
        }
    }

    static tokenValue(token: Token, variables: any, options: any = {}): any {
        let val = null;

        if (token.type == 'variable') {
            val = HashUtils.dotNotation(variables, token.name);
            if (isBlank(val) && options.env) {
                val = HashUtils.dotNotation(options.env, token.name);
            }
        } else if (token.type == 'function') {
            let proc = (options.processors || {})[token.name] || HashUtils.processors[token.name];
            let args = [];

            for (let i = 0; i < token.args.length; i++) {
                let arg = token.args[i];
                if (isObject(arg) && ['variable', 'function'].indexOf(arg.type) > -1) {
                    arg = HashUtils.tokenValue(arg, variables, options);
                    if (isNull(arg)) {
                        args = null;
                        break;
                    }
                }

                let matches = `${arg}`.match(/\$([a-z0-9A-Z_.-]+)/g);
                if (matches && matches.length) {
                    for (let j = 0; j < matches.length; j++) {
                        let m = matches[j];
                        let [t, prop] = m.match(/\$([a-z0-9A-Z_.-]+)/) || [null, null];
                        let propVal = HashUtils.dotNotation(variables, prop) || HashUtils.dotNotation(options.env, prop);
                        if (isNull(propVal)) {
                            args = null;
                            break;
                        } else if (token == arg) {
                            arg = propVal;
                            break;
                        } else {
                            arg = arg.replace(new RegExp(escapeRegExp(t), 'g'), propVal.toString());
                        }
                    }
                }

                if (args == null) {
                    break;
                }

                if (!isBlank(arg)) {
                    arg = HashUtils.interpolate(arg, variables, options);
                }

                if (['null', 'nil', '_'].indexOf(arg) > -1) {
                    arg = null;
                }

                args.push(arg);
            }

            if (args) val = proc(args, options);
        }

        if (!options.ignoreDefaults) {
            if (isBlank(val) && !isNull(token.default)) {
                if (isObject(token.default)) {
                    val = HashUtils.tokenValue(<Token>token.default, variables, options);
                } else {
                    val = token.default;
                }
            }
        }

        return val;
    }

    static tokenVars(token: any): string[] {
        let vars: string[] = [];

        if (isObject(token)) {
            if (token.type == 'variable' || token.type == 'function') {
                vars.push(token.name);
            }

            if (token.default) {
                vars = vars.concat(...HashUtils.tokenVars(token.default))
            }

            if (token.type == 'function' && token.args && token.args.length) {
                token.args.forEach(arg => {
                    if (isObject(arg)) {
                        vars = vars.concat(...HashUtils.tokenVars(arg));
                    } else {
                        let matches = `${arg}`.match(/\$([a-z0-9A-Z_.-]+)/g);
                        if (matches && matches.length) {
                            for (let j = 0; j < matches.length; j++) {
                                let m = matches[j];
                                let [token, prop] = m.match(/\$([a-z0-9A-Z_.-]+)/) || [null, null];
                                if (prop) {
                                    vars.push(prop);
                                }
                            }
                        }
                    }
                })
            }
        }

        return Array.from(new Set(vars));
    }

    static tokenExtractVars(expression: any): string[] {
        let vars: string[] = [];
        if (typeof expression !== 'string') {
            if (isObject(expression)) {
                expression = JSON.stringify(expression);
            } else {
                return vars;
            }
        }

        if (expression.indexOf('#{') > -1 || expression.indexOf('${') > -1 || expression.indexOf('$') > -1) {
            HashUtils.extractTokens(expression).forEach(token => {
                vars = vars.concat(...HashUtils.tokenVars(token));
            });
        }


        return Array.from(new Set(vars));
    }
}

