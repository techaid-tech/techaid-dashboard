import * as moment from 'moment';

export class DateUtils {

    public static options: any = {
        cache: {},
        countries: ['england'],
        formats: [
            'YYYY-MM-DD', 'YYYY/MM/DD', 'YYYY.MM.DD', 'YYYY MM DD',
            'DD-MM-YYYY', 'DD/MM/YYYY', 'DD.MM.YYYY', 'DD MM YYYY',
            'DD MMM YYYY', 'DD MMMM YYYY', 'MMM YYYY', 'MMMM YYYY',
            'YYYYMMDD', 'DDMMYYYY'
        ]
    };

    static easterSunday(year: number): Date {
        const f = Math.floor,
            // Golden Number - 1
            G = year % 19,
            C = f(year / 100),
            // related to Epact
            H = (C - f(C / 4) - f((8 * C + 13) / 25) + 19 * G + 15) % 30,
            // number of days from 21 March to the Paschal full moon
            I = H - f(H / 28) * (1 - f(29 / (H + 1)) * f((21 - G) / 11)),
            // weekday for the Paschal full moon
            J = (year + f(year / 4) + I + 2 - C + f(C / 4)) % 7,
            // number of days from 21 March to the Sunday on or before the Paschal full moon
            L = I - J,
            month = 3 + f((L + 40) / 44),
            day = L + 28 - 31 * f(month / 4);
        return new Date(Date.UTC(year, (month - 1), day));
    }

    static isWeekDay(date: moment.MomentInput): boolean {
        return moment(date).isoWeekday() < 6;
    }

    static isBusinessDay(date: moment.MomentInput, ...countries): boolean {
        return DateUtils.isWeekDay(date) && !DateUtils.isBankHoliday(date, ...countries);
    }

    static isBankHoliday(date: moment.MomentInput, ...countries): boolean {
        const dt = moment(date);
        const holidays = DateUtils.bankHolidays(dt.year(), ...countries);
        for (const key in holidays) {
            if (dt.isSame(holidays[key], 'day')) {
                return true;
            }
        }

        return false;
    }

    static skipWeekends(date: moment.MomentInput, inc: number): moment.Moment {
        const dt = moment(date).add(inc, 'days');
        if (Math.abs(inc) > 0) {
            while (!DateUtils.isWeekDay(dt)) {
                dt.add(inc, 'days');
            }
        }

        return dt;
    }

    static nextDay(date: moment.MomentInput, isoWeekday: number): moment.Moment {
        const dt = moment(date);
        if (dt.isoWeekday() <= isoWeekday) {
            return dt.isoWeekday(isoWeekday);
        } else {
            return dt.add(1, 'weeks').isoWeekday(isoWeekday);
        }
    }

    static previousDay(date: moment.MomentInput, isoWeekday: number): moment.Moment {
        const dt = moment(date);
        if (dt.isoWeekday() >= isoWeekday) {
            return dt.isoWeekday(isoWeekday);
        } else {
            return dt.subtract(1, 'weeks').isoWeekday(isoWeekday);
        }
    }

    static nextWeekDay(date: moment.MomentInput): moment.Moment {
        let dt = moment(date);
        if (!DateUtils.isWeekDay(dt)) {
            dt = DateUtils.skipWeekends(dt, 1);
        }

        return dt;
    }

    static previousWeekDay(date: moment.MomentInput): moment.Moment {
        let dt = moment(date);
        if (!DateUtils.isWeekDay(dt)) {
            dt = DateUtils.skipWeekends(dt, -1);
        }

        return dt;
    }

    static nextBusinessDay(date: moment.MomentInput): moment.Moment {
        let dt = DateUtils.nextWeekDay(date);
        while (DateUtils.isBankHoliday(dt)) {
            dt = DateUtils.nextWeekDay(dt.add(1, 'days'));
        }

        return dt;
    }

    static previousBusinessDay(date: moment.MomentInput): moment.Moment {
        let dt = DateUtils.previousWeekDay(date);
        while (DateUtils.isBankHoliday(dt)) {
            dt = DateUtils.previousWeekDay(dt.subtract(1, 'days'));
        }

        return dt;
    }

    static bankHolidays(year: number, ...countries) {
        if (!countries || !countries.length) {
            countries = DateUtils.options.countries.slice();
        }

        countries = countries.sort().map(c => c.trim().toLowerCase());
        const key = `${year}_${countries.join('_')}`;
        if (DateUtils.options.cache[key]) { return DateUtils.options.cache[key]; }

        const holidays = {};
        const easterSunday = DateUtils.easterSunday(year);
        holidays['New Year'] = DateUtils.nextWeekDay(new Date(year, 0, 1));
        holidays['Good Friday'] = moment(easterSunday).subtract(2, 'days');
        holidays['Easter Monday'] = moment(easterSunday).add(1, 'days');
        holidays['Early May bank holiday'] = DateUtils.nextDay(new Date(year, 4, 1), 1);
        holidays['Spring bank holiday'] = DateUtils.previousDay(new Date(year, 4, 31), 1);

        if (countries.indexOf('northern_ireland') > -1) {
            holidays['St Patrick\'s Day'] = DateUtils.nextWeekDay(new Date(year, 2, 17));
        }

        if (countries.indexOf('scotland') > -1) {
            holidays['Summer bank holiday'] = DateUtils.previousDay(new Date(year, 7, 1), 1);
            holidays['St Andrew\'s Day'] = DateUtils.nextWeekDay(new Date(year, 10, 30));
        } else {
            holidays['Summer bank holiday'] = DateUtils.previousDay(new Date(year, 7, 31), 1);
        }

        const date = moment(new Date(year, 11, 25));
        if (date.isoWeekday() == 6) {
            holidays['Christmas Day (substitute day)'] = moment(date).add(3, 'days');
            holidays['Boxing Day (substitute day)'] = moment(date).add(2, 'days');
        } else if (date.isoWeekday() == 7) {
            holidays['Christmas Day (substitute day)'] = moment(date).add(2, 'days');
            holidays['Boxing Day'] = moment(date).add(1, 'days');
        } else {
            holidays['Christmas Day'] = date;
            holidays['Boxing Day'] = DateUtils.nextWeekDay(moment(date).add(1, 'days'));
        }

        DateUtils.options.cache[key] = holidays;
        return holidays;
    }

    static math(expr: string, options: any = {}): moment.Moment | string {
        const defaultOptions = {
            now: moment(),
            formats: DateUtils.options.formats
        };

        const now = moment(options.now);
        options = { ...defaultOptions, options };


        const [__, dateFormat] = expr.match(/\|\|?\s*(.*)\s*$/) || [null, null];
        let date = null;
        let tokens = expr.replace(/\|\|?\s*(.*)\s*$/, '').split(/([\+-]\s*[0-9]+\s*[yMwdhHms])|(\/\^?[yMwdhHmsb<>]+)/).filter(t => t && t.trim());
        expr = tokens.shift();

        switch (expr.trim().toLowerCase()) {
            case 'now':
                date = moment();
                break;

            case 'today':
            case '$today':
            case 'date':
            case '$date':
                date = moment().startOf('day');
                break;

            case 'tomorrow':
                date = moment().add(1, 'day');
                break;

            case 'yesterday':
                date = moment().add(-1, 'day');
                break;
            default:
                if (options.formats.length) {
                    for (const fmt of options.formats) {
                        const m = moment(expr.substring(0, fmt.length), fmt, true);
                        if (m.isValid()) {
                            date = m;
                            break;
                        }
                    }
                }

                if (!date) {
                    const m = moment(expr);
                    if (m.isValid()) {
                        date = m;
                    }
                }
                break;
        }

        if (!date) {
            return null;
        }

        const types = {
            y: 'year', M: 'month', w: 'week', d: 'day', h: 'hour', H: 'hour', 'm': 'month', s: 'second'
        };

        tokens = tokens.map(t => t.replace(/\s*/g, ''));
        tokens.forEach(token => {
            if (token.match(/\/(\^?[yMwdhHmsb<>])/)) {
                token.split(/\/(\^?[yMwdhHmsb<>])/).filter(t => t && t.trim()).forEach(modifier => {
                    switch (modifier) {
                        case 'b':
                            date = DateUtils.nextWeekDay(moment(date).startOf('month'));
                            break;

                        case '^b':
                            date = DateUtils.previousWeekDay(moment(date).endOf('month'));
                            break;

                        case '>':
                            date = DateUtils.nextBusinessDay(date);
                            break;

                        case '<':
                            date = DateUtils.previousBusinessDay(date);
                            break;

                        default:
                            const mod = modifier.replace('^', '');
                            if (!types[mod]) {
                                throw new Error(`Unknown date modifier ${mod}`);
                            }

                            if (modifier.startsWith('^')) {
                                date = moment(date).endOf(types[mod]);
                            } else {
                                date = moment(date).startOf(types[mod]);
                            }
                            break;
                    }
                });
            } else if (token.match(/^([+-])([0-9]+)([yMwdhHms])$/)) {
                const [__, method, value, duration] = token.match(/^([+-])([0-9]+)([yMwdhHms])$/);
                if (method == '+') {
                    date = date.add(+value, types[duration]);
                } else {
                    date = date.subtract(+value, types[duration]);
                }
            }
        });

        if (dateFormat) {
            return date.format(dateFormat);
        }


        return date.toDate();
    }

    static dateIs(types: string[] | string, date: Date) {
        if (!types.length) {
            return true;
        }

        if (!moment(date).isValid()) {
            return false;
        }

        let validity = 0;
        let ref = '';
        let check = [];

        for (let i = 0; i < types.length; i++) {
            let count = 0;
            types[i].split('|').forEach(type => {
                const value = !(type.replace(/^(!).*/, '$1') === '!');
                switch (type.replace(/^!(.*)/, '$1')) {
                    case 'weekday':
                        if ((DateUtils.isWeekDay(date) === value)) {
                            count++;
                        }
                        break;
                    case 'weekend':
                        if ((!DateUtils.isWeekDay(date)) === value) {
                            count++;
                        }
                        break;
                    case 'workingday':
                        if ((DateUtils.isBusinessDay(date)) === value) {
                            count++;
                        }
                        break;
                    case 'holiday':
                        if ((DateUtils.isBankHoliday(date)) === value) {
                            count++;
                        }
                        break;
                    case 'monthend':
                        ref = DateUtils.format(date, 'DD/MM/YYYY');
                        check = [DateUtils.math(`${ref}/^b|DD/MM/YYYY`), DateUtils.math(`${ref}/^M|DD/MM/YYYY`), DateUtils.math(`${ref}/^b<|DD/MM/YYYY`)];
                        if ((check.indexOf(ref) !== -1) === value) {
                            count++;
                        }
                        break;
                    case 'monthstart':
                        ref = DateUtils.format(date, 'DD/MM/YYYY');
                        check = [DateUtils.math(`${ref}/b|DD/MM/YYYY`), DateUtils.math(`${ref}/b<|DD/MM/YYYY`), DateUtils.math(`${ref}/M|DD/MM/YYYY`)];
                        if ((check.indexOf(ref) !== -1) === value) {
                            count++;
                        }
                        break;
                }
            });

            if (count > 0) {
                validity++;
            }
        }

        return validity == types.length;
    }

    static format(date: moment.MomentInput, format: string) {
        return moment(date).format(format);
    }

}
