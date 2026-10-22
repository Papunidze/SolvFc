import { matchesFilter } from './evaluate'
import type { Challenge, Player, PlayerFilter } from './types'

export function usesChemistry(challenge: Challenge) {
  return challenge.requirements.some((requirement) => requirement.kind === 'teamChemistry' || requirement.kind === 'playerChemistry')
}

function requiredFilters(challenge: Challenge) {
  return challenge.requirements.flatMap((requirement) =>
    requirement.kind === 'count' && requirement.scope !== 'max' && requirement.count >= challenge.slots.length ? [requirement.filter] : [],
  )
}

function forbiddenFilters(challenge: Challenge) {
  return challenge.requirements.flatMap((requirement) =>
    requirement.kind === 'count' && requirement.scope !== 'min' && requirement.count === 0 ? [requirement.filter] : [],
  )
}

function isEligible(player: Player, challenge: Challenge, required: PlayerFilter[], forbidden: PlayerFilter[]) {
  const needsPosition = challenge.requirements.some((requirement) => requirement.kind === 'playerChemistry' && requirement.min > 0)
  return (
    required.every((filter) => matchesFilter(player, filter)) &&
    !forbidden.some((filter) => matchesFilter(player, filter)) &&
    (!needsPosition || player.positions.some((position) => challenge.slots.includes(position)))
  )
}

function signatureOf(player: Player, challenge: Challenge) {
  const parts: unknown[] = [player.rating]
  for (const requirement of challenge.requirements) {
    if (requirement.kind === 'count') parts.push(matchesFilter(player, requirement.filter))
    if (requirement.kind === 'sameGroup' || requirement.kind === 'distinctGroups') parts.push(player[requirement.attribute])
  }
  if (usesChemistry(challenge)) {
    const playablePositions = player.positions.filter((position) => challenge.slots.includes(position)).sort()
    parts.push(player.clubId, player.nationId, player.leagueId, player.kind, playablePositions)
  }
  return JSON.stringify(parts)
}

export function groupInterchangeable(players: Player[], challenge: Challenge) {
  const required = requiredFilters(challenge)
  const forbidden = forbiddenFilters(challenge)
  const cheapestFirst = players
    .filter((player) => isEligible(player, challenge, required, forbidden))
    .sort((a, b) => a.cost - b.cost || a.rating - b.rating)

  const groups = new Map<string, Player[]>()
  for (const player of cheapestFirst) {
    const signature = signatureOf(player, challenge)
    const group = groups.get(signature) ?? []
    if (group.length < challenge.slots.length) group.push(player)
    groups.set(signature, group)
  }
  return [...groups.values()]
}

export function alignWithGroups(lineup: Player[], groups: Player[][]) {
  const groupOf = new Map(groups.flatMap((group) => group.map((player): [number, Player[]] => [player.id, group])))
  const used = new Set<number>()
  return lineup.map((player) => {
    const twin = groupOf.get(player.id)?.find((member) => !used.has(member.id)) ?? player
    used.add(twin.id)
    return twin
  })
}

export function withinBudget(groups: Player[][], budget: number, slotCount: number) {
  const cheapestOthers = groups
    .flat()
    .map((player) => player.cost)
    .sort((a, b) => a - b)
    .slice(0, slotCount - 1)
    .reduce((sum, cost) => sum + cost, 0)
  return groups.map((group) => group.filter((player) => player.cost + cheapestOthers <= budget)).filter((group) => group.length > 0)
}

export function cheapestPool(groups: Player[][], size: number) {
  const kept = new Set(
    groups
      .flat()
      .sort((a, b) => a.cost - b.cost)
      .slice(0, size),
  )
  return groups.map((group) => group.filter((player) => kept.has(player))).filter((group) => group.length > 0)
}
