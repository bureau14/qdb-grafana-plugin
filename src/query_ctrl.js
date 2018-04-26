import { QueryCtrl as GrafanaQueryCtrl } from 'app/plugins/sdk';

export default class QueryCtrl extends GrafanaQueryCtrl {
  static templateUrl = 'partials/query.editor.html';

  constructor($scope, $injector) {
    super($scope, $injector);

    this.scope = $scope;
    this.target.target = this.target.target || 'select metric';
    this.target.type = this.target.type || 'timeserie';

    if (!this.target.rawSql) {
      // this.target.rawSql = 'select 1 from test in range (2000, 2020)';
      this.target.rawSql = 'select sum(bidSize) from test in range(2017-10-12T08:45:00, 2017-10-12T09:35:00) group by 30s';
    }
  }

  getOptions(query) {
    return this.datasource.metricFindQuery(query || '');
  }

  toggleEditorMode() {
    this.target.rawQuery = !this.target.rawQuery;
  }

  onChangeInternal() {
    this.panelCtrl.refresh();
  }
}
