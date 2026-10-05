import { usesChemistry } from './candidates'
import { CHEMISTRY_THRESHOLDS, matchesFilter } from './evaluate'
import { createLinearProgram, type LinearProgram, type Term } from './lp'
import type { Challenge, GroupAttribute, Player, Requirement, Scope } from './types'

const ROUNDING_EPSILON = 1e-4
const SENSE_BY_SCOPE = { min: '>=', max: '<=', exact: '=' } as const

interface ModelContext {
  lp: LinearProgram
  players: Player[]
  slots: number[]
  chemistry: string[]
}

export const useVar = (player: number) => `u${player}`
export const assignVar = (player: number, position: number) => `x${player}_${position}`
export const outOfPositionVar = (player: number) => `o${player}`

export function allowsOutOfPosition(challenge: Challenge) {
  return !challenge.requirements.some((requirement) => requirement.kind === 'playerChemistry' && requirement.min > 0)
}

export function playablePositions(player: Player, slots: number[]) {
  return [...new Set(slots)].filter((position) => player.positions.includes(position))
}

function inPositionTerms({ players, slots }: ModelContext, player: number, weight = 1): Term[] {
  return playablePositions(players[player], slots).map((position) => [weight, assignVar(player, position)])
}

function groupIndices(players: Player[], attribute: GroupAttribute) {
  const groups = new Map<number, number[]>()
  players.forEach((player, index) => {
    const members = groups.get(player[attribute]) ?? []
    members.push(index)
    groups.set(player[attribute], members)
  })
  return groups
}

function addScopedConstraint(lp: LinearProgram, terms: Term[], scope: Scope, target: number) {
  lp.addConstraint(terms, SENSE_BY_SCOPE[scope], target)
}

function addFreeSelection({ lp, players, slots }: ModelContext) {
  const terms = players.map((_, index): Term => [1, lp.addBinary(useVar(index))])
  lp.addConstraint(terms, '=', slots.length)
}

function addPositionedSelection(context: ModelContext, options: { allowsOutOfPosition: boolean }) {
  const { lp, players, slots } = context
  const assignedByPosition = new Map<number, Term[]>()
  players.forEach((player, index) => {
    const terms: Term[] = [[1, lp.addContinuous(useVar(index), 0, 1)]]
    for (const position of playablePositions(player, slots)) {
      terms.push([-1, lp.addBinary(assignVar(index, position))])
      const assigned = assignedByPosition.get(position) ?? []
      assigned.push([1, assignVar(index, position)])
      assignedByPosition.set(position, assigned)
    }
    if (options.allowsOutOfPosition) terms.push([-1, lp.addBinary(outOfPositionVar(index))])
    lp.addConstraint(terms, '=', 0)
  })
  for (const [position, terms] of assignedByPosition) lp.addConstraint(terms, '<=', slots.filter((slot) => slot === position).length)
  lp.addConstraint(players.map((_, index): Term => [1, useVar(index)]), '=', slots.length)
}

function addGroupTiers(context: ModelContext, attribute: GroupAttribute, weightOf: (player: Player) => number, sharedTerms: Term[]) {
  const tiersByGroup = new Map<number, string[]>()
  for (const [groupId, indices] of groupIndices(context.players, attribute)) {
    const memberTerms = indices.flatMap((index) => inPositionTerms(context, index, weightOf(context.players[index])))
    const terms = [...memberTerms, ...sharedTerms].filter(([weight]) => weight !== 0)
    const maxCount = terms.reduce((sum, [weight]) => sum + weight, 0)
    const tiers = CHEMISTRY_THRESHOLDS[attribute]
      .filter((threshold) => threshold <= maxCount)
      .map((threshold, tier) => {
        const reached = context.lp.addBinary(`z_${attribute}_${groupId}_${tier}`)
        context.lp.addConstraint([...terms, [-threshold, reached]], '>=', 0)
        return reached
      })
    tiersByGroup.set(groupId, tiers)
  }
  return tiersByGroup
}

function addChemistryPoints(context: ModelContext) {
  const { lp, players } = context
  const iconTerms = players.flatMap((player, index) => (player.kind === 'icon' ? inPositionTerms(context, index) : []))
  const tiers = {
    clubId: addGroupTiers(context, 'clubId', (player) => (player.kind === 'normal' ? 1 : 0), []),
    nationId: addGroupTiers(context, 'nationId', (player) => (player.kind === 'icon' ? 2 : 1), []),
    leagueId: addGroupTiers(context, 'leagueId', (player) => ({ normal: 1, hero: 2, icon: 0 })[player.kind], iconTerms),
  }

  return players.map((player, index) => {
    const chemistry = lp.addContinuous(`c${index}`, 0, 3)
    lp.addConstraint([[1, chemistry], ...inPositionTerms(context, index, -3)], '<=', 0)
    if (player.kind !== 'normal') return chemistry
    const reachedTiers = (['clubId', 'nationId', 'leagueId'] as const).flatMap((attribute) => tiers[attribute].get(player[attribute]) ?? [])
    lp.addConstraint([[1, chemistry], ...reachedTiers.map((tier): Term => [-1, tier])], '<=', 0)
    return chemistry
  })
}

function sumOfExtremes(ratings: number[], size: number) {
  const ascending = [...ratings].sort((a, b) => a - b)
  const sum = (values: number[]) => values.reduce((total, rating) => total + rating, 0)
  return { lowest: sum(ascending.slice(0, size)), highest: sum(ascending.slice(-size)) }
}

function range(from: number, to: number) {
  return Array.from({ length: Math.max(0, to - from + 1) }, (_, offset) => from + offset)
}

function maxPossibleExcess(total: number, size: number, lowestRating: number, highestRating: number) {
  const average = total / size
  return Math.max(...range(0, size).map((above) => Math.min(above * (highestRating - average), (size - above) * (average - lowestRating))))
}

function ratingSumTerms(counts: Map<number, string>): Term[] {
  return [...counts].map(([rating, count]) => [rating, count])
}

function excessTerms(counts: Map<number, string>, total: number, size: number): Term[] {
  return [...counts].flatMap(([rating, count]): Term[] => (rating * size > total ? [[rating - total / size, count]] : []))
}

function addTotalBuckets({ lp, players, slots }: ModelContext, name: string, totals: number[]) {
  const ratings = [...new Set(players.map((player) => player.rating))]
  const buckets = totals.map((total) => {
    const chosen = lp.addBinary(`${name}_${total}`)
    const counts = new Map(ratings.map((rating) => [rating, lp.addContinuous(`${name}_${total}_${rating}`, 0, slots.length)]))
    lp.addConstraint([...[...counts.values()].map((count): Term => [1, count]), [-slots.length, chosen]], '=', 0)
    return { total, chosen, counts }
  })
  lp.addConstraint(buckets.map((bucket): Term => [1, bucket.chosen]), '=', 1)
  for (const rating of ratings) {
    const members = players.flatMap((player, i): Term[] => (player.rating === rating ? [[-1, useVar(i)]] : []))
    lp.addConstraint([...buckets.map((bucket): Term => [1, bucket.counts.get(rating)!]), ...members], '=', 0)
  }
  return buckets
}

function addMinTeamRating(context: ModelContext, target: number, index: number) {
  const size = context.slots.length
  const ratings = context.players.map((player) => player.rating)
  const { lowest } = sumOfExtremes(ratings, size)
  const reachableTotals = range(lowest, target).filter(
    (total) => total + maxPossibleExcess(total, size, Math.min(...ratings), Math.max(...ratings)) >= target - 0.5,
  )
  for (const bucket of addTotalBuckets(context, `s${index}`, reachableTotals)) {
    context.lp.addConstraint([...ratingSumTerms(bucket.counts), [-bucket.total, bucket.chosen]], '>=', 0)
    const missing = target - 0.5 - bucket.total
    if (missing > 0) context.lp.addConstraint([...excessTerms(bucket.counts, bucket.total, size), [-missing, bucket.chosen]], '>=', 0)
  }
}

function addMaxTeamRating(context: ModelContext, limit: number, index: number) {
  const size = context.slots.length
  const { lowest, highest } = sumOfExtremes(context.players.map((player) => player.rating), size)
  for (const bucket of addTotalBuckets(context, `t${index}`, range(lowest, Math.min(highest, Math.floor(limit))))) {
    context.lp.addConstraint([...ratingSumTerms(bucket.counts), [-bucket.total, bucket.chosen]], '<=', 0)
    context.lp.addConstraint([...excessTerms(bucket.counts, bucket.total, size), [-(limit - bucket.total), bucket.chosen]], '<=', 0)
  }
}

function addTeamRating(context: ModelContext, requirement: Extract<Requirement, { kind: 'teamRating' }>, index: number) {
  const size = context.slots.length
  if (requirement.scope !== 'max') addMinTeamRating(context, size * requirement.value, index)
  if (requirement.scope !== 'min') addMaxTeamRating(context, size * requirement.value + size - 0.5 - ROUNDING_EPSILON, index)
}

function addSameGroup({ lp, players }: ModelContext, requirement: Extract<Requirement, { kind: 'sameGroup' }>, index: number) {
  const reachingTerms: Term[] = []
  for (const [groupId, indices] of groupIndices(players, requirement.attribute)) {
    const terms = indices.map((i): Term => [1, useVar(i)])
    if (requirement.scope !== 'min' && indices.length > requirement.count) lp.addConstraint(terms, '<=', requirement.count)
    if (requirement.scope === 'max' || indices.length < requirement.count) continue
    const reaches = lp.addBinary(`y${index}_${groupId}`)
    lp.addConstraint([...terms, [-requirement.count, reaches]], '>=', 0)
    reachingTerms.push([1, reaches])
  }
  if (requirement.scope !== 'max') lp.addConstraint(reachingTerms, '>=', 1)
}

function addDistinctGroups({ lp, players, slots }: ModelContext, requirement: Extract<Requirement, { kind: 'distinctGroups' }>, index: number) {
  const usedTerms = [...groupIndices(players, requirement.attribute)].map(([groupId, indices]): Term => {
    const used = lp.addBinary(`v${index}_${groupId}`)
    const terms = indices.map((i): Term => [1, useVar(i)])
    if (requirement.scope !== 'min') lp.addConstraint([...terms, [-slots.length, used]], '<=', 0)
    if (requirement.scope !== 'max') lp.addConstraint([...terms, [-1, used]], '>=', 0)
    return [1, used]
  })
  addScopedConstraint(lp, usedTerms, requirement.scope, requirement.count)
}

function addRequirement(context: ModelContext, requirement: Requirement, index: number) {
  const { lp, players, chemistry } = context
  switch (requirement.kind) {
    case 'teamRating':
      return addTeamRating(context, requirement, index)
    case 'teamChemistry':
      return lp.addConstraint(chemistry.map((variable): Term => [1, variable]), '>=', requirement.min)
    case 'playerChemistry':
      return chemistry.forEach((variable, i) => lp.addConstraint([[1, variable], [-requirement.min, useVar(i)]], '>=', 0))
    case 'count': {
      const matching = players.flatMap((player, i): Term[] => (matchesFilter(player, requirement.filter) ? [[1, useVar(i)]] : []))
      return addScopedConstraint(lp, matching, requirement.scope, requirement.count)
    }
    case 'sameGroup':
      return addSameGroup(context, requirement, index)
    case 'distinctGroups':
      return addDistinctGroups(context, requirement, index)
  }
}

function addCheapestFirstOrder({ lp }: ModelContext, groups: Player[][]) {
  let offset = 0
  for (const group of groups) {
    for (let i = offset + 1; i < offset + group.length; i++) lp.addConstraint([[1, useVar(i - 1)], [-1, useVar(i)]], '>=', 0)
    offset += group.length
  }
}

export function buildModel(groups: Player[][], challenge: Challenge) {
  const players = groups.flat()
  const context: ModelContext = { lp: createLinearProgram(), players, slots: challenge.slots, chemistry: [] }
  if (usesChemistry(challenge)) {
    addPositionedSelection(context, { allowsOutOfPosition: allowsOutOfPosition(challenge) })
    context.chemistry = addChemistryPoints(context)
  } else {
    addFreeSelection(context)
  }
  addCheapestFirstOrder(context, groups)
  challenge.requirements.forEach((requirement, index) => addRequirement(context, requirement, index))

  const ratingTiebreak = 1 / (100 * challenge.slots.length)
  context.lp.minimize(players.map((player, i): Term => [player.cost + player.rating * ratingTiebreak, useVar(i)]))
  return context.lp.toString()
}
