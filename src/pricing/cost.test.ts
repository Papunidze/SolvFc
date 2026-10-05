import { describe, expect, it } from 'vitest'
import { DEFAULT_COST_WEIGHTS, type ClubItem, keepCheapestCopies, keepPriceable, toSolverPlayers } from './cost'

const item: ClubItem = {
  id: 1,
  definitionId: 10,
  rating: 84,
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
}

describe('toSolverPlayers', () => {
  it('discounts duplicates and untradeables', () => {
    const prices = new Map([[10, 1000]])
    const [tradeable, untradeable, duplicate] = toSolverPlayers(
      [item, { ...item, isUntradeable: true }, { ...item, isUntradeable: true, isDuplicate: true }],
      prices,
      DEFAULT_COST_WEIGHTS,
    )
    expect([tradeable.cost, untradeable.cost, duplicate.cost]).toEqual([1000, 700, 100])
  })

  it('keeps the full price of tradeable duplicates because the spare copy could be sold', () => {
    const [duplicate] = toSolverPlayers([{ ...item, isDuplicate: true }], new Map([[10, 1000]]), DEFAULT_COST_WEIGHTS)
    expect(duplicate.cost).toBe(1000)
  })

  it('makes market players cost more than owned ones', () => {
    const [owned, concept] = toSolverPlayers([item, { ...item, isConcept: true }], new Map([[10, 1000]]), DEFAULT_COST_WEIGHTS)
    expect(concept.cost).toBeGreaterThan(owned.cost)
  })

  it('estimates a price from rating when the market price is unknown', () => {
    const [low, high] = toSolverPlayers([{ ...item, rating: 70 }, { ...item, rating: 86 }], new Map(), DEFAULT_COST_WEIGHTS)
    expect(low.cost).toBeLessThan(high.cost)
  })

  it('values special cards well above normal cards of the same rating', () => {
    const [common, rare, special] = toSolverPlayers([{ ...item, rarityId: 0 }, { ...item, rarityId: 1 }, { ...item, rarityId: 3 }], new Map(), DEFAULT_COST_WEIGHTS)
    expect(common.cost).toBeLessThan(rare.cost)
    expect(special.cost).toBeGreaterThan(2 * rare.cost)
  })
})

describe('keepPriceable', () => {
  it('drops market cards without a market price because they cannot be bought', () => {
    const items = [item, { ...item, id: 2, definitionId: 99 }, { ...item, id: 3, isConcept: true }, { ...item, id: 4, definitionId: 99, isConcept: true }]
    expect(keepPriceable(items, new Map([[10, 1000]])).map((kept) => kept.id)).toEqual([1, 2, 3])
  })
})

describe('keepCheapestCopies', () => {
  it('keeps one copy of each card because a squad cannot hold the same player twice', () => {
    const [club, storage, other] = toSolverPlayers(
      [item, { ...item, id: 2, isDuplicate: true, isUntradeable: true }, { ...item, id: 3, definitionId: 11 }],
      new Map([[10, 1000], [11, 500]]),
      DEFAULT_COST_WEIGHTS,
    )
    expect(keepCheapestCopies([club, storage, other]).map((player) => player.id)).toEqual([2, 3])
  })
})
