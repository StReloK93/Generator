import { TowerTraitType, UnitVariantType } from './map'

export type CharacterAction = 'Idle' | 'Run' | 'Pickup' | 'Walk' | 'Attack' | 'Die' | 'Hit' | 'Block' | 'Cast' | 'Jump' | 'Taunt' | (string & {})
export type CharacterModel = 'male' | 'warrior' | 'female' | 'orc' | 'zombi' | 'demon' | 'bird' | 'barry' | (string & {})

export interface UnitStatusEffect {
  type: TowerTraitType
  duration: number
  dps?: number
  slowPercent?: number
  amplification?: number
  tickTimer?: number
  sourceTowerId?: string
}

export interface UnitIdentity {
  routeId: string
  routeIndex: number
  unitIndex: number
  pairIndex: number
  sideOffset: number // -1 (left), +1 (right), 0 (center)
  model: CharacterModel
  variant: UnitVariantType
  variantTint?: number | string
  offsetY?: number
  scale?: number
}

export interface UnitMovement {
  currentCol: number
  currentRow: number
  direction: number // 0..7 isometric direction
  pathIndex: number
  pathInterpolation: number
  distanceTraveled: number
}

export interface UnitCombat {
  maxHp: number
  currentHp: number
  immunities: TowerTraitType[]
  statusEffects: UnitStatusEffect[]
  consecutiveHits: Record<string, number>
}

export interface UnitAnimation {
  action: CharacterAction
  frameIndex: number
  animTimer: number
  animSpeed: number
}

export interface UnitLifecycle {
  isSpawned: boolean
  hasReachedEnd: boolean
  isDead: boolean
  deathFade: number
  celebrationTimer: number
}

/**
 * Composable CharacterUnit model.
 * Separates identity, movement, combat, animation, and lifecycle into distinct sub-structures.
 */
export interface CharacterUnit {
  id: string
  identity: UnitIdentity
  movement: UnitMovement
  combat: UnitCombat
  animation: UnitAnimation
  lifecycle: UnitLifecycle
}
