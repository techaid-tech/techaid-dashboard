import { Injectable, Optional, Inject, NgZone } from '@angular/core';
import { HttpInterceptor, HttpEvent, HttpHandler, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { NgProgress, NgProgressRef } from '@ngx-progressbar/core';

import { NgModule, ModuleWithProviders } from '@angular/core';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { InjectionToken } from '@angular/core';

export interface PicNgProgressHttpConfig {
  id?: string;
  silentApis?: string[];
}

export const CONFIG = new InjectionToken<PicNgProgressHttpConfig>('config');

@Injectable()
export class PicNgProgressInterceptor implements HttpInterceptor {

  private _inProgressCount = 0;
  private _progressRef: NgProgressRef;
  private _config: PicNgProgressHttpConfig = {
    id: 'root',
    silentApis: []
  };

  constructor(private ngProgress: NgProgress, private zone: NgZone,  @Optional() @Inject(CONFIG) config?: PicNgProgressHttpConfig) {
    this._config = {...this._config, ...config};
    this._progressRef = ngProgress.ref(this._config.id);
  }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
   
    if (this.checkUrl(req)) {
      return next.handle(req);
    }


    this._inProgressCount++;
    this.zone.run(() => {
      if (!this._progressRef.isStarted) {
        this._progressRef.start();
      }
    });

    return next.handle(req).pipe(
      finalize(() => {
        this._inProgressCount--;
        this.zone.run(() => {
          if (this._inProgressCount === 0) {
            this._progressRef.complete();
          }
        });
      })
    );
  }

  /**
   * Check if request is silent.
   * @param req request
   */
  private checkUrl(req: HttpRequest<any>) {
    const url = req.url.toLowerCase();
    const found = this._config.silentApis.find((u) => url.startsWith(u));
    return !!found;
  }
}


@NgModule({
})
export class PicNgProgressHttpModule {
  static forRoot(config?: PicNgProgressHttpConfig): ModuleWithProviders {
    return {
      ngModule: PicNgProgressHttpModule,
      providers: [
        { provide: CONFIG, useValue: config },
        { provide: HTTP_INTERCEPTORS, useClass: PicNgProgressInterceptor, multi: true }
      ]
    };
  }
}