import { Component, ViewEncapsulation } from '@angular/core';
import { Subscription } from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import gql from 'graphql-tag';
import { Apollo } from 'apollo-angular';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

const QUERY_USER = gql`
query findUser($id: ID!) {
  user(id: $id){
    id: userId
     userId
     phoneNumber
     email
     name
     picture
     lastLogin
  }
}
`;


@Component({
  selector: 'user-info',
  styleUrls: ['user-info.scss'],

  templateUrl: './user-info.html'
})
export class UserInfoComponent {

  constructor(
    private modalService: NgbModal,
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private toastr: ToastrService,
    private apollo: Apollo
  ) {

  }
  sub: Subscription;
  form: FormGroup = new FormGroup({});
  model = {};
  userName: string;
  userId: string;

  private queryRef = this.apollo
    .watchQuery({
      query: QUERY_USER,
      variables: {}
    });

  modal(content) {
    this.modalService.open(content, { centered: true });
  }

  private fetchData() {
    if (!this.userId) {
      return;
    }

    this.queryRef.refetch({
      id: this.userId
    }).then(res => {
      if (res.data && res.data['user']) {
        this.model = res.data['user'];
        this.userName = this.model['name'];
      } else {
        this.model = {};
        this.userName = 'Not Found!';
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
    this.sub = this.activatedRoute.params.subscribe(params => {
      this.userId = params['userId'];
      this.fetchData();
    });
  }

  ngOnDestroy() {
    if (this.sub) {
      this.sub.unsubscribe();
    }
  }
}
