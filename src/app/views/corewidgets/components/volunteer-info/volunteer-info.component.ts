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

const QUERY_ENTITY = gql`
query findUser($id: Long) {
  volunteer(where: {
    id: {
      _eq: $id
    }
  }){
    id
    name
    phoneNumber
    email
    createdAt
    updatedAt
    subGroup
    postCode 
    storage
    availability
    expertise
    transport
  }
}
`;

const UPDATE_ENTITY = gql`
mutation updateUser($data: UpdateVolunteerInput!) {
  updateVolunteer(data: $data){
    id
    name
    phoneNumber
    email
    createdAt
    updatedAt
    subGroup
    postCode 
    storage
    availability
    expertise
    transport
  }
}
`;

const DELETE_ENTITY = gql`
mutation deleteVolunteer($id: ID!) {
  deleteVolunteer(id: $id)
}
`;

@Component({
  selector: 'volunteer-info',
  styleUrls: ['volunteer-info.scss'],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './volunteer-info.html'
})
export class VolunteerInfoComponent {
  sub: Subscription;
  form: FormGroup = new FormGroup({});
  options: FormlyFormOptions = {};
  model : any = {
  };
  userName: string;
  userId: number;

  fields: Array<FormlyFieldConfig> = [
    {
      key: "name",
      type: "input",
      className: "col-md-12",
      defaultValue: "",
      templateOptions: {
        label: "Name",
        placeholder: "",
        required: true
      },
      validation: {
        show: true
      }
    },
    {
      fieldGroupClassName: "row",
      fieldGroup: [
        {
          key: "phoneNumber",
          type: "input",
          className: "col-md-6",
          defaultValue: "",
          templateOptions: {
            label: "Phone Number (Preferred)",
            pattern: /\+?[0-9]+/,
            description: "Required if email is not provided.",
            required: false
          },
          expressionProperties: {
            'templateOptions.required': 'model.email.length == 0',
          },
          validation: {
            show: true
          }
        },
        {
          key: "email",
          type: "input",
          className: "col-md-6",
          defaultValue: "",
          templateOptions: {
            label: "Email",
            type: "email",
            pattern: /^[a-zA-Z0-9\*.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-\*]+(?:\.[a-zA-Z0-9-\*]+)*$/,
            placeholder: "",
            description: "Not Required if phone number is provided"
          },
          expressionProperties: {
            'templateOptions.required': 'model.phoneNumber.length == 0',
          },
          validation: {
            show: true
          }
        },
      ]
    },
    {
      fieldGroupClassName: "row",
      fieldGroup: [
        {
          key: "postCode",
          type: "place",
          className: "col-md-6",
          templateOptions: {
            label: "Address",
            options: [
              {label: "Streatham Hill", value: "Streatham Hill" },
              {label: "Streatham South", value: "Streatham South" },
              {label: "Streatham Wells", value: "Streatham Wells" },
              {label: "Thornton", value: "Thornton" },
              {label: "St Lenoard's", value: "St Lenoard's" },
              {label: "Tulse Hill", value: "Tulse Hill" },
              {label: "Clapham Common", value: "Clapham Common" },
              {label: "Brixton Hill", value: "Brixton Hill" },
              {label: "Other", value: "Other" }
            ],
            required: false
          },
          validation: {
            show: true
          }
        },
        {
          key: "subGroup",
          type: "multicheckbox",
          className: "col-md-6",
          templateOptions: {
            label: "How would you like to help",
            description: "Please let us know what tasks you would like to help with eg organisation, technical support, collection and delivery, training, fundraising etc.",
            multiple: true,
            type: 'array',
            options: [
              {value: "Technical", label: "Technical (Fixing & Updating Equipment)" },
              {value: "Distribution", label: "Distribution (Picking up and delivering devices)" },
              {value: "Findraising", label: "Fundraising" },
              {value: "Organizing", label: "Organizing(Co-ordinating group activities)" },
              {value: "MinorOrganizing", label: "Organizing(Might be interested in helping with group administration)" },
              {value: "Other", label: "Other" }
            ],
            required: true
          },
          validation: {
            show: true
          } 
        },
        {
          key: "expertise",
          type: "input",
          className: "col-md-6",
          defaultValue: "",
          templateOptions: {
            label: "How would you like to help",
            required: true
          },
          hideExpression: "(model.subGroup || []).indexOf('Other') == -1",
          expressionProperties: {
            'templateOptions.required': "(model.subGroup || []).indexOf('Other') > -1",
          },
          validation: {
            show: true
          }
        },
        {
          key: "organizing",
          type: "radio",
          className: "col-md-6",
          defaultValue: "no",
          templateOptions: {
            label: "Would you like to be involved with the organisation of Streatham TechAid?",
            options: [
              {label: "Yes", value: "yes" },
              {label: "No", value: "no" },
              {label: "Maybe", value: "maybe" } 
            ],
            required: true
          },
          validation: {
            show: true
          },
          hideExpression: "(model.subGroup || []).indexOf('Organizing') > -1 || (model.subGroup || []).indexOf('MinorOrganizing') > -1",
        },
      ]
    },
    {
      fieldGroupClassName: "row",
      fieldGroup: [
        {
          key: "transport",
          type: "radio",
          className: "col-md-6",
          defaultValue: "none",
          templateOptions: {
            label: "Do you have use of a car or bike?",
            description: "Mode of travel",
            options: [
              {label: "Car", value: "car" },
              {label: "Bike", value: "bike" },
              {label: "Neither", value: "none" } 
            ]
          },
          validation: {
            show: true
          }
        },
        {
          key: "storage",
          type: "radio",
          className: "col-md-6",
          defaultValue: "no",
          templateOptions: {
            label: "Are you able to store equipment?",
            description: "This is for devices that have been picked up from donors",
            options: [
              {label: "No", value: "no" },
              {label: "Limited storage possible", value: "limited" },
              {label: "Yes", value: "yes" }
            ],
            required: true
          },
          validation: {
            show: true
          }
        }
      ]
    },
    {
      key: "availability",
      type: "input",
      className: "col-md-12",
      defaultValue: "",
      templateOptions: {
        label: "Availability",
        placeholder: "",
        required: false
      },
      validation: {
        show: true
      }
    }
  ];


  constructor(
    private modalService: NgbModal,
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private toastr: ToastrService,
    private apollo: Apollo
  ) {

  }

  modal(content) {
    this.modalService.open(content, { centered: true });
  }

  private queryRef = this.apollo
    .watchQuery({
      query: QUERY_ENTITY,
      variables: {}
    });

  private normalizeData(data: any){
    if(data.subGroup){
      if(!Array.isArray(data.subGroup)){
        data.subGroup = (data.subGroup || "").toString().split(',').filter(value => value.trim().length > 0); 
      }
    }else {
      data.subGroup = []
    }
    return data;
  }

  private fetchData() {
    if (!this.userId) {
      return;
    }

    this.queryRef.refetch({
      id: this.userId
    }).then(res => {
      if (res.data && res.data['volunteer']) {
        var data = res.data['volunteer'];
        this.model = this.normalizeData(data);
        this.userName = this.model['name'];
      } else {
        this.model = {};
        this.userName = "Not Found!"
      }
    }, err => {
      this.toastr.warning(`
          <small>${err.message}</small>
        `, 'GraphQL Error', {
          enableHtml: true,
          timeOut: 15000,
          disableTimeOut: true
        })
    });
  }

  ngOnInit() {
    this.sub = this.activatedRoute.params.subscribe(params => {
      this.userId = +params['userId'];
      this.fetchData();
    });
  }

  ngOnDestory() {
    if (this.sub) {
      this.sub.unsubscribe();
    }
  }

  updateEntity(data: any) {
    data.id = this.userId;
    data.subGroup = (data.subGroup || [])
    if(data.organizing){
      if(data.organizing == 'yes'){
        data.subGroup.push('Organizing');
      }else if(data.organizing == 'maybe'){
        data.subGroup.push('MinorOrganizing');
      }
    }
    data.subGroup = (data.subGroup || []).filter((v, i, a) => a.indexOf(v) === i).join(',')
    delete data.organizing;
    this.apollo.mutate({
      mutation: UPDATE_ENTITY,
      variables: {
        data
      }
    }).subscribe(res => {
      this.model = this.normalizeData(res.data['updateVolunteer']);
      this.userName = this.model['name'];
      this.toastr.info(`
      <small>Successfully updated volunteer ${this.userName}</small>
      `, 'Updated Volunteer', {
          enableHtml: true
        });
    }, err => {
      this.toastr.error(`
      <small>${err.message}</small>
      `, 'Update Error', {
          enableHtml: true
        });
    })
  }

  deleteEntity() {
    this.apollo.mutate({
      mutation: DELETE_ENTITY,
      variables: { id: this.userId }
    }).subscribe(res => {
      if(res.data.deleteVolunteer){
        this.toastr.info(`
        <small>Successfully deleted volunteer ${this.userName}</small>
        `, 'User Deleted', {
            enableHtml: true
          });
        this.router.navigate(['/dashboard/volunteers'])
      }
    }, err => {
      this.toastr.error(`
      <small>${err.message}</small>
      `, 'Error Deleting Volunteer', {
          enableHtml: true
        });
    })
  }
}
