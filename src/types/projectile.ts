/**
 * Projectile definition (v2): a projectile is built from parts, so any look can be made from them.
 *  - flying: a body (stack of shape layers) travels to the target, leaving a trail and shedding particles
 *  - beam:   an instant ray from the tower to the target
 *  - strike: an instant effect at the target (from the sky, out of the ground or around the unit)
 * Every behavior ends in an impact (flash, rings, particle burst, ground mark).
 * Colors are CSS hex strings ('#rrggbb'); sizes are screen pixels; times are seconds.
 */

export type ProjectileBehavior = 'flying' | 'beam' | 'strike'

/** Element of a projectile: its theme in the library (and the default palette of generated ones) */
export type ProjectileElement =
  | 'fire'
  | 'frost'
  | 'electro'
  | 'poison'
  | 'arcane'
  | 'void'
  | 'nature'
  | 'holy'
  | 'physical'
  | 'tech'

export type BodyShape =
  | 'orb'
  | 'ring'
  | 'polygon'
  | 'star'
  | 'diamond'
  | 'teardrop'
  | 'flame'
  | 'arrow'
  | 'bolt'
  | 'blade'
  | 'crescent'
  | 'cross'
  | 'spikes'
  | 'rocket'
  | 'shuriken'
  | 'feather'
  | 'skull'
  | 'sprite'

export interface BodyLayer {
  shape: BodyShape
  color: string
  alpha: number
  /** Radius (half width) in pixels */
  size: number
  /** Length along the flight direction relative to the size (1 = as long as wide) */
  stretch: number
  /** Pixels ahead (+) or behind (-) the head along the flight direction */
  offset: number
  /** Static rotation in degrees */
  rotation: number
  /** Spin in degrees per second */
  spin: number
  /** Size pulse amount (0 = none, 0.5 = ±50%) and its speed in pulses per second */
  pulse: number
  pulseSpeed: number
  /** Polygon sides, star points, shuriken blades, spikes */
  sides: number
  /** Inner radius share: star depth, ring thickness, crescent cut (0..1) */
  inner: number
  outlineColor: string
  outlineWidth: number
  /** Orbit radius in pixels: the layer circles the head `copies` times (0 = stays on the head) */
  orbit: number
  orbitSpeed: number
  copies: number
  /** Turns with the flight direction (off: keeps its own rotation, e.g. a spinning shuriken) */
  faceFlight: boolean
  /** Sprite layer: id of a game asset drawn as the body */
  assetId: string
}

export type TrailStyle = 'none' | 'ribbon' | 'line' | 'dots' | 'ghost' | 'zigzag' | 'double'

export interface TrailConfig {
  style: TrailStyle
  color: string
  colorEnd: string
  alpha: number
  width: number
  /** Points kept behind the head (longer = longer trail) */
  length: number
}

export type ParticleShape = 'dot' | 'square' | 'star' | 'spark' | 'ember' | 'shard' | 'ring' | 'cross' | 'smoke' | 'leaf' | 'bubble'

export interface ParticleConfig {
  shape: ParticleShape
  color: string
  colorEnd: string
  /** Burst: particles per hit. Emitter: particles per second */
  amount: number
  size: number
  sizeEnd: number
  speed: number
  /** Spread angle in degrees (360 = all around) */
  spread: number
  life: number
  /** Pixels per second²: positive falls, negative rises */
  gravity: number
  /** 0..1 slowdown per second */
  drag: number
  alpha: number
}

export interface MotionConfig {
  /** Tiles per second */
  speed: number
  /** Arc height (0 = straight, 1 = high lob) */
  arc: number
  /** Side-to-side wobble in pixels and how many times it swings over the flight */
  wobble: number
  wobbleFreq: number
  /** Ground shadow under the flying body */
  shadow: boolean
}

export type LaunchPattern = 'line' | 'fan' | 'helix' | 'orbit' | 'stagger' | 'scatter'

export interface LaunchConfig {
  /** Projectiles per shot (the damage is split between them) */
  count: number
  pattern: LaunchPattern
  /** Side distance between them in pixels */
  spread: number
  /** Helix / orbit turns over the flight */
  turns: number
}

export type StrikeStyle =
  | 'bolt'
  | 'pillar'
  | 'meteor'
  | 'rain'
  | 'spikes'
  | 'eruption'
  | 'fissure'
  | 'portal'
  | 'vortex'
  | 'nova'
  | 'rune'
  | 'blades'

export interface StrikeConfig {
  style: StrikeStyle
  color: string
  color2: string
  core: string
  /** Radius in pixels */
  size: number
  duration: number
  /** Rain drops, spikes, blades, rune marks */
  count: number
}

export type BeamStyle = 'laser' | 'lightning' | 'wave' | 'pulse'

export interface BeamConfig {
  style: BeamStyle
  color: string
  core: string
  width: number
  /** Lightning zigzag / wave height in pixels */
  jitter: number
  duration: number
}

export interface ImpactConfig {
  flashColor: string
  /** Flash radius in pixels (0 = none) */
  flashSize: number
  ringColor: string
  ringCount: number
  ringRadius: number
  ringWidth: number
  burst: ParticleConfig
  /** Ground mark left after the hit (radius 0 = none) */
  decalColor: string
  decalRadius: number
  decalLife: number
}

export interface ProjectileDefinition {
  version: 2
  id: string
  name: string
  element: ProjectileElement
  behavior: ProjectileBehavior
  /** Made by the player (library presets are built in and read-only) */
  isCustom: boolean
  motion: MotionConfig
  launch: LaunchConfig
  /** Drawn bottom to top */
  body: BodyLayer[]
  trail: TrailConfig
  /** Particles shed while flying (amount = per second, 0 = none) */
  emitter: ParticleConfig
  strike: StrikeConfig
  beam: BeamConfig
  impact: ImpactConfig
}
