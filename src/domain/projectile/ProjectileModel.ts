import type {
  BeamConfig,
  BodyLayer,
  BodyShape,
  ImpactConfig,
  LaunchConfig,
  MotionConfig,
  ParticleConfig,
  ProjectileBehavior,
  ProjectileDefinition,
  ProjectileElement,
  StrikeConfig,
  TrailConfig,
} from '../../types/projectile'

export const PROJECTILE_ELEMENTS: readonly ProjectileElement[] = [
  'fire', 'frost', 'electro', 'poison', 'arcane', 'void', 'nature', 'holy', 'physical', 'tech',
]

export const BODY_SHAPES: readonly BodyShape[] = [
  'orb', 'ring', 'polygon', 'star', 'diamond', 'teardrop', 'flame', 'arrow', 'bolt', 'blade',
  'crescent', 'cross', 'spikes', 'rocket', 'shuriken', 'feather', 'skull', 'sprite',
]

export function createLayer(patch: Partial<BodyLayer> = {}): BodyLayer {
  return {
    shape: 'orb',
    color: '#f97316',
    alpha: 1,
    size: 8,
    stretch: 1,
    offset: 0,
    rotation: 0,
    spin: 0,
    pulse: 0,
    pulseSpeed: 2,
    sides: 5,
    inner: 0.45,
    outlineColor: '#ffffff',
    outlineWidth: 0,
    orbit: 0,
    orbitSpeed: 1,
    copies: 1,
    faceFlight: true,
    assetId: '',
    ...patch,
  }
}

export function createParticles(patch: Partial<ParticleConfig> = {}): ParticleConfig {
  return {
    shape: 'dot',
    color: '#fbbf24',
    colorEnd: '#ef4444',
    amount: 0,
    size: 3,
    sizeEnd: 0.5,
    speed: 60,
    spread: 360,
    life: 0.45,
    gravity: 0,
    drag: 0.4,
    alpha: 1,
    ...patch,
  }
}

const DEFAULT_MOTION: MotionConfig = { speed: 12, arc: 0.2, wobble: 0, wobbleFreq: 2, shadow: true }
const DEFAULT_LAUNCH: LaunchConfig = { count: 1, pattern: 'line', spread: 14, turns: 2 }
/** Flight particles shed behind the projectile in this cone (degrees); a full 360° sprays a cloud around it */
const EMITTER_SPREAD = 50
const DEFAULT_TRAIL: TrailConfig = { style: 'ribbon', color: '#fbbf24', colorEnd: '#ef4444', alpha: 0.8, width: 6, length: 12 }
const DEFAULT_STRIKE: StrikeConfig = { style: 'bolt', color: '#60a5fa', color2: '#a78bfa', core: '#ffffff', size: 36, duration: 0.5, count: 6 }
const DEFAULT_BEAM: BeamConfig = { style: 'laser', color: '#22d3ee', core: '#ffffff', width: 5, jitter: 8, duration: 0.25 }
const DEFAULT_IMPACT: Omit<ImpactConfig, 'burst'> = {
  flashColor: '#fbbf24',
  flashSize: 18,
  ringColor: '#f97316',
  ringCount: 1,
  ringRadius: 26,
  ringWidth: 2,
  decalColor: '#1c1917',
  decalRadius: 0,
  decalLife: 1.5,
}

/** A projectile described only by what differs from the defaults (every part may be partial) */
export type ProjectilePatch = Partial<Pick<ProjectileDefinition, 'id' | 'name' | 'element' | 'behavior' | 'isCustom'>> & {
  motion?: Partial<MotionConfig>
  launch?: Partial<LaunchConfig>
  body?: Partial<BodyLayer>[]
  trail?: Partial<TrailConfig>
  emitter?: Partial<ParticleConfig>
  strike?: Partial<StrikeConfig>
  beam?: Partial<BeamConfig>
  impact?: Partial<Omit<ImpactConfig, 'burst'>> & { burst?: Partial<ParticleConfig> }
}

export function createProjectile(patch: ProjectilePatch = {}): ProjectileDefinition {
  return {
    version: 2,
    id: patch.id ?? newProjectileId(),
    name: patch.name ?? 'Projectile',
    element: patch.element ?? 'fire',
    behavior: patch.behavior ?? 'flying',
    isCustom: patch.isCustom ?? false,
    motion: { ...DEFAULT_MOTION, ...patch.motion },
    launch: { ...DEFAULT_LAUNCH, ...patch.launch },
    body: (patch.body ?? [createLayer()]).map(l => createLayer(l)),
    trail: { ...DEFAULT_TRAIL, ...patch.trail },
    emitter: createParticles({ spread: EMITTER_SPREAD, ...patch.emitter }),
    strike: { ...DEFAULT_STRIKE, ...patch.strike },
    beam: { ...DEFAULT_BEAM, ...patch.beam },
    impact: { ...DEFAULT_IMPACT, ...patch.impact, burst: createParticles({ amount: 14, ...patch.impact?.burst }) },
  }
}

export function newProjectileId(): string {
  return `custom_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
}

export function cloneProjectile(def: ProjectileDefinition): ProjectileDefinition {
  return JSON.parse(JSON.stringify(def))
}

// ==========================================
// Normalization (maps, clipboard, storage)
// ==========================================

const HEX = /^#[0-9a-f]{6}$/i
const num = (v: unknown, fallback: number, min = -Infinity, max = Infinity) => {
  const n = Number(v)
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback
}
const color = (v: unknown, fallback: string) => (typeof v === 'string' && HEX.test(v) ? v.toLowerCase() : fallback)
const oneOf = <T extends string>(v: unknown, list: readonly T[], fallback: T): T => (list.includes(v as T) ? (v as T) : fallback)

const BEHAVIORS: readonly ProjectileBehavior[] = ['flying', 'beam', 'strike']

type Loose<T> = { [K in keyof T]?: unknown }

function normalizeLayer(raw: Loose<BodyLayer>): BodyLayer {
  const d = createLayer()
  return {
    shape: oneOf(raw.shape, BODY_SHAPES, d.shape),
    color: color(raw.color, d.color),
    alpha: num(raw.alpha, d.alpha, 0, 1),
    size: num(raw.size, d.size, 0.5, 200),
    stretch: num(raw.stretch, d.stretch, 0.1, 12),
    offset: num(raw.offset, d.offset, -200, 200),
    rotation: num(raw.rotation, d.rotation, -360, 360),
    spin: num(raw.spin, d.spin, -3600, 3600),
    pulse: num(raw.pulse, d.pulse, 0, 1),
    pulseSpeed: num(raw.pulseSpeed, d.pulseSpeed, 0, 30),
    sides: Math.round(num(raw.sides, d.sides, 2, 16)),
    inner: num(raw.inner, d.inner, 0.05, 0.95),
    outlineColor: color(raw.outlineColor, d.outlineColor),
    outlineWidth: num(raw.outlineWidth, d.outlineWidth, 0, 10),
    orbit: num(raw.orbit, d.orbit, 0, 200),
    orbitSpeed: num(raw.orbitSpeed, d.orbitSpeed, -20, 20),
    copies: Math.round(num(raw.copies, d.copies, 1, 12)),
    faceFlight: typeof raw.faceFlight === 'boolean' ? raw.faceFlight : d.faceFlight,
    assetId: typeof raw.assetId === 'string' ? raw.assetId : '',
  }
}

function normalizeParticles(raw: Loose<ParticleConfig> | undefined, fallback: ParticleConfig): ParticleConfig {
  const r = raw ?? {}
  const shapes = ['dot', 'square', 'star', 'spark', 'ember', 'shard', 'ring', 'cross', 'smoke', 'leaf', 'bubble'] as const
  return {
    shape: oneOf(r.shape, shapes, fallback.shape),
    color: color(r.color, fallback.color),
    colorEnd: color(r.colorEnd, fallback.colorEnd),
    amount: Math.round(num(r.amount, fallback.amount, 0, 200)),
    size: num(r.size, fallback.size, 0.2, 60),
    sizeEnd: num(r.sizeEnd, fallback.sizeEnd, 0, 60),
    speed: num(r.speed, fallback.speed, 0, 800),
    spread: num(r.spread, fallback.spread, 0, 360),
    life: num(r.life, fallback.life, 0.05, 5),
    gravity: num(r.gravity, fallback.gravity, -800, 800),
    drag: num(r.drag, fallback.drag, 0, 1),
    alpha: num(r.alpha, fallback.alpha, 0, 1),
  }
}

/** Accepts any stored / pasted projectile (v2 or the old v1 format) and returns a valid v2 definition. */
export function normalizeProjectile(raw: unknown): ProjectileDefinition | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, any>
  if (r.identity && r.visual) return migrateLegacyProjectile(r)
  if (typeof r.id !== 'string' || !r.id) return null

  const d = createProjectile({ id: r.id })
  const m = r.motion ?? {}
  const l = r.launch ?? {}
  const t = r.trail ?? {}
  const s = r.strike ?? {}
  const b = r.beam ?? {}
  const i = r.impact ?? {}
  return {
    version: 2,
    id: r.id,
    name: typeof r.name === 'string' && r.name.trim() ? r.name.slice(0, 60) : d.name,
    element: oneOf(r.element, PROJECTILE_ELEMENTS, d.element),
    behavior: oneOf(r.behavior, BEHAVIORS, d.behavior),
    isCustom: r.isCustom === true,
    motion: {
      speed: num(m.speed, d.motion.speed, 1, 60),
      arc: num(m.arc, d.motion.arc, 0, 2),
      wobble: num(m.wobble, d.motion.wobble, 0, 80),
      wobbleFreq: num(m.wobbleFreq, d.motion.wobbleFreq, 0, 12),
      shadow: typeof m.shadow === 'boolean' ? m.shadow : d.motion.shadow,
    },
    launch: {
      count: Math.round(num(l.count, d.launch.count, 1, 12)),
      pattern: oneOf(l.pattern, ['line', 'fan', 'helix', 'orbit', 'stagger', 'scatter'] as const, d.launch.pattern),
      spread: num(l.spread, d.launch.spread, 0, 80),
      turns: num(l.turns, d.launch.turns, 0.5, 8),
    },
    body: Array.isArray(r.body) && r.body.length > 0 ? r.body.slice(0, 12).map(normalizeLayer) : d.body,
    trail: {
      style: oneOf(t.style, ['none', 'ribbon', 'line', 'dots', 'ghost', 'zigzag', 'double'] as const, d.trail.style),
      color: color(t.color, d.trail.color),
      colorEnd: color(t.colorEnd, d.trail.colorEnd),
      alpha: num(t.alpha, d.trail.alpha, 0, 1),
      width: num(t.width, d.trail.width, 0.5, 60),
      length: Math.round(num(t.length, d.trail.length, 2, 60)),
    },
    emitter: normalizeParticles(r.emitter, d.emitter),
    strike: {
      style: oneOf(s.style, ['bolt', 'pillar', 'meteor', 'rain', 'spikes', 'eruption', 'fissure', 'portal', 'vortex', 'nova', 'rune', 'blades'] as const, d.strike.style),
      color: color(s.color, d.strike.color),
      color2: color(s.color2, d.strike.color2),
      core: color(s.core, d.strike.core),
      size: num(s.size, d.strike.size, 8, 160),
      duration: num(s.duration, d.strike.duration, 0.15, 3),
      count: Math.round(num(s.count, d.strike.count, 1, 24)),
    },
    beam: {
      style: oneOf(b.style, ['laser', 'lightning', 'wave', 'pulse'] as const, d.beam.style),
      color: color(b.color, d.beam.color),
      core: color(b.core, d.beam.core),
      width: num(b.width, d.beam.width, 1, 40),
      jitter: num(b.jitter, d.beam.jitter, 0, 60),
      duration: num(b.duration, d.beam.duration, 0.08, 2),
    },
    impact: {
      flashColor: color(i.flashColor, d.impact.flashColor),
      flashSize: num(i.flashSize, d.impact.flashSize, 0, 120),
      ringColor: color(i.ringColor, d.impact.ringColor),
      ringCount: Math.round(num(i.ringCount, d.impact.ringCount, 0, 5)),
      ringRadius: num(i.ringRadius, d.impact.ringRadius, 4, 200),
      ringWidth: num(i.ringWidth, d.impact.ringWidth, 0.5, 12),
      burst: normalizeParticles(i.burst, d.impact.burst),
      decalColor: color(i.decalColor, d.impact.decalColor),
      decalRadius: num(i.decalRadius, d.impact.decalRadius, 0, 120),
      decalLife: num(i.decalLife, d.impact.decalLife, 0.2, 10),
    },
  }
}

// ==========================================
// Old v1 projectiles stored in saved maps
// ==========================================

const LEGACY_ELEMENT: Record<string, ProjectileElement> = {
  fire: 'fire', frost: 'frost', electro: 'electro', poison: 'poison', arcane: 'arcane',
  void: 'void', siege: 'physical', holy: 'holy', custom: 'arcane',
}

const LEGACY_SHAPE: Record<string, BodyShape> = {
  circle: 'orb', procedural_flame: 'flame', rocket: 'rocket', diamond_shard: 'diamond', star: 'star',
  line_streak: 'teardrop', sand_cluster: 'orb', arrow: 'arrow', spear_lance: 'arrow', lightning_bolt: 'bolt',
  shuriken: 'shuriken', sawblade: 'shuriken', skull: 'skull', greatsword: 'blade', hammer: 'polygon',
  boulder: 'polygon', feather: 'feather', energy_orb: 'orb', energy_wave: 'crescent', sprite: 'sprite',
}

const LEGACY_STRIKE: Record<string, StrikeConfig['style']> = {
  sky_thunder: 'bolt', sky_strike: 'bolt', heavenly_pillar: 'pillar', meteor_fall: 'meteor', solar_beam: 'pillar',
  arrow_rain: 'rain', holy_spear: 'pillar', ground_fissure: 'fissure', ground_burst: 'fissure', magma_geyser: 'eruption',
  frost_spikes: 'spikes', poison_roots: 'spikes', void_portal: 'portal', quake_stomp: 'nova', unit_singularity: 'vortex',
  unit_aura: 'nova', void_vortex: 'vortex', swirling_blades: 'blades', frost_nova: 'nova', poison_cloud: 'vortex',
  electric_discharge: 'bolt', rune_seal: 'rune', holy_halo: 'rune',
}

function migrateLegacyProjectile(r: Record<string, any>): ProjectileDefinition {
  const v = r.visual ?? {}
  const mv = r.movement ?? {}
  const im = r.impact ?? {}
  const tr = r.trail ?? {}
  const main = color(v.colorCss, '#f97316')
  const glow = color(v.glowColorCss, main)
  const core = color(v.coreColorCss, '#ffffff')
  const spark = color(im.sparkColorCss, glow)
  const size = num(v.size, 8, 2, 40)
  const shape = LEGACY_SHAPE[v.shape] ?? 'orb'
  const behavior: ProjectileBehavior = mv.isInstant ? 'strike' : mv.isLaser ? 'beam' : 'flying'
  const formation = String(r.formation?.type ?? 'single')
  const launch: Partial<LaunchConfig> =
    formation.includes('helix') ? { count: formation.startsWith('triple') ? 3 : formation.startsWith('twin') ? 2 : 1, pattern: 'helix' }
      : formation.startsWith('volley') || formation === 'fan_spread' ? { count: formation.endsWith('3') ? 3 : 5, pattern: 'fan' }
        : formation === 'ring_burst' ? { count: 6, pattern: 'orbit' }
          : formation === 'staggered_burst' || formation === 'cluster_burst' ? { count: 3, pattern: 'stagger' }
            : {}

  return createProjectile({
    id: String(r.identity.id),
    name: String(r.identity.name || 'Projectile').slice(0, 60),
    element: LEGACY_ELEMENT[r.identity.category] ?? 'arcane',
    behavior,
    isCustom: r.identity.isCustom === true,
    motion: { speed: num(mv.speed, 12, 1, 60), arc: mv.hasArc ? 0.6 : 0.1, wobble: 0, wobbleFreq: 2, shadow: true },
    launch,
    body: [
      createLayer({ shape, color: main, size, stretch: shape === 'arrow' || shape === 'teardrop' ? 2.5 : shape === 'flame' ? 2 : 1, spin: shape === 'shuriken' || shape === 'star' ? 720 : 0, faceFlight: shape !== 'shuriken', assetId: typeof v.spriteTextureId === 'string' ? v.spriteTextureId : '' }),
      createLayer({ shape: 'orb', color: core, size: size * 0.4, alpha: 0.95 }),
    ],
    trail: {
      style: tr.style === 'none' ? 'none' : tr.style === 'particles' ? 'dots' : tr.style === 'solid_line' ? 'line' : 'ribbon',
      color: color(tr.colorCss, glow),
      colorEnd: main,
      alpha: num(tr.alpha, 0.7, 0, 1),
      width: num(tr.width, 4, 0.5, 40),
      length: Math.round(num(tr.length, 10, 2, 60)),
    },
    strike: { style: LEGACY_STRIKE[mv.instantType] ?? 'bolt', color: main, color2: glow, core, size: 40, duration: 0.5, count: 6 },
    beam: { style: 'laser', color: main, core, width: num(tr.width, 5, 1, 40), jitter: 6, duration: 0.25 },
    impact: {
      flashColor: spark,
      flashSize: 18,
      ringColor: color(im.shockwaveColorCss, main),
      ringCount: im.hasDoubleRing ? 2 : 1,
      ringRadius: num(im.shockwaveRadius, 24, 4, 200),
      ringWidth: 2,
      decalColor: '#1c1917',
      decalRadius: 0,
      decalLife: 1.5,
      burst: createParticles({ amount: Math.round(num(im.sparkCount, 14, 0, 80)), color: spark, colorEnd: main, size: 3, speed: 90 }),
    },
  })
}

/** The projectile's signature color as a number (damage numbers, splash rings) */
export function projectileColor(def: ProjectileDefinition): number {
  return parseInt(def.impact.ringColor.slice(1), 16) || 0xfbbf24
}
