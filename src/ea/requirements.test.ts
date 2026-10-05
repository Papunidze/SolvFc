import { describe, expect, it } from 'vitest'
import { toRequirement, toScoreChallenge, UnsupportedRequirementError } from './requirements'

describe('toRequirement', () => {
  it('maps team rating scopes', () => {
    expect(toRequirement({ key: 'TEAM_RATING', scope: 'GREATER', count: -1, values: [84] }, 11)).toEqual({ kind: 'teamRating', scope: 'min', value: 84 })
    expect(toRequirement({ key: 'TEAM_RATING', scope: 'LOWER', count: -1, values: [70] }, 11)).toEqual({ kind: 'teamRating', scope: 'max', value: 70 })
  })

  it('maps group requirements', () => {
    expect(toRequirement({ key: 'SAME_NATION_COUNT', scope: 'LOWER', count: -1, values: [3] }, 11)).toEqual({ kind: 'sameGroup', attribute: 'nationId', scope: 'max', count: 3 })
    expect(toRequirement({ key: 'LEAGUE_COUNT', scope: 'GREATER', count: -1, values: [4] }, 11)).toEqual({ kind: 'distinctGroups', attribute: 'leagueId', scope: 'min', count: 4 })
  })

  it('maps filtered counts and treats a negative count as every slot', () => {
    expect(toRequirement({ key: 'PLAYER_RARITY_GROUP', scope: 'GREATER', count: 1, values: [23] }, 11)).toEqual({ kind: 'count', filter: { rarityGroupIds: [23] }, scope: 'min', count: 1 })
    expect(toRequirement({ key: 'PLAYER_MIN_OVR', scope: 'GREATER', count: -1, values: [80] }, 11)).toEqual({ kind: 'count', filter: { minRating: 80 }, scope: 'min', count: 11 })
    expect(toRequirement({ key: 'PLAYER_LEVEL', scope: 'EXACT', count: 11, values: [3] }, 11)).toEqual({ kind: 'count', filter: { qualities: ['gold'] }, scope: 'exact', count: 11 })
  })

  it('maps player quality to a minimum quality for every player', () => {
    expect(toRequirement({ key: 'PLAYER_QUALITY', scope: 'GREATER', count: -1, values: [2] }, 11)).toEqual({ kind: 'count', filter: { qualities: ['silver', 'gold'] }, scope: 'min', count: 11 })
    expect(toRequirement({ key: 'PLAYER_QUALITY', scope: 'EXACT', count: -1, values: [1] }, 11)).toEqual({ kind: 'count', filter: { qualities: ['bronze'] }, scope: 'min', count: 11 })
  })

  it('refuses requirements it cannot model', () => {
    expect(() => toRequirement({ key: 'PLAYER_TRADABILITY', scope: 'EXACT', count: 11, values: [1] }, 11)).toThrow(UnsupportedRequirementError)
  })
})

describe('toScoreChallenge', () => {
  it('turns one-click requirements into player filters', () => {
    expect(toScoreChallenge([{ key: 'PLAYER_MAX_OVR', scope: 'LOWER', count: -1, values: [83] }], 1250, 30)).toEqual({ target: 1250, filters: [{ maxRating: 83 }], maxItems: 30 })
  })

  it('reads the academy OVR requirement shown as "OVR Max"', () => {
    expect(toScoreChallenge([{ key: 'ACADEMY_PLAYER_SLOTTING', scope: 'LOWER', count: -1, values: [83] }], 1250, 30)).toEqual({ target: 1250, filters: [{ maxRating: 83 }], maxItems: 30 })
  })

  it('refuses squad-only requirements', () => {
    expect(() => toScoreChallenge([{ key: 'CHEMISTRY_POINTS', scope: 'GREATER', count: -1, values: [20] }], 1250, 30)).toThrow(UnsupportedRequirementError)
  })
})
