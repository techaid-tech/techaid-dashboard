import { Component, ViewChild, ViewEncapsulation } from '@angular/core';
import { Subject, of, forkJoin, Observable, Subscription } from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import gql from 'graphql-tag';
import { Apollo } from 'apollo-angular';
import { FormGroup } from '@angular/forms';
import { FormlyFormOptions, FormlyFieldConfig } from '@ngx-formly/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Select } from '@ngxs/store';
import { UserState } from '@app/state/state.module';
import { User } from '@app/state/user/user.state';

const QUERY_ENTITY = gql`
  query findUser($id: Long) {
    volunteer(where: { id: { _eq: $id } }) {
      id
      name
      phoneNumber
      email
      createdAt
      updatedAt
      subGroup
      postCode
      storage
      availability
      expertise
      transport
      attributes {
        accepts
        dropOffAvailability
        hasCapacity
        capacity {
          phones
          tablets
          laptops
          allInOnes
          desktops
        }
      }
    }
  }
`;

const UPDATE_ENTITY = gql`
  mutation updateUser($data: UpdateVolunteerInput!) {
    updateVolunteer(data: $data) {
      id
      name
      phoneNumber
      email
      createdAt
      updatedAt
      subGroup
      postCode
      storage
      availability
      expertise
      transport
      attributes {
        accepts
        dropOffAvailability
        hasCapacity
        capacity {
          phones
          tablets
          laptops
          allInOnes
          desktops
        }
      }
    }
  }
`;

const DELETE_ENTITY = gql`
  mutation deleteVolunteer($id: ID!) {
    deleteVolunteer(id: $id)
  }
`;

@Component({
  selector: 'volunteer-info',
  styleUrls: ['volunteer-info.scss'],

  templateUrl: './volunteer-info.html',
})
export class VolunteerInfoComponent {

  constructor(
    private modalService: NgbModal,
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private toastr: ToastrService,
    private apollo: Apollo
  ) {}
  sub: Subscription;
  form: FormGroup = new FormGroup({});
  options: FormlyFormOptions = {
    formState: {
      disabled: true
    }
  };
  model: any = {};
  userName: string;
  userId: number;
  public user: User;
  @Select(UserState.user) user$: Observable<User>;

  fields: Array<FormlyFieldConfig> = [
    {
      key: 'name',
      type: 'input',
      className: 'col-md-12',
      defaultValue: '',
      templateOptions: {
        label: 'Name',
        placeholder: '',
        required: true,
      },
      validation: {
        show: false,
      },
      expressionProperties: {
        'validation.show': 'model.showErrorState',
        'templateOptions.disabled': 'formState.disabled',
      },
    },
    {
      fieldGroupClassName: 'row',
      fieldGroup: [
        {
          key: 'email',
          type: 'input',
          className: 'col-md-6',
          defaultValue: '',
          templateOptions: {
            label: 'Email',
            type: 'email',
            pattern: /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
            placeholder: '',
            required: false
          },
          validation: {
            show: false,
          },
          expressionProperties: {
            'validation.show': 'model.showErrorState',
            'templateOptions.disabled': 'formState.disabled',
          },
        },
        {
          key: 'phoneNumber',
          type: 'input',
          className: 'col-md-6',
          defaultValue: '',
          templateOptions: {
            label: 'Phone Number',
            required: false
          },
          validation: {
            show: false,
          },
          expressionProperties: {
            'validation.show': 'model.showErrorState',
            'templateOptions.disabled': 'formState.disabled',
          },
        },
      ],
    },
    {
      fieldGroupClassName: 'row',
      fieldGroup: [
        {
          className: 'col-md-6',
          fieldGroup: [
            {
              key: 'subGroup',
              type: 'multicheckbox',
              className: '',
              defaultValue: [],
              templateOptions: {
                type: 'array',
                label: 'How would you like to help? Select all that apply.',
                description:
                  'Please let us know what tasks you would like to help with eg organisation, technical support, collection and delivery, training, fundraising etc. If none of these apply, select `Other` and define how you would be able to help.',
                multiple: true,
                options: [
                  {value: 'Technical', label: 'Technical: remove data and update donated equipment' },
                  {value: 'Transport', label: 'Transport: collecting and delivering devices'},
                  {value: 'Donations', label: 'Donations: Co-ordinating donations and assigning them to the technical team'},
                  {value: 'Distribution', label: 'Distribution: respond to and fill requests for devices' },
                  {value: 'Publicity', label: 'Publicity: manage social media and other publicity to maintain a steady flow of donations and volunteers into TechAid'},
                  {value: 'Organizing', label: 'Management: leading and coordinating the work of the various groups and the org as a whole' },
                  {value: 'Other', label: 'Other' }
                ],
                required: true,
              },
              validation: {
                show: false,
              },
              expressionProperties: {
                'validation.show': 'model.showErrorState',
                'templateOptions.disabled': 'formState.disabled',
              },
            },
            {
              key: 'expertise',
              type: 'input',
              className: '',
              templateOptions: {
                label: 'How would you like to help',
                required: true,
              },
              hideExpression: '(model.subGroup || []).indexOf(\'Other\') == -1',
              validation: {
                show: false,
              },
              expressionProperties: {
                'templateOptions.required':
                  '(model.subGroup || []).indexOf(\'Other\') > -1',
                'validation.show': 'model.showErrorState',
                'templateOptions.disabled': 'formState.disabled',
              },
            },
            {
              key: 'organizing',
              type: 'radio',
              className: '',
              defaultValue: 'no',
              templateOptions: {
                label:
                  'Would you like to be involved with the organisation of Community TechAid?',
                options: [
                  { label: 'Yes', value: 'yes' },
                  { label: 'No', value: 'no' }
                ],
                required: true,
              },
              hideExpression:
                '(model.subGroup || []).indexOf(\'Organizing\') > -1',
              validation: {
                show: false,
              },
              expressionProperties: {
                'validation.show': 'model.showErrorState',
                'templateOptions.disabled': 'formState.disabled',
              },
            },
          ],
        },
        {
          className: 'col-md-6',
          fieldGroup: [
            {
              type: 'place',
              className: '',
              key: 'postCode',
              templateOptions: {
                label: 'Address',
                required: true,
              },
              validation: {
                show: false,
              },
              expressionProperties: {
                'validation.show': 'model.showErrorState',
                'templateOptions.disabled': 'formState.disabled',
              },
            },
            {
              className: 'col-md-6',
              fieldGroupClassName: 'row',
              fieldGroup: [
                {
                  key: 'transport',
                  type: 'radio',
                  className: 'col-md-6',
                  defaultValue: 'none',
                  templateOptions: {
                    label: 'Do you have use of a car or bike?',
                    description: 'Mode of travel',
                    options: [
                      { label: 'Car', value: 'car' },
                      { label: 'Bike', value: 'bike' },
                      { label: 'Neither', value: 'none' },
                    ],
                  },
                  validation: {
                    show: false,
                  },
                  expressionProperties: {
                    'validation.show': 'model.showErrorState',
                    'templateOptions.disabled': 'formState.disabled',
                  },
                },
                {
                  key: 'storage',
                  type: 'radio',
                  className: 'col-md-6',
                  defaultValue: 'no',
                  templateOptions: {
                    label: 'Are you able to store equipment?',
                    description:
                      'This is for devices that have been picked up from donors',
                    options: [
                      { label: 'No', value: 'no' },
                      { label: 'Limited storage possible', value: 'limited' },
                      { label: 'Yes', value: 'yes' },
                    ],
                    required: true,
                  },
                  validation: {
                    show: false,
                  },
                  expressionProperties: {
                    'validation.show': 'model.showErrorState',
                    'templateOptions.disabled': 'formState.disabled',
                  },
                },
              ],
            },
          ],
        },
      ],
    },
    {
      fieldGroupClassName: 'row',
      hideExpression: '(model.subGroup || []).indexOf(\'Technical\') == -1',
      fieldGroup: [
        {
          className: 'col-md-6',
          fieldGroup: [
            {
              key: 'attributes.accepts',
              type: 'multicheckbox',
              className: '',
              defaultValue: [],
              templateOptions: {
                type: 'array',
                label:
                  'As a Tech volunteer, what sort of devices are you willing to take?',
                description:
                  'Please select all the devices that you are happy to help with',
                multiple: true,
                options: [
                  { value: 'APPLE_PHONES', label: 'Apple iPhones' },
                  { value: 'ANDROID_PHONES', label: 'Android Phones' },
                  { value: 'IOS_TABLETS', label: 'iPads' },
                  { value: 'ANDROID_TABLETS', label: 'Android Tablets' },
                  {
                    value: 'OTHER_TABLETS',
                    label: 'All Other Tablets ( Windows )',
                  },
                  { value: 'WINDOWS_LAPTOPS', label: 'Windows Laptops' },
                  { value: 'WINDOWS_ALLINONES', label: 'Windows All In Ones' },
                  { value: 'WINDOWS_DESKTOPS', label: 'Windows Desktops' },
                  {
                    value: 'LINUX_LAPTOPS',
                    label: 'Capable of Installing Linux on Old Windows Computers',
                  },
                  { value: 'APPLE_LAPTOPS', label: 'Apple Macbooks' },
                  {
                    value: 'APPLE_ALLINONES',
                    label: 'Apple iMacs (All In One)',
                  },
                ],
                required: true,
              },
              validation: {
                show: false,
              },
              expressionProperties: {
                'validation.show': 'model.showErrorState',
                'templateOptions.disabled': 'formState.disabled',
              },
            },
            {
              key: 'attributes.dropOffAvailability',
              type: 'input',
              className: '',
              defaultValue: '',
              templateOptions: {
                label: 'Device Dropoff Availability',
                placeholder: '',
                description:
                  'Please specify what times you are usually available to have devices dropped off at your address',
                required: true,
              },
              validation: {
                show: false,
              },
              expressionProperties: {
                'validation.show': 'model.showErrorState',
                'templateOptions.disabled': 'formState.disabled',
              },
            },
          ],
        },
        {
          className: 'col-md-6',
          hideExpression: '!model.attributes.accepts || !model.attributes.accepts.length',
          fieldGroup: [
            {
              key: 'attributes.hasCapacity',
              type: 'radio',
              className: '',
              templateOptions: {
                label: 'Do you currently have capacity to take on new devices?',
                options: [
                  { label: 'Yes', value: true },
                  { label: 'No', value: false },
                ],
                required: true,
              },
              validation: {
                show: false,
              },
              expressionProperties: {
                'validation.show': 'model.showErrorState',
                'templateOptions.disabled': 'formState.disabled',
              },
            },
            {
              fieldGroupClassName: 'row',
              hideExpression: '!model.attributes.hasCapacity',
              fieldGroup: [
                {
                  className: 'col-12',
                  template: `
                    <p>How many of the following items can you currently take?</p>
                  `,
                },
                {
                  key: 'attributes.capacity.laptops',
                  type: 'input',
                  className: 'col-6',
                  defaultValue: 0,
                  hideExpression:
                    '!model.attributes.accepts || model.attributes.accepts.toString().indexOf(\'LAPTOP\') < 0',
                  templateOptions: {
                    min: 0,
                    label: 'Laptops',
                    addonLeft: {
                      class: 'fas fa-laptop',
                    },
                    type: 'number',
                    placeholder: '',
                    required: true,
                  },
                  validation: {
                    show: false,
                  },
                  expressionProperties: {
                    'validation.show': 'model.showErrorState',
                    'templateOptions.disabled': 'formState.disabled',
                  },
                },
                {
                  key: 'attributes.capacity.phones',
                  type: 'input',
                  className: 'col-6',
                  hideExpression:
                    '!model.attributes.accepts || model.attributes.accepts.toString().indexOf(\'PHONE\') < 0',
                  defaultValue: 0,
                  templateOptions: {
                    min: 0,
                    label: 'Phones',
                    addonLeft: {
                      class: 'fas fa-mobile-alt',
                    },
                    type: 'number',
                    placeholder: '',
                    required: true,
                  },
                  validation: {
                    show: false,
                  },
                  expressionProperties: {
                    'validation.show': 'model.showErrorState',
                    'templateOptions.disabled': 'formState.disabled',
                  },
                },
                {
                  key: 'attributes.capacity.tablets',
                  type: 'input',
                  className: 'col-6',
                  defaultValue: 0,
                  hideExpression:
                    '!model.attributes.accepts || model.attributes.accepts.toString().indexOf(\'TABLET\') < 0',
                  templateOptions: {
                    min: 0,
                    label: 'Tablets',
                    addonLeft: {
                      class: 'fas fa-tablet-alt',
                    },
                    type: 'number',
                    placeholder: '',
                    required: true,
                  },
                  validation: {
                    show: false,
                  },
                  expressionProperties: {
                    'validation.show': 'model.showErrorState',
                    'templateOptions.disabled': 'formState.disabled',
                  },
                },
                {
                  key: 'attributes.capacity.allInOnes',
                  type: 'input',
                  className: 'col-6',
                  hideExpression:
                    '!model.attributes.accepts || model.attributes.accepts.toString().indexOf(\'ALLINONE\') < 0',
                  defaultValue: 0,
                  templateOptions: {
                    min: 0,
                    label: 'All In Ones',
                    addonLeft: {
                      class: 'fas fa-desktop',
                    },
                    type: 'number',
                    placeholder: '',
                    required: true,
                  },
                  validation: {
                    show: false,
                  },
                  expressionProperties: {
                    'validation.show': 'model.showErrorState',
                    'templateOptions.disabled': 'formState.disabled',
                  },
                },
                {
                  key: 'attributes.capacity.desktops',
                  type: 'input',
                  className: 'col-6',
                  hideExpression:
                    '!model.attributes.accepts || model.attributes.accepts.toString().indexOf(\'DESKTOP\') < 0',
                  defaultValue: 0,
                  templateOptions: {
                    min: 0,
                    label: 'Desktops',
                    addonLeft: {
                      class: 'fas fa-desktop',
                    },
                    type: 'number',
                    placeholder: '',
                    required: true,
                  },
                  validation: {
                    show: false,
                  },
                  expressionProperties: {
                    'validation.show': 'model.showErrorState',
                    'templateOptions.disabled': 'formState.disabled',
                  },
                },
              ],
            },
          ],
        },
      ],
    },
    {
      key: 'availability',
      type: 'input',
      className: 'col-md-12',
      defaultValue: '',
      templateOptions: {
        label: 'Availability',
        placeholder: '',
        description:
          'Please provide your general availability for attending mettings',
        required: false,
      },
      validation: {
        show: false,
      },
      expressionProperties: {
        'validation.show': 'model.showErrorState',
        'templateOptions.disabled': 'formState.disabled',
      },
    },
  ];


  private queryRef = this.apollo.watchQuery({
    query: QUERY_ENTITY,
    variables: {},
  });

  modal(content) {
    this.modalService.open(content, { centered: true });
  }

  private normalizeData(data: any) {
    if (data.subGroup) {
      if (!Array.isArray(data.subGroup)) {
        data.subGroup = (data.subGroup || '')
          .toString()
          .split(',')
          .filter((value) => value.trim().length > 0);
      }
    } else {
      data.subGroup = [];
    }
    data.attributes = data.attributes || {accepts: []};
    return data;
  }

  private fetchData() {
    if (!this.userId) {
      return;
    }

    this.queryRef
      .refetch({
        id: this.userId,
      })
      .then(
        (res) => {
          if (res.data && res.data['volunteer']) {
            const data = res.data['volunteer'];
            this.model = this.normalizeData(data);
            this.userName = this.model['name'];
          } else {
            this.model = {};
            this.userName = 'Not Found!';
          }
        },
        (err) => {
          this.toastr.warning(
            `
          <small>${err.message}</small>
        `,
            'GraphQL Error',
            {
              enableHtml: true,
              timeOut: 15000,
              disableTimeOut: true,
            }
          );
        }
      );
  }

  ngOnInit() {
    this.sub = this.activatedRoute.params.subscribe((params) => {
      this.userId = +params['userId'];
      this.fetchData();
    });
    this.sub.add(
      this.user$.subscribe((user) => {
        this.user = user;
        this.options.formState.disabled = !(user && user.authorities && user.authorities['write:volunteers']);
      })
    );
  }

  ngOnDestroy() {
    if (this.sub) {
      this.sub.unsubscribe();
    }
  }

  updateEntity(data: any) {
    if (!this.form.valid) {
      this.model['showErrorState'] = true;
      return;
    }
    data.id = this.userId;
    data.subGroup = data.subGroup || [];
    if (data.organizing) {
      if (data.organizing == 'yes') {
        data.subGroup.push('Organizing');
      }
    }
    data.subGroup = (data.subGroup || [])
      .filter((v, i, a) => a.indexOf(v) === i)
      .join(',');
    delete data.organizing;
    this.apollo
      .mutate({
        mutation: UPDATE_ENTITY,
        variables: {
          data,
        },
      })
      .subscribe(
        (res) => {
          this.model = this.normalizeData(res.data['updateVolunteer']);
          this.userName = this.model['name'];
          this.toastr.info(
            `
      <small>Successfully updated volunteer ${this.userName}</small>
      `,
            'Updated Volunteer',
            {
              enableHtml: true,
            }
          );
        },
        (err) => {
          this.toastr.error(
            `
      <small>${err.message}</small>
      `,
            'Update Error',
            {
              enableHtml: true,
            }
          );
        }
      );
  }

  deleteEntity() {
    this.apollo
      .mutate<any>({
        mutation: DELETE_ENTITY,
        variables: { id: this.userId },
      })
      .subscribe(
        (res) => {
          if (res.data.deleteVolunteer) {
            this.toastr.info(
              `
        <small>Successfully deleted volunteer ${this.userName}</small>
        `,
              'User Deleted',
              {
                enableHtml: true,
              }
            );
            this.router.navigate(['/dashboard/volunteers']);
          }
        },
        (err) => {
          this.toastr.error(
            `
      <small>${err.message}</small>
      `,
            'Error Deleting Volunteer',
            {
              enableHtml: true,
            }
          );
        }
      );
  }
}
