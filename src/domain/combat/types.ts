import { TowerTraitType, TowerTraitsConfig, TowerLevelConfig, ProjectileType } from '../../types/map'

export type { ProjectileType }
export type SplashType = 'constant' | 'falloff'
export type TargetStrategy = 'first' | 'last' | 'strongest' | 'weakest' | 'closest'

export interface CombatUnitTarget {
  id: string
  currentCol: number
  currentRow: number
  screenX: number
  screenY: number
  currentHp: number
  maxHp: number
  isDead: boolean
  hasReachedEnd: boolean
  isSpawned: boolean
  pathIndex: number
  pathInterpolation?: number
  distanceTraveled?: number
  immunities?: TowerTraitType[]
  statusEffects?: Array<{
    type: TowerTraitType
    duration: number
    dps?: number
    slowPercent?: number
    amplification?: number
    tickTimer?: number
    sourceTowerId?: string
  }>
  consecutiveHits?: Record<string, number>
}

export interface DamageCalculationResult {
  finalDamage: number
  isResisted: boolean
  resistedTrait?: TowerTraitType
  appliedStatusEffects: Array<{
    type: TowerTraitType
    duration: number
    dps?: number
    slowPercent?: number
    amplification?: number
  }>
  stackCount?: number
}
