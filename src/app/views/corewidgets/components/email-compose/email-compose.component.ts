import { Component, Input, ViewChild } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { FormlyFormOptions, FormlyFieldConfig } from '@ngx-formly/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastrService } from 'ngx-toastr';
import { Apollo } from 'apollo-angular';
import { Location } from '@angular/common';
import gql from 'graphql-tag';
import { Subscription } from 'rxjs';
import { Router, ActivatedRoute } from '@angular/router';
import { EmailThreadsComponent } from '../email-threads/email-threads.component';

const SEND_EMAIL = gql`
mutation sendEmail($data: EmailInput!) {
  sendEmail(data: $data){
    id
    internalDate
    labelIds
    snippet
    raw
    threadId
    payload {
        to: headers(keys: ["To"]) {
        name
        value
        }
        subject: headers(keys: ["Subject"]) {
        name
        value
        }
        html: content(mimeType: "text/html") {
        body {
            decodedData
        }
        }
        text: content(mimeType: "text/plain") {
        body {
            decodedData
        }
        }
        parts {
        mimeType
        body {
            decodedData
        }
        }
    }
  }
}
`;

const REPLY_EMAIL = gql`
mutation replyEmail($id: ID!, $data: EmailInput!) {
  replyEmail(id: $id, data: $data){
    id
    internalDate
    labelIds
    snippet
    raw
    threadId
    payload {
        to: headers(keys: ["To"]) {
        name
        value
        }
        subject: headers(keys: ["Subject"]) {
        name
        value
        }
        html: content(mimeType: "text/html") {
        body {
            decodedData
        }
        }
        text: content(mimeType: "text/plain") {
        body {
            decodedData
        }
        }
        parts {
        mimeType
        body {
            decodedData
        }
        }
    }
  }
}
`;

const QUERY_EMAIL = gql`
query findEmail($id: ID!) {
  email(id: $id){
    id
    internalDate
    payload {
        body {
        decodedData
        }
        from: headers(keys: ["From"]) {
            name
            value
        }
        subject: headers(keys: ["Subject"]) {
            name
            value
        }
        html: content(mimeType: "text/html") {
            body {
                decodedData
            }
        }
        text: content(mimeType: "text/plain") {
            body {
                decodedData
            }
        }
        parts {
            mimeType
            body {
                decodedData
            }
        }
    }
  }
}
`;


@Component({
  selector: 'email-compose',
  styleUrls: ['email-compose.scss'],
  templateUrl: './email-compose.html'
})
export class EmailComposeComponent {
    @ViewChild('threads') emailThreads: EmailThreadsComponent;
    @ViewChild('quote') quoted: any;

    form: FormGroup = new FormGroup({});
    options: FormlyFormOptions = {};
    model : any = {};
    messageThread: any = {};
    message: any = {};
    sub: Subscription;
    fields: Array<FormlyFieldConfig> = [
        {
            key: "to",
            type: "input",
            className: "col-md-12",
            defaultValue: "",
            templateOptions: {
              placeholder: "Subject",
              required: true,
              addonLeft: {
                  class: 'fa fa-envelope',
              }
            }
        },
        {
            key: "subject",
            type: "input",
            className: "col-md-12",
            defaultValue: "",
            templateOptions: {
              placeholder: "Subject",
              required: true,
            },
            hideExpression: "model.messageId"
        },
        {
            key: "body",
            type: "richtext",
            className: "col-md-12",
            defaultValue: "",
            templateOptions: {
              label: "",
              placeholder: "",
              required: false,
              htmlEdit: false
            }
          },
    ];

    constructor(
        private modalService: NgbModal,
        private toastr: ToastrService,
        private apollo: Apollo,
        private router: Router,
        private activatedRoute: ActivatedRoute,
        private location: Location ) {
    
      }

    ngOnInit(){
        const queryRef = this.apollo
        .watchQuery({
          query: QUERY_EMAIL,
          variables: {}
        });

        this.sub = this.activatedRoute.queryParams.subscribe(params => {
            if(params.to){
                this.model.to = params.to;
                this.model.email = params.to;
                this.fields[0].templateOptions.readonly = true;
            }
            this.model.thread = params.thread;
            this.model.messageId = params.id;
            if(params.id) {
               queryRef.refetch({
                   id: params.id
               }).then(res => {
                   if(res && res.data && res.data['email']){
                      this.message = res.data['email'];
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
        });
    }

    ngOnDestory() {
        if (this.sub) {
          this.sub.unsubscribe();
        }
    }

    @Input()
    to(value: String) {
        this.model.to = value;
    } 

    @Input()
    subject(value: String) {
        this.model.subject = value;
    }

    @Input()
    thread(value: any){
        this.messageThread = value;
    }

    back(){
        this.location.back();
    }

    save(data: any){
        if(this.model.messageId && this.model.messageId.length){
            this.quoted.nativeElement.innerHTML
            if(this.quoted && this.quoted.nativeElement && this.quoted.nativeElement.innerHTML){
                data.body = `${data.body} <div><br /></div><br />${this.quoted.nativeElement.innerHTML}`
            }
            this.replyEmail(data);
            return;
        }
        this.sendEmail(data);
    }

    replyEmail(data: any){
        data.mimeType = 'html';
        data.subject = data.subject || "";
        this.apollo.mutate({
            mutation: REPLY_EMAIL,
            variables: {
                data: data,
                id: this.model.messageId
            } 
         }).subscribe(res => {
            this.emailThreads.refresh();
            if(res.data.replyEmail){
                this.form.setValue({
                    body: "",
                    to: this.model.to,
                });
                this.router.navigate(['/dashboard/email'], {
                    queryParams: {
                        id: res.data.replyEmail.id,
                        thread: this.model.thread,
                        to: this.model.to
                    }
                });
            }
        }, err => {
        this.toastr.error(`
        <small>${err.message}</small>
        `, 'Error sending message', {
            enableHtml: true,
            timeOut: 15000
            });
        });
    }

    sendEmail(data: any){
        data.mimeType = 'html';
        data.subject = data.subject || "";
        this.apollo.mutate({
            mutation: SEND_EMAIL,
            variables: {data} 
         }).subscribe(res => {
            this.emailThreads.refresh();
            if(res.data.sendEmail){
                this.message = data.sendEmail;
                this.form.setValue({
                    body: "",
                    to: this.model.to,
                });
                this.router.navigate(['/dashboard/email'], {
                    queryParams: {
                        id: res.data.replyEmail.id,
                        thread: this.model.thread,
                        to: this.model.to
                    }
                });
            }
        }, err => {
        this.toastr.error(`
        <small>${err.message}</small>
        `, 'Error sending message', {
            enableHtml: true,
            timeOut: 15000
            });
        });
    }
}
