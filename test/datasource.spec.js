import Q from 'q'
import { expect } from 'chai'
import { regeneratorRuntime } from 'regenerator-runtime'

import { Datasource, transformResponse } from '../src/datasource'

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

    it('should work with table format', () => {
      let tableResponse = response
      tableResponse.data.format = 'table'
      const result = transformResponse(tableResponse)
      expect(result).to.deep.equal([
        {
          columns: [
            {
              text: 'timestamp',
              type: 'time'
            },
            {
              text: 'min(rate)'
            },
            {
              text: 'max(amount)'
            }
          ],
          rows: [
            [Date.parse('2019-02-28T18:47:52Z'), 1, 'ONE'],
            [Date.parse('2019-02-28T21:47:52Z'), 2, 'TWO'],
            [Date.parse('2019-03-25T09:47:52Z'), 3, 'THREE'],
            [Date.parse('2019-03-25T12:47:52Z'), 4, 'FOUR'],
            [Date.parse('2019-03-25T15:47:52Z'), 5, 'FIVE']
          ],
          type: 'table'
        }
      ])
    })

    const durationResponse = {
      data: {
        tables: [
          {
            columns: [
              {
                data: [
                  '1970-01-01T00:00:00Z',
                  '1970-01-01T00:01:00Z',
                  '1970-01-01T00:02:00Z',
                  '1970-01-01T00:03:00Z',
                  '1970-01-01T00:04:00Z'
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
    it('should work with a duration timestamp', () => {
      const result = transformResponse(durationResponse)
      expect(result).to.deep.equal([
        {
          target: 'min(rate)',
          datapoints: [[1, 0], [2, 60000], [3, 120000], [4, 180000], [5, 240000]]
        },
        {
          target: 'max(amount)',
          datapoints: [
            ['ONE', 0],
            ['TWO', 60000],
            ['THREE', 120000],
            ['FOUR', 180000],
            ['FIVE', 240000]
          ]
        }
      ])
    })

    it('should work with a duration timestamp with a table format', () => {
      let tableResponse = durationResponse
      tableResponse.data.format = 'table'
      const result = transformResponse(tableResponse)
      expect(result).to.deep.equal([
        {
          columns: [
            {
              text: 'timestamp'
            },
            {
              text: 'min(rate)'
            },
            {
              text: 'max(amount)'
            }
          ],
          rows: [
            [0, 1, 'ONE'],
            [60000, 2, 'TWO'],
            [120000, 3, 'THREE'],
            [180000, 4, 'FOUR'],
            [240000, 5, 'FIVE']
          ],
          type: 'table'
        }
      ])
    })

    const responseWithTimestampValue = {
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
                data: [
                  '2019-02-28T18:47:52Z',
                  '2019-02-28T21:47:52Z',
                  '2019-03-25T09:47:52Z',
                  '2019-03-25T12:47:52Z',
                  '2019-03-25T15:47:52Z'
                ],
                name: 'reception'
              }
            ],
            name: 'orders.old.2y'
          }
        ]
      }
    }
    it('should work with a timestamp as value', () => {
      const result = transformResponse(responseWithTimestampValue)
      expect(result).to.deep.equal([
        {
          target: 'reception',
          datapoints: [
            [Date.parse('2019-02-28T18:47:52Z'), Date.parse('2019-02-28T18:47:52Z')],
            [Date.parse('2019-02-28T21:47:52Z'), Date.parse('2019-02-28T21:47:52Z')],
            [Date.parse('2019-03-25T09:47:52Z'), Date.parse('2019-03-25T09:47:52Z')],
            [Date.parse('2019-03-25T12:47:52Z'), Date.parse('2019-03-25T12:47:52Z')],
            [Date.parse('2019-03-25T15:47:52Z'), Date.parse('2019-03-25T15:47:52Z')]
          ]
        }
      ])
    })

    it('should work with a timestamp as value with a table format', () => {
      let tableResponse = responseWithTimestampValue
      tableResponse.data.format = 'table'
      const result = transformResponse(tableResponse)
      expect(result).to.deep.equal([
        {
          columns: [
            {
              text: 'timestamp',
              type: 'time'
            },
            {
              text: 'reception',
              type: 'time'
            }
          ],
          rows: [
            [Date.parse('2019-02-28T18:47:52Z'), Date.parse('2019-02-28T18:47:52Z')],
            [Date.parse('2019-02-28T21:47:52Z'), Date.parse('2019-02-28T21:47:52Z')],
            [Date.parse('2019-03-25T09:47:52Z'), Date.parse('2019-03-25T09:47:52Z')],
            [Date.parse('2019-03-25T12:47:52Z'), Date.parse('2019-03-25T12:47:52Z')],
            [Date.parse('2019-03-25T15:47:52Z'), Date.parse('2019-03-25T15:47:52Z')]
          ],
          type: 'table'
        }
      ])
    })
  })
})
