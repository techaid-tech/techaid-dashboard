import { Component } from '@angular/core';
import { FieldType } from '@ngx-formly/core';

@Component({
  selector: 'formly-masked-input',
  template: `
      <div [class.is-invalid]="showError">
        <input-mask  [placeholder]="to.placeholder"  [mask]="to.mask.value" [options]="to.mask.options" [formControl]="formControl" [formlyAttributes]="field"></input-mask>
      </div>
      `,
  host: {
    '[class.d-inline-flex]': 'to.addonLeft || to.addonRight',
    '[class.custom-file]': 'to.addonLeft || to.addonRight',
  }
})
export class MaskedInput extends FieldType {

}
