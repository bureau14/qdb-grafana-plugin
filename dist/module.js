'use strict';

System.register(['./datasource', './query_ctrl', './config_ctrl'], function (_export, _context) {
  "use strict";

  var AnnotationsQueryCtrl;

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

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
    execute: function () {
      _export('AnnotationsQueryCtrl', AnnotationsQueryCtrl = function AnnotationsQueryCtrl() {
        _classCallCheck(this, AnnotationsQueryCtrl);
      });

      _export('AnnotationsQueryCtrl', AnnotationsQueryCtrl);

      AnnotationsQueryCtrl.templateUrl = 'partials/annotations.editor.html';
    }
  };
});
//# sourceMappingURL=module.js.map