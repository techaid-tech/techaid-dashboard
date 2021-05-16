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
query findRoles($page: PaginationInput, $userId: ID!) {
  user(id: $userId) {
    id: userId
    roles(page:$page){
      totalElements: total
      number: start
      content: items {
        id
        name
        description
      }
    }
  }
}
`;

const CREATE_ROLES = gql`
mutation assignRoles($roleId: ID!, $userIds: [ID!]!) {
  assignRoles(roleId: $roleId, userIds: $userIds){
    id
  }
}
`;

const DELETE_ROLES = gql`
mutation removeRoles($userId: ID!, $roleIds: [ID!]!) {
  removeRoles(userId: $userId, roleIds: $roleIds){
     id: userId
  }
}
`;

const AUTOCOMPLETE_ROLES = gql`
query findAutocompleteRoles($term: String, $term: String) {
  roles(page: {
    size: 50
  }, filter: $term){
    content : items {
     id
     name
     description
    }
  }
}
`;

@Component({
  selector: 'user-roles',
  styleUrls: ['user-roles.scss'],

  templateUrl: './user-roles.html'
})
export class UserRolesComponent {
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
    key: 'roleId',
    type: 'choice',
    className: 'col-md-12',
    templateOptions: {
      label: '',
      loading: this.apiLoading,
      typeahead: this.apiInput$,
      placeholder: 'Select a Role',
      multiple: false,
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

  private _userId: number;
  @Input()
  set userId(str: number) {
    this._userId = str;
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
    const queryRef = this.apollo
      .watchQuery({
        query: QUERY_PERMISSIONS,
        variables: {}
      });

    const apiRef = this.apollo
      .watchQuery({
        query: AUTOCOMPLETE_ROLES,
        variables: {
        }
      });

    this.sub = this.search$.subscribe(query => {
      if (this.table) {
        this.table.search(query);
        this.table.ajax.reload(null, false);
      }
    });

    this.apis$ = concat(
      of([]),
      this.apiInput$.pipe(
        debounceTime(200),
        distinctUntilChanged(),
        tap(() => this.apiLoading = true),
        switchMap(term => from(apiRef.refetch({
          term: term,
          userId: this._userId,
        })).pipe(
          catchError(() => of([])),
          tap(() => this.apiLoading = false),
          switchMap(res => {
            const data = res['data']['roles']['content'].map(v => {
              return {
                label: `${v.name} (${v.description})`, value: v.id
              };
            });
            return of(data);
          })
        ))
      )
    );

    this.sub = this.apis$.subscribe(data => {
      this.appField.templateOptions['items'] = data;
    });


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
      processing: true,
      stateSave: true,
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
          if (res.data) {
            data = res['data']['user']['roles'];
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
        { data: 'name' },
        { data: 'description' },
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
      mutation: CREATE_ROLES,
      variables: {
        userIds: [this._userId],
        roleId: data['roleId']
      }
    }).subscribe(data => {
      this.model = {};
      this.form.setValue({
        roleId: null,
      });
      this.form.markAsUntouched();
      this.form.markAsPristine();
      if (this.table) {
        this.table.ajax.reload(null, false);
      }
    }, err => {
      this.toastr.error(`
      <small>${err.message}</small>
      `, 'Assign Role Error', {
          enableHtml: true,
          timeOut: 15000
        });
    });
  }

  deleteRole(role: any) {
    this.apollo.mutate({
      mutation: DELETE_ROLES,
      variables: {
        userId: this._userId,
        roleIds: [role.id]
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
