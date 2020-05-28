import { Component, ViewChild, ViewEncapsulation } from '@angular/core';
import { Subject, of, forkJoin, Observable, Subscription } from 'rxjs';
import { AppGridDirective } from "@app/shared/modules/grid/app-grid.directive";
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
import { modelGroupProvider } from '@angular/forms/src/directives/ng_model_group';
import { User, UserState } from '@app/state/user/user.state';
import { Title } from '@angular/platform-browser';

const QUERY_ENTITY = gql`
query findAll {
  kits: kitsConnection(where: {
    archived: {_neq: true}
  }) {
    totalElements
  }
  donors: donorsConnection(where: {}) {
    totalElements
  }
  volunteers: volunteersConnection(where: {}) {
    totalElements
  }
  typeCount {
    type
    count
  }
  requestCount {
    LAPTOP: laptops
    TABLET: tablets
    OTHER: other
    PHONE: phones
    ALLINONE: allInOnes
  }
}
`;


@Component({
  selector: 'dashboard-index',
  styleUrls: ['dashboard-index.scss'],
 
  templateUrl: './dashboard-index.html'
})
export class DashboardIndexComponent {
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

  styles = {
    'LAPTOP': {title: 'Laptops', style: 'primary', progress: 0},
    'TABLET': {title: 'Tablets', style: 'info', progress: 0},
    'OTHER': {title: 'Other', style: 'danger', progress: 0},
    'PHONE': {title: 'Phones', style: 'warning', progress: 0},
    'ALLINONE': {title: 'All In ONes', style: 'success', progress: 0}
  }

  private queryRef = this.apollo
    .watchQuery({
      query: QUERY_ENTITY,
      variables: {}
    });

  private normalizeData(data: any){
    (data.typeCount || []).forEach(s => {
      var p = (data.requestCount[s.type]/s.count)*100;
      if(p > 100) {
        p = 100;
      }
      this.styles[s.type].progress = p;
    });
    console.log('data', data);
    return data;
  }

  private fetchData(vars) {
    this.queryRef.refetch(vars).then(res => {
      if (res.data) {
        this.model = this.normalizeData(res.data);
      }else {
        this.model = {};
      }
    });
  }

  ngOnInit() {
    this.sub = this.user$.subscribe(user => {
        this.user = user;
    });
    this.fetchData({});
  }

  ngOnDestory() {
    if (this.sub) {
      this.sub.unsubscribe();
    }
  }
}
