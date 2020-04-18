import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AppGridDirective } from './app-grid.directive';

@NgModule({
  imports: [CommonModule],
  declarations: [AppGridDirective],
  exports: [AppGridDirective]
})
export class AppGridModule {

}