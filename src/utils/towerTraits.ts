import { 
  Flame, Snowflake, Skull, TrendingUp, Droplet, Zap, Ghost 
} from 'lucide-vue-next'
import { TowerTraitType, TowerTraitsConfig } from '../types/map'

export interface TowerTraitDef {
  id: TowerTraitType
  nameKey: string
  descKey: string
  icon: any
  color: string
  colorHex: number
  badgeClass: string
  bgClass: string
  borderClass: string
  textClass: string
  defaultValues: Partial<TowerTraitsConfig>
}

export const TOWER_TRAITS: TowerTraitDef[] = [
  {
    id: 'fire',
    nameKey: 'traits.fireName',
    descKey: 'traits.fireDesc',
    icon: Flame,
    color: '#f97316',
    colorHex: 0xf97316,
    badgeClass: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    bgClass: 'bg-orange-950/40',
    borderClass: 'border-orange-500/40',
    textClass: 'text-orange-400',
    defaultValues: {
      fireBonusDamage: 5,
      burnDps: 4,
      burnDuration: 3.0,
    }
  },
  {
    id: 'frost',
    nameKey: 'traits.frostName',
    descKey: 'traits.frostDesc',
    icon: Snowflake,
    color: '#06b6d4',
    colorHex: 0x06b6d4,
    badgeClass: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    bgClass: 'bg-cyan-950/40',
    borderClass: 'border-cyan-500/40',
    textClass: 'text-cyan-400',
    defaultValues: {
      slowPercent: 30,
      slowDuration: 2.5,
      frostBonusDamage: 2,
    }
  },
  {
    id: 'poison',
    nameKey: 'traits.poisonName',
    descKey: 'traits.poisonDesc',
    icon: Skull,
    color: '#10b981',
    colorHex: 0x10b981,
    badgeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    bgClass: 'bg-emerald-950/40',
    borderClass: 'border-emerald-500/40',
    textClass: 'text-emerald-400',
    defaultValues: {
      poisonDps: 6,
      poisonDuration: 4.0,
      poisonSlowPercent: 10,
    }
  },
  {
    id: 'stacking',
    nameKey: 'traits.stackingName',
    descKey: 'traits.stackingDesc',
    icon: TrendingUp,
    color: '#eab308',
    colorHex: 0xeab308,
    badgeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    bgClass: 'bg-amber-950/40',
    borderClass: 'border-amber-500/40',
    textClass: 'text-amber-400',
    defaultValues: {
      stackBonusDamage: 4,
      maxStacks: 10,
    }
  },
  {
    id: 'blood',
    nameKey: 'traits.bloodName',
    descKey: 'traits.bloodDesc',
    icon: Droplet,
    color: '#ef4444',
    colorHex: 0xef4444,
    badgeClass: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    bgClass: 'bg-rose-950/40',
    borderClass: 'border-rose-500/40',
    textClass: 'text-rose-400',
    defaultValues: {
      bleedDps: 7,
      bleedDuration: 3.5,
    }
  },
  {
    id: 'electric',
    nameKey: 'traits.electricName',
    descKey: 'traits.electricDesc',
    icon: Zap,
    color: '#38bdf8',
    colorHex: 0x38bdf8,
    badgeClass: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
    bgClass: 'bg-sky-950/40',
    borderClass: 'border-sky-500/40',
    textClass: 'text-sky-400',
    defaultValues: {
      electricBonusDamage: 6,
      chainTargets: 2,
      stunDuration: 0.3,
    }
  },
  {
    id: 'void',
    nameKey: 'traits.voidName',
    descKey: 'traits.voidDesc',
    icon: Ghost,
    color: '#a855f7',
    colorHex: 0xa855f7,
    badgeClass: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    bgClass: 'bg-purple-950/40',
    borderClass: 'border-purple-500/40',
    textClass: 'text-purple-400',
    defaultValues: {
      voidVulnPercent: 25,
      voidDuration: 4.0,
    }
  },
]

export function getTraitDef(traitId: TowerTraitType): TowerTraitDef {
  return TOWER_TRAITS.find(t => t.id === traitId) || TOWER_TRAITS[0]
}
