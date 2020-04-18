import { Injectable } from '@angular/core';
import { ConfigService } from './config.service';
import { PingService, PingModel } from './ping.service';
import { tap, catchError, map, timeout, switchMap } from 'rxjs/operators';
import { forkJoin, of, BehaviorSubject, Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import Pusher from 'pusher-js';

@Injectable()
export class PusherService {
    private subject: BehaviorSubject<{
        appId: string,
        options: any
    }> = new BehaviorSubject<{
        appId: string,
        options: any
    }>({ appId: null, options: {} });
    private hosts: Array<PingModel>;
    private hostNames: string[];
    private activeHost: string;
    private errorCount = 0;

    constructor(private config: ConfigService, private ping: PingService) {
        this.hostNames = config.environment.pusher.hosts;
        let port = config.environment.pusher.port;
        this.hostNames = this.hostNames.map(h => {
            let uri = new URL(h);
            if (port && !uri.port) {
                uri.port = port;
            }
            return `${uri.toString().replace(/\/+$/, '')}/apps/${config.environment.pusher.appId}`;
        });
        this.update();
    }

    get valueChanges() {
        return this.subject.asObservable();
    }

    get socketChanges(): Observable<Pusher> {
        return this.valueChanges.pipe(
            switchMap(config => {
                if (config.appId) {
                    let that = this;
                    const socket: Pusher = new Pusher(config.appId, config.options);
                    if (!config.options.networkDisabled) {
                        socket.connection.bind('state_change', function (err) {
                            if (err.current == 'unavailable') {
                                console.error("Pusher:Unavailable", err);
                                that.update();
                            }
                        });
                    } else {
                        socket.networkDisabled = true;
                    }
                    return of(socket);
                } else {
                    return of(null);
                }
            })
        )
    }

    update() {
        this.ping.latency(this.hostNames, 3000).subscribe(data => {
            this.hosts = data;
            let fastest = data[0];
            if (fastest.latency !== Infinity) {
                this.setHost(fastest.url);
            } else if (this.hostNames.length == data.length) {
                this.errorCount++;
                console.log('Unable to get pusher host after tries: ', this.errorCount);
                if (this.errorCount < 1) {
                    setTimeout(() => {
                        this.update();
                    }, 10000);
                } else {
                    this.subject.next({
                        appId: this.config.environment.pusher.appId,
                        options: { networkDisabled: true }
                    })
                }
            }
        });
    }

    setHost(url) {
        if (!url || (this.activeHost && this.activeHost == url)) {
            return;
        }
        this.errorCount = 0;
        let uri = new URL(url);
        let pusherOptions = {
            httpHost: uri.hostname,
            httpPort: uri.port,
            wsHost: uri.hostname,
            wsPort: uri.port,
            authEndpoint: `${url}/pusher/auth`,
            disableStats: true
        };

        if (this.config.environment.pusher.options) {
            Object.assign(pusherOptions, this.config.environment.pusher.options);
        }
        this.activeHost = url;
        this.subject.next({
            appId: this.config.environment.pusher.appId,
            options: pusherOptions
        })
    }
}