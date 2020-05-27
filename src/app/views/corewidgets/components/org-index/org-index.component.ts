import { Component, ViewChild, ViewEncapsulation } from '@angular/core';
import { Observable, Subscription, from } from 'rxjs';
import { AppGridDirective } from "@app/shared/modules/grid/app-grid.directive";
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import gql from 'graphql-tag';
import { Apollo } from 'apollo-angular';
import { FormGroup } from '@angular/forms';
import { FormlyFieldConfig } from '@ngx-formly/core';
import { Select } from '@ngxs/store';
import { CoreWidgetState } from '@views/corewidgets/state/corewidgets.state';

const QUERY_ENTITY = gql`
query findAllOrgs($page: PaginationInput,, $term: String) {
  organisationsConnection(page: $page, where: {
    AND: {
      OR: [
        {
          website: {
            _contains: $term
          }
        },
        {
          phoneNumber: {
            _contains: $term
          }
        },
        {
          name: {
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
        }
      ]
    }
  }){
    totalElements
    content{
     id
     website
     phoneNumber
     contact
     name
     email
     createdAt
     updatedAt
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

@Component({
  selector: 'org-index',
  styleUrls: ['org-index.scss'],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './org-index.html'
})
export class OrgIndexComponent {
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
      className: "col-md-12",
      defaultValue: "",
      templateOptions: {
        label: "Name",
        placeholder: "",
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
      key: "website",
      type: "input",
      className: "col-md-12",
      defaultValue: "",
      templateOptions: {
        label: "Website",
        placeholder: "",
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
      fieldGroupClassName: "row",
      fieldGroup: [
        {
          key: "contact",
          type: "input",
          className: "col-md-12",
          defaultValue: "",
          templateOptions: {
            label: "Primary Contact Name",
            placeholder: "",
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
          key: "email",
          type: "input",
          className: "col-md-6",
          defaultValue: "",
          templateOptions: {
            label: "Primary Contact Email",
            type: "email",
            pattern: /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
            placeholder: "",
            required: true
          },
          expressionProperties: {
            'templateOptions.required': '!model.phoneNumber.length'
          }
        },
        {
          key: "phoneNumber",
          type: "input",
          className: "col-md-6",
          defaultValue: "",
          templateOptions: {
            label: "Primary Contact Phone Number",
            pattern: /\+?[0-9]+/,
            required: true
          },
          expressionProperties: {
            'templateOptions.required': '!model.email.length'
          }
        },
      ]
    }, 
    {
      key: "attributes.accepts",
      type: "multicheckbox",
      className: "",
      defaultValue: [],
      templateOptions: {
        type: 'array',
        label: "What types of devices are you looking for?",
        multiple: true,
        options: [
          {value: "LAPTOPS", label: "Laptops"},
          {value: "PHONES", label: "Phones"},
          {value: "TABLETS", label: "Tablets" },
          {value: "ALLINONES", label: "All In Ones" },
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
      hideExpression: "!model.attributes.accepts.length",
      fieldGroup: [
        {
          className: 'col-12',
          template: `
            <p>How many of the following items can you currently take?</p>
          `
        },
        {
          key: "attributes.request.laptops",
          type: "input",
          className: "col-6",
          defaultValue: 0,
          hideExpression: "model.attributes.accepts.toString().indexOf('LAPTOP') < 0",
          templateOptions: {
            min: 0,
            label: 'Laptops', 
            addonLeft: {
              class: 'fas fa-laptop'
            },
            type: "number",
            placeholder: "",
            required: true
          }
        },
        {
          key: "attributes.request.phones",
          type: "input",
          className: "col-6",
          hideExpression: "model.attributes.accepts.toString().indexOf('PHONE') < 0",
          defaultValue: 0,
          templateOptions: {
            min: 0,
            label: "Phones",
            addonLeft: {
              class: 'fas fa-mobile-alt'
            },
            type: "number",
            placeholder: "",
            required: true
          }
        },
        {
          key: "attributes.request.tablets",
          type: "input",
          className: "col-6",
          defaultValue: 0,
          hideExpression: "model.attributes.accepts.toString().indexOf('TABLET') < 0",
          templateOptions: {
            min: 0,
            label: "Tablets",
            addonLeft: {
              class: 'fas fa-tablet-alt'
            },
            type: "number",
            placeholder: "",
            required: true
          }
        },
        {
          key: "attributes.request.allInOnes",
          type: "input",
          className: "col-6",
          hideExpression: "model.attributes.accepts.toString().indexOf('ALLINONE') < 0",
          defaultValue: 0,
          templateOptions: {
            min: 0,
            label: "All In Ones",
            addonLeft: {
              class: 'fas fa-desktop'
            },
            type: "number",
            placeholder: "",
            required: true
          }
        },
      ]
    },
    {
      key: "attributes.alternateAccepts",
      type: "multicheckbox",
      className: "",
      hideExpression: "!model.attributes.accepts.length || model.attributes.accepts.length == 4",
      defaultValue: [],
      templateOptions: {
        type: 'array',
        label: "If none of the items listed above are available, would you be willing to consider any of the following?",
        multiple: true,
        options: [
          {value: "LAPTOPS", label: "Laptops"},
          {value: "PHONES", label: "Phones"},
          {value: "TABLETS", label: "Tablets" },
          {value: "ALLINONES", label: "All In Ones" },
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
            {value: "LAPTOPS", label: "Laptops"},
            {value: "PHONES", label: "Phones"},
            {value: "TABLETS", label: "Tablets" },
            {value: "ALLINONES", label: "All In Ones" },
          ];
          var values = opts.filter(o => (model.attributes.accepts || []).indexOf(o.value) == -1);
          return values;
        }
      }
    },
    {
      fieldGroupClassName: 'row',
      hideExpression: "!model.attributes.alternateAccepts.length",
      fieldGroup: [
        {
          className: 'col-12',
          template: `
            <p>How many of the following alternate items are you willing to take?</p>
          `
        },
        {
          key: "attributes.alternateRequest.laptops",
          type: "input",
          className: "col-6",
          defaultValue: 0,
          hideExpression: "model.attributes.accepts.toString().indexOf('LAPTOP') > -1 || model.attributes.alternateAccepts.toString().indexOf('LAPTOP') < 0",
          templateOptions: {
            min: 0,
            label: 'Laptops', 
            addonLeft: {
              class: 'fas fa-laptop'
            },
            type: "number",
            placeholder: "",
            required: true
          }
        },
        {
          key: "attributes.alternateRequest.phones",
          type: "input",
          className: "col-6",
          hideExpression: "model.attributes.accepts.toString().indexOf('PHONE') > -1 || model.attributes.alternateAccepts.toString().indexOf('PHONE') < 0",
          defaultValue: 0,
          templateOptions: {
            min: 0,
            label: "Phones",
            addonLeft: {
              class: 'fas fa-mobile-alt'
            },
            type: "number",
            placeholder: "",
            required: true
          }
        },
        {
          key: "attributes.alternateRequest.tablets",
          type: "input",
          className: "col-6",
          defaultValue: 0,
          hideExpression: "model.attributes.accepts.toString().indexOf('TABLET') > -1 || model.attributes.alternateAccepts.toString().indexOf('TABLET') < 0",
          templateOptions: {
            min: 0,
            label: "Tablets",
            addonLeft: {
              class: 'fas fa-tablet-alt'
            },
            type: "number",
            placeholder: "",
            required: true
          }
        },
        {
          key: "attributes.alternateRequest.allInOnes",
          type: "input",
          className: "col-6",
          hideExpression: "model.attributes.accepts.toString().indexOf('ALLINONE') > -1 || model.attributes.alternateAccepts.toString().indexOf('ALLINONE') < 0",
          defaultValue: 0,
          templateOptions: {
            min: 0,
            label: "All In Ones",
            addonLeft: {
              class: 'fas fa-desktop'
            },
            type: "number",
            placeholder: "",
            required: true
          }
        },
      ]
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
      order: [2, 'desc'],
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
            data = res['data']['organisationsConnection'];
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
        { data: 'name' },
        { data: 'contact' },
        { data: 'email' },
        { data: 'phoneNumber'},
        { data: 'createdAt'},
        { data: 'updatedAt' },
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
      `, 'Create Organisation Error', {
          enableHtml: true,
          timeOut: 15000
        });
    })
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
