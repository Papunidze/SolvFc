export type PlayerKind = 'normal' | 'icon' | 'hero'

export type Quality = 'bronze' | 'silver' | 'gold'

export interface Player {
  id: number
  rating: number
  clubId: number
  nationId: number
  leagueId: number
  rarityId: number
  rarityGroups: number[]
  positions: number[]
  kind: PlayerKind
  points: number
  cost: number
}

export type Scope = 'min' | 'max' | 'exact'

export type GroupAttribute = 'clubId' | 'nationId' | 'leagueId'

export interface PlayerFilter {
  clubIds?: number[]
  nationIds?: number[]
  leagueIds?: number[]
  rarityIds?: number[]
  rarityGroupIds?: number[]
  qualities?: Quality[]
  minRating?: number
  maxRating?: number
}

export type Requirement =
  | { kind: 'teamRating'; scope: Scope; value: number }
  | { kind: 'teamChemistry'; min: number }
  | { kind: 'playerChemistry'; min: number }
  | { kind: 'count'; filter: PlayerFilter; scope: Scope; count: number }
  | { kind: 'sameGroup'; attribute: GroupAttribute; scope: Scope; count: number }
  | { kind: 'distinctGroups'; attribute: GroupAttribute; scope: Scope; count: number }

export interface Challenge {
  slots: number[]
  requirements: Requirement[]
}

export interface Solution {
  lineup: Player[]
  cost: number
  rating: number
  chemistry: number
  isOptimal: boolean
}
