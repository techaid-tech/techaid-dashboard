import { Directive, ElementRef, HostListener, Input, Output, EventEmitter } from "@angular/core";

@Directive({
    selector: "[is-droppable]",
})
export class Droppable {
    private _nativeElement: HTMLElement;
    private _ev
    timeout: any = -1;

    @Input()
    propagate : boolean = false;

    @Output()
    fileDrop: EventEmitter<File[]> = new EventEmitter<File[]>();
    @Output()
    dragging: EventEmitter<boolean> = new EventEmitter<boolean>();

    constructor(element: ElementRef) {
        this._nativeElement = element.nativeElement;
    }

    @HostListener("drop", ['$event'])
    private onDrop(event) {
        this.cancelEvent(event);
        this.onLeave();
        if (event.dataTransfer && event.dataTransfer.files.length) {
            this.fileDrop.emit(event.dataTransfer.files);
        }
        return false;
    }

    @HostListener("dragover", ['$event'])
    private onDragOver(event) {
        this.cancelEvent(event);
        this.onEnter();
    }

    @HostListener("dragenter", ['$event'])
    private onDragEnter(event) {
        this.cancelEvent(event);
        this.onEnter();
    }

    @HostListener("dragleave", ['$event'])
    private onDragLeave(event) {
        this.cancelEvent(event);
        this.onLeave();
    }

    private onEnter() {
        this.dragging.emit(true);
        clearTimeout(this.timeout);
        const self = this;
        this.timeout = setTimeout(function () {
            self.onLeave();
        }, 5000);
    }

    private onLeave() {
        clearTimeout(this.timeout);
        this.dragging.emit(false);
    }

    private cancelEvent(event : Event): boolean {
        event.preventDefault();
        if(!this.propagate){
            event.stopPropagation();
        }
        return false;
    }
}
