import { describe, expect, it } from 'vitest'
import { decodePrices } from './marketPrices'

describe('decodePrices', () => {
  it('keeps only cards listed on the market, keyed by their delta-encoded definition id', () => {
    const file = { v: 2, id0: 27, d: [14, 10, 189, 6], p: [257000, 0, 17000, 0, 900], s: [0, 0, 1, 2, 0] }
    expect(decodePrices(file)).toEqual(new Map([[27, 257000], [246, 900]]))
  })

  it('rejects a file whose prices do not line up with its ids', () => {
    expect(() => decodePrices({ id0: 27, d: [14], p: [100], s: [0] })).toThrow('unknown format')
  })
})
