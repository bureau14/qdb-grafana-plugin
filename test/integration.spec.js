import { expect } from 'chai'
import qs  from 'qs'
import Datasource, { transformResponse } from '../src/datasource'

const fetch = require('node-fetch')
const http = require('http')
const agent = new http.Agent({
  rejectUnauthorized: false
})
const basic_options = {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  mode: 'cors',
  agent: agent
}

const login = async () => {
  var options = basic_options
  options.body = JSON.stringify({ username: '', secret_key: '' })
  const response = await fetch('http://localhost:40080/api/login', options)
  const data = await response.json()
  return data.token
}

const query = async (token, query) => {
  var options = basic_options
  options.headers.Authorization = 'Bearer ' + token
  options.body = JSON.stringify({ query: query })
  return await fetch('http://localhost:40080/api/query', options)
}

const delete_table = async token => {
  await query(token, 'drop table aaa')
}

const create_table = async token => {
  await query(
    token,
    'create table aaa(blob_col blob, double_col double, int_col int64, string_col string, timestamp_col timestamp)'
  )
}

const insert_data = async token => {
  await query(
    token,
    "insert into aaa($timestamp, blob_col, double_col, int_col, string_col, timestamp_col) values(2020-01-01, 'blob_value', 1.1, 1, 'string_value', 2029-01-01)"
  )
}

const prepare_data = async token => {
  await delete_table(token)
  await create_table(token)
  await insert_data(token)
}

const prepare = async () => {
  const token = await login()
  await prepare_data(token)
  const response = await query(
    token,
    'select $timestamp, $table, blob_col, double_col, int_col, string_col, timestamp_col from aaa;'
  )
  const data = await response.json()
  var res = { data: data }
  res.data.format = 'table'
  return res
}

const testDatasource = (url) => {
  let mockInstanceSettings = {
    name: 'mockname',
    id: 'mockid',
    url,
    jsonData : {
      name: 'anonymous',
      secret: '',
      securityEnabled: false
    }
  }
  let mock$Q = null
  let mockBackendSrv = {
    datasourceRequest: async ({ url, method, data = '', params = {}, headers = {}}) => {
      let options = {
        headers,
        method,
        mode: 'no-cors'
      }

      if (method != 'GET') {
        options['body'] = data
      }

      let resp = await fetch(`${url}?${qs.stringify(params)}`, options)
      let status = resp.status
      let respData = await resp.json()

      return {
        status,
        data: respData
      }
    }
  }
  let mockTemplateSrv = null

  return new Datasource(mockInstanceSettings, mock$Q, mockBackendSrv, mockTemplateSrv)
}

describe('Integration', () => {
  it('should work with the rest api', async () => {
    const res = await prepare()
    const result = transformResponse(res)
    expect(result).to.deep.equal([
      {
        columns: [
          {
            text: '$timestamp',
            type: 'time'
          },
          {
            text: '$table'
          },
          {
            text: 'blob_col'
          },
          {
            text: 'double_col'
          },
          {
            text: 'int_col'
          },
          {
            text: 'string_col'
          },
          {
            text: 'timestamp_col',
            type: 'time'
          }
        ],
        rows: [
          [
            Date.parse('2020-01-01'),
            'aaa',
            'blob_value',
            1.1,
            1,
            'string_value',
            Date.parse('2029-01-01')
          ]
        ],
        type: 'table'
      }
    ])
  })
})

describe('Tag Queries', () => {
  it('should fetch all the tags', async () => {
    let ds = testDatasource('http://localhost:40080')
    let result = await ds.metricFindQuery('show tags')
    expect(result).to.deep.equal([ { text: 'tag_01' }, { text: 'tag_02' }, { text: 'tag_03' } ])
  })


  it('should filter the tags if a where clause is given', async () => {
    let ds = testDatasource('http://localhost:40080')
    let result = await ds.metricFindQuery('show tags where tag ~ tag_0[1|3]')
    expect(result).to.deep.equal([ { text: 'tag_01' }, { text: 'tag_03' } ])
  })
})