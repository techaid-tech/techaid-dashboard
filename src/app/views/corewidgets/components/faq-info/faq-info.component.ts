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

const QUERY_ENTITY = gql`
query findFAQ($id: Long!) {
  faq(where: {
    id: {
      _eq: $id
    }
  }){
     id
     title
     content
     published
     position
     createdAt
     updatedAt
  }
}
`;

const UPDATE_ENTITY = gql`
mutation updateFaq($data: UpdateFaqInput!) {
  updateFaq(data: $data){
     id
     content
     title
     published
     createdAt
     updatedAt
     position
  }
}
`;

const DELETE_ENTITY = gql`
mutation deleteFaq($id: ID!) {
  deleteFaq(id: $id)
}
`;

@Component({
  selector: 'faq-info',
  styleUrls: ['faq-info.scss'],

  templateUrl: './faq-info.html'
})
export class FaqInfoComponent {


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
      key: 'title',
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
      fieldGroupClassName: 'row',
      fieldGroup: [
        {
          key: 'position',
          type: 'input',
          className: 'col-md-6',
          defaultValue: true,
          templateOptions: {
            label: 'Order',
            description: 'The order dermines where in the list this FAQ appears, the higher the order, the higher up in the list the FAQ will apper',
            type: 'number',
            placeholder: '',
            required: false
          }
        },
        {
          key: 'published',
          type: 'checkbox',
          className: 'col-md-6',
          defaultValue: true,
          templateOptions: {
            label: 'Published?',
            description: 'Unpublished FAQ\'s will not appear in the FAQ list',
            placeholder: '',
            required: false
          }
        }
      ]
    },
    {
      key: 'content',
      type: 'richtext',
      className: 'col-md-12',
      defaultValue: '',
      templateOptions: {
        label: 'Content',
        placeholder: '',
        required: false
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
      if (res.data && res.data['faq']) {
        const data = res.data['faq'];
        this.model = this.normalizeData(data);
        this.entityName = this.model['title'];
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
      this.entityId = +params['faqId'];
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
      this.model = this.normalizeData(res.data['updateFaq']);
      this.entityName = this.model['title'];
      this.toastr.info(`
      <small>Successfully updated FAQ ${this.entityName}</small>
      `, 'Updated FAQ', {
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
      if (res.data.deleteFaq) {
        this.toastr.info(`
        <small>Successfully deleted FAQ ${this.entityName}</small>
        `, 'FAQ Deleted', {
            enableHtml: true
          });
        this.router.navigate(['/dashboard/faqs']);
      }
    }, err => {
      this.toastr.error(`
      <small>${err.message}</small>
      `, 'Error Deleting FAQ', {
          enableHtml: true
        });
    });
  }
}
