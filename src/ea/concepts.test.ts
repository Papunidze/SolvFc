import { describe, expect, it } from 'vitest'
import { conceptQueries } from './concepts'

describe('conceptQueries', () => {
  it('searches the required quality when every player must share it', () => {
    const queries = conceptQueries({ slots: Array(11).fill(0), requirements: [{ kind: 'count', filter: { qualities: ['bronze'] }, scope: 'min', count: 11 }] })
    expect(queries).toEqual([{ level: 'bronze' }])
  })

  it('searches every quality plus each required league, nation or club', () => {
    const queries = conceptQueries({
      slots: Array(11).fill(0),
      requirements: [
        { kind: 'count', filter: { leagueIds: [13] }, scope: 'min', count: 2 },
        { kind: 'count', filter: { nationIds: [14] }, scope: 'max', count: 1 },
      ],
    })
    expect(queries).toEqual([{ level: 'bronze' }, { level: 'silver' }, { level: 'gold' }, { level: undefined, leagueId: 13 }])
  })
})
