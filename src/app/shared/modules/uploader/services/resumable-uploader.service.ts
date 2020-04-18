declare var require: any;
import { Injectable, NgZone } from '@angular/core';
import { FileQueueStatus, FileQueueObject, AbstractUploaderService } from '../uploader'
const Resumable = require('resumablejs');

@Injectable()
export class ResumableUploaderService extends AbstractUploaderService {

    constructor(private zone: NgZone) {
        super();
    }

    public addToQueue(file: any, options: any) {

        const queue_el = new FileQueueObject(file, options.key);

        queue_el.upload = () => {
            let resumable = new Resumable(options);
            queue_el.state.resumable = resumable;
            resumable.addFile(file);

            resumable.on('fileSuccess', (file, response) => {
                this.zone.run(() => {
                    queue_el.progress = Math.round(file.progress() * 100);
                    queue_el.response = response;
                    queue_el.status = FileQueueStatus.Success;
                    if (options.lifecycle && options.lifecycle.onSuccess) {
                        options.lifecycle.onSuccess(queue_el);
                    }

                    if (options.lifecycle && options.lifecycle.onComplete) {
                        options.lifecycle.onComplete(queue_el);
                    }

                    this.statusChange(queue_el);
                    this._queue.next(this._files);
                });
            });

            resumable.on('fileError', (file, response) => {
                this.zone.run(() => {
                    queue_el.progress = Math.round(file.progress() * 100);
                    queue_el.response = response;
                    queue_el.status = FileQueueStatus.Error;

                    if (options.lifecycle && options.lifecycle.onError) {
                        options.lifecycle.onError(queue_el);
                    }

                    if (options.lifecycle && options.lifecycle.onComplete) {
                        options.lifecycle.onComplete(queue_el);
                    }

                    this.statusChange(queue_el);
                    this._queue.next(this._files);
                });
            });

            resumable.on('fileProgress', (file, ratio) => {
                this.zone.run(() => {
                    queue_el.progress = Math.round(file.progress() * 100);
                    queue_el.status = FileQueueStatus.Progress;
                    this._queue.next(this._files);
                });
            });

            setTimeout(() => {
                resumable.upload();
            }, 0);

            return resumable;
        }

        queue_el.pause = () => queue_el.state.resumable.pause();
        queue_el.cancel = () => {
            this.zone.run(() => {
                queue_el.state.resumable.cancel();
                queue_el.progress = 0;
                queue_el.status = FileQueueStatus.Error;
                queue_el.response = { message: "Cancelled by user" };
                this.statusChange(queue_el);
                if (options.lifecycle && options.lifecycle.onComplete) {
                    options.lifecycle.onComplete(queue_el);
                }
                this._queue.next(this._files);
            });
        }

        queue_el.remove = () => {
            this.zone.run(() => {
                queue_el.cancel();
                this.removeFromQueue(queue_el);
            });
        }


        this.zone.run(() => {
            this._files.push(queue_el);
            this._queue.next(this._files);
        });
    }
}
