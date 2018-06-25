import { QueryCtrl as GrafanaQueryCtrl } from 'app/plugins/sdk';

export default class QueryCtrl extends GrafanaQueryCtrl {
  static templateUrl = 'partials/query.editor.html';
  // static defaultQuery = 'select 1 from test in range (2000, 2020)';
    // static defaultQuery = 'select sum(bidSize) from test in $__range group by $__interval';
    // static defaultQuery = 'select min(byteSendRate) from "network_baseline_network_windows_lons111003_infra" in $__range group by $__interval'
  static defaultQuery = 'select min(open) from "stocks.goldman_sachs" in $__range group by $__interval';

  constructor($scope, $injector) {
    super($scope, $injector);

    this.target.rawSql =
      this.target.rawSql || QueryCtrl.defaultQuery;
  }
}
