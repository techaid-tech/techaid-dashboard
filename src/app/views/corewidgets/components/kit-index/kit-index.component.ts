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
query findAllKits($page: PaginationInput,, $term: String) {
  kitsConnection(page: $page, where: {
    AND: {
      model: {
        _contains: $term
      }
      OR: [
        {
          location: {
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
    }
  }
}
`;

const CREATE_ENTITY = gql`
mutation createKits($data: CreateKitInput!) {
  createKit(data: $data){
    id
    type
    model
  }
}
`;

@Component({
  selector: 'kit-index',
  styleUrls: ['kit-index.scss'],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './kit-index.html'
})
export class KitIndexComponent {
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

  @Select(CoreWidgetState.query) search$: Observable<string>;

  fields: Array<FormlyFieldConfig> = [
    {
      key: "location",
      type: "place",
      className: "col-md-12",
      defaultValue: "",
      templateOptions: {
        label: "PostCode",
        description: "The address of the device",
        placeholder: "",
        postCode: false,
        required: true
      }
    },
    {
      key: "attributes.pickup",
      type: "radio",
      className: "col-md-12",
      defaultValue: "DROPOFF",
      templateOptions: {
        label: "Are you able to drop off your device to a location in Streatham Hill or would you need it to be collected?",
        placeholder: "",
        postCode: true,
        required: true,
        options: [
          { label: "I am able to drop off my device to a location in Streatham Hill", value: "DROPOFF" },
          { label: "I would need you to come and collect my device", value: "PICKUP" },
          { label: "I'm not sure – it depends on the exact location", value: "NOTSURE" }
        ]
      }
    },
    {
      template: `
      <div class="row">
        <div class="col-md-12">
          <div class="border-bottom-info card mb-3 p-3">
            <strong><p>About your device</p></strong>
            <p>
              In order to understand what condition your device is in - and how easy it will be for us 
              to get it ready to deliver - please answer as many of the following questions as you can.
            </p>
          </div>
        </div>
      </div>
      `
    },
    {
      fieldGroupClassName: "row",
      fieldGroup: [
        {
          key: "type",
          type: "radio",
          className: "col-md-6",
          defaultValue: "LAPTOP",
          templateOptions: {
            label: "Type of device",
            options: [
              {label: "Laptop", value: "LAPTOP" },
              {label: "Tablet", value: "TABLET" },
              {label: "Smart Phone", value: "SMARTPHONE" },
              {label: "All In One (PC)", value: "ALLINONE" },
              {label: "Other", value: "OTHER" }
            ],
            required: true
          } 
        },
        {
          key: "attributes.otherType",
          type: "input",
          className: "col-md-6",
          defaultValue: "",
          templateOptions: {
            label: "Type of device",
            rows: 2,
            placeholder: "(Other device type)",
            required: true
          },
          hideExpression: "model.type != 'OTHER'",
          expressionProperties: {
            'templateOptions.required': "model.type == 'OTHER'",
          },
        },
        {
          key: "age",
          type: "radio",
          className: "col-md-6",
          defaultValue: 5,
          templateOptions: {
            label: "Roughly how old is your device?",
            options: [
              {label: "Less than a year", value: 1},
              {label: "1 - 2 years", value: 2},
              {label: "3 - 4 years", value: 4 },
              {label: "5 - 6 years", value: 5},
              {label: "More than 6 years old", value: 6 },
              {label: "I don't know!", value: 0 }
            ],
            required: true
          } 
        },
        {
          key: "status",
          type: "radio",
          className: "col-md-6",
          defaultValue: "REGISTERED",
          templateOptions: {
            label: "Status of the device",
            options: [
              {label: "Donation Registered", value: "REGISTERED" },
              {label: "Pickup Scheduled", value: "PICKUP_SCHEDULED" },
              {label: "Picked up from Donor", value: "PICKED_UP" },
              {label: "Software Updated", value: "TECH_UPDATE" },
              {label: "Issued to Recepient", value: "DEPLOYED" },
              {label: "Recycled", value: "RECYCLED" },
              {label: "Other", value: "OTHER" }
            ],
            required: true
          } 
        }
      ]
    },
    {
      key: "model",
      type: "input",
      className: "col-md-12",
      defaultValue: "",
      templateOptions: {
        label: "Make or model (if known)",
        rows: 2,
        placeholder: "",
        required: false
      }
    },
    {
      key: "attributes.state",
      type: "input",
      className: "col-md-12",
      defaultValue: "",
      templateOptions: {
        label: "What technical state is the device in? For example, does it turn on OK? Are there keys missing? Is the screen cracked?",
        rows: 2,
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
              In order to protect your data, Covid TechAid Lambeth will delete any personal information 
              submitted via this form as soon as it has been used for collecting and delivering your device. 
              Alternatively, if we don't collect your device, we will delete your information immediately. 
              We promise to process your data in accordance with data protection legislation, and will not 
              share your details with any third parties. You have the right to ask for your information to be 
              deleted from our records - please contact covidtechaid@gmail.com for more information.
            </p>
          </div>
        </div>
      </div>
      `
    },
    {
      key: "attributes.images",
      type: "gallery",
      className: "col-md-12",
      templateOptions: {
        label: "Upload an image of your device if you can",
        required: false
      }
    },
    {
      key: "attributes.consent",
      type: "radio",
      className: "col-md-12",
      templateOptions: {
        label: "",
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
            data = res['data']['kitsConnection'];
            if (!this.total) {
              this.total = data['totalElements']
            }
            data.content.forEach(d => {
              if(d.donor){
                if(d.donor.name && d.donor.name.length){
                  d.donorName = d.donor.name;
                }else if(d.donor.email && d.donor.email.length){
                  d.donorName = d.donor.email;
                }else if(d.donor.phoneNumber && d.donor.phoneNumber.length){
                  d.donorName = d.donor.phoneNumber;
                }
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
        { data: 'donor.name' },
        { data: 'updatedAt'},
        { data: 'age'},
        { data: 'type' },
        { data: 'status' },
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
      this.table.ajax.reload();
    }, err => {
      this.toastr.error(`
      <small>${err.message}</small>
      `, 'Create Device Error', {
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
