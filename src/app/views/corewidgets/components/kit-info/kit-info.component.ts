import { Component, ViewChild, ViewEncapsulation } from '@angular/core';
import { Subject, of, forkJoin, Observable, Subscription, concat, from } from 'rxjs';
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
import { debounceTime, distinctUntilChanged, tap, switchMap, catchError } from 'rxjs/operators';
import { HashUtils } from '@app/shared/utils';

export const KIT_STATUS = {
  "NEW": "New - Donation Registered",
  "DECLINED": "Declined - Not Suitable",
  "ASSESSMENT_NEEDED": "Accepted - Assesment Needed",
  "ACCEPTED": "Accepted - No Assesment Required",
  "PICKUP_SCHEDULED": "Collection from donor scheduled",
  "DROPOFF_AGGREED": "Donor drop off agreed",
  "DROPOFF_PENDING": "Donor drop off pending",
  "WITH_TECHIE": "Donation received by Tech Team",
  "UPDATE_FAILED": "Donation faulty - collect for recycling",
  "READY": "Donation updated - arrange collection",
  "ALLOCATED": "Device allocated to referring organisation",
  "DELIVERY_ARRANGED": "Collection / drop off to referring organisation agreed",
  "DELIVERED": "Device received by organisation"
};

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
    age
    archived
    volunteers {
      type
      volunteer {
        id
        name 
        email
        phoneNumber
      }
    }
    donor {
      id
      name
      email
      phoneNumber
    }
    organisation {
      id
      name
      email
      phoneNumber
    }
    attributes {
      credentials
      status
      pickupAvailability
      notes
      images {
        id
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
    age
    archived
    volunteers {
      type
      volunteer {
        id
        name 
        email
        phoneNumber
      }
    }
    donor {
      id
      name
      email
      phoneNumber
    }
    organisation {
      id
      name
      email
      phoneNumber
    }
    attributes {
      credentials
      pickupAvailability
      status
      notes
      images {
        id
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

const AUTOCOMPLETE_USERS = gql`
query findAutocompleteVolunteers($term: String, $subGroup: String) {
  volunteersConnection(page: {
    size: 50
  }, where: {
    name: {
      _contains: $term
    }
    subGroup: {
      _contains: $subGroup
    }
    OR: [ 
    {
      subGroup: {
        _contains: $subGroup
      }
      phoneNumber: {
        _contains: $term
      }
    },
    {
       subGroup: {
        _contains: $subGroup
      }
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

const AUTOCOMPLETE_DONORS = gql`
query findAutocompleteDonors($term: String) {
  donorsConnection(page: {
    size: 50
  }, where: {
    name: {
      _contains: $term
    }
    OR: [ 
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

const AUTOCOMPLETE_ORGANISATION = gql`
query findAutocompleteOrgs($term: String) {
  organisationsConnection(page: {
    size: 50
  }, where: {
    name: {
      _contains: $term
    }
    OR: [ 
    {
      phoneNumber: {
        _contains: $term
      }
    },
    {
      email: {
        _contains: $term
      }
    },
    {
      contact: {
        _contains: $term
      }
    },
    {
      website: {
        _contains: $term
      }
    }
    ]
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
  model : any = {};
  deviceModel = {};
  entityName: string;
  entityId: number;
  album = [];

  organisers$: Observable<any>;
  organisersInput$ = new Subject<string>();
  organisersLoading = false;
  organisersField: FormlyFieldConfig = {
    key: "organiserIds",
    type: "choice",
    className: "col-md-12",
    templateOptions: {
      label: "Organising Volunteer",
      description: "The organising volunteer this device is currently assigned to.",
      loading: this.organisersLoading,
      typeahead: this.organisersInput$,
      placeholder: "Assign device to Organiser Volunteers",
      multiple: true,
      searchable: true,
      items: [],
      required: false
    },
  };

  logistics$: Observable<any>;
  logisticsInput$ = new Subject<string>();
  logisticsLoading = false;
  logisticsField: FormlyFieldConfig = {
    key: "logisticIds",
    type: "choice",
    className: "col-md-12",
    templateOptions: {
      label: "Logistics Volunteer",
      description: "The Logistics volunteer this device is currently assigned to.",
      loading: this.logisticsLoading,
      typeahead: this.logisticsInput$,
      placeholder: "Assign device to Logistic Volunteers",
      multiple: true,
      searchable: true,
      items: [],
      required: false
    },
  };

  technicians$: Observable<any>;
  techniciansInput$ = new Subject<string>();
  techniciansLoading = false;
  techniciansField: FormlyFieldConfig = {
    key: "technicianIds",
    type: "choice",
    className: "col-md-12",
    templateOptions: {
      label: "Techie Volunteer",
      description: "The techie volunteers this device is currently assigned to.",
      loading: this.techniciansLoading,
      typeahead: this.techniciansInput$,
      placeholder: "Assign device to Tech Volunteers",
      multiple: true,
      searchable: true,
      items: [],
      required: false
    },
  };

  donors$: Observable<any>;
  donorInput$ = new Subject<string>();
  donorLoading = false;
  donorField: FormlyFieldConfig = {
    key: "donorId",
    type: "choice",
    className: "col-md-12",
    templateOptions: {
      label: "Donor",
      description: "The donor this device is currently assigned to.",
      loading: this.donorLoading,
      typeahead: this.donorInput$,
      placeholder: "Assign device to a Donor",
      multiple: false,
      searchable: true,
      items: [],
      required: false
    },
  };

  orgs$: Observable<any>;
  orgInput$ = new Subject<string>();
  orgLoading = false;
  orgField: FormlyFieldConfig = {
    key: "organisationId",
    type: "choice",
    className: "col-md-12",
    templateOptions: {
      label: "Organisation",
      description: "The organisation this device is currently assigned to.",
      loading: this.orgLoading,
      typeahead: this.orgInput$,
      placeholder: "Assign device to an Organisation",
      multiple: false,
      searchable: true,
      items: [],
      required: false
    },
  };

  fields: Array<FormlyFieldConfig> = [
    {
      fieldGroupClassName: "row border-bottom-warning bordered p-2 mb-3",
      fieldGroup: [
        {
          key: "status",
          type: "radio",
          className: "col-md-6 kit-status",
          defaultValue: "REGISTERED",
          templateOptions: {
            label: "Status of the device",
            options: [
              {label: "New - Donation Registered", value: "NEW" },
              {label: "Declined - Not Suitable", value: "DECLINED" },
              {label: "Accepted - Assesment Needed", value: "ASSESSMENT_NEEDED" },
              {label: "Accepted - No Assesment Required", value: "ACCEPTED" },
              {label: "Collection from donor scheduled", value: "PICKUP_SCHEDULED" },
              {label: "Donor drop off agreed", value: "DROPOFF_AGGREED" },
              {label: "Donor drop off pending", value:  "DROPOFF_PENDING"},
              {label: "Donation received by Tech Team", value: "WITH_TECHIE" },
              {label: "Donation faulty - collect for recycling", value: "UPDATE_FAILED" },
              {label: "Donation updated - arrange collection", value: "READY" },
              {label: "Device allocated to referring organisation", value: "ALLOCATED" },
              {label: "Collection / drop off to referring organisation agreed", value: "DELIVERY_ARRANGED" },
              {label: "Device received by organisation", value: "DELIVERED" }
            ],
            required: true
          } 
        },
        {
          fieldGroupClassName: 'd-flex flex-column justify-content-between',
          className: 'col-md-6',
          fieldGroup: [
            {
              key: "attributes.notes",
              type: "textarea",
              className: "",
              defaultValue: "",
              templateOptions: {
                label: "Notes about the device",
                rows: 5,
                required: false
              } 
            },
            {
              key: "archived",
              type: "radio",
              className: "",
              templateOptions: {
                type: 'array',
                label: "Archived?",
                description: "Archived kits are hidden from view",
                options: [
                  {label: "Device Active and Visible", value: false },
                  {label: "Archive and Hide this Device", value: true },
                ],
                required: true,
              }
            }, 
            {
              template: `
              <div class="alert alert-warning shadow" role="alert">
                Please ensure the donor has been updated with the reasons why 
                the donation has been <span class="badge badge-danger">DECLINED<span>
              </div>
              `,
              hideExpression: "model.status != 'DECLINED'"
            },
          ] 
        }
      ]
    },
    this.techniciansField,
    this.organisersField,
    this.logisticsField,
    this.donorField,
    this.orgField,
    {
      key: "location",
      type: "place",
      className: "col-md-12",
      defaultValue: "",
      templateOptions: {
        label: "Address",
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
        required: true,
        options: [
          { label: "I am able to drop off my device to a location in Streatham Hill", value: "DROPOFF" },
          { label: "I would need you to come and collect my device", value: "PICKUP" },
          { label: "I'm not sure – it depends on the exact location", value: "NOTSURE" }
        ]
      }
    },
    {
      key: "attributes.pickupAvailability",
      type: "input",
      className: "col-md-12",
      defaultValue: "",
      templateOptions: {
        label: "Pickup Availability",
        rows: 2,
        description: `
          Please let us know when you are typically available at home for someone 
          to arrange to come and pick up your device. Alternatively provide us with times 
          when you are usually not available. 
          `,
        required: true
      },
      hideExpression: "model.attributes.pickup != 'PICKUP'",
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
          className: "col-md-6",
          fieldGroup: [
            {
              key: "type",
              type: "radio",
              className: "",
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
              className: "",
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
          ]
        },
        {
          className: "col-md-6",
          fieldGroup: [
            {
              key: "attributes.status",
              type: "multicheckbox",
              className: "",
              templateOptions: {
                type: "array",
                options: [],
                description: "Please select all options that apply"
              },
              defaultValue: [],
              expressionProperties: {
                'templateOptions.options': (model, state, field)=> {
                  const props = {
                    'LAPTOP': [
                      {label: "I have the charger / power cable for the Laptop", value: "CHARGER"},
                      {label: "I don't have the charger / power cable for the Laptop", value: "NO_CHARGER"},
                      {label: "I have a password set for the Laptop", value: "PASSWORD_PROTECTED"},
                      {label: "I don't have a password set for the Laptop", value: "NO_PASSWORD"}
                    ],
                    'TABLET': [
                      {label: "I have the charger for the Tablet", value: "CHARGER"},
                      {label: "I don't have the charger / power cable for the Tablet", value: "NO_CHARGER"},
                      {label: "Have you factory reset the Tablet?", value: "FACTORY_RESET"}
                    ],
                    'SMARTPHONE': [
                      {label: "I have the charger for the Phone", value: "CHARGER"},
                      {label: "I don't have the charger / power cable for the Phone", value: "NO_CHARGER"},
                      {label: "Have you factory reset the Phone?", value: "FACTORY_RESET"}
                    ],
                    'ALLINONE': [
                      {label: "I have the charger for the Computer", value: "CHARGER"},
                      {label: "I don't have the charger / power cable for the Computer", value: "NO_CHARGER"},
                      {label: "Do you have a mouse for the Computer?", value: "HAS_MOUSE"},
                      {label: "Do you have a keyboard for the Computer", value: "HAS_KEYBOARD"},
                      {label: "I have a password set for the Computer", value: "PASSWORD_PROTECTED"},
                      {label: "I don't have a password set for the Computer", value: "NO_PASSWORD"}
                    ],
                    'OTHER': [
                      {label: "I have the charger or power cable for the device", value: "CHARGER"},
                      {label: "I don't have the charger / power cable for the device", value: "NO_CHARGER"},
                    ],
                  };
                  var values = props[model['type']] || props['OTHER'];
                  var delta = {
                    'CHARGER': 'NO_CHARGER',
                    'NO_CHARGER': 'CHARGER',
                    'PASSWORD_PROTECTED': 'NO_PASSWORD',
                    'NO_PASSWORD': 'PASSWORD_PROTECTED'
                  };
                  (field.formControl.value || []).forEach(val => {
                    if(delta[val]){
                      values = values.filter(v => v.value != delta[val]);
                    }
                  });
                  return values
                },
              },
            },
            {
              key: "attributes.credentials",
              type: "input",
              className: "",
              defaultValue: "",
              templateOptions: {
                label: "Device Password",
                description: "If your device requires a password or a PIN to sign in, please provide it here",
                rows: 2,
                placeholder: "Password",
                required: false
              },
              hideExpression: (model, state) => {
                if(['LAPTOP', 'ALLINONE'].indexOf(model.type) == -1){
                  return true;
                }
                const status = HashUtils.dotNotation(model, 'attributes.status') || [];
                if(status && status.length) {
                  return status.indexOf('PASSWORD_PROTECTED') == -1
                }
                return true;
              }
            },
          ]
        },
        {
          key: "age",
          type: "radio",
          className: "col-md-6",
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
        prefix: "",
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
      src.url = `/api/kits/${data.id}/images/${src.id}`;
      return {src: src.url, thumb: src.url, caption: data.model}
    });
    if(data.volunteers){
      const volunteers = {};
      data.volunteers.forEach(v => {
        volunteers[v.type] = volunteers[v.type] || [];
        volunteers[v.type].push({label: this.volunteerName(v.volunteer), value: v.volunteer.id});
      });

      data.organiserIds = (volunteers['ORGANISER'] || []).map(v => v.value);
      data.technicianIds = (volunteers['TECHNICIAN'] || []).map(v => v.value);
      data.logisticIds = (volunteers['LOGISTICS'] || []).map(v => v.value);

      this.organisersField.templateOptions['items'] = volunteers['ORGANISER']; 
      this.techniciansField.templateOptions['items'] = volunteers['TECHNICIAN']; 
      this.logisticsField.templateOptions['items'] = volunteers['LOGISTICS']; 
    }
    if(data.donor && data.donor.id){
      data.donorId = data.donor.id;
      this.donorField.templateOptions['items'] = [
        {label: this.volunteerName(data.donor), value: data.donor.id}
      ]; 
    }

    if(data.organisation && data.organisation.id){
      data.organisationId = data.organisation.id;
      this.orgField.templateOptions['items'] = [
        {label: this.volunteerName(data.organisation), value: data.organisation.id}
      ]; 
    }
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
        this.toastr.error(`
        <small>Unable to find a device with the id: ${this.entityId}</small>
        `, 'GraphQL Error', {
          enableHtml: true,
          timeOut: 15000,
          disableTimeOut: true
        });
      }
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


  ngOnInit() {
    const userRef = this.apollo
    .watchQuery({
      query: AUTOCOMPLETE_USERS,
      variables: {
      }
    });
    const donorRef = this.apollo
    .watchQuery({
      query: AUTOCOMPLETE_DONORS,
      variables: {
      }
    });

    const orgRef = this.apollo
    .watchQuery({
      query: AUTOCOMPLETE_ORGANISATION,
      variables: {
      }
    });
    
    this.organisers$ = concat(
      of([]),
      this.organisersInput$.pipe(
        debounceTime(200),
        distinctUntilChanged(),
        tap(() => this.organisersLoading = true),
        switchMap(term => from(userRef.refetch({
          term: term,
          subGroup: "Organizing"
        })).pipe(
          catchError(() => of([])),
          tap(() => this.organisersLoading = false),
          switchMap(res => {
            const data = res['data']['volunteersConnection']['content'].map(v => {
              return {
                label: `${this.volunteerName(v)}`, value: v.id
              }
            });
            return of(data)
          })
        ))
      )
    );

    this.logistics$ = concat(
      of([]),
      this.logisticsInput$.pipe(
        debounceTime(200),
        distinctUntilChanged(),
        tap(() => this.logisticsLoading = true),
        switchMap(term => from(userRef.refetch({
          term: term,
          subGroup: "Distribution"
        })).pipe(
          catchError(() => of([])),
          tap(() => this.logisticsLoading = false),
          switchMap(res => {
            const data = res['data']['volunteersConnection']['content'].map(v => {
              return {
                label: `${this.volunteerName(v)}`, value: v.id
              }
            });
            return of(data)
          })
        ))
      )
    );

    this.technicians$ = concat(
      of([]),
      this.techniciansInput$.pipe(
        debounceTime(200),
        distinctUntilChanged(),
        tap(() => this.techniciansLoading = true),
        switchMap(term => from(userRef.refetch({
          term: term,
          subGroup: "Technical"
        })).pipe(
          catchError(() => of([])),
          tap(() => this.techniciansLoading = false),
          switchMap(res => {
            const data = res['data']['volunteersConnection']['content'].map(v => {
              return {
                label: `${this.volunteerName(v)}`, value: v.id
              }
            });
            return of(data)
          })
        ))
      )
    );

    this.donors$ = concat(
      of([]),
      this.donorInput$.pipe(
        debounceTime(200),
        distinctUntilChanged(),
        tap(() => this.donorLoading = true),
        switchMap(term => from(donorRef.refetch({
          term: term
        })).pipe(
          catchError(() => of([])),
          tap(() => this.donorLoading = false),
          switchMap(res => {
            const data = res['data']['donorsConnection']['content'].map(v => {
              return {
                label: `${this.volunteerName(v)}`, value: v.id
              }
            });
            return of(data)
          })
        ))
      )
    );

    this.orgs$ = concat(
      of([]),
      this.orgInput$.pipe(
        debounceTime(200),
        distinctUntilChanged(),
        tap(() => this.orgLoading = true),
        switchMap(term => from(orgRef.refetch({
          term: term
        })).pipe(
          catchError(() => of([])),
          tap(() => this.orgLoading = false),
          switchMap(res => {
            const data = res['data']['organisationsConnection']['content'].map(v => {
              return {
                label: `${this.volunteerName(v)}`, value: v.id
              }
            });
            return of(data)
          })
        ))
      )
    );

    this.sub = this.activatedRoute.params.subscribe(params => {
      this.entityId = +params['kitId'];
      this.fetchData();
    });

    this.sub.add(this.organisers$.subscribe(data => {
      this.organisersField.templateOptions['items'] = data;
    }));

    this.sub.add(this.logistics$.subscribe(data => {
      this.logisticsField.templateOptions['items'] = data;
    }));

    this.sub.add(this.technicians$.subscribe(data => {
      this.techniciansField.templateOptions['items'] = data;
    }));

    this.sub.add(this.donors$.subscribe(data => {
      this.donorField.templateOptions['items'] = data;
    }));

    this.sub.add(this.orgs$.subscribe(data => {
      this.orgField.templateOptions['items'] = data;
    }));
  }

  volunteerName(data) {
    return `${data.name || ''}||${data.email ||''}||${data.phoneNumber||''}`.split('||').filter(f => f.trim().length).join(" / ").trim();
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
