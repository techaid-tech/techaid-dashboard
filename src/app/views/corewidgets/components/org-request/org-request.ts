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
mutation createOrganisation($data: CreateOrganisationInput!) {
  createOrganisation(data: $data){
     id
  }
}
`;

const QUERY_CONTENT = gql`
query findContent {
  post(where: {slug: {_eq: "/organisation-device-request"}}){
    id
    content
  }
}`;

@Component({
  selector: 'org-request',
  styleUrls: ['org-request.scss'],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './org-request.html'
})
export class OrgRequestComponent {
  sub: Subscription;
  form: FormGroup = new FormGroup({});
  options: FormlyFormOptions = {};
  submiting = false;
  content: any = {};
  model : any = {
    showErrorState: false
  };
  submited: boolean = false;

  fields: Array<FormlyFieldConfig> = [
    {
      key: "name",
      type: "input",
      className: "col-md-12",
      defaultValue: "",
      templateOptions: {
        label: "Organisation Name",
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
      key: "website",
      type: "input",
      className: "col-md-12",
      defaultValue: "",
      templateOptions: {
        label: "Organisation Website",
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
      fieldGroupClassName: "row",
      fieldGroup: [
        {
          key: "contact",
          type: "input",
          className: "col-md-12",
          defaultValue: "",
          templateOptions: {
            label: "Primary Contact Name",
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
          key: "email",
          type: "input",
          className: "col-md-6",
          defaultValue: "",
          templateOptions: {
            label: "Primary Contact Email",
            type: "email",
            pattern: /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
            placeholder: "",
            required: true
          },
          expressionProperties: {
            'templateOptions.required': '!model.phoneNumber.length'
          }
        },
        {
          key: "phoneNumber",
          type: "input",
          className: "col-md-6",
          defaultValue: "",
          templateOptions: {
            label: "Primary Contact Phone Number",
            pattern: /\+?[0-9]+/,
            required: true
          },
          expressionProperties: {
            'templateOptions.required': '!model.email.length'
          }
        },
      ]
    }, 
    {
      key: "attributes.accepts",
      type: "multicheckbox",
      className: "",
      defaultValue: [],
      templateOptions: {
        type: 'array',
        label: "What types of devices are you looking for?",
        multiple: true,
        options: [
          {value: "LAPTOPS", label: "Laptops"},
          {value: "PHONES", label: "Phones"},
          {value: "TABLETS", label: "Tablets" },
          {value: "ALLINONES", label: "All In Ones" },
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
      fieldGroupClassName: 'row',
      hideExpression: "!model.attributes.accepts.length",
      fieldGroup: [
        {
          className: 'col-12',
          template: `
            <p>How many of the following items can you currently take?</p>
          `
        },
        {
          key: "attributes.request.laptops",
          type: "input",
          className: "col-6",
          defaultValue: 0,
          hideExpression: "model.attributes.accepts.toString().indexOf('LAPTOP') < 0",
          templateOptions: {
            min: 0,
            label: 'Laptops', 
            addonLeft: {
              class: 'fas fa-laptop'
            },
            type: "number",
            placeholder: "",
            required: true
          }
        },
        {
          key: "attributes.request.phones",
          type: "input",
          className: "col-6",
          hideExpression: "model.attributes.accepts.toString().indexOf('PHONE') < 0",
          defaultValue: 0,
          templateOptions: {
            min: 0,
            label: "Phones",
            addonLeft: {
              class: 'fas fa-mobile-alt'
            },
            type: "number",
            placeholder: "",
            required: true
          }
        },
        {
          key: "attributes.request.tablets",
          type: "input",
          className: "col-6",
          defaultValue: 0,
          hideExpression: "model.attributes.accepts.toString().indexOf('TABLET') < 0",
          templateOptions: {
            min: 0,
            label: "Tablets",
            addonLeft: {
              class: 'fas fa-tablet-alt'
            },
            type: "number",
            placeholder: "",
            required: true
          }
        },
        {
          key: "attributes.request.allInOnes",
          type: "input",
          className: "col-6",
          hideExpression: "model.attributes.accepts.toString().indexOf('ALLINONE') < 0",
          defaultValue: 0,
          templateOptions: {
            min: 0,
            label: "All In Ones",
            addonLeft: {
              class: 'fas fa-desktop'
            },
            type: "number",
            placeholder: "",
            required: true
          }
        },
      ]
    },
    {
      key: "attributes.alternateAccepts",
      type: "multicheckbox",
      className: "",
      hideExpression: "!model.attributes.accepts.length || model.attributes.accepts.length == 4",
      defaultValue: [],
      templateOptions: {
        type: 'array',
        label: "If none of the items listed above are available, would you be willing to consider any of the following?",
        multiple: true,
        options: [
          {value: "LAPTOPS", label: "Laptops"},
          {value: "PHONES", label: "Phones"},
          {value: "TABLETS", label: "Tablets" },
          {value: "ALLINONES", label: "All In Ones" },
        ],
        required: false
      },
      validation: {
        show: false
      },
      expressionProperties: {
        'validation.show': 'model.showErrorState',
        'templateOptions.options': (model, state) => {
          const opts = [
            {value: "LAPTOPS", label: "Laptops"},
            {value: "PHONES", label: "Phones"},
            {value: "TABLETS", label: "Tablets" },
            {value: "ALLINONES", label: "All In Ones" },
          ];
          var values = opts.filter(o => (model.attributes.accepts || []).indexOf(o.value) == -1);
          return values;
        }
      }
    },
    {
      fieldGroupClassName: 'row',
      hideExpression: "!model.attributes.alternateAccepts.length",
      fieldGroup: [
        {
          className: 'col-12',
          template: `
            <p>How many of the following alternate items are you willing to take?</p>
          `
        },
        {
          key: "attributes.alternateRequest.laptops",
          type: "input",
          className: "col-6",
          defaultValue: 0,
          hideExpression: "model.attributes.accepts.toString().indexOf('LAPTOP') > -1 || model.attributes.alternateAccepts.toString().indexOf('LAPTOP') < 0",
          templateOptions: {
            min: 0,
            label: 'Laptops', 
            addonLeft: {
              class: 'fas fa-laptop'
            },
            type: "number",
            placeholder: "",
            required: true
          }
        },
        {
          key: "attributes.alternateRequest.phones",
          type: "input",
          className: "col-6",
          hideExpression: "model.attributes.accepts.toString().indexOf('PHONE') > -1 || model.attributes.alternateAccepts.toString().indexOf('PHONE') < 0",
          defaultValue: 0,
          templateOptions: {
            min: 0,
            label: "Phones",
            addonLeft: {
              class: 'fas fa-mobile-alt'
            },
            type: "number",
            placeholder: "",
            required: true
          }
        },
        {
          key: "attributes.alternateRequest.tablets",
          type: "input",
          className: "col-6",
          defaultValue: 0,
          hideExpression: "model.attributes.accepts.toString().indexOf('TABLET') > -1 || model.attributes.alternateAccepts.toString().indexOf('TABLET') < 0",
          templateOptions: {
            min: 0,
            label: "Tablets",
            addonLeft: {
              class: 'fas fa-tablet-alt'
            },
            type: "number",
            placeholder: "",
            required: true
          }
        },
        {
          key: "attributes.alternateRequest.allInOnes",
          type: "input",
          className: "col-6",
          hideExpression: "model.attributes.accepts.toString().indexOf('ALLINONE') > -1 || model.attributes.alternateAccepts.toString().indexOf('ALLINONE') < 0",
          defaultValue: 0,
          templateOptions: {
            min: 0,
            label: "All In Ones",
            addonLeft: {
              class: 'fas fa-desktop'
            },
            type: "number",
            placeholder: "",
            required: true
          }
        },
      ]
    }, 
  ];

  constructor(
    private toastr: ToastrService,
    private apollo: Apollo
  ) {

  }

  ngOnInit(){
    this.apollo.query({
      query: QUERY_CONTENT
    }).toPromise()
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
    this.apollo.mutate({
      mutation: CREATE_ENTITY,
      variables: { data }
    }).subscribe(data => {
      this.submited = true;
      this.submiting = false;
      this.model = {}
    }, err => {
      this.submiting = false;
      this.toastr.error(`
      <small>${err.message}</small>
      `, 'Create Organisation Error', {
          enableHtml: true,
          timeOut: 15000
        });
    })
  }
}
