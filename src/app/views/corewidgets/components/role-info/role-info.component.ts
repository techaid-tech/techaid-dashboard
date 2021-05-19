import { Component, ViewChild, ViewEncapsulation } from '@angular/core';
import { Subject, of, forkJoin, Observable, Subscription } from 'rxjs';
import { AppGridDirective } from '@app/shared/modules/grid/app-grid.directive';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import gql from 'graphql-tag';
import { Apollo } from 'apollo-angular';
import { FormGroup } from '@angular/forms';
import { FormlyFieldConfig } from '@ngx-formly/core';
import { ActivatedRoute, Router } from '@angular/router';
import { isInteger } from '@ng-bootstrap/ng-bootstrap/util/util';
import { UpdateFormDirty } from '@ngxs/form-plugin';
import { Select } from '@ngxs/store';

const QUERY_ROLE = gql`
query findRole($id: ID!) {
  role(id: $id){
     id
     name
     description
  }
}
`;

@Component({
  selector: 'role-info',
  styleUrls: ['role-info.scss'],

  templateUrl: './role-info.html'
})
export class RoleInfoComponent {


  constructor(
    private modalService: NgbModal,
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private toastr: ToastrService,
    private apollo: Apollo
  ) {

  }
  sub: Subscription;
  form: FormGroup = new FormGroup({});
  model = {};
  roleName: string;
  roleId: string;

  fields: Array<FormlyFieldConfig> = [
    {
      fieldGroupClassName: 'row',
      fieldGroup: [
        {
          key: 'name',
          type: 'input',
          className: 'col-md-6',
          defaultValue: '',
          templateOptions: {
            label: 'Name',
            placeholder: '',
            required: true
          }
        },
        {
          key: 'description',
          type: 'input',
          className: 'col-md-6',
          defaultValue: '',
          templateOptions: {
            label: 'Description',
            placeholder: '',
            required: true
          }
        },
      ]
    },
    {
      fieldGroupClassName: 'row',
      fieldGroup: [
        {
          key: 'startsAt',
          type: 'date',
          className: 'col-md-6',
          templateOptions: {
            label: 'Starts At',
            description: 'The date this role should become active',
            required: true,
          }
        },
        {
          key: 'expiresAt',
          type: 'date',
          className: 'col-md-6',
          templateOptions: {
            label: 'Expires At',
            description: 'The date this role should expire',
            required: false
          }
        }
      ]
    }
  ];

  private queryRef = this.apollo
    .watchQuery({
      query: QUERY_ROLE,
      variables: {}
    });

  modal(content) {
    this.modalService.open(content, {
      centered: true
    });
  }

  private fetchData() {
    if (!this.roleId) {
      return;
    }

    this.queryRef.refetch({
      id: this.roleId
    }).then(res => {
      if (res.data && res.data['role']) {
        this.model = res.data['role'] || {};
        this.roleName = this.model['description'] || this.model['name'];
      } else {
        this.model = {};
        this.roleName = 'Not Found!';
      }
    }, err => {
      this.toastr.warning(`
          <small>${err.message}</small>
        `, 'GraphQL Error', {
          enableHtml: true,
          timeOut: 15000,
          disableTimeOut: true
        });
    });
  }

  ngOnInit() {
    this.sub = this.activatedRoute.params.subscribe(params => {
      this.roleId = params['roleId'];
      this.fetchData();
    });
  }

  ngOnDestroy() {
    if (this.sub) {
      this.sub.unsubscribe();
    }
  }
}
