import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { environment } from '@env/environment';
import { PingService } from '@app/shared/services/ping.service';
import { ConfigParams } from '@app/state/config-params';

@Injectable()
export class ConfigService {
    environment: Partial<ConfigParams> = Object.assign({}, environment);

    constructor(private http: HttpClient, private ping: PingService) {
    }

    load(): Promise<boolean> {
        return new Promise<boolean>((resolve) => {
            if (environment.remote_config) {
                this.http.get<any>('config.json').pipe(
                    tap(data => {
                        this.update(data);
                        resolve(true);
                    },
                        err => {
                            this.update({});
                            resolve(true);
                        })
                ).subscribe();
            } else {
                this.update({});
                resolve(true);
            }
        });
    }


    private update(data) {
        Object.assign(this.environment, environment, data);
    }
}
