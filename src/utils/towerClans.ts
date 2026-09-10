import { 
  Castle, Flame, Snowflake, Skull, Zap, Ghost, Droplet, 
  Shield, Swords, Crown, Mountain, Eye, Sparkles, Gem, Landmark 
} from 'lucide-vue-next'
import { TowerClan } from '../types/map'

export const CLAN_ICON_MAP: Record<string, any> = {
  Castle,
  Flame,
  Snowflake,
  Skull,
  Zap,
  Ghost,
  Droplet,
  Shield,
  Swords,
  Crown,
  Mountain,
  Eye,
  Sparkles,
  Gem,
  Landmark,
}

export function getClanIcon(iconName?: string): any {
  if (!iconName) return Castle
  return CLAN_ICON_MAP[iconName] || Castle
}

export const CLAN_AVAILABLE_ICONS = [
  { id: 'Castle', name: 'Castle', icon: Castle },
  { id: 'Shield', name: 'Shield', icon: Shield },
  { id: 'Swords', name: 'Swords', icon: Swords },
  { id: 'Crown', name: 'Crown', icon: Crown },
  { id: 'Flame', name: 'Flame', icon: Flame },
  { id: 'Snowflake', name: 'Frost', icon: Snowflake },
  { id: 'Skull', name: 'Poison', icon: Skull },
  { id: 'Zap', name: 'Electric', icon: Zap },
  { id: 'Ghost', name: 'Void', icon: Ghost },
  { id: 'Droplet', name: 'Blood', icon: Droplet },
  { id: 'Mountain', name: 'Earth', icon: Mountain },
  { id: 'Gem', name: 'Crystal', icon: Gem },
  { id: 'Eye', name: 'Mystic', icon: Eye },
  { id: 'Sparkles', name: 'Arcane', icon: Sparkles },
  { id: 'Landmark', name: 'Ancient', icon: Landmark },
]

export const CLAN_AVAILABLE_COLORS = [
  { id: '#38bdf8', name: 'Sky Blue', bgClass: 'bg-sky-500/20 text-sky-400 border-sky-500/40' },
  { id: '#f97316', name: 'Flame Orange', bgClass: 'bg-orange-500/20 text-orange-400 border-orange-500/40' },
  { id: '#06b6d4', name: 'Glacial Cyan', bgClass: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40' },
  { id: '#10b981', name: 'Emerald Green', bgClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' },
  { id: '#a855f7', name: 'Amethyst Purple', bgClass: 'bg-purple-500/20 text-purple-400 border-purple-500/40' },
  { id: '#ef4444', name: 'Crimson Red', bgClass: 'bg-rose-500/20 text-rose-400 border-rose-500/40' },
  { id: '#eab308', name: 'Gold Sovereign', bgClass: 'bg-amber-500/20 text-amber-400 border-amber-500/40' },
  { id: '#64748b', name: 'Iron Slate', bgClass: 'bg-slate-500/20 text-slate-300 border-slate-500/40' },
]

export const DEFAULT_CLANS_PRESET: TowerClan[] = [
  {
    id: 'clan-iron',
    name: 'Iron Citadel',
    description: 'Masters of fortified stone defense, siege ballistas, and heavy area splash mortars.',
    iconName: 'Castle',
    color: '#64748b',
    isDefault: true,
  },
  {
    id: 'clan-fire',
    name: 'Inferno Legion',
    description: 'Pyromancers wielding scorching fireballs and incinerating burn DoT artillery.',
    iconName: 'Flame',
    color: '#f97316',
    isDefault: false,
  },
  {
    id: 'clan-frost',
    name: 'Glacial Order',
    description: 'Guardians of deep permafrost capable of freezing waves and halting rapid advances.',
    iconName: 'Snowflake',
    color: '#06b6d4',
    isDefault: false,
  },
  {
    id: 'clan-venom',
    name: 'Venom Syndicate',
    description: 'Toxic alchemists inflicting relentless deadly neurotoxin poisons and crippling slows.',
    iconName: 'Skull',
    color: '#10b981',
    isDefault: false,
  },
]

export function createDefaultClan(id = 'clan-default', name = 'Iron Citadel'): TowerClan {
  return {
    id,
    name,
    description: 'Standard defense faction with balanced combat towers.',
    iconName: 'Castle',
    color: '#38bdf8',
    isDefault: true,
  }
}
