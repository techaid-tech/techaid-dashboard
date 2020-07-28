import { Component, ViewChild, ViewContainerRef } from '@angular/core';
import { FieldWrapper } from '@ngx-formly/core';


@Component({
  selector: 'form-formly-wrapper-form-field',
  template: `
    <div class="form-group" [class.has-error]="showError">
      <label *ngIf="to.label && to.hideLabel !== true" [attr.for]="id">
        {{ to.label }} <ng-container *ngIf="to.required && to.hideRequiredMarker !== true">*</ng-container>
        <ng-container *ngIf="to.tooltip">
          &nbsp;<i class="fa fa-info-circle" placement="right" ngbTooltip="{{to.tooltip}}"></i>
        </ng-container>
        <ng-container *ngIf="to.popover && to.popover.text">
          &nbsp;<i class="fa fa-question-circle" placement="{{to.popover.placement || 'top' }}" triggers="{{to.popover.triggers || 'mouseenter:mouseleave'}}" ngbPopover="{{to.popover.text}}" popoverTitle="{{to.popover.title}}"></i>
        </ng-container>
      </label>

      <ng-template #fieldComponent></ng-template>

      <div *ngIf="showError" class="invalid-feedback" [style.display]="'block'">
        <formly-validation-message [field]="field"></formly-validation-message>
      </div>

      <small *ngIf="to.description" class="form-text text-muted">{{ to.description }}</small>
    </div>
  `,
})
export class PicFormlyWrapperFormField extends FieldWrapper {
  @ViewChild('fieldComponent', { read: ViewContainerRef }) fieldComponent: ViewContainerRef;
}
