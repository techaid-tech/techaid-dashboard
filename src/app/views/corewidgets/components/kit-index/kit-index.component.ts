import { Component, ViewChild, ViewEncapsulation, Input } from '@angular/core';
import { concat, Subject, of, forkJoin, Observable, Subscription, from } from 'rxjs';
import { AppGridDirective } from '@app/shared/modules/grid/app-grid.directive';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import gql from 'graphql-tag';
import { Apollo } from 'apollo-angular';
import { query } from '@angular/animations';
import { FormControl, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { FormlyFieldConfig, FormlyFormOptions } from '@ngx-formly/core';
import { debounceTime, distinctUntilChanged, switchMap, tap, catchError } from 'rxjs/operators';
import { Select } from '@ngxs/store';
import 'datatables.net-responsive';
import 'datatables.net-rowreorder';
import { CoreWidgetState } from '@views/corewidgets/state/corewidgets.state';
import { HashUtils } from '@app/shared/utils';
import { KIT_STATUS } from '../kit-info/kit-info.component';

const QUERY_ENTITY = gql`
query findAllKits($page: PaginationInput,$term: String, $where: KitWhereInput!) {
  kitsConnection(page: $page, where: {
    AND: {
      model: {
        _contains: $term
      }
      AND: [ $where ]
      OR: [
        {
          location: {
            _contains: $term
          }
          AND: [ $where ]
        }
        {
          attributes: {
            filters: [
              {
                key: "notes",
                _text: {
                  _contains: $term
                }
              }
            ]
          }
          AND: [ $where ]
        }
      ]
    }
  }){
    totalElements
    number
    content{
     id
     model
     age
     type
     status
     location
     updatedAt
     createdAt
     donor {
       id
       name
       email
       phoneNumber
     }
     organisation {
       id
       name
     }
     attributes {
       notes
     }
     volunteers {
      type
      volunteer {
        id
        name
        email
        phoneNumber
      }
     }
    }
  }
}
`;

const CREATE_ENTITY = gql`
mutation createKits($data: CreateKitInput!) {
  createKit(data: $data){
    id
    type
    model
  }
}
`;

const AUTOCOMPLETE_USERS = gql`
query findAutocompleteVolunteers($term: String, $ids: [Long!]) {
  volunteersConnection(page: {
    size: 50
  }, where: {
    name: {
      _contains: $term
    }
    OR: [
    {
      id: {
        _in: $ids
      }
    },
    {
      phoneNumber: {
        _contains: $term
      }
    },
    {
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

const AUTOCOMPLETE_ORGS = gql`
query findAutocompleteOrgs($term: String, $ids: [Long!]) {
  organisationsConnection(page: {
    size: 50
  }, where: {
    name: {
      _contains: $term
    }
    OR: [
    {
      id: {
        _in: $ids
      }
    },
    {
      phoneNumber: {
        _contains: $term
      }
    },
    {
      contact: {
        _contains: $term
      }
    },
    {
      email: {
        _contains: $term
      }
    },
    {
      website: {
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

const FIND_USERS = gql`
query findAutocompleteVolunteers($volunteerIds: [Long!], $orgIds: [Long!]) {
  volunteers(where: {
    id: {
      _in: $volunteerIds
    }
  }){
     id
     name
     email
     phoneNumber
  }

  organisations(where: {
    id: {
      _in: $orgIds
    }
  }){
     id
     name
     email
     phoneNumber
  }
}
`;

@Component({
  selector: 'kit-index',
  styleUrls: ['kit-index.scss'],

  templateUrl: './kit-index.html'
})
export class KitIndexComponent {

  constructor(
    private modalService: NgbModal,
    private toastr: ToastrService,
    private apollo: Apollo
  ) {

  }
  @ViewChild(AppGridDirective) grid: AppGridDirective;
  dtOptions: DataTables.Settings = {};
  sub: Subscription;
  table: any;
  total: number;
  selections = {};
  selected = [];
  entities = [];
  form: FormGroup = new FormGroup({});
  model = {};
  ages = {
     0: 'I don\'t know',
     1: 'Less than a year',
     2: '1 - 2 years',
     4: '3 - 4 years',
     5: '5 - 6 years',
     6: 'more than 6 years old'
  };

  classes = {
    'LOGISTICS': 'dark',
    'TECHNICIAN': 'info',
    'ORGANISER': 'success'
  };

  statusTypes: any = KIT_STATUS;

  users$: Observable<any>;
  userInput$ = new Subject<string>();
  usersLoading = false;
  userField: FormlyFieldConfig = {
    key: 'userIds',
    type: 'choice',
    className: 'col-md-12',
    templateOptions: {
      label: 'Assigned Volunteer',
      description: 'Filter by assigned user.',
      loading: this.usersLoading,
      typeahead: this.userInput$,
      multiple: true,
      searchable: true,
      items: [],
      required: false
    },
  };

  orgs$: Observable<any>;
  orgInput$ = new Subject<string>();
  orgLoading = false;
  orgField: FormlyFieldConfig = {
    key: 'orgIds',
    type: 'choice',
    className: 'col-md-12',
    templateOptions: {
      label: 'Assigned Organisation',
      description: 'Filter by assigned organisation.',
      loading: this.orgLoading,
      typeahead: this.orgInput$,
      multiple: true,
      searchable: true,
      items: [],
      required: false
    },
  };

  filter: any = {};
  filterCount = 0;
  filterModel: any = {archived: [false]};
  filterForm: FormGroup = new FormGroup({});
  filterFields: Array<FormlyFieldConfig> = [
    {
      fieldGroupClassName: 'row',
      fieldGroup: [
        {
          key: 'type',
          type: 'multicheckbox',
          className: 'col-sm-4',
          defaultValue: [],
          templateOptions: {
            label: 'Type of device',
            type: 'array',
            options: [
              {label: 'Laptop', value: 'LAPTOP' },
              {label: 'Chromebook', value: 'CHROMEBOOK' },
              {label: 'Tablet', value: 'TABLET' },
              {label: 'Smart Phone', value: 'SMARTPHONE' },
              {label: 'All In One (PC)', value: 'ALLINONE' },
              {label: 'Desktop', value: 'DESKTOP' },
              {label: 'Other', value: 'OTHER' }
            ],
          }
        },
        {
          key: 'age',
          type: 'multicheckbox',
          className: 'col-sm-4',
          templateOptions: {
            label: 'Roughly how old is your device?',
            type: 'array',
            options: [
              {label: 'Less than a year', value: 1},
              {label: '1 - 2 years', value: 2},
              {label: '3 - 4 years', value: 4 },
              {label: '5 - 6 years', value: 5},
              {label: 'More than 6 years old', value: 6 },
              {label: 'I don\'t know!', value: 0 }
            ],
            required: false
          }
        },
        {
          key: 'archived',
          type: 'multicheckbox',
          className: 'col-sm-4',
          defaultValue: [false],
          templateOptions: {
            type: 'array',
            label: 'Filter by Archived?',
            options: [
              {label: 'Active Devices', value: false },
              {label: 'Archived Devices', value: true },
            ],
            required: false,
          }
        },
        {
          key: 'status',
          type: 'choice',
          className: 'col-md-12',
          templateOptions: {
            label: 'Status of the device',
            items: [
              {label: 'New - Donation Registered', value: 'NEW' },
              {label: 'Declined - Not Suitable', value: 'DECLINED' },
              {label: 'Accepted - Assesment Needed', value: 'ASSESSMENT_NEEDED' },
              {label: 'Accepted - No Assesment Required', value: 'ACCEPTED' },
              {label: 'Collection from donor scheduled', value: 'PICKUP_SCHEDULED' },
              {label: 'Donor drop off agreed', value: 'DROPOFF_AGGREED' },
              {label: 'Donation received by Tech Team', value: 'WITH_TECHIE' },
              {label: 'Donation stored at the Hub', value: 'STORED' },
              {label: 'Donation faulty - collect for recycling', value: 'UPDATE_FAILED' },
              {label: 'Donation updated - arrange collection', value: 'READY' },
              {label: 'Device allocated to referring organisation', value: 'ALLOCATED' },
              {label: 'Collection / drop off to referring organisation agreed', value: 'DELIVERY_ARRANGED' },
              {label: 'Device received by organisation', value: 'DELIVERED' },
              {label: 'Ready but missing component', value: 'INCOMPLETE'},
              {label: 'Recycled' , value: 'RECYCLED'}
            ],
            multiple: true,
            required: false
          }
        },
        this.userField,
        this.orgField
      ]
    }
  ];

  @Select(CoreWidgetState.query) search$: Observable<string>;

  fields: Array<FormlyFieldConfig> = [
    {
      key: 'location',
      type: 'place',
      className: 'col-md-12',
      defaultValue: '',
      templateOptions: {
        label: 'Address',
        description: 'The address of the device',
        placeholder: '',
        postCode: false,
        required: true
      }
    },
    {
      key: 'attributes.pickup',
      type: 'radio',
      className: 'col-md-12',
      defaultValue: 'DROPOFF',
      templateOptions: {
        label: 'Are you able to drop off your device to a location in Lambeth or would you need it to be collected?',
        placeholder: '',
        required: true,
        options: [
          { label: 'I am able to drop off my device to a location in Lambeth', value: 'DROPOFF' },
          { label: 'I would need you to come and collect my device', value: 'PICKUP' },
          { label: 'I\'m not sure – it depends on the exact location', value: 'NOTSURE' }
        ]
      }
    },
    {
      key: 'attributes.pickupAvailability',
      type: 'input',
      className: 'col-md-12',
      defaultValue: '',
      templateOptions: {
        label: 'Pickup Availability',
        rows: 2,
        description: `
          Please let us know when you are typically available at home for someone
          to arrange to come and pick up your device. Alternatively provide us with times
          when you are usually not available.
          `,
        required: true
      },
      hideExpression: 'model.attributes.pickup != \'PICKUP\'',
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
      fieldGroupClassName: 'row',
      fieldGroup: [
        {
          className: 'col-md-6',
          fieldGroup: [
            {
              key: 'type',
              type: 'radio',
              className: '',
              defaultValue: 'LAPTOP',
              templateOptions: {
                label: 'Type of device',
                options: [
                  {label: 'Laptop', value: 'LAPTOP' },
                  {label: 'Chromebook', value: 'CHROMEBOOK' },
                  {label: 'Tablet', value: 'TABLET' },
                  {label: 'Smart Phone', value: 'SMARTPHONE' },
                  {label: 'All In One (PC)', value: 'ALLINONE' },
                  {label: 'Desktop', value: 'DESKTOP' },
                  {label: 'Other', value: 'OTHER' }
                ],
                required: true
              }
            },
            {
              key: 'attributes.otherType',
              type: 'input',
              className: '',
              defaultValue: '',
              templateOptions: {
                label: 'Type of device',
                rows: 2,
                placeholder: '(Other device type)',
                required: true
              },
              hideExpression: 'model.type != \'OTHER\'',
              expressionProperties: {
                'templateOptions.required': 'model.type == \'OTHER\'',
              },
            },
          ]
        },
        {
          className: 'col-md-6',
          fieldGroup: [
            {
              key: 'attributes.status',
              type: 'multicheckbox',
              className: '',
              templateOptions: {
                type: 'array',
                options: [],
                description: 'Please select all options that apply',
                required: true
              },
              defaultValue: [],
              expressionProperties: {
                'templateOptions.options': (model, state) => {
                  const props = {
                    'LAPTOP': [
                      {label: 'I have the charger / power cable for the Laptop', value: 'CHARGER'},
                      {label: 'I don\'t have the charger / power cable for the Laptop', value: 'NO_CHARGER'},
                      {label: 'Does the Laptop have a password set?', value: 'PASSWORD_PROTECTED'}
                    ],
                    'TABLET': [
                      {label: 'I have the charger for the Tablet', value: 'CHARGER'},
                      {label: 'I don\'t have the charger / power cable for the Tablet', value: 'NO_CHARGER'},
                      {label: 'Have you factory reset the Tablet?', value: 'FACTORY_RESET'}
                    ],
                    'SMARTPHONE': [
                      {label: 'I have the charger for the Phone', value: 'CHARGER'},
                      {label: 'I don\'t have the charger / power cable for the Phone', value: 'NO_CHARGER'},
                      {label: 'Have you factory reset the Phone?', value: 'FACTORY_RESET'}
                    ],
                    'ALLINONE': [
                      {label: 'I have the charger for the Computer', value: 'CHARGER'},
                      {label: 'I don\'t have the charger / power cable for the Computer', value: 'NO_CHARGER'},
                      {label: 'Do you have a mouse for the Computer?', value: 'HAS_MOUSE'},
                      {label: 'Do you have a keyboard for the Computer', value: 'HAS_KEYBOARD'},
                      {label: 'Does the Computer have a password set?', value: 'PASSWORD_PROTECTED'}
                    ],
                    'DESKTOP': [
                      {label: 'I have the power cable for the Computer', value: 'CHARGER'},
                      {label: 'I don\'t have the power cable for the Computer', value: 'NO_CHARGER'},
                      {label: 'Do you have a mouse for the Computer?', value: 'HAS_MOUSE'},
                      {label: 'Do you have a keyboard for the Computer', value: 'HAS_KEYBOARD'},
                      {label: 'Does the Computer have a password set?', value: 'PASSWORD_PROTECTED'}
                    ],
                    'OTHER': [
                      {label: 'I have the charger or power cable for the device', value: 'CHARGER'},
                      {label: 'I don\'t have the charger / power cable for the device', value: 'NO_CHARGER'},
                    ],
                  };
                  return props[model.type] || props['OTHER'];
                },
              },
            },
            {
              key: 'attributes.credentials',
              type: 'input',
              className: '',
              defaultValue: '',
              templateOptions: {
                label: 'Device Password',
                description: 'If your device requires a password or a PIN to sign in, please provide it here',
                rows: 2,
                placeholder: 'Password',
                required: false
              },
              hideExpression: (model, state) => {
                if (['LAPTOP', 'ALLINONE', 'CHROMEBOOK'].indexOf(model.type) == -1) {
                  return true;
                }
                const status = HashUtils.dotNotation(model, 'attributes.status') || [];
                if (status && status.length) {
                  return status.indexOf('PASSWORD_PROTECTED') == -1;
                }
                return true;
              }
            },
          ]
        },
        {
          key: 'age',
          type: 'radio',
          className: 'col-md-6',
          defaultValue: 5,
          templateOptions: {
            label: 'Roughly how old is your device?',
            options: [
              {label: 'Less than a year', value: 1},
              {label: '1 - 2 years', value: 2},
              {label: '3 - 4 years', value: 4 },
              {label: '5 - 6 years', value: 5},
              {label: 'More than 6 years old', value: 6 },
              {label: 'I don\'t know!', value: 0 }
            ],
            required: true
          }
        },
      ]
    },
    {
      key: 'model',
      type: 'input',
      className: 'col-md-12',
      defaultValue: '',
      templateOptions: {
        label: 'Make or model (if known)',
        rows: 2,
        placeholder: '',
        required: true
      }
    },
    {
      key: 'attributes.state',
      type: 'input',
      className: 'col-md-12',
      defaultValue: '',
      templateOptions: {
        label: 'What technical state is the device in? For example, does it turn on OK? Are there keys missing? Is the screen cracked?',
        rows: 2,
        placeholder: '',
        required: false
      }
    },
    {
      template: `
      <div class="row">
        <div class="col-md-12">
          <div class="border-bottom-warning card mb-3 p-3">
            <p>
              In order to protect your data, Lambeth TechAid will delete any personal information
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
      key: 'attributes.images',
      type: 'gallery',
      className: 'col-md-12',
      templateOptions: {
        label: 'Upload an image of your device if you can',
        required: false
      }
    },
    {
      key: 'attributes.consent',
      type: 'radio',
      className: 'col-md-12',
      templateOptions: {
        label: '',
        options: [
          {label: 'I consent to my data being processed by Lambeth TechAid', value: 'yes' },
          // {label: "I do not consent to my data being processed by Lambeth TechAid", value: "no" },
        ],
        required: true
      }
    }
  ];

  @Input()
  pageLength = 10;

  @Input()
  tableId = 'kit-index';

  applyFilter(data) {
    const filter = {};
    let count = 0;

    if (data.type && data.type.length) {
      count = count + data.type.length;
      filter['type'] = {'_in': data.type };
    }

    if (data.status && data.status.length) {
      count = count + data.status.length;
      filter['status'] = {'_in': data.status };
    }

    if (data.age && data.age.length) {
      count = count + data.age.length;
      filter['age'] = {'_in': data.age };
    }

    if (data.archived && data.archived.length) {
      count += data.archived.length;
      filter['archived'] = {_in: data.archived};
    }

    if (data.userIds && data.userIds.length) {
      count += data.userIds.length;
      filter['volunteer'] = {id: {_in: data.userIds}};
    }

    if (data.orgIds && data.orgIds.length) {
      count += data.orgIds.length;
      filter['organisation'] = {id: {_in: data.orgIds}};
    }

    localStorage.setItem(`kitFilters-${this.tableId}`, JSON.stringify(data));
    this.filter = filter;
    this.filterCount = count;
    this.filterModel = data;
    this.table.ajax.reload(null, false);
  }

  modal(content) {
    this.modalService.open(content, { centered: true, size: 'lg' });
  }

  clearSelection() {
    this.selections = {};
    this.selected = [];
  }

  query(evt?: any, filter?: string) {
    if (filter === undefined) {
      filter = this.table.search();
    }

    if (evt) {
      const code = (evt.keyCode ? evt.keyCode : evt.which);
      if (code !== 13) {
        return;
      }
    }

    this.table.search(filter);
    this.table.ajax.reload(null, false);
  }

  ngOnInit() {
    const queryRef = this.apollo
      .watchQuery({
        query: QUERY_ENTITY,
        variables: {}
      });

      const userRef = this.apollo
      .watchQuery({
        query: AUTOCOMPLETE_USERS,
        variables: {
        }
      });

      const orgRef = this.apollo
      .watchQuery({
        query: AUTOCOMPLETE_ORGS,
        variables: {
        }
      });

    this.sub = this.search$.subscribe(query => {
      if (this.table) {
        this.table.search(query);
        this.table.ajax.reload(null, false);
      }
    });


    this.users$ = concat(
      of([]),
      this.userInput$.pipe(
        debounceTime(200),
        distinctUntilChanged(),
        tap(() => this.usersLoading = true),
        switchMap(term => from(userRef.refetch({
          term: term,
          ids: this.filterModel.userIds || [],
        })).pipe(
          catchError(() => of([])),
          tap(() => this.usersLoading = false),
          switchMap(res => {
            const data = res['data']['volunteersConnection']['content'].map(v => {
              return {
                label: this.volunteerName(v), value: v.id
              };
            });
            return of(data);
          })
        ))
      )
    );

    this.orgs$ = concat(
      of([]),
      this.orgInput$.pipe(
        debounceTime(200),
        distinctUntilChanged(),
        tap(() => this.orgLoading = true),
        switchMap(term => from(orgRef.refetch({
          term: term,
          ids: this.filterModel.orgIds || [],
        })).pipe(
          catchError(() => of([])),
          tap(() => this.orgLoading = false),
          switchMap(res => {
            const data = res['data']['organisationsConnection']['content'].map(v => {
              return {
                label: this.volunteerName(v), value: v.id
              };
            });
            return of(data);
          })
        ))
      )
    );

    this.sub.add(this.orgs$.subscribe(data => {
      this.orgField.templateOptions['items'] = data;
    }));

    this.sub.add(this.users$.subscribe(data => {
      this.userField.templateOptions['items'] = data;
    }));

    this.dtOptions = {
      pagingType: 'simple_numbers',
      dom:
        '<\'row\'<\'col-sm-12 col-md-6\'l><\'col-sm-12 col-md-6\'f>>' +
        '<\'row\'<\'col-sm-12\'tr>>' +
        '<\'row\'<\'col-sm-12 col-md-5\'i><\'col-sm-12 col-md-7\'p>>',
      pageLength: this.pageLength,
      lengthMenu: [ 5, 10, 25, 50, 100 ],
      order: [1, 'desc'],
      serverSide: true,
      stateSave: true,
      processing: true,
      searching: true,
      ajax: (params: any, callback) => {
        const sort = params.order.map(o => {
          return {
            key: this.dtOptions.columns[o.column].data,
            value: o.dir
          };
        });
        const vars = {
          page: {
            sort: sort,
            size: params.length,
            page: Math.round(params.start / params.length),
          },
          where: this.filter,
          term: params['search']['value']
        };

        console.log(vars, params);

        queryRef.refetch(vars).then(res => {
          let data: any = {};
          if (res.data) {
            data = res['data']['kitsConnection'];
            if (!this.total) {
              this.total = data['totalElements'];
            }
            data.content.forEach(d => {
              if (d.donor) {
                d.donorName = this.userName(d.donor);
              }
              if (d.volunteer) {
                d.volunteerName = this.userName(d.volunteer);
              }
            });
            this.entities = data.content;
          }

          callback({
            draw: params.draw,
            recordsTotal: this.total,
            recordsFiltered: data['totalElements'],
            error: '',
            data: []
          });
        }, err => {
          callback({
            draw: params.draw,
            recordsTotal: this.total || 0,
            recordsFiltered: 0,
            error: err.message,
            data: []
          });

          this.toastr.warning(`
            <small>${err.message}</small>
          `, 'GraphQL Error', {
              enableHtml: true,
              timeOut: 15000,
              disableTimeOut: true
            });
        });
      },
      columns: [
        { data: null, width: '15px', orderable: false  },
        { data: 'model' },
        { data: 'donor' },
        { data: 'volunteers.volunteer.name', orderable: false },
        { data: 'createdAt'},
        { data: 'updatedAt'},
        { data: 'age'},
        { data: 'type' },
        { data: 'status' },
      ]
    };
  }

  userName(data) {
    return `${data.name || ''}||${data.email || ''}||${data.phoneNumber || ''}`.split('||').filter(f => f.trim().length)[0];
  }

  volunteerName(data) {
    return `${data.name || ''}||${data.email || ''}||${data.phoneNumber || ''}`.split('||').filter(f => f.trim().length).join(' / ').trim();
  }


  ngOnDestory() {
    if (this.sub) {
      this.sub.unsubscribe();
    }
  }

  ngAfterViewInit() {
    this.grid.dtInstance.then(tbl => {
      this.table = tbl;
      try {
        this.filterModel = JSON.parse(localStorage.getItem(`kitFilters-${this.tableId}`)) || {archived: [false]};
        if (this.filterModel && (this.filterModel.userIds || this.filterModel.orgIds) ) {
          this.apollo.query({
            query: FIND_USERS,
            variables: {
              volunteerIds: this.filterModel.userIds || [],
              orgIds: this.filterModel.orgIds || []
            }
          }).toPromise().then(res => {
            if (res.data) {
              if (res.data['volunteers']) {
                this.userField.templateOptions['items'] = res.data['volunteers'].map(v => {
                  return {label: this.volunteerName(v), value: v.id };
                });
              }
              if (res.data['organisations']) {
                this.orgField.templateOptions['items'] = res.data['organisations'].map(v => {
                  return {label: this.volunteerName(v), value: v.id };
                });
              }
            }
          });
        }
      } catch (_) {
        this.filterModel = {archived: [false]};
      }

      try {
        this.applyFilter(this.filterModel);
        this.filterForm.patchValue(this.filterModel);
      } catch (_) {
      }
    });
  }

  createEntity(data: any) {
    data.status = 'NEW';
    data.attributes.images = (data.attributes.images || []).map(f => {
      return {
        image: f.image,
        id: f.id
      };
    });
    this.apollo.mutate({
      mutation: CREATE_ENTITY,
      variables: { data }
    }).subscribe(data => {
      this.total = null;
      this.table.ajax.reload(null, false);
    }, err => {
      this.toastr.error(`
      <small>${err.message}</small>
      `, 'Create Device Error', {
          enableHtml: true,
          timeOut: 15000
        });
    });
  }


  select(row?: any) {
    if (row) {
      if (this.selections[row.id]) {
        delete this.selections[row.id];
      } else {
        this.selections[row.id] = row;
      }
    }

    this.selected = [];
    for (const k in this.selections) {
      this.selected.push(this.selections[k]);
    }
  }
}
