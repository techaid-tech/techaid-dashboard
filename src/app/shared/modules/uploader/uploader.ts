import { Injectable, Output } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export enum FileQueueStatus {
    Pending,
    Success,
    Error,
    Progress,
    Queued
}

export class FileQueueObject {
    public file: any;
    public key: string = ""
    public status: FileQueueStatus = FileQueueStatus.Pending;
    public progress: number = 0;
    public response: any;
    public error: Error;
    public state: any = {};

    constructor(file: any, key: string = '') {
        this.file = file;
        this.key = key || file.key;
    }

    // actions
    public upload = () => { /* set in service */ };
    public cancel = () => { /* set in service */ };
    public remove = () => { /* set in service */ };
    public pause = () => { /* set in service */ };

    // statuses
    public isQueued = () => this.status === FileQueueStatus.Queued;
    public isPending = () => this.status === FileQueueStatus.Pending;
    public isSuccess = () => this.status === FileQueueStatus.Success;
    public isError = () => this.status === FileQueueStatus.Error;
    public inProgress = () => this.status === FileQueueStatus.Progress;
    public isUploadable = () => this.status === FileQueueStatus.Pending || this.status === FileQueueStatus.Error;
}

export class AbstractUploaderService {
    protected _queue: BehaviorSubject<FileQueueObject[]>;
    protected _files: FileQueueObject[] = [];
    public max_files: number = 3;
    public onComplete = (queue_el: FileQueueObject) => { }

    constructor() {
        this._queue = <BehaviorSubject<FileQueueObject[]>>new BehaviorSubject(this._files);
    }

    public get queue() {
        return this._queue.asObservable();
    }

    public get pending(): number {
        var complete_count = this._files.filter((f) => {
            return f.isSuccess();
        }).length;

        return this._files.length - complete_count;
    }

    public clearQueue() {
        this._files = [];
        this._queue.next(this._files);
    }

    public removeFromQueue(queue_el: FileQueueObject) {
        var index = this._files.findIndex((x) => { return x === queue_el });
        if (index > -1) {
            this._files.splice(index, 1);
        }
    }

    public addAllToQueue(data: File[], options: any) {
        data.forEach((el) => {
            this.addToQueue(el, options);
        })
    }

    private uploadNextFile() {
        var file = this._files.find((f) => {
            return f.isQueued();
        });

        if (file) {
            file.status = FileQueueStatus.Progress;
            file.upload();
        }
    }

    private initiateUpload() {
        var upload_count = this._files.filter((f) => {
            return f.inProgress();
        }).length;

        for (var i = upload_count; i < this.max_files; i++) {
            this.uploadNextFile();
        }
    }

    public uploadAll() {
        this._files.forEach((file) => {
            if (file.isUploadable()) {
                file.status = FileQueueStatus.Queued;
            }
        });

        this.initiateUpload();
    }

    protected statusChange(queue_el: FileQueueObject) {
        if (this.onComplete) {
            this.onComplete(queue_el);
        }

        this.initiateUpload();
    }

    public addToQueue(data: any, options: any) { /* set in service */ }
}