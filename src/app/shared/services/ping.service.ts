import { Injectable } from '@angular/core';
import { ConfigService } from './config.service';
import { tap, catchError, map, timeout, switchMap } from 'rxjs/operators';
import { zip, of, BehaviorSubject, Observable} from 'rxjs';
import { HttpClient } from '@angular/common/http';
import Pusher from 'pusher-js';

export interface PingModel {
    url: string
    latency: number
    errors?: any[]
    response?: any
    metadata?: any
}

@Injectable()
export class PingService {
    constructor(private http: HttpClient) {     
    }

    latency(urls : string[], timeoutInterval: number = 5000) : Observable<Array<PingModel>> {
        let models : Array<PingModel> = urls.map(url => {
            return {url: url, latency: Infinity}
        });

        return Observable.create(observer => {
            let responses : PingModel[] = [];
            models.forEach(m => {
                let start = performance.now();
                this.http.get<PingModel>(`${m.url}`).pipe(
                    timeout(timeoutInterval),
                    catchError(err => {
                        return of({latency: Infinity, url: m.url, response: null, errors: [err]})
                    }),
                    map((res : PingModel) => {
                        if(res && res.latency) {
                            return res;
                        }else{
                            return {latency: performance.now() - start, url: m.url, response: res}
                        }
                    })
                ).subscribe(data => {
                    responses.push(data);
                    observer.next(responses.sort((a,b) => {
                        if(a.latency < b.latency) {return -1}
                        if(a.latency > b.latency) {return 1}
                        return 0;
                    }));    
                    if(responses.length == models.length){
                        observer.complete();
                    }
                });
            })
        });
    }
}