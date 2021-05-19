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
import { CoreWidgetState } from '@views/corewidgets/state/corewidgets.state';

const QUERY_USERS = gql`
query findAllUsers($page: PaginationInput, $roleId: ID!) {
  role(id: $roleId){
    id
    users(page: $page){
      totalElements: total
      number: start
      content: items {
        id: userId
        name
        email
        userId
        phoneNumber
        picture
      }
    }
  }
}
`;

const CREATE_USER_ROLES = gql`
mutation assignRoles($roleId: ID!, $userIds: [ID!]!) {
  assignRoles(roleId: $roleId, userIds: $userIds){
    id
  }
}
`;

const DELETE_USER = gql`
mutation removeRoles($userId: ID!, $roleIds: [ID!]!) {
  removeRoles(userId: $userId, roleIds: $roleIds){
     id: userId
  }
}
`;

const QUERY_USER_ROLES = gql`
query typeaheadFindAllUsers($page: PaginationInput!, $term: String) {
  users(page: $page, filter: $term ){
    totalElements: total
    number: start
    content: items {
     name
     email
     phoneNumber
     id: userId
     userId
    }
  }
}
`;

@Component({
  selector: 'role-users',
  styleUrls: ['role-users.scss'],

  templateUrl: './role-users.html'
})
export class RoleUsersComponent {
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

  apis$: Observable<any>;
  apis: any[] = [];
  apiInput$ = new Subject<string>();
  apiLoading = false;
  appField: FormlyFieldConfig = {
    key: 'users',
    type: 'choice',
    className: 'col-md-12',
    templateOptions: {
      label: '',
      loading: this.apiLoading,
      typeahead: this.apiInput$,
      placeholder: 'Select a User',
      multiple: true,
      searchable: true,
      items: this.apis,
      required: true
    },
  };

  fields: Array<FormlyFieldConfig> = [
    this.appField
  ];

  constructor(
    private modalService: NgbModal,
    private toastr: ToastrService,
    private apollo: Apollo
  ) {
  }

  private _roleId = '';
  @Input()
  set roleId(str: string) {
    this._roleId = str;
    if (this.table) {
      this.table.ajax.reload(null, false);
    }
  }

  private _roleName = '';
  @Input()
  set roleName(str: string) {
    this._roleName = str;
    if (this.table) {
      this.table.ajax.reload(null, false);
    }
  }

  modal(content) {
    this.modalService.open(content, {
      size: 'lg',
      centered: false
    });
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
    this.sub = this.search$.subscribe(query => {
      if (this.table) {
        this.table.search(query);
        this.table.ajax.reload(null, false);
      }
    });

    const queryRef = this.apollo
      .watchQuery({
        query: QUERY_USERS,
        variables: {}
      });

    const apiRef = this.apollo
      .watchQuery({
        query: QUERY_USER_ROLES,
        variables: {}
      });

    this.apis$ = concat(
      of([]),
      this.apiInput$.pipe(
        debounceTime(200),
        distinctUntilChanged(),
        tap(() => this.apiLoading = true),
        switchMap(term => from(apiRef.refetch({
          term: term,
          page: {

          }
        })).pipe(
          catchError(() => of([])),
          tap(() => this.apiLoading = false),
          switchMap(res => {
            const data = res['data']['users']['content'].map(v => {
              return { label: `${v.name} (${v.email || v.phoneNumber})`, value: v.id };
            });
            return of(data);
          })
        ))
      )
    );

    this.sub.add(this.apis$.subscribe(data => {
      this.appField.templateOptions['items'] = data;
    }));

    this.dtOptions = {
      pagingType: 'full_numbers',
      dom:
        '<\'row\'<\'col-sm-12 col-md-6\'l><\'col-sm-12 col-md-6\'f>>' +
        '<\'row\'<\'col-sm-12\'tr>>' +
        '<\'row\'<\'col-sm-12 col-md-5\'i><\'col-sm-12 col-md-7\'p>>',
      pageLength: 5,
      lengthMenu: [ 5, 10, 25, 50, 100 ],
      order: [0, 'desc'],
      serverSide: true,
      stateSave: true,
      processing: true,
      searching: true,
      ajax: (params: any, callback) => {
        const sort = params.order.map(o => {
          return {
            key: this.dtOptions.columns[o.column].data,
            value: (o.dir == 'asc') ? 1 : -1
          };
        });

        const vars = {
          page: {
            sort: sort,
            size: params.length,
            page: Math.round(params.start / params.length),
          },
          roleId: this._roleId,
          term: params['search']['value']
        };

        queryRef.refetch(vars).then(res => {
          let data: any = {};
          if (res && res.data) {
            data = res['data']['role']['users'];
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
        { data: 'name', orderable: false },
        { data: null, width: '15px', orderable: false }
      ]
    };
  }

  ngOnDestroy() {
    if (this.sub) {
      this.sub.unsubscribe();
    }
  }

  ngAfterViewInit() {
    this.grid.dtInstance.then(tbl => {
      this.table = tbl;
    });
  }

  assignRoles(data: any) {
    this.apollo.mutate({
      mutation: CREATE_USER_ROLES,
      variables: {
        roleId: this._roleId,
        userIds: data.users
      }
    }).subscribe(data => {
      this.model = {};
      if (this.table) {
        this.table.ajax.reload(null, false);
      }
    }, err => {
      this.toastr.error(`
      <small>${err.message}</small>
      `, 'Assign User Roles Error', {
          enableHtml: true,
          timeOut: 15000
        });
    });
  }

  deleteUser(user: any) {
    this.apollo.mutate({
      mutation: DELETE_USER,
      variables: {
        userId: user.userId,
        roleIds: [this._roleId]
      }
    }).subscribe(res => {
      this.table.ajax.reload(null, false);
    }, err => {
      this.toastr.error(`
      <small>${err.message}</small>
      `, 'Error Deleting Role', {
          enableHtml: true
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
