import { storage } from 'wxt/utils/storage'

export interface SolveStats {
  squadsSolved: number
  cardsUsed: number
}

export const statsItem = storage.defineItem<SolveStats>('local:stats', { fallback: { squadsSolved: 0, cardsUsed: 0 } })

export async function recordSolve(cardsUsed: number) {
  const stats = await statsItem.getValue()
  await statsItem.setValue({ squadsSolved: stats.squadsSolved + 1, cardsUsed: stats.cardsUsed + cardsUsed })
}
