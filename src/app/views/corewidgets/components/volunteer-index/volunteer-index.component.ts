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

const QUERY_ENTITY = gql`
query findAllVolunteers($page: PaginationInput,$where: VolunteerWhereInput!, $term: String) {
  volunteersConnection(page: $page, where: {
      name: {
        _contains: $term
      },
      AND: [$where]
      OR: [
        {
          postCode: {
            _contains: $term
          },
          AND: [$where]
        },
        {
          email: {
            _contains: $term
          }
          AND: [$where]
        },
        {
          subGroup: {
            _contains: $term
          }
          AND: [$where]
        }
      ]
  }){
    totalElements
    number
    content {
     id
     name
     updatedAt
     createdAt
     email
     phoneNumber
     availability
     subGroup
     storage
     transport
     kitCount
    }
  }
}
`;

const CREATE_ENTITY = gql`
mutation createVolunteer($data: CreateVolunteerInput!) {
  createVolunteer(data: $data){
    id
    name
  }
}
`;

@Component({
  selector: 'volunteer-index',
  styleUrls: ['volunteer-index.scss'],

  templateUrl: './volunteer-index.html'
})
export class VolunteersIndexComponent {

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

  filter: any = {};
  filterCount = 0;
  filterModel: any = {};
  filterForm: FormGroup = new FormGroup({});
  filterFields: Array<FormlyFieldConfig> = [
    {
      fieldGroupClassName: 'row',
      fieldGroup: [
        {
          key: 'subGroup',
          type: 'multicheckbox',
          className: 'col-md-6',
          defaultValue: [],
          templateOptions: {
            label: 'Volunteer Type',
            multiple: true,
            type: 'array',
            options: [
              {value: 'Technical', label: 'Technical: remove data and update donated equipment' },
              {value: 'Transport', label: 'Transport: collecting and delivering devices'},
              {value: 'Donations', label: 'Donations: Co-ordinating donations and assigning them to the technical team'},
              {value: 'Distribution', label: 'Distribution: respond to and fill requests for devices' },
              {value: 'Publicity', label: 'Publicity: manage social media and other publicity to maintain a steady flow of donations and volunteers into TechAid'},
              {value: 'Organizing', label: 'Management: leading and coordinating the work of the various groups and the org as a whole' },
              {value: 'Other', label: 'Other'}
            ],
            required: false
          }
        },
        {
          key: 'storage',
          type: 'multicheckbox',
          className: 'col-md-6',
          templateOptions: {
            type: 'array',
            label: 'Are you able to store equipment?',
            description: 'This is for devices that have been picked up from donors',
            options: [
              {label: 'No', value: 'no' },
              {label: 'Limited storage possible', value: 'limited' },
              {label: 'Yes', value: 'yes' }
            ],
          },
        },
        {
          key: 'transport',
          type: 'multicheckbox',
          className: 'col-md-6',
          templateOptions: {
            type: 'array',
            label: 'Do you have use of a car or bike?',
            description: 'Mode of travel',
            options: [
              {label: 'Car', value: 'car' },
              {label: 'Bike', value: 'bike' },
              {label: 'Neither', value: 'none' }
            ]
          }
        },
        {
          className: 'col-md-6',
          fieldGroup: [
            {
              key: 'hasCapacity',
              type: 'multicheckbox',
              className: '',
              templateOptions: {
                type: 'array',
                label: 'Filter by tech volunteers that have capacity',
                options: [
                  {label: 'With Capacity', value: true },
                  {label: 'No Capacity', value: false }
                ],
                required: false,
              }
            },
            {
              key: 'accepts',
              type: 'multicheckbox',
              className: '',
              defaultValue: [],
              templateOptions: {
                type: 'array',
                label: 'Filter by what Tech Volunteer Accepts',
                multiple: true,
                options: [
                  {value: 'APPLE_PHONES', label: 'Apple iPhones'},
                  {value: 'ANDROID_PHONES', label: 'Android Phones'},
                  {value: 'IOS_TABLETS', label: 'iPads' },
                  {value: 'ANDROID_TABLETS', label: 'Android Tablets' },
                  {value: 'OTHER_TABLETS', label: 'All Other Tablets ( Windows )' },
                  {value: 'WINDOWS_LAPTOPS', label: 'Windows Laptops' },
                  {value: 'WINDOWS_ALLINONES', label: 'Windows All In Ones' },
                  {value: 'WINDOWS_DESKTOPS', label: 'Windows Desktops' },
                  {value: 'LINUX_LAPTOPS', label: 'Capable of Installing Linux on Old Windows Computers' },
                  {value: 'APPLE_LAPTOPS', label: 'Apple Macbooks' },
                  {value: 'APPLE_ALLINONES', label: 'Apple iMacs (All In One)' },
                ]
              }
            },
          ]
        },
      ]
    }
  ];

  @Select(CoreWidgetState.query) search$: Observable<string>;

  fields: Array<FormlyFieldConfig> = [
    {
      template: `
      <div class="row">
        <div class="col-md-12">
          <div class="border-bottom-info card mb-3 p-3">
            <strong><p>Covid TechAid Volunteers</p></strong>
            <p>
            Thank you for offering to help get isolated people connected on line through Lambeth TechAid.
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
      fieldGroupClassName: 'row',
      fieldGroup: [
        {
          key: 'email',
          type: 'input',
          className: 'col-md-6',
          defaultValue: '',
          templateOptions: {
            label: 'Email',
            type: 'email',
            pattern: /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
            placeholder: '',
            required: true
          }
        },
        {
          key: 'phoneNumber',
          type: 'input',
          className: 'col-md-6',
          defaultValue: '',
          templateOptions: {
            label: 'Phone Number',
            pattern: /\+?[0-9]+/,
            required: true
          }
        },
      ]
    },
    {
      fieldGroupClassName: 'row',
      fieldGroup: [
        {
          className: 'col-md-6',
          fieldGroup: [
            {
              key: 'subGroup',
              type: 'multicheckbox',
              className: '',
              defaultValue: [],
              templateOptions: {
                type: 'array',
                label: 'How would you like to help? Select all that apply.',
                description: 'Please let us know what tasks you would like to help with eg organisation, technical support, collection and delivery, training, fundraising etc. If none of these apply, select `Other` and define how you would be able to help.',
                multiple: true,
                options: [
                  {value: 'Technical', label: 'Technical: remove data and update donated equipment' },
                  {value: 'Transport', label: 'Transport: collecting and delivering devices'},
                  {value: 'Donations', label: 'Donations: Co-ordinating donations and assigning them to the technical team'},
                  {value: 'Distribution', label: 'Distribution: respond to and fill requests for devices' },
                  {value: 'Publicity', label: 'Publicity: manage social media and other publicity to maintain a steady flow of donations and volunteers into TechAid'},
                  {value: 'Organizing', label: 'Management: leading and coordinating the work of the various groups and the org as a whole' },
                  {value: 'Other', label: 'Other' }
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
              key: 'expertise',
              type: 'input',
              className: '',
              templateOptions: {
                label: 'How would you like to help',
                required: true
              },
              hideExpression: '(model.subGroup || []).indexOf(\'Other\') == -1',
              validation: {
                show: false,
              },
              expressionProperties: {
                'templateOptions.required': '(model.subGroup || []).indexOf(\'Other\') > -1',
                'validation.show': 'model.showErrorState',
              },
            },
            {
              key: 'organizing',
              type: 'radio',
              className: '',
              templateOptions: {
                label: 'Would you like to be involved with the organisation of Lambeth TechAid?',
                options: [
                  {label: 'Yes', value: 'yes' },
                  {label: 'No', value: 'no' }
                ],
                required: true
              },
              hideExpression: '(model.subGroup || []).indexOf(\'Organizing\') > -1',
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
          className: 'col-md-6',
          fieldGroup: [
            {
              type: 'place',
              className: '',
              key: 'postCode',
              templateOptions: {
                label: 'Address',
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
              className: 'col-md-6',
              fieldGroupClassName: 'row',
              fieldGroup: [
                {
                  key: 'transport',
                  type: 'radio',
                  className: 'col-md-6',
                  defaultValue: 'none',
                  templateOptions: {
                    label: 'Do you have use of a car or bike?',
                    description: 'Mode of travel',
                    options: [
                      {label: 'Car', value: 'car' },
                      {label: 'Bike', value: 'bike' },
                      {label: 'Neither', value: 'none' }
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
                  key: 'storage',
                  type: 'radio',
                  className: 'col-md-6',
                  defaultValue: 'no',
                  templateOptions: {
                    label: 'Are you able to store equipment?',
                    description: 'This is for devices that have been picked up from donors',
                    options: [
                      {label: 'No', value: 'no' },
                      {label: 'Limited storage possible', value: 'limited' },
                      {label: 'Yes', value: 'yes' }
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
          ]
        }
      ]
    },
    {
      fieldGroupClassName: 'row',
      hideExpression: '(model.subGroup || []).indexOf(\'Technical\') == -1',
      fieldGroup: [
        {
          className: 'col-md-6',
          fieldGroup: [
            {
              key: 'attributes.accepts',
              type: 'multicheckbox',
              className: '',
              defaultValue: [],
              templateOptions: {
                type: 'array',
                label: 'As a Tech volunteer, what sort of devices are you willing to take?',
                description: 'Please select all the devices that you are happy to help with',
                multiple: true,
                options: [
                  {value: 'APPLE_PHONES', label: 'Apple iPhones'},
                  {value: 'ANDROID_PHONES', label: 'Android Phones'},
                  {value: 'IOS_TABLETS', label: 'iPads' },
                  {value: 'ANDROID_TABLETS', label: 'Android Tablets' },
                  {value: 'OTHER_TABLETS', label: 'All Other Tablets ( Windows )' },
                  {value: 'WINDOWS_LAPTOPS', label: 'Windows Laptops' },
                  {value: 'WINDOWS_ALLINONES', label: 'Windows All In Ones' },
                  {value: 'WINDOWS_DESKTOPS', label: 'Windows Desktops' },
                  {value: 'LINUX_LAPTOPS', label: 'Capable of Installing Linux on Old Windows Computers' },
                  {value: 'APPLE_LAPTOPS', label: 'Apple Macbooks' },
                  {value: 'APPLE_ALLINONES', label: 'Apple iMacs (All In One)' },
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
              key: 'attributes.dropOffAvailability',
              type: 'input',
              className: '',
              defaultValue: '',
              templateOptions: {
                label: 'Device Dropoff Availability',
                placeholder: '',
                description: 'Please specify what times you are usually available to have devices dropped off at your address',
                required: true
              },
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
          className: 'col-md-6',
          hideExpression: '!model.attributes.accepts.length',
          fieldGroup: [
            {
              key: 'attributes.hasCapacity',
              type: 'radio',
              className: '',
              templateOptions: {
                label: 'Do you currently have capacity to take on new devices?',
                options: [
                  {label: 'Yes', value: true },
                  {label: 'No', value: false },
                ],
                required: true,
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
              hideExpression: '!model.attributes.hasCapacity',
              fieldGroup: [
                {
                  className: 'col-12',
                  template: `
                    <p>How many of the following items can you currently take?</p>
                  `
                },
                {
                  key: 'attributes.capacity.laptops',
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
                  key: 'attributes.capacity.phones',
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
                  key: 'attributes.capacity.tablets',
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
                  key: 'attributes.capacity.allInOnes',
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
                  key: 'attributes.capacity.desktops',
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
              ]
            }
          ]
        }
      ]
    },
    {
      key: 'availability',
      type: 'input',
      className: 'col-md-12',
      defaultValue: '',
      templateOptions: {
        label: 'Availability',
        placeholder: '',
        description: 'Please provide your general availability for attending mettings',
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
      key: 'consent',
      type: 'radio',
      className: 'col-md-12',
      templateOptions: {
        label: 'Data Protection',
        options: [
          {label: 'I consent to my data being processed by Lambeth TechAid', value: 'yes' },
          // {label: "I do not consent to my data being processed by Lambeth TechAid", value: "no" },
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

  @Input()
  tableId = 'volunteers-index';
  @Input()
  pageLength = 10;

  applyFilter(data) {
    const filter = {AND: []};
    let count = 0;
    if (data.subGroup && data.subGroup.length) {
      count += data.subGroup.length;
      const filt = {OR: []};
      data.subGroup.forEach(g => {
          filt['OR'].push({'subGroup': {'_contains': g}});
      });
      filter['AND'].push(filt);
    }

    if (data.storage && data.storage.length) {
      count = count + data.storage.length;
      filter['storage'] = {'_in': data.storage };
    }

    if (data.transport && data.transport.length) {
      count = count + data.transport.length;
      filter['transport'] = {'_in': data.transport };
    }
    const attributes = {filters: []};
    if (data.accepts && data.accepts.length) {
      count += data.accepts.length;
      attributes.filters.push({key: 'accepts', _in: data.accepts});
    }

    if (data.hasCapacity && data.hasCapacity.length) {
      count += data.hasCapacity.length;
      attributes['hasCapacity'] = {_in: data.hasCapacity};
    }

    filter['attributes'] = attributes;
    this.filter = filter;
    this.filterCount = count;
    this.filterModel = data;
    localStorage.setItem(`volunteerFilters-${this.tableId}`, JSON.stringify(data));
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


    this.sub = this.search$.subscribe(query => {
      if (this.table) {
        this.table.search(query);
        this.table.ajax.reload(null, false);
      }
    });

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


        queryRef.refetch(vars).then(res => {
          let data: any = {};
          if (res.data) {
            data = res['data']['volunteersConnection'];
            if (!this.total) {
              this.total = data['totalElements'];
            }
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
        { data: null, width: '15px', orderable: false },
        { data: 'name' },
        { data: 'kitCount'},
        { data: 'createdAt' },
        { data: 'updatedAt' },
        { data: 'storage'},
        { data: 'transport'}
      ]
    };
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
        this.filterModel = JSON.parse(localStorage.getItem(`volunteerFilters-${this.tableId}`));
        this.applyFilter(this.filterModel);
        this.filterForm.patchValue(this.filterModel);
      } catch (_) {
      }
    });
  }

  createEntity(data: any) {
    if (this.form.invalid) {
      return false;
    }
    data.subGroup = (data.subGroup || []);
    if (data.organizing) {
      if (data.organizing == 'yes') {
        data.subGroup.push('Organizing');
      }
    }
    data.subGroup = (data.subGroup || []).join(',');
    delete data.organizing;

    this.apollo.mutate({
      mutation: CREATE_ENTITY,
      context: {
        authenticated: false
      },
      variables: { data }
    }).subscribe(data => {
      this.total = null;
      this.table.ajax.reload(null, false);
    }, err => {
      this.toastr.error(`
      <small>${err.message}</small>
      `, 'Create Volunteer Error', {
          enableHtml: true,
          timeOut: 15000
        });
    });

    return true;
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
