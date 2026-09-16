import { 
  Flame, Snowflake, Zap, Skull, Wand2, Ghost, Crosshair, Sun, 
  CircleDot, Sparkles, Bomb, Swords, Star
} from 'lucide-vue-next'
import { ProjectileType } from '../types/map'
import { ProjectileFormation, ProjectileShape, SparkParticleType } from '../stores/projectileStore'

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
  // 1. FIRE (3 Base Types)
  // ==========================================
  {
    id: 'fireball',
    name: 'Classic Fireball',
    nameUz: 'Klassik Olov Shari',
    category: 'fire',
    categoryName: 'Fire',
    icon: Flame,
    iconName: 'Flame',
    colorHex: 16347926,
    colorCss: '#f97316',
    trailColorHex: 16347926,
    trailColorCss: 'rgba(249, 115, 22, 0.7)',
    sparkColorHex: 16498468,
    sparkColorCss: '#fbbf24',
    shockwaveColorHex: 15680580,
    shockwaveColorCss: '#ef4444',
    hasArc: true,
    isLaser: false,
    trailAlpha: 0.7,
    description: "Yorqin olov shari va yonuvchi cho'g' dumi",
    formation: 'single',
    shape: 'circle',
    size: 4,
    length: 24,
    points: 4,
    satelliteCount: 3,
    sparkType: 'fire_ember',
    sparkCount: 16,
    shockwaveRadius: 22,
    hasDoubleRing: true
  },
  {
    id: 'fire_meteor',
    name: 'Molten Meteor',
    nameUz: 'Magma Meteorit',
    category: 'fire',
    categoryName: 'Fire',
    icon: Bomb,
    iconName: 'Bomb',
    colorHex: 14427686,
    colorCss: '#dc2626',
    trailColorHex: 15680068,
    trailColorCss: 'rgba(239, 68, 68, 0.85)',
    sparkColorHex: 16498468,
    sparkColorCss: '#fbbf24',
    shockwaveColorHex: 16347926,
    shockwaveColorCss: '#f97316',
    hasArc: true,
    isLaser: false,
    trailAlpha: 0.85,
    description: "Atrofida 3 ta kichik cho'g'i aylanuvchi ulkan lava toshi",
    formation: 'single',
    shape: 'circle',
    size: 10,
    length: 24,
    points: 4,
    satelliteCount: 2,
    sparkType: 'fire_ember',
    sparkCount: 10,
    shockwaveRadius: 25,
    hasDoubleRing: true
  },
  {
    id: 'fire_laser',
    name: 'Inferno Beam',
    nameUz: "Do'zax Olov Lazer Nuri",
    category: 'fire',
    categoryName: 'Fire',
    icon: Sparkles,
    iconName: 'Sparkles',
    colorHex: 15680580,
    colorCss: '#ef4444',
    trailColorHex: 16347926,
    trailColorCss: 'rgba(249, 115, 22, 0.85)',
    sparkColorHex: 16498468,
    sparkColorCss: '#fbbf24',
    shockwaveColorHex: 15680580,
    shockwaveColorCss: '#ef4444',
    hasArc: false,
    isLaser: true,
    trailAlpha: 0.85,
    description: 'Uzluksiz plazmali yonuvchi qizil olov nuri',
    formation: 'laser_beam',
    shape: 'circle',
    size: 6,
    length: 24,
    points: 4,
    satelliteCount: 3,
    sparkType: 'fire_ember',
    sparkCount: 6,
    shockwaveRadius: 14,
    hasDoubleRing: false
  },

  // ==========================================
  // 2. FROST (3 Base Types)
  // ==========================================
  {
    id: 'frost_bolt',
    name: 'Frost Crystal Bolt',
    nameUz: "Muz Kristall O'qi",
    category: 'frost',
    categoryName: 'Frost',
    icon: Snowflake,
    iconName: 'Snowflake',
    colorHex: 3900150,
    colorCss: '#3b82f6',
    trailColorHex: 3718648,
    trailColorCss: '#3b82f6',
    sparkColorHex: 3900150,
    sparkColorCss: '#3b82f6',
    shockwaveColorHex: 3900150,
    shockwaveColorCss: '#3b82f6',
    hasArc: true,
    isLaser: false,
    trailAlpha: 0.75,
    description: "O'tkir moviy muz kristalli va sovuq tuman",
    formation: 'single',
    shape: 'boulder',
    size: 5,
    length: 24,
    points: 4,
    satelliteCount: 3,
    sparkType: 'ice_shard',
    sparkCount: 8,
    shockwaveRadius: 17,
    hasDoubleRing: false
  },
  {
    id: 'frost_shard',
    name: 'Triple Ice Shards',
    nameUz: 'Uchlik Muz Xanjarlari',
    category: 'frost',
    categoryName: 'Frost',
    icon: Snowflake,
    iconName: 'Snowflake',
    colorHex: 3900150,
    colorCss: '#3b82f6',
    trailColorHex: 6809849,
    trailColorCss: '#3b82f6',
    sparkColorHex: 3900150,
    sparkColorCss: '#3b82f6',
    shockwaveColorHex: 3900150,
    shockwaveColorCss: '#3b82f6',
    hasArc: true,
    isLaser: false,
    trailAlpha: 0.75,
    description: "Bitta otishda 3 ta o'tkir muz xanjarlari yoyilib uchadi",
    formation: 'volley_3',
    shape: 'arrow',
    size: 8,
    length: 18,
    points: 4,
    satelliteCount: 3,
    sparkType: 'ice_shard',
    sparkCount: 18,
    shockwaveRadius: 22,
    hasDoubleRing: false
  },
  {
    id: 'frost_snowflake',
    name: 'Blizzard Snowflake',
    nameUz: "Bo'ron Qor Parchasi",
    category: 'frost',
    categoryName: 'Frost',
    icon: Snowflake,
    iconName: 'Snowflake',
    colorHex: 3900150,
    colorCss: '#3b82f6',
    trailColorHex: 439892,
    trailColorCss: '#06b6d4',
    sparkColorHex: 3900150,
    sparkColorCss: '#3b82f6',
    shockwaveColorHex: 3900150,
    shockwaveColorCss: '#3b82f6',
    hasArc: true,
    isLaser: false,
    trailAlpha: 0.8,
    description: 'Aylanuvchi yirik 6 qirrali muz qor yulduzi',
    formation: 'twin_helix',
    shape: 'star',
    size: 10,
    length: 18,
    points: 6,
    satelliteCount: 3,
    sparkType: 'snowflake',
    sparkCount: 16,
    shockwaveRadius: 24,
    hasDoubleRing: true
  },

  // ==========================================
  // 3. ELECTRO (3 Base Types)
  // ==========================================
  {
    id: 'electro_spark',
    name: 'Lightning Javelin',
    nameUz: 'Chaqmoq Nayzasi',
    category: 'electro',
    categoryName: 'Electro',
    icon: Zap,
    iconName: 'Zap',
    colorHex: 1920984,
    colorCss: '#1d4ed8',
    trailColorHex: 3718648,
    trailColorCss: 'rgba(56, 189, 248, 0.8)',
    sparkColorHex: 16777215,
    sparkColorCss: '#ffffff',
    shockwaveColorHex: 6333946,
    shockwaveColorCss: '#60a5fa',
    hasArc: false,
    isLaser: false,
    trailAlpha: 0.8,
    description: "Yuqori tezlikdagi o'tkir elektr nayzasi",
    formation: 'single',
    shape: 'arrow',
    size: 8,
    length: 22,
    sparkType: 'lightning_arc',
    sparkCount: 16,
    shockwaveRadius: 20,
    hasDoubleRing: false
  },
  {
    id: 'electro_chain',
    name: 'Twin Plasma Helix',
    nameUz: "Qo'shaloq Plazma Spirali",
    category: 'electro',
    categoryName: 'Electro',
    icon: Zap,
    iconName: 'Zap',
    colorHex: 3899126,
    colorCss: '#3b82f6',
    trailColorHex: 6333946,
    trailColorCss: 'rgba(96, 165, 250, 0.75)',
    sparkColorHex: 16777215,
    sparkColorCss: '#ffffff',
    shockwaveColorHex: 3899126,
    shockwaveColorCss: '#3b82f6',
    hasArc: false,
    isLaser: false,
    trailAlpha: 0.75,
    description: 'Havoda 3D DNK-spiral shaklida aylanuvchi ikkita elektr shari',
    formation: 'twin_helix',
    shape: 'circle',
    size: 7,
    sparkType: 'lightning_arc',
    sparkCount: 18,
    shockwaveRadius: 22,
    hasDoubleRing: false
  },
  {
    id: 'electro_ball',
    name: 'Tesla Ball Lightning',
    nameUz: 'Tesla Chaqmoq Shari',
    category: 'electro',
    categoryName: 'Electro',
    icon: Zap,
    iconName: 'Zap',
    colorHex: 440020,
    colorCss: '#06b6d4',
    trailColorHex: 3718648,
    trailColorCss: '#3b82f6',
    sparkColorHex: 3900150,
    sparkColorCss: '#3b82f6',
    shockwaveColorHex: 3718648,
    shockwaveColorCss: '#38bdf8',
    hasArc: true,
    isLaser: false,
    trailAlpha: 0.7,
    description: 'Atrofga 4 ta dinamik chaqmoq nurlari sochib boruvchi plazma',
    formation: 'satellites',
    shape: 'circle',
    size: 9,
    length: 38,
    points: 4,
    satelliteCount: 3,
    sparkType: 'lightning_arc',
    sparkCount: 24,
    shockwaveRadius: 26,
    hasDoubleRing: true
  },

  // ==========================================
  // 4. POISON (3 Base Types)
  // ==========================================
  {
    id: 'poison_dart',
    name: 'Triple Poison Darts',
    nameUz: 'Uchlik Zaharli Ninachalar',
    category: 'poison',
    categoryName: 'Poison',
    icon: Skull,
    iconName: 'Skull',
    colorHex: 1467700,
    colorCss: '#166534',
    trailColorHex: 2278750,
    trailColorCss: 'rgba(34, 197, 94, 0.75)',
    sparkColorHex: 8843180,
    sparkColorCss: '#86efac',
    shockwaveColorHex: 2278750,
    shockwaveColorCss: '#22c55e',
    hasArc: true,
    isLaser: false,
    trailAlpha: 0.75,
    description: "Bitta otishda 3 ta zaharli ignalar to'dasi",
    formation: 'satellites',
    shape: 'arrow',
    size: 7,
    length: 16,
    points: 4,
    satelliteCount: 4,
    sparkType: 'acid_drop',
    sparkCount: 16,
    shockwaveRadius: 20,
    hasDoubleRing: false
  },
  {
    id: 'poison_glob',
    name: 'Corrosive Acid Glob',
    nameUz: "Kislotali Zahar To'pi",
    category: 'poison',
    categoryName: 'Poison',
    icon: CircleDot,
    iconName: 'CircleDot',
    colorHex: 8696854,
    colorCss: '#84cc16',
    trailColorHex: 5078031,
    trailColorCss: 'rgba(77, 124, 15, 0.75)',
    sparkColorHex: 14285213,
    sparkColorCss: '#d9f99d',
    shockwaveColorHex: 8696854,
    shockwaveColorCss: '#84cc16',
    hasArc: true,
    isLaser: false,
    trailAlpha: 0.75,
    description: "Ko'piruvchi yashil kislota shari va suyuqlik tomchilari",
    formation: 'single',
    shape: 'circle',
    size: 11,
    sparkType: 'acid_drop',
    sparkCount: 18,
    shockwaveRadius: 22,
    hasDoubleRing: false
  },
  {
    id: 'poison_cloud',
    name: 'Toxic Skull Cloud',
    nameUz: 'Zaharli Gaz Bosh Suyagi',
    category: 'poison',
    categoryName: 'Poison',
    icon: Skull,
    iconName: 'Skull',
    colorHex: 2278750,
    colorCss: '#22c55e',
    trailColorHex: 1467700,
    trailColorCss: 'rgba(22, 101, 52, 0.8)',
    sparkColorHex: 10741301,
    sparkColorCss: '#a3e635',
    shockwaveColorHex: 2278750,
    shockwaveColorCss: '#22c55e',
    hasArc: true,
    isLaser: false,
    trailAlpha: 0.8,
    description: 'Zaharli yashil gazdan iborat shoxli bosh suyagi',
    formation: 'single',
    shape: 'skull',
    size: 12,
    sparkType: 'acid_drop',
    sparkCount: 20,
    shockwaveRadius: 24,
    hasDoubleRing: true
  },

  // ==========================================
  // 5. ARCANE (3 Base Types)
  // ==========================================
  {
    id: 'magic_bolt',
    name: 'Mystic Energy Bolt',
    nameUz: "Sehrli Energiya O'qi",
    category: 'arcane',
    categoryName: 'Arcane',
    icon: Wand2,
    iconName: 'Wand2',
    colorHex: 11032055,
    colorCss: '#a855f7',
    trailColorHex: 12616956,
    trailColorCss: 'rgba(192, 132, 252, 0.75)',
    sparkColorHex: 16777215,
    sparkColorCss: '#ffffff',
    shockwaveColorHex: 11032055,
    shockwaveColorCss: '#a855f7',
    hasArc: true,
    isLaser: false,
    trailAlpha: 0.75,
    description: "Binafsha nur va kosmik stardust bilan o'ralgan sehrli yadro",
    formation: 'single',
    shape: 'diamond_shard',
    size: 9,
    sparkType: 'arcane_star',
    sparkCount: 16,
    shockwaveRadius: 20,
    hasDoubleRing: false
  },
  {
    id: 'arcane_star',
    name: 'Astral Starburst',
    nameUz: 'Fazoviy Yulduz Portlashi',
    category: 'arcane',
    categoryName: 'Arcane',
    icon: Star,
    iconName: 'Star',
    colorHex: 12616956,
    colorCss: '#c084fc',
    trailColorHex: 11032055,
    trailColorCss: 'rgba(168, 85, 247, 0.8)',
    sparkColorHex: 16777215,
    sparkColorCss: '#ffffff',
    shockwaveColorHex: 15485081,
    shockwaveColorCss: '#ec4899',
    hasArc: true,
    isLaser: false,
    trailAlpha: 0.8,
    description: '4 qirrali aylanuvchi yorqin fazoviy yulduz',
    formation: 'single',
    shape: 'star',
    size: 13,
    points: 4,
    sparkType: 'arcane_star',
    sparkCount: 20,
    shockwaveRadius: 24,
    hasDoubleRing: true
  },
  {
    id: 'arcane_singularity',
    name: 'Gravitational Singularity',
    nameUz: 'Gravitatsion Qora Teshik',
    category: 'arcane',
    categoryName: 'Arcane',
    icon: Wand2,
    iconName: 'Wand2',
    colorHex: 7217834,
    colorCss: '#6e22aa',
    trailColorHex: 11032055,
    trailColorCss: 'rgba(168, 85, 247, 0.9)',
    sparkColorHex: 16777215,
    sparkColorCss: '#ffffff',
    shockwaveColorHex: 11032055,
    shockwaveColorCss: '#a855f7',
    hasArc: true,
    isLaser: false,
    trailAlpha: 0.9,
    description: 'Markazga tortuvchi chuqur fazoviy gravitatsiya girdobi',
    formation: 'satellites',
    shape: 'circle',
    size: 13,
    satelliteCount: 4,
    sparkType: 'arcane_star',
    sparkCount: 26,
    shockwaveRadius: 28,
    hasDoubleRing: true
  },

  // ==========================================
  // 6. VOID (3 Base Types)
  // ==========================================
  {
    id: 'void_bolt',
    name: 'Shadow Obsidian Bolt',
    nameUz: "Zulmat Obsidiani O'qi",
    category: 'void',
    categoryName: 'Void',
    icon: Ghost,
    iconName: 'Ghost',
    colorHex: 8917815,
    colorCss: '#881337',
    trailColorHex: 16007006,
    trailColorCss: 'rgba(244, 63, 94, 0.75)',
    sparkColorHex: 8141549,
    sparkColorCss: '#7c3aed',
    shockwaveColorHex: 8917815,
    shockwaveColorCss: '#881337',
    hasArc: true,
    isLaser: false,
    trailAlpha: 0.75,
    description: "Qora zulmat olovi bilan qoplangan o'tkir qora nayza",
    formation: 'single',
    shape: 'arrow',
    size: 9,
    length: 22,
    sparkType: 'void_blood',
    sparkCount: 16,
    shockwaveRadius: 20,
    hasDoubleRing: false
  },
  {
    id: 'void_scythe',
    name: 'Reaper Death Scythe',
    nameUz: "Ajal Zulmat O'rog'i",
    category: 'void',
    categoryName: 'Void',
    icon: Ghost,
    iconName: 'Ghost',
    colorHex: 6563968,
    colorCss: '#642280',
    trailColorHex: 16007006,
    trailColorCss: 'rgba(244, 63, 94, 0.8)',
    sparkColorHex: 16007006,
    sparkColorCss: '#f43f5e',
    shockwaveColorHex: 8917815,
    shockwaveColorCss: '#881337',
    hasArc: true,
    isLaser: false,
    trailAlpha: 0.8,
    description: "Havoda shiddat bilan aylanuvchi o'roq shaklidagi zulmat tig'i",
    formation: 'single',
    shape: 'sawblade',
    size: 13,
    sparkType: 'void_blood',
    sparkCount: 20,
    shockwaveRadius: 24,
    hasDoubleRing: false
  },
  {
    id: 'blood_slash',
    name: 'Crimson Blood Wave',
    nameUz: "Qizil Qon To'lqini",
    category: 'void',
    categoryName: 'Void',
    icon: Ghost,
    iconName: 'Ghost',
    colorHex: 14753096,
    colorCss: '#e11d48',
    trailColorHex: 10033947,
    trailColorCss: 'rgba(153, 27, 27, 0.85)',
    sparkColorHex: 16698835,
    sparkColorCss: '#fecdd3',
    shockwaveColorHex: 14753096,
    shockwaveColorCss: '#e11d48',
    hasArc: true,
    isLaser: false,
    trailAlpha: 0.85,
    description: "Qo'shaloq aylanuvchi yoqut rangli qon to'lqini",
    formation: 'twin_helix',
    shape: 'circle',
    size: 8,
    length: 23,
    points: 4,
    satelliteCount: 3,
    sparkType: 'void_blood',
    sparkCount: 18,
    shockwaveRadius: 22,
    hasDoubleRing: false
  },

  // ==========================================
  // 7. SIEGE (3 Base Types)
  // ==========================================
  {
    id: 'arrow',
    name: 'Triple Arrow Volley',
    nameUz: "Uchlik Kamon O'qlari",
    category: 'siege',
    categoryName: 'Siege',
    icon: Crosshair,
    iconName: 'Crosshair',
    colorHex: 9584654,
    colorCss: '#92400e',
    trailColorHex: 16312572,
    trailColorCss: 'rgba(248, 250, 252, 0.4)',
    sparkColorHex: 16096779,
    sparkColorCss: '#f59e0b',
    shockwaveColorHex: 6583435,
    shockwaveColorCss: '#64748b',
    hasArc: true,
    isLaser: false,
    trailAlpha: 0.4,
    description: "Bitta zarbada 3 ta po'lat ucli kamon o'qi yoyilib uchadi",
    formation: 'single',
    shape: 'arrow',
    size: 8,
    length: 18,
    points: 4,
    satelliteCount: 3,
    sparkType: 'shrapnel',
    sparkCount: 12,
    shockwaveRadius: 16,
    hasDoubleRing: false
  },
  {
    id: 'sawblade',
    name: 'Spinning Steel Sawblade',
    nameUz: "Aylanuvchi Po'lat Arra",
    category: 'electro',
    categoryName: 'Siege',
    icon: Crosshair,
    iconName: 'Crosshair',
    colorHex: 6583435,
    colorCss: '#64748b',
    trailColorHex: 9737368,
    trailColorCss: 'rgba(148, 163, 184, 0.6)',
    sparkColorHex: 16096779,
    sparkColorCss: '#f59e0b',
    shockwaveColorHex: 6583435,
    shockwaveColorCss: '#64748b',
    hasArc: true,
    isLaser: false,
    trailAlpha: 0.6,
    description: "8 ta o'tkir tishli aylanuvchi mexanik po'lat arra diski",
    formation: 'single',
    shape: 'star',
    size: 11,
    length: 18,
    points: 4,
    satelliteCount: 3,
    sparkType: 'shrapnel',
    sparkCount: 20,
    shockwaveRadius: 24,
    hasDoubleRing: false
  },
  {
    id: 'cannonball',
    name: 'Heavy Iron Cannonball',
    nameUz: "Og'ir Cho'yan To'p O'qi",
    category: 'siege',
    categoryName: 'Siege',
    icon: Bomb,
    iconName: 'Bomb',
    colorHex: 1976635,
    colorCss: '#1e293b',
    trailColorHex: 4676457,
    trailColorCss: 'rgba(71, 85, 105, 0.6)',
    sparkColorHex: 16096779,
    sparkColorCss: '#f59e0b',
    shockwaveColorHex: 8702998,
    shockwaveColorCss: '#84cc16',
    hasArc: true,
    isLaser: false,
    trailAlpha: 0.6,
    description: "Og'ir qora cho'yan to'p o'qi va maydalangan metall shrapnellar",
    formation: 'single',
    shape: 'boulder',
    size: 8,
    length: 23,
    points: 4,
    satelliteCount: 3,
    sparkType: 'shrapnel',
    sparkCount: 18,
    shockwaveRadius: 22,
    hasDoubleRing: false
  },

  // ==========================================
  // 8. HOLY (3 Base Types)
  // ==========================================
  {
    id: 'holy_bolt',
    name: 'Radiant Sun Lance',
    nameUz: 'Quyosh Nuri Nayzasi',
    category: 'holy',
    categoryName: 'Holy',
    icon: Sun,
    iconName: 'Sun',
    colorHex: 1096065,
    colorCss: '#10b981',
    trailColorHex: 16641863,
    trailColorCss: '#10b981',
    sparkColorHex: 440020,
    sparkColorCss: '#06b6d4',
    shockwaveColorHex: 16096779,
    shockwaveColorCss: '#f59e0b',
    hasArc: true,
    isLaser: false,
    trailAlpha: 0.8,
    description: 'Oltin nur taratuvchi muqaddas nayza',
    formation: 'single',
    shape: 'arrow',
    size: 9,
    length: 23,
    points: 4,
    satelliteCount: 3,
    sparkType: 'holy_cross',
    sparkCount: 16,
    shockwaveRadius: 22,
    hasDoubleRing: false
  },
  {
    id: 'holy_cross',
    name: 'Divine Holy Cross',
    nameUz: 'Ilohiy Nur Xochi',
    category: 'holy',
    categoryName: 'Holy',
    icon: Sun,
    iconName: 'Sun',
    colorHex: 16638023,
    colorCss: '#fde047',
    trailColorHex: 15383556,
    trailColorCss: 'rgba(234, 179, 8, 0.85)',
    sparkColorHex: 16777215,
    sparkColorCss: '#ffffff',
    shockwaveColorHex: 16638023,
    shockwaveColorCss: '#fde047',
    hasArc: true,
    isLaser: false,
    trailAlpha: 0.85,
    description: 'Aylanuvchi yirik 4 qirrali oltin nurli xoch',
    formation: 'single',
    shape: 'star',
    size: 13,
    length: 16,
    points: 4,
    satelliteCount: 4,
    sparkType: 'holy_cross',
    sparkCount: 22,
    shockwaveRadius: 26,
    hasDoubleRing: true
  },
  {
    id: 'holy_sword',
    name: 'Seraph Radiant Greatsword',
    nameUz: 'Serafim Oltin Shamshiri',
    category: 'holy',
    categoryName: 'Holy',
    icon: Swords,
    iconName: 'Swords',
    colorHex: 16096779,
    colorCss: '#f59e0b',
    trailColorHex: 15383556,
    trailColorCss: '#ef4444',
    sparkColorHex: 16777215,
    sparkColorCss: '#ffffff',
    shockwaveColorHex: 15680580,
    shockwaveColorCss: '#ef4444',
    hasArc: true,
    isLaser: false,
    trailAlpha: 0.9,
    description: 'Ikki tomonida oltin nurli qanotlari bor 40px li muqaddas qilich',
    formation: 'twin_helix',
    shape: 'skull',
    size: 7,
    length: 38,
    points: 4,
    satelliteCount: 3,
    sparkType: 'holy_cross',
    sparkCount: 24,
    shockwaveRadius: 28,
    hasDoubleRing: true
  },
]

export const PROJECTILE_CATALOG: ProjectileDef[] = BASE_PROJECTILE_CATALOG

export function getProjectileDef(id: string): ProjectileDef {
  // 1. Check in localStorage custom projectiles FIRST so user edits take effect immediately
  if (typeof window !== 'undefined') {
    try {
      const saved = localStorage.getItem('defensor_custom_projectiles')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          const customFound = parsed.find((p: any) => p.id === id)
          if (customFound) {
            return {
              ...customFound,
              categoryName: (customFound.category || 'fire').toUpperCase(),
              icon: Sparkles,
              iconName: 'Sparkles',
            }
          }
        }
      }
    } catch {
      // Ignore
    }
  }

  // 2. Check in static catalog
  const found = BASE_PROJECTILE_CATALOG.find(p => p.id === id)
  if (found) return found

  // 3. Fallback
  return BASE_PROJECTILE_CATALOG[0]
}

export function getProjectilesByCategory(category: ProjectileCategory): ProjectileDef[] {
  return BASE_PROJECTILE_CATALOG.filter(p => p.category === category)
}
