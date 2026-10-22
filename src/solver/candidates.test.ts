import { describe, expect, it } from 'vitest'
import { cheapestPool, withinBudget } from './candidates'
import type { Player } from './types'

function player(id: number, cost: number): Player {
  return { id, rating: 80, clubId: 1, nationId: 1, leagueId: 1, rarityId: 0, rarityGroups: [], positions: [0], kind: 'normal', points: 0, cost }
}

describe('withinBudget', () => {
  it('drops players that cannot fit in a squad cheaper than the budget', () => {
    const groups = [[player(1, 100), player(2, 200)], [player(3, 1000)], [player(4, 5000)]]
    expect(withinBudget(groups, 1300, 3).flat().map((p) => p.id)).toEqual([1, 2, 3])
  })
})

describe('cheapestPool', () => {
  it('keeps only the cheapest players across groups', () => {
    const groups = [[player(1, 100), player(2, 900)], [player(3, 300)]]
    expect(cheapestPool(groups, 2).flat().map((p) => p.id)).toEqual([1, 3])
  })
})
