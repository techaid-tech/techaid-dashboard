import { Component, ViewChild, ViewEncapsulation } from '@angular/core';
import { concat, Subject, of, forkJoin, Observable, Subscription, from } from 'rxjs';
import { AppGridDirective } from '@app/shared/modules/grid/app-grid.directive';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import gql from 'graphql-tag';
import { Apollo } from 'apollo-angular';
import { query } from '@angular/animations';
import { FormControl, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { FormlyFieldConfig, FormlyFormOptions } from '@ngx-formly/core';
import { debounceTime, distinctUntilChanged, switchMap, tap, catchError } from 'rxjs/operators';
import { Select } from '@ngxs/store';
import * as Tablesaw from 'tablesaw';
import 'datatables.net-responsive';
import 'datatables.net-rowreorder';
import { CoreWidgetState } from '@views/corewidgets/state/corewidgets.state';
import { User, UserState } from '@app/state/user/user.state';

const QUERY_ENTITY = gql`
query findAllFaqs($term: String) {
  post(where: {slug: {_eq: "/faqs"}}){
    id
    content
  }

  faqs(orderBy: [{key: "position", value: "desc"}], where: {
    published: {_eq: true}
    AND: {
      OR: [
        {
          title: {
            _contains: $term
          }
        },
        {
          content: {
            _contains: $term
          }
        }
      ]
    }
  }){
     id
     title
     content
     position
     published
     createdAt
     updatedAt
  }
}
`;


@Component({
  selector: 'faq-list',
  styleUrls: ['faq-list.scss'],
  templateUrl: './faq-list.html'
})
export class FaqListComponent {
  sub: Subscription;
  user: User;
  post: String;

  @Select(UserState.user) user$: Observable<User>;

  @Select(CoreWidgetState.query) search$: Observable<string>;
  entities: Array<any>;
  queryRef = this.apollo
      .watchQuery({
        query: QUERY_ENTITY,
        variables: {}
      });

  constructor(
    private apollo: Apollo
  ) {

  }

  fetchData(vars = {}) {
    this.queryRef.refetch(vars).then(res => {
      let data: any = {};
      if (res.data) {
        data = res['data']['faqs'];
        this.entities = data;
        this.post = res['data']['post'];
      }
    });
  }

  ngOnInit() {
    this.sub = this.search$.subscribe(query => {
      this.fetchData({term: query});
    });
    this.sub.add(this.user$.subscribe(user => {
        this.user = user;
    }));
  }

  ngOnDestroy() {
    if (this.sub) {
      this.sub.unsubscribe();
    }
  }

  ngAfterViewInit() {
  }
}
