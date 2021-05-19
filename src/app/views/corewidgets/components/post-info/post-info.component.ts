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
query findPost($id: Long!) {
  post(where: {
    id: {
      _eq: $id
    }
  }){
     id
     title
     slug
     secured
     content
     published
     createdAt
     updatedAt
  }
}
`;

const UPDATE_ENTITY = gql`
mutation updatePost($data: UpdatePostInput!) {
  updatePost(data: $data){
     id
     content
     slug
     title
     secured
     published
     createdAt
     updatedAt
  }
}
`;

const DELETE_ENTITY = gql`
mutation deletePost($id: ID!) {
  deletePost(id: $id)
}
`;

@Component({
  selector: 'post-info',
  styleUrls: ['post-info.scss'],

  templateUrl: './post-info.html'
})
export class PostInfoComponent {

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
      className: 'col-md-12',
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
          key: 'slug',
          type: 'input',
          className: 'col-md-12',
          defaultValue: '',
          templateOptions: {
            label: 'Slug',
            description: 'The url to the post',
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
            description: 'Unpublished Posts will not be available',
            placeholder: '',
            required: false
          }
        },
        {
          key: 'secured',
          type: 'checkbox',
          className: 'col-md-6',
          defaultValue: false,
          templateOptions: {
            label: 'Secured?',
            description: 'Secured pages are only visible to logged in users',
            placeholder: '',
            required: false
          }
        },
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
        rows:  20,
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
      if (res.data && res.data['post']) {
        const data = res.data['post'];
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
      this.entityId = +params['postId'];
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
      this.model = this.normalizeData(res.data['updatePost']);
      this.entityName = this.model['title'];
      this.toastr.info(`
      <small>Successfully updated Post ${this.entityName}</small>
      `, 'Updated Post', {
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
      if (res.data.deletePost) {
        this.toastr.info(`
        <small>Successfully deleted Post ${this.entityName}</small>
        `, 'Post Deleted', {
            enableHtml: true
          });
        this.router.navigate(['/dashboard/posts']);
      }
    }, err => {
      this.toastr.error(`
      <small>${err.message}</small>
      `, 'Error Deleting Post', {
          enableHtml: true
        });
    });
  }
}
