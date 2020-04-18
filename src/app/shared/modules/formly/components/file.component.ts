import { Component, ViewChild, ElementRef, Output, EventEmitter, OnInit } from '@angular/core';
import { FieldType } from '@ngx-formly/core';

export interface FileEvent {
    key: string;
    is_file : true;
    file: File;
    type: string;
    name: string;
    size : number;
}

@Component({
  selector: 'formly-field-file',
  template: `
  <div [class.is-invalid]="showError || to.retry">
    <file-widget [key]="key"  (file)="change($event)" class="validate input-group" [to]="to" [formlyAttributes]="field" [formControl]="formControl"></file-widget>
  </div>
  `
})
export class FileInput extends FieldType {

  get validationId() {
      return this.field.id + '-message';
  }

  change($event: any) {
      if(this.to.change) {
        this.to.change(this.field, $event);
      }
  }
}