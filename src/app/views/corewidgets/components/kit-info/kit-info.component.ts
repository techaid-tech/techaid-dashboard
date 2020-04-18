import { Component, ViewChild, ViewEncapsulation } from '@angular/core';
import { Subject, of, forkJoin, Observable, Subscription } from 'rxjs';
import { AppGridDirective } from "@app/shared/modules/grid/app-grid.directive";
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import gql from 'graphql-tag';
import { Apollo } from 'apollo-angular';
import { FormGroup } from '@angular/forms';
import { FormlyFormOptions, FormlyFieldConfig } from '@ngx-formly/core';
import { ActivatedRoute, Router } from '@angular/router';
import { isInteger } from '@ng-bootstrap/ng-bootstrap/util/util';
import { UpdateFormDirty } from '@ngxs/form-plugin';
import { Select } from '@ngxs/store';
import { modelGroupProvider } from '@angular/forms/src/directives/ng_model_group';
import { Lightbox } from 'ngx-lightbox';
import { isObject } from 'util';


const QUERY_ENTITY = gql`
query findKit($id: Long) {
  kit(where: {
    id: {
      _eq: $id
    }
  }){
    id
    type
    status
    model
    location
    createdAt
    updatedAt
    attributes {
      images {
        id
        url
      }
      consent
      state
      pickup
      otherType
    }
  }
}
`;

const UPDATE_ENTITY = gql`
mutation updateKit($data: UpdateKitInput!) {
  updateKit(data: $data){
    id
    type
    status
    model
    location
    createdAt
    updatedAt
    attributes {
      images {
        id
        url
      }
      consent
      state
      pickup
      otherType
    }
  }
}
`;

const DELETE_ENTITY = gql`
mutation deleteKit($id: ID!) {
  deleteKit(id: $id)
}
`;

@Component({
  selector: 'kit-info',
  styleUrls: ['kit-info.scss'],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './kit-info.html'
})
export class KitInfoComponent {
  sub: Subscription;
  form: FormGroup = new FormGroup({});
  options: FormlyFormOptions = {};
  model = {};
  deviceModel = {};
  entityName: string;
  entityId: number;
  album = [];
  apis: any[] = [];
  apiInput$ = new Subject<string>();
  apiLoading = false;
  appField: FormlyFieldConfig = {
    key: "attributes.userId",
    type: "choice",
    className: "col-md-12",
    templateOptions: {
      label: "",
      loading: this.apiLoading,
      typeahead: this.apiInput$,
      placeholder: "Assign device to a User",
      multiple: true,
      searchable: true,
      items: this.apis,
      required: false
    },
  };
  deviceFields: Array<FormlyFieldConfig> = [
  {
    fieldGroupClassName: "row",
    fieldGroup: [
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
              {label: "Picked up from Donor / Dropped off by Donor", value: "PICKED_UP" },
              {label: "Updating Software", value: "TECH_UPDATE" },
              {label: "Software Updated & Ready for deployment", value: "READY" },
              {label: "Issued to Recepient", value: "DEPLOYED" },
              {label: "Recycled", value: "RECYCLED" },
              {label: "Other", value: "OTHER" }
            ],
            required: true
          } 
        },
        {
          key: "attributes.notes",
          type: "textarea",
          className: "col-md-6",
          defaultValue: "",
          templateOptions: {
            label: "Technical notes about the device",
            rows: 3,
            required: false
          } 
        },
        this.appField
      ]
    }
  ];

  fields: Array<FormlyFieldConfig> = [
    {
      fieldGroupClassName: "row border-bottom-warning bordered p-2 mb-3",
      fieldGroup: [
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
        },
        {
          key: "attributes.notes",
          type: "textarea",
          className: "col-md-6",
          defaultValue: "",
          templateOptions: {
            label: "Technical notes about the device",
            rows: 3,
            required: false
          } 
        },
      ]
    },
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
        required: true
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
        prefix: "/api",
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
          {label: "I do not consent to my data being processed by Covid TechAid Lambeth", value: "no" },
        ],
        required: true
      }
    }
  ];


  constructor(
    private modalService: NgbModal,
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private toastr: ToastrService,
    private apollo: Apollo,
    private lightbox: Lightbox
  ) {

  }

  modal(content) {
    this.modalService.open(content, { centered: true });
  }

  private queryRef = this.apollo
    .watchQuery({
      query: QUERY_ENTITY,
      variables: {}
    });

  private normalizeData(data: any){
    this.album = (data.attributes.images || []).map(function(src){
      return {src: `/api${src.url}`, thumb: `/api${src.url}`, caption: data.model}
    });
    return data;
  }

  open(index: number): void {
    this.lightbox.open(this.album, index, {
      alwaysShowNavOnTouchDevices: true,
      centerVertically: true
    });
  }

  private fetchData() {
    if (!this.entityId) {
      return;
    }

    this.queryRef.refetch({
      id: this.entityId
    }).then(res => {
      if (res.data && res.data['kit']) {
        var data = res.data['kit'];
        this.model = this.normalizeData(data);
        this.entityName = this.model['model'];
      } else {
        this.model = {};
        this.entityName = "Not Found!"
      }
    }, err => {
      this.toastr.warning(`
          <small>${err.message}</small>
        `, 'GraphQL Error', {
          enableHtml: true,
          timeOut: 15000,
          disableTimeOut: true
        })
    });
  }


  ngOnInit() {
    this.sub = this.activatedRoute.params.subscribe(params => {
      this.entityId = +params['kitId'];
      this.fetchData();
    });
  }

  ngOnDestory() {
    if (this.sub) {
      this.sub.unsubscribe();
    }
  }

  updateEntity(data: any) {
    data.id = this.entityId;
    data.attributes.images = (data.attributes.images || []).map(f => {
      return {
        image: f.image, 
        url: f.url,
        id: f.id
      }
    }); 
    this.apollo.mutate({
      mutation: UPDATE_ENTITY,
      variables: {
        data
      }
    }).subscribe(res => {
      this.model = this.normalizeData(res.data['updateKit']);
      this.entityName = this.model['model'];
      this.toastr.info(`
      <small>Successfully updated device ${this.entityName}</small>
      `, 'Updated Device', {
          enableHtml: true
        });
    }, err => {
      this.toastr.error(`
      <small>${err.message}</small>
      `, 'Update Error', {
          enableHtml: true
        });
    })
  }

  deleteEntity() {
    this.apollo.mutate({
      mutation: DELETE_ENTITY,
      variables: { id: this.entityId }
    }).subscribe(res => {
      if(res.data.deleteKit){
        this.toastr.info(`
        <small>Successfully deleted device ${this.entityName}</small>
        `, 'Device Deleted', {
            enableHtml: true
          });
        this.router.navigate(['/dashboard/devices'])
      }
    }, err => {
      this.toastr.error(`
      <small>${err.message}</small>
      `, 'Error Deleting Device', {
          enableHtml: true
        });
    })
  }
}
