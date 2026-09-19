import {
  Flame, Snowflake, Zap, Skull, Wand2, Ghost, Crosshair, Sun,
  Sparkles, Rocket, Wind, Mountain
} from 'lucide-vue-next'
import { ProjectileType } from '../types/map'
import { ProjectileFormation, ProjectileShape, SparkParticleType, TrailStyle } from '../stores/projectileStore'

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

export interface ProjectileDef {
  id: ProjectileType
  name: string
  nameUz: string
  category: ProjectileCategory
  categoryName: string
  icon?: any
  iconName?: string
  colorHex: number
  colorCss: string
  trailColorHex: number
  trailColorCss: string
  sparkColorHex: number
  sparkColorCss: string
  shockwaveColorHex: number
  shockwaveColorCss: string
  hasArc: boolean
  isLaser: boolean
  isInstant?: boolean
  instantType?: 'sky_strike' | 'ground_burst' | 'unit_aura'
  trailAlpha: number
  trailLength?: number
  trailWidth?: number
  trailStyle?: TrailStyle
  description: string
  formation?: ProjectileFormation
  shape?: ProjectileShape
  size?: number
  length?: number
  points?: number
  satelliteCount?: number
  sparkType?: SparkParticleType
  sparkCount?: number
  shockwaveRadius?: number
  hasDoubleRing?: boolean
  isCustom?: boolean
}

export interface ProjectileCategoryMeta {
  id: ProjectileCategory
  name: string
  nameUz: string
  icon: any
  color: string
  bgClass: string
  borderClass: string
  glowClass: string
}

export const PROJECTILE_CATEGORIES: ProjectileCategoryMeta[] = [
  {
    id: 'fire',
    name: 'Fire / Inferno',
    nameUz: 'Olov / Magma',
    icon: Flame,
    color: '#f97316',
    bgClass: 'bg-orange-500/10 hover:bg-orange-500/20 text-orange-400',
    borderClass: 'border-orange-500/40',
    glowClass: 'shadow-orange-500/30'
  },
  {
    id: 'frost',
    name: 'Frost / Ice',
    nameUz: 'Muz / Qor',
    icon: Snowflake,
    color: '#06b6d4',
    bgClass: 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400',
    borderClass: 'border-cyan-500/40',
    glowClass: 'shadow-cyan-500/30'
  },
  {
    id: 'electro',
    name: 'Electro / Storm',
    nameUz: 'Elektr / Chaqmoq',
    icon: Zap,
    color: '#3b82f6',
    bgClass: 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400',
    borderClass: 'border-blue-500/40',
    glowClass: 'shadow-blue-500/30'
  },
  {
    id: 'poison',
    name: 'Poison / Nature',
    nameUz: 'Zahar / Kislota',
    icon: Skull,
    color: '#22c55e',
    bgClass: 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400',
    borderClass: 'border-emerald-500/40',
    glowClass: 'shadow-emerald-500/30'
  },
  {
    id: 'arcane',
    name: 'Arcane / Cosmic',
    nameUz: 'Sehr / Fazoviy',
    icon: Wand2,
    color: '#a855f7',
    bgClass: 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-400',
    borderClass: 'border-purple-500/40',
    glowClass: 'shadow-purple-500/30'
  },
  {
    id: 'void',
    name: 'Void / Blood',
    nameUz: 'Zulmat / Qon',
    icon: Ghost,
    color: '#e11d48',
    bgClass: 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400',
    borderClass: 'border-rose-500/40',
    glowClass: 'shadow-rose-500/30'
  },
  {
    id: 'siege',
    name: 'Siege / Physical',
    nameUz: 'Qamal / Mexanik',
    icon: Crosshair,
    color: '#f59e0b',
    bgClass: 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400',
    borderClass: 'border-amber-500/40',
    glowClass: 'shadow-amber-500/30'
  },
  {
    id: 'holy',
    name: 'Holy / Radiant',
    nameUz: 'Muqaddas / Nur',
    icon: Sun,
    color: '#eab308',
    bgClass: 'bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400',
    borderClass: 'border-yellow-500/40',
    glowClass: 'shadow-yellow-500/30'
  },
  {
    id: 'custom',
    name: 'Custom / Studio',
    nameUz: 'Maxsus / Redaktor',
    icon: Sparkles,
    color: '#ec4899',
    bgClass: 'bg-pink-500/10 hover:bg-pink-500/20 text-pink-400',
    borderClass: 'border-pink-500/40',
    glowClass: 'shadow-pink-500/30'
  },
]

export const BASE_PROJECTILE_CATALOG: ProjectileDef[] = [
  // ==========================================
  // 1. SIMPLE FLAME (Scale: 0.40)
  // ==========================================
  {
    id: 'fireball',
    name: 'Simple Flame',
    nameUz: 'Oddiy Olov',
    category: 'fire',
    categoryName: 'Fire',
    icon: Flame,
    iconName: 'Flame',
    colorHex: 0xf97316,
    colorCss: '#f97316',
    trailColorHex: 0xfbbf24,
    trailColorCss: '#fbbf24',
    sparkColorHex: 0xfbbf24,
    sparkColorCss: '#fbbf24',
    shockwaveColorHex: 0xef4444,
    shockwaveColorCss: '#ef4444',
    hasArc: false,
    isLaser: false,
    trailAlpha: 0.2,
    trailLength: 4,
    trailWidth: 3,
    trailStyle: 'particles',
    description: 'Klassik oddiy olov shari (scale: 1.00)',
    formation: 'single',
    shape: 'circle',
    size: 8,
    length: 24,
    points: 4,
    satelliteCount: 0,
    sparkType: 'fire_ember',
    sparkCount: 16,
    shockwaveRadius: 22,
    hasDoubleRing: true,
  },
  // ==========================================
  // 2. MIDDLE FLAME (Scale: 0.60)
  // ==========================================
  {
    id: 'middle_flame',
    name: 'Middle Flame',
    nameUz: "O'rta Olov",
    category: 'fire',
    categoryName: 'Fire',
    icon: Flame,
    iconName: 'Flame',
    colorHex: 0xf97316,
    colorCss: '#f97316',
    trailColorHex: 0xfbbf24,
    trailColorCss: '#fbbf24',
    sparkColorHex: 0xfbbf24,
    sparkColorCss: '#fbbf24',
    shockwaveColorHex: 0xef4444,
    shockwaveColorCss: '#ef4444',
    hasArc: true,
    isLaser: false,
    trailAlpha: 0.4,
    trailLength: 4,
    trailWidth: 4,
    trailStyle: 'none',
    description: "O'rtacha kattalikdagi olov shari (scale: 1.30)",
    formation: 'single',
    shape: 'circle',
    size: 12,
    length: 24,
    points: 4,
    satelliteCount: 0,
    sparkType: 'fire_ember',
    sparkCount: 18,
    shockwaveRadius: 26,
    hasDoubleRing: true,
  },
  // ==========================================
  // 3. STRONG FLAME (Scale: 0.80)
  // ==========================================
  {
    id: 'strong_flame',
    name: 'Strong Flame',
    nameUz: 'Kuchli Olov',
    category: 'fire',
    categoryName: 'Fire',
    icon: Flame,
    iconName: 'Flame',
    colorHex: 0xf97316,
    colorCss: '#f97316',
    trailColorHex: 0xfbbf24,
    trailColorCss: '#fbbf24',
    sparkColorHex: 0xfbbf24,
    sparkColorCss: '#fbbf24',
    shockwaveColorHex: 0xef4444,
    shockwaveColorCss: '#ef4444',
    hasArc: true,
    isLaser: false,
    trailAlpha: 0.1,
    trailLength: 13,
    trailWidth: 4,
    trailStyle: 'particles',
    description: 'Katta va kuchli olov shari (scale: 2.20)',
    formation: 'single',
    shape: 'circle',
    size: 12,
    length: 24,
    points: 4,
    satelliteCount: 0,
    sparkType: 'fire_ember',
    sparkCount: 6,
    shockwaveRadius: 44,
    hasDoubleRing: true,
  },
  // ==========================================
  // 4. FLAME ROCKET (Scale: 0.40)
  // ==========================================
  {
    id: 'flame_rocket',
    name: 'Flame Rocket',
    nameUz: 'Olovli Raketa',
    category: 'fire',
    categoryName: 'Fire',
    icon: Rocket,
    iconName: 'Rocket',
    colorHex: 0xf97316,
    colorCss: '#f97316',
    trailColorHex: 0xfbbf24,
    trailColorCss: '#fbbf24',
    sparkColorHex: 0xfef08a,
    sparkColorCss: '#fef08a',
    shockwaveColorHex: 0xef4444,
    shockwaveColorCss: '#ef4444',
    hasArc: false,
    isLaser: false,
    trailAlpha: 0.85,
    trailLength: 3,
    trailWidth: 4,
    trailStyle: 'glow_streak',
    description: 'Aerodinamik olovli reaktiv raketa (Teardrop Flame Rocket, scale: 0.80)',
    formation: 'single',
    shape: 'flame_wisp',
    size: 6,
    length: 28,
    points: 4,
    satelliteCount: 0,
    sparkType: 'fire_ember',
    sparkCount: 18,
    shockwaveRadius: 26,
    hasDoubleRing: true,
  },
  // ==========================================
  // 5. ZIG ZAG FLAME (Twin Helix)
  // ==========================================
  {
    id: 'custom_1789581747615_gpm0',
    name: 'zig zig flame',
    nameUz: 'Zig Zag Olov',
    category: 'fire',
    categoryName: 'Fire',
    icon: Sparkles,
    iconName: 'Flame',
    colorHex: 0xf97316,
    colorCss: '#f97316',
    trailColorHex: 0xfbbf24,
    trailColorCss: '#fbbf24',
    sparkColorHex: 0xfbbf24,
    sparkColorCss: '#fbbf24',
    shockwaveColorHex: 0xef4444,
    shockwaveColorCss: '#ef4444',
    hasArc: false,
    isLaser: false,
    trailAlpha: 0.2,
    trailLength: 10,
    trailWidth: 10,
    trailStyle: 'particles',
    description: "Zig-zag / spiral egizak to'lqinli olovli snaryad",
    formation: 'twin_helix',
    shape: 'circle',
    size: 10,
    length: 24,
    points: 4,
    satelliteCount: 0,
    sparkType: 'fire_ember',
    sparkCount: 16,
    shockwaveRadius: 22,
    hasDoubleRing: true,
  },
  // ==========================================
  // 6. SIMPLE FROST (Diamond Shard)
  // ==========================================
  {
    id: 'custom_1789582542158_lnev',
    name: 'Simple frost',
    nameUz: 'Oddiy Muz',
    category: 'frost',
    categoryName: 'Frost',
    icon: Snowflake,
    iconName: 'Snowflake',
    colorHex: 0x06b6d4,
    colorCss: '#06b6d4',
    trailColorHex: 0x3b82f6,
    trailColorCss: '#3b82f6',
    sparkColorHex: 0x06b6d4,
    sparkColorCss: '#06b6d4',
    shockwaveColorHex: 0x06b6d4,
    shockwaveColorCss: '#06b6d4',
    hasArc: true,
    isLaser: false,
    trailAlpha: 0.2,
    trailLength: 4,
    trailWidth: 3,
    trailStyle: 'particles',
    description: "O'tkir qirrali olmos kristall muz snaryadi",
    formation: 'single',
    shape: 'diamond_shard',
    size: 4,
    length: 24,
    points: 4,
    satelliteCount: 0,
    sparkType: 'ice_shard',
    sparkCount: 16,
    shockwaveRadius: 22,
    hasDoubleRing: true,
  },
  // ==========================================
  // 7. MIDDLE FROST (Ice Orb)
  // ==========================================
  {
    id: 'custom_1789582622693_n5g8',
    name: 'Middle frost',
    nameUz: "O'rta Muz",
    category: 'frost',
    categoryName: 'Frost',
    icon: Snowflake,
    iconName: 'Snowflake',
    colorHex: 0x06b6d4,
    colorCss: '#06b6d4',
    trailColorHex: 0x3b82f6,
    trailColorCss: '#3b82f6',
    sparkColorHex: 0x06b6d4,
    sparkColorCss: '#06b6d4',
    shockwaveColorHex: 0x06b6d4,
    shockwaveColorCss: '#06b6d4',
    hasArc: false,
    isLaser: false,
    trailAlpha: 0.2,
    trailLength: 4,
    trailWidth: 3,
    trailStyle: 'particles',
    description: "To'g'ri chiziqli moviy muz shari",
    formation: 'single',
    shape: 'circle',
    size: 6,
    length: 24,
    points: 4,
    satelliteCount: 0,
    sparkType: 'ice_shard',
    sparkCount: 16,
    shockwaveRadius: 22,
    hasDoubleRing: true,
  },
  // ==========================================
  // 8. STRONG ICE (Glowing Energy Orb)
  // ==========================================
  {
    id: 'custom_1789735101659_yf3q',
    name: 'Strong Ice',
    nameUz: 'Kuchli Muz',
    category: 'frost',
    categoryName: 'Frost',
    icon: Snowflake,
    iconName: 'Snowflake',
    colorHex: 0x1079b9,
    colorCss: '#1079b9',
    trailColorHex: 0x3b82f6,
    trailColorCss: '#3b82f6',
    sparkColorHex: 0x06b6d4,
    sparkColorCss: '#06b6d4',
    shockwaveColorHex: 0x06b6d4,
    shockwaveColorCss: '#06b6d4',
    hasArc: true,
    isLaser: false,
    trailAlpha: 0.5,
    trailLength: 20,
    trailWidth: 4,
    trailStyle: 'particles',
    description: 'Yorqin zumrad-moviy plazmali kuchli muz energiyasi shari (scale: 0.90)',
    formation: 'single',
    shape: 'energy_orb',
    size: 12,
    length: 24,
    points: 4,
    satelliteCount: 0,
    sparkType: 'ice_shard',
    sparkCount: 8,
    shockwaveRadius: 40,
    hasDoubleRing: true,
  },
  // ==========================================
  // 9. SAND CYCLONE (Cylindrical Swarm Arcing)
  // ==========================================
  {
    id: 'sand_cyclone',
    name: 'Sand Cyclone',
    nameUz: "Qum To'foni",
    category: 'siege',
    categoryName: 'Siege',
    icon: Wind,
    iconName: 'Wind',
    colorHex: 0xd97706,
    colorCss: '#d97706',
    trailColorHex: 0xf59e0b,
    trailColorCss: '#f59e0b',
    sparkColorHex: 0xfbbf24,
    sparkColorCss: '#fbbf24',
    shockwaveColorHex: 0xb45309,
    shockwaveColorCss: '#b45309',
    hasArc: true,
    isLaser: false,
    trailAlpha: 0.6,
    trailLength: 10,
    trailWidth: 6,
    trailStyle: 'particles',
    description: "Silindr simon arca bilan otiluvchi aylanma qum zarralari to'dasi",
    formation: 'single',
    shape: 'sand_cluster',
    size: 14,
    length: 30,
    points: 4,
    satelliteCount: 0,
    sparkType: 'sand_dust',
    sparkCount: 22,
    shockwaveRadius: 30,
    hasDoubleRing: true,
  },
  // ==========================================
  // 10. DYNAMIC LINE BEAM (Laser Streak with Sparks)
  // ==========================================
  {
    id: 'line_streak_beam',
    name: 'Dynamic Line Beam',
    nameUz: "Dinamik Nur Chizig'i",
    category: 'electro',
    categoryName: 'Electro',
    icon: Zap,
    iconName: 'Zap',
    colorHex: 0x3b82f6,
    colorCss: '#3b82f6',
    trailColorHex: 0x60a5fa,
    trailColorCss: '#60a5fa',
    sparkColorHex: 0x93c5fd,
    sparkColorCss: '#93c5fd',
    shockwaveColorHex: 0x2563eb,
    shockwaveColorCss: '#2563eb',
    hasArc: false,
    isLaser: false,
    trailAlpha: 0.75,
    trailLength: 8,
    trailWidth: 4,
    trailStyle: 'glow_streak',
    description: "Atrofida yorqin zarrachalar aylanuvchi to'g'ri chiziqli energiya nuri",
    formation: 'single',
    shape: 'line_streak',
    size: 5,
    length: 34,
    points: 4,
    satelliteCount: 0,
    sparkType: 'spark_line',
    sparkCount: 16,
    shockwaveRadius: 24,
    hasDoubleRing: true,
  },
  // ==========================================
  // 11. SKY THUNDER STRIKE (Instant Target Strike)
  // ==========================================
  {
    id: 'sky_thunder_strike',
    name: 'Sky Thunder Strike',
    nameUz: 'Osmondan Tushuvchi Nur',
    category: 'holy',
    categoryName: 'Holy',
    icon: Sun,
    iconName: 'Sun',
    colorHex: 0xeab308,
    colorCss: '#eab308',
    trailColorHex: 0xfef08a,
    trailColorCss: '#fef08a',
    sparkColorHex: 0xffffff,
    sparkColorCss: '#ffffff',
    shockwaveColorHex: 0xca8a04,
    shockwaveColorCss: '#ca8a04',
    hasArc: false,
    isLaser: false,
    isInstant: true,
    instantType: 'sky_strike',
    trailAlpha: 0.8,
    trailLength: 6,
    trailWidth: 8,
    trailStyle: 'glow_streak',
    description: "Towerdan chiqmasdan, to'g'ridan-to'g'ri unit ustiga osmondan tushuvchi nur",
    formation: 'single',
    shape: 'instant_strike',
    size: 16,
    length: 60,
    points: 4,
    satelliteCount: 0,
    sparkType: 'holy_cross',
    sparkCount: 24,
    shockwaveRadius: 36,
    hasDoubleRing: true,
  },
  // ==========================================
  // 12. EARTH GROUND BURST (Instant Ground Eruption)
  // ==========================================
  {
    id: 'earth_ground_burst',
    name: 'Earth Ground Burst',
    nameUz: "Yerdan Chiqadigan Razlom",
    category: 'poison',
    categoryName: 'Poison',
    icon: Mountain,
    iconName: 'Mountain',
    colorHex: 0x22c55e,
    colorCss: '#22c55e',
    trailColorHex: 0x86efac,
    trailColorCss: '#86efac',
    sparkColorHex: 0x4ade80,
    sparkColorCss: '#4ade80',
    shockwaveColorHex: 0x15803d,
    shockwaveColorCss: '#15803d',
    hasArc: false,
    isLaser: false,
    isInstant: true,
    instantType: 'ground_burst',
    trailAlpha: 0.6,
    trailLength: 6,
    trailWidth: 6,
    trailStyle: 'particles',
    description: "To'g'ridan-to'g'ri unit ostidan otilib chiqadigan sehrli yer to'lqini",
    formation: 'single',
    shape: 'instant_strike',
    size: 18,
    length: 30,
    points: 4,
    satelliteCount: 0,
    sparkType: 'acid_drop',
    sparkCount: 20,
    shockwaveRadius: 34,
    hasDoubleRing: true,
  }
]

// Custom ID Alias Map for backward compatibility
const ID_ALIASES: Record<string, string> = {
  'custom_1789575550500_byln': 'middle_flame',
  'custom_1789575627700_s9vz': 'strong_flame',
  'custom_1789575798300_nncw': 'line_streak_beam',
  'custom_1789576200524_ur0p': 'flame_rocket',
  'strong_ice': 'custom_1789735101659_yf3q',
  'strong_frost': 'custom_1789735101659_yf3q',
  'simple_flame': 'fireball',
  'fire_laser': 'line_streak_beam',
  'laser': 'line_streak_beam',
  'laser_beam': 'line_streak_beam',
  'fire_rocket': 'flame_rocket',
  'rocket': 'flame_rocket',
  'fire': 'fireball',
  'fire_splash': 'strong_flame',
}

// Global In-Memory Runtime Custom Projectiles Registry for studio testing sessions
const runtimeCustomProjectilesMap = new Map<string, ProjectileDef>()

export function normalizeProjectileDef(raw: any): ProjectileDef {
  if (!raw) return BASE_PROJECTILE_CATALOG[0]

  const parseHex = (val: any, fallback: number): number => {
    if (typeof val === 'number' && !isNaN(val)) return val
    if (typeof val === 'string' && val.startsWith('#')) {
      const parsed = parseInt(val.slice(1), 16)
      return isNaN(parsed) ? fallback : parsed
    }
    return fallback
  }

  const colorHex = parseHex(raw.colorHex, 0xf97316)
  const colorCss = raw.colorCss || '#' + colorHex.toString(16).padStart(6, '0')
  const trailColorHex = parseHex(raw.trailColorHex, colorHex)
  const trailColorCss = raw.trailColorCss || '#' + trailColorHex.toString(16).padStart(6, '0')
  const sparkColorHex = parseHex(raw.sparkColorHex, colorHex)
  const sparkColorCss = raw.sparkColorCss || '#' + sparkColorHex.toString(16).padStart(6, '0')
  const shockwaveColorHex = parseHex(raw.shockwaveColorHex, colorHex)
  const shockwaveColorCss = raw.shockwaveColorCss || '#' + shockwaveColorHex.toString(16).padStart(6, '0')

  const category = (raw.category as ProjectileCategory) || 'fire'
  const isLaser = Boolean(raw.isLaser || raw.formation === 'laser_beam' || String(raw.id || '').includes('laser'))
  const isInstant = Boolean(raw.isInstant || raw.shape === 'instant_strike')

  let icon = Flame
  if (category === 'frost') icon = Snowflake
  else if (category === 'electro') icon = Zap
  else if (category === 'poison') icon = Skull
  else if (category === 'arcane') icon = Wand2
  else if (category === 'void') icon = Ghost
  else if (category === 'siege') icon = Crosshair
  else if (category === 'holy') icon = Sun
  else if (category === 'custom') icon = Sparkles

  return {
    id: raw.id || `custom_${Date.now()}`,
    name: raw.name || raw.id,
    nameUz: raw.nameUz || raw.name || raw.id,
    category,
    categoryName: category.charAt(0).toUpperCase() + category.slice(1),
    icon: raw.icon || icon,
    iconName: raw.iconName || 'Flame',
    colorHex,
    colorCss,
    trailColorHex,
    trailColorCss,
    sparkColorHex,
    sparkColorCss,
    shockwaveColorHex,
    shockwaveColorCss,
    hasArc: isLaser ? false : (raw.hasArc !== undefined ? Boolean(raw.hasArc) : false),
    isLaser,
    isInstant,
    instantType: raw.instantType || 'sky_strike',
    trailAlpha: typeof raw.trailAlpha === 'number' ? raw.trailAlpha : 0.7,
    trailLength: typeof raw.trailLength === 'number' ? raw.trailLength : 8,
    trailWidth: typeof raw.trailWidth === 'number' ? raw.trailWidth : 4,
    trailStyle: raw.trailStyle || 'solid_line',
    description: raw.description || '',
    formation: raw.formation || 'single',
    shape: raw.shape || 'circle',
    size: typeof raw.size === 'number' ? raw.size : 10,
    length: typeof raw.length === 'number' ? raw.length : 24,
    points: typeof raw.points === 'number' ? raw.points : 4,
    satelliteCount: typeof raw.satelliteCount === 'number' ? raw.satelliteCount : (raw.formation === 'satellites' ? 3 : 0),
    sparkType: raw.sparkType || 'fire_ember',
    sparkCount: typeof raw.sparkCount === 'number' ? raw.sparkCount : 16,
    shockwaveRadius: typeof raw.shockwaveRadius === 'number' ? raw.shockwaveRadius : 24,
    hasDoubleRing: Boolean(raw.hasDoubleRing),
    isCustom: Boolean(raw.isCustom ?? false)
  }
}

export function registerCustomProjectile(proj: any): void {
  if (!proj || !proj.id) return
  runtimeCustomProjectilesMap.set(proj.id, normalizeProjectileDef(proj))
}

export function registerCustomProjectiles(list: any[]): void {
  if (!Array.isArray(list)) return
  for (const p of list) {
    if (p && p.id) {
      runtimeCustomProjectilesMap.set(p.id, normalizeProjectileDef(p))
    }
  }
}

export function getAllProjectilesUnified(): ProjectileDef[] {
  const map = new Map<string, ProjectileDef>()
  for (const p of BASE_PROJECTILE_CATALOG) {
    map.set(p.id, p)
  }
  for (const [id, p] of runtimeCustomProjectilesMap.entries()) {
    map.set(id, p)
  }
  return Array.from(map.values())
}

export const PROJECTILE_CATALOG: ProjectileDef[] = BASE_PROJECTILE_CATALOG

export function getProjectileDef(id: string): ProjectileDef {
  if (!id) return BASE_PROJECTILE_CATALOG[0]

  const resolvedId = ID_ALIASES[id] || id

  // 1. Check in-memory runtime custom map
  if (runtimeCustomProjectilesMap.has(resolvedId)) {
    return runtimeCustomProjectilesMap.get(resolvedId)!
  }
  if (runtimeCustomProjectilesMap.has(id)) {
    return runtimeCustomProjectilesMap.get(id)!
  }

  // 2. Check base catalog
  const foundBase = BASE_PROJECTILE_CATALOG.find(p => p.id === resolvedId || p.id === id)
  if (foundBase) return foundBase

  // 3. Fallback to default base item
  return BASE_PROJECTILE_CATALOG[0]
}

export function getProjectilesByCategory(category: ProjectileCategory): ProjectileDef[] {
  return getAllProjectilesUnified().filter(p => p.category === category)
}

/**
 * Generates clean, ready-to-paste TypeScript Object Literal code for BASE_PROJECTILE_CATALOG
 */
export function generateProjectileCatalogSnippet(def: Partial<ProjectileDef>): string {
  const colorHexStr = '0x' + (def.colorHex || 0xf97316).toString(16).padStart(6, '0')
  const trailHexStr = '0x' + (def.trailColorHex || 0xfbbf24).toString(16).padStart(6, '0')
  const sparkHexStr = '0x' + (def.sparkColorHex || 0xfef08a).toString(16).padStart(6, '0')
  const shockwaveHexStr = '0x' + (def.shockwaveColorHex || 0xef4444).toString(16).padStart(6, '0')
  const cat = def.category || 'fire'
  const catName = cat.charAt(0).toUpperCase() + cat.slice(1)

  return `  {
    id: '${def.id || 'custom_' + Date.now()}',
    name: '${(def.name || 'Custom Bolt').replace(/'/g, "\\'")}',
    nameUz: '${(def.nameUz || def.name || 'Maxsus Snaryad').replace(/'/g, "\\'")}',
    category: '${cat}',
    categoryName: '${catName}',
    colorHex: ${colorHexStr},
    colorCss: '${def.colorCss || '#f97316'}',
    trailColorHex: ${trailHexStr},
    trailColorCss: '${def.trailColorCss || '#fbbf24'}',
    sparkColorHex: ${sparkHexStr},
    sparkColorCss: '${def.sparkColorCss || '#fef08a'}',
    shockwaveColorHex: ${shockwaveHexStr},
    shockwaveColorCss: '${def.shockwaveColorCss || '#ef4444'}',
    hasArc: ${Boolean(def.hasArc)},
    isLaser: ${Boolean(def.isLaser)},${def.isInstant ? `\n    isInstant: true,\n    instantType: '${def.instantType || 'sky_strike'}',` : ''}
    trailAlpha: ${def.trailAlpha ?? 0.7},
    trailLength: ${def.trailLength ?? 8},
    trailWidth: ${def.trailWidth ?? 4},
    trailStyle: '${def.trailStyle || 'solid_line'}',
    description: '${(def.description || '').replace(/'/g, "\\'")}',
    formation: '${def.formation || 'single'}',
    shape: '${def.shape || 'circle'}',
    size: ${def.size ?? 10},
    length: ${def.length ?? 24},
    points: ${def.points ?? 4},
    satelliteCount: ${def.satelliteCount ?? 0},
    sparkType: '${def.sparkType || 'fire_ember'}',
    sparkCount: ${def.sparkCount ?? 16},
    shockwaveRadius: ${def.shockwaveRadius ?? 24},
    hasDoubleRing: ${Boolean(def.hasDoubleRing)},
  },`
}
