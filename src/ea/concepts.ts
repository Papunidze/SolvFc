import type { Challenge, PlayerFilter, Quality } from '../solver/types'

const MAX_TARGETED_IDS = 3
const ALL_LEVELS: Quality[] = ['bronze', 'silver', 'gold']

export interface ConceptQuery {
  level?: Quality
  leagueId?: number
  nationId?: number
  clubId?: number
}

function requiredLevel(challenge: Challenge) {
  for (const requirement of challenge.requirements) {
    if (requirement.kind !== 'count' || requirement.scope === 'max' || requirement.count < challenge.slots.length) continue
    if (requirement.filter.qualities?.length === 1) return requirement.filter.qualities[0]
  }
}

function targetedQueries(filter: PlayerFilter, level: Quality | undefined): ConceptQuery[] {
  const firstIds = (ids: number[] = []) => ids.slice(0, MAX_TARGETED_IDS)
  return [
    ...firstIds(filter.leagueIds).map((leagueId) => ({ level, leagueId })),
    ...firstIds(filter.nationIds).map((nationId) => ({ level, nationId })),
    ...firstIds(filter.clubIds).map((clubId) => ({ level, clubId })),
  ]
}

export function conceptQueries(challenge: Challenge): ConceptQuery[] {
  const level = requiredLevel(challenge)
  const targeted = challenge.requirements.flatMap((requirement) =>
    requirement.kind === 'count' && requirement.scope !== 'max' && requirement.count > 0 ? targetedQueries(requirement.filter, level) : [],
  )
  const levelQueries = (level ? [level] : ALL_LEVELS).map((queryLevel) => ({ level: queryLevel }))
  return [...levelQueries, ...targeted]
}
