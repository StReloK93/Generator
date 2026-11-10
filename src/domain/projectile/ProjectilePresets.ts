import type {
  BeamStyle,
  BodyLayer,
  LaunchConfig,
  MotionConfig,
  ParticleConfig,
  ProjectileDefinition,
  ProjectileElement,
  StrikeStyle,
  TrailConfig,
  TrailStyle,
} from '../../types/projectile'
import { createLayer, createParticles, createProjectile, PROJECTILE_ELEMENTS } from './ProjectileModel'

/** Colors and particle character of an element; every preset and generated projectile of it starts from this. */
export interface ElementPalette {
  main: string
  accent: string
  core: string
  glow: string
  dark: string
  trail: TrailStyle
  emitter: Partial<ParticleConfig>
  burst: Partial<ParticleConfig>
  decal: string
}

export const ELEMENT_PALETTES: Record<ProjectileElement, ElementPalette> = {
  fire: {
    main: '#f97316', accent: '#ef4444', core: '#fef08a', glow: '#fbbf24', dark: '#7c2d12', trail: 'ribbon', decal: '#1c1917',
    emitter: { shape: 'ember', color: '#fde047', colorEnd: '#dc2626', amount: 36, size: 3, sizeEnd: 0.4, speed: 22, gravity: -70, life: 0.45 },
    burst: { shape: 'ember', color: '#fef08a', colorEnd: '#dc2626', amount: 22, size: 3.4, speed: 130, gravity: -90, life: 0.55 },
  },
  frost: {
    main: '#38bdf8', accent: '#0ea5e9', core: '#ffffff', glow: '#a5f3fc', dark: '#0c4a6e', trail: 'ribbon', decal: '#7dd3fc',
    emitter: { shape: 'shard', color: '#ffffff', colorEnd: '#38bdf8', amount: 18, size: 2.4, sizeEnd: 0.6, speed: 16, gravity: 30, life: 0.55 },
    burst: { shape: 'shard', color: '#ffffff', colorEnd: '#0ea5e9', amount: 18, size: 3.4, speed: 150, gravity: 140, life: 0.6 },
  },
  electro: {
    main: '#60a5fa', accent: '#a78bfa', core: '#ffffff', glow: '#bfdbfe', dark: '#1e3a8a', trail: 'zigzag', decal: '#1e293b',
    emitter: { shape: 'spark', color: '#ffffff', colorEnd: '#60a5fa', amount: 30, size: 2, sizeEnd: 0.5, speed: 90, life: 0.18, drag: 0.8 },
    burst: { shape: 'spark', color: '#ffffff', colorEnd: '#818cf8', amount: 22, size: 2.6, speed: 240, life: 0.28, drag: 0.6 },
  },
  poison: {
    main: '#84cc16', accent: '#22c55e', core: '#ecfccb', glow: '#bef264', dark: '#365314', trail: 'dots', decal: '#365314',
    emitter: { shape: 'bubble', color: '#d9f99d', colorEnd: '#16a34a', amount: 16, size: 2.6, sizeEnd: 1.4, speed: 12, gravity: -24, life: 0.75 },
    burst: { shape: 'bubble', color: '#d9f99d', colorEnd: '#15803d', amount: 18, size: 3.6, speed: 90, gravity: 110, life: 0.7 },
  },
  arcane: {
    main: '#a855f7', accent: '#ec4899', core: '#fae8ff', glow: '#d8b4fe', dark: '#3b0764', trail: 'double', decal: '#3b0764',
    emitter: { shape: 'star', color: '#fae8ff', colorEnd: '#a855f7', amount: 16, size: 3, sizeEnd: 0.5, speed: 26, life: 0.6 },
    burst: { shape: 'star', color: '#ffffff', colorEnd: '#c026d3', amount: 18, size: 3.8, speed: 120, life: 0.6, drag: 0.7 },
  },
  void: {
    main: '#7c3aed', accent: '#e11d48', core: '#fda4af', glow: '#4c1d95', dark: '#0f0a1f', trail: 'ghost', decal: '#1e1b4b',
    emitter: { shape: 'smoke', color: '#5b21b6', colorEnd: '#0f0a1f', amount: 22, size: 3.6, sizeEnd: 7, speed: 10, gravity: -10, life: 0.8, alpha: 0.7 },
    burst: { shape: 'smoke', color: '#7c3aed', colorEnd: '#0f0a1f', amount: 16, size: 5, sizeEnd: 12, speed: 70, life: 0.8, alpha: 0.75 },
  },
  nature: {
    main: '#22c55e', accent: '#a16207', core: '#dcfce7', glow: '#86efac', dark: '#14532d', trail: 'dots', decal: '#14532d',
    emitter: { shape: 'leaf', color: '#86efac', colorEnd: '#15803d', amount: 10, size: 3.4, sizeEnd: 2, speed: 30, gravity: 40, life: 0.9 },
    burst: { shape: 'leaf', color: '#bbf7d0', colorEnd: '#166534', amount: 16, size: 4, speed: 110, gravity: 90, life: 0.9 },
  },
  holy: {
    main: '#facc15', accent: '#fff7ed', core: '#ffffff', glow: '#fef9c3', dark: '#854d0e', trail: 'ribbon', decal: '#fef08a',
    emitter: { shape: 'cross', color: '#ffffff', colorEnd: '#fde047', amount: 14, size: 3, sizeEnd: 0.6, speed: 16, gravity: -30, life: 0.6 },
    burst: { shape: 'cross', color: '#ffffff', colorEnd: '#facc15', amount: 16, size: 4, speed: 120, gravity: -40, life: 0.6 },
  },
  physical: {
    main: '#a8a29e', accent: '#78350f', core: '#f5f5f4', glow: '#d6d3d1', dark: '#292524', trail: 'line', decal: '#292524',
    emitter: { shape: 'dot', color: '#d6d3d1', colorEnd: '#78716c', amount: 8, size: 2, sizeEnd: 0.4, speed: 10, life: 0.4, alpha: 0.6 },
    burst: { shape: 'square', color: '#d6d3d1', colorEnd: '#57534e', amount: 16, size: 2.8, speed: 170, gravity: 280, life: 0.55 },
  },
  tech: {
    main: '#22d3ee', accent: '#f43f5e', core: '#ecfeff', glow: '#67e8f9', dark: '#164e63', trail: 'line', decal: '#0e7490',
    emitter: { shape: 'square', color: '#a5f3fc', colorEnd: '#0891b2', amount: 18, size: 2.2, sizeEnd: 0.4, speed: 20, life: 0.35 },
    burst: { shape: 'square', color: '#ecfeff', colorEnd: '#06b6d4', amount: 18, size: 2.8, speed: 160, life: 0.4, drag: 0.6 },
  },
}

/** The parts a body family sets on top of the element's defaults */
interface FamilyPart {
  body: Partial<BodyLayer>[]
  motion?: Partial<MotionConfig>
  launch?: Partial<LaunchConfig>
  trail?: Partial<TrailConfig>
  emitter?: Partial<ParticleConfig>
}

type Family = (p: ElementPalette) => FamilyPart

const core = (p: ElementPalette, size: number, offset = 0): Partial<BodyLayer> => ({ shape: 'orb', color: p.core, size, offset, alpha: 0.95 })

/** Flying body families: each one is a different silhouette and way of flying */
export const FLYING_FAMILIES: Record<string, Family> = {
  orb: p => ({ body: [{ shape: 'orb', color: p.main, size: 8, pulse: 0.12, pulseSpeed: 6 }, core(p, 3.5)], motion: { speed: 12, arc: 0.15 } }),
  comet: p => ({
    body: [{ shape: 'flame', color: p.glow, size: 10, stretch: 2.6, alpha: 0.4 }, { shape: 'flame', color: p.main, size: 7, stretch: 2.2 }, core(p, 3, 3)],
    trail: { length: 18, width: 8 }, motion: { speed: 14, arc: 0.25 },
  }),
  flame: p => ({
    body: [{ shape: 'flame', color: p.accent, size: 10, stretch: 1.8, pulse: 0.15, pulseSpeed: 9 }, { shape: 'flame', color: p.main, size: 7, stretch: 1.5, offset: 1 }, core(p, 3.5, 3)],
    motion: { speed: 11, arc: 0.3 },
  }),
  arrow: p => ({
    body: [{ shape: 'arrow', color: p.dark, size: 3, stretch: 7, outlineColor: p.main, outlineWidth: 0 }, { shape: 'teardrop', color: p.main, size: 3, stretch: 2, offset: 18 }],
    trail: { style: 'line', width: 2, length: 8 }, motion: { speed: 20, arc: 0.6 }, emitter: { amount: 10 },
  }),
  bolt: p => ({
    body: [{ shape: 'bolt', color: p.main, size: 7, stretch: 3 }, { shape: 'bolt', color: p.core, size: 3.5, stretch: 3 }],
    trail: { style: 'zigzag' }, motion: { speed: 22, arc: 0 },
  }),
  shard: p => ({
    body: [{ shape: 'diamond', color: p.glow, size: 9, stretch: 3, alpha: 0.35 }, { shape: 'diamond', color: p.main, size: 6, stretch: 3 }, { shape: 'diamond', color: p.core, size: 2.5, stretch: 2.6, offset: 3 }],
    motion: { speed: 18, arc: 0.1 },
  }),
  star: p => ({
    body: [{ shape: 'star', color: p.main, size: 9, sides: 5, inner: 0.45, spin: 540, faceFlight: false }, { shape: 'star', color: p.core, size: 4, sides: 5, spin: 540, faceFlight: false }],
    motion: { speed: 12, arc: 0.3 },
  }),
  shuriken: p => ({
    body: [{ shape: 'shuriken', color: p.main, size: 11, sides: 4, inner: 0.3, spin: 1080, faceFlight: false, outlineColor: p.dark, outlineWidth: 1.2 }, core(p, 2.5)],
    trail: { style: 'ghost', length: 6 }, motion: { speed: 16, arc: 0.15 },
  }),
  crescent: p => ({
    body: [{ shape: 'crescent', color: p.glow, size: 16, inner: 0.62, alpha: 0.35 }, { shape: 'crescent', color: p.main, size: 13, inner: 0.66 }, { shape: 'crescent', color: p.core, size: 11, inner: 0.82 }],
    trail: { width: 12, length: 10 }, motion: { speed: 13, arc: 0 },
  }),
  rocket: p => ({
    body: [{ shape: 'flame', color: p.glow, size: 6, stretch: 2.2, offset: -16, pulse: 0.3, pulseSpeed: 14 }, { shape: 'flame', color: p.core, size: 3, stretch: 2, offset: -14 }, { shape: 'rocket', color: p.main, size: 5, stretch: 3.4, outlineColor: p.dark, outlineWidth: 1 }],
    emitter: { shape: 'smoke', color: '#94a3b8', colorEnd: '#1e293b', size: 3, sizeEnd: 8, speed: 8, gravity: -14, life: 0.7, amount: 30, alpha: 0.55 },
    trail: { style: 'none' }, motion: { speed: 15, arc: 0.15, wobble: 6, wobbleFreq: 3 },
  }),
  spear: p => ({
    body: [{ shape: 'diamond', color: p.glow, size: 5, stretch: 8, alpha: 0.35 }, { shape: 'diamond', color: p.main, size: 3.2, stretch: 8 }, { shape: 'diamond', color: p.core, size: 3, stretch: 2.4, offset: 20 }],
    trail: { width: 3, length: 14 }, motion: { speed: 24, arc: 0.2 },
  }),
  boulder: p => ({
    body: [{ shape: 'polygon', color: p.main, size: 10, sides: 7, spin: 300, faceFlight: false, outlineColor: p.dark, outlineWidth: 1.6 }, { shape: 'polygon', color: p.glow, size: 5, sides: 6, spin: 300, faceFlight: false, alpha: 0.55, offset: 2 }],
    trail: { style: 'dots', length: 6, width: 4 }, motion: { speed: 9, arc: 1 },
  }),
  ring: p => ({
    body: [{ shape: 'ring', color: p.glow, size: 14, inner: 0.7, stretch: 0.55, alpha: 0.4 }, { shape: 'ring', color: p.main, size: 11, inner: 0.75, stretch: 0.55, pulse: 0.15, pulseSpeed: 5 }],
    trail: { style: 'ghost', length: 6 }, motion: { speed: 12, arc: 0 },
  }),
  orbitals: p => ({
    body: [{ shape: 'orb', color: p.main, size: 5 }, { shape: 'orb', color: p.core, size: 3, orbit: 12, orbitSpeed: 2, copies: 3 }],
    motion: { speed: 11, arc: 0.2 },
  }),
  cross: p => ({
    body: [{ shape: 'cross', color: p.main, size: 10, inner: 0.3, spin: 360, faceFlight: false }, core(p, 3)],
    motion: { speed: 12, arc: 0.2 },
  }),
  spikes: p => ({
    body: [{ shape: 'spikes', color: p.main, size: 10, sides: 8, inner: 0.55, spin: 240, faceFlight: false, outlineColor: p.dark, outlineWidth: 1 }, { shape: 'orb', color: p.accent, size: 5 }, core(p, 2)],
    motion: { speed: 10, arc: 0.6 },
  }),
  teardrop: p => ({
    body: [{ shape: 'teardrop', color: p.glow, size: 8, stretch: 2, alpha: 0.35 }, { shape: 'teardrop', color: p.main, size: 6, stretch: 1.8 }, core(p, 2.2, 3)],
    motion: { speed: 13, arc: 0.5 },
  }),
  feather: p => ({
    body: [{ shape: 'feather', color: p.main, size: 5, stretch: 4, outlineColor: p.core, outlineWidth: 0.8 }],
    motion: { speed: 15, arc: 0.2, wobble: 8, wobbleFreq: 2 },
  }),
  skull: p => ({
    body: [{ shape: 'skull', color: p.main, size: 9, pulse: 0.1, pulseSpeed: 4, faceFlight: false }],
    trail: { style: 'ghost', length: 8 }, motion: { speed: 10, arc: 0.1, wobble: 5, wobbleFreq: 3 },
  }),
  volley: p => ({
    body: [{ shape: 'arrow', color: p.dark, size: 2.4, stretch: 6 }, { shape: 'teardrop', color: p.main, size: 2.6, stretch: 2, offset: 14 }],
    launch: { count: 3, pattern: 'fan', spread: 18 }, trail: { style: 'line', width: 1.6, length: 6 }, motion: { speed: 19, arc: 0.55 },
  }),
  helix: p => ({
    body: [{ shape: 'orb', color: p.main, size: 5 }, core(p, 2)],
    launch: { count: 2, pattern: 'helix', spread: 13, turns: 2.5 }, motion: { speed: 12, arc: 0.1 },
  }),
  swarm: p => ({
    body: [{ shape: 'orb', color: p.main, size: 3.4 }],
    launch: { count: 5, pattern: 'scatter', spread: 24 }, trail: { length: 8, width: 3 }, emitter: { amount: 8 },
    motion: { speed: 13, arc: 0.3, wobble: 6, wobbleFreq: 4 },
  }),
  barrage: p => ({
    body: [{ shape: 'diamond', color: p.main, size: 4, stretch: 3 }, { shape: 'diamond', color: p.core, size: 1.8, stretch: 2.4, offset: 2 }],
    launch: { count: 4, pattern: 'stagger', spread: 12 }, trail: { length: 8, width: 3 }, motion: { speed: 20, arc: 0.1 },
  }),
  trinity: p => ({
    body: [{ shape: 'star', color: p.main, size: 6, sides: 4, spin: 600, faceFlight: false }],
    launch: { count: 3, pattern: 'orbit', spread: 15, turns: 1.5 }, motion: { speed: 11, arc: 0.15 },
  }),
}

export const STRIKE_STYLES: readonly StrikeStyle[] = ['bolt', 'pillar', 'meteor', 'rain', 'spikes', 'eruption', 'fissure', 'portal', 'vortex', 'nova', 'rune', 'blades']
export const BEAM_STYLES: readonly BeamStyle[] = ['laser', 'lightning', 'wave', 'pulse']

const STRIKE_SHAPE: Record<StrikeStyle, { size: number; duration: number; count: number }> = {
  bolt: { size: 30, duration: 0.4, count: 3 },
  pillar: { size: 26, duration: 0.6, count: 4 },
  meteor: { size: 18, duration: 0.55, count: 1 },
  rain: { size: 40, duration: 0.6, count: 10 },
  spikes: { size: 34, duration: 0.6, count: 7 },
  eruption: { size: 24, duration: 0.65, count: 8 },
  fissure: { size: 44, duration: 0.6, count: 5 },
  portal: { size: 34, duration: 0.7, count: 6 },
  vortex: { size: 36, duration: 0.7, count: 4 },
  nova: { size: 48, duration: 0.5, count: 12 },
  rune: { size: 38, duration: 0.75, count: 6 },
  blades: { size: 34, duration: 0.65, count: 4 },
}

function impactFor(p: ElementPalette, scale = 1): ProjectileDefinition['impact'] {
  return {
    flashColor: p.core,
    flashSize: 18 * scale,
    ringColor: p.main,
    ringCount: 1,
    ringRadius: 26 * scale,
    ringWidth: 2,
    burst: createParticles(p.burst),
    decalColor: p.decal,
    decalRadius: 12 * scale,
    decalLife: 1.4,
  }
}

function mergeFamily(base: ProjectileDefinition, part: FamilyPart): ProjectileDefinition {
  return createProjectile({
    ...base,
    body: part.body.map(l => createLayer(l)),
    motion: { ...base.motion, ...part.motion },
    launch: { ...base.launch, ...part.launch },
    trail: { ...base.trail, ...part.trail },
    emitter: { ...base.emitter, ...part.emitter },
  })
}

/** A flying projectile of an element and body family */
export function buildFlying(element: ProjectileElement, family: string, id = `${element}-${family}`): ProjectileDefinition {
  const p = ELEMENT_PALETTES[element]
  const base = createProjectile({
    id,
    name: `${element} ${family}`,
    element,
    behavior: 'flying',
    trail: { style: p.trail, color: p.glow, colorEnd: p.main, alpha: 0.8, width: 6, length: 12 },
    emitter: p.emitter,
    impact: impactFor(p),
  })
  return mergeFamily(base, (FLYING_FAMILIES[family] ?? FLYING_FAMILIES.orb)(p))
}

export function buildStrike(element: ProjectileElement, style: StrikeStyle, id = `${element}-strike-${style}`): ProjectileDefinition {
  const p = ELEMENT_PALETTES[element]
  return createProjectile({
    id,
    name: `${element} ${style}`,
    element,
    behavior: 'strike',
    strike: { style, color: p.main, color2: p.accent, core: p.core, ...STRIKE_SHAPE[style] },
    impact: impactFor(p, 1.3),
  })
}

export function buildBeam(element: ProjectileElement, style: BeamStyle, id = `${element}-beam-${style}`): ProjectileDefinition {
  const p = ELEMENT_PALETTES[element]
  return createProjectile({
    id,
    name: `${element} ${style}`,
    element,
    behavior: 'beam',
    beam: { style, color: p.main, core: p.core, width: style === 'lightning' ? 3 : 6, jitter: style === 'wave' ? 10 : 14, duration: 0.3 },
    impact: { ...impactFor(p, 0.8), ringCount: 0 },
  })
}

/** What a library preset is made of (the UI names it from these) */
export interface PresetParts {
  element: ProjectileElement
  kind: 'flying' | 'strike' | 'beam'
  key: string
}

export function presetParts(id: string): PresetParts | null {
  const [element, a, b] = id.split('-')
  if (!PROJECTILE_ELEMENTS.includes(element as ProjectileElement)) return null
  if (a === 'strike' || a === 'beam') return b ? { element: element as ProjectileElement, kind: a, key: b } : null
  return a ? { element: element as ProjectileElement, kind: 'flying', key: a } : null
}

function buildLibrary(): ProjectileDefinition[] {
  const list: ProjectileDefinition[] = []
  for (const element of PROJECTILE_ELEMENTS) {
    for (const family of Object.keys(FLYING_FAMILIES)) list.push(buildFlying(element, family))
    for (const style of STRIKE_STYLES) list.push(buildStrike(element, style))
    for (const style of BEAM_STYLES) list.push(buildBeam(element, style))
  }
  return list
}

/** Built-in library: every element × every flying family, strike style and beam style */
export const PRESET_PROJECTILES: readonly ProjectileDefinition[] = buildLibrary()

export const DEFAULT_PROJECTILE_ID = 'fire-comet'

/** Ids of the old built-in projectiles that saved maps' towers still point at */
export const LEGACY_PRESET_IDS: Record<string, string> = {
  fireball: 'fire-comet',
  flame_rocket: 'fire-rocket',
  arrow: 'frost-shard',
  simple_frost: 'frost-orb',
  shuriken: 'physical-shuriken',
  twin_helix_orb: 'arcane-helix',
  sky_thunder_strike: 'electro-strike-bolt',
  meteor_fall_strike: 'fire-strike-meteor',
  heavenly_pillar_strike: 'holy-strike-pillar',
  earth_ground_burst: 'void-strike-fissure',
  magma_geyser_burst: 'fire-strike-eruption',
  frost_spikes_burst: 'frost-strike-spikes',
  void_portal_burst: 'void-strike-portal',
  swirling_blades_aura: 'void-strike-blades',
  frost_nova_aura: 'frost-strike-nova',
  poison_cloud_aura: 'poison-strike-vortex',
  rune_seal_aura: 'arcane-strike-rune',
  laser_beam: 'tech-beam-laser',
  line_streak_beam: 'electro-beam-laser',
}
