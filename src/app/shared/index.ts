import { NgModule, ModuleWithProviders } from '@angular/core';
import { Routes, RouterModule } from "@angular/router";
import { BootstrapStatusDirective } from './directives/bootstrap-status.directive';
import { InputMaskComponent } from './components/input-mask/input-mask.component';
import { ImagePreloadDirective } from './directives/image-preload.directive';
import { AutoScroll } from './directives/autoscroll.directive';
import { AuthGuard } from './services/auth.guard';
import { ConfigService } from './services/config.service';
import { PusherService } from './services/pusher.service';
import { PingService } from './services/ping.service';
import { TimeAgoPipe } from './pipes/timeago.pipe';
import { CodeHighlightService } from './services/code-highlight.service';
import { AppInitialComponent } from './components/app-initial/app-initial.component';
import { AuthenticationService } from './services/authentication.service';

@NgModule({
    imports: [
    ],
    exports: [
        BootstrapStatusDirective,
        InputMaskComponent,
        TimeAgoPipe,
        AutoScroll,
        ImagePreloadDirective,
        AppInitialComponent
    ],
    declarations: [
        BootstrapStatusDirective,
        InputMaskComponent,
        ImagePreloadDirective,
        TimeAgoPipe,
        AppInitialComponent,
        AutoScroll
    ]
})
export class PicSharedModule {
    static forRoot(): ModuleWithProviders {
        return {
            ngModule: PicSharedModule,
            providers: [
                AuthenticationService,
                AuthGuard,
                ConfigService,
                PusherService,
                PingService,
                CodeHighlightService
            ]
        }
    }
}
