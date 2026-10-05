import type { ClubItem } from './pricing/cost'
import type { PriceFeed } from './pricing/marketPrices'
import type { ScoreChallenge } from './solver/score'
import type { Challenge } from './solver/types'

export interface SquadSolveRequest {
  kind: 'squad'
  items: ClubItem[]
  challenge: Challenge
  priceFeed: PriceFeed
}

export interface ScoreSolveRequest {
  kind: 'score'
  items: ClubItem[]
  challenge: ScoreChallenge
  priceFeed: PriceFeed
}

export type SolveRequest = SquadSolveRequest | ScoreSolveRequest

type Failure = { status: 'infeasible' } | { status: 'error'; message: string }

export type SquadSolveResponse =
  | { status: 'solved'; lineupIds: number[]; cost: number; rating: number; chemistry: number; isOptimal: boolean; conceptCount: number; conceptCost: number }
  | Failure

export type ScoreSolveResponse = { status: 'solved'; itemIds: number[]; cost: number; score: number; isOptimal: boolean } | Failure

const SOLVE_REQUEST = 'easysbc:solve-request'
const SOLVE_RESPONSE = 'easysbc:solve-response'

export function requestSolveFromPage(request: SquadSolveRequest): Promise<SquadSolveResponse>
export function requestSolveFromPage(request: ScoreSolveRequest): Promise<ScoreSolveResponse>
export function requestSolveFromPage(request: SolveRequest) {
  const id = crypto.randomUUID()
  return new Promise((resolve) => {
    const onMessage = (event: MessageEvent) => {
      if (event.source !== window || event.data?.type !== SOLVE_RESPONSE || event.data.id !== id) return
      window.removeEventListener('message', onMessage)
      resolve(event.data.response)
    }
    window.addEventListener('message', onMessage)
    window.postMessage({ type: SOLVE_REQUEST, id, request }, window.location.origin)
  })
}

export function relaySolveRequests(send: (request: SolveRequest) => Promise<unknown>) {
  window.addEventListener('message', async (event: MessageEvent) => {
    if (event.source !== window || event.data?.type !== SOLVE_REQUEST) return
    const response = await send(event.data.request)
    window.postMessage({ type: SOLVE_RESPONSE, id: event.data.id, response }, window.location.origin)
  })
}
