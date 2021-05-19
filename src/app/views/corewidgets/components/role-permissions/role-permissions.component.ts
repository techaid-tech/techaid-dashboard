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
query findPermissions($page: PaginationInput, $roleId: ID!) {
  role(id: $roleId) {
    id
    name
    permissions(page: $page){
      totalElements: total
      number: start
      content: items {
        resourceServerId
        resourceServerName
        name
        description
      }
    }
  }
}
`;

const AUTOCOMPLETE_PERMISSIONS = gql`
query findAutocompletePermissions($appId: ID!, $roleId: Int) {
  permissions(appId: $appId, where: {
    NOT: {
      role: {
        id: {
          _eq: $roleId
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
  selector: 'role-permissions',
  styleUrls: ['role-permissions.scss'],

  templateUrl: './role-permissions.html'
})
export class RolePermissionsComponent {
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

    this.dtOptions = {
      pagingType: 'full_numbers',
      dom:
        '<\'row\'<\'col-sm-12 col-md-6\'l><\'col-sm-12 col-md-6\'f>>' +
        '<\'row\'<\'col-sm-12\'tr>>' +
        '<\'row\'<\'col-sm-12 col-md-5\'i><\'col-sm-12 col-md-7\'p>>',
      pageLength: 10,
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
          roleId: this._roleId,
          term: params['search']['value']
        };

        queryRef.refetch(vars).then(res => {
          let data: any = {};
          if (res && res.data) {
            data = res['data']['role']['permissions'];
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
      ]
    };
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
      roleId: this._roleId
    }).then(res => {
      const data = res['data']['permissions'].map(v => {
        return {
          label: `${v.name}`, value: {
            name: v.name,
            description: v.description
          }
        };
      });
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
