System.register([], function (_export, _context) {
  "use strict";

  return {
    setters: [],
    execute: function () {
      class Datasource {
        constructor(instanceSettings, backendSrv, templateSrv, $q) {
          this.name = instanceSettings.name;
          this.id = instanceSettings.id;

          this.backendSrv = backendSrv;
          this.templateSrv = templateSrv;
          this.$q = $q;
        }

        query(options) {
          throw new Error('Query Support not implemented yet.');
        }

        annotationQuery(options) {
          throw new Error('Annotation Support not implemented yet.');
        }

        metricFindQuery(query) {
          throw new Error('Template Variable Support not implemented yet.');
        }

        testDatasource() {
          return this.$q.when({
            status: 'error',
            message: 'Data Source is just a template and has not been implemented yet.',
            title: 'Error'
          });
        }
      }

      _export('default', Datasource);
    }
  };
});