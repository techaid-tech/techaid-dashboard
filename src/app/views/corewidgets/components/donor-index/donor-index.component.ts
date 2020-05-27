import { Component, ViewChild, ViewEncapsulation } from '@angular/core';
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
import * as Tablesaw from 'tablesaw';
import 'datatables.net-responsive';
import 'datatables.net-rowreorder';
import { CoreWidgetState } from '@views/corewidgets/state/corewidgets.state';

const QUERY_ENTITY = gql`
query findAllDonors($page: PaginationInput,, $term: String) {
  donorsConnection(page: $page, where: {
    AND: {
      postCode: {
        _contains: $term
      }
      OR: [
        {
          name: {
            _contains: $term
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
        }
      ]
    }
  }){
    totalElements
    content{
     id
     name
     postCode
     phoneNumber
     email
     createdAt
     updatedAt
    }
  }
}
`;

const CREATE_ENTITY = gql`
mutation createDonor($data: CreateDonorInput!) {
  createDonor(data: $data){
    id
    name
    email 
    phoneNumber
  }
}
`;

@Component({
  selector: 'donor-index',
  styleUrls: ['donor-index.scss'],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './donor-index.html'
})
export class DonorIndexComponent {
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
      key: "name",
      type: "input",
      className: "col-md-12 border-left-info card pt-3 mb-3",
      defaultValue: "",
      templateOptions: {
        label: "Name",
        placeholder: "",
        required: true
      }
    },
    {
      fieldGroupClassName: "row",
      fieldGroup: [
        {
          key: "email",
          type: "input",
          className: "col-md-6",
          defaultValue: "",
          templateOptions: {
            label: "Email",
            type: "email",
            pattern: /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
            placeholder: "",
            required: true
          },
          expressionProperties: {
            'templateOptions.required': 'model.phoneNumber.length == 0',
          },
        },
        {
          key: "phoneNumber",
          type: "input",
          className: "col-md-6",
          defaultValue: "",
          templateOptions: {
            label: "Phone Number",
            pattern: /\+?[0-9]+/,
            required: true
          },
          expressionProperties: {
            'templateOptions.required': 'model.email.length == 0',
          },
        }
      ]
    },
    {
      key: "postCode",
      type: "place",
      className: "col-md-12",
      defaultValue: "",
      templateOptions: {
        label: "Address",
        placeholder: "",
        postCode: false,
        required: false
      }
    },
    {
      key: "referral",
      type: "input",
      className: "col-md-12 border-bottom-info card pt-3",
      defaultValue: "",
      templateOptions: {
        label: "How did you hear about us?",
        placeholder: "",
        required: false
      }
    },
  ];

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
        "<'row'<'col-sm-12 col-md-6'l><'col-sm-12 col-md-6'f>>" +
        "<'row'<'col-sm-12'tr>>" +
        "<'row'<'col-sm-12 col-md-5'i><'col-sm-12 col-md-7'p>>",
      pageLength: 10,
      lengthMenu: [ 5, 10, 25, 50, 100 ],
      order: [3, 'desc'],
      serverSide: true,
      stateSave: true,
      processing: true,
      searching: true,
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
            data = res['data']['donorsConnection'];
            if (!this.total) {
              this.total = data['totalElements']
            }
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
        { data: null, width: '15px', orderable: false },
        { data: 'email' },
        { data: 'postCode' },
        { data: 'createdAt' },
        { data: 'updatedAt' }
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
      `, 'Create Volunteer Error', {
          enableHtml: true,
          timeOut: 15000
        });
    })
  }

  select(row: any) {
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
