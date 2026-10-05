import loadHighs, { type Highs } from 'highs'
import { beforeAll, describe, expect, it } from 'vitest'
import { solveScoreChallenge } from './score'
import type { Player } from './types'

let highs: Highs

beforeAll(async () => {
  highs = await loadHighs()
})

function randomClub(seed: number, size: number): Player[] {
  let state = seed
  const random = (max: number) => {
    state = (Math.imul(state, 1103515245) + 12345) >>> 0
    return (state >>> 8) % max
  }
  return Array.from({ length: size }, (_, id) => {
    const rating = 75 + random(12)
    return { id, rating, clubId: 1, nationId: 1, leagueId: 1, rarityId: 1, rarityGroups: [], positions: [0], kind: 'normal', points: 100 + random(4) * 40, cost: 300 + random(3000) }
  })
}

function bruteForceCost(players: Player[], target: number, maxRating: number, maxItems: number) {
  let best = Infinity
  for (let mask = 1; mask < 1 << players.length; mask++) {
    const chosen = players.filter((player, i) => mask & (1 << i))
    if (chosen.length > maxItems || chosen.some((player) => player.rating > maxRating)) continue
    if (chosen.reduce((sum, player) => sum + player.points, 0) < target) continue
    best = Math.min(best, chosen.reduce((sum, player) => sum + player.cost, 0))
  }
  return best
}

describe('solveScoreChallenge', () => {
  it('returns null when the club cannot reach the target', () => {
    expect(solveScoreChallenge(highs, randomClub(1, 5), { target: 5000, filters: [], maxItems: 30 }, { timeLimitSeconds: 10 })).toBeNull()
  })

  it.each(Array.from({ length: 25 }, (_, seed) => seed + 1))('finds the cheapest selection reaching the score (seed %i)', (seed) => {
    const club = randomClub(seed, 14)
    const target = 500 + (seed % 6) * 150
    const maxItems = 4 + (seed % 5)
    const solution = solveScoreChallenge(highs, club, { target, filters: [{ maxRating: 83 }], maxItems }, { timeLimitSeconds: 10 })
    expect(solution?.cost ?? Infinity).toBe(bruteForceCost(club, target, 83, maxItems))
  })
})
