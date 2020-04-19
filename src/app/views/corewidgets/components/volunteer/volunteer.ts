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

const CREATE_ENTITY = gql`
mutation createVolunteer($data: CreateVolunteerInput!) {
  createVolunteer(data: $data){
    id
    name
  }
}
`;

@Component({
  selector: 'volunteer',
  styleUrls: ['volunteer.scss'],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './volunteer.html'
})
export class VolunteerComponent {
  sub: Subscription;
  form: FormGroup = new FormGroup({});
  options: FormlyFormOptions = {};
  submiting = false;
  model : any = {
    showErrorState: false
  };
  submited: boolean = false;

  fields: Array<FormlyFieldConfig> = [
    {
      template: `
      <div class="row">
        <div class="col-md-12">
          <div class="border-bottom-info card mb-3 p-3">
            <strong><p>Covid TechAid Volunteers</p></strong>
            <p>
            Thank you for offering to help get isolated people connected on line through Covid TechAid Lambeth.  
            At the moment, there are hundreds of people stuck at home without a suitable device to access the 
            internet – to communicate with loved ones, to download educational resources, or to even get some 
            basic entertainment. It's our aim to collect your unwanted devices and deliver them to people who 
            really need them, to help combat isolation and boredom. 
            </p>
          </div>
        </div>
      </div>
      `
    },
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
        show: false
      },
      expressionProperties: {
        'validation.show': 'model.showErrorState',
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
        },
        {
          key: "email",
          type: "input",
          className: "col-md-6",
          defaultValue: "",
          templateOptions: {
            label: "Email",
            type: "email",
            pattern: /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
            placeholder: "",
            description: "Not Required if phone number is provided"
          },
          expressionProperties: {
            'templateOptions.required': 'model.phoneNumber.length == 0',
          },
        },
      ]
    },
    {
      fieldGroupClassName: "row",
      fieldGroup: [
        {
          type: "place",
          className: "col-md-6",
          key: "postCode",
          templateOptions: {
            label: "Address",
            required: true
          },
          validation: {
            show: false
          },
          expressionProperties: {
            'validation.show': 'model.showErrorState',
          } 
        },
        {
          key: "subGroup",
          type: "multicheckbox",
          className: "col-md-6",
          defaultValue: [],
          templateOptions: {
            type: 'array',
            label: "How would you like to help? Select all that apply.",
            description: "Please let us know what tasks you would like to help with eg organisation, technical support, collection and delivery, training, fundraising etc. If none of these apply, select `Other` and define how you would be able to help.",
            multiple: true,
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
            show: false
          },
          expressionProperties: {
            'validation.show': 'model.showErrorState',
          } 
        },
        {
          key: "expertise",
          type: "input",
          className: "col-md-6",
          templateOptions: {
            label: "How would you like to help",
            required: true
          },
          hideExpression: "(model.subGroup || []).indexOf('Other') == -1",
          validation: {
            show: false,
          },
          expressionProperties: {
            'templateOptions.required': "(model.subGroup || []).indexOf('Other') > -1",
            'validation.show': 'model.showErrorState',
          },
        },
        {
          key: "organizing",
          type: "radio",
          className: "col-md-6",
          templateOptions: {
            label: "Would you like to be involved with the organisation of Streatham TechAid?",
            options: [
              {label: "Yes", value: "yes" },
              {label: "No", value: "no" },
              {label: "Maybe", value: "maybe" } 
            ],
            required: true
          },
          hideExpression: "(model.subGroup || []).indexOf('Organizing') > -1 || (model.subGroup || []).indexOf('MinorOrganizing') > -1",
          validation: {
            show: false
          },
          expressionProperties: {
            'validation.show': 'model.showErrorState',
          }
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
            show: false
          },
          expressionProperties: {
            'validation.show': 'model.showErrorState',
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
            show: false
          },
          expressionProperties: {
            'validation.show': 'model.showErrorState',
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
        show: false
      },
      expressionProperties: {
        'validation.show': 'model.showErrorState',
      }
    }, 
    {
      template: `
      <div class="row">
        <div class="col-md-12">
          <div class="border-bottom-warning card mb-3 p-3">
            <p>
            We promise to process your data in accordance with data protection legislation, and will not 
            share your details with any third parties. You have the right to ask for your information to be 
            deleted from our records at any time - please contact covidtechaid@gmail.com if you want us to 
            delete your data from our records. *
            </p>
          </div>
        </div>
      </div>
      `
    },
    {
      key: "consent",
      type: "radio",
      className: "col-md-12",
      templateOptions: {
        label: "Data Protection",
        options: [
          {label: "I consent to my data being processed by Covid TechAid Lambeth", value: "yes" },
          // {label: "I do not consent to my data being processed by Covid TechAid Lambeth", value: "no" },
        ],
        required: true
      },
      validation: {
        show: false
      },
      expressionProperties: {
        'validation.show': 'model.showErrorState',
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


  private normalizeData(data: any){
    return data;
  }


  ngOnInit() {
  }

  ngOnDestory() {
    if (this.sub) {
      this.sub.unsubscribe();
    }
  }

  createEntity(data: any) {
    if(this.form.invalid){
      this.model.showErrorState = true;
      return false;
    }
    this.submiting = true;
    data.subGroup = (data.subGroup || [])
    if(data.organizing){
      if(data.organizing == 'yes'){
        data.subGroup.push('Organizing');
      }else if(data.organizing == 'maybe'){
        data.subGroup.push('MinorOrganizing');
      }
    }
    data.subGroup = (data.subGroup || []).join(',')
    delete data.organizing;

    this.apollo.mutate({
      mutation: CREATE_ENTITY,
      variables: { data }
    }).subscribe(data => {
      this.submited = true;
      this.submiting = false;
      this.model = {};
    }, err => {
      this.submiting = false;
      this.toastr.error(`
      <small>${err.message}</small>
      `, 'Create Volunteer Error', {
          enableHtml: true,
          timeOut: 15000
        });
    });

    return true;
  }
}
