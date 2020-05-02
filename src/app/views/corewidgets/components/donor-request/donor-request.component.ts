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
import { HashUtils } from '@app/shared/utils';

const CREATE_ENTITY = gql`
mutation updateDonor($data: DonateItemInput!) {
  donateItem(data: $data){
    kit {
      id
    }
    donor {
      id
    }
  }
}
`;


@Component({
  selector: 'donor-request',
  styleUrls: ['donor-request.scss'],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './donor-request.html'
})
export class DonorRequestComponent {
  sub: Subscription;
  form: FormGroup = new FormGroup({});
  options: FormlyFormOptions = {};
  model = {};
  submiting = false;
  submited: boolean = false;

  fields: Array<FormlyFieldConfig> = [
    {
      template: `
      <div class="row">
        <div class="col-md-12">
          <div class="border-bottom-info card mb-3 p-3">
            <p>
              Thank you for offering to donate your laptop, mobile or tablet to Covid TechAid Lambeth. 
              We are initially trialling this donation process in Streatham to help students make use of 
              all the resources available to them online, to enable households to access information & communication tools, and to combat isolation 
            </p>
            <p>
              At the moment, there are hundreds of people stuck at home without a suitable device 
              to access the internet – to communicate with loved ones, to download educational resources, 
              or to even get some basic entertainment. It's our aim to collect your unwanted devices 
              and deliver them to people in need, who will be identified by local schools, refugee 
              organisations and other local bodies.
            </p>
            <p>
              We will be in touch within 7 days to let you know if we can collect your device. 
              Thank you again for providing your details. 
            </p>
          </div>
        </div>
      </div>
      `
    },
    {
      key: "donor.name",
      type: "input",
      className: "col-md-12",
      defaultValue: "",
      templateOptions: {
        label: "Your Name",
        placeholder: "",
        required: true
      }
    },
    {
      fieldGroupClassName: "row",
      fieldGroup: [
        {
          key: "donor.email",
          type: "input",
          className: "col-md-6",
          defaultValue: "",
          templateOptions: {
            label: "Email",
            type: "email",
            pattern: /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
            placeholder: "",
            description: "",
            required: true
          }
        },
        {
          key: "donor.phoneNumber",
          type: "input",
          className: "col-md-6",
          defaultValue: "",
          templateOptions: {
            type: "tel",
            label: "Telephone Number",
            pattern: /\+?[0-9]+/,
            description: "Enter your phone number no spaces",
            required: true
          }
        }
      ]
    },
    {
      key: "donor.postCode",
      type: "place",
      className: "col-md-12",
      defaultValue: "",
      templateOptions: {
        label: "Address",
        description: "The address of the device",
        placeholder: "",
        postCode: false,
        required: true
      }
    },
    {
      key: "kit.attributes.pickup",
      type: "radio",
      className: "col-md-12",
      defaultValue: "DROPOFF",
      templateOptions: {
        label: "Are you able to drop off your device to a location in Streatham or would you need it to be collected?",
        placeholder: "",
        postCode: false,
        required: true,
        options: [
          { label: "I am able to drop off my device to a location in Streatham", value: "DROPOFF" },
          { label: "I would need you to come and collect my device", value: "PICKUP" },
          { label: "I'm not sure – it depends on the exact location", value: "NOTSURE" }
        ]
      }
    },
    {
      key: "kit.attributes.pickupAvailability",
      type: "input",
      className: "col-md-12",
      defaultValue: "",
      templateOptions: {
        label: "Pickup Availability",
        rows: 2,
        description: `
          Please let us know when you are typically available at home for someone 
          to arrange to come and pick up your device. Alternatively provide us with times 
          when you are usually not available. 
          `,
        required: true
      },
      hideExpression: "model.kit.attributes.pickup != 'PICKUP'",
    },
    {
      template: `
      <div class="row">
        <div class="col-md-12">
          <div class="border-bottom-info card mb-3 p-3">
            <strong><p>About your device</p></strong>
            <p>
              In order to understand what condition your device is in - and how easy it will be for us 
              to get it ready to deliver - please answer as many of the following questions as you can.
            </p>
          </div>
        </div>
      </div>
      `
    },
    {
      fieldGroupClassName: "row",
      fieldGroup: [
        {
          className: "col-md-6",
          fieldGroup: [
            {
              key: "kit.type",
              type: "radio",
              className: "",
              defaultValue: "LAPTOP",
              templateOptions: {
                label: "Type of device",
                options: [
                  {label: "Laptop", value: "LAPTOP" },
                  {label: "Tablet", value: "TABLET" },
                  {label: "Smart Phone", value: "SMARTPHONE" },
                  {label: "All In One (PC)", value: "ALLINONE" },
                  {label: "Other", value: "OTHER" }
                ],
                required: true
              } 
            },
            {
              key: "kit.attributes.otherType",
              type: "input",
              className: "",
              defaultValue: "",
              templateOptions: {
                label: "Type of device",
                rows: 2,
                placeholder: "(Other device type)",
                required: true
              },
              hideExpression: "model.kit.type != 'OTHER'",
              expressionProperties: {
                'templateOptions.required': "model.kit.type == 'OTHER'",
              },
            },
          ]
        },
        {
          className: "col-md-6",
          fieldGroup: [
            {
              key: "kit.attributes.status",
              type: "multicheckbox",
              className: "",
              templateOptions: {
                type: "array",
                options: [],
                description: "Please select all options that apply"
              },
              defaultValue: [],
              expressionProperties: {
                'templateOptions.options': (model, state)=> {
                  const props = {
                    'LAPTOP': [
                      {label: "Do you have the charger / power cable for the Laptop?", value: "CHARGER"},
                      {label: "Does the Laptop have a password set?", value: "PASSWORD_PROTECTED"}
                    ],
                    'TABLET': [
                      {label: "Do you have the charger for the Tablet?", value: "CHARGER"},
                      {label: "Have you factory reset the Tablet?", value: "FACTORY_RESET"}
                    ],
                    'SMARTPHONE': [
                      {label: "Do you have the charger for the Phone?", value: "CHARGER"},
                      {label: "Have you factory reset the Phone?", value: "FACTORY_RESET"}
                    ],
                    'ALLINONE': [
                      {label: "Do you have the charger for the Computer?", value: "CHARGER"},
                      {label: "Do you have a mouse for the Computer?", value: "HAS_MOUSE"},
                      {label: "Do you have a keyboard for the Computer", value: "HAS_KEYBOARD"},
                      {label: "Does the Computer have a password set?", value: "PASSWORD_PROTECTED"}
                    ],
                    'OTHER': [
                      {label: "Do you have the charger or power cable for the device?", value: "CHARGER"}
                    ],
                  };
                  return props[model.kit.type] || props['OTHER']
                },
              },
            },
            {
              key: "kit.attributes.credentials",
              type: "input",
              className: "",
              defaultValue: "",
              templateOptions: {
                label: "Device Password",
                description: "If your device requires a password or a PIN to sign in, please provide it here",
                rows: 2,
                placeholder: "Password",
                required: false
              },
              hideExpression: (model, state) => {
                if(['LAPTOP', 'ALLINONE'].indexOf(model.kit.type) == -1){
                  return true;
                }
                const status = HashUtils.dotNotation(model, 'kit.attributes.status') || [];
                if(status && status.length) {
                  return status.indexOf('PASSWORD_PROTECTED') == -1
                }
                return true;
              }
            },
          ]
        },
        {
          key: "kit.age",
          type: "radio",
          className: "col-md-6",
          templateOptions: {
            label: "Roughly how old is your device?",
            options: [
              {label: "Less than a year", value: 1},
              {label: "1 - 2 years", value: 2},
              {label: "3 - 4 years", value: 4 },
              {label: "5 - 6 years", value: 5},
              {label: "More than 6 years old", value: 6 },
              {label: "I don't know!", value: 0 }
            ],
            required: true
          } 
        }
      ]
    },
    {
      key: "kit.model",
      type: "input",
      className: "col-md-12",
      defaultValue: "",
      templateOptions: {
        label: "Make or model (if known)",
        rows: 2,
        placeholder: "",
        required: false
      }
    },
    {
      key: "kit.attributes.state",
      type: "input",
      className: "col-md-12",
      defaultValue: "",
      templateOptions: {
        label: "What technical state is the device in? For example, does it turn on OK? Are there keys missing? Is the screen cracked?",
        rows: 2,
        placeholder: "",
        required: false
      }
    },
    {
      template: `
      <div class="row">
        <div class="col-md-12">
          <div class="border-bottom-warning card mb-3 p-3">
            <p>
              In order to protect your data, Covid TechAid Lambeth will delete any personal information 
              submitted via this form as soon as it has been used for collecting and delivering your device. 
              Alternatively, if we don't collect your device, we will delete your information immediately. 
              We promise to process your data in accordance with data protection legislation, and will not 
              share your details with any third parties. You have the right to ask for your information to be 
              deleted from our records - please contact covidtechaid@gmail.com for more information.
            </p>
          </div>
        </div>
      </div>
      `
    },
    {
      key: "kit.attributes.images",
      type: "gallery",
      className: "col-md-12",
      templateOptions: {
        label: "Upload an image of your device if you can",
        required: false
      }
    },
    {
      key: "kit.attributes.consent",
      type: "radio",
      className: "col-md-12",
      templateOptions: {
        label: "I consent to my data being processed by Covid TechAid Lambeth",
        options: [
          {label: "I consent to my data being processed by Covid TechAid Lambeth", value: "yes" },
          // {label: "I do not consent to my data being processed by Covid TechAid Lambeth", value: "no" },
        ],
        required: true
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
    if(!this.form.valid){
      return;
    }
    this.submiting = true;
    data.kit.status = 'NEW';
    data.kit.location = data.donor.postCode;
   
    this.apollo.mutate({
      mutation: CREATE_ENTITY,
      variables: {
        data
      }
    }).subscribe(res => {
      this.submited = true;
      this.submiting = false;
    }, err => {
      this.submiting = false;
      this.toastr.error(`
      <small>${err.message}</small>
      `, 'Update Error', {
          enableHtml: true
        });
    })
  }
}
