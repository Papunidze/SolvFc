import loadHighs, { type Highs } from 'highs'
import wasmUrl from 'highs/runtime?url'
import type { ScoreSolveRequest, ScoreSolveResponse, SolveRequest, SquadSolveRequest, SquadSolveResponse } from '../messaging'
import { keepCheapestCopies, keepPriceable, toSolverPlayers } from '../pricing/cost'
import { fetchMarketPrices } from '../pricing/marketPrices'
import { loadSettings, type Settings } from '../settings'
import { solveScoreChallenge } from '../solver/score'
import { solveBestSquad } from '../solveBestSquad'
import { recordSolve } from '../stats'

const highsPromise = loadHighs({ locateFile: () => wasmUrl })

function solveSquad(highs: Highs, settings: Settings, prices: Map<number, number>, { items, challenge }: SquadSolveRequest): SquadSolveResponse {
  const available = keepPriceable(items, prices)
  const solution = solveBestSquad(highs, toSolverPlayers(available, prices, settings.weights), challenge, settings.timeLimitSeconds)
  if (!solution) return { status: 'infeasible' }
  const { lineup, cost, rating, chemistry, isOptimal } = solution
  const lineupIds = new Set(lineup.map((player) => player.id))
  const concepts = available.filter((item) => item.isConcept && lineupIds.has(item.id))
  const conceptCost = concepts.reduce((sum, item) => sum + prices.get(item.definitionId)!, 0)
  return { status: 'solved', lineupIds: lineup.map((player) => player.id), cost, rating, chemistry, isOptimal, conceptCount: concepts.length, conceptCost }
}

function solveScore(highs: Highs, settings: Settings, prices: Map<number, number>, { items, challenge }: ScoreSolveRequest): ScoreSolveResponse {
  const players = keepCheapestCopies(toSolverPlayers(items, prices, settings.weights))
  const solution = solveScoreChallenge(highs, players, challenge, { timeLimitSeconds: settings.timeLimitSeconds })
  if (!solution) return { status: 'infeasible' }
  return { status: 'solved', itemIds: solution.players.map((player) => player.id), cost: solution.cost, score: solution.score, isOptimal: solution.isOptimal }
}

async function solve(request: SolveRequest): Promise<SquadSolveResponse | ScoreSolveResponse> {
  const [highs, settings] = await Promise.all([highsPromise, loadSettings()])
  try {
    const prices = await fetchMarketPrices(request.priceFeed)
    const response = request.kind === 'score' ? solveScore(highs, settings, prices, request) : solveSquad(highs, settings, prices, request)
    if (response.status === 'solved') await recordSolve('itemIds' in response ? response.itemIds.length : response.lineupIds.length)
    return response
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : String(error) }
  }
}

export default defineBackground({
  type: 'module',
  main() {
    browser.runtime.onMessage.addListener((request: SolveRequest, _sender, sendResponse) => {
      solve(request).then(sendResponse)
      return true
    })
  },
})
