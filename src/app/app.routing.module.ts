import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { App404 } from '@app/shared/components/app-404/app-404.component';

const routes: Routes = [
  {
    path: '',
    loadChildren: './views/corewidgets/core-widgets.module#CoreWidgetsModule'
  },
  { path: '404', component: App404 },
  { path: '**', redirectTo: '/404' },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, {
      onSameUrlNavigation: 'reload'
    })
  ],
  exports: [RouterModule],
  providers: []
})
export class AppRoutingModule { }
