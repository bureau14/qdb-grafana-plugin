import { expect } from 'chai'
import { regeneratorRuntime } from 'regenerator-runtime'
import { transformResponse } from '../src/datasource'

describe('Datasource.Column.Timestamp', function() {
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
              data: ['2019-01-01T00:00:00Z', '2019-01-01T00:01:00Z'],
              name: 'col',
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
        target: 'col',
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
            text: 'col',
            type: 'time'
          }
        ],
        rows: [
          [Date.parse('2020-01-01T00:00:00Z'), Date.parse('2019-01-01T00:00:00Z')],
          [Date.parse('2020-01-01T00:01:00Z'), Date.parse('2019-01-01T00:01:00Z')]
        ],
        type: 'table'
      }
    ])
  })
})