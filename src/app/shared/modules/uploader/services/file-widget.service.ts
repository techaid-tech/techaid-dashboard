import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from "rxjs";

export interface WidgetOptions {
    options: any;
    key: string;
    fields: any;
    human_size?: string;
    size: number;
}

export interface FileWidget extends File {
    widget? : WidgetOptions;
}

@Injectable()
export class FileWidgetService {
    private _list: BehaviorSubject<FileWidget[]> = new BehaviorSubject<FileWidget[]>([]);
    protected _files: {[key: string]: FileWidget} = {};

    files(): Observable<FileWidget[]> {
        return this._list.asObservable();
    }

    clear() {
        this._files = {};
        this._list.next(this.fileList());
    }

    push(){
        this._list.next(this.fileList());
    }

    addFile(file: FileWidget) {
        file = this.prepareFile(file);
        this._files[file.name] = file;
        this._list.next(this.fileList());
    }

    fileList() : FileWidget[]{
        let list : FileWidget[] = [];
        for(let name in this._files){
            list.push(this._files[name]);
        }

        return list;
    }

    addFiles(files: FileWidget[]){
        for(let i=0; i<files.length; i++){
            let file = this.prepareFile(files[i]);
            this._files[file.name] = file;
        }

        this._list.next(this.fileList());
    }

    removeFile(file: FileWidget) {
        delete this._files[file.name];
        this._list.next(this.fileList());
    }

    private prepareFile(file : FileWidget) : FileWidget {
        if(!file || !file.name) {
            throw new Error("Attempting to add an object that isn't a file.");
        }

        if(!file.widget){
            file.widget = {
                options: {},
                fields: {},
                key: '',
                size: file.size,
                human_size: this.humanFileSize(file.size)
            }
        }
        

        return file;
    }

    humanFileSize(bytes) : string {
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
}