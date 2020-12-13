import { expect } from 'chai'
import { extractAndMacros, extractOrMacros } from '../src/datasource'

const query = `
select 
  count(x), count(y) 
from 
  $__and(
    find(prefix='kcf/waveform' and tag='\${sensor_id}')
  )
in 
  range(2020-10-16, +1h) 
where 
  $__or(
    node_id in find(prefix='kcf/waveform' and tag='\${sensor_id}')
  ) 
`

describe('templating', () => {
  describe('parse macros', () => {
    it('should extract $__and() macros', () => {
      expect(extractAndMacros(query)).to.deep.eq(
        [
          { 
            start: 39,
            end: 104,
            template: "find(prefix='kcf/waveform' and tag='${sensor_id}')"
          }
        ]
      )
    })

    it('should extract $__or() macros', () => {
      expect(extractOrMacros(query)).to.deep.eq(
        [
          {
            start: 145,
            end: 220,
            template: "node_id in find(prefix='kcf/waveform' and tag='${sensor_id}')"
          }
        ]
      )
    })
  })
})