import { Component, ViewChild, ViewEncapsulation } from '@angular/core';
import { Subject, of, forkJoin, Observable, Subscription } from 'rxjs';
import { AppGridDirective } from '@app/shared/modules/grid/app-grid.directive';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import gql from 'graphql-tag';
import { Apollo } from 'apollo-angular';
import { FormGroup } from '@angular/forms';
import { FormlyFormOptions, FormlyFieldConfig } from '@ngx-formly/core';
import { ActivatedRoute, Router } from '@angular/router';
import { isInteger } from '@ng-bootstrap/ng-bootstrap/util/util';
import { UpdateFormDirty } from '@ngxs/form-plugin';
import { Select } from '@ngxs/store';
import { User, UserState } from '@app/state/user/user.state';
import { Title } from '@angular/platform-browser';

const QUERY_ENTITY = gql`
query findPost($slug: String) {
  post(where: {
    slug: {
      _eq: $slug
    }
    published: {
      _eq: true
    }
  }){
     id
     title
     slug
     content
     published
     createdAt
     updatedAt
  }
}
`;


@Component({
  selector: 'post-data',
  styleUrls: ['post-data.scss'],

  templateUrl: './post-data.html'
})
export class PostDataComponent {
  sub: Subscription;
  model: any;
  user: User;
  @Select(UserState.user) user$: Observable<User>;

  constructor(
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private apollo: Apollo,
    private titleService: Title
  ) {

  }

  private queryRef = this.apollo
    .watchQuery({
      query: QUERY_ENTITY,
      variables: {}
    });

  private normalizeData(data: any) {
    return data;
  }

  private fetchData(vars) {
    this.queryRef.refetch(vars).then(res => {
      if (res.data && res.data['post']) {
        const data = res.data['post'];
        this.model = this.normalizeData(data);
        this.titleService.setTitle(data.title);
      } else {
        this.model = {};
      }
    });
  }

  ngOnInit() {
    this.sub = this.user$.subscribe(user => {
        this.user = user;
    });
    const url = (this.router.url || '').split('?', 2)[0].replace(/^\//, '');
    if (url.trim().length > 0) {
      this.fetchData({slug: url});
    } else {
      this.fetchData({slug: '/'});
    }
  }

  ngOnDestroy() {
    if (this.sub) {
      this.sub.unsubscribe();
    }
  }
}
