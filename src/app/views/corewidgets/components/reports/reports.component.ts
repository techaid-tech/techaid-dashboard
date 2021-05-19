import { Component } from '@angular/core';
import gql from 'graphql-tag';
import { Apollo } from 'apollo-angular';
import { DomSanitizer } from '@angular/platform-browser';

const QUERY_ENTITY = gql`
query metabaseDashboard($ids: [ID!]) {
  metabaseDashboard(ids: $ids) {
    id
    token
    url
  }
}
`;

const DASHBOARDS = [
  {id: "3", header: 'Kits'}
];

@Component({
    selector: 'app-reports',
    templateUrl: './reports.html',
    styles: []
  })
  export class ReportsComponent {
      dashboards = [];

      constructor(private apollo: Apollo, private sanitizer: DomSanitizer) {

      }

      private queryRef = this.apollo
      .watchQuery({
        query: QUERY_ENTITY,
        variables: {}
      });

      fetchData(){
        var ref = {};
        DASHBOARDS.forEach(v => {
          ref[v.id] = Object.assign({}, v)
        });

        this.queryRef.refetch({ids: Object.keys(ref)}).then(res => {
          if(res.data && res.data['metabaseDashboard']){
            res.data['metabaseDashboard'].forEach(v => {
              v.url = this.sanitizer.bypassSecurityTrustResourceUrl(`${v.url}#bordered=true&titled=true`)
              ref[v.id]['payload'] = v;
            });
          }
        });
        this.dashboards = Object.values(ref);
      }

      ngOnInit() {
        this.fetchData();
      }
  }

