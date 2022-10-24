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
      key: 'attributes.isIndividual',
      type: 'radio',
      className: '',
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
      hideExpression: '!model.attributes.isIndividual || !model.attributes.isResident',
      fieldGroup: [
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
        // {
        //   className: 'col-12',
        //   template: `
        //     <p>We normally only have the above items, but if there is something additional your client needs, email: distributions@communitytechaid.org.uk</p>
        //   `
        // },
        // {
        //   fieldGroupClassName: 'row',
        //   hideExpression: '!model.attributes.accepts.length',
        //   fieldGroup: [
        //     {
        //       className: 'col-12',
        //       template: `
        //     <p>How many of the following items do you require? (maximum of 3 items in total)</p>
        //   `
        //     },
        //     {
        //       key: 'attributes.request.laptops',
        //       type: 'input',
        //       className: 'col-6',
        //       defaultValue: 0,
        //       hideExpression: 'model.attributes.accepts.toString().indexOf(\'LAPTOP\') < 0',
        //       templateOptions: {
        //         min: 0,
        //         max: 3,
        //         label: 'Laptops',
        //         addonLeft: {
        //           class: 'fas fa-laptop'
        //         },
        //         type: 'number',
        //         placeholder: '',
        //         required: true
        //       }
        //     },
        //     {
        //       key: 'attributes.request.phones',
        //       type: 'input',
        //       className: 'col-6',
        //       hideExpression: 'model.attributes.accepts.toString().indexOf(\'PHONE\') < 0',
        //       defaultValue: 0,
        //       templateOptions: {
        //         min: 0,
        //         max: 3,
        //         label: 'Phones',
        //         addonLeft: {
        //           class: 'fas fa-mobile-alt'
        //         },
        //         type: 'number',
        //         placeholder: '',
        //         required: true
        //       }
        //     },
        //     {
        //       key: 'attributes.request.tablets',
        //       type: 'input',
        //       className: 'col-6',
        //       defaultValue: 0,
        //       hideExpression: 'model.attributes.accepts.toString().indexOf(\'TABLET\') < 0',
        //       templateOptions: {
        //         min: 0,
        //         max: 3,
        //         label: 'Tablets',
        //         addonLeft: {
        //           class: 'fas fa-tablet-alt'
        //         },
        //         type: 'number',
        //         placeholder: '',
        //         required: true
        //       }
        //     },
        //     {
        //       key: 'attributes.request.allInOnes',
        //       type: 'input',
        //       className: 'col-6',
        //       hideExpression: 'model.attributes.accepts.toString().indexOf(\'ALLINONE\') < 0',
        //       defaultValue: 0,
        //       templateOptions: {
        //         min: 0,
        //         max: 3,
        //         label: 'All In Ones',
        //         addonLeft: {
        //           class: 'fas fa-desktop'
        //         },
        //         type: 'number',
        //         placeholder: '',
        //         required: true
        //       }
        //     },
        //     {
        //       key: 'attributes.request.desktops',
        //       type: 'input',
        //       className: 'col-6',
        //       hideExpression: 'model.attributes.accepts.toString().indexOf(\'DESKTOP\') < 0',
        //       defaultValue: 0,
        //       templateOptions: {
        //         min: 0,
        //         max: 3,
        //         label: 'Desktops',
        //         addonLeft: {
        //           class: 'fas fa-desktop'
        //         },
        //         type: 'number',
        //         placeholder: '',
        //         required: true
        //       }
        //     },
        //     {
        //       key: 'attributes.request.commsDevices',
        //       type: 'input',
        //       className: 'col-6',
        //       hideExpression: 'model.attributes.accepts.toString().indexOf(\'COMMSDEVICE\') < 0',
        //       defaultValue: 0,
        //       templateOptions: {
        //         min: 0,
        //         max: 3,
        //         label: 'SIM cards',
        //         addonLeft: {
        //           class: 'fas fa-desktop'
        //         },
        //         type: 'number',
        //         placeholder: '',
        //         required: true
        //       }
        //     },
        //   ]
        // },
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
            label: 'Does your client need and Quickstart help to get started with their device and digital skills?',
            options: [
              {value: true, label: 'Yes'},
              {value: false , label: 'No'}
            ],
            required: false
          }
        },
        {
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

    // not sure why this doesn't work (TODO: learn typescript!)
    // var i: String;
    // for (i in ['item1', 'item2', 'item3']) {
    //   requestedItems[data[i]] =
    //     requestedItems[data[i]] + 1;
    // }

    // Not pretty, but this seems to work: increment relevant value for each item 
    var item1 = data['item1'];
    var item2 = data['item2'];
    var item3 = data['item3'];

    requestedItems[item1] = requestedItems[item1] + 1;
    requestedItems[item2] = requestedItems[item2] + 1;
    requestedItems[item3] = requestedItems[item3] + 1;

    data['attributes']['request'] = requestedItems;

    // the accepts attribute appears to be just an upcased and de-duped array of
    // requested items
    data['attributes']['accepts'] =
      Array.from(new Set([item1, item2, item3].map(i => i.toUpperCase())));

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
