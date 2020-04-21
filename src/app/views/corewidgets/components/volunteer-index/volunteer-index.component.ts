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
import 'datatables.net-responsive';
import 'datatables.net-rowreorder';
import { CoreWidgetState } from '@views/corewidgets/state/corewidgets.state';

const QUERY_ENTITY = gql`
query findAllVolunteers($page: PaginationInput,, $term: String) {
  volunteersConnection(page: $page, where: {
    AND: {
      name: {
        _contains: $term
      }
      OR: [
        {
          postCode: {
            _contains: $term
          }
        },
        {
          email: {
            _contains: $term
          }
        },
        {
          subGroup: {
            _contains: $term
          }
        }
      ]
    }
  }){
    totalElements
    number
    content{
     id
     name
     updatedAt
     createdAt
     email
     phoneNumber
     availability
     subGroup
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
  encapsulation: ViewEncapsulation.None,
  templateUrl: './volunteer-index.html'
})
export class VolunteersIndexComponent {
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
      template: `
      <div class="row">
        <div class="col-md-12">
          <div class="border-bottom-info card mb-3 p-3">
            <strong><p>Covid TechAid Volunteers</p></strong>
            <p>
            Thank you for offering to help get isolated people connected on line through Covid TechAid Lambeth.  
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
      key: "name",
      type: "input",
      className: "col-md-12",
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
          key: "phoneNumber",
          type: "input",
          className: "col-md-6",
          defaultValue: "",
          templateOptions: {
            label: "Phone Number (Preferred)",
            pattern: /\+?[0-9]+/,
            description: "Required if email is not provided.",
            required: false
          },
          expressionProperties: {
            'templateOptions.required': 'model.email.length == 0',
          },
        },
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
            description: "Not Required if phone number is provided"
          },
          expressionProperties: {
            'templateOptions.required': 'model.phoneNumber.length == 0',
          },
        },
      ]
    },
    {
      fieldGroupClassName: "row",
      fieldGroup: [
        {
          key: "postCode",
          type: "place",
          className: "col-md-6",
          templateOptions: {
            label: "Address",
            options: [
              {label: "Streatham Hill", value: "Streatham Hill" },
              {label: "Streatham South", value: "Streatham South" },
              {label: "Streatham Wells", value: "Streatham Wells" },
              {label: "Thornton", value: "Thornton" },
              {label: "St Lenoard's", value: "St Lenoard's" },
              {label: "Tulse Hill", value: "Tulse Hill" },
              {label: "Clapham Common", value: "Clapham Common" },
              {label: "Brixton Hill", value: "Brixton Hill" },
              {label: "Other", value: "Other" }
            ],
            required: false
          } 
        },
        {
          key: "subGroup",
          type: "multicheckbox",
          className: "col-md-6",
          templateOptions: {
            label: "How would you like to help",
            description: "Please let us know what tasks you would like to help with eg organisation, technical support, collection and delivery, training, fundraising etc.",
            multiple: true,
            type: 'array',
            options: [
              {value: "Technical", label: "Technical (Fixing & Updating Equipment)" },
              {value: "Distribution", label: "Distribution (Picking up and delivering devices)" },
              {value: "Findraising", label: "Fundraising" },
              {value: "Organizing", label: "Organizing(Co-ordinating group activities)" },
              {value: "MinorOrganizing", label: "Organizing(Might be interested in helping with group administration)" },
              {value: "Other", label: "Other" }
            ],
            required: true
          } 
        },
        {
          key: "expertise",
          type: "input",
          className: "col-md-6",
          defaultValue: "",
          templateOptions: {
            label: "How would you like to help",
            required: true
          },
          hideExpression: "(model.subGroup || []).indexOf('Other') == -1",
          expressionProperties: {
            'templateOptions.required': "(model.subGroup || []).indexOf('Other') > -1",
          },
        },
        {
          key: "organizing",
          type: "radio",
          className: "col-md-6",
          defaultValue: "none",
          templateOptions: {
            label: "Would you like to be involved with the organisation of Streatham TechAid?",
            options: [
              {label: "Yes", value: "yes" },
              {label: "No", value: "no" },
              {label: "Maybe", value: "maybe" } 
            ],
            required: true
          },
          hideExpression: "(model.subGroup || []).indexOf('Organizing') > -1 || (model.subGroup || []).indexOf('MinorOrganizing') > -1",
        },
      ]
    },
    {
      fieldGroupClassName: "row",
      fieldGroup: [
        {
          key: "transport",
          type: "radio",
          className: "col-md-6",
          defaultValue: "none",
          templateOptions: {
            label: "Do you have use of a car or bike?",
            description: "Mode of travel",
            options: [
              {label: "Car", value: "car" },
              {label: "Bike", value: "bike" },
              {label: "Neither", value: "none" } 
            ]
          }
        },
        {
          key: "storage",
          type: "radio",
          className: "col-md-6",
          defaultValue: "no",
          templateOptions: {
            label: "Are you able to store equipment?",
            description: "This is for devices that have been picked up from donors",
            options: [
              {label: "No", value: "no" },
              {label: "Limited storage possible", value: "limited" },
              {label: "Yes", value: "yes" }
            ],
            required: true
          }
        }
      ]
    },
    {
      key: "availability",
      type: "input",
      className: "col-md-12",
      defaultValue: "",
      templateOptions: {
        label: "Availability",
        placeholder: "",
        required: false
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
      key: "consent",
      type: "radio",
      className: "col-md-12",
      templateOptions: {
        label: "Data Protection",
        options: [
          {label: "I consent to my data being processed by Covid TechAid Lambeth", value: "yes" },
          // {label: "I do not consent to my data being processed by Covid TechAid Lambeth", value: "no" },
        ],
        required: true
      }
    }
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
    this.table.ajax.reload();
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
        this.table.ajax.reload();
      }
    });

    this.dtOptions = {
      pagingType: 'simple_numbers',
      dom:
        "<'row'<'col-sm-12 col-md-6'l>>" +
        "<'row'<'col-sm-12'tr>>" +
        "<'row'<'col-sm-12 col-md-5'i><'col-sm-12 col-md-7'p>>",
      pageLength: 10,
      order: [1, 'desc'],
      serverSide: true,
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
            data = res['data']['volunteersConnection'];
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
    if(this.form.invalid){
      return false;
    }
    data.subGroup = (data.subGroup || [])
    if(data.organizing){
      if(data.organizing == 'yes'){
        data.subGroup.push('Organizing');
      }else if(data.organizing == 'maybe'){
        data.subGroup.push('MinorOrganizing');
      }
    }
    data.subGroup = (data.subGroup || []).join(',')
    delete data.organizing;;

    this.apollo.mutate({
      mutation: CREATE_ENTITY,
      context: {
        authenticated: false
      },
      variables: { data }
    }).subscribe(data => {
      this.total = null;
      this.table.ajax.reload();
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
    for (let k in this.selections) {
      this.selected.push(this.selections[k]);
    }
  }
}
