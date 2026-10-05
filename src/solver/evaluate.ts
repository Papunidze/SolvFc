import type { Challenge, GroupAttribute, Player, PlayerFilter, Quality, Requirement, Scope } from './types'

export const CHEMISTRY_THRESHOLDS: Record<GroupAttribute, number[]> = {
  clubId: [2, 4, 7],
  nationId: [2, 5, 8],
  leagueId: [3, 5, 8],
}

export function qualityOf(rating: number): Quality {
  if (rating >= 75) return 'gold'
  if (rating >= 65) return 'silver'
  return 'bronze'
}

function isAllowed(values: number[] | undefined, value: number) {
  return !values || values.includes(value)
}

export function matchesFilter(player: Player, filter: PlayerFilter) {
  return (
    isAllowed(filter.clubIds, player.clubId) &&
    isAllowed(filter.nationIds, player.nationId) &&
    isAllowed(filter.leagueIds, player.leagueId) &&
    isAllowed(filter.rarityIds, player.rarityId) &&
    (!filter.rarityGroupIds || filter.rarityGroupIds.some((group) => player.rarityGroups.includes(group))) &&
    (!filter.qualities || filter.qualities.includes(qualityOf(player.rating))) &&
    player.rating >= (filter.minRating ?? 0) &&
    player.rating <= (filter.maxRating ?? 99)
  )
}

export function satisfiesScope(value: number, scope: Scope, target: number) {
  if (scope === 'min') return value >= target
  if (scope === 'max') return value <= target
  return value === target
}

export function squadRating(ratings: number[], size: number) {
  const total = ratings.reduce((sum, rating) => sum + rating, 0)
  const scaledExcess = ratings.reduce((sum, rating) => sum + Math.max(0, rating * size - total), 0)
  const scaledTotal = total * size + scaledExcess
  const roundedTotal = Math.floor((2 * scaledTotal + size) / (2 * size))
  return Math.floor(roundedTotal / size)
}

function tierOf(count: number, thresholds: number[]) {
  return thresholds.filter((threshold) => count >= threshold).length
}

function countBy(players: Player[], attribute: GroupAttribute, weightOf: (player: Player) => number) {
  const counts = new Map<number, number>()
  for (const player of players) {
    counts.set(player[attribute], (counts.get(player[attribute]) ?? 0) + weightOf(player))
  }
  return counts
}

export function playerChemistry(lineup: Player[], slots: number[]) {
  const inPosition = lineup.filter((player, index) => player.positions.includes(slots[index]))
  const clubCounts = countBy(inPosition, 'clubId', (player) => (player.kind === 'normal' ? 1 : 0))
  const nationCounts = countBy(inPosition, 'nationId', (player) => (player.kind === 'icon' ? 2 : 1))
  const leagueCounts = countBy(inPosition, 'leagueId', (player) => ({ normal: 1, hero: 2, icon: 0 })[player.kind])
  const iconCount = inPosition.filter((player) => player.kind === 'icon').length

  return lineup.map((player, index) => {
    if (!player.positions.includes(slots[index])) return 0
    if (player.kind !== 'normal') return 3
    const points =
      tierOf(clubCounts.get(player.clubId) ?? 0, CHEMISTRY_THRESHOLDS.clubId) +
      tierOf(nationCounts.get(player.nationId) ?? 0, CHEMISTRY_THRESHOLDS.nationId) +
      tierOf((leagueCounts.get(player.leagueId) ?? 0) + iconCount, CHEMISTRY_THRESHOLDS.leagueId)
    return Math.min(3, points)
  })
}

function isRequirementMet(requirement: Requirement, lineup: Player[], slots: number[]) {
  switch (requirement.kind) {
    case 'teamRating':
      return satisfiesScope(squadRating(lineup.map((player) => player.rating), slots.length), requirement.scope, requirement.value)
    case 'teamChemistry':
      return playerChemistry(lineup, slots).reduce((sum, chemistry) => sum + chemistry, 0) >= requirement.min
    case 'playerChemistry':
      return playerChemistry(lineup, slots).every((chemistry) => chemistry >= requirement.min)
    case 'count':
      return satisfiesScope(lineup.filter((player) => matchesFilter(player, requirement.filter)).length, requirement.scope, requirement.count)
    case 'sameGroup': {
      const largestGroup = Math.max(...countBy(lineup, requirement.attribute, () => 1).values())
      return satisfiesScope(largestGroup, requirement.scope, requirement.count)
    }
    case 'distinctGroups':
      return satisfiesScope(countBy(lineup, requirement.attribute, () => 1).size, requirement.scope, requirement.count)
  }
}

export function unmetRequirements(lineup: Player[], challenge: Challenge) {
  return challenge.requirements.filter((requirement) => !isRequirementMet(requirement, lineup, challenge.slots))
}
