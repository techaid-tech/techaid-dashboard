import { NgModule, ModuleWithProviders } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { InputMaskComponent } from './components/input-mask/input-mask.component';
import { AuthGuard } from './services/auth.guard';
import { ConfigService } from './services/config.service';
import { TimeAgoPipe } from './pipes/timeago.pipe';
import { YesNoPipe } from './pipes/yesno.pipe';
import { AppInitialComponent } from './components/app-initial/app-initial.component';
import { AuthenticationService } from './services/authentication.service';
import { CsvService } from './services/csv.service';

@NgModule({
    imports: [
    ],
    exports: [
        InputMaskComponent,
        TimeAgoPipe,
        YesNoPipe,
        AppInitialComponent
    ],
    declarations: [
        InputMaskComponent,
        TimeAgoPipe,
        YesNoPipe,
        AppInitialComponent,
    ]
})
export class AppSharedModule {
    static forRoot(): ModuleWithProviders<AppSharedModule> {
        return {
            ngModule: AppSharedModule,
            providers: [
                AuthenticationService,
                AuthGuard,
                ConfigService,
                CsvService,
            ]
        };
    }
}
