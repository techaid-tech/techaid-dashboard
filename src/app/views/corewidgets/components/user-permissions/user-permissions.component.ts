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

const QUERY_PERMISSIONS = gql`
query findPermissions($userId: ID!, $page: PaginationInput) {
  user(id: $userId) {
    id: userId
    permissions(page:$page){
      totalElements: total
      number: start
      content: items {
        resourceServerId
        resourceServerName
        name
        description
      }
    }
    roles {
      content: items {
        name
        permissions {
          items {
            name
          }
        }
      }
    }
  }
}
`;

const CREATE_PERMISSION = gql`
mutation assignPermissions($data: AddUserPermissionsInput!) {
  addUserPermissions(data: $data){
    added {
      name
    }
  }
}
`;

const DELETE_PERMISSION = gql`
mutation removeRolePermissions($data: AddUserPermissionsInput!) {
  removeUserPermissions(data: $data){
     removed {
       name
     }
  }
}
`;

const QUERY_API = gql`
query typeaheadFindApis($appId: String, $term: String) {
  allApisConnection(page: {
    size: 50
  },
    where: {
      tenant: {
        id: {
          _eq: $appId
        }
      }
      id: {
        _contains: $term
      }
      OR: [{
        name: {
          _contains: $term
        }
      }]
    }
    ){
    content{
     id: identifier
     name
    }
  }
}
`;

const AUTOCOMPLETE_PERMISSIONS = gql`
query findAutocompletePermissions($appId: ID!, $userId: Int) {
  permissions(appId: $appId, where: {
    NOT: {
      user: {
        id: {
          _eq: $userId
        }
      }
      OR: {
        role: {
          user: {
            id: {
              _eq: $userId
            }
          }
        }
      }
    }
  }){
    id
    name
    description
  }
}
`;

@Component({
  selector: 'user-permissions',
  styleUrls: ['user-permissions.scss'],

  templateUrl: './user-permissions.html'
})
export class UserPermissionsComponent {
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
    key: 'appId',
    type: 'choice',
    className: 'col-md-12',
    hooks: {
      onInit: (field) => {
        field.formControl.valueChanges.subscribe(v => {
          this.updatePermissions(v);
        });
      }
    },
    templateOptions: {
      label: '',
      loading: this.apiLoading,
      typeahead: this.apiInput$,
      placeholder: 'Select an API',
      searchable: true,
      items: this.apis,
      required: true
    },
  };

  permissionField: FormlyFieldConfig = {
    key: 'permissions',
    type: 'choice',
    className: 'col-md-12',
    templateOptions: {
      label: 'Select Permissions',
      placeholder: '',
      searchable: true,
      multiple: true,
      items: this.apis,
      required: true
    },
  };


  fields: Array<FormlyFieldConfig> = [
    this.appField,
    this.permissionField
  ];

  constructor(
    private modalService: NgbModal,
    private toastr: ToastrService,
    private apollo: Apollo
  ) {
  }

  private _userId: number;
  @Input()
  set userId(id: number) {
    this._userId = id;
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
        query: QUERY_PERMISSIONS,
        variables: {}
      });

    const apiRef = this.apollo
      .watchQuery({
        query: QUERY_API,
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
        })).pipe(
          catchError(() => of([])),
          tap(() => this.apiLoading = false),
          switchMap(res => {
            const data = res['data']['allApisConnection']['content'].map(v => {
              return { label: `${v.name} (${v.id})`, value: v.id };
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
      pageLength: 10,
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
          userId: this._userId,
          term: params['search']['value']
        };


        queryRef.refetch(vars).then(res => {
          let data: any = {};
          if (res && res.data) {
            data = res['data']['user']['permissions'];
            if (!this.total) {
              this.total = data['totalElements'];
            }
            const roles = {};
            res['data']['user']['roles']['content'].forEach(r => {
              r['permissions']['items'].forEach(p => {
                roles[p.name] = roles[p.name] || [];
                roles[p.name].push(r.name);
              });
            });

            this.entities = data.content.map(row => {
              row.mappedRoles = '';
              row.roles =  roles[row.name] || [];
              row.byRole = roles[row.name] && roles[row.name].length > 0;
              row.mappedRoles = this.trimString((roles[row.name] || []).join(','), 150);
              row.direct = !roles[row.name];
              return row;
            });
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
        { data: 'name' },
        { data: 'description' },
        { data: 'null', orderable: false },
        { data: null, width: '15px', orderable: false }
      ]
    };
  }

  private trimString(str: String, length: number) {
    return str.length > length ? str.substring(0, length) + '...' : str;
  }

  ngOnDestroy() {
    if (this.sub) {
      this.sub.unsubscribe();
    }
  }

  updatePermissions(appId: string) {
    if (!appId) {
      return;
    }

    const apiRef = this.apollo
      .watchQuery({
        query: AUTOCOMPLETE_PERMISSIONS,
        variables: {}
      });

    apiRef.refetch({
      appId: appId,
      userId: this._userId
    }).then(res => {
      const data = res['data']['permissions'].map(v => {
        return {
          label: `${v.name}`, value: {
            name: v.name,
            description: v.description
          }
        };
      });
      this.permissionField.templateOptions['items'] = data;
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

  ngAfterViewInit() {
    this.grid.dtInstance.then(tbl => {
      this.table = tbl;
    });
  }

  assignPermissions(data: any) {
    data.users = [this._userId];
    this.apollo.mutate({
      mutation: CREATE_PERMISSION,
      variables: { data }
    }).subscribe(data => {

      this.model = {};
      if (this.table) {
        this.table.ajax.reload(null, false);
      }
    }, err => {
      this.toastr.error(`
      <small>${err.message}</small>
      `, 'Create Permission Error', {
          enableHtml: true,
          timeOut: 15000
        });
    });
  }

  deletePermission(permission: any) {
    this.apollo.mutate({
      mutation: DELETE_PERMISSION,
      variables: {
        data: {
          appId: permission['apiName'],
          users: [this._userId],
          permission: permission['name'],
          permissions: []
        }
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
