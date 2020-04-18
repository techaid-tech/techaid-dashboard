import { NgModule, ModuleWithProviders } from '@angular/core';
import { NgxsModule } from '@ngxs/store';
import { NgxsLoggerPluginModule } from '@ngxs/logger-plugin';
import { NgxsReduxDevtoolsPluginModule } from '@ngxs/devtools-plugin';
import { NgxsRouterPluginModule } from '@ngxs/router-plugin';
import { NgxsFormPluginModule } from '@ngxs/form-plugin';
import { UserState } from './user/user.state';
export { UserState } from './user/user.state';
const DevToolsOptions: any = {
    name: 'PICNGXS',
    serialize: undefined
}

@NgModule({
    exports: [
    ],
    imports: [
        NgxsModule.forRoot([UserState]),
        //NgxsLoggerPluginModule.forRoot(),
        NgxsRouterPluginModule.forRoot(),
        NgxsFormPluginModule.forRoot(),
        NgxsReduxDevtoolsPluginModule.forRoot()
    ],
})
export class PicStateModule {
    static forRoot() {
        return {
            ngModule: PicStateModule,
            providers: [
            ]
        }
    }
}
