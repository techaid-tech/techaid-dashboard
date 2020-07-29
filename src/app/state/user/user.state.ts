import { State, StateContext, Action, Selector, NgxsOnInit } from '@ngxs/store';
import { LoginUser, LogoutUser } from './actions/user.actions';
import { NgZone, Injectable } from '@angular/core';
import { AuthenticationService } from '@app/shared/services/authentication.service';
import { tap, first } from 'rxjs/operators';

export interface UserStateModel {
   user: User;
}

export class User {
    name: String;
    picture: String;
    authenticated: Boolean;
    permissions: Array<string> = [];
    authorities: {[key: string]: boolean} = {};

    constructor(init?: Partial<User>) {
        Object.assign(this, init);
        (this.permissions || []).forEach(p => {
            this.authorities[p] = true;
        });
    }
}

@State<UserStateModel>({
    name: 'user',
    defaults: {
        user: new User({
            name: '',
            picture: '',
            authenticated: false,
            permissions: [],
            authorities: {}
        })
    }
})
@Injectable()
export class UserState implements NgxsOnInit {
    constructor(private auth: AuthenticationService, private zone: NgZone) { }

    @Selector() static user(state: UserStateModel) {
        return state.user;
    }

    ngxsOnInit(ctx: StateContext<UserStateModel>) {
        this.auth.isAuthenticated$.pipe(first()).subscribe(loggedIn => {
            if (loggedIn) {
                this.handleLoggedIn(ctx);
            }
        });
    }

    handleLoggedIn(ctx: StateContext<UserStateModel>) {
        ctx.patchState({
            user: new User({
                name: 'Me',
                picture: '',
                authenticated: true,
            })
        });
        this.auth.getUser$().subscribe(u => {
            u.authenticated = true;
            ctx.patchState({user: new User(u)});
            this.auth.getTokenSilently$().pipe(first()).subscribe(data => {
                const parts = data.split('.');
                const token = JSON.parse(atob(parts[1]));
                u.permissions = token.permissions || [];
                ctx.patchState({user: new User(u)});
            });
        });
    }


    @Action(LoginUser)
    loginUser(ctx: StateContext<UserStateModel>, action: LoginUser) {
        this.auth.isAuthenticated$.pipe(first()).subscribe(loggedIn => {
            if (loggedIn) {
                this.handleLoggedIn(ctx);
            } else {
                this.auth.login();
            }
        });
    }

    @Action(LogoutUser)
    logoutUser(ctx: StateContext<UserStateModel>, action: LogoutUser) {
        const state = ctx.getState();
        ctx.patchState({
            user: new User({
                authenticated: false,
                name: '',
                picture: '',
            })
        });

        this.zone.run(() => {
            this.auth.logout();
        });
    }
}
