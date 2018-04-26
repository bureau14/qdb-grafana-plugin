export default class Datasource {
  constructor(instanceSettings, $q, backendSrv, templateSrv) {
    this.name = instanceSettings.name;
    this.id = instanceSettings.id;

    this.url = 'http://localhost:8080';

    this.$q = $q;
    this.backendSrv = backendSrv;
    this.templateSrv = templateSrv;
  }

  // ---------------------------------------------------------------------------

  doRequest = query => this.backendSrv.datasourceRequest({
    url: `${this.url}/query_exp?query=${query}&date_format=js`,
    method: 'GET',
  });

  transformResponse = (response) => {
    const target = 'select metric';
    const datapoints = response.data.tables[0].results
      .map(([date, sum]) => [sum, Date.parse(date)]);

    return { target, datapoints };
  };

  transformAll = (results) => {
    const data = results.map(this.transformResponse);
    return { data };
  };

  // ---------------------------------------------------------------------------

  query(options) {
    const queries = options.targets
      .filter(x => !x.hide)
      .filter(x => x.rawSql)
      .map(x => x.rawSql);

    if (!queries.length) {
      const data = [];
      return this.$q.when({ data });
    }

    const requests = queries.map(this.doRequest);
    return Promise.all(requests)
      .then(this.transformAll);
  }

  annotationQuery(options) {
    console.log('annotationQuery:', options);
    throw new Error('annotationQuery is not yet implemented.');
  }

  metricFindQuery(query) {
    console.log('metricFindQuery:', query);
    throw new Error('metricFindQuery is not yet implemented.');
  }

  testDatasource() {
    return this.$q.when({
      status: 'success',
      message: 'Data source is working',
      title: 'Success',
    });
  }
}
