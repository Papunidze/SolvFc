import type { Challenge } from '../solver/types'
import type { EAChallenge, EAEligibility, EAItem, EAOneClickChallenge } from './globals'
import { toPromise } from './observable'
import { type EligibilityRequirement, toRequirement, toScoreChallenge } from './requirements'

const FIELD_SLOTS = 11

function currentViewController() {
  return getAppMain().getRootViewController().getPresentedViewController().getCurrentViewController()
}

export function currentChallenge() {
  const challenge = currentViewController().getCurrentController().childViewControllers[0]?._challenge
  if (!challenge) throw new Error('Open an SBC squad first')
  return challenge
}

export function fillableSlotIndices(eaChallenge: EAChallenge) {
  const bricks = eaChallenge.squad.simpleBrickIndices
  return eaChallenge.squad._formation.generalPositions.slice(0, FIELD_SLOTS).flatMap((_, index) => (bricks.includes(index) ? [] : [index]))
}

function readEligibility(eligibility: EAEligibility): EligibilityRequirement {
  const [rawKey] = Object.keys(eligibility.kvPairs._collection)
  return { key: SBCEligibilityKey[rawKey], scope: SBCEligibilityScope[eligibility.scope], count: eligibility.count, values: eligibility.kvPairs._collection[rawKey] }
}

export function readChallenge(eaChallenge: EAChallenge): Challenge {
  const positions = eaChallenge.squad._formation.generalPositions
  const slots = fillableSlotIndices(eaChallenge).map((index) => positions[index])
  const requirements = eaChallenge.eligibilityRequirements.map((eligibility) => toRequirement(readEligibility(eligibility), slots.length))
  return { slots, requirements }
}

export function readScoreChallenge(eaChallenge: EAOneClickChallenge, maxItems: number) {
  const target = eaChallenge.scoreRequirement - eaChallenge.submittedScore
  return toScoreChallenge(eaChallenge.eligibilityRequirements.map(readEligibility), target, maxItems)
}

async function reopenChallenge(eaChallenge: EAChallenge) {
  const { data } = await toPromise(services.SBC.requestSets())
  const set = data.sets.find((candidate) => candidate.id === eaChallenge.setId)
  if (!set) throw new Error(`SBC set ${eaChallenge.setId} not found`)
  const view = new UTSBCSquadSplitViewController()
  view.initWithSBCSet(set, eaChallenge.id)
  const navigation = currentViewController().rootController.getRootNavigationController()
  navigation.popViewController()
  navigation.pushViewController(view)
}

export async function applyLineup(eaChallenge: EAChallenge, lineup: EAItem[]) {
  const squadItems = Array.from({ length: FIELD_SLOTS }, () => new UTItemEntity())
  fillableSlotIndices(eaChallenge).forEach((slot, index) => {
    squadItems[slot] = lineup[index]
  })
  eaChallenge.squad.removeAllItems()
  eaChallenge.squad.setPlayers(squadItems, true)
  const { success } = await toPromise(services.SBC.saveChallenge(eaChallenge))
  if (!success) throw new Error('EA rejected the squad')
  await reopenChallenge(eaChallenge)
}
