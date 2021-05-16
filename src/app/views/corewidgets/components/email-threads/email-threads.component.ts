import { Component, ViewChild, ViewEncapsulation, Input } from '@angular/core';
import { concat, Subject, of, forkJoin, Observable, Subscription, from } from 'rxjs';
import { AppGridDirective } from '@app/shared/modules/grid/app-grid.directive';
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
import { User, UserState } from '@app/state/user/user.state';

const QUERY_ENTITY = gql`
query findAllThreads($query: String, $pageToken: String, $id: String, $labels: [String!]) {
  emailThreads(filter: {
    maxResults: 5
   	query: $query
    pageToken: $pageToken
    id: $id
    labelIds: $labels
  }){
    resultSizeEstimate
    nextPageToken
    threads {
      id
      snippet
      historyId
      messages {
        id
        internalDate
        labelIds
        snippet
        raw
        threadId
        payload {
          body {
            decodedData
          }
          to: headers(keys: ["To"]) {
            name
            value
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
  }
}
`;

@Component({
  selector: 'email-threads',
  styleUrls: ['email-threads.scss'],
  templateUrl: './email-threads.html'
})
export class EmailThreadsComponent {
  @ViewChild(AppGridDirective) grid: AppGridDirective;
  dtOptions: DataTables.Settings = {};
  sub: Subscription;
  table: any;
  selections = {};
  filter = {email: '', threadId: '', labelIds: []};
  entities = [];
  form: FormGroup = new FormGroup({});
  model = {};
  selected = {};
  loading = false;
  pages = {
    nextPageToken: '',
    stack: []
  };
  public user: User;
  @Select(UserState.user) user$: Observable<User>;

  queryRef = this.apollo
  .watchQuery({
    query: QUERY_ENTITY,
    variables: {}
  });

  @Select(CoreWidgetState.query) search$: Observable<string>;

  constructor(
    private modalService: NgbModal,
    private toastr: ToastrService,
    private apollo: Apollo
  ) {

  }

  paginate(next: Boolean) {
    if (next) {
      this.pages.stack.push(this.pages.nextPageToken);
      this.fetchData({pageToken: this.pages.nextPageToken});
    } else {
      const page = this.pages.stack.pop();
      this.fetchData({pageToken: page});
    }
    return false;
  }

  @Input()
  set email(value) {
    this.filter.email = value;
    this.refresh();
  }

  @Input()
  set thread(value) {
    this.filter.threadId = value;
    this.refresh();
  }

  @Input()
  set labelIds(value) {
    this.filter.labelIds = value;
    this.refresh();
  }


  modal(content) {
    this.modalService.open(content, { centered: true, size: 'lg' });
  }

  fetchData(vars = {}) {
    this.loading = true;
    vars['query'] = `${this.filter.email} ${vars['query'] || ''}`.trim();
    vars['id'] = this.filter.threadId;
    vars['labels'] = this.filter.labelIds;
    this.queryRef.refetch(vars).then(res => {
        this.loading = false;
        let data: any = {};
        if (res.data) {
          data = res['data']['emailThreads'];
          this.pages.nextPageToken = data.nextPageToken;
          this.entities = data.threads || [];
          this.entities.forEach(thread => {
            (thread.messages || []).forEach(m => {
              const addr = [].concat(m.payload.to || []).concat(m.payload.from || []);
              m.address = (addr.find(x => x.value.toLowerCase().indexOf('covidtechaid@gmail.com') == -1) || {}).value;
              m.email = (m.address || '').replace(/.*<([^>]+)>/, '$1');
            });
          });
        }
    }, err =>  {
      this.loading = false;
    });
  }


  refresh() {
    this.fetchData();
  }

  ngOnInit() {
    this.sub = this.search$.subscribe(query => {
      this.pages = {
        nextPageToken: '',
        stack: []
      };
      this.fetchData({query: query});
    });
    this.sub.add(this.user$.subscribe(user => {
      this.user = user;
    }));
    this.fetchData();
  }


  ngOnDestroy() {
    if (this.sub) {
      this.sub.unsubscribe();
    }
  }
}
