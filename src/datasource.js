function zipObject(keys, values) {
  const reducer = (acc, key, idx) => ({
    ...acc,
    [key]: values[idx],
  });

  return keys.reduce(reducer, {});
}

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

  doQuery = query => this.backendSrv.datasourceRequest({
    url: `${this.url}/query_exp?query=${encodeURIComponent(query)}&date_format=js`,
    method: 'GET',
  });

  doQueries = queries => Promise.all(queries.map(this.doQuery));

  getVariables = (options) => {
    const toValue = x => ({
      text: x,
      value: x,
    });

    const replaceInterval = x => (
      x.slice(-1) === 'm'
        ? `${x}in`
        : x
    );

    const range = {
      from: options.range.from.utc().format('YYYY-MM-DD[T]HH:mm:ss'),
      to: options.range.to.utc().format('YYYY-MM-DD[T]HH:mm:ss'),
    };

    const vars = {
      __from: range.from,
      __to: range.to,
      __range: `range(${range.from}, ${range.to})`,
    };

    if (options.scopedVars && options.scopedVars.__interval) {
      const { value } = options.scopedVars.__interval;
      vars.__interval = replaceInterval(value);
    }

    return {
      ...options.scopedVars,
      ...Object.keys(vars)
        .map(key => ({ [key]: toValue(vars[key]) }))
        .reduce((x, y) => ({ ...y, ...x }), {}),
    };
  };

  // ---------------------------------------------------------------------------

  query(options) {
    const transformResponse = (response) => {
      const { tables } = response.data;
      const results = tables[0] ? tables[0].results : [];

      const target = 'select metric';
      const datapoints = results.map(([date, sum]) => [sum, Date.parse(date)]);

      return { target, datapoints };
    };

    const transformAll = (results) => {
      const data = results.map(transformResponse);
      return { data };
    };

    const variables = this.getVariables(options);
    const queries = options.targets
      .filter(x => (!x.hide && x.rawSql))
      .map(x => this.templateSrv.replace(x.rawSql, variables));

    if (!queries.length) {
      const data = [];
      return this.$q.when({ data });
    }

    return this.doQueries(queries).then(transformAll);
  }

  annotationQuery(options) {
    const transformResponse = (response) => {
      if (!response.data.tables.length) {
        return [];
      }

      const data = response.data.tables[0];
      const keys = data.columns_names;

      return data.results.map((result) => {
        const obj = zipObject(keys, result);

        const { annotation } = options;
        const { title, text } = obj;

        const time = Date.parse(obj.timestamp);
        const tags = obj.tags
          ? obj.tags.trim().split(/\s*,\s*/)
          : [];

        return { annotation, time, title, text, tags };
      });
    };

    const rawQuery = options.annotation.query;

    if (!rawQuery) {
      const message = 'Query missing in annotation definition';
      return this.$q.reject({ message });
    }

    const variables = this.getVariables(options);
    const query = this.templateSrv.replace(rawQuery, variables);

    return this.doQuery(query).then(transformResponse);
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
