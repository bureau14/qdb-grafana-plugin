import { QueryCtrl as GrafanaQueryCtrl } from 'app/plugins/sdk'

export default class QueryCtrl extends GrafanaQueryCtrl {
  static templateUrl = 'partials/query.editor.html'
  static defaultQuery = "select avg(low), max(high) from fx.btcusd in $__range group by $__interval"

  constructor($scope, $injector) {
    super($scope, $injector)
    // this.target = this.target
    this.target.rawSql = this.target.rawSql || QueryCtrl.defaultQuery
    this.target.resultFormat = this.target.resultFormat || 'time_series'
    this.resultFormats = [{ text: 'Time series', value: 'time_series' }, { text: 'Table', value: 'table' }];
  }
}
