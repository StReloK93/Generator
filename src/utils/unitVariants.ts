import { UnitVariantType } from '../types/map'

export interface UnitVariantDef {
  id: UnitVariantType
  nameKey: string
  descKey: string
  color: string // CSS color
  bgClass: string
  borderClass: string
  textClass: string
  tint: number // PixiJS hex integer
  glowColor: number
  auraAlpha: number
  icon: string
}

export const UNIT_VARIANTS: UnitVariantDef[] = [
  {
    id: 'normal',
    nameKey: 'variant.normal',
    descKey: 'variant.normalDesc',
    color: '#94a3b8',
    bgClass: 'bg-slate-800/80',
    borderClass: 'border-slate-700',
    textClass: 'text-slate-200',
    tint: 0xffffff,
    glowColor: 0xffffff,
    auraAlpha: 0,
    icon: 'Shield',
  },
  {
    id: 'fire',
    nameKey: 'variant.fire',
    descKey: 'variant.fireDesc',
    color: '#f97316',
    bgClass: 'bg-orange-500/20',
    borderClass: 'border-orange-500/60',
    textClass: 'text-orange-400',
    tint: 0xff6633,
    glowColor: 0xf97316,
    auraAlpha: 0.35,
    icon: 'Flame',
  },
  {
    id: 'frost',
    nameKey: 'variant.frost',
    descKey: 'variant.frostDesc',
    color: '#38bdf8',
    bgClass: 'bg-sky-500/20',
    borderClass: 'border-sky-500/60',
    textClass: 'text-sky-300',
    tint: 0x58c5ff,
    glowColor: 0x38bdf8,
    auraAlpha: 0.35,
    icon: 'Snowflake',
  },
  {
    id: 'poison',
    nameKey: 'variant.poison',
    descKey: 'variant.poisonDesc',
    color: '#4ade80',
    bgClass: 'bg-emerald-500/20',
    borderClass: 'border-emerald-500/60',
    textClass: 'text-emerald-300',
    tint: 0x44dd77,
    glowColor: 0x22c55e,
    auraAlpha: 0.35,
    icon: 'Skull',
  },
  {
    id: 'void',
    nameKey: 'variant.void',
    descKey: 'variant.voidDesc',
    color: '#c084fc',
    bgClass: 'bg-purple-500/20',
    borderClass: 'border-purple-500/60',
    textClass: 'text-purple-300',
    tint: 0xb570fa,
    glowColor: 0xa855f7,
    auraAlpha: 0.35,
    icon: 'Ghost',
  },
  {
    id: 'electric',
    nameKey: 'variant.electric',
    descKey: 'variant.electricDesc',
    color: '#facc15',
    bgClass: 'bg-yellow-500/20',
    borderClass: 'border-yellow-500/60',
    textClass: 'text-yellow-300',
    tint: 0xfde047,
    glowColor: 0xeab308,
    auraAlpha: 0.35,
    icon: 'Zap',
  },
  {
    id: 'blood',
    nameKey: 'variant.blood',
    descKey: 'variant.bloodDesc',
    color: '#f43f5e',
    bgClass: 'bg-rose-500/20',
    borderClass: 'border-rose-500/60',
    textClass: 'text-rose-400',
    tint: 0xff3b5c,
    glowColor: 0xf43f5e,
    auraAlpha: 0.35,
    icon: 'Droplet',
  },
  {
    id: 'golden',
    nameKey: 'variant.golden',
    descKey: 'variant.goldenDesc',
    color: '#fbbf24',
    bgClass: 'bg-amber-500/25',
    borderClass: 'border-amber-400/80',
    textClass: 'text-amber-300',
    tint: 0xffcc33,
    glowColor: 0xf59e0b,
    auraAlpha: 0.45,
    icon: 'Crown',
  },
  {
    id: 'demon',
    nameKey: 'variant.demon',
    descKey: 'variant.demonDesc',
    color: '#3f3f46',
    bgClass: 'bg-zinc-900/60',
    borderClass: 'border-zinc-400/70',
    textClass: 'text-zinc-200',
    tint: 0x18181c,
    glowColor: 0xffffff,
    auraAlpha: 0.4,
    icon: 'Ghost',
  },
]

export function getVariantDef(variant?: string): UnitVariantDef {
  if (!variant) return UNIT_VARIANTS[0]
  return UNIT_VARIANTS.find(v => v.id === variant) || UNIT_VARIANTS[0]
}

export function getVariantTint(variant?: string, customTint?: number | string): number {
  if (customTint !== undefined && customTint !== null && customTint !== '') {
    if (typeof customTint === 'number') return customTint
    if (typeof customTint === 'string') {
      const cleanHex = customTint.replace('#', '')
      const parsed = parseInt(cleanHex, 16)
      if (!isNaN(parsed)) return parsed
    }
  }
  const def = getVariantDef(variant)
  return def.tint
}
