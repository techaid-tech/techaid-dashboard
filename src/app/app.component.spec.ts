import { TestBed, async } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { AppHeader } from './components/app-header/app.header.component';
import { NgProgressModule } from '@ngx-progressbar/core';
import { PicSharedModule } from '@app/shared'
import { NgModule, APP_INITIALIZER, Component } from '@angular/core';
import { AppRoutingModule } from './app.routing.module';
import { App404 } from '@app/shared/components/app-404/app-404.component';
import { APP_BASE_HREF } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import { AppModule } from './app.module';

@Component({ selector: 'ng-progress', template: '' })
class NgProgressStub { }

describe('AppComponent', () => {
  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [
      ],
      imports: [
        AppModule
      ],
      providers: [{ provide: APP_BASE_HREF, useValue: '/' }],
    }).overrideModule(AppModule, {
      remove: {
        imports: [NgProgressModule],
      },
      add: {
        declarations: [NgProgressStub]
      }
    }).compileComponents();
  }));

  it('should create the app', async(() => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.debugElement.componentInstance;
    expect(app).toBeTruthy();
  }));

  it('renders markup to snapshot', async(() => {
    const fixture = TestBed.createComponent(AppComponent);
    expect(fixture).toMatchSnapshot();
  }));

  // it(`should have as title 'app'`, async(() => {
  //   const fixture = TestBed.createComponent(AppComponent);
  //   const app = fixture.debugElement.componentInstance;
  //   expect(app.title).toEqual('app');
  // }));

  // it('should render title in a h1 tag', async(() => {
  //   const fixture = TestBed.createComponent(AppComponent);
  //   fixture.detectChanges();
  //   const compiled = fixture.debugElement.nativeElement;
  //   expect(compiled.querySelector('h1').textContent).toContain('Welcome to app!');
  // }));

});
