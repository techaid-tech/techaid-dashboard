import { Component, OnInit, OnDestroy, ViewChild } from "@angular/core";
import { FieldType } from "@ngx-formly/core";
import { NgSelectComponent } from "@ng-select/ng-select";

@Component({
  selector: 'pic-choice',
  template: `
    <ng-select
        [formControl]="formControl"
        [class.is-invalid]="showError"
        [multiple]="to.multiple"
        [closeOnSelect]="to.closeOnSelect"
        [bindLabel]="to.bindLabel"
        [bindValue]="to.bindValue"
        [items]="to.items"
        [loading]="to.loading"
        [typeahead]="to.typeahead"
        placeholder="{{this.to.placeholder}}">
    </ng-select>
  `
})
export class ChoiceInput extends FieldType {
  @ViewChild(NgSelectComponent)
  select: NgSelectComponent;

  ngAfterViewInit() {
    this.to['ngSelect'] = this.select;
  }
}