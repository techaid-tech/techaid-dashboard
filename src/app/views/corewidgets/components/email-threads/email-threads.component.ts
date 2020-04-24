import { Component, ViewChild, ViewEncapsulation, Input } from '@angular/core';
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
query findAllThreads($query: String, $pageToken: String) {
  emailThreads(filter: {
    maxResults: 5
   	query: $query
    pageToken: $pageToken
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
          to: headers(keys: ["To"]) {
            name
            value
          }
          subject: headers(keys: ["Subject"]) {
            name
            value
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
  encapsulation: ViewEncapsulation.None,
  templateUrl: './email-threads.html'
})
export class EmailThreadsComponent {
  @ViewChild(AppGridDirective) grid: AppGridDirective;
  dtOptions: DataTables.Settings = {};
  sub: Subscription;
  table: any;
  selections = {};
  entities = [];
  form: FormGroup = new FormGroup({});
  model = {};
  selected = {};
  loading: boolean = false;
  pages = {
    nextPageToken: "",
    stack: []
  };

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

  paginate(next: Boolean){
    if(next){
      this.pages.stack.push(this.pages.nextPageToken);
      this.fetchData({pageToken: this.pages.nextPageToken});
    }else {
      var page = this.pages.stack.pop();
      this.fetchData({pageToken: page}); 
    }
    return false;
  }

  _email : string
  @Input()
  set email(value){
    this._email = value;
  }

  modal(content) {
    this.modalService.open(content, { centered: true, size: 'lg' });
  }

  fetchData(vars = {}){
    this.loading = true;
    vars["query"] = `${this._email} ${vars['query'] || ''}`;
    this.queryRef.refetch(vars).then(res => {
        this.loading = false;
        var data: any = {};
        if (res.data) {
          data = res['data']['emailThreads'];
          this.pages.nextPageToken = data.nextPageToken;
          this.entities = data.threads;
        }
    }, err =>  {
      this.loading = false;
    });
  }

  ngOnInit() {
    this.sub = this.search$.subscribe(query => {
      this.pages = {
        nextPageToken: "",
        stack: []
      };
      this.fetchData({query: query})
    });
    this.fetchData();
  }


  ngOnDestory() {
    if (this.sub) {
      this.sub.unsubscribe();
    }
  }
}
