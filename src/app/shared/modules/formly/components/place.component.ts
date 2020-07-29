import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { FieldType } from '@ngx-formly/core';

@Component({
  selector: 'form-place',
  template: `
    <div class="input-group mb-2">
        <input class="form-control"
          #placesRef
          [formControl]="formControl"
          autocomplete="off"
          [class.is-invalid]="showError"
          placeholder="{{this.to.placeholder}}"
        />
        <div class="input-group-append">
          <button class="btn btn-secondary" type="button" (click)="clear()">
            <i class="fa fa-times"></i>
          </button>
        </div>
    </div>
  `
})
export class PlaceInput extends FieldType {
  @ViewChild('placesRef') placesRef: any;
  ngAfterViewInit() {
    const autocomplete = new google.maps.places.Autocomplete(this.placesRef.nativeElement, this.to.mapOptions || {});
      google.maps.event.addListener(autocomplete, 'place_changed', () => {
          const place = autocomplete.getPlace();
          if (this.to.postCode) {
            const addr = <any>(place.address_components.find(a => a.types.indexOf('postal_code') > -1) || {});
            this.formControl.setValue(addr.long_name || place.formatted_address);
          } else {
            this.formControl.setValue(place.formatted_address);
          }
      });
  }

  clear() {
    this.formControl.setValue(null);
  }
}
