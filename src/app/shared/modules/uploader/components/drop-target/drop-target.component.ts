import { Component, Input } from '@angular/core';

@Component({
    selector: 'drop-target',
    templateUrl: './drop-target.html',
    styleUrls: ['./drop-target.scss']
})
export class DropTarget {
    @Input()
    header = 'Incoming!';

    @Input()
    message = 'Drop your files to upload them instantly';

    @Input()
    active : boolean = true;
}