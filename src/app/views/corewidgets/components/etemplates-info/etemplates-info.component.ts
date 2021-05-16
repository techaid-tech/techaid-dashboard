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

const QUERY_ENTITY = gql`
query findTemplate($id: Long!) {
  emailTemplate(where: {
    id: {
      _eq: $id
    }
  }){
     id
     subject
     body
     active
     createdAt
     updatedAt
  }
}
`;

const UPDATE_ENTITY = gql`
mutation updateTemplate($data: UpdateEmailTemplateInput!) {
  updateEmailTemplate(data: $data){
     id
     subject
     body
     active
     createdAt
     updatedAt
  }
}
`;

const DELETE_ENTITY = gql`
mutation deleteFaq($id: ID!) {
  deleteEmailTemplate(id: $id)
}
`;

@Component({
  selector: 'etemplates-info',
  styleUrls: ['etemplates-info.scss'],

  templateUrl: './etemplates-info.html'
})
export class EmailTemplatesInfoComponent {


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
  options: FormlyFormOptions = {};
  model = {};
  entityName: string;
  entityId: number;

  fields: Array<FormlyFieldConfig> = [
    {
      fieldGroupClassName: 'row',
      fieldGroup: [
        {
          key: 'subject',
          type: 'input',
          className: 'col-md-12 border-left-info card pt-3 mb-3',
          defaultValue: '',
          templateOptions: {
            label: 'Title',
            placeholder: '',
            required: false
          }
        },
        {
          key: 'active',
          type: 'checkbox',
          className: 'col-md-6',
          templateOptions: {
            label: 'Active?',
            description: 'Inactive templates will not appear in the selection list',
            placeholder: '',
            required: false
          }
        }
      ]
    },
    {
      key: 'body',
      type: 'richtext',
      className: 'col-md-12',
      defaultValue: '',
      templateOptions: {
        label: 'Content',
        placeholder: '',
        required: false,
        htmlEdit: false,
      }
    },
  ];

  private queryRef = this.apollo
    .watchQuery({
      query: QUERY_ENTITY,
      variables: {}
    });

  modal(content) {
    this.modalService.open(content, { centered: true });
  }

  private normalizeData(data: any) {
    return data;
  }

  private fetchData() {
    if (!this.entityId) {
      return;
    }

    this.queryRef.refetch({
      id: this.entityId
    }).then(res => {
      if (res.data && res.data['emailTemplate']) {
        const data = res.data['emailTemplate'];
        this.model = this.normalizeData(data);
        this.entityName = this.model['subject'];
      } else {
        this.model = {};
        this.entityName = 'Not Found!';
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
      this.entityId = +params['templateId'];
      this.fetchData();
    });
  }

  ngOnDestroy() {
    if (this.sub) {
      this.sub.unsubscribe();
    }
  }

  updateEntity(data: any) {
    data.id = this.entityId;
    this.apollo.mutate({
      mutation: UPDATE_ENTITY,
      variables: {
        data
      }
    }).subscribe(res => {
      this.model = this.normalizeData(res.data['updateEmailTemplate']);
      this.entityName = this.model['subject'];
      this.toastr.info(`
      <small>Successfully updated Template ${this.entityName}</small>
      `, 'Updated Template', {
          enableHtml: true
        });
    }, err => {
      this.toastr.error(`
      <small>${err.message}</small>
      `, 'Update Error', {
          enableHtml: true
        });
    });
  }

  deleteEntity() {
    this.apollo.mutate<any>({
      mutation: DELETE_ENTITY,
      variables: { id: this.entityId }
    }).subscribe(res => {
      if (res.data.deleteEmailTemplate) {
        this.toastr.info(`
        <small>Successfully deleted Template ${this.entityName}</small>
        `, 'Template Deleted', {
            enableHtml: true
          });
        this.router.navigate(['/dashboard/email/templates']);
      }
    }, err => {
      this.toastr.error(`
      <small>${err.message}</small>
      `, 'Error Deleting Template', {
          enableHtml: true
        });
    });
  }
}
