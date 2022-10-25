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
<p>Unfortunately, we can only support people in Lambeth and Southwark currently. For information 
about other organisations similar to ours, see [website url]</p>
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
          key: 'item1',
          type: 'radio',
          className: '',
          templateOptions: {
            label: 'Select the item your client needs.',
            options: [
              // TODO: find some way to derive these from requestedItems so it's
              // all defined in one place
              {value: 'laptops', label: 'Laptop'},
              {value: 'phones', label: 'Phone'},
              {value: 'commsDevices', label: 'SIM card (6 months, 20GB data, unlimited UK calls)' },
              {value: 'tablets', label: 'Tablet' },
              {value: 'desktops', label: 'Desktop computer' },
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
          hideExpression: '!model.item1',
          key: 'item2',
          type: 'radio',
          className: '',
          templateOptions: {
            label: 'If your client needs a second item, select it here.',
            options: [
              // TODO: find some way to derive these from requestedItems so it's
              // all defined in one place
              {value: 'laptops', label: 'Laptop'},
              {value: 'phones', label: 'Phone'},
              {value: 'commsDevices', label: 'SIM card (6 months, 20GB data, unlimited UK calls)' },
              {value: 'tablets', label: 'Tablet' },
              {value: 'desktops', label: 'Desktop computer' },
            ],
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
          hideExpression: '!model.item2',
          key: 'item3',
          type: 'radio',
          className: '',
          templateOptions: {
            label: 'If your client needs a third item, select it here.',
            options: [
              // TODO: find some way to derive these from requestedItems so it's
              // all defined in one place
              {value: 'laptops', label: 'Laptop'},
              {value: 'phones', label: 'Phone'},
              {value: 'commsDevices', label: 'SIM card (6 months, 20GB data, unlimited UK calls)' },
              {value: 'tablets', label: 'Tablet' },
              {value: 'desktops', label: 'Desktop computer' },
            ],
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
          key: 'attributes.hasInternetHome',
          type: 'radio',
          className: '',
          templateOptions: {
            label: 'Does your client have access to the internet at home?',
            options: [
              {value: true, label: 'Yes'},
              {value: false , label: 'No'}
            ],
            required: false
          }
        },
        {
          hideExpression: 'model.attributes.hasInternetHome == null || model.attributes.hasInternetHome == true',
          key: 'attributes.hasInternetLocal',
          type: 'radio',
          className: '',
          templateOptions: {
            label: 'Is your client able to travel locally to access the internet (to a local library, for example)?',
            options: [
              {value: true, label: 'Yes'},
              {value: false , label: 'No'}
            ],
            required: false
          }
        },
        {
          key: 'attributes.hasTrainingNeeds',
          type: 'radio',
          className: '',
          templateOptions: {
            label: 'Does your client need any Quickstart help to get started with their device and digital skills?',
            options: [
              {value: true, label: 'Yes'},
              {value: false , label: 'No'}
            ],
            required: false
          }
        },
        {
          hideExpression: 'model.attributes.hasTrainingNeeds == null || model.attributes.hasTrainingNeeds == false',
          key: 'attributes.hasTrainingTravelNeeds',
          type: 'radio',
          className: '',
          templateOptions: {
            label: 'Is your client able to travel locally for a Quickstart session to help with their digital skills?',
            options: [
              {value: true, label: 'Yes'},
              {value: false , label: 'No'}
            ],
            required: false
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
          type: 'textarea',
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
    // This is for totting up how many of each have been requested
    var requestedItems: any = {'laptops': 0, 
                               'phones': 0, 
                               'commsDevices': 0,
                               'tablets': 0,
                               'desktops': 0};

    // Not pretty, but this seems to work: increment relevant value for each item 
    var item1 = data['item1'];
    var item2 = data['item2'];
    var item3 = data['item3'];

    requestedItems[item1] = requestedItems[item1] + 1;
    requestedItems[item2] = requestedItems[item2] + 1;
    requestedItems[item3] = requestedItems[item3] + 1;
    // an item can be null if none was selected or undefined if it was invisible on submission
    delete requestedItems['null'];
    delete requestedItems['undefined'];

    data['attributes']['request'] = requestedItems;

    console.log(data);
    // the accepts attribute appears to be just an upcased and de-duped array of
    // requested items
    data['attributes']['accepts'] =
      Array.from(new Set([item1, item2, item3].filter(i => i !== null && i !== undefined).map(i => i.toUpperCase())));

    // Remove these now we don't need them
    delete data['item1'];
    delete data['item2'];
    delete data['item3'];

    console.log(data);

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
