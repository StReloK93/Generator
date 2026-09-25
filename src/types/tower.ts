import { CombatEffect, SplashType, TargetStrategy, TowerTraitType } from './combat'
import { ProjectileType } from './map'

export type TowerEffect = CombatEffect

export interface TowerAsset {
  assetId: string
  assetName: string
  assetPath: string

  scale?: number
  spanX?: number
  spanY?: number
  anchorX?: number
  anchorY?: number
  muzzleOffsetX?: number
  muzzleOffsetY?: number
}

export interface TowerLevel {
  level: number
  name?: string

  cost: number
  damage: number
  attackSpeed: number
  range: number

  isSplash: boolean
  splashRadius?: number
  splashType?: SplashType

  traits?: TowerTraitType[] | string[]
  effects?: TowerEffect[]

  [key: string]: any
}

// Backward compatibility aliases
export type TowerLevelConfig = TowerLevel
export type TowerAssetConfig = TowerAsset

export interface TowerBlueprint {
  id: string
  name: string
  description?: string
  clanId?: string

  asset: TowerAsset
  projectileId: string

  targetStrategy: TargetStrategy

  levels: TowerLevel[]

  // Optional root compatibility accessors for dynamic templates/bindings
  cost?: number
  damage?: number
  attackSpeed?: number
  range?: number
  isSplash?: boolean
  splashRadius?: number
  splashType?: SplashType
  assetId?: string
  assetName?: string
  assetPath?: string
  scale?: number
  spanX?: number
  spanY?: number
  anchorX?: number
  anchorY?: number
  muzzleOffsetX?: number
  muzzleOffsetY?: number
  projectileType?: ProjectileType
  projectileSpeed?: number
  projectileColor?: number
  traits?: TowerTraitType[] | string[]
  effects?: TowerEffect[]
  stats?: {
    cost: number
    damage: number
    attackSpeed: number
    range: number
  }
  projectile?: any
  [key: string]: any
}

export interface PlacedTower {
  id: string
  blueprintId: string
  name: string
  col: number
  row: number
  level: number
  damage: number
  attackSpeed: number
  range: number
  projectileId: string
  projectileType?: ProjectileType
  projectileSpeed?: number
  projectileColor?: number
  isSplash: boolean
  splashRadius?: number
  splashType?: SplashType
  cooldownTimer: number
  totalDamageDealt: number
  killsCount: number
  builderId?: string
  builderName?: string
  builderColor?: string
  targetUnitId?: string | null
  targetStrategy?: TargetStrategy
  effects?: CombatEffect[]
  traits?: TowerTraitType[]
  [key: string]: any
}
