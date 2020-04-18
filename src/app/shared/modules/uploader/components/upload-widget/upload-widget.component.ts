import { Component, Output, EventEmitter, Input } from '@angular/core';
import { AbstractUploaderService, FileQueueStatus } from '../../uploader'
import { Observable, Subscription } from 'rxjs';
import { HashUtils } from '@app/shared/utils/hash_utils';

export interface FileDescriptor {
  key: string;
  file: File;
  name?: string;
  size?: number;
  uploaded?: boolean;
}

@Component({
  selector: 'upload-widget',
  styleUrls: ['upload-widget.scss'],
  templateUrl: 'upload-widget.html'
})
export class UploadWidgetComponent {
  files: FileDescriptor[] = [];
  collapsed = true;
  active = false;
  progress = 0;
  upload_data = [];
  subscription: Subscription;

  @Input() uploader: AbstractUploaderService;
  @Input() inline: boolean = false;

  cache = {};
  raw_size: 0;
  size: string;


  clearValues() {
    this.files = [];
    if (this.uploader) {
      this.uploader.clearQueue();
    }
  }

  getFiles(): FileDescriptor[] {
    return this.files;
  }

  ngOnInit() {
    if (this.uploader) {
      this.subscription = this.uploader.queue.subscribe((data) => {
        this.active = data.length > 0;
        this.upload_data = data;

        if (this.active) {
          var complete = 0.0;
          data.forEach((f) => {
            complete += f.progress;
          });

          this.progress = Math.round(complete / data.length);
        }
      });
    }
  }

  ngOnDestroy() {
    if(this.subscription){
      this.subscription.unsubscribe();
    }
  }

  humanFileSize(bytes): string {
    var thresh = 1000;
    if (Math.abs(bytes) < thresh) {
      return bytes + ' B';
    }
    var units = ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    var u = -1;
    do {
      bytes /= thresh;
      ++u;
    } while (Math.abs(bytes) >= thresh && u < units.length - 1);

    return bytes.toFixed(1) + ' ' + units[u];
  }

  addFile(file: FileDescriptor) {
    let index = this.files.findIndex((x) => {
      return x.key === file.key;
    });

    if (index === -1) {
      this.files.push(file);
    } else {
      this.files[index] = file;
    }

    this.cache[file.key] = file;
    this.updateSize();
  }

  addNativeFile(file) {
    let descriptor: FileDescriptor = {
      key: file.name,
      name: file.name,
      size: file.size,
      file: file
    }
    this.addFile(descriptor);
  }

  getDescriptor(file: File): FileDescriptor {
    return this.files.find((x) => {
      return x.file === file;
    });
  }

  removeFile(file: FileDescriptor) {
    if (!file) {
      return;
    }

    let index = this.files.findIndex((x) => {
      return x.key === file.key;
    });

    if (index > -1) {
      this.files.splice(index, 1);
      delete this.cache[file.key];
    }

    this.updateSize();
  }

  updateSize() {
    this.raw_size = 0;
    this.files.forEach((x) => {
      if (x.size) this.raw_size += x.size;
    });

    this.size = this.humanFileSize(this.raw_size);
  }


  formlyCheck(data: any, keys: string[]) {
    var checked = 0;
    for (let i=0; i<keys.length; i++) {
      let key = keys[i];
      var value = HashUtils.dotNotation(data, key);
      if (value && value.file && value.file.name) {
        this.addFile({ ...value, ...{ key: key } });
        checked += 1;
      } else {
        if (this.cache[key]) {
          this.removeFile(this.cache[key]);
          checked += 1;
        }
      }
    }

    if (this.active && checked > 0) {
      this.active = false;
    }
  }
}
