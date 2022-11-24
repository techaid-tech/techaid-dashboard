import { Component, ViewChild, ViewEncapsulation } from '@angular/core';
import { Subject, of, forkJoin, Observable, Subscription } from 'rxjs';
import { AppGridDirective } from '@app/shared/modules/grid/app-grid.directive';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import gql from 'graphql-tag';
import { Apollo } from 'apollo-angular';
// import { FormGroup } from '@angular/forms';
import { FormGroup, ValidationErrors, AbstractControl } from '@angular/forms';
import { FormlyFormOptions, FormlyFieldConfig } from '@ngx-formly/core';
import { ActivatedRoute, Router } from '@angular/router';
import { isInteger } from '@ng-bootstrap/ng-bootstrap/util/util';
import { UpdateFormDirty } from '@ngxs/form-plugin';
import { Select } from '@ngxs/store';

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



// export function threeItemsValidator (c: AbstractControl) {
//   const vals = Object.values(c.value.attributes.request);
//   if (vals.length > 0 && (vals.reduce((a: number, b: number) => a + b)) > 3) {
//       return null;
//     }
//   return true;
// }


@Component({
  selector: 'org-request',
  styleUrls: ['org-request.scss'],

  templateUrl: './org-request.html'
})

export class OrgRequestComponent {
  sub: Subscription;
  form: FormGroup = new FormGroup({});
  options: FormlyFormOptions = {};
  submiting = false;
  content: any = {};
  model: any = {
      showErrorState: false,
  };
  submited = false;


  //TODO: not the ideal way to refresh the form, but it'll do for now
  reloadCurrentPage() {
    window.location.reload();
  }

  fields: Array<FormlyFieldConfig> = [
    {
      className: 'col-md-12',
      template: '<h6 class="m-0 font-weight-bold text-primary">Check your eligibility</h6>'
    },
    {
      key: 'attributes.isIndividual',
      type: 'radio',
      className: 'col-md-12',
      templateOptions: {
        label: 'Is your request for one client?',
        options: [
          {value: true, label: 'Yes'},
          {value: false, label: 'No'}
        ],
        required: true
      },
      validators: {
        mustBeTrue: {
          expression: (c: AbstractControl) => c.value,
          message: (error: any, field: FormlyFieldConfig) => 'This request must be for one client only.'
        }
      }
    },
    {
      hideExpression: 'model.attributes.isIndividual == null || model.attributes.isIndividual == true',
      className: 'col-md-12',
      template: `<div class="border-bottom-info card mb-3 p-3">
<p>This form is for requests for individuals. If your request is for an
organisation rather than an individual, please contact <a href="mailto:
distributions@communitytechaid.org.uk">distributions@communitytechaid.org.uk</a></p>
</div>`
    },
    {
      key: 'attributes.isResident',
      type: 'radio',
      className: '',
      templateOptions: {
        label: 'Does your client live in either Lambeth or Southwark?',
        options: [
          {value: true, label: 'Yes'},
          {value: false , label: 'No'}
        ],
        required: true
      },
      validators: {
        mustBeTrue: {
          expression: (c: AbstractControl) => c.value,
          message: (error: any, field: FormlyFieldConfig) => 'This request must be for a Lambeth or Southwark resident.'
        }
      }
    },
    {
      hideExpression: 'model.attributes.isResident == null || model.attributes.isResident == true',
      className: 'col-md-12',
      template: `<div class="border-bottom-info card mb-3 p-3">
<p>Unfortunately, we can only support people in Lambeth and Southwark currently.</p>
</div>`
    },
    {
      hideExpression: '!model.attributes.isIndividual || !model.attributes.isResident',
      fieldGroup: [
        {
          className: 'col-md-12',
          template: '<h6 class="m-0 font-weight-bold text-primary">About your organisation</h6>'
        },
        {
          key: 'name',
          type: 'input',
          className: 'col-md-12',
          defaultValue: '',
          templateOptions: {
            label: 'Organisation Name',
            placeholder: '',
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
          fieldGroup: [
            {
              key: 'contact',
              type: 'input',
              className: 'col-md-12',
              defaultValue: '',
              templateOptions: {
                label: 'Primary Contact Name',
                placeholder: '',
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
              key: 'email',
              type: 'input',
              className: 'col-md-6',
              defaultValue: '',
              templateOptions: {
                label: 'Primary Contact Email',
                type: 'email',
                pattern: /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
                placeholder: '',
                required: true
              },
              validation: {
                show: false
              },
              expressionProperties: {
                'validation.show': 'model.showErrorState',
                'templateOptions.required': '!model.phoneNumber.length'
              }
            },
            {
              key: 'phoneNumber',
              type: 'input',
              className: 'col-md-6',
              defaultValue: '',
              templateOptions: {
                label: 'Primary Contact Phone Number',
                pattern: /\+?[0-9]+/,
                required: true
              },
              validation: {
                show: false
              },
              expressionProperties: {
                'validation.show': 'model.showErrorState',
                'templateOptions.required': '!model.email.length'
              }
            },
            {
              key: 'address',
              type: 'place',
              className: 'col-md-12',
              defaultValue: '',
              templateOptions: {
                label: 'Address',
                description: 'The address of the organisation',
                placeholder: '',
                postCode: false,
                required: true
              },
              validation: {
                show: false
              },
              expressionProperties: {
                'validation.show': 'model.showErrorState',
                'templateOptions.required': '!model.address.length'
              }
            }
          ]
        },    
        {
          className: 'col-md-12',
          template: '<h6 class="m-0 font-weight-bold text-primary">Your client\'s needs</h6>'
        },
        {
          fieldGroupClassName: 'row',
          fieldGroup: [
            {
              key: 'items',
              type: 'repeat',
              className: 'col-md-6',
              defaultValue: [{}],
              templateOptions: {
                description: 'If your client needs another item, use this button ➜',
                addText: 'Request another item',
                removeText: 'Remove this item',
                required: true,
                min: 1,
                maxItems: 3
              },
              fieldArray: {
                key: 'item',
                type: 'radio',
                className: '',
                templateOptions: {
                  label: 'Select the item your client needs.',
                  description: 'We currently have no phones or tablets. When we do, we will re-open requests for them.',
                  options: [
                    // TODO: find some way to derive these from requestedItems so it's
                    // all defined in one place
                    {value: 'laptops', label: 'Laptop'},
                    // {value: 'phones', label: 'Phone'},
                    {value: 'commsDevices', label: 'SIM card (6 months, 20GB data, unlimited UK calls)' },
                    // {value: 'tablets', label: 'Tablet' },
                    {value: 'desktops', label: 'Desktop computer' },
                  ],
                  required: true
                },
                // // validation: {
                //   show: false
                // },
                // expressionProperties: {
                //   'validation.show': 'model.showErrorState',
                // }              
                //   }
                // ]
              }
            }
          ]
        },
        {
          key: 'hasInternetHome',
          type: 'radio',
          className: '',
          templateOptions: {
            label: 'Does your client have access to the internet at home?',
            options: [
              {value: 'yes', label: 'Yes'},
              {value: 'no' , label: 'No'},
              {value: 'dk', label: 'Don\'t know'}
            ],
            required: true
          }
        },        
        {
          key: 'hasMobilityNeeds',
          type: 'radio',
          className: '',
          templateOptions: {
            label: 'Does your client have mobility issues, such as not being able to leave their home, or finding it difficult to do so?',
            options: [
              {value: 'yes', label: 'Yes'},
              {value: 'no' , label: 'No'},
              {value: 'dk', label: 'Don\'t know'}
            ],
            required: true
          }
        },
        {
          key: 'hasTrainingNeeds',
          type: 'radio',
          className: '',
          templateOptions: {
            label: 'Does your client need a Quickstart session or other training in basic use of a computer, phone, or tablet?',
            options: [
              {value: 'yes', label: 'Yes'},
              {value: 'no' , label: 'No'},
              {value: 'dk', label: 'Don\'t know'}
            ],
            required: true
          }
        },
        {
          key: 'attributes.details',
          type: 'textarea',
          className: 'col-md-12',
          defaultValue: '',
          templateOptions: {
            label: 'In order to support you as best as possible, please provide us with a brief overview of who this request is for, why they need a device and what they hope to do with it. Please do not include any identifiable details such as names or addresses but any background you can provide would be extremely helpful.',
            rows: 3,
            required: false
          }
        },
        {
          key: 'attributes.clientRef',
          type: 'input',
          className: 'col-md-3',
          defaultValue: '',
          templateOptions: {
            label: 'For your records, enter your client\'s initials or a client reference',
            // TODO: should this be required
            required: false
          }
        }
      ]
    }
  ];

  constructor(
    private toastr: ToastrService,
    private apollo: Apollo
  ) {

  }
  private normalizeData(data: any) {
    data.attributes.request = {'laptops': 0, 
                               'phones': 0, 
                               'commsDevices': 0,
                               'tablets': 0,
                               'desktops': 0};
    data.items.forEach(i => {
      data.attributes.request[i] = data.attributes.request[i] + 1;
    });

    // the accepts attribute appears to be just an upcased and de-duped array of
    // requested items
    data.attributes.accepts =
      Array.from(new Set(data.items.map(i => i.toUpperCase())));
    delete data.items;

    // This is a bit kludgey, but it turns out to be far easier to deal with
    // clients' needs as a list of needs rather than yes/know/don't know for each
    // item (mainly because of the don't know), but at the same time we want to
    // make it a mandatory field. So we transform the individual items:
    var needs = [];
    if (data.hasInternetHome == 'no') {
      needs.push('internet');
    }
    if (data.hasMobilityNeeds == 'yes') {
      needs.push('mobility');
    }
    if (data.hasTrainingNeeds == 'yes') {
      needs.push('training');
    }
    data.attributes.needs = needs;
    delete data.hasInternetHome;
    delete data.hasMobilityNeeds;
    delete data.hasTrainingNeeds;

    return data;
  }

  ngOnInit() {
    this.apollo.query({
      query: QUERY_CONTENT
    }).toPromise().then(res => {
      if (res.data) {
        this.content = res.data['post'];
      }
    });
  }

  ngOnDestroy() {
    if (this.sub) {
      this.sub.unsubscribe();
    }
  }


  createEntity(data: any) {        
    data = this.normalizeData(data);
//    console.log(data);

    if (this.form.invalid) {
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
      this.model = {};
    }, err => {
      this.submiting = false;
      this.toastr.error(`
      <small>${err.message}</small>
      `, 'Create Organisation Error', {
          enableHtml: true,
          timeOut: 15000
        });
    });
  }
}
