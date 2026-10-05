import type { ClubItem } from '../pricing/cost'
import type { Challenge } from '../solver/types'
import { type ConceptQuery, conceptQueries } from './concepts'
import { lockedItemIds } from './locks'
import type { EAItem, EAObservable, EASearchResponse } from './globals'
import { toPromise } from './observable'

const PAGE_SIZE = 91
const NOT_MODIFIED = 304
const MAX_CONCEPT_PAGES_PER_QUERY = 3
const ICON_LEAGUE_ID = 2118
const HERO_CLUB_ID = 114605

const conceptSearchCache = new Map<string, EAItem[]>()

interface SearchPage {
  offset: number
  count: number
}

export async function searchAll(search: (page: SearchPage) => EAObservable<EASearchResponse>, maxPages = Infinity) {
  const items: EAItem[] = []
  for (let page = 0; page < maxPages; page++) {
    const { status, response } = await toPromise(search({ offset: page * PAGE_SIZE, count: PAGE_SIZE }))
    const isOk = (status >= 200 && status < 300) || status === NOT_MODIFIED
    if (!isOk) throw new Error(`EA item search failed with status ${status}`)
    items.push(...response.items)
    if (response.retrievedAll || response.endOfList || response.items.length < PAGE_SIZE) return items
  }
  return items
}

function bucketedCriteria(page: SearchPage) {
  return Object.assign(new UTBucketedItemSearchViewModel().searchCriteria, page)
}

export async function duplicateClubIds() {
  const { response } = await toPromise(services.Item.requestUnassignedItems())
  return new Set(response.items.filter((item) => item.duplicateId > 0).map((item) => item.duplicateId))
}

function kindOf(item: EAItem) {
  if (item.leagueId === ICON_LEAGUE_ID) return 'icon'
  if (item.teamId === HERO_CLUB_ID) return 'hero'
  return 'normal'
}

export function toClubItem(item: EAItem, isDuplicate: boolean): ClubItem {
  return {
    id: item.id,
    definitionId: item.definitionId,
    rating: item.rating,
    clubId: item.teamId,
    nationId: item.nationId,
    leagueId: item.leagueId,
    rarityId: item.rareflag,
    rarityGroups: item.groups,
    positions: item.possiblePositions,
    kind: kindOf(item),
    points: item.sbsScore ?? 0,
    isUntradeable: !item.isTradeable(),
    isDuplicate,
    isConcept: item.concept,
  }
}

function isBaseMarketCard(item: EAItem) {
  return item.isPlayer() && item.rareflag <= 1 && kindOf(item) === 'normal'
}

function isUsable(item: EAItem) {
  return item.isPlayer() && item.loans < 0 && !item.concept
}

export async function fetchUsableItems() {
  const club = await searchAll((page) => services.Club.search(bucketedCriteria(page)))
  const storage = await searchAll((page) => services.Item.searchStorageItems(bucketedCriteria(page)))
  const duplicates = await duplicateClubIds()
  const locked = lockedItemIds()
  const eaItems = [...club, ...storage].filter((item) => isUsable(item) && !locked.has(item.id))
  const storageIds = new Set(storage.map((item) => item.id))
  const clubItems = eaItems.map((item) => toClubItem(item, duplicates.has(item.id) || storageIds.has(item.id)))
  return { eaItems, clubItems }
}

function conceptCriteria(page: SearchPage, query: ConceptQuery) {
  const criteria = bucketedCriteria(page)
  if (query.level) criteria.level = query.level
  if (query.leagueId) criteria.league = query.leagueId
  if (query.nationId) criteria.nation = query.nationId
  if (query.clubId) criteria.club = query.clubId
  return criteria
}

export async function fetchConceptItems(challenge: Challenge, ownedDefinitionIds: Set<number>) {
  const found = new Map<number, EAItem>()
  for (const query of conceptQueries(challenge)) {
    const cacheKey = JSON.stringify(query)
    let items = conceptSearchCache.get(cacheKey)
    if (!items) {
      items = await searchAll((page) => services.Item.searchConceptItems(conceptCriteria(page, query)), MAX_CONCEPT_PAGES_PER_QUERY)
      conceptSearchCache.set(cacheKey, items)
    }
    for (const item of items.filter((candidate) => isBaseMarketCard(candidate) && !ownedDefinitionIds.has(candidate.definitionId))) found.set(item.id, item)
  }
  const eaItems = [...found.values()]
  return { eaItems, clubItems: eaItems.map((item) => toClubItem(item, false)) }
}
