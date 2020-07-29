import { Component, Injectable, OnInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import { NgbDateAdapter, NgbDateStruct, NgbDate } from '@ng-bootstrap/ng-bootstrap';
import { FieldType } from '@ngx-formly/core';
import * as moment from 'moment';
import { DateUtils } from '@app/shared/utils/date_utils';


class NgbDateNativeAdapter extends NgbDateAdapter<Object> {
  private input_formats: string[];
  private output_format: string;

  constructor(input_formats: string[], output_format: string) {
    super();
    this.input_formats = input_formats;
    this.output_format = output_format;
    if (this.output_format && this.output_format != 'struct' && this.output_format != 'default') {
      this.input_formats.unshift(this.output_format);
    }
  }

  parseDate(dt: any): Date {
    if (!dt) {
      return null;
    }

    if (dt && dt.year && dt.month && dt.day) {
      const date = new Date(dt.year, dt.month - 1, dt.day);
      if (moment(date).isValid()) {
        return date;
      }

      return date;
    }

    if ((dt instanceof Date) || (dt && dt.getFullYear)) {
      if (moment(dt).isValid()) {
        return dt;
      }

      return null;
    }

    if (this.input_formats && this.input_formats.length > 0 && typeof dt == 'string') {
      for (const format of this.input_formats) {
        let m = moment(dt.substring(0, format.length), format, true);
        if (m.isValid()) {
          return m.toDate();
        } else {
          m = moment(dt.substring(0, format.length), format, true);
          if (m.isValid()) {
            return m.toDate();
          } else {
            m = moment(dt, format.substring(0, dt.length), true);
            if (m.isValid()) {
              return m.toDate();
            }
          }
        }
      }

      if (this.output_format == 'default') {
        const m = moment(dt);
        if (m.isValid()) {
          return m.toDate();
        }
      } else if (typeof dt == 'string') {
        const m = moment(dt);
        if (m.isValid()) {
          return m.toDate();
        }
      }
    } else {
      const m = moment(dt);
      if (m.isValid()) {
        return m.toDate();
      }
    }

    return null;
  }

  fromModel(dt: Object): NgbDateStruct {
    let model = null;
    try {
      const date: Date = this.parseDate(dt);
      model = (date && date.getFullYear && date.getFullYear()) ? { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() } : null;
    } catch (e) {
      console.error(e);
    }

    return model;
  }

  toModel(date: NgbDateStruct): Object {
    let dt: any = '';
    if (date) {
      dt = new Date(date.year, date.month - 1, date.day);
      if (moment(dt).isValid()) {
        if (this.output_format) {
          if (this.output_format == 'struct') {
            return date;
          } else if (this.output_format == 'default') {
            return moment(dt).toDate();
          }
          return moment(dt).format(this.output_format);
        }
      }
    }

    return dt;
  }

}

@Component({
  selector: 'form-date',
  providers: [
    { provide: NgbDateAdapter, useFactory: getDateAdapter, deps: [DateInput] }
  ],
  template: `
<div>
  <div class="input-group"  *ngIf="to.inline; else nonInline">
    <input (click)="to.openOnClick && dp.open()" class="form-control"
      [displayMonths]="to.displayMonths"
      [navigation]="to.navigation"
      [showWeekNumbers]="to.showWeekNumbers"
      placeholder="{{to.placeholder}}"
      [formControl]="formControl"
      [minDate]="minDate"
      [maxDate]="maxDate"
      [startDate]="startDate"
      [formlyAttributes]="field"
      [class.is-invalid]="showError"
      [markDisabled]="isDisabled"
      ngbDatepicker #dp="ngbDatepicker">
    <div class="input-group-append">
      <button type="button" [class.is-invalid]="showError" class="form-control btn {{to.buttonClass}}" (click)="dp.toggle()" >
        <i class="fa fa-calendar"></i>
      </button>
    </div>
  </div>

  <ng-template #nonInline>
    <div class="input-group">
      <ngb-datepicker #dp
        [class.is-invalid]="showError"
        [displayMonths]="to.displayMonths"
        [navigation]="to.navigation"
        [showWeekNumbers]="to.showWeekNumbers"
        [formControl]="formControl"
        [formlyAttributes]="field"
        [minDate]="minDate"
        [maxDate]="maxDate"
        [startDate]="startDate"
        [markDisabled]="isDisabled"
        >
      </ngb-datepicker>
    </div>
  </ng-template>
</div>
  `
})
export class DateInput extends FieldType implements OnInit {
  @ViewChild('dp') dp;
  minDate: NgbDateStruct;
  maxDate: NgbDateStruct;
  startDate: NgbDateStruct;
  displayValue: any;
  isDisabled = (date: NgbDate, current) => { };

  constructor(private cd: ChangeDetectorRef) {
    super();
  }


  ngOnInit() {
    const adapter = new NgbDateNativeAdapter(this.to.input_formats, this.to.output_format);
    const value = this.formControl.value;
    const from = adapter.fromModel(value);
    this.startDate = adapter.fromModel(this.to.startDate);
    if (this.displayValue == undefined) {
      this.displayValue = {
        value: adapter.toModel(from),
        original: value
      };
    }

    const dt = adapter.parseDate(from) || moment().toDate();
    this.minDate = adapter.fromModel(this.to.minDate) || adapter.fromModel(moment(dt).subtract(10, 'years'));
    this.maxDate = adapter.fromModel(this.to.maxDate);

    const that = this;

    this.isDisabled = (date: NgbDate, current) => {
      const restrict = that.to.restrict || [];
      if (that.to.isDisabled) {
        const val = that.to.isDisabled(date, current);
        if (val) { return true; }
      }

      const dt = adapter.parseDate(date);

      if (!DateUtils.dateIs(restrict, dt)) {
        return true;
      }

      return false;
    };
  }
}


export function getDateAdapter(dateInput: DateInput): NgbDateAdapter<any> {
  const output = dateInput.to.output_format;
  const inputs = dateInput.to.input_formats;
  return new NgbDateNativeAdapter(inputs, output);
}
