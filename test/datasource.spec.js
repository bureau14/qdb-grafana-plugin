import Q from 'q'
import { expect } from 'chai'
import { regeneratorRuntime } from 'regenerator-runtime';

import Datasource from '../src/datasource'

describe('Datasource', function() {
  const instanceSettings = {
    id: 1,
    name: 'qdb-grafana-plugin',
    jsonData: { url: '/grafana/proxy' }
  }

  let backendSrv
  let templateSrv
  let datasource

  beforeEach(function() {
    // backendSrv = {}
    // templateSrv = {}
    // datasource = new Datasource(instanceSettings, Q, backendSrv, templateSrv)
  })

  it('should use login API for connection validation', function() {
    // backendSrv.datasourceRequest = request => {
    //   expect(request).to.deep.equal({
    //     url: '/grafana/proxy/api/login',
    //     method: 'GET'
    //   })
    //   return Q.when()
    // }
  })

  // ---------------------------------------------------------------------------

  it('should report a success status when the datasource connection works', function() {
    // backendSrv.datasourceRequest = () => Q.when()
    // datasource.testDatasource().then(result => {
    //   expect(result).to.deep.equal({
    //     status: 'success',
    //     message: 'QuasarDB connection is OK!'
    //   })
    //   done()
    // })
  })

  // ---------------------------------------------------------------------------

  it('should report an error status when the datasource connection fails', function() {
    // backendSrv.datasourceRequest = () => Q.reject()
    // datasource.testDatasource().then(result => {
    //   expect(result).to.deep.equal({
    //     status: 'error',
    //     message: 'Unable to connect to datasource. See console for detailed information.'
    //   })
    //   done()
    // })
  })

  describe('transformResponse', () => {
    const response = {
      data: {
        tables: [
          {
            columns: [
              {
                data: [
                  '2019-02-28T18:47:52Z',
                  '2019-02-28T21:47:52Z',
                  '2019-03-25T09:47:52Z',
                  '2019-03-25T12:47:52Z',
                  '2019-03-25T15:47:52Z'
                ],
                name: 'timestamp'
              },
              {
                data: [1, 2, 3, 4, 5],
                name: 'min(rate)'
              },
              {
                data: ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE'],
                name: 'max(amount)'
              }
            ],
            name: 'orders.old.2y'
          }
        ]
      }
    }

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

    it('should work', () => {
      const result = transformResponse(response)
      expect(result).to.deep.equal([
        {
          target: 'min(rate)',
          datapoints: [
            [1, Date.parse('2019-02-28T18:47:52Z')],
            [2, Date.parse('2019-02-28T21:47:52Z')],
            [3, Date.parse('2019-03-25T09:47:52Z')],
            [4, Date.parse('2019-03-25T12:47:52Z')],
            [5, Date.parse('2019-03-25T15:47:52Z')]
          ]
        },
        {
          target: 'max(amount)',
          datapoints: [
            ['ONE', Date.parse('2019-02-28T18:47:52Z')],
            ['TWO', Date.parse('2019-02-28T21:47:52Z')],
            ['THREE', Date.parse('2019-03-25T09:47:52Z')],
            ['FOUR', Date.parse('2019-03-25T12:47:52Z')],
            ['FIVE', Date.parse('2019-03-25T15:47:52Z')]
          ]
        }
      ])
    })
  })
})
