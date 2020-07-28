import { Component, Injectable,  Input, forwardRef, ViewChild } from "@angular/core";
import { NgbDateAdapter, NgbDateStruct, NgbTimeStruct } from '@ng-bootstrap/ng-bootstrap';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormControl  } from '@angular/forms';
import { FieldType } from "@ngx-formly/core";
import * as moment from 'moment'
import { OnInit } from "@angular/core/src/metadata/lifecycle_hooks";

export interface NgbDateTimeStruct extends NgbDateStruct, NgbTimeStruct {}

@Component({
  selector: 'form-datetime',
  template: `
  <div [class.is-invalid]="showError">
    <form-datetime-widget [to]="to" [formlyAttributes]="field" [formControl]="formControl"></form-datetime-widget>
  </div>
  `
})
export class DateTimeInput extends FieldType {

}

@Component({
  selector: 'form-datetime-widget',
  providers: [
    { 
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DateTimeInputWidget),
      multi: true
    }
  ],
  template: `
<div>
    <div class="input-group" *ngIf="to.inline; else nonInline">
      <input class="form-control" 
        (blur)="onTouch()"
        (ngModelChange)="onDateChange($event)"
        [displayMonths]="to.displayMonths"
        [navigation]="to.navigation"
        [showWeekNumbers]="to.showWeekNumbers" 
        placeholder="{{to.placeholder}}"
        [formControl]="date"
        [minDate]="minDate"
        [maxDate]="maxDate"
        [startDate]="startDate"
        [class.is-invalid]="showError"
        ngbDatepicker #dp="ngbDatepicker">
      <div class="input-group-append">
        <button type="button"  [class.is-invalid]="showError" class="form-control btn {{to.buttonClass}}" (click)="dp.toggle()" >
          <i class="fa fa-calendar"></i>
        </button>
      </div>
    </div>

    <ng-template #nonInline>
    <div class="input-group">
      <ngb-datepicker #dp
        (blur)="onTouch()"
        [displayMonths]="to.displayMonths"
        [class.is-invalid]="showError"
        [navigation]="to.navigation"
        [showWeekNumbers]="to.showWeekNumbers"
        [formControl]="date"
        [minDate]="minDate"
        [maxDate]="maxDate"
        [startDate]="startDate"
        >
      </ngb-datepicker>
    </div>
  </ng-template>
  

    <div class="input-group">
      <ngb-timepicker [ngStyle]="{'margin-top': to.time.spinners ? 'auto' : '5px'}"
         (blur)="onTouch()"
         [formControl]="time"
         [seconds]="to.time.seconds"
         [meridian]="to.time.meridian"
         [spinners]="to.time.spinners"
         [hourStep]="to.time.hourStep"
         [minuteStep]="to.time.minuteStep"
         [secondStep]="to.time.secondStep"
         name="timepicker" (ngModelChange)="onTimeChange($event)" #timepicker>
      </ngb-timepicker>
    </div>    
</div>
  `
})
export class DateTimeInputWidget implements ControlValueAccessor, OnInit {
  @ViewChild('dp') dp;
  date = new FormControl();
  time = new FormControl();
  model : any;
  minDate : NgbDateStruct;
  maxDate: NgbDateStruct;
  startDate: NgbDateStruct;
  displayValue : any;

  @Input()
  to : any  = {};

  get value() {
    return this.getTime(this.model);
  }

  writeValue(model: any) {  
    this.model = this.parseModel(model);
  }

  fetchModel(model : any) : NgbDateTimeStruct{
    if(model) {
      if(typeof model == 'string' || !model.year || !model.hour) {
        var date = this.parseTime(model);
        if(date) {
            model = {
              year: date.getFullYear(), 
              month: date.getMonth() + 1, 
              day: date.getDate(),
              hour: date.getHours(), 
              minute: date.getMinutes(), 
              second: date.getSeconds()
            }

            return model;
        }else{
          return null;
        }
      }else{
        return model;
      }
    }else{
      return null;
    }
  }

  fetchDate(model : any) : NgbDateStruct {
    model = this.fetchModel(model);
    if(model) {
      return {month: model.month, year: model.year, day: model.day};
    }else{
      return null;
    }
  }

  parseModel(model : any) : NgbDateTimeStruct {
    model = this.fetchModel(model);
    if(model) {
      this.date.setValue({month: model.month, year: model.year, day: model.day});
      this.time.setValue({hour: model.hour, minute: model.minute, second: model.second});
      return model;
    }else{
        this.date.setValue(null);
        return null;
    }  
  }

  ngOnInit() {
    var self = this;
    if(this.to.output_format && this.to.output_format != "struct" && this.to.output_format != "default") {
      this.to.input_formats.unshift(this.to.output_format);
    }

    this.model = this.parseModel(this.value); 
    this.startDate = this.fetchDate(this.model);
    
    if(this.displayValue == undefined){
      this.displayValue = {
        value: this.getTime(this.model),
        original: this.value
      };
    }

    var dt = this.parseTime(this.model) || moment().toDate();
    this.minDate = this.fetchDate(this.to.minDate) || this.fetchDate(moment(dt).subtract(10, 'years'));
    this.maxDate = this.fetchDate(this.to.maxDate);
  }

  ngAfterViewChecked_() {
    var value = this.getTime(this.model);
    if(this.displayValue && this.displayValue.original == value && value != this.displayValue.value) {
      setTimeout(() => {
        this.writeValue(this.displayValue.value);
      });
    }
  }

  parseTime( dt : any) : Date {
    if(!dt) {
      return null;
    }

    if(dt && dt.year && dt.month && dt.day) {
        var date = new Date(dt.year, dt.month - 1, dt.day);
        if( dt.hour ) date.setHours(dt.hour);
        if( dt.minute ) date.setMinutes(dt.minute);
        if( dt.second ) date.setSeconds(dt.second);
        return date;
    }

    if((dt instanceof Date) || (dt && dt.getFullYear)) {
      return dt;
    }

    if(this.to.input_formats && this.to.input_formats.length > 0  && typeof dt == 'string'){
      for(let format of this.to.input_formats) {          
          var m = moment(dt, format, true);
          if(m.isValid()){
            return m.toDate();
          }else{
            m = moment(dt.substring(0, format.length), format, true);
            if(m.isValid()){
              return m.toDate();
            }else{
              m = moment(dt, format.substring(0, dt.length), true);
              if(m.isValid()){
                return m.toDate();
              }
            }
          }
      }

      if(this.to.output_format == 'default') {
        var m = moment(dt);
        if(m.isValid()){
          return m.toDate();
        }
      }else if(typeof dt == 'string'){
        var m = moment(dt);
        if(m.isValid()){
          return m.toDate();
        }
      }
    }else{
      var m = moment(dt);
      if(m.isValid()){
        return m.toDate();
      }
    }

    return null;
  }

  onChange = (_) => {};

  registerOnChange(fn: any): void {
      this.onChange = fn;
  }

  onTouch = () => {};
  registerOnTouched(): void {
    this.onTouch();
  }

  onDateChange(date: NgbDateStruct) {
      let time: NgbTimeStruct;
      if (this.time.value != null) {
          time = this.time.value;
      } else {
          time = {hour: 0, minute: 0, second: 0};
          this.time.setValue(time);
      }
      if (date == null || typeof date != "object") {
          date = {month: null, year: null, day: null};
      }

      this.setModel(<NgbDateTimeStruct>{month: date.month, year: date.year, day: date.day, ...time});
  }

  onTimeChange(time: NgbTimeStruct) {
      let date: NgbDateStruct;
      if (this.date.value != null) {
          date = this.date.value;
      } else {
          date = {month: null, year: null, day: null};
      }
      
      if (time == null) {
          time = {hour: null, minute: null, second: null};
      }

      this.setModel(<NgbDateTimeStruct>{...date, hour: time.hour, minute: time.minute, second: time.second});
  }

  private getTime(model: NgbDateTimeStruct) : any {
    var dt : any = this.parseTime(model);
    if(dt && this.to.output_format) {
      if(this.to.output_format == 'struct') {
          dt = {...model, time: dt}; 
      }else if(this.to.output_format == 'default'){
        dt = moment(dt).format()                  
      }else{
        dt = moment(dt).format(this.to.output_format);
      }
    }

    return dt;
  }

  private setModel(model: NgbDateTimeStruct) {
      this.model = model;
      this.onChange(this.value);    
  }
}

