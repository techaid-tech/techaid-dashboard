import { Component, ViewChild, ElementRef, Output, EventEmitter, OnInit } from '@angular/core';
import { FieldType } from '@ngx-formly/core';
import { FileQueueStatus } from '../../uploader';
import { Subscription } from 'rxjs';

@Component({
  selector: 'formly-field-file',
  styles: [
    `
    img {
      width: 100px;
      height: 100px;
      object-fit: contain;
    }

    .file {
      display: inline-block;
      width: 100px;
      height: 100px;
      position: relative;
      vertical-align: top;
      margin-right: 3px;
      margin-bottom: 3px;
    }

    .file a {
      height: 20px;
      width: 20px;
      background-color: red;
      color: white;
      border-radius: 50%;
      display: inline-block;
      text-align: center;
      padding: 0px;
      position: absolute;
      top: -5px;
      right: 0px;
    }

    .file-button label{
      margin-top: 30px;
      margin-left: 30px;
    }
    `
  ],
  template: `
  <div [class.is-invalid]="showError">
     <div class="">
      <div *ngFor="let f of files;" class="file mr-1">
        <img class="img-thumbnail" [src]="f.image || to.prefix + f.url" />
        <a href="#" (click)="remove(f)"><i class="fas fa-times"></i></a>
      </div>
      <div class="file file-button img-thumbnail mr-1">
        <label class="btn btn-sm btn-primary btn-outline">
            <i class="fas fa-plus"></i> 
            <input (change)="fileChange($event)" #fileInput type="file" accept=".jpg,.jpeg,.png,.bmp,.gif" multiple style="display: none;">
        </label>
      </div>
     </div>
  </div>
  `
})
export class GalleryInput extends FieldType implements OnInit {
  @ViewChild('fileInput') fileInput: ElementRef
  files = [];
  sub: Subscription;

  get validationId() {
      return this.field.id + '-message';
  }

  ngOnInit(): void {
    this.setFiles(this.formControl.value);
    this.sub = this.formControl.valueChanges.subscribe((val) => {
      this.setFiles(val);
    });
  }

  setFiles(files){
    this.files = (files || []).map(f => {
      return {
        url: f.url,
        image: f.image,
        id: f.id
      }
    });
  }

  fileChange(event: any) {
    for(var i=0; i<event.target.files.length; i++){
      var file = event.target.files[i];
      var reader = new FileReader();
      reader.onload = (e) => {
        this.resizeImage(e.target['result'], 640, (data) => {
          this.files.push({image: data, id: null, url: null});
          this.fileInput.nativeElement.value = '';
          this.formControl.setValue(this.files); 
        });
      };
      reader.readAsDataURL(file);
    }
  }

  remove(file){
    this.files = this.files.filter(f => f != file);
    this.formControl.setValue(this.files);
    return false;
  }

  resizeImage(base64Image, width, callback) {
    var img = new Image();
    img.onload = function() {
      var canvas = document.createElement('canvas');
      canvas.width = width;
      const scaleFactor = width / img.width;
      canvas.height = img.height * scaleFactor;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, img.height * scaleFactor);
      callback(canvas.toDataURL("image/png", 0.7));
    };
    img.src = base64Image;
  };
}
