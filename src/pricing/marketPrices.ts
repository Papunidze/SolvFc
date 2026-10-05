export interface PriceFeed {
  year: number
  platform: 'ps5' | 'pc'
}

interface PriceFile {
  id0: number
  d: number[]
  p: number[]
  s: number[]
}

const PRICE_FILES_URL = 'https://s3.eu-west-2.amazonaws.com/game-assets.fut.gg'
const ON_MARKET = 0

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'number')
}

function isPriceFile(data: unknown): data is PriceFile {
  if (typeof data !== 'object' || data === null) return false
  const { id0, d, p, s } = data as Record<string, unknown>
  return typeof id0 === 'number' && isNumberArray(d) && isNumberArray(p) && isNumberArray(s) && p.length === d.length + 1 && s.length === p.length
}

export function decodePrices(data: unknown) {
  if (!isPriceFile(data)) throw new Error('fut.gg sent market prices in an unknown format')
  const prices = new Map<number, number>()
  let definitionId = data.id0
  data.p.forEach((price, index) => {
    if (index > 0) definitionId += data.d[index - 1]
    if (data.s[index] === ON_MARKET && price > 0) prices.set(definitionId, price)
  })
  return prices
}

export async function fetchMarketPrices({ year, platform }: PriceFeed) {
  const response = await fetch(`${PRICE_FILES_URL}/${year}/cdn-data/player-prices-${platform}.json`)
  if (!response.ok) throw new Error(`Couldn't load market prices from fut.gg (HTTP ${response.status})`)
  return decodePrices(await response.json())
}
