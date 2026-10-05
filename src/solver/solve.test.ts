import loadHighs, { type Highs } from 'highs'
import { beforeAll, describe, expect, it } from 'vitest'
import { alignWithGroups } from './candidates'
import { playerChemistry, squadRating, unmetRequirements } from './evaluate'
import { solveChallenge } from './solve'
import type { Challenge, Player, PlayerKind } from './types'

let highs: Highs

beforeAll(async () => {
  highs = await loadHighs()
})

function createRandom(seed: number) {
  let state = seed
  return (max: number) => {
    state = (Math.imul(state, 1103515245) + 12345) >>> 0
    return (state >>> 8) % max
  }
}

function createPlayer(overrides: Partial<Player> & { id: number }): Player {
  return { rating: 80, clubId: 1, nationId: 1, leagueId: 1, rarityId: 0, rarityGroups: [], positions: [0], kind: 'normal', points: 0, cost: 100, ...overrides }
}

function randomClub(seed: number, size: number): Player[] {
  const random = createRandom(seed)
  const kinds: PlayerKind[] = ['normal', 'normal', 'normal', 'normal', 'normal', 'normal', 'icon', 'hero']
  return Array.from({ length: size }, (_, id) =>
    createPlayer({
      id,
      rating: 70 + random(20),
      clubId: random(3),
      nationId: random(3),
      leagueId: random(2),
      rarityId: random(3),
      positions: [random(4), random(4)],
      kind: kinds[random(kinds.length)],
      points: random(60),
      cost: 200 + random(5000),
    }),
  )
}

function combinations<T>(items: T[], size: number): T[][] {
  if (size === 0) return [[]]
  return items.flatMap((item, index) => combinations(items.slice(index + 1), size - 1).map((rest) => [item, ...rest]))
}

function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items]
  return items.flatMap((item, index) => permutations([...items.slice(0, index), ...items.slice(index + 1)]).map((rest) => [item, ...rest]))
}

function bruteForceCost(players: Player[], challenge: Challenge, orderMatters: boolean) {
  let best = Infinity
  for (const squad of combinations(players, challenge.slots.length)) {
    const cost = squad.reduce((sum, player) => sum + player.cost, 0)
    if (cost >= best) continue
    const lineups = orderMatters ? permutations(squad) : [squad]
    if (lineups.some((lineup) => unmetRequirements(lineup, challenge).length === 0)) best = cost
  }
  return best
}

describe('squadRating', () => {
  it('matches the in-game formula including the excess bonus', () => {
    expect(squadRating(Array(11).fill(84), 11)).toBe(84)
    expect(squadRating([...Array(10).fill(83), 90], 11)).toBe(84)
    expect(squadRating([...Array(10).fill(83), 84], 11)).toBe(83)
  })
})

describe('playerChemistry', () => {
  it('awards club, nation and league tiers', () => {
    const lineup = Array.from({ length: 4 }, (_, id) => createPlayer({ id, clubId: 7, nationId: 8, leagueId: 9 }))
    expect(playerChemistry(lineup, [0, 0, 0, 0])).toEqual([3, 3, 3, 3])
  })

  it('gives no chemistry out of position', () => {
    const lineup = [createPlayer({ id: 1, positions: [1] }), createPlayer({ id: 2 })]
    expect(playerChemistry(lineup, [0, 0])).toEqual([0, 0])
  })

  it('counts icons double for nation and adds them to every league', () => {
    const icon = createPlayer({ id: 1, kind: 'icon', clubId: 99, leagueId: 99, nationId: 5 })
    const teammates = [2, 3].map((id) => createPlayer({ id, clubId: id, nationId: 6, leagueId: 4 }))
    const nationMate = createPlayer({ id: 4, clubId: 50, nationId: 5, leagueId: 50 })
    expect(playerChemistry([icon, ...teammates, nationMate], [0, 0, 0, 0])).toEqual([3, 2, 2, 1])
  })
})

describe('alignWithGroups', () => {
  it('swaps start players for the cheapest unused twins so the start keeps the cheapest-first order', () => {
    const [cheap, middle, pricey] = [1, 2, 3].map((id) => createPlayer({ id, cost: id * 100 }))
    const loner = createPlayer({ id: 4 })
    expect(alignWithGroups([pricey, loner, cheap], [[cheap, middle, pricey]]).map((player) => player.id)).toEqual([1, 4, 2])
  })
})

describe('solveChallenge', () => {
  it('returns null when the club cannot complete the challenge', () => {
    const club = randomClub(1, 12)
    expect(solveChallenge(highs, club, { slots: Array(11).fill(0), requirements: [{ kind: 'teamRating', scope: 'min', value: 95 }] }, { timeLimitSeconds: 10 })).toBeNull()
  })

  it('starts from a given lineup and never returns a worse one', () => {
    const club = Array.from({ length: 8 }, (_, id) => createPlayer({ id, positions: [0, 1, 2, 3], cost: 100 + id * 50 }))
    const challenge: Challenge = { slots: [0, 1, 1, 2, 3], requirements: [{ kind: 'teamChemistry', min: 6 }] }
    const best = solveChallenge(highs, club, challenge, { timeLimitSeconds: 10 })!
    const seeded = solveChallenge(highs, club, challenge, { timeLimitSeconds: 10 }, best.lineup)!
    expect(seeded.cost).toBe(best.cost)
  })

  it('keeps start players the pool would drop', () => {
    const club = Array.from({ length: 12 }, (_, id) => createPlayer({ id, cost: 100 * (id + 1) }))
    const challenge: Challenge = { slots: [0, 0, 0], requirements: [{ kind: 'teamChemistry', min: 9 }] }
    const solution = solveChallenge(highs, club, challenge, { timeLimitSeconds: 10 }, club.slice(9))!
    expect(solution.cost).toBe(600)
    expect(solution.isOptimal).toBe(true)
  })

  it('prefers lower ratings when costs tie', () => {
    const club = [...Array.from({ length: 11 }, (_, id) => createPlayer({ id, rating: 83 })), createPlayer({ id: 11, rating: 88 })]
    const solution = solveChallenge(highs, club, { slots: Array(11).fill(0), requirements: [] }, { timeLimitSeconds: 10 })
    expect(solution?.lineup.map((player) => player.rating)).toEqual(Array(11).fill(83))
  })

  it.each(Array.from({ length: 25 }, (_, seed) => seed + 1))('finds the cheapest rating squad (seed %i)', (seed) => {
    const club = randomClub(seed, 15)
    const challenge: Challenge = {
      slots: Array(11).fill(0),
      requirements: [
        { kind: 'teamRating', scope: 'min', value: 78 + (seed % 5) },
        { kind: 'count', filter: { rarityIds: [1] }, scope: 'min', count: seed % 3 },
        { kind: 'distinctGroups', attribute: 'clubId', scope: 'min', count: 2 },
      ],
    }
    const solution = solveChallenge(highs, club, challenge, { timeLimitSeconds: 10 })
    expect(solution?.cost ?? Infinity).toBe(bruteForceCost(club, challenge, false))
  })

  it.each(Array.from({ length: 25 }, (_, seed) => seed + 100))('finds the cheapest chemistry squad (seed %i)', (seed) => {
    const club = randomClub(seed, 8)
    const challenge: Challenge = {
      slots: [0, 1, 1, 2, 3],
      requirements: [
        { kind: 'teamChemistry', min: 3 + (seed % 6) },
        { kind: 'sameGroup', attribute: 'leagueId', scope: 'max', count: 4 },
        ...(seed % 2 === 0 ? [{ kind: 'playerChemistry' as const, min: 1 }] : []),
      ],
    }
    const solution = solveChallenge(highs, club, challenge, { timeLimitSeconds: 10 })
    expect(solution?.cost ?? Infinity).toBe(bruteForceCost(club, challenge, true))
  })

  it.each(Array.from({ length: 15 }, (_, seed) => seed + 200))('handles max and exact team rating (seed %i)', (seed) => {
    const club = randomClub(seed, 14)
    const challenge: Challenge = {
      slots: Array(11).fill(0),
      requirements: [{ kind: 'teamRating', scope: seed % 2 === 0 ? 'max' : 'exact', value: 79 }],
    }
    const solution = solveChallenge(highs, club, challenge, { timeLimitSeconds: 10 })
    expect(solution?.cost ?? Infinity).toBe(bruteForceCost(club, challenge, false))
  })
})
