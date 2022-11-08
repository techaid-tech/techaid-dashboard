import { Component, ViewChild, ViewEncapsulation, Input } from '@angular/core';
import { Observable, Subscription, from, Subject, concat, of } from 'rxjs';
import { AppGridDirective } from '@app/shared/modules/grid/app-grid.directive';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import gql from 'graphql-tag';
import { Apollo } from 'apollo-angular';
import { FormGroup } from '@angular/forms';
import { FormlyFieldConfig } from '@ngx-formly/core';
import { Select } from '@ngxs/store';
import { CoreWidgetState } from '@views/corewidgets/state/corewidgets.state';
import { debounceTime, distinctUntilChanged, tap, switchMap, catchError } from 'rxjs/operators';
import { CsvService } from "@app/shared/services/csv.service";

const QUERY_ENTITY = gql`
query findAllOrgs($page: PaginationInput,, $term: String, $filter: OrganisationWhereInput!) {
  organisationsConnection(page: $page, where: {
    AND: {
      OR: [
        {
          phoneNumber: {
            _contains: $term
          }
          AND: [$filter]
        },
        {
          name: {
            _contains: $term
          }
          AND: [$filter]
        },
        {
          contact: {
            _contains: $term
          }
          AND: [$filter]
        },
        {
          email: {
            _contains: $term
          }
          AND: [$filter]
        },
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
          AND: [$filter]
        }
      ]
    }
  }){
    totalElements
    content{
     id
     phoneNumber
     contact
     name
     email
     address
     createdAt
     updatedAt
     kitCount
     kits {
        type
     }
     volunteer {
       id
       name
       email
     }
     attributes {
        notes
        details
        needs
        accepts
        request {
          LAPTOPS: laptops
          TABLETS: tablets
          ALLINONES:allInOnes
          DESKTOPS:desktops
          PHONES: phones
          COMMSDEVICES: commsDevices
        }
        alternateAccepts
        alternateRequest {
          LAPTOPS: laptops
          TABLETS: tablets
          ALLINONES:allInOnes
          DESKTOPS:desktops
          PHONES: phones
          COMMSDEVICES: commsDevices
        }
     }
    }
  }
}
`;

const CREATE_ENTITY = gql`
mutation createOrganisation($data: CreateOrganisationInput!) {
  createOrganisation(data: $data){
     id
  }
}
`;

const FIND_USERS = gql`
query findAutocompleteVolunteers($userIds: [Long!]) {
  volunteers(where: {
    id: {
      _in: $userIds
    }
  }){
     id
     name
     email
     phoneNumber
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


@Component({
  selector: 'org-index',
  styleUrls: ['org-index.scss'],

  templateUrl: './org-index.html'
})
export class OrgIndexComponent {

  constructor(
    private modalService: NgbModal,
    private toastr: ToastrService,
    private apollo: Apollo,
    private csvService: CsvService
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

  @Select(CoreWidgetState.query) search$: Observable<string>;

  fields: Array<FormlyFieldConfig> = [
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
            pattern: /\+?[0-9]+/,
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
          },
          expressionProperties: {
            'templateOptions.required': '!model.address.length'
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
          {value: 'COMMSDEVICES', label: 'Connectivity Devices' }
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
          key: 'attributes.request.commsDevices',
          type: 'input',
          className: 'col-6',
          hideExpression: 'model.attributes.accepts.toString().indexOf(\'COMMSDEVICE\') < 0',
          defaultValue: 0,
          templateOptions: {
            min: 0,
            label: 'Connectivity Devices',
            addonLeft: {
              class: 'fas fa-desktop'
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
          {value: 'COMMSDEVICES', label: 'Connectivity Devices' }
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
            {value: 'COMMSDEVICES', label: 'Connectivity Devices' }
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
          key: 'attributes.alternateRequest.commsDevices',
          type: 'input',
          className: 'col-6',
          hideExpression: 'model.attributes.accepts.toString().indexOf(\'COMMSDEVICE\') > -1 || model.attributes.alternateAccepts.toString().indexOf(\'COMMSDEVICE\') < 0',
          defaultValue: 0,
          templateOptions: {
            min: 0,
            label: 'Connectivity Devices',
            addonLeft: {
              class: 'fas fa-desktop'
            },
            type: 'number',
            placeholder: '',
            required: true
          }
        },
      ]
    },
  ];


  owner$: Observable<any>;
  ownerInput$ = new Subject<string>();
  ownerLoading = false;
  ownerField: FormlyFieldConfig = {
    key: 'userIds',
    type: 'choice',
    className: 'col-md-12',
    templateOptions: {
      label: 'Organising Volunteer',
      description: 'The organising volunteer this organisation is currently assigned to.',
      loading: this.ownerLoading,
      typeahead: this.ownerInput$,
      placeholder: 'Assign device to Organiser Volunteers',
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
          key: 'accepts',
          type: 'multicheckbox',
          className: 'col-sm-4',
          defaultValue: [],
          templateOptions: {
            label: 'Accepts',
            type: 'array',
            options: [
              {label: 'Laptop', value: 'LAPTOPS' },
              {label: 'Tablet', value: 'TABLETS' },
              {label: 'Smart Phone', value: 'PHONES' },
              {label: 'All In One (PC)', value: 'ALLINONES' },
              {label: 'Desktop', value: 'DESKTOPS' },
              {label: 'Connectivity Device', value: 'COMMSDEVICES' }
            ]
          }
        },
        {
          key: 'needs',
          type: 'multicheckbox',
          className: 'col-sm-4',
          defaultValue: [],
          templateOptions: {
            label: 'Client needs',
            type: 'array',
            options: [
              {value: 'internet', label: 'Has no home internet'},
              {value: 'mobility' , label: 'Mobility issues'},
              {value: 'training', label: 'Training needs'}
            ]
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
              {label: 'Active Requests', value: false },
              {label: 'Archived Requests', value: true },
            ],
            required: false,
          }
        },
        this.ownerField
      ]
    }
  ];

  @Input()
  tableId = 'org-index';

  applyFilter(data) {
    const filter = {'OR': [], 'AND': []};
    let count = 0;

    if (data.accepts && data.accepts.length) {
      count = count + data.accepts.length;
      const filt = {
        attributes: {
          filters: [
            {
              key: 'accepts',
              _in: data.accepts
            }
          ]
        }
      };
      filter['AND'].push(filt);
    }
    
    if (data.needs && data.needs.length) {
      count = count + data.needs.length;
      const filt = {
        attributes: {
          filters: [
            {
              key: 'needs',
              _in: data.needs
            }
          ]
        }
      };
      filter['AND'].push(filt);
    }

    if (data.alternateAccepts && data.alternateAccepts.length) {
      count = count + data.alternateAccepts.length;
      const filt = {
        attributes: {
          filters: [
            {
              key: 'alternateAccepts',
              _in: data.alternateAccepts
            }
          ]
        }
      };
      filter['AND'].push(filt);
    }

    if (data.archived && data.archived.length) {
      count += data.archived.length;
      filter['archived'] = {_in: data.archived};
    }

    if (data.userIds && data.userIds.length) {
      count += data.userIds.length;
      filter['volunteer'] = {id: {_in: data.userIds}};
    }

    localStorage.setItem(`orgFilters-${this.tableId}`, JSON.stringify(data));
    this.filter = filter;
    this.filterCount = count;
    this.filterModel = data;
    this.table.ajax.reload(null, false);
    console.log(this.filter)
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

    this.sub = this.search$.subscribe(query => {
      if (this.table) {
        this.table.search(query);
        this.table.ajax.reload(null, false);
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
          ids: this.filterModel.userIds || []
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

    this.sub.add(this.owner$.subscribe(data => {
      this.ownerField.templateOptions['items'] = data;
    }));

    this.dtOptions = {
      pagingType: 'simple_numbers',
      dom:
        '<\'row\'<\'col-sm-12 col-md-6\'l><\'col-sm-12 col-md-6\'f>>' +
        '<\'row\'<\'col-sm-12\'tr>>' +
        '<\'row\'<\'col-sm-12 col-md-5\'i><\'col-sm-12 col-md-7\'p>>',
      pageLength: 10,
      lengthMenu: [ 5, 10, 25, 50, 100 ],
      order: [7, 'desc'],
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
          term: params['search']['value'],
          filter: this.filter
        };

        queryRef.refetch(vars).then(res => {
          let data: any = {};
          if (res.data) {
            data = res['data']['organisationsConnection'];
            if (!this.total) {
              this.total = data['totalElements'];
            }
            data.content.forEach(d => {
              d.types = {};
              if (d.kits && d.kits.length) {
                d.kits.forEach(k => {
                  const t = `${k.type}S`;
                  d.types[t] = d.types[t] || 0;
                  d.types[t]++;
                });
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
        { data: null, width: '15px', orderable: false },
        { data: 'name' },
        {data: 'needs'},
        { data: 'kitCount'},
        { data: 'contact' },
        { data: 'email' },
        { data: 'phoneNumber'},
        { data: 'createdAt'},
        { data: 'updatedAt' },
      ]
    };
  }

  volunteerName(data) {
    return `${data.name || ''}||${data.email || ''}||${data.phoneNumber || ''}`.split('||').filter(f => f.trim().length).join(' / ').trim();
  }

  ngOnDestroy() {
    if (this.sub) {
      this.sub.unsubscribe();
    }
  }

  ngAfterViewInit() {
    this.grid.dtInstance.then(tbl => {
      this.table = tbl;
      try {
        this.filterModel = JSON.parse(localStorage.getItem(`orgFilters-${this.tableId}`)) || {archived: [false]};
        if (this.filterModel && (this.filterModel.userIds) ) {
          this.apollo.query({
            query: FIND_USERS,
            variables: {
              userIds: this.filterModel.userIds || [],
            }
          }).toPromise().then(res => {
            if (res.data) {
              if (res.data['volunteers']) {
                this.ownerField.templateOptions['items'] = res.data['volunteers'].map(v => {
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
    this.apollo.mutate({
      mutation: CREATE_ENTITY,
      variables: { data }
    }).subscribe(data => {
      this.total = null;
      this.table.ajax.reload(null, false);
    }, err => {
      this.toastr.error(`
      <small>${err.message}</small>
      `, 'Create Organisation Error', {
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

  exportToCsv(): void {
    let csvData = JSON.parse(JSON.stringify(this.entities));
    this.csvService.exportToCsv(csvData, "organisations.csv");
  }
}
