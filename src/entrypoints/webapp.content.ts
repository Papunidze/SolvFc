import { fetchConceptItems, fetchUsableItems } from '../ea/club'
import type { EAOneClickSplitController } from '../ea/globals'
import { addLockAction } from '../ea/lockAction'
import { EA_WEB_APP_MATCHES } from '../ea/matches'
import { currentOneClickScreen, fetchScoredItems, selectInWorkArea } from '../ea/oneClick'
import { applyLineup, currentChallenge, readChallenge, readScoreChallenge } from '../ea/squad'
import { requestSolveFromPage, type SquadSolveResponse } from '../messaging'
import type { PriceFeed } from '../pricing/marketPrices'
import type { Challenge } from '../solver/types'

const BUTTON_LABEL = 'Solve with SolvFC'
const BUTTON_ID = 'easysbc-solve'
const SCREEN_CHECK_MS = 1000

function waitForWebApp() {
  return new Promise<void>((resolve) => {
    const timer = setInterval(() => {
      if (typeof UTSBCSquadDetailPanelView === 'undefined' || typeof services === 'undefined') return
      clearInterval(timer)
      resolve()
    }, SCREEN_CHECK_MS)
  })
}

function currentPriceFeed(): PriceFeed {
  return { year: APP_YEAR_SHORT, platform: services.User.getUser().getSelectedPersona().isPC ? 'pc' : 'ps5' }
}

async function solveWithMarket(challenge: Challenge) {
  const club = await fetchUsableItems()
  const concepts = await fetchConceptItems(challenge, new Set(club.eaItems.map((item) => item.definitionId)))
  const response = await requestSolveFromPage({ kind: 'squad', items: [...club.clubItems, ...concepts.clubItems], challenge, priceFeed: currentPriceFeed() })
  return { response, eaItems: [...club.eaItems, ...concepts.eaItems] }
}

function describeSquad(response: Extract<SquadSolveResponse, { status: 'solved' }>) {
  const summary = `Squad ready: ${response.rating} rated, ${response.chemistry} chem`
  const spend =
    response.conceptCount > 0
      ? ` · buy ${response.conceptCount} on the market (~${response.conceptCost.toLocaleString()} coins)`
      : `, ~${response.cost.toLocaleString()} coins`
  const verdict = response.isOptimal ? 'cheapest by your card values' : 'best found in time — raise the time limit in settings for a cheaper squad'
  return `${summary}${spend} — ${verdict}`
}

async function solveSquadChallenge() {
  const eaChallenge = currentChallenge()
  const { response, eaItems } = await solveWithMarket(readChallenge(eaChallenge))
  if (response.status === 'error') throw new Error(response.message)
  if (response.status === 'infeasible') throw new Error('No squad found, even with market players')

  const itemsById = new Map(eaItems.map((item) => [item.id, item]))
  await applyLineup(eaChallenge, response.lineupIds.map((id) => itemsById.get(id)!))
  return describeSquad(response)
}

async function solveOneClickChallenge(screen: EAOneClickSplitController) {
  const model = screen.workAreaController.viewModel
  const eaChallenge = model.getChallenge()
  const challenge = readScoreChallenge(eaChallenge, model.getSelectionLimit())
  const { eaItems, clubItems, storageIds } = await fetchScoredItems(eaChallenge.id)
  const response = await requestSolveFromPage({ kind: 'score', items: clubItems, challenge, priceFeed: currentPriceFeed() })
  if (response.status === 'error') throw new Error(response.message)
  if (response.status === 'infeasible') throw new Error(`Your club can't reach ${challenge.target.toLocaleString()} score`)

  const itemsById = new Map(eaItems.map((item) => [item.id, item]))
  selectInWorkArea(model, response.itemIds.map((id) => itemsById.get(id)!), storageIds)
  const proof = response.isOptimal ? ' — cheapest possible' : ''
  return `Selected ${response.itemIds.length} cards: ${response.score.toLocaleString()}/${challenge.target.toLocaleString()} score, ~${response.cost.toLocaleString()} coins${proof}`
}

function createSolveButton(solve: () => Promise<string>) {
  const button = document.createElement('button')
  const label = document.createElement('span')
  button.id = BUTTON_ID
  button.className = 'btn-standard'
  button.style.background = '#c8f135'
  button.style.color = '#0c0d11'
  label.className = 'button__text'
  label.textContent = BUTTON_LABEL
  button.append(label)
  button.addEventListener('click', async () => {
    button.disabled = true
    label.textContent = 'Solving…'
    try {
      services.Notification.queue([await solve(), UINotificationType.POSITIVE])
    } catch (error) {
      services.Notification.queue([error instanceof Error ? error.message : String(error), UINotificationType.NEGATIVE])
    } finally {
      button.disabled = false
      label.textContent = BUTTON_LABEL
    }
  })
  return button
}

function addSquadSolveButton() {
  const originalInit = UTSBCSquadDetailPanelView.prototype.init
  UTSBCSquadDetailPanelView.prototype.init = function (...args) {
    const result = originalInit.apply(this, args)
    this._btnExchange.__root.after(createSolveButton(solveSquadChallenge))
    return result
  }
}

function addOneClickSolveButton() {
  const screen = currentOneClickScreen()
  if (!screen || document.getElementById(BUTTON_ID)) return
  screen.requirementsController.view.getRootElement().append(createSolveButton(() => solveOneClickChallenge(screen)))
}

export default defineContentScript({
  matches: EA_WEB_APP_MATCHES,
  world: 'MAIN',
  main() {
    waitForWebApp().then(() => {
      addSquadSolveButton()
      addLockAction()
      setInterval(addOneClickSolveButton, SCREEN_CHECK_MS)
    })
  },
})
