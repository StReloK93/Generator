import type {
  BodyLayer,
  BodyShape,
  LaunchPattern,
  ParticleShape,
  ProjectileBehavior,
  ProjectileDefinition,
  ProjectileElement,
  TrailStyle,
} from '../../types/projectile'
import { cloneProjectile, createLayer, createParticles, createProjectile, newProjectileId, PROJECTILE_ELEMENTS } from './ProjectileModel'
import { BEAM_STYLES, ELEMENT_PALETTES, STRIKE_STYLES } from './ProjectilePresets'

// ==========================================
// Colors
// ==========================================

function hexToHsl(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  const r = ((n >> 16) & 255) / 255
  const g = ((n >> 8) & 255) / 255
  const b = (n & 255) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h * 60, s, l]
}

function hslToHex(h: number, s: number, l: number): string {
  const hue = ((h % 360) + 360) % 360
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1))
  const m = l - c / 2
  const [r, g, b] = hue < 60 ? [c, x, 0] : hue < 120 ? [x, c, 0] : hue < 180 ? [0, c, x] : hue < 240 ? [0, x, c] : hue < 300 ? [x, 0, c] : [c, 0, x]
  const to = (v: number) => Math.round(Math.min(1, Math.max(0, v + m)) * 255).toString(16).padStart(2, '0')
  return `#${to(r)}${to(g)}${to(b)}`
}

export function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16)
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255
}

/** Every color field of a projectile (body layers, trail, particles, strike, beam, impact) */
function mapColors(def: ProjectileDefinition, fn: (hex: string) => string): ProjectileDefinition {
  const d = cloneProjectile(def)
  for (const l of d.body) {
    l.color = fn(l.color)
    l.outlineColor = fn(l.outlineColor)
  }
  d.trail.color = fn(d.trail.color)
  d.trail.colorEnd = fn(d.trail.colorEnd)
  for (const p of [d.emitter, d.impact.burst]) {
    p.color = fn(p.color)
    p.colorEnd = fn(p.colorEnd)
  }
  d.strike.color = fn(d.strike.color)
  d.strike.color2 = fn(d.strike.color2)
  d.strike.core = fn(d.strike.core)
  d.beam.color = fn(d.beam.color)
  d.beam.core = fn(d.beam.core)
  d.impact.flashColor = fn(d.impact.flashColor)
  d.impact.ringColor = fn(d.impact.ringColor)
  d.impact.decalColor = fn(d.impact.decalColor)
  return d
}

/** Turns every color around the color wheel (keeps light and dark parts) */
export function shiftHue(def: ProjectileDefinition, degrees: number): ProjectileDefinition {
  return mapColors(def, hex => {
    const [h, s, l] = hexToHsl(hex)
    return s < 0.06 ? hex : hslToHex(h + degrees, s, l)
  })
}

/** All distinct colors a projectile uses, darkest first */
export function projectileColors(def: ProjectileDefinition): string[] {
  const seen = new Set<string>()
  mapColors(def, hex => {
    seen.add(hex)
    return hex
  })
  return [...seen].sort((a, b) => luminance(a) - luminance(b))
}

/**
 * Recolors a projectile with a palette (e.g. taken from a game asset): its colors and the palette are both
 * ordered dark → light and matched by rank, so dark parts stay dark and the glowing core stays bright.
 */
export function applyPalette(def: ProjectileDefinition, palette: string[]): ProjectileDefinition {
  if (palette.length === 0) return def
  const target = [...palette].sort((a, b) => luminance(a) - luminance(b))
  const source = projectileColors(def)
  const map = new Map<string, string>()
  source.forEach((hex, i) => {
    const rank = source.length === 1 ? 0.5 : i / (source.length - 1)
    // Near-white cores stay white-ish: a palette's brightest color is used, lifted a little
    const picked = target[Math.round(rank * (target.length - 1))]
    const [h, s, l] = hexToHsl(picked)
    map.set(hex, luminance(hex) > 0.92 ? hslToHex(h, s * 0.4, Math.max(l, 0.9)) : picked)
  })
  return mapColors(def, hex => map.get(hex) ?? hex)
}

// ==========================================
// Random projectiles
// ==========================================

type Random = () => number

const pick = <T>(random: Random, list: readonly T[]): T => list[Math.floor(random() * list.length)]
const between = (random: Random, min: number, max: number) => min + random() * (max - min)
const round = (n: number, step = 0.1) => Math.round(n / step) * step

const NAME_A = ['Storm', 'Ember', 'Frost', 'Shadow', 'Star', 'Thorn', 'Ghost', 'Rune', 'Solar', 'Iron', 'Venom', 'Moon', 'Crystal', 'Ash', 'Dawn', 'Night', 'Blood', 'Sky', 'Abyss', 'Spark']
const NAME_B = ['Comet', 'Fang', 'Orb', 'Lance', 'Shard', 'Wisp', 'Bolt', 'Seed', 'Nova', 'Blade', 'Drop', 'Sigil', 'Spike', 'Flare', 'Arrow', 'Core', 'Heart', 'Eye', 'Wing', 'Pearl']

export function randomProjectileName(random: Random = Math.random): string {
  return `${pick(random, NAME_A)} ${pick(random, NAME_B)}`
}

/** Shapes that read well as the main silhouette, with the stretch / spin that suits them */
const MAIN_SHAPES: { shape: BodyShape; stretch: [number, number]; spin?: [number, number]; sides?: [number, number] }[] = [
  { shape: 'orb', stretch: [1, 1.4] },
  { shape: 'flame', stretch: [1.4, 2.8] },
  { shape: 'teardrop', stretch: [1.4, 2.4] },
  { shape: 'diamond', stretch: [1.5, 4] },
  { shape: 'star', stretch: [1, 1], spin: [300, 900], sides: [4, 8] },
  { shape: 'shuriken', stretch: [1, 1], spin: [700, 1400], sides: [3, 6] },
  { shape: 'spikes', stretch: [1, 1], spin: [120, 500], sides: [6, 12] },
  { shape: 'polygon', stretch: [1, 1.3], spin: [0, 400], sides: [3, 8] },
  { shape: 'crescent', stretch: [1, 1] },
  { shape: 'bolt', stretch: [2, 3.5] },
  { shape: 'cross', stretch: [1, 1], spin: [200, 600] },
  { shape: 'ring', stretch: [0.5, 1] },
  { shape: 'arrow', stretch: [5, 8] },
  { shape: 'feather', stretch: [3, 4.5] },
  { shape: 'rocket', stretch: [2.8, 3.8] },
  { shape: 'blade', stretch: [2, 3.5] },
  { shape: 'skull', stretch: [1, 1] },
]

const TRAILS: readonly TrailStyle[] = ['ribbon', 'ribbon', 'line', 'dots', 'ghost', 'zigzag', 'double', 'none']
const PARTICLES: readonly ParticleShape[] = ['dot', 'square', 'star', 'spark', 'ember', 'shard', 'ring', 'cross', 'smoke', 'leaf', 'bubble']
const PATTERNS: readonly LaunchPattern[] = ['fan', 'helix', 'orbit', 'stagger', 'scatter']

export interface GenerateOptions {
  behavior?: ProjectileBehavior
  element?: ProjectileElement
  /** Colors to build it from (e.g. taken from a game asset) */
  palette?: string[]
}

/** A brand new random projectile; every press of "generate" gives a different one */
export function generateProjectile(options: GenerateOptions = {}, random: Random = Math.random): ProjectileDefinition {
  const element = options.element ?? pick(random, PROJECTILE_ELEMENTS)
  const behavior = options.behavior ?? (random() < 0.7 ? 'flying' : random() < 0.65 ? 'strike' : 'beam')
  const p = ELEMENT_PALETTES[element]
  const size = between(random, 5, 11)

  const body: BodyLayer[] = []
  const main = pick(random, MAIN_SHAPES)
  const spin = main.spin ? between(random, main.spin[0], main.spin[1]) * (random() < 0.5 ? -1 : 1) : 0
  const sides = main.sides ? Math.round(between(random, main.sides[0], main.sides[1])) : 5
  const stretch = round(between(random, main.stretch[0], main.stretch[1]))
  body.push(createLayer({
    shape: main.shape, color: p.main, size: round(size), stretch, spin: round(spin, 10), sides, faceFlight: spin === 0,
    inner: round(between(random, 0.3, 0.7), 0.05), pulse: random() < 0.3 ? round(between(random, 0.08, 0.25), 0.01) : 0, pulseSpeed: round(between(random, 2, 10), 0.5),
    outlineColor: p.dark, outlineWidth: random() < 0.35 ? 1.2 : 0,
  }))
  if (random() < 0.45) body.push(createLayer({ shape: main.shape, color: p.accent, size: round(size * 0.6), stretch, spin: round(spin, 10), sides, faceFlight: spin === 0, alpha: 0.85, offset: round(between(random, 0, 3)) }))
  if (random() < 0.7) body.push(createLayer({ shape: 'orb', color: p.core, size: round(size * between(random, 0.3, 0.45)), offset: main.stretch[0] > 1.4 ? round(size * 0.4) : 0 }))
  if (random() < 0.2) body.push(createLayer({ shape: pick(random, ['orb', 'star', 'diamond'] as const), color: p.core, size: round(size * 0.3), orbit: round(size * between(random, 1.3, 2)), orbitSpeed: round(between(random, 1, 3), 0.5), copies: Math.round(between(random, 2, 4)), spin: 300 }))

  const multi = random() < 0.25
  const particleShape = random() < 0.6 ? (p.emitter.shape ?? 'dot') : pick(random, PARTICLES)
  const def = createProjectile({
    id: newProjectileId(),
    name: randomProjectileName(random),
    element,
    behavior,
    isCustom: true,
    motion: {
      speed: round(between(random, 8, 22), 1),
      arc: round(random() < 0.3 ? between(random, 0.5, 1) : between(random, 0, 0.35), 0.05),
      wobble: random() < 0.2 ? round(between(random, 3, 10), 1) : 0,
      wobbleFreq: round(between(random, 1.5, 4), 0.5),
      shadow: true,
    },
    launch: multi
      ? { count: Math.round(between(random, 2, 5)), pattern: pick(random, PATTERNS), spread: round(between(random, 10, 22), 1), turns: round(between(random, 1, 3), 0.5) }
      : { count: 1, pattern: 'line', spread: 14, turns: 2 },
    body,
    trail: { style: pick(random, TRAILS), color: p.glow, colorEnd: p.main, alpha: round(between(random, 0.55, 0.9), 0.05), width: round(size * between(random, 0.5, 1)), length: Math.round(between(random, 6, 18)) },
    emitter: { ...p.emitter, shape: particleShape, amount: random() < 0.25 ? 0 : Math.round(between(random, 8, 36)) },
    strike: { style: pick(random, STRIKE_STYLES), color: p.main, color2: p.accent, core: p.core, size: Math.round(between(random, 24, 48)), duration: round(between(random, 0.4, 0.75), 0.05), count: Math.round(between(random, 4, 10)) },
    beam: { style: pick(random, BEAM_STYLES), color: p.main, core: p.core, width: round(between(random, 3, 8), 0.5), jitter: Math.round(between(random, 6, 18)), duration: round(between(random, 0.2, 0.4), 0.05) },
    impact: {
      flashColor: p.core,
      flashSize: Math.round(between(random, 12, 26)),
      ringColor: p.main,
      ringCount: Math.round(between(random, 0, 2.6)),
      ringRadius: Math.round(between(random, 18, 38)),
      ringWidth: round(between(random, 1.5, 3), 0.5),
      burst: createParticles({ ...p.burst, shape: random() < 0.7 ? (p.burst.shape ?? 'dot') : particleShape, amount: Math.round(between(random, 10, 28)) }),
      decalColor: p.decal,
      decalRadius: random() < 0.5 ? Math.round(between(random, 8, 18)) : 0,
      decalLife: 1.4,
    },
  })
  return options.palette?.length ? applyPalette(def, options.palette) : def
}

/** A close relative: the same projectile with its numbers nudged by up to `amount` (0..1) */
export function mutateProjectile(def: ProjectileDefinition, amount = 0.25, random: Random = Math.random): ProjectileDefinition {
  const d = cloneProjectile(def)
  const nudge = (v: number, min: number, max: number, step = 0.1) => round(Math.min(max, Math.max(min, v * (1 + (random() * 2 - 1) * amount))), step)
  for (const l of d.body) {
    l.size = nudge(l.size, 0.5, 200)
    l.stretch = nudge(l.stretch, 0.1, 12)
    if (l.spin !== 0) l.spin = nudge(l.spin, -3600, 3600, 10)
    if (l.pulse > 0) l.pulse = nudge(l.pulse, 0, 1, 0.01)
  }
  d.motion.speed = nudge(d.motion.speed, 1, 60, 1)
  d.motion.arc = nudge(d.motion.arc, 0, 2, 0.05)
  d.trail.width = nudge(d.trail.width, 0.5, 60)
  d.trail.length = Math.round(nudge(d.trail.length, 2, 60, 1))
  for (const p of [d.emitter, d.impact.burst]) {
    p.size = nudge(p.size, 0.2, 60)
    p.speed = nudge(p.speed, 0, 800, 1)
    p.life = nudge(p.life, 0.05, 5, 0.05)
    p.amount = Math.round(nudge(p.amount, 0, 200, 1))
  }
  d.strike.size = nudge(d.strike.size, 8, 160, 1)
  d.beam.width = nudge(d.beam.width, 1, 40, 0.5)
  d.impact.ringRadius = nudge(d.impact.ringRadius, 4, 200, 1)
  return shiftHue(d, (random() * 2 - 1) * 40 * amount)
}
