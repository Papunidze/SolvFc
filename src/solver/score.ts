import type { Highs } from 'highs'
import { matchesFilter } from './evaluate'
import { createLinearProgram, type Term } from './lp'
import type { Player, PlayerFilter } from './types'

export interface ScoreChallenge {
  target: number
  filters: PlayerFilter[]
  maxItems: number
}

export interface ScoreSolution {
  players: Player[]
  cost: number
  score: number
  isOptimal: boolean
}

const RATING_TIEBREAK = 1 / 10_000

function groupByScore(players: Player[], target: number) {
  const cheapestFirst = [...players].sort((a, b) => a.cost - b.cost || a.rating - b.rating)
  const groups = new Map<number, Player[]>()
  for (const player of cheapestFirst) {
    const group = groups.get(player.points) ?? []
    if (group.length < Math.ceil(target / player.points)) group.push(player)
    groups.set(player.points, group)
  }
  return [...groups.values()]
}

function buildScoreModel(groups: Player[][], challenge: ScoreChallenge) {
  const lp = createLinearProgram()
  const players = groups.flat()
  const scoreTerms = players.map((player, i): Term => [player.points, lp.addBinary(`u${i}`)])
  lp.addConstraint(scoreTerms, '>=', challenge.target)
  lp.addConstraint(players.map((_, i): Term => [1, `u${i}`]), '<=', challenge.maxItems)
  let offset = 0
  for (const group of groups) {
    for (let i = offset + 1; i < offset + group.length; i++) lp.addConstraint([[1, `u${i - 1}`], [-1, `u${i}`]], '>=', 0)
    offset += group.length
  }
  lp.minimize(players.map((player, i): Term => [player.cost + player.rating * RATING_TIEBREAK, `u${i}`]))
  return lp.toString()
}

export function solveScoreChallenge(highs: Highs, players: Player[], challenge: ScoreChallenge, options: { timeLimitSeconds: number }): ScoreSolution | null {
  const eligible = players.filter((player) => player.points > 0 && challenge.filters.every((filter) => matchesFilter(player, filter)))
  const groups = groupByScore(eligible, challenge.target)
  const candidates = groups.flat()
  if (candidates.reduce((sum, player) => sum + player.points, 0) < challenge.target) return null

  const result = highs.solve(buildScoreModel(groups, challenge), { output_flag: false, time_limit: options.timeLimitSeconds, mip_rel_gap: 1e-6 })
  if (result.Status === 'Infeasible') return null
  if (result.Status !== 'Optimal' && result.Status !== 'Time limit reached') throw new Error(`Solver stopped: ${result.Status}`)

  const chosen = candidates.filter((_, i) => {
    const column = result.Columns[`u${i}`]
    return column !== undefined && 'Primal' in column && column.Primal > 0.5
  })
  const score = chosen.reduce((sum, player) => sum + player.points, 0)
  if (score < challenge.target) throw new Error('No selection found within the time limit')

  return {
    players: chosen,
    cost: chosen.reduce((sum, player) => sum + player.cost, 0),
    score,
    isOptimal: result.Status === 'Optimal',
  }
}
