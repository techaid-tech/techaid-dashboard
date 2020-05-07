import { Component } from '@angular/core';
import { FieldType } from '@ngx-formly/core';
import { CKEditor4 } from 'ckeditor4-angular';

@Component({
  selector: 'formly-richtext',
  template: `
      <div [class.is-invalid]="showError">
        <ckeditor [readOnly]="to.disabled" (change)="onChange($event)" *ngIf="!to.html" [config]="to.editorConfig" [type]="to.type" [formControl]="formControl"></ckeditor>
      </div>
      `,
  host: {
    '[class.d-inline-flex]': 'to.addonLeft || to.addonRight',
    '[class.custom-file]': 'to.addonLeft || to.addonRight',
  }
})
export class RichTextComponent extends FieldType {
  switchMode(){
    this.to.html = !(this.to.html);
  }

  onChange(editor: CKEditor4.EventInfo){
    
  }
}
