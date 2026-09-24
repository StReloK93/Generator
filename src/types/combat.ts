/**
 * Composable Combat & Effect Types
 * Discriminated unions for all TD combat interactions, damage types, status effects, and projectile behaviors.
 */

export type DamageElement = 'physical' | 'fire' | 'frost' | 'poison' | 'electric' | 'blood' | 'void' | 'holy' | 'arcane'

export type TowerTraitType = 'fire' | 'frost' | 'poison' | 'stacking' | 'blood' | 'electric' | 'void'

export interface DamageEffect {
  type: 'damage'
  amount?: number
  element?: DamageElement
  bonusVsVariant?: Record<string, number>
}

export interface BurnEffect {
  type: 'burn'
  dps: number
  duration: number
}

export interface SlowEffect {
  type: 'slow'
  percent: number
  duration: number
}

export interface PoisonEffect {
  type: 'poison'
  dps: number
  duration: number
  slowPercent?: number
}

export interface BleedEffect {
  type: 'bleed'
  dps: number
  duration: number
}

export interface StunEffect {
  type: 'stun'
  duration: number
  chance?: number
}

export interface ChainEffect {
  type: 'chain'
  targets: number
  rangeTiles?: number
  damageFalloff?: number // 0.0 to 1.0 multiplier per bounce
}

export interface VulnerabilityEffect {
  type: 'vulnerability'
  percent: number
  duration: number
}

export interface StackingDamageEffect {
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
