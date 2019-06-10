import { QueryCtrl as GrafanaQueryCtrl } from 'app/plugins/sdk'

export default class QueryCtrl extends GrafanaQueryCtrl {
  static templateUrl = 'partials/query.editor.html'
  static defaultQuery =
    "select min(open) from 'stocks.goldman_sachs' in $__range group by $__interval"

  constructor($scope, $injector) {
    super($scope, $injector)

    this.target.rawSql = this.target.rawSql || QueryCtrl.defaultQuery
  }
}
