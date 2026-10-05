import loadHighs, { type Highs } from 'highs'
import { beforeAll, describe, expect, it } from 'vitest'
import type { PricedItem } from './pricing/cost'
import { solveBestSquad } from './solveBestSquad'
import type { Challenge } from './solver/types'

let highs: Highs

beforeAll(async () => {
  highs = await loadHighs()
})

function card(id: number, overrides: Partial<PricedItem>): PricedItem {
  return {
    id,
    definitionId: id,
    rating: 80,
    clubId: 1,
    nationId: 1,
    leagueId: 1,
    rarityId: 1,
    rarityGroups: [],
    positions: [0],
    kind: 'normal',
    points: 0,
    isUntradeable: false,
    isDuplicate: false,
    isConcept: false,
    cost: 1000,
    ...overrides,
  }
}

const challenge: Challenge = { slots: [0, 0, 0], requirements: [] }

describe('solveBestSquad', () => {
  it('buys market cards only when they beat the club squad', () => {
    const club = [1, 2, 3].map((id) => card(id, { cost: 900 }))
    const market = [4, 5, 6].map((id) => card(id, { cost: 300, isConcept: true }))
    expect(solveBestSquad(highs, [...club, ...market], challenge, 10)?.lineup.map((player) => player.id).sort()).toEqual([4, 5, 6])
  })

  it('keeps the club squad when the market is not cheaper', () => {
    const club = [1, 2, 3].map((id) => card(id, { cost: 100 }))
    const market = [4, 5, 6].map((id) => card(id, { cost: 300, isConcept: true }))
    expect(solveBestSquad(highs, [...club, ...market], challenge, 10)?.lineup.map((player) => player.id).sort()).toEqual([1, 2, 3])
  })

  it('never uses two copies of the same player', () => {
    const copies = [card(1, { definitionId: 7, cost: 100 }), card(2, { definitionId: 7, cost: 50, isDuplicate: true }), card(3, { cost: 500 }), card(4, { cost: 600 })]
    const ids = solveBestSquad(highs, copies, challenge, 10)?.lineup.map((player) => player.id).sort()
    expect(ids).toEqual([2, 3, 4])
  })

  it('buys a full-chemistry market squad when it beats the club', () => {
    const club = [1, 2, 3].map((id) => card(id, { cost: 900 }))
    const market = [4, 5, 6].map((id) => card(id, { cost: 300, isConcept: true, clubId: 2, nationId: 2, leagueId: 2 }))
    const chemistry: Challenge = { slots: [0, 0, 0], requirements: [{ kind: 'teamChemistry', min: 9 }] }
    expect(solveBestSquad(highs, [...club, ...market], chemistry, 10)?.lineup.map((player) => player.id).sort()).toEqual([4, 5, 6])
  })

  it('keeps the club squad when cheaper market cards would break chemistry', () => {
    const club = [1, 2, 3].map((id) => card(id, { cost: 900 }))
    const market = [4, 5, 6].map((id) => card(id, { cost: 300, isConcept: true, clubId: id, nationId: id, leagueId: id }))
    const chemistry: Challenge = { slots: [0, 0, 0], requirements: [{ kind: 'teamChemistry', min: 9 }] }
    expect(solveBestSquad(highs, [...club, ...market], chemistry, 10)?.lineup.map((player) => player.id).sort()).toEqual([1, 2, 3])
  })

  it('reports an impossible challenge as infeasible', () => {
    expect(solveBestSquad(highs, [card(1, {}), card(2, { isConcept: true })], challenge, 10)).toBeNull()
  })
})
