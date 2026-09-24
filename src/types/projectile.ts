/**
 * Composable Projectile Architecture (Single Source of Truth)
 * Unified data-driven definition for TD Projectiles across Editor, Tower Preview, TD Settings, and Game runtime.
 */

export type ProjectileCategory =
  | 'fire'
  | 'frost'
  | 'electro'
  | 'poison'
  | 'arcane'
  | 'void'
  | 'siege'
  | 'holy'
  | 'custom'

export type ProjectileArchetype =
  | 'flying'
  | 'sky_strike'
  | 'ground_burst'
  | 'unit_aura'
  | 'laser'

export type ProjectileShape =
  | 'circle'
  | 'procedural_flame'
  | 'rocket'
  | 'diamond_shard'
  | 'star'
  | 'line_streak'
  | 'sand_cluster'
  | 'instant_strike'
  | 'arrow'
  | 'spear_lance'
  | 'lightning_bolt'
  | 'shuriken'
  | 'sawblade'
  | 'skull'
  | 'greatsword'
  | 'hammer'
  | 'boulder'
  | 'feather'
  | 'energy_orb'
  | 'energy_wave'
  | 'sprite'

export type TrailStyle = 'none' | 'solid_line' | 'glow_streak' | 'particles'

export type ProjectileFormationType =
  | 'single'
  | 'single_helix'
  | 'volley_3'
  | 'volley_5'
  | 'twin_helix'
  | 'triple_helix'
  | 'fan_spread'
  | 'ring_burst'
  | 'cluster_burst'
  | 'staggered_burst'
  | 'satellites'
  | 'laser_beam'

export type SparkParticleType =
  | 'fire_ember'
  | 'ice_shard'
  | 'snowflake'
  | 'lightning_arc'
  | 'acid_drop'
  | 'arcane_star'
  | 'void_blood'
  | 'shrapnel'
  | 'holy_cross'
  | 'sand_dust'
  | 'spark_line'
  | 'default'

export interface ProjectileIdentity {
  id: string
  name: string
  nameUz: string
  category: ProjectileCategory
  description: string
  version: number
  isCustom?: boolean
}

export type InstantStrikeType =
  // Sky strikes (Osmondan tushuvchi usullar)
  | 'sky_thunder'
  | 'heavenly_pillar'
  | 'meteor_fall'
  | 'solar_beam'
  | 'arrow_rain'
  | 'holy_spear'
  // Ground bursts (Yerdan otiluvchi usullar)
  | 'ground_fissure'
  | 'magma_geyser'
  | 'frost_spikes'
  | 'poison_roots'
  | 'void_portal'
  | 'quake_stomp'
  // Unit aura & surroundings (Unit atrofidagi usullar)
  | 'unit_singularity'
  | 'void_vortex'
  | 'swirling_blades'
  | 'frost_nova'
  | 'poison_cloud'
  | 'electric_discharge'
  | 'rune_seal'
  | 'holy_halo'
  // Legacy aliases
  | 'sky_strike'
  | 'ground_burst'
  | 'unit_aura'

export interface ProjectileMovement {
  speed: number // in cells per second
  hasArc: boolean
  arcHeightRatio?: number
  isLaser: boolean
  isInstant: boolean
  instantType?: InstantStrikeType
  homing?: boolean
  turnRate?: number
}

export interface ProjectileVisual {
  shape: ProjectileShape
  spriteTextureId?: string
  size: number
  length: number
  points: number
  colorHex: number
  colorCss: string
  glowColorHex: number
  glowColorCss: string
  coreColorHex: number
  coreColorCss: string
  alpha: number
  scale: number
  rotationOffset?: number
}

export interface ProjectileTrail {
  style: TrailStyle
  colorHex: number
  colorCss: string
  alpha: number
  length: number
  width: number
}

export interface ProjectileFormationConfig {
  type: ProjectileFormationType
  satelliteCount: number
  spreadAngle?: number
}

export interface ProjectileImpact {
  sparkType: SparkParticleType
  sparkCount: number
  sparkColorHex: number
  sparkColorCss: string
  shockwaveRadius: number
  shockwaveColorHex: number
  shockwaveColorCss: string
  hasDoubleRing: boolean
}

export interface ProjectileDefinition {
  identity: ProjectileIdentity
  movement: ProjectileMovement
  visual: ProjectileVisual
  trail: ProjectileTrail
  formation: ProjectileFormationConfig
  impact: ProjectileImpact
}

/**
 * Standard Portable Clipboard Payload Schema (v1)
 */
export interface ProjectileClipboardPayload {
  version: 1
  type: 'projectile'
  data: ProjectileDefinition
}
