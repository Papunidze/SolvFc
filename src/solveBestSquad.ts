import type { Highs } from 'highs'
import { keepCheapestCopies, type PricedItem } from './pricing/cost'
import { type SolveOptions, SolveTimeoutError, solveChallenge } from './solver/solve'
import type { Challenge, Player } from './solver/types'

const CLUB_TIME_SHARE = 0.3
const MIN_MARKET_SECONDS = 1

function trySolve(highs: Highs, players: PricedItem[], challenge: Challenge, options: SolveOptions, start?: Player[]) {
  try {
    return { solution: solveChallenge(highs, players, challenge, options, start), hasTimedOut: false }
  } catch (error) {
    if (!(error instanceof SolveTimeoutError)) throw error
    return { solution: null, hasTimedOut: true }
  }
}

export function solveBestSquad(highs: Highs, items: PricedItem[], challenge: Challenge, timeLimitSeconds: number) {
  const started = performance.now()
  const owned = keepCheapestCopies(items.filter((item) => !item.isConcept))
  const club = trySolve(highs, owned, challenge, { timeLimitSeconds: timeLimitSeconds * CLUB_TIME_SHARE })
  const remainingSeconds = timeLimitSeconds - (performance.now() - started) / 1000
  const market =
    remainingSeconds < MIN_MARKET_SECONDS
      ? { solution: null, hasTimedOut: true }
      : trySolve(highs, keepCheapestCopies(items), challenge, { timeLimitSeconds: remainingSeconds }, club.solution?.lineup)

  if (!market.solution) {
    if (club.solution) return { ...club.solution, isOptimal: false }
    if (market.hasTimedOut) throw new SolveTimeoutError()
    return null
  }
  if (!club.solution || market.solution.cost < club.solution.cost) return market.solution
  return { ...club.solution, isOptimal: market.solution.isOptimal }
}
