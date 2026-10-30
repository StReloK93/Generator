import { CombatEffect, SplashType, TargetStrategy, TowerTraitType } from './combat'

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

/**
 * Per-trait tuning parameters consumed by EffectProcessor.traitsToEffects.
 * `*IsSplash` keys are the legacy spelling found in older map files.
 */
export interface TowerTraitParams {
  fireBonusDamage?: number
  burnDps?: number
  burnDuration?: number
  fireSplash?: boolean
  fireIsSplash?: boolean
  slowPercent?: number
  slowDuration?: number
  frostBonusDamage?: number
  frostSplash?: boolean
  frostIsSplash?: boolean
  poisonDps?: number
  poisonDuration?: number
  poisonSlowPercent?: number
  poisonSplash?: boolean
  poisonIsSplash?: boolean
  stackBonusDamage?: number
  maxStacks?: number
  stackingSplash?: boolean
  stackingIsSplash?: boolean
  bleedDps?: number
  bleedDuration?: number
  bloodSplash?: boolean
  bloodIsSplash?: boolean
  electricBonusDamage?: number
  chainTargets?: number
  stunDuration?: number
  electricSplash?: boolean
  electricIsSplash?: boolean
  voidVulnPercent?: number
  voidDuration?: number
  voidSplash?: boolean
  voidIsSplash?: boolean
}

export interface TowerLevel extends TowerTraitParams {
  level: number
  name?: string

  cost: number
  damage: number
  attackSpeed: number
  range: number

  isSplash: boolean
  splashRadius?: number
  splashType?: SplashType

  traits?: TowerTraitType[]
  effects?: TowerEffect[]
}

export interface TowerBlueprint {
  id: string
  name: string
  description?: string
  clanId?: string

  asset: TowerAsset
  projectileId: string

  targetStrategy: TargetStrategy

  levels: TowerLevel[]
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
}

/** Editable blueprint fields; asset fields are merged into `bp.asset`. Levels are edited via level APIs. */
export type BlueprintUpdate = Partial<Pick<TowerBlueprint, 'name' | 'description' | 'clanId' | 'projectileId' | 'targetStrategy'>> & {
  asset?: Partial<TowerAsset>
}
