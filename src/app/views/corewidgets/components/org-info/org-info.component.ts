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

// TODO: remove vestigial alternate accepts code
const QUERY_ENTITY = gql`
query findOrganisation($id: Long!) {
  organisation(where: {
    id: {
      _eq: $id
    }
  }){
     id
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
       clientRef
       notes
       details
       needs
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
       clientRef
       notes
       details
       needs
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
    className: 'col-md-4',
    templateOptions: {
      label: 'Organising Volunteer',
      description: '',
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
      fieldGroupClassName: 'row',
      fieldGroup: [
        {
          // column 1
          fieldGroupClassName: 'd-flex flex-column justify-content-between',
          className: 'col-md-4',
          fieldGroup: [
            {
              key: 'name',
              type: 'input',
              className: '',
              defaultValue: '',
              templateOptions: {
                label: 'Organisation name',
//                description: 'The name of the organisation',
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
              key: 'contact',
              type: 'input',
              className: '',
              defaultValue: '',
              templateOptions: {
                label: 'Primary contact name',
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
              className: '',
              defaultValue: '',
              templateOptions: {
                label: 'Primary contact email',
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
              className: '',
              defaultValue: '',
              templateOptions: {
                label: 'Primary contact phone number',
                required: true
              },
              expressionProperties: {
                'templateOptions.required': '!model.email.length'
              }
            },
            {
              key: 'address',
              type: 'place',
              className: '',
              defaultValue: '',
              templateOptions: {
                label: 'Address',
                description: 'The address of the organisation',
                placeholder: '',
                postCode: false,
                required: true
              },
              expressionProperties: {
                'templateOptions.required': '!model.address.length'
              }
            },
            {
              key: 'attributes.clientRef',
              type: 'input',
              className: '',
              defaultValue: '',
              templateOptions: {
                label: 'Organisation\'s client reference',
                // TODO: should this be required
                description: 'An organisation\'s internal reference for their client',
                required: false
              }
            },
            {
              key: 'archived',
              type: 'radio',
              className: '',
              templateOptions: {
                type: 'array',
                label: 'Archived?',
                description: 'Archived requests are hidden from view',
                options: [
                  {label: 'Request active and visible', value: false },
                  {label: 'Archive and hide this request', value: true },
                ],
                required: true,
              }
            }
          ]
        },        
        {
          fieldGroupClassName: 'd-flex flex-column justify-content-between',
          className: 'col-md-4', 
          // column 2
          fieldGroup: [
            {
              key: 'attributes.details',
              type: 'textarea',
              className: '',
              defaultValue: '',
              templateOptions: {
                label: 'Referring organisation\'s details about the client',
                description: '',
                rows: 4,
                required: false
              }
            },
            {
              key: 'attributes.accepts',
              type: 'multicheckbox',
              className: '',
              defaultValue: [],
              templateOptions: {
                type: 'array',
                label: 'Device types requested',
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
              hideExpression: '!model.attributes.accepts.length',
              fieldGroup: [
                //       {
                //         className: '',
                //         template: `
                //   <p>How many of the following items can you currently take</p>
                // `
                //       },
                {
                  key: 'attributes.request.laptops',
                  type: 'input',
                  className: '',
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
                    className: '',
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
                    className: '',
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
                    className: '',
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
                    className: '',
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
                    className: '',
                    hideExpression: 'model.attributes.accepts.toString().indexOf(\'OTHER\') < 0',
                    defaultValue: 0,
                    templateOptions: {
                      min: 0,
                      max: 5,
                      label: 'Other',
                      description: '',
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
                    className: '',
                    hideExpression: 'model.attributes.accepts.toString().indexOf(\'COMMSDEVICE\') < 0',
                    defaultValue: 0,
                    templateOptions: {
                      min: 0,
                      max: 5,
                      label: 'Connectivity Devices',
                      description: '',
                      addonLeft: {
                        class: 'fas fa-laptop-house'
                      },
                      type: 'number',
                      placeholder: '',
                      required: true
                    }
                  }
              ]
            }
          ]
        },
        {
          fieldGroupClassName: 'd-flex flex-column justify-content-between',
          className: 'col-md-4',
          //column 3
          fieldGroup: [
            {
              key: 'attributes.notes',
              type: 'textarea',
              className: '',
              defaultValue: '',
              templateOptions: {
                label: 'Request fulfilment notes',
                rows: 4,
                required: false
              }
            },
            {
              key: 'attributes.needs',
              type: 'multicheckbox',
              className: '',
              defaultValue: [],
              templateOptions: {
                type: 'array',
                multiple: true,
                label: 'Client needs',
                options: [
                  {value: 'internet', label: 'Has no home internet'},
                  {value: 'mobility', label: 'Mobility issues'},
                  {value: 'training', label: 'Training needs'}
                ],
                required: false
             }
            },
          ]
        }
      ]
    }
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

  ngOnDestroy() {
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
      `, 'Updated request', {
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
