import type { ScoreChallenge } from '../solver/score'
import type { GroupAttribute, PlayerFilter, Quality, Requirement, Scope } from '../solver/types'

export type EligibilityScope = 'GREATER' | 'LOWER' | 'EXACT'

export interface EligibilityRequirement {
  key: string
  scope: EligibilityScope
  count: number
  values: number[]
}

const SCOPES: Record<EligibilityScope, Scope> = { GREATER: 'min', LOWER: 'max', EXACT: 'exact' }

const SAME_GROUP_KEYS: Record<string, GroupAttribute> = { SAME_CLUB_COUNT: 'clubId', SAME_NATION_COUNT: 'nationId', SAME_LEAGUE_COUNT: 'leagueId' }

const DISTINCT_GROUP_KEYS: Record<string, GroupAttribute> = { CLUB_COUNT: 'clubId', NATION_COUNT: 'nationId', LEAGUE_COUNT: 'leagueId' }

const QUALITY_BY_LEVEL: Record<number, Quality> = { 1: 'bronze', 2: 'silver', 3: 'gold' }

function qualitiesInScope(scope: EligibilityScope, level: number) {
  const levels = [1, 2, 3].filter((candidate) => {
    if (scope === 'GREATER') return candidate >= level
    if (scope === 'LOWER') return candidate <= level
    return candidate === level
  })
  return levels.map((candidate) => QUALITY_BY_LEVEL[candidate])
}

function filterFor(key: string, values: number[]): PlayerFilter | undefined {
  switch (key) {
    case 'CLUB_ID':
      return { clubIds: values }
    case 'NATION_ID':
      return { nationIds: values }
    case 'LEAGUE_ID':
      return { leagueIds: values }
    case 'PLAYER_RARITY':
      return { rarityIds: values }
    case 'PLAYER_RARITY_GROUP':
      return { rarityGroupIds: values }
    case 'PLAYER_LEVEL':
      return { qualities: values.map((level) => QUALITY_BY_LEVEL[level]) }
    case 'PLAYER_MIN_OVR':
      return { minRating: values[0] }
    case 'PLAYER_MAX_OVR':
      return { maxRating: values[0] }
    case 'PLAYER_EXACT_OVR':
      return { minRating: values[0], maxRating: values[0] }
  }
}

function ratingInScope(scope: EligibilityScope, rating: number): PlayerFilter {
  if (scope === 'GREATER') return { minRating: rating }
  if (scope === 'LOWER') return { maxRating: rating }
  return { minRating: rating, maxRating: rating }
}

export class UnsupportedRequirementError extends Error {
  constructor({ key, scope, count, values }: EligibilityRequirement) {
    super(`Unsupported SBC requirement: ${key} (${scope}, count ${count}, values ${values.join(',')})`)
  }
}

export function toRequirement(eligibility: EligibilityRequirement, slotCount: number): Requirement {
  const { key, values } = eligibility
  const scope = SCOPES[eligibility.scope]

  if (key === 'TEAM_RATING') return { kind: 'teamRating', scope, value: values[0] }
  if (key === 'CHEMISTRY_POINTS') return { kind: 'teamChemistry', min: values[0] }
  if (key === 'ALL_PLAYERS_CHEMISTRY_POINTS') return { kind: 'playerChemistry', min: values[0] }
  if (SAME_GROUP_KEYS[key]) return { kind: 'sameGroup', attribute: SAME_GROUP_KEYS[key], scope, count: values[0] }
  if (DISTINCT_GROUP_KEYS[key]) return { kind: 'distinctGroups', attribute: DISTINCT_GROUP_KEYS[key], scope, count: values[0] }

  const count = eligibility.count < 0 ? slotCount : eligibility.count
  if (key === 'PLAYER_QUALITY') return { kind: 'count', filter: { qualities: qualitiesInScope(eligibility.scope, values[0]) }, scope: 'min', count }
  if (key === 'ACADEMY_PLAYER_SLOTTING') return { kind: 'count', filter: ratingInScope(eligibility.scope, values[0]), scope: 'min', count }

  const filter = filterFor(key, values)
  if (!filter) throw new UnsupportedRequirementError(eligibility)
  return { kind: 'count', filter, scope, count }
}

export function toScoreChallenge(eligibilities: EligibilityRequirement[], target: number, maxItems: number): ScoreChallenge {
  const filters = eligibilities.map((eligibility) => {
    const requirement = toRequirement(eligibility, 0)
    if (requirement.kind !== 'count') throw new UnsupportedRequirementError(eligibility)
    return requirement.filter
  })
  return { target, filters, maxItems }
}
