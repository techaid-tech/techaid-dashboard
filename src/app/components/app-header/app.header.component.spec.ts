import { TestBed, async, ComponentFixture } from '@angular/core/testing';
import { AppHeader } from './app.header.component';
import { AppSharedModule } from '@app/shared';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { AppStateModule } from '@app/state/state.module';
import { RouterTestingModule } from '@angular/router/testing';
import { RouterModule } from '@angular/router';
import { APP_BASE_HREF } from '@angular/common';
import { Store } from '@ngxs/store';

import { LoginUser, LogoutUser } from '@app/state/user/actions/user.actions';
import { User } from '@app/shared/services/auth.service';
import { AuthService } from '@app/shared/services/auth.service';
import { MockAuthService } from '@app/shared/mocks/mock.auth.service';

describe('AppHeader', () => {
  let fixture: ComponentFixture<AppHeader>;
  let component: AppHeader;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [
        AppHeader
      ],
      imports: [
        AppStateModule,
        RouterTestingModule,
        NoopAnimationsModule
      ],
      providers: [{ provide: AuthService, useClass: MockAuthService }],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(AppHeader);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('renders user logged in state', async(() => {
    const store: Store = TestBed.get(Store);
    const user: User = new User({
      username: 'mock',
      name: 'Mocked User',
      token: 'logged_in'
    });

    const compiled = fixture.debugElement.nativeElement;
    expect(compiled.querySelector('.navbar-nav a.nav-item').textContent).toContain('Login');

    store.dispatch(new LoginUser(user)).subscribe(() => {
      fixture.detectChanges();
      expect(component.user.username).toEqual(user.username);
      expect(compiled.querySelector('.navbar-nav a.nav-item').textContent).toContain('Mocked User');

      store.dispatch(new LogoutUser()).subscribe(() => {
        fixture.detectChanges();
        expect(component.user).toEqual({});
        expect(compiled.querySelector('.navbar-nav a.nav-item').textContent).toContain('Login');
      });
    });
  }));


  it('renders markup to snapshot', async(() => {
    expect(fixture).toMatchSnapshot();
  }));
});
