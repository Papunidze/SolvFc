import type { Player } from '../solver/types'

export interface ClubItem extends Omit<Player, 'cost'> {
  definitionId: number
  isUntradeable: boolean
  isDuplicate: boolean
  isConcept: boolean
}

export interface CostWeights {
  duplicate: number
  untradeable: number
  tradeable: number
  concept: number
}

export const DEFAULT_COST_WEIGHTS: CostWeights = { duplicate: 0.1, untradeable: 0.7, tradeable: 1, concept: 1.1 }

const RARE_PREMIUM = 1.3
const SPECIAL_PREMIUM = 3

function basePrice(rating: number) {
  if (rating < 65) return 150
  if (rating < 75) return 250
  if (rating < 80) return 400 + (rating - 75) * 100
  return 900 * 1.55 ** (rating - 80)
}

function rarityPremium(rarityId: number) {
  if (rarityId === 0) return 1
  if (rarityId === 1) return RARE_PREMIUM
  return SPECIAL_PREMIUM
}

export function estimatePrice(rating: number, rarityId: number) {
  return Math.round(basePrice(rating) * rarityPremium(rarityId))
}

function weightFor(item: ClubItem, weights: CostWeights) {
  if (item.isConcept) return weights.concept
  if (!item.isUntradeable) return weights.tradeable
  return item.isDuplicate ? weights.duplicate : weights.untradeable
}

export type PricedItem = ClubItem & { cost: number }

export function toSolverPlayers(items: ClubItem[], prices: Map<number, number>, weights: CostWeights): PricedItem[] {
  return items.map((item) => ({
    ...item,
    cost: Math.round((prices.get(item.definitionId) ?? estimatePrice(item.rating, item.rarityId)) * weightFor(item, weights)),
  }))
}

export function keepPriceable(items: ClubItem[], prices: Map<number, number>) {
  return items.filter((item) => !item.isConcept || prices.has(item.definitionId))
}

export function keepCheapestCopies(items: PricedItem[]) {
  const cheapest = new Map<number, PricedItem>()
  for (const item of items) {
    const current = cheapest.get(item.definitionId)
    if (!current || item.cost < current.cost) cheapest.set(item.definitionId, item)
  }
  return [...cheapest.values()]
}
