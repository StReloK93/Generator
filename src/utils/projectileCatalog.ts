import {
  Flame, Snowflake, Zap, Skull, Wand2, Ghost, Crosshair, Sun,
  Sparkles, Rocket, ZapIcon
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
  icon: any
  iconName: string
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
    colorHex: 16347926,
    colorCss: '#f97316',
    trailColorHex: 16498468,
    trailColorCss: '#fbbf24',
    sparkColorHex: 16498468,
    sparkColorCss: '#fbbf24',
    shockwaveColorHex: 15680580,
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
    isCustom: true
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
    colorHex: 16347926,
    colorCss: '#f97316',
    trailColorHex: 16498468,
    trailColorCss: '#fbbf24',
    sparkColorHex: 16498468,
    sparkColorCss: '#fbbf24',
    shockwaveColorHex: 15680580,
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
    isCustom: true
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
    colorHex: 16347926,
    colorCss: '#f97316',
    trailColorHex: 16498468,
    trailColorCss: '#fbbf24',
    sparkColorHex: 16498468,
    sparkColorCss: '#fbbf24',
    shockwaveColorHex: 15680580,
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
    isCustom: true
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
    colorHex: 16347926,
    colorCss: '#f97316',
    trailColorHex: 16498468,
    trailColorCss: '#fbbf24',
    sparkColorHex: 16707722,
    sparkColorCss: '#fef08a',
    shockwaveColorHex: 15680580,
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
    isCustom: true
  },
  // ==========================================
  // 5. ZIG ZAG FLAME (Twin Helix, Satellite: 1)
  // ==========================================
  {
    id: 'custom_1789581747615_gpm0',
    name: 'zig zig flame',
    nameUz: 'Zig Zag Olov',
    category: 'fire',
    categoryName: 'Fire',
    icon: Sparkles,
    iconName: 'Flame',
    colorHex: 16347926,
    colorCss: '#f97316',
    trailColorHex: 16498468,
    trailColorCss: '#fbbf24',
    sparkColorHex: 16498468,
    sparkColorCss: '#fbbf24',
    shockwaveColorHex: 15680580,
    shockwaveColorCss: '#ef4444',
    hasArc: false,
    isLaser: false,
    trailAlpha: 0.2,
    trailLength: 10,
    trailWidth: 10,
    trailStyle: 'particles',
    description: 'Zig-zag / spiral egizak to\'lqinli olovli snaryad',
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
    isCustom: true
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
    colorHex: 440020,
    colorCss: '#06b6d4',
    trailColorHex: 3900150,
    trailColorCss: '#3b82f6',
    sparkColorHex: 440020,
    sparkColorCss: '#06b6d4',
    shockwaveColorHex: 440020,
    shockwaveColorCss: '#06b6d4',
    hasArc: true,
    isLaser: false,
    trailAlpha: 0.2,
    trailLength: 4,
    trailWidth: 3,
    trailStyle: 'particles',
    description: 'O\'tkir qirrali olmos kristall muz snaryadi',
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
    isCustom: true
  },
  // ==========================================
  // 7. MIDDLE FROST (Ice Orb)
  // ==========================================
  {
    id: 'custom_1789582622693_n5g8',
    name: 'Middle frost',
    nameUz: 'O\'rta Muz',
    category: 'frost',
    categoryName: 'Frost',
    icon: Snowflake,
    iconName: 'Snowflake',
    colorHex: 440020,
    colorCss: '#06b6d4',
    trailColorHex: 3900150,
    trailColorCss: '#3b82f6',
    sparkColorHex: 440020,
    sparkColorCss: '#06b6d4',
    shockwaveColorHex: 440020,
    shockwaveColorCss: '#06b6d4',
    hasArc: false,
    isLaser: false,
    trailAlpha: 0.2,
    trailLength: 4,
    trailWidth: 3,
    trailStyle: 'particles',
    description: 'To\'g\'ri chiziqli moviy muz shari',
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
    isCustom: true
  },
  // ==========================================
  // 8. STRONG ICE (Clean Glowing Energy Orb)
  // ==========================================
  {
    id: 'custom_1789735101659_yf3q',
    name: 'Strong Ice',
    nameUz: 'Kuchli Muz',
    category: 'frost',
    categoryName: 'Frost',
    icon: Snowflake,
    iconName: 'Snowflake',
    colorHex: 1096065,
    colorCss: '#1079b9',
    trailColorHex: 3900150,
    trailColorCss: '#3b82f6',
    sparkColorHex: 440020,
    sparkColorCss: '#06b6d4',
    shockwaveColorHex: 440020,
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
    isCustom: true
  }
]

// Custom ID Alias Map for backward compatibility
const ID_ALIASES: Record<string, string> = {
  'custom_1789575550500_byln': 'middle_flame',
  'custom_1789575627700_s9vz': 'strong_flame',
  'custom_1789575798300_nncw': 'flame_laser',
  'custom_1789576200524_ur0p': 'flame_rocket',
  'strong_ice': 'custom_1789735101659_yf3q',
  'strong_frost': 'custom_1789735101659_yf3q',
  'simple_flame': 'fireball',
  'fire_laser': 'flame_laser',
  'laser': 'flame_laser',
  'laser_beam': 'flame_laser',
  'fire_rocket': 'flame_rocket',
  'rocket': 'flame_rocket',
  'fire': 'fireball',
  'fire_splash': 'strong_flame',
  'frost_snowflake': 'flame_laser',
  'electro_chain': 'flame_laser',
}

export function getAllProjectilesUnified(): ProjectileDef[] {
  return BASE_PROJECTILE_CATALOG
}

export const PROJECTILE_CATALOG: ProjectileDef[] = BASE_PROJECTILE_CATALOG

export function getProjectileDef(id: string): ProjectileDef {
  const resolvedId = ID_ALIASES[id] || id
  const found = BASE_PROJECTILE_CATALOG.find(p => p.id === resolvedId || p.id === id)
  if (found) return found
  return BASE_PROJECTILE_CATALOG[0]
}

export function getProjectilesByCategory(category: ProjectileCategory): ProjectileDef[] {
  return BASE_PROJECTILE_CATALOG.filter(p => p.category === category)
}

