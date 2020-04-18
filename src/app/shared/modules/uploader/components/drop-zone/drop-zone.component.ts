import {Component, ElementRef, Output, ViewChild, EventEmitter, HostListener} from '@angular/core';

@Component({
    selector: 'drop-zone',
    templateUrl: './drop-zone.html',
    styleUrls: ['./drop-zone.scss']
})
export class DropZone {
    @ViewChild('parent' , {read: ElementRef }) parent: ElementRef;
    timeout : any = -1;

    @Output('fileadded')
    fileAdditions : EventEmitter<File> = new EventEmitter<File>();

    addFile(file : File) {
        this.fileAdditions.emit(file);
    }

    dropFile(event : any) {
        event.preventDefault();
        event.stopPropagation();

        if (event.dataTransfer) {
            if (event.dataTransfer.files.length) {
                for(let i=0; i<event.dataTransfer.files.length; i++){
                    this.addFile(event.dataTransfer.files[i]);
                }
            }
        }

        return this.dropLeave(event);
    }

    @HostListener('dragenter', ['$event'])
    hostEnter(event: any) {
        this.parent.nativeElement.classList.add('drop-overlay-active');
    }

    @HostListener('dragleave', ['$event'])
    hostLeave(event: any) {
        clearTimeout(this.timeout);
        this.parent.nativeElement.classList.remove('drop-overlay-active');
    }

    dropEnter(event : any) : boolean {
        event.preventDefault();
        event.stopPropagation();
        this.parent.nativeElement.classList.add('drop-overlay-active');
        document.body.style.overflow = 'hidden';
        window.scrollTo(window.scrollX, 0);

        clearTimeout(this.timeout);
        var self = this;
        this.timeout = setTimeout(function () {
            self.dropLeave(event);
        }, 5000);

        return false;
    }

    dropLeave(event : any) : boolean {
        event.preventDefault();
        event.stopPropagation();
        this.parent.nativeElement.classList.remove('drop-overlay-active');
        document.body.style.overflow = 'auto';
      
        clearTimeout(this.timeout);
        return false;
    }

    ngOnDestroy(){
        clearTimeout(this.timeout);
    }
}
