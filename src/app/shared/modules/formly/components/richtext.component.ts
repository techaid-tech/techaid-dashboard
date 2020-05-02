import { Component } from '@angular/core';
import { FieldType } from '@ngx-formly/core';
import * as ClassicEditor from '@ckeditor/ckeditor5-build-classic';

@Component({
  selector: 'formly-richtext',
  template: `
      <div [class.is-invalid]="showError">
        <div *ngIf="to.htmlEdit" class="d-flex justify-content-between">
          <div></div>
          <button (click)="switchMode()" type="botton" class="btn btn-sm mb-1 btn-primary">
            <span *ngIf="!to.html"><i class="fas fa-code"></i> HTML</span>
            <span *ngIf="to.html"><i class="far fa-newspaper"></i> RICH TEXT</span>
          </button>
        </div>
        <ckeditor *ngIf="!to.html" [editor]="Editor" [formControl]="formControl"></ckeditor>
        <textarea *ngIf="to.html" class="form-control" [formControl]="formControl" [rows]="to.rows || 3"></textarea>
      </div>
      `,
  host: {
    '[class.d-inline-flex]': 'to.addonLeft || to.addonRight',
    '[class.custom-file]': 'to.addonLeft || to.addonRight',
  }
})
export class RichTextComponent extends FieldType {
  public Editor = ClassicEditor;

  switchMode(){
    this.to.html = !(this.to.html);
  }
}
