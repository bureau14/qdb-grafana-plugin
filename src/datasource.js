export default class Datasource {
  constructor(instanceSettings, $q, backendSrv, templateSrv) {
    const securityEnabled = instanceSettings.jsonData.securityEnabled
    const username = securityEnabled ? instanceSettings.jsonData.name : 'anonymous'
    const usersecret = securityEnabled ? instanceSettings.jsonData.secret : ''

    this.name = instanceSettings.name
    this.id = instanceSettings.id
    this.url = instanceSettings.url
    this.username = username
    this.usersecret = usersecret
    this.token = ''
    this.token_expiry = Date.now()

    this.$q = $q
    this.backendSrv = backendSrv
    this.templateSrv = templateSrv
  }

  async login() {
    try {
      const result = await this.backendSrv.datasourceRequest({
        url: `${this.url}/api/login`,
        method: 'POST',
        data: `{ "username": "${this.username}", "secret_key": "${this.usersecret}" }`,
        headers: {
          'Content-Type': 'application/json'
        }
      })

      this.token = result.data.token
      this.token_expiry = Date.now() + 10 * 60 * 60 * 1000

      const status = 'success'
      const message = 'QuasarDB connection is OK!'
      return { status, message }
    } catch (err) {
      const status = 'error'
      const message = 'Unable to connect to datasource. See console for detailed information.'

      if (process.env.NODE_ENV !== 'dev') {
        console.error('QDB CONNECTION ERROR:', err)
      }

      return { status, message }
    }
  }

  async checkToken() {
    if (this.token === '' || this.token_expiry - Date.now() < 1000) {
      const result = await this.login()

      if (result.status === 'error') {
        throw new Error(result.message)
      }
    }

    return
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
    throw new Error('annotations not yet implemented.')
  }

  metricFindQuery(query) {
    throw new Error('metrics not yet implemented.')
  }

  testDatasource() {
    return this.login()
  }
}
