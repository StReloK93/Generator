import { CombatEffect, SplashConfig, SplashType, TargetStrategy, TowerTraitType } from './combat'
import { ProjectileType } from './map'

export interface TowerAssetConfig {
  assetId?: string
  assetName: string
  assetPath?: string
  scale?: number
  spanX?: number
  spanY?: number
  anchorX?: number
  anchorY?: number
  muzzleOffsetX?: number
  muzzleOffsetY?: number
}

export interface TowerBaseStats {
  cost: number
  damage: number
  attackSpeed: number // seconds per attack
  range: number // range in tiles
}

export interface TowerProjectileConfig {
  type: ProjectileType
  speed: number
  color?: number
  splash?: SplashConfig
  effects: CombatEffect[]
}

export interface TowerLevelConfig {
  level: number
  name?: string
  cost: number
  damage: number
  attackSpeed: number
  range: number
  projectile?: TowerProjectileConfig
  traits?: TowerTraitType[]
  effects?: CombatEffect[]
  isSplash?: boolean
  splashRadius?: number
  splashType?: SplashType
  projectileType?: ProjectileType
  projectileId?: string
  projectileSpeed?: number
  projectileColor?: number
  [key: string]: any
}

export interface TowerBlueprint {
  id: string
  name: string
  description?: string
  clanId?: string
  asset: TowerAssetConfig
  stats: TowerBaseStats
  targetStrategy?: TargetStrategy
  projectileId?: string
  levels: TowerLevelConfig[]
  // Shorthands for convenient direct access
  assetId?: string
  assetName?: string
  assetPath?: string
  damage: number
  attackSpeed: number
  range: number
  cost: number
  scale?: number
  muzzleOffsetX?: number
  muzzleOffsetY?: number
  spanX?: number
  spanY?: number
  anchorX?: number
  anchorY?: number
  projectileType: ProjectileType
  projectileSpeed: number
  projectileColor: number
  isSplash: boolean
  splashRadius: number
  splashType: SplashType
  traits?: TowerTraitType[]
  effects?: CombatEffect[]
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
  projectileId?: string
  projectileType: ProjectileType
  projectileSpeed: number
  projectileColor: number
  isSplash: boolean
  splashRadius: number
  splashType: SplashType
  cooldownTimer: number
  totalDamageDealt: number
  killsCount: number
  builderId?: string
  builderName?: string
  builderColor?: string
  targetUnitId?: string | null
  targetStrategy?: TargetStrategy
  effects: CombatEffect[]
  traits?: TowerTraitType[]
}
