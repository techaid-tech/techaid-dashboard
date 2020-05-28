import { Component, ViewChild, ViewEncapsulation, Input } from '@angular/core';
import { concat, Subject, of, forkJoin, Observable, Subscription, from } from 'rxjs';
import { AppGridDirective } from "@app/shared/modules/grid/app-grid.directive";
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
query findAllKits($page: PaginationInput,$term: String, $where: KitWhereInput!, $filter: KitWhereInput!) {
  kitsConnection(page: $page, where: {
    AND: {
      model: {
        _contains: $term
      }
      AND: [ $where, $filter ]
      OR: [
        {
          location: {
            _contains: $term
          }
          AND: [ $where, $filter ]
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
  selector: 'kit-component',
  styleUrls: ['kit-component.scss'],
 
  templateUrl: './kit-component.html'
})
export class KitComponent {
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
     0: "I don't know",
     1: "Less than a year",
     2: "1 - 2 years",
     4: '3 - 4 years',
     5: '5 - 6 years',
     6: 'more than 6 years old'
  };

  classes = {
    'LOGISTICS': 'dark',
    'TECHNICIAN': 'info',
    'ORGANISER': 'success'
  };

  statusTypes : any = KIT_STATUS;

  users$: Observable<any>;
  userInput$ = new Subject<string>();
  usersLoading = false;
  userField: FormlyFieldConfig = {
    key: "userIds",
    type: "choice",
    className: "col-md-12",
    templateOptions: {
      label: "Assigned Volunteer",
      description: "Filter by assigned user.",
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
    key: "orgIds",
    type: "choice",
    className: "col-md-12",
    templateOptions: {
      label: "Assigned Organisation",
      description: "Filter by assigned organisation.",
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
  filterModel: any = {};
  filterForm: FormGroup = new FormGroup({});
  filterFields: Array<FormlyFieldConfig> = [
    {
      fieldGroupClassName: "row",
      fieldGroup: [
        {
          key: "type",
          type: "multicheckbox",
          className: "col-sm-4",
          defaultValue: [],
          templateOptions: {
            label: "Type of device",
            type: "array",
            options: [
              {label: "Laptop", value: "LAPTOP" },
              {label: "Tablet", value: "TABLET" },
              {label: "Smart Phone", value: "SMARTPHONE" },
              {label: "All In One (PC)", value: "ALLINONE" },
              {label: "Other", value: "OTHER" }
            ],
          } 
        },
        {
          key: "age",
          type: "multicheckbox",
          className: "col-sm-4",
          templateOptions: {
            label: "Roughly how old is your device?",
            type: 'array',
            options: [
              {label: "Less than a year", value: 1},
              {label: "1 - 2 years", value: 2},
              {label: "3 - 4 years", value: 4 },
              {label: "5 - 6 years", value: 5},
              {label: "More than 6 years old", value: 6 },
              {label: "I don't know!", value: 0 }
            ],
            required: false
          } 
        },
        {
          key: "archived",
          type: "multicheckbox",
          className: "col-sm-4",
          defaultValue: [false],
          templateOptions: {
            type: 'array',
            label: "Filter by Archived?",
            options: [
              {label: "Active Devices", value: false },
              {label: "Archived Devices", value: true },
            ],
            required: false,
          }
        }, 
        {
          key: "status",
          type: "choice",
          className: "col-md-12",
          templateOptions: {
            label: "Status of the device",
            items: [
              {label: "New - Donation Registered", value: "NEW" },
              {label: "Declined - Not Suitable", value: "DECLINED" },
              {label: "Accepted - Assesment Needed", value: "ASSESSMENT_NEEDED" },
              {label: "Accepted - No Assesment Required", value: "ACCEPTED" },
              {label: "Collection from donor scheduled", value: "PICKUP_SCHEDULED" },
              {label: "Donor drop off agreed", value: "DROPOFF_AGGREED" },
              {label: "Donation received by Tech Team", value: "WITH_TECHIE" },
              {label: "Donation faulty - collect for recycling", value: "UPDATE_FAILED" },
              {label: "Donation updated - arrange collection", value: "READY" },
              {label: "Device allocated to referring organisation", value: "ALLOCATED" },
              {label: "Collection / drop off to referring organisation agreed", value: "DELIVERY_ARRANGED" },
              {label: "Device received by organisation", value: "DELIVERED" }
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

  applyFilter(data){
    var filter = {};
    var count = 0;

    if(data.type && data.type.length) {
      count = count + data.type.length;
      filter["type"] = {"_in": data.type };
    }

    if(data.status && data.status.length) {
      count = count + data.status.length;
      filter["status"] = {"_in": data.status };
    }

    if(data.age && data.age.length) {
      count = count + data.age.length;
      filter["age"] = {"_in": data.age };
    }

    if(data.archived && data.archived.length){
      count += data.archived.length;
      filter["archived"] = {_in: data.archived}
    }

    if(data.userIds && data.userIds.length){
      count += data.userIds.length;
      filter["volunteer"] = {id: {_in: data.userIds}};
    }

    if(data.orgIds && data.orgIds.length){
      count += data.orgIds.length;
      filter["organisation"] = {id: {_in: data.orgIds}};
    }

    localStorage.setItem(`kitFilters-${this.tableId}`, JSON.stringify(data));
    this.filter = filter;
    this.filterCount = count;
    this.filterModel = data;
    this.table.ajax.reload(null, false);
  }

  @Select(CoreWidgetState.query) search$: Observable<string>;

  constructor(
    private modalService: NgbModal,
    private toastr: ToastrService,
    private apollo: Apollo
  ) {

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
      let code = (evt.keyCode ? evt.keyCode : evt.which);
      if (code !== 13) {
        return;
      }
    }

    this.table.search(filter);
    this.table.ajax.reload(null, false);
  }

  @Input()
  pageLength = 5;

  @Input()
  tableId = "kit-component";

  @Input()
  title = "Devices";

  _where = {};
  @Input()
  set where(where: any){
    this._where = where;
    if(this.table){
      this.applyFilter(this.filterModel); 
    }
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
              }
            });
            return of(data)
          })
        ))
      )
    );

    this.sub.add(this.users$.subscribe(data => {
      this.userField.templateOptions['items'] = data;
    }));

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
              }
            });
            return of(data)
          })
        ))
      )
    );

    this.sub.add(this.orgs$.subscribe(data => {
      this.orgField.templateOptions['items'] = data;
    }));

    this.dtOptions = {
      pagingType: 'simple_numbers',
      dom:
        "<'row'<'col-sm-12 col-md-6'l><'col-sm-12 col-md-6'f>>" +
        "<'row'<'col-sm-12'tr>>" +
        "<'row'<'col-sm-12 col-md-5'i><'col-sm-12 col-md-7'p>>",
      pageLength: this.pageLength,
      lengthMenu: [ 5, 10, 25, 50, 100 ],
      order: [1, 'desc'],
      serverSide: true,
      stateSave: true,
      processing: true,
      searching: true,
      stateDuration: -1,
      ajax: (params: any, callback) => {
        let sort = params.order.map(o => {
          return {
            key: this.dtOptions.columns[o.column].data,
            value: o.dir
          }
        });

        const vars = {
          page: {
            sort: sort,
            size: params.length,
            page: 0,
          },
          where: this.filter,
          filter: this._where || {},
          term: params['search']['value']
        }

        if (this.table) {
          vars.page.page = Math.min(
            Math.max(0, Math.round(params.start / this.table.page.len())),
            this.table.page.info().pages
          )
        }

        queryRef.refetch(vars).then(res => {
          var data: any = {};
          if (res.data) {
            data = res['data']['kitsConnection'];
            if (!this.total) {
              this.total = data['totalElements']
            }
            data.content.forEach(d => {
              if(d.donor){
                d.donorName = this.userName(d.donor);
              }
              if(d.volunteer){
                d.volunteerName = this.userName(d.volunteer);
              }
            });
            this.entities = data.content;
          }

          callback({
            draw: params.draw,
            recordsTotal: this.total,
            recordsFiltered: data['totalElements'],
            error: "",
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
            })
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
    return `${data.name || ''}||${data.email ||''}||${data.phoneNumber||''}`.split('||').filter(f => f.trim().length)[0];
  }

  volunteerName(data) {
    return `${data.name || ''}||${data.email ||''}||${data.phoneNumber||''}`.split('||').filter(f => f.trim().length).join(" / ").trim();
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
        this.filterModel = JSON.parse(localStorage.getItem(`kitFilters-${this.tableId}`)) || {};
        if(this.filterModel && (this.filterModel.userIds || this.filterModel.orgIds)){
          this.apollo.query({
            query: FIND_USERS,
            variables: {
              volunteerIds: this.filterModel.userIds || [],
              orgIds: this.filterModel.orgIds || []
            }
          }).toPromise().then(res => {
            if(res.data){
              if(res.data['volunteers']){
                this.userField.templateOptions['items'] = res.data['volunteers'].map(v => {
                  return {label: this.volunteerName(v), value: v.id }
                });
              }
              if(res.data['organisations']){
                this.orgField.templateOptions['items'] = res.data['organisations'].map(v => {
                  return {label: this.volunteerName(v), value: v.id }
                });
              }
            }
           
          });
        }
      }catch(_){
        this.filterModel = {};
      }

      try {
        this.applyFilter(this.filterModel);
        this.filterForm.patchValue(this.filterModel);
      }catch(_){
      }
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
    for (let k in this.selections) {
      this.selected.push(this.selections[k]);
    }
  }
}
