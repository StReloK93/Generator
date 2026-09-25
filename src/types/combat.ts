/**
 * Composable Combat & Effect Types
 * Discriminated unions for all TD combat interactions, damage types, status effects, and projectile behaviors.
 */

export type DamageElement = 'physical' | 'fire' | 'frost' | 'poison' | 'electric' | 'blood' | 'void' | 'holy' | 'arcane'

export type TowerTraitType = 'fire' | 'frost' | 'poison' | 'stacking' | 'blood' | 'electric' | 'void'

export interface BaseCombatEffect {
  isSplash?: boolean
}

export interface DamageEffect extends BaseCombatEffect {
  type: 'damage'
  amount?: number
  element?: DamageElement
  bonusVsVariant?: Record<string, number>
}

export interface BurnEffect extends BaseCombatEffect {
  type: 'burn'
  dps: number
  duration: number
}

export interface SlowEffect extends BaseCombatEffect {
  type: 'slow'
  percent: number
  duration: number
}

export interface PoisonEffect extends BaseCombatEffect {
  type: 'poison'
  dps: number
  duration: number
  slowPercent?: number
}

export interface BleedEffect extends BaseCombatEffect {
  type: 'bleed'
  dps: number
  duration: number
}

export interface StunEffect extends BaseCombatEffect {
  type: 'stun'
  duration: number
  chance?: number
}

export interface ChainEffect extends BaseCombatEffect {
  type: 'chain'
  targets: number
  rangeTiles?: number
  damageFalloff?: number // 0.0 to 1.0 multiplier per bounce
}

export interface VulnerabilityEffect extends BaseCombatEffect {
  type: 'vulnerability'
  percent: number
  duration: number
}

export interface StackingDamageEffect extends BaseCombatEffect {
  type: 'stacking_damage'
  bonusPerHit: number
  maxStacks: number
}

/**
 * Extensible union of all possible combat effects in the game.
 * Adding a new gameplay mechanic simply means adding a new typed variant to this union.
 */
export type CombatEffect =
  | DamageEffect
  | BurnEffect
  | SlowEffect
  | PoisonEffect
  | BleedEffect
  | StunEffect
  | ChainEffect
  | VulnerabilityEffect
  | StackingDamageEffect

export type SplashType = 'constant' | 'falloff'

export interface SplashConfig {
  radius: number // in tiles
  type: SplashType
  falloffFactor?: number
}

export type TargetStrategy = 'first' | 'last' | 'strongest' | 'weakest' | 'closest'
