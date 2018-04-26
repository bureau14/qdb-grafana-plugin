import { QueryCtrl as GrafanaQueryCtrl } from 'app/plugins/sdk';

export default class QueryCtrl extends GrafanaQueryCtrl {
  static templateUrl = 'partials/query.editor.html';
  // static defaultQuery = 'select 1 from test in range (2000, 2020)';
  static defaultQuery = 'select sum(bidSize) from test in range(2017-10-12T08:45:00, 2017-10-12T09:35:00) group by 30s';

  constructor($scope, $injector) {
    super($scope, $injector);

    this.target.rawSql =
      this.target.rawSql || QueryCtrl.defaultQuery;
  }
}
