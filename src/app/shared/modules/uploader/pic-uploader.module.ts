import { NgModule, ModuleWithProviders } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileWidgetService } from './services/file-widget.service';
import { HttpUploaderService } from './services/http-uploader.service'
import { ResumableUploaderService } from './services/resumable-uploader.service'
import { UploadWidgetComponent } from './components/upload-widget/upload-widget.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { DropZone } from './components/drop-zone/drop-zone.component';
import { DropTarget } from './components/drop-target/drop-target.component';
import { Droppable}  from './directives/droppable.directive';
import { FileWidgetComponent } from './components/file-widget/file-widget.component';
import { NgSelectModule } from '@ng-select/ng-select';
import { ReactiveFormsModule } from "@angular/forms";

@NgModule({
    imports: [
      CommonModule,
      NgbModule,
      NgSelectModule,
      ReactiveFormsModule
    ],
    declarations: [
      UploadWidgetComponent,
      FileWidgetComponent,
      DropZone,
      DropTarget,
      Droppable
    ],
    exports: [
      UploadWidgetComponent,
      FileWidgetComponent,
      DropZone,
      DropTarget,
      Droppable
    ]
})
export class PicUploaderModule { 
  static forRoot(){
    return {
        ngModule: PicUploaderModule,
        providers: [
          HttpUploaderService,
          ResumableUploaderService,
          FileWidgetService
        ]
    }
  }
}
