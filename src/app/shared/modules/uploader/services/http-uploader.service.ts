import { Injectable, NgZone } from '@angular/core';
import { FileQueueStatus, FileQueueObject, AbstractUploaderService } from '../uploader'
import {
    HttpEventType,
    HttpClient,
    HttpErrorResponse,
    HttpHeaders,
    HttpRequest,
    HttpResponse
} from '@angular/common/http';


@Injectable()
export class HttpUploaderService extends AbstractUploaderService {

    constructor(private http: HttpClient, private zone: NgZone) {
        super();
    }

    public addToQueue(file: any, options: any) {
        this.zone.run(() => {
            const queue_el = new FileQueueObject(file);
            queue_el.remove = () => this.removeFromQueue(queue_el);
            queue_el.cancel = () => this._cancel(queue_el);
            queue_el.upload = () => {
                return this._upload(queue_el, options);
            }

            this._files.push(queue_el);
            this._queue.next(this._files);
        });
    }

    private _upload(queue_el: FileQueueObject, options: any) {
        const form = new FormData();
        var data = options.data || {};

        for (let key in data) {
            form.append(key, data[key]);
        }

        form.append(options.param || 'file', queue_el.file, queue_el.file.name);
        // upload file and report progress
        const http_options = {
            reportProgress: true,
            headers: new HttpHeaders(options.headers || {})
        };

        const req = new HttpRequest('POST', options.url, form, http_options);
        const request = this.http.request(req);

        queue_el.state.subscription = this.http.request(req).subscribe(
            (event: any) => {
                if (event.type === HttpEventType.UploadProgress) {
                    this._progress(queue_el, event);
                } else if (event instanceof HttpResponse) {
                    this._complete(queue_el, event);
                    if (options.lifecycle && options.lifecycle.onSuccess) {
                        options.lifecycle.onSuccess(queue_el);
                    }

                    if (options.lifecycle && options.lifecycle.onComplete) {
                        options.lifecycle.onComplete(queue_el);
                    }
                }
            },
            (err: HttpErrorResponse) => {
                if (err.error instanceof Error) {
                    // A client-side or network error occurred. Handle it accordingly.
                    this._failed(queue_el, err);
                } else {
                    // The backend returned an unsuccessful response code.
                    this._failed(queue_el, err);
                }

                if (options.lifecycle && options.lifecycle.onError) {
                    options.lifecycle.onError(queue_el);
                }

                if (options.lifecycle && options.lifecycle.onComplete) {
                    options.lifecycle.onComplete(queue_el);
                }
            }
        );

        return queue_el.state.subscription;
    }

    private _cancel(queue_el: FileQueueObject) {
        this.zone.run(() => {
            queue_el.state.subscription.unsubscribe();
            queue_el.progress = 0;
            queue_el.status = FileQueueStatus.Error;
            queue_el.response = { message: "Cancelled by user" };
            this.statusChange(queue_el);
            this._queue.next(this._files);
        });
    }

    private _progress(queue_el: FileQueueObject, event: any) {
        this.zone.run(() => {
            // update the FileQueueObject with the current progress
            const progress = Math.round(100 * event.loaded / event.total);
            queue_el.progress = progress;
            queue_el.status = FileQueueStatus.Progress;
            this._queue.next(this._files);
        });
    }

    private _complete(queue_el: FileQueueObject, response: HttpResponse<any>) {
        this.zone.run(() => {
            // update the FileQueueObject as completed
            queue_el.progress = 100;
            queue_el.status = FileQueueStatus.Success;
            queue_el.response = response;
            this.statusChange(queue_el);
            this._queue.next(this._files);
        });
    }

    private _failed(queue_el: FileQueueObject, response: HttpErrorResponse) {
        this.zone.run(() => {
            // update the FileQueueObject as errored
            queue_el.progress = 0;
            queue_el.status = FileQueueStatus.Error;
            queue_el.response = response;
            this.statusChange(queue_el);
            this._queue.next(this._files);
        });
    }
}