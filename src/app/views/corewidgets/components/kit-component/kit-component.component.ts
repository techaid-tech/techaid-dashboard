import { Component, ViewChild, Input } from '@angular/core';
import {
  concat,
  Subject,
  of,
  Observable,
  Subscription,
  from,
} from 'rxjs';
import { AppGridDirective } from '@app/shared/modules/grid/app-grid.directive';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import gql from 'graphql-tag';
import { Apollo } from 'apollo-angular';
import { FormGroup } from '@angular/forms';
import { FormlyFieldConfig  } from '@ngx-formly/core';
import {
  debounceTime,
  distinctUntilChanged,
  switchMap,
  tap,
  catchError,
} from 'rxjs/operators';
import { Select } from '@ngxs/store';
import 'datatables.net-responsive';
import 'datatables.net-rowreorder';
import { CoreWidgetState } from '@views/corewidgets/state/corewidgets.state';
import { KIT_STATUS } from '../kit-info/kit-info.component';
const QUERY_ENTITY = gql`
  query findAllKits(
    $page: PaginationInput
    $term: String
    $where: KitWhereInput!
    $filter: KitWhereInput!
  ) {
    kitsConnection(
      page: $page
      where: {
        AND: {
          model: { _contains: $term }
          AND: [$where, $filter]
          OR: [{ location: { _contains: $term }, AND: [$where, $filter] }]
        }
      }
    ) {
      totalElements
      number
      content {
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

const AUTOCOMPLETE_ORGS = gql`
  query findAutocompleteOrgs($term: String, $ids: [Long!]) {
    organisationsConnection(
      page: { size: 50 }
      where: {
        name: { _contains: $term }
        OR: [
          { id: { _in: $ids } }
          { phoneNumber: { _contains: $term } }
          { contact: { _contains: $term } }
          { email: { _contains: $term } }
        ]
      }
    ) {
      content {
        id
        name
        email
        phoneNumber
      }
    }
  }
`;

const AUTOCOMPLETE_USERS = gql`
  query findAutocompleteVolunteers($term: String, $ids: [Long!]) {
    volunteersConnection(
      page: { size: 50 }
      where: {
        name: { _contains: $term }
        OR: [
          { id: { _in: $ids } }
          { phoneNumber: { _contains: $term } }
          { email: { _contains: $term } }
        ]
      }
    ) {
      content {
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
    volunteers(where: { id: { _in: $volunteerIds } }) {
      id
      name
      email
      phoneNumber
    }

    organisations(where: { id: { _in: $orgIds } }) {
      id
      name
      email
      phoneNumber
    }
  }
`;

@Component({
  selector: 'kit-component',
  styleUrls: ['kit-component.scss'],

  templateUrl: './kit-component.html',
})
export class KitComponent {

  constructor(
    private modalService: NgbModal,
    private toastr: ToastrService,
    private apollo: Apollo
  ) {}
  @Input()
  set where(where: any) {
    this._where = where;
    if (this.table) {
      this.applyFilter(this.filterModel);
    }
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
    6: 'more than 6 years old',
  };

  classes = {
    LOGISTICS: 'dark',
    TECHNICIAN: 'info',
    ORGANISER: 'success',
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
      required: false,
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
      required: false,
    },
  };

  filter: any = {};
  filterCount = 0;
  filterModel: any = {};
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
              { label: 'Laptop', value: 'LAPTOP' },
              { label: 'Chromebook', value: 'CHROMEBOOK' },
              { label: 'Tablet', value: 'TABLET' },
              { label: 'Smart Phone', value: 'SMARTPHONE' },
              { label: 'All In One (PC)', value: 'ALLINONE' },
              { label: 'Desktop', value: 'DESKTOP' },
              { label: 'Connectivity Device', value: 'COMMSDEVICE' },
              { label: 'Other', value: 'OTHER' }
            ],
          },
        },
        {
          key: 'age',
          type: 'multicheckbox',
          className: 'col-sm-4',
          templateOptions: {
            label: 'Roughly how old is your device?',
            type: 'array',
            options: [
              { label: 'Less than a year', value: 1 },
              { label: '1 - 2 years', value: 2 },
              { label: '3 - 4 years', value: 4 },
              { label: '5 - 6 years', value: 5 },
              { label: 'More than 6 years old', value: 6 },
              { label: 'I don\'t know!', value: 0 },
            ],
            required: false,
          },
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
              { label: 'Active Devices', value: false },
              { label: 'Archived Devices', value: true },
            ],
            required: false,
          },
        },
        {
          key: 'status',
          type: 'choice',
          className: 'col-md-12',
          templateOptions: {
            label: 'Status of the device',
            items: [
              {label: 'New device registered', value: 'DONATION_NEW'},
              {label: 'Device declined', value: 'DONATION_DECLINED'},
              {label: 'Donor contacted', value: 'DONATION_ACCEPTED'},
              {label: 'No response from donor', value: 'DONATION_NO_RESPONSE'},
              {label: 'Device drop off scheduled by donor', value: 'DONATION_ARRANGED'},
              {label: 'Device received into CTA', value: 'PROCESSING_START'},
              {label: 'Device wiped', value: 'PROCESSING_WIPED'},
              {label: 'Device wipe failed', value: 'PROCESSING_FAILED_WIPE'},
              {label: 'OS installed', value: 'PROCESSING_OS_INSTALLED'},
              {label: 'OS installation failed', value: 'PROCESSING_FAILED_INSTALLATION'},
              {label: 'Device needs further investigation', value: 'PROCESSING_WITH_TECHIE'},
              {label: 'Device needs spare part', value: 'PROCESSING_MISSING_PART'},
              {label: 'Device stored', value: 'PROCESSING_STORED'},
              {label: 'Assessment check completed - ready for allocation', value: 'ALLOCATION_READY'},
              {label: 'Quality check completed', value: 'ALLOCATION_QC_COMPLETED'},
              {label: 'Collection/drop off to beneficiary arranged', value: 'ALLOCATION_DELIVERY_ARRANGED'},
              {label: 'Device received by beneficiary', value: 'DISTRIBUTION_DELIVERED'},
              {label: 'Device recycled', value: 'DISTRIBUTION_RECYCLED'},
              {label: 'Device in for repair', value: 'DISTRIBUTION_REPAIR_RETURN'}
            ],
            multiple: true,
            required: false,
          },
        },
        this.userField,
        this.orgField,
      ],
    },
  ];

  @Select(CoreWidgetState.query) search$: Observable<string>;

  @Input()
  pageLength = 5;

  @Input()
  tableId = 'kit-component';

  @Input()
  title = 'Devices';

  _where = {};

  applyFilter(data) {
    const filter = {};
    let count = 0;

    if (data.type && data.type.length) {
      count = count + data.type.length;
      filter['type'] = { _in: data.type };
    }

    if (data.status && data.status.length) {
      count = count + data.status.length;
      filter['status'] = { _in: data.status };
    }

    if (data.age && data.age.length) {
      count = count + data.age.length;
      filter['age'] = { _in: data.age };
    }

    if (data.archived && data.archived.length) {
      count += data.archived.length;
      filter['archived'] = { _in: data.archived };
    }

    if (data.userIds && data.userIds.length) {
      count += data.userIds.length;
      filter['volunteer'] = { id: { _in: data.userIds } };
    }

    if (data.orgIds && data.orgIds.length) {
      count += data.orgIds.length;
      filter['organisation'] = { id: { _in: data.orgIds } };
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
      const code = evt.keyCode ? evt.keyCode : evt.which;
      if (code !== 13) {
        return;
      }
    }

    this.table.search(filter);
    this.table.ajax.reload(null, false);
  }

  ngOnInit() {
    const queryRef = this.apollo.watchQuery({
      query: QUERY_ENTITY,
      variables: {},
    });

    const userRef = this.apollo.watchQuery({
      query: AUTOCOMPLETE_USERS,
      variables: {},
    });

    const orgRef = this.apollo.watchQuery({
      query: AUTOCOMPLETE_ORGS,
      variables: {},
    });

    this.sub = this.search$.subscribe((query) => {
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
        tap(() => (this.usersLoading = true)),
        switchMap((term) =>
          from(
            userRef.refetch({
              term: term,
              ids: this.filterModel.userIds || [],
            })
          ).pipe(
            catchError(() => of([])),
            tap(() => (this.usersLoading = false)),
            switchMap((res) => {
              const data = res['data']['volunteersConnection']['content'].map(
                (v) => {
                  return {
                    label: this.volunteerName(v),
                    value: v.id,
                  };
                }
              );
              return of(data);
            })
          )
        )
      )
    );

    this.sub.add(
      this.users$.subscribe((data) => {
        this.userField.templateOptions['items'] = data;
      })
    );

    this.orgs$ = concat(
      of([]),
      this.orgInput$.pipe(
        debounceTime(200),
        distinctUntilChanged(),
        tap(() => (this.orgLoading = true)),
        switchMap((term) =>
          from(
            orgRef.refetch({
              term: term,
              ids: this.filterModel.orgIds || [],
            })
          ).pipe(
            catchError(() => of([])),
            tap(() => (this.orgLoading = false)),
            switchMap((res) => {
              const data = res['data']['organisationsConnection'][
                'content'
              ].map((v) => {
                return {
                  label: this.organisationName(v),
                  value: v.id,
                };
              });
              return of(data);
            })
          )
        )
      )
    );

    this.sub.add(
      this.orgs$.subscribe((data) => {
        this.orgField.templateOptions['items'] = data;
      })
    );

    this.dtOptions = {
      pagingType: 'simple_numbers',
      dom:
        '<\'row\'<\'col-sm-12 col-md-6\'l><\'col-sm-12 col-md-6\'f>>' +
        '<\'row\'<\'col-sm-12\'tr>>' +
        '<\'row\'<\'col-sm-12 col-md-5\'i><\'col-sm-12 col-md-7\'p>>',
      pageLength: this.pageLength,
      lengthMenu: [5, 10, 25, 50, 100],
      order: [1, 'desc'],
      serverSide: true,
      stateSave: true,
      processing: true,
      searching: true,
      stateDuration: -1,
      ajax: (params: any, callback) => {
        const sort = params.order.map((o) => {
          return {
            key: this.dtOptions.columns[o.column].data,
            value: o.dir,
          };
        });

        const vars = {
          page: {
            sort: sort,
            size: params.length,
            page: Math.round(params.start / params.length),
          },
          where: this.filter,
          filter: this._where || {},
          term: params['search']['value'],
        };

        queryRef.refetch(vars).then(
          (res) => {
            let data: any = {};
            if (res.data) {
              data = res['data']['kitsConnection'];
              if (!this.total) {
                this.total = data['totalElements'];
              }
              data.content.forEach((d) => {
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
              data: [],
            });
          },
          (err) => {
            callback({
              draw: params.draw,
              recordsTotal: this.total || 0,
              recordsFiltered: 0,
              error: err.message,
              data: [],
            });

            this.toastr.warning(
              `
            <small>${err.message}</small>
          `,
              'GraphQL Error',
              {
                enableHtml: true,
                timeOut: 15000,
                disableTimeOut: true,
              }
            );
          }
        );
      },
      columns: [
        { data: null, width: '15px', orderable: false },
        { data: 'model' },
        { data: 'donor' },
        { data: 'volunteers.volunteer.name', orderable: false },
        { data: 'createdAt' },
        { data: 'updatedAt' },
        { data: 'age' },
        { data: 'type' },
        { data: 'status' },
      ],
    };
  }

  userName(data) {
    return `${data.name || ''}||${data.email || ''}||${data.phoneNumber || ''}`
      .split('||')
      .filter((f) => f.trim().length)[0];
  }

  volunteerName(data) {
    return `${data.name || ''}||${data.email || ''}||${data.phoneNumber || ''}`
      .split('||')
      .filter((f) => f.trim().length)
      .join(' / ')
      .trim();
  }

  organisationName(data) {
    return `${data.name || ''}||${data.id || ''}||${data.email || ''}||${data.phoneNumber || ''}`
      .split('||')
      .filter((f) => f.trim().length)
      .join(' / ')
      .trim();
  }

  ngOnDestroy() {
    if (this.sub) {
      this.sub.unsubscribe();
    }
  }

  ngAfterViewInit() {
    this.grid.dtInstance.then((tbl) => {
      this.table = tbl;
      try {
        this.filterModel =
          JSON.parse(localStorage.getItem(`kitFilters-${this.tableId}`)) || {};
        if (
          this.filterModel &&
          (this.filterModel.userIds || this.filterModel.orgIds)
        ) {
          this.apollo
            .query({
              query: FIND_USERS,
              variables: {
                volunteerIds: this.filterModel.userIds || [],
                orgIds: this.filterModel.orgIds || [],
              },
            })
            .toPromise()
            .then((res) => {
              if (res.data) {
                if (res.data['volunteers']) {
                  this.userField.templateOptions['items'] = res.data[
                    'volunteers'
                  ].map((v) => {
                    return { label: this.volunteerName(v), value: v.id };
                  });
                }
                if (res.data['organisations']) {
                  this.orgField.templateOptions['items'] = res.data[
                    'organisations'
                  ].map((v) => {
                    return { label: this.organisationName(v), value: v.id };
                  });
                }
              }
            });
        }
      } catch (_) {
        this.filterModel = {};
      }

      try {
        this.applyFilter(this.filterModel);
        this.filterForm.patchValue(this.filterModel);
      } catch (_) {}
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
