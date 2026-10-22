import type { Highs, Model } from 'highs'
import { alignWithGroups, groupInterchangeable, limitChemistryPool, usesChemistry } from './candidates'
import { playerChemistry, squadRating, unmetRequirements } from './evaluate'
import { allowsOutOfPosition, assignVar, buildModel, outOfPositionVar, playablePositions, useVar } from './model'
import type { Challenge, Player, Solution } from './types'

const POOL_SIZES = [2, 5]
const STAGE_DEADLINES = [0.15, 0.45, 1]
const MIN_STAGE_SECONDS = 0.5
const OPTIMALITY_GAP = 1e-6

export interface SolveOptions {
  timeLimitSeconds: number
}

export class SolveTimeoutError extends Error {
  constructor() {
    super('No squad found within the time limit')
  }
}

function includePlayers(groups: Player[][], required: Player[]) {
  const included = new Set(groups.flat().map((player) => player.id))
  const missing = required.filter((player) => !included.has(player.id))
  return [...groups, ...missing.map((player) => [player])]
}

function applyStart(model: Model, players: Player[], challenge: Challenge, lineup: Player[]) {
  const positionOf = new Map(lineup.map((player, index) => [player.id, player.positions.includes(challenge.slots[index]) ? challenge.slots[index] : undefined]))
  const indices: number[] = []
  const values: number[] = []
  const set = (name: string, value: number) => {
    indices.push(model.getColByName(name))
    values.push(value)
  }
  players.forEach((player, i) => {
    const isChosen = positionOf.has(player.id)
    set(useVar(i), isChosen ? 1 : 0)
    if (!usesChemistry(challenge)) return
    const position = positionOf.get(player.id)
    for (const playable of playablePositions(player, challenge.slots)) set(assignVar(i, playable), position === playable ? 1 : 0)
    if (allowsOutOfPosition(challenge)) set(outOfPositionVar(i), isChosen && position === undefined ? 1 : 0)
  })
  model.setSolution({ indices, values })
}

function fillRemainingSlots(lineup: (Player | undefined)[], players: Player[], slots: number[]) {
  const remaining = [...players]
  const preferInPosition = lineup.map((player, slot) => {
    if (player) return player
    const inPosition = remaining.findIndex((candidate) => candidate.positions.includes(slots[slot]))
    return inPosition === -1 ? undefined : remaining.splice(inPosition, 1)[0]
  })
  return preferInPosition.map((player) => player ?? remaining.shift()!)
}

function placeInSlots(chosen: number[], candidates: Player[], slots: number[], positionOf: (index: number) => number | undefined) {
  const lineup: (Player | undefined)[] = slots.map(() => undefined)
  const unplaced = chosen.filter((index) => {
    const slot = lineup.findIndex((player, s) => player === undefined && slots[s] === positionOf(index))
    if (slot === -1) return true
    lineup[slot] = candidates[index]
    return false
  })
  return fillRemainingSlots(lineup, unplaced.map((index) => candidates[index]), slots)
}

function solveGroups(highs: Highs, pool: Player[][], challenge: Challenge, options: SolveOptions, warmStart?: Player[]): Solution | null {
  const start = warmStart && alignWithGroups(warmStart, pool)
  const groups = includePlayers(pool, start ?? [])
  const candidates = groups.flat()
  if (candidates.length < challenge.slots.length) return null

  const model = highs.createModel({ format: 'lp', data: buildModel(groups, challenge) })
  try {
    model.options.set({ output_flag: false, time_limit: options.timeLimitSeconds, mip_rel_gap: OPTIMALITY_GAP })
    if (start) applyStart(model, candidates, challenge, start)
    const { modelStatus } = model.run()
    const { optimal, infeasible, timeLimit } = highs.constants.modelStatus
    if (modelStatus === infeasible) return null
    if (modelStatus !== optimal && modelStatus !== timeLimit) throw new Error(`Solver stopped with status ${modelStatus}`)

    const values = model.getSolution().colValue
    const valueOf = (name: string) => values[model.getColByName(name)]
    const chosen = candidates.flatMap((_, index) => (valueOf(useVar(index)) > 0.5 ? [index] : []))
    if (chosen.length !== challenge.slots.length) throw new SolveTimeoutError()
    const positionOf = usesChemistry(challenge)
      ? (index: number) => playablePositions(candidates[index], challenge.slots).find((p) => valueOf(assignVar(index, p)) > 0.5)
      : () => undefined
    const lineup = placeInSlots(chosen, candidates, challenge.slots, positionOf)
    const unmet = unmetRequirements(lineup, challenge)
    if (unmet.length > 0) throw new Error(`Solver returned a squad that fails: ${JSON.stringify(unmet)}`)

    return {
      lineup,
      cost: lineup.reduce((sum, player) => sum + player.cost, 0),
      rating: squadRating(lineup.map((player) => player.rating), challenge.slots.length),
      chemistry: playerChemistry(lineup, challenge.slots).reduce((sum, chemistry) => sum + chemistry, 0),
      isOptimal: modelStatus === optimal,
    }
  } finally {
    model.dispose()
  }
}

function improve(highs: Highs, pool: Player[][], challenge: Challenge, timeLimitSeconds: number, lineup?: Player[]) {
  try {
    return { solution: solveGroups(highs, pool, challenge, { timeLimitSeconds }, lineup), hasTimedOut: false }
  } catch (error) {
    if (!(error instanceof SolveTimeoutError)) throw error
    return { solution: null, hasTimedOut: true }
  }
}

export function solveChallenge(highs: Highs, players: Player[], challenge: Challenge, options: SolveOptions, start?: Player[]): Solution | null {
  const allGroups = groupInterchangeable(players, challenge)
  if (!usesChemistry(challenge)) return solveGroups(highs, allGroups, challenge, options, start)

  const started = performance.now()
  const total = allGroups.flat().length
  const limitedPools = POOL_SIZES.map((size) => limitChemistryPool(allGroups, size)).filter((pool) => pool.flat().length < total)
  const pools = [...limitedPools, allGroups]
  const deadlines = STAGE_DEADLINES.slice(-pools.length)
  let best: Solution | null = null
  let hasTimedOut = false
  for (const [stage, pool] of pools.entries()) {
    const elapsed = (performance.now() - started) / 1000
    const timeLimitSeconds = Math.max(options.timeLimitSeconds * deadlines[stage] - elapsed, best ? 0 : MIN_STAGE_SECONDS)
    if (timeLimitSeconds < MIN_STAGE_SECONDS) break
    const result = improve(highs, pool, challenge, timeLimitSeconds, best?.lineup ?? start)
    hasTimedOut ||= result.hasTimedOut
    if (result.solution && (!best || result.solution.cost <= best.cost)) best = { ...result.solution, isOptimal: result.solution.isOptimal && pool === allGroups }
  }
  if (!best && hasTimedOut) throw new SolveTimeoutError()
  return best
}
