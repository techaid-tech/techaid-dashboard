import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { PicSharedModule } from '@app/shared'
import { HTTP_INTERCEPTORS } from '@angular/common/http';

export const ROUTES: Routes = [
]

@NgModule({
    imports: [
        CommonModule,
        ReactiveFormsModule,
        RouterModule.forChild(ROUTES),
        PicSharedModule
    ],
    declarations: [
    ],
    providers: [
        /*
        {
            provide: HTTP_INTERCEPTORS,
            useClass: TokenInterceptor,
            multi: true
        }
        */
    ]
})
export class AppAuthModule {}
