export default class Datasource {
  constructor(instanceSettings, $q, backendSrv, templateSrv) {
    this.name = instanceSettings.name
    this.id = instanceSettings.id

    this.url = instanceSettings.jsonData.url
    this.securityEnabled = instanceSettings.jsonData.securityEnabled
    this.username =
      this.securityEnabled && instanceSettings.jsonData.name
        ? instanceSettings.jsonData.name
        : 'anonymous'
    this.usersecret =
      this.securityEnabled && instanceSettings.jsonData.secret
        ? instanceSettings.jsonData.secret
        : ''

    this.token = ''
    this.token_expiry = Date.now()

    this.$q = $q
    this.backendSrv = backendSrv
    this.templateSrv = templateSrv
  }

  login = () =>
    this.backendSrv
      .datasourceRequest({
        url: `${this.url}/api/login`,
        method: 'POST',
        data: `{ "username": "${this.username}", "secret_key": "${this.usersecret}" }`,
        headers: {
          'Content-Type': 'application/json'
        }
      })
      .then(result => {
        console.log('Getting token')
        console.log(result)
        this.token = result.data.token
        this.token_expiry =
          Date.now() +
          10 /* hours */ * 60 /* minutes */ * 60 /* seconds */ * 1000 /* milliseconds */
        const status = 'success'
        const message = 'QuasarDB connection is OK!'

        return { status, message }
      })
      .catch(err => {
        const status = 'error'
        const message =
          'Unable to connect to datasource. ' + 'See console for detailed information.'

        if (process.env.NODE_ENV !== 'test') {
          // eslint-disable-next-line no-console
          console.error('QDB CONNECTION ERROR:', err)
        }

        return { status, message }
      })

  // eslint-disable-next-line consistent-return
  checkToken = () => {
    const _this = this
    return this.$q(function(resolve, reject) {
      if (_this.token === '' || _this.token_expiry - Date.now() < 1000) {
        _this.login().then(function(result) {
          if (result.status === 'error') {
            reject(result)
          } else {
            resolve()
          }
        })
      } else {
        resolve()
      }
    })
  }

  doQuery = query =>
    this.backendSrv.datasourceRequest({
      url: `${this.url}/api/query`,
      method: 'POST',
      data: `{ "query" : "${query}" }`,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`
      }
    })

  doQueries = queries => Promise.all(queries.map(this.doQuery))

  getVariables = options => {
    const toValue = x => ({
      text: x,
      value: x
    })

    const replaceInterval = x => (x.slice(-1) === 'm' ? `${x}in` : x)

    const range = {
      from: options.range.from.utc().format('YYYY-MM-DD[T]HH:mm:ss'),
      to: options.range.to.utc().format('YYYY-MM-DD[T]HH:mm:ss')
    }

    const vars = {
      __from: range.from,
      __to: range.to,
      __range: `range(${range.from}, ${range.to})`
    }

    if (options.scopedVars && options.scopedVars.__interval) {
      const { value } = options.scopedVars.__interval
      vars.__interval = replaceInterval(value)
    }

    return {
      ...options.scopedVars,
      ...Object.keys(vars)
        .map(key => ({ [key]: toValue(vars[key]) }))
        .reduce((x, y) => ({ ...y, ...x }), {})
    }
  }

  query(options) {
    const _this = this
    const transformResponse = response => {
      const result = response.data
      if (result.tables.length === 0) {
        return []
      }
      const table = result.tables[0]
      const timestamps = table.columns[0].data

      let results = []

      for (let i = 1; i < table.columns.length; i++) {
        const target = table.columns[i].name
        const datapoints = table.columns[i].data.map((value, idx) => [
          value,
          Date.parse(timestamps[idx])
        ])
        results.push({ target, datapoints })
      }

      return results
    }

    const transformAll = results => {
      const data = results.map(transformResponse).reduce((a, b) => [...a, ...b], [])
      return { data }
    }

    const variables = this.getVariables(options)
    const queries = options.targets
      .filter(x => !x.hide && x.rawSql)
      .map(x => this.templateSrv.replace(x.rawSql, variables))

    if (!queries.length) {
      const data = []
      return this.$q.when({ data })
    }

    return this.checkToken().then(function() {
      return _this.doQueries(queries).then(results => {
        console.log(transformAll(results))
        return transformAll(results)
      })
    })
  }

  annotationQuery(options) {
    const _this = this
    const transformResponse = response => {
      if (!response.data.tables.length) {
        return []
      }

      const data = response.data.tables[0]

      return data.columns.map(column => {
        const { annotation } = options
        const { title } = column.name
        const { text } = column.name
        const { tags } = []

        const time = Date.parse(data.columns[0].data[0])

        return { annotation, time, title, text, tags }
      })
    }

    const rawQuery = options.annotation.query

    if (!rawQuery) {
      const message = 'Query missing in annotation definition'
      return this.$q.reject({ message })
    }

    const variables = this.getVariables(options)
    const query = this.templateSrv.replace(rawQuery, variables)

    return this.checkToken().then(function() {
      return _this.doQuery(query).then(transformResponse)
    })
  }

  metricFindQuery(query) {
    console.log('metricFindQuery:', query)
    throw new Error('metricFindQuery is not yet implemented.')
  }

  testDatasource() {
    return this.login()
  }
}
