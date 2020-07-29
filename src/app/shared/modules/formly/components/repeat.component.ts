import { Component } from '@angular/core';
import { FieldArrayType } from '@ngx-formly/core';

@Component({
    selector: 'formly-repeat-section',
    template: `
      <div *ngFor="let field of field.fieldGroup; let i = index;" class="">
        <div class="card mt-2 shadow">
            <div class="card-header" *ngIf="!to.min || size > to.min" >
                <div class="w-100 d-flex justify-content-end">
                    <button *ngIf="!state.remove[i]" class="btn btn-sm btn-danger" type="button" (click)="markRemove(i)">
                        <i class="fas fa-trash-alt"></i>
                        Remove
                    </button>
                    <div *ngIf="state.remove[i]" class="">
                        <button class="btn btn-sm btn-danger mr-1" type="button" (click)="delete(i)">
                            <i class="fas fa-trash-alt"></i>
                            Click again to remove
                        </button>
                        <button class="btn btn-secondary btn-sm" (click)="markRemove(i)"><i class="far fa-window-close"></i> Cancel</button>
                    </div>
                </div>
            </div>
            <div class="card-body">
                <formly-field class="col" [field]="field"></formly-field>
            </div>
        </div>
      </div>
      <div class="d-flex justify-content-between mt-3 mb-3">
        <span class="text-muted mr-1">{{to.description}}</span>
        <button class="btn btn-primary btn-sm" type="button" (click)="add()"><i class="fas fa-plus-circle"></i> {{ to.addText }}</button>
      </div>
      <hr />
    `,
  })
  export class RepeatTypeComponent extends FieldArrayType {


      state = {
          remove: {}
      };

      get size () {
        return (this.formControl.value || []).length;
      }

      markRemove(index) {

          this.state.remove[index] = !this.state.remove[index];
      }

      delete(index) {
          delete this.state.remove[index];
          this.remove(index);
      }
  }
