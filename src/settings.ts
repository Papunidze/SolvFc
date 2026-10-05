import { storage } from 'wxt/utils/storage'
import { DEFAULT_COST_WEIGHTS, type CostWeights } from './pricing/cost'

export interface Settings {
  weights: CostWeights
  timeLimitSeconds: number
}

export const settingsItem = storage.defineItem<Settings>('sync:settings', {
  fallback: { weights: DEFAULT_COST_WEIGHTS, timeLimitSeconds: 10 },
})

export async function loadSettings(): Promise<Settings> {
  const stored = await settingsItem.getValue()
  return { ...stored, weights: { ...DEFAULT_COST_WEIGHTS, ...stored.weights } }
}
