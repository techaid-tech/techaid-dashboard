import { Select, Store } from '@ngxs/store';
import { UserStateModel, UserState, User } from '@app/state/user/user.state';
import { LogoutUser } from '@app/state/user/actions/user.actions';
import { Component, ViewChild, ViewEncapsulation } from '@angular/core';
import { concat, Subject, of, forkJoin, Observable, Subscription, from } from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { Apollo } from 'apollo-angular';
import { SearchQuery } from '@views/corewidgets/state/actions';
import * as $ from 'jquery';


@Component({
    selector: 'app-header',
    templateUrl: 'app.header.component.html',
    styles: [`
        .nav-border {
            border-bottom: 1px solid #f8f9fa;
        }
    `]
})
export class AppHeader {
    public user: User;
    private sub: Subscription;
    apis$: Observable<any>;
    @Select(UserState.user) user$: Observable<User>;
    constructor(
        private store: Store,
        private toastr: ToastrService,
        private modalService: NgbModal,
        private apollo: Apollo) { }

    modal(content) {
        this.modalService.open(content, { centered: true });
    }

    toggleSideBar(){
        $("body").toggleClass("sidebar-toggled");
    }

    ngOnInit() {
        this.sub = this.user$.subscribe(user => {
            this.user = user;
        });
    }

    postSearch(text: string) {
        this.store.dispatch(new SearchQuery(text))
    }

    ngOnDestroy() {
        if (this.sub) {
            this.sub.unsubscribe();
        }
    }

    logout() {
        this.store.dispatch(new LogoutUser());
    }
}
