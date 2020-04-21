import { Component } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { ToastrService } from 'ngx-toastr';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import gql from 'graphql-tag';
import { FormGroup } from '@angular/forms';
import { FormlyFieldConfig } from '@ngx-formly/core';
import { Router } from '@angular/router';
import { Location } from '@angular/common';

const QUERY_ENTITY = gql`
query find($kitFilter: KitWhereInput!, $volunteerFilter: VolunteerWhereInput!) {
  volunteers(where: $volunteerFilter){
    id
    name
    subGroup
    coordinates {
      lat
      lng
      address
    }
  }
  kits(where: $kitFilter){
    id
    type
    model
    donor {
      name
    }
    coordinates {
      lat
      lng
      address
    }
  }
}
`;

@Component({
  selector: 'map-view',
  styleUrls: ['map-view.scss'],
  templateUrl: './map-view.html'
})
export class MapViewComponent {
  constructor(
    private modalService: NgbModal,
    private toastr: ToastrService,
    private apollo: Apollo,
    private location: Location ) {

  }

  markers: Array<any> = [];
  form: FormGroup = new FormGroup({});
  model = {}

  fields: Array<FormlyFieldConfig> = [
    {
      fieldGroupClassName: "row",
      fieldGroup: [
        {
          key: "type",
          type: "multicheckbox",
          className: "col-md-6",
          templateOptions: {
            label: "Type of device",
            type: "array",
            options: [
              {label: "Laptop", value: "LAPTOP" },
              {label: "Tablet", value: "TABLET" },
              {label: "Smart Phone", value: "SMARTPHONE" },
              {label: "All In One (PC)", value: "ALLINONE" },
              {label: "Other", value: "OTHER" }
            ],
          } 
        },
      ]
    },
    {
      key: "subGroup",
      type: "multicheckbox",
      className: "col-md-6",
      templateOptions: {
        label: "Volunteer Type",
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
        required: false
      } 
    },
  ];

  queryRef = this.apollo
    .watchQuery({
      query: QUERY_ENTITY,
      variables: {}
  });
  
  modal(content) {
    this.modalService.open(content, { centered: true, size: 'lg' });
  }

  back(){
    this.location.back();
  }

  applyFilter(data){
    var filter = {
      "kitFilter": {},
      "volunteerFilter": {}
    };

    if(data.type && data.type) {
      filter["kitFilter"]["type"] = {"_in": data.type };
    }

    if(data.subGroup && data.subGroup.length){
      filter["volunteerFilter"]["OR"] = [];
      data.subGroup.forEach(g => {
          filter["volunteerFilter"]["OR"].push({"subGroup": {"_contains": g}})
      }); 
    }

    console.log(filter, data);
    this.fetchData(filter);
  }

  fetchData(filter){
    var markers = [];
    this.queryRef.refetch(filter).then(res => {
      res.data['volunteers'].forEach(v => {
        if(v.coordinates && v.coordinates.lat){
          const coord = {lat: +v.coordinates.lat, lng: +v.coordinates.lng};
          markers.push({
            position: coord, 
            title: v.name, 
            icon: {
                url: 'https://cdn.mapmarker.io/api/v1/font-awesome/v5/pin?icon=fa-hands-helping&size=50&hoffset=0&voffset=-1&background=4D73DF',
                scaledSize: new google.maps.Size(40,40),
            },
            info: `
            <strong><a href="/dashboard/volunteers/${v.id}">${v.name}</a></strong>
            <div class="mb-1" style="max-width: 100px;">${v.subGroup.split(',').map(g => `<span class="badge badge-primary mr-1">${g}</span>`).join('')}</div>
            <p style="max-width: 100px;">${v.coordinates.address}</p>
          `});
        }
      });
      const types = {
        'LAPTOP': 'https://cdn.mapmarker.io/api/v1/font-awesome/v5/pin?icon=fa-laptop&size=50&hoffset=0&voffset=-1&background=30475E',
        'TABLET': 'https://cdn.mapmarker.io/api/v1/font-awesome/v5/pin?icon=fa-tablet&size=50&hoffset=0&voffset=-1&background=D8345F',
        'SMARTPHONE': 'https://cdn.mapmarker.io/api/v1/font-awesome/v5/pin?icon=fa-mobile&size=50&hoffset=0&voffset=-1&background=DE7118',
        'ALLINONE': 'https://cdn.mapmarker.io/api/v1/font-awesome/v5/pin?icon=fa-tv&size=50&hoffset=0&voffset=-1&background=9C5517'
      };
      res.data['kits'].forEach(k => {
        if(k.coordinates && k.coordinates.lat){
          const coord = {lat: +k.coordinates.lat, lng: +k.coordinates.lng};
          markers.push({
            position: coord, 
            title: k.name, 
            icon: {
                url: types[k.type],
                scaledSize: new google.maps.Size(40,40),
            },
            info: `
            <strong><a href="/dashboard/devices/${k.id}">${k.model}</a></strong>
            <p><span class="badge badge-secondary mr-1">${k.type}</span></p>
            <p style="max-width: 100px;">${k.coordinates.address}</p>
          `});
        }
      });
      this.markers = markers;
    });
  }

  ngOnInit(){
    this.fetchData({kitFilter: {}, volunteerFilter: {}});
  }
}
