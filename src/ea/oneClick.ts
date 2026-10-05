import { duplicateClubIds, searchAll, toClubItem } from './club'
import type { EAItem, EAOneClickWorkAreaModel, OneClickTab } from './globals'
import { lockedItemIds } from './locks'

export function currentOneClickScreen() {
  const controller: unknown = getAppMain().getRootViewController().getPresentedViewController().getCurrentViewController().getCurrentController()
  return controller instanceof UTOneClickSBCWorkAreaSplitViewController ? controller : undefined
}

function searchScoredPile(challengeId: number, pileSearchType: number) {
  return searchAll((page) => services.Club.search(Object.assign(new UTSearchCriteriaDTO(), page, { sbcChallengeId: challengeId, pileSearchType })))
}

function isScoredPlayer(item: EAItem) {
  return item.isPlayer() && (item.sbsScore ?? 0) > 0
}

export async function fetchScoredItems(challengeId: number) {
  const club = (await searchScoredPile(challengeId, PileSearchType.CLUB)).filter(isScoredPlayer)
  const storage = (await searchScoredPile(challengeId, PileSearchType.STORAGE)).filter(isScoredPlayer)
  const duplicates = await duplicateClubIds()
  const storageIds = new Set(storage.map((item) => item.id))
  const locked = lockedItemIds()
  const eaItems = [...club, ...storage].filter((item) => !locked.has(item.id))
  const clubItems = eaItems.map((item) => toClubItem(item, duplicates.has(item.id) || storageIds.has(item.id)))
  return { eaItems, clubItems, storageIds }
}

export function selectInWorkArea(model: EAOneClickWorkAreaModel, items: EAItem[], storageIds: Set<number>) {
  model.clearSelection()
  for (const item of items) {
    const tab: OneClickTab = storageIds.has(item.id) ? 'storage' : 'club'
    model._itemScoreMap.set(item.id, item.sbsScore ?? 0)
    model._itemEntityMap.set(item.id, item)
    model._itemTabMap.set(item.id, tab)
    model.selectItem(item)
  }
  model.setActiveTab(model.getActiveTab(), () => {})
}
