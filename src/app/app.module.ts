import { BrowserModule } from '@angular/platform-browser';
import { NgModule, APP_INITIALIZER } from '@angular/core';

import { PicSharedModule } from '@app/shared'
import { AppComponent } from './app.component';
import { FormlyModule } from '@ngx-formly/core';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { PicFormModule } from './shared/modules/formly';
import { PicUploaderModule } from "@app/shared/modules/uploader/pic-uploader.module";
import { AppHeader } from './components/app-header/app.header.component';
import { AppSidebar } from './components/app-sidebar/app.sidebar.component';
import { App404 } from '@app/shared/components/app-404/app-404.component';
import { AppAuthModule } from './shared/modules/auth'
import { HttpClientModule } from '@angular/common/http';
import { AppRoutingModule } from './app.routing.module';
import { NgProgressModule } from '@ngx-progressbar/core';
import { PicNgProgressHttpModule } from '@app/shared/utils/pic-ngx-progress-http.ts';
import { ToastrModule } from 'ngx-toastr';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ConfigService } from '@app/shared/services/config.service';
import { FormlyBootstrapModule } from '@ngx-formly/bootstrap';
import { PicStateModule } from '@app/state/state.module';
import { FormsModule } from '@angular/forms';
import { GraphQLModule } from './graphql.module';
import { AgmCoreModule } from '@agm/core';


@NgModule({
  declarations: [
    AppComponent,
    AppHeader,
    AppSidebar,
    App404
  ],
  imports: [
    FormsModule,
    BrowserAnimationsModule,
    PicSharedModule.forRoot(),
    FormlyModule.forRoot(),
    FormlyBootstrapModule,
    NgbModule.forRoot(),
    PicFormModule.forRoot(),
    PicUploaderModule.forRoot(),
    ToastrModule.forRoot({
      positionClass: 'toast-top-right',
      preventDuplicates: true
    }),
    AppAuthModule,
    BrowserModule,
    HttpClientModule,
    NgProgressModule,
    PicNgProgressHttpModule.forRoot(),
    AppRoutingModule,
    PicStateModule,
    GraphQLModule,
    AgmCoreModule.forRoot({
      apiKey: 'AIzaSyDdo6mFEbfrJafK3tdsebw9ZRirUfHwFQw'
    })
  ],
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: configServiceFactory,
      deps: [ConfigService],
      multi: true
    },
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }


export function configServiceFactory(config: ConfigService) {
  return () => config.load();
}
