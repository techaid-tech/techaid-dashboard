import { Component, ViewEncapsulation } from '@angular/core';
import { Subscription, Observable, Subject, concat, of, from } from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import gql from 'graphql-tag';
import { Apollo } from 'apollo-angular';
import { FormGroup } from '@angular/forms';
import { FormlyFormOptions, FormlyFieldConfig } from '@ngx-formly/core';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, tap, switchMap, catchError } from 'rxjs/operators';

const QUERY_ENTITY = gql`
query findOrganisation($id: Long!) {
  organisation(where: {
    id: {
      _eq: $id
    }
  }){
     id
     website
     phoneNumber
     contact
     name
     email
     address
     createdAt
     updatedAt
     archived
     kits {
      id
      model
      age
      type
      status
      location
      updatedAt
      createdAt
    }
    volunteer {
         id
         name
         email
         phoneNumber
     }
     attributes {
       notes
       details
       accepts
       alternateAccepts
       request {
         laptops
         tablets
         phones
         allInOnes
         desktops
         commsDevices
         other
       }
       alternateRequest {
         laptops
         tablets
         phones
         allInOnes
         desktops
         commsDevices
         other
       }
     }
  }
}
`;

const AUTOCOMPLETE_USERS = gql`
query findAutocompleteVolunteers($term: String, $subGroup: String) {
  volunteersConnection(page: {
    size: 50
  }, where: {
    name: {
      _contains: $term
    }
    subGroup: {
      _contains: $subGroup
    }
    OR: [
    {
      subGroup: {
        _contains: $subGroup
      }
      phoneNumber: {
        _contains: $term
      }
    },
    {
       subGroup: {
        _contains: $subGroup
      }
      email: {
        _contains: $term
      }
    }]
  }){
    content  {
     id
     name
     email
     phoneNumber
    }
  }
}
`;

const UPDATE_ENTITY = gql`
mutation updateOrganisation($data: UpdateOrganisationInput!) {
  updateOrganisation(data: $data){
     id
     website
     phoneNumber
     contact
     name
     email
     address
     createdAt
     updatedAt
     archived
     volunteer {
         id
         name
         email
         phoneNumber
     }
     kits {
      id
      model
      age
      type
      status
      location
      updatedAt
      createdAt
     }
     attributes {
       notes
       details
       accepts
       alternateAccepts
       request {
         laptops
         tablets
         phones
         allInOnes
         desktops
         commsDevices
         other
       }
       alternateRequest {
         laptops
         tablets
         phones
         allInOnes
         desktops
         commsDevices
         other
       }
     }
  }
}
`;

const DELETE_ENTITY = gql`
mutation deleteOrganisation($id: ID!) {
  deleteOrganisation(id: $id)
}
`;

@Component({
  selector: 'org-info',
  styleUrls: ['org-info.scss'],

  templateUrl: './org-info.html'
})
export class OrgInfoComponent {

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
  model: any = {};
  entityName: string;
  entityId: number;

  owner$: Observable<any>;
  ownerInput$ = new Subject<string>();
  ownerLoading = false;
  ownerField: FormlyFieldConfig = {
    key: 'volunteerId',
    type: 'choice',
    className: 'col-md-12',
    templateOptions: {
      label: 'Organising Volunteer',
      description: 'The organising volunteer this organisation is currently assigned to.',
      loading: this.ownerLoading,
      typeahead: this.ownerInput$,
      placeholder: 'Assign device to Organiser Volunteers',
      multiple: false,
      searchable: true,
      items: [],
      required: false
    },
  };

  fields: Array<FormlyFieldConfig> = [
    {
      key: 'archived',
      type: 'radio',
      className: 'col-md-12',
      templateOptions: {
        type: 'array',
        label: 'Archived?',
        description: 'Archived requests are hidden from view',
        options: [
          {label: 'Request Active and Visible', value: false },
          {label: 'Archive and Hide this Request', value: true },
        ],
        required: true,
      }
    },
    {
      key: 'attributes.notes',
      type: 'textarea',
      className: 'col-md-12',
      defaultValue: '',
      templateOptions: {
        label: 'Notes about the organisation',
        rows: 5,
        required: false
      }
    },
    this.ownerField,
    {
      key: 'name',
      type: 'input',
      className: 'col-md-12',
      defaultValue: '',
      templateOptions: {
        label: 'Name',
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
      key: 'website',
      type: 'input',
      className: 'col-md-12',
      defaultValue: '',
      templateOptions: {
        label: 'Website',
        placeholder: '',
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
          expressionProperties: {
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
            required: true
          },
          expressionProperties: {
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
          }
        }
      ]
    },
    {
      key: 'attributes.accepts',
      type: 'multicheckbox',
      className: '',
      defaultValue: [],
      templateOptions: {
        type: 'array',
        label: 'What types of devices are you looking for?',
        multiple: true,
        options: [
          {value: 'LAPTOPS', label: 'Laptops'},
          {value: 'PHONES', label: 'Phones'},
          {value: 'TABLETS', label: 'Tablets' },
          {value: 'ALLINONES', label: 'All In Ones' },
          {value: 'DESKTOPS', label: 'Desktops' },
          {value: 'COMMSDEVICES', label: 'Connectivity Devices' },
          {value: 'OTHER', label: 'Other' }
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
      hideExpression: '!model.attributes.accepts.length',
      fieldGroup: [
        {
          className: 'col-12',
          template: `
            <p>How many of the following items can you currently take?</p>
          `
        },
        {
          key: 'attributes.request.laptops',
          type: 'input',
          className: 'col-6',
          defaultValue: 0,
          hideExpression: 'model.attributes.accepts.toString().indexOf(\'LAPTOP\') < 0',
          templateOptions: {
            min: 0,
            label: 'Laptops',
            addonLeft: {
              class: 'fas fa-laptop'
            },
            type: 'number',
            placeholder: '',
            required: true
          }
        },
        {
          key: 'attributes.request.phones',
          type: 'input',
          className: 'col-6',
          hideExpression: 'model.attributes.accepts.toString().indexOf(\'PHONE\') < 0',
          defaultValue: 0,
          templateOptions: {
            min: 0,
            label: 'Phones',
            addonLeft: {
              class: 'fas fa-mobile-alt'
            },
            type: 'number',
            placeholder: '',
            required: true
          }
        },
        {
          key: 'attributes.request.tablets',
          type: 'input',
          className: 'col-6',
          defaultValue: 0,
          hideExpression: 'model.attributes.accepts.toString().indexOf(\'TABLET\') < 0',
          templateOptions: {
            min: 0,
            label: 'Tablets',
            addonLeft: {
              class: 'fas fa-tablet-alt'
            },
            type: 'number',
            placeholder: '',
            required: true
          }
        },
        {
          key: 'attributes.request.allInOnes',
          type: 'input',
          className: 'col-6',
          hideExpression: 'model.attributes.accepts.toString().indexOf(\'ALLINONE\') < 0',
          defaultValue: 0,
          templateOptions: {
            min: 0,
            label: 'All In Ones',
            addonLeft: {
              class: 'fas fa-desktop'
            },
            type: 'number',
            placeholder: '',
            required: true
          }
        },
        {
          key: 'attributes.request.desktops',
          type: 'input',
          className: 'col-6',
          hideExpression: 'model.attributes.accepts.toString().indexOf(\'DESKTOP\') < 0',
          defaultValue: 0,
          templateOptions: {
            min: 0,
            label: 'Desktops',
            addonLeft: {
              class: 'fas fa-desktop'
            },
            type: 'number',
            placeholder: '',
            required: true
          }
        },
        {
          key: 'attributes.request.other',
          type: 'input',
          className: 'col-6',
          hideExpression: 'model.attributes.accepts.toString().indexOf(\'OTHER\') < 0',
          defaultValue: 0,
          templateOptions: {
            min: 0,
            max: 5,
            label: 'Other',
            description: 'Specify the other types of devices you would like in the additional details field below',
            addonLeft: {
              class: 'fas fa-laptop-house'
            },
            type: 'number',
            placeholder: '',
            required: true
          }
        },
        {
          key: 'attributes.request.commsDevices',
          type: 'input',
          className: 'col-6',
          hideExpression: 'model.attributes.accepts.toString().indexOf(\'COMMSDEVICE\') < 0',
          defaultValue: 0,
          templateOptions: {
            min: 0,
            max: 5,
            label: 'Connectivity Devices',
            description: 'Specify the other types of devices you would like in the additional details field below',
            addonLeft: {
              class: 'fas fa-laptop-house'
            },
            type: 'number',
            placeholder: '',
            required: true
          }
        },
      ]
    },
    {
      key: 'attributes.alternateAccepts',
      type: 'multicheckbox',
      className: '',
      hideExpression: '!model.attributes.accepts.length || model.attributes.accepts.length == 4',
      defaultValue: [],
      templateOptions: {
        type: 'array',
        label: 'If none of the items listed above are available, would you be willing to consider any of the following?',
        multiple: true,
        options: [
          {value: 'LAPTOPS', label: 'Laptops'},
          {value: 'PHONES', label: 'Phones'},
          {value: 'TABLETS', label: 'Tablets' },
          {value: 'ALLINONES', label: 'All In Ones' },
          {value: 'DESKTOPS', label: 'Desktops' },
          {value: 'COMMSDEVICES', label: 'Connectivity Devices' },
          {value: 'OTHER', label: 'Other' }
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
            {value: 'LAPTOPS', label: 'Laptops'},
            {value: 'PHONES', label: 'Phones'},
            {value: 'TABLETS', label: 'Tablets' },
            {value: 'ALLINONES', label: 'All In Ones' },
            {value: 'DESKTOPS', label: 'Desktops' },
            {value: 'COMMSDEVICES', label: 'Connectivity Devices' },
            {value: 'OTHER', label: 'Other' }
          ];
          const values = opts.filter(o => (model.attributes.accepts || []).indexOf(o.value) == -1);
          return values;
        }
      }
    },
    {
      fieldGroupClassName: 'row',
      hideExpression: '!model.attributes.alternateAccepts.length',
      fieldGroup: [
        {
          className: 'col-12',
          template: `
            <p>How many of the following alternate items are you willing to take?</p>
          `
        },
        {
          key: 'attributes.alternateRequest.laptops',
          type: 'input',
          className: 'col-6',
          defaultValue: 0,
          hideExpression: 'model.attributes.accepts.toString().indexOf(\'LAPTOP\') > -1 || model.attributes.alternateAccepts.toString().indexOf(\'LAPTOP\') < 0',
          templateOptions: {
            min: 0,
            label: 'Laptops',
            addonLeft: {
              class: 'fas fa-laptop'
            },
            type: 'number',
            placeholder: '',
            required: true
          }
        },
        {
          key: 'attributes.alternateRequest.phones',
          type: 'input',
          className: 'col-6',
          hideExpression: 'model.attributes.accepts.toString().indexOf(\'PHONE\') > -1 || model.attributes.alternateAccepts.toString().indexOf(\'PHONE\') < 0',
          defaultValue: 0,
          templateOptions: {
            min: 0,
            label: 'Phones',
            addonLeft: {
              class: 'fas fa-mobile-alt'
            },
            type: 'number',
            placeholder: '',
            required: true
          }
        },
        {
          key: 'attributes.alternateRequest.tablets',
          type: 'input',
          className: 'col-6',
          defaultValue: 0,
          hideExpression: 'model.attributes.accepts.toString().indexOf(\'TABLET\') > -1 || model.attributes.alternateAccepts.toString().indexOf(\'TABLET\') < 0',
          templateOptions: {
            min: 0,
            label: 'Tablets',
            addonLeft: {
              class: 'fas fa-tablet-alt'
            },
            type: 'number',
            placeholder: '',
            required: true
          }
        },
        {
          key: 'attributes.alternateRequest.allInOnes',
          type: 'input',
          className: 'col-6',
          hideExpression: 'model.attributes.accepts.toString().indexOf(\'ALLINONE\') > -1 || model.attributes.alternateAccepts.toString().indexOf(\'ALLINONE\') < 0',
          defaultValue: 0,
          templateOptions: {
            min: 0,
            label: 'All In Ones',
            addonLeft: {
              class: 'fas fa-desktop'
            },
            type: 'number',
            placeholder: '',
            required: true
          }
        },
        {
          key: 'attributes.alternateRequest.desktops',
          type: 'input',
          className: 'col-6',
          hideExpression: 'model.attributes.accepts.toString().indexOf(\'DESKTOP\') > -1 || model.attributes.alternateAccepts.toString().indexOf(\'DESKTOP\') < 0',
          defaultValue: 0,
          templateOptions: {
            min: 0,
            label: 'Desktops',
            addonLeft: {
              class: 'fas fa-desktop'
            },
            type: 'number',
            placeholder: '',
            required: true
          }
        },
        {
          key: 'attributes.alternateRequest.other',
          type: 'input',
          className: 'col-6',
          hideExpression: 'model.attributes.accepts.toString().indexOf(\'OTHER\') > -1 || model.attributes.alternateAccepts.toString().indexOf(\'OTHER\') < 0',
          defaultValue: 0,
          templateOptions: {
            min: 0,
            max: 5,
            label: 'Other',
            addonLeft: {
              class: 'fas fa-laptop-house'
            },
            description: 'Specify the other types of devices you would like in the additional details field below',
            type: 'number',
            placeholder: '',
            required: true
          }
        },
        {
          key: 'attributes.alternateRequest.commsDevices',
          type: 'input',
          className: 'col-6',
          hideExpression: 'model.attributes.accepts.toString().indexOf(\'COMMSDEVICE\') > -1 || model.attributes.alternateAccepts.toString().indexOf(\'COMMSDEVICE\') < 0',
          defaultValue: 0,
          templateOptions: {
            min: 0,
            max: 5,
            label: 'Connectivity Devices',
            addonLeft: {
              class: 'fas fa-laptop-house'
            },
            description: 'Specify the other types of devices you would like in the additional details field below',
            type: 'number',
            placeholder: '',
            required: true
          }
        },
      ]
    },
    {
      key: 'attributes.details',
      type: 'textarea',
      className: 'col-md-12',
      defaultValue: '',
      templateOptions: {
        label: 'Any additional details about your request?',
        description: 'If you have any additional details you would like to specify about your request, enter them here.',
        rows: 3,
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
    if (data.volunteer) {
      this.ownerField.templateOptions['items'] = [
        {label: this.volunteerName(data.volunteer), value: data.volunteer.id}
      ];
      data.volunteerId = data.volunteer.id;
    }
    return data;
  }

  private fetchData() {
    if (!this.entityId) {
      return;
    }

    this.queryRef.refetch({
      id: this.entityId
    }).then(res => {
      if (res.data && res.data['organisation']) {
        const data = res.data['organisation'];
        this.model = this.normalizeData(data);
        this.entityName = this.model['name'];
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
    const userRef = this.apollo
    .watchQuery({
      query: AUTOCOMPLETE_USERS,
      variables: {
      }
    });

    this.owner$ = concat(
      of([]),
      this.ownerInput$.pipe(
        debounceTime(200),
        distinctUntilChanged(),
        tap(() => this.ownerLoading = true),
        switchMap(term => from(userRef.refetch({
          term: term,
          subGroup: ''
        })).pipe(
          catchError(() => of([])),
          tap(() => this.ownerLoading = false),
          switchMap(res => {
            const data = res['data']['volunteersConnection']['content'].map(v => {
              return {
                label: `${this.volunteerName(v)}`, value: v.id
              };
            });
            return of(data);
          })
        ))
      )
    );

    this.sub = this.activatedRoute.params.subscribe(params => {
      this.entityId = +params['orgId'];
      this.fetchData();
    });

    this.sub.add(this.owner$.subscribe(data => {
      this.ownerField.templateOptions['items'] = data;
    }));
  }

  volunteerName(data) {
    return `${data.name || ''}||${data.email || ''}||${data.phoneNumber || ''}`.split('||').filter(f => f.trim().length).join(' / ').trim();
  }

  ngOnDestory() {
    if (this.sub) {
      this.sub.unsubscribe();
    }
  }

  updateEntity(data: any) {
    if (!this.form.valid) {
      this.model.showErrorState = true;
      return false;
    }
    data.id = this.entityId;
    this.apollo.mutate({
      mutation: UPDATE_ENTITY,
      variables: {
        data
      }
    }).subscribe(res => {
      this.model = this.normalizeData(res.data['updateOrganisation']);
      this.entityName = this.model['name'];
      this.toastr.info(`
      <small>Successfully updated organisation ${this.entityName}</small>
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
        <small>Successfully deleted organisation ${this.entityName}</small>
        `, 'Organisation Deleted', {
            enableHtml: true
          });
        this.router.navigate(['/dashboard/organisations']);
      }
    }, err => {
      this.toastr.error(`
      <small>${err.message}</small>
      `, 'Error Deleting Organisation', {
          enableHtml: true
        });
    });
  }
}
