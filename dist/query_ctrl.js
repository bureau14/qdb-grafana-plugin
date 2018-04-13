System.register(['app/plugins/sdk'], function (_export, _context) {
  "use strict";

  var GrafanaQueryCtrl;
  return {
    setters: [function (_appPluginsSdk) {
      GrafanaQueryCtrl = _appPluginsSdk.QueryCtrl;
    }],
    execute: function () {
      class QueryCtrl extends GrafanaQueryCtrl {
        constructor($scope, $injector) {
          super($scope, $injector);

          this.scope = $scope;
          this.target.target = this.target.target || 'select metric';
          this.target.type = this.target.type || 'timeserie';
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

      _export('default', QueryCtrl);
    }
  };
});