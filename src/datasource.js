export default class Datasource {
  constructor(instanceSettings, $q, backendSrv, templateSrv) {
    this.name = instanceSettings.name;
    this.id = instanceSettings.id;

    this.url = instanceSettings.url;

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
    return this.backendSrv.datasourceRequest({
      url: `${this.url}/global_status`,
      method: 'GET',
    })
      .then(() => {
        const status = 'success';
        const message = 'QuasarDB connection is OK!';

        return { status, message };
      })
      .catch((err) => {
        const status = 'error';
        const message =
          'Unable to connect to datasource. ' +
          'See console for detailed information.';

        if (process.env.NODE_ENV !== 'test') {
          // eslint-disable-next-line no-console
          console.error('QDB CONNECTION ERROR:', err);
        }

        return { status, message };
      });
  }
}
