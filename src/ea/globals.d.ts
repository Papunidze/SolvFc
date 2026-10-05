export interface EAObservable<T> {
  observe(scope: unknown, callback: (sender: unknown, response: T) => void): void
}

export interface EAItem {
  id: number
  definitionId: number
  rating: number
  teamId: number
  leagueId: number
  nationId: number
  rareflag: number
  groups: number[]
  possiblePositions: number[]
  duplicateId: number
  loans: number
  concept: boolean
  sbsScore?: number
  isPlayer(): boolean
  isTradeable(): boolean
}

export interface EASearchResponse {
  status: number
  response: { items: EAItem[]; retrievedAll?: boolean; endOfList?: boolean }
}

export interface EASearchCriteria {
  count: number
  offset: number
  level: string
  league: number
  nation: number
  club: number
}

export interface EAScoreSearchCriteria {
  count: number
  offset: number
  sbcChallengeId: number
  pileSearchType: number
}

export interface EAEligibility {
  scope: number
  count: number
  kvPairs: { _collection: Record<string, number[]> }
}

export interface EASquad {
  _formation: { generalPositions: number[] }
  simpleBrickIndices: number[]
  removeAllItems(): void
  setPlayers(items: EAItem[], notify: boolean): void
}

export interface EAChallenge {
  id: number
  setId: number
  eligibilityRequirements: EAEligibility[]
  squad: EASquad
}

export interface EAOneClickChallenge {
  id: number
  type: 'ONE_CLICK_CHALLENGE'
  eligibilityRequirements: EAEligibility[]
  scoreRequirement: number
  submittedScore: number
}

export interface EASet {
  id: number
}

export interface EAGroupButton {
  __root: HTMLElement
  init(): void
  setText(text: string): void
  setInteractionState(isEnabled: boolean): void
  addTarget(target: unknown, action: () => void, eventType: number): void
}

export interface LockPanel {
  easysbcItem?: EAItem
  easysbcLockButton?: EAGroupButton
}

export type OneClickTab = 'club' | 'storage' | 'favourite'

export interface EAOneClickWorkAreaModel {
  _itemScoreMap: Map<number, number>
  _itemEntityMap: Map<number, EAItem>
  _itemTabMap: Map<number, OneClickTab>
  getChallenge(): EAOneClickChallenge
  getActiveTab(): OneClickTab
  getSelectionLimit(): number
  clearSelection(): void
  selectItem(item: EAItem): boolean
  setActiveTab(tab: OneClickTab, onPage: () => void): void
}

export interface EAOneClickSplitController {
  workAreaController: { viewModel: EAOneClickWorkAreaModel }
  requirementsController: { view: { getRootElement(): HTMLElement } }
}

interface EAViewController {
  getCurrentController(): { childViewControllers: { _challenge?: EAChallenge }[] }
  rootController: { getRootNavigationController(): { popViewController(): void; pushViewController(controller: unknown): void } }
}

declare global {
  var services: {
    Club: { search(criteria: EASearchCriteria | EAScoreSearchCriteria): EAObservable<EASearchResponse> }
    Item: {
      searchStorageItems(criteria: EASearchCriteria): EAObservable<EASearchResponse>
      requestUnassignedItems(): EAObservable<EASearchResponse>
      searchConceptItems(criteria: EASearchCriteria): EAObservable<EASearchResponse>
    }
    SBC: {
      requestSets(): EAObservable<{ success: boolean; data: { sets: EASet[] } }>
      saveChallenge(challenge: EAChallenge): EAObservable<{ success: boolean }>
    }
    Notification: { queue(notification: [message: string, type: number]): void }
    User: { getUser(): { getSelectedPersona(): { isPC: boolean } } }
  }
  var APP_YEAR_SHORT: number
  var UTBucketedItemSearchViewModel: new () => { searchCriteria: EASearchCriteria }
  var UTSearchCriteriaDTO: new () => EAScoreSearchCriteria
  var PileSearchType: { CLUB: number; STORAGE: number }
  var UTOneClickSBCWorkAreaSplitViewController: new () => EAOneClickSplitController
  var UTItemEntity: new () => EAItem
  var UTSBCSquadSplitViewController: new () => { initWithSBCSet(set: EASet, challengeId: number): void }
  var UTSBCSquadDetailPanelView: { prototype: { init(this: { _btnExchange: { __root: HTMLElement } }, ...args: unknown[]): unknown } }
  var UTGroupButtonControl: new () => EAGroupButton
  var EventType: { TAP: number }
  var UTDefaultActionPanelView: {
    prototype: { render(this: LockPanel & { _bioButton: { __root: HTMLElement } }, item: EAItem, ...rest: unknown[]): unknown }
  }
  var UTSlotActionPanelView: {
    prototype: { setItem(this: LockPanel & { _btnBio: { __root: HTMLElement } }, item: EAItem, ...rest: unknown[]): unknown }
  }
  var SBCEligibilityKey: Record<string, string>
  var SBCEligibilityScope: Record<number, 'GREATER' | 'LOWER' | 'EXACT'>
  var UINotificationType: { POSITIVE: number; NEGATIVE: number; NEUTRAL: number }
  function getAppMain(): { getRootViewController(): { getPresentedViewController(): { getCurrentViewController(): EAViewController } } }
}
