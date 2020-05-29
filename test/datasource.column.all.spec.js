import Q from 'q'
import { expect } from 'chai'
import { regeneratorRuntime } from 'regenerator-runtime'
import { Datasource, transformResponse } from '../src/datasource'

describe('Datasource.Column.All', function() {
  const response = {
    data: {
      tables: [
        {
          columns: [
            {
              data: ['2020-01-01T00:00:00Z', '2020-01-01T00:01:00Z'],
              name: 'timestamp',
              type: 'timestamp'
            },
            {
              data: ['YWFh' /* == aaa*/, 'YmJi' /* == bbb*/],
              name: 'col_blob',
              type: 'blob'
            },
            {
              data: [1.1, 2.2],
              name: 'col_double',
              type: 'double'
            },
            {
              data: [1, 2],
              name: 'col_int64',
              type: 'int64'
            },
            {
              data: ['2019-01-01T00:00:00Z', '2019-01-01T00:01:00Z'],
              name: 'col_timestamp',
              type: 'timestamp'
            }
          ],
          name: 'test'
        }
      ]
    }
  }

  it('should work with timeseries format', () => {
    const result = transformResponse(response)
    expect(result).to.deep.equal([
      {
        target: 'col_blob',
        datapoints: [
          ['aaa', Date.parse('2020-01-01T00:00:00Z')],
          ['bbb', Date.parse('2020-01-01T00:01:00Z')]
        ]
      },
      {
        target: 'col_double',
        datapoints: [
          [1.1, Date.parse('2020-01-01T00:00:00Z')],
          [2.2, Date.parse('2020-01-01T00:01:00Z')]
        ]
      },
      {
        target: 'col_int64',
        datapoints: [
          [1, Date.parse('2020-01-01T00:00:00Z')],
          [2, Date.parse('2020-01-01T00:01:00Z')]
        ]
      },
      {
        target: 'col_timestamp',
        datapoints: [
          [Date.parse('2019-01-01T00:00:00Z'), Date.parse('2020-01-01T00:00:00Z')],
          [Date.parse('2019-01-01T00:01:00Z'), Date.parse('2020-01-01T00:01:00Z')]
        ]
      }
    ])
  })

  it('should work with table format', () => {
    let res = response
    res.data.format = 'table'
    const result = transformResponse(res)
    expect(result).to.deep.equal([
      {
        columns: [
          {
            text: 'timestamp',
            type: 'time'
          },
          {
            text: 'col_blob'
          },
          {
            text: 'col_double'
          },
          {
            text: 'col_int64'
          },
          {
            text: 'col_timestamp',
            type: 'time'
          }
        ],
        rows: [
          [Date.parse('2020-01-01T00:00:00Z'), 'aaa', 1.1, 1, Date.parse('2019-01-01T00:00:00Z')],
          [Date.parse('2020-01-01T00:01:00Z'), 'bbb', 2.2, 2, Date.parse('2019-01-01T00:01:00Z')]
        ],
        type: 'table'
      }
    ])
  })
})
