export default class Datasource {
  constructor(instanceSettings, $q, backendSrv, templateSrv) {
    this.name = instanceSettings.name;
    this.id = instanceSettings.id;

    this.$q = $q;
    this.backendSrv = backendSrv;
    this.templateSrv = templateSrv;
  }

  query(options) {
    console.log('QUERY OPTIONS', options);
    throw new Error('Query Support not implemented yet.');
  }

  annotationQuery(options) {
    console.log('ANNOTIATION OPTIONS', options);
    throw new Error('Annotation Support not implemented yet.');
  }

  metricFindQuery(query) {
    console.log('METRIC FIND QUERY', query);
    throw new Error('Template Variable Support not implemented yet.');
  }

  testDatasource() {
    console.log('TEST DATASOURCE');
    return this.$q.when({
      status: 'success',
      message: 'Data source is working',
      title: 'Success',
    });
  }
}
