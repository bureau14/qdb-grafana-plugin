System.register(['./datasource', './query_ctrl', './config_ctrl'], function (_export, _context) {
  "use strict";

  return {
    setters: [function (_datasource) {
      var _exportObj = {};
      _exportObj.Datasource = _datasource.default;

      _export(_exportObj);
    }, function (_query_ctrl) {
      var _exportObj2 = {};
      _exportObj2.QueryCtrl = _query_ctrl.default;

      _export(_exportObj2);
    }, function (_config_ctrl) {
      var _exportObj3 = {};
      _exportObj3.ConfigCtrl = _config_ctrl.default;

      _export(_exportObj3);
    }],
    execute: function () {}
  };
});