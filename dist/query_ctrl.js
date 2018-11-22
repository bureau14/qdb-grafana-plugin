'use strict';

System.register(['app/plugins/sdk'], function (_export, _context) {
  "use strict";

  var GrafanaQueryCtrl, QueryCtrl;

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  function _possibleConstructorReturn(self, call) {
    if (!self) {
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }

    return call && (typeof call === "object" || typeof call === "function") ? call : self;
  }

  function _inherits(subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
      throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
    }

    subClass.prototype = Object.create(superClass && superClass.prototype, {
      constructor: {
        value: subClass,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
    if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
  }

  return {
    setters: [function (_appPluginsSdk) {
      GrafanaQueryCtrl = _appPluginsSdk.QueryCtrl;
    }],
    execute: function () {
      QueryCtrl = function (_GrafanaQueryCtrl) {
        _inherits(QueryCtrl, _GrafanaQueryCtrl);

        function QueryCtrl($scope, $injector) {
          _classCallCheck(this, QueryCtrl);

          var _this = _possibleConstructorReturn(this, (QueryCtrl.__proto__ || Object.getPrototypeOf(QueryCtrl)).call(this, $scope, $injector));

          _this.target.rawSql = _this.target.rawSql || QueryCtrl.defaultQuery;
          return _this;
        }
        // static defaultQuery = 'select 1 from test in range (2000, 2020)';
        // static defaultQuery = 'select sum(bidSize) from test in $__range group by $__interval';
        // static defaultQuery = 'select min(byteSendRate) from "network_baseline_network_windows_lons111003_infra" in $__range group by $__interval'


        return QueryCtrl;
      }(GrafanaQueryCtrl);

      QueryCtrl.templateUrl = 'partials/query.editor.html';
      QueryCtrl.defaultQuery = 'select min(open) from "stocks.goldman_sachs" in $__range group by $__interval';

      _export('default', QueryCtrl);
    }
  };
});
//# sourceMappingURL=query_ctrl.js.map