import type { Component } from 'vue'
import { Castle, Coins, Flame, Footprints, Ghost, Heart, Lock, Package, Search, Skull, Swords, Users } from 'lucide-vue-next'
import type { MapGameMode } from '../types/map'
import type { BadgeVariant } from './ui'

/** How a genre is shown in the editor (new map picker, header badge, settings button). */
export const MAP_MODE_INFO: Record<MapGameMode, { icon: Component; label: string; desc: string; settings: string; badge: BadgeVariant }> = {
  td: { icon: Castle, label: 'genre.td', desc: 'genre.tdDesc', settings: 'common.tdSettings', badge: 'amber' },
  hideseek: { icon: Ghost, label: 'genre.hideseek', desc: 'genre.hideseekDesc', settings: 'genre.hideseekSettings', badge: 'purple' },
  curse: { icon: Skull, label: 'genre.curse', desc: 'genre.curseDesc', settings: 'genre.curseSettings', badge: 'purple' },
  hero: { icon: Swords, label: 'genre.hero', desc: 'genre.heroDesc', settings: 'genre.heroSettings', badge: 'emerald' },
}

/** How a genre is shown to players (the map picker's folders and its "how to play" steps). */
export const MAP_MODE_PLAY_INFO: Record<
  MapGameMode,
  { label: string; accent: string; howTo: Array<{ icon: Component; text: string }> }
> = {
  td: {
    label: 'genre.td',
    accent: 'text-brand-300',
    howTo: [
      { icon: Castle, text: 'maps.howto.td.1' },
      { icon: Coins, text: 'maps.howto.td.2' },
      { icon: Heart, text: 'maps.howto.td.3' },
    ],
  },
  hideseek: {
    label: 'genre.hideseek',
    accent: 'text-purple-300',
    howTo: [
      { icon: Search, text: 'maps.howto.hideseek.1' },
      { icon: Flame, text: 'maps.howto.hideseek.2' },
      { icon: Lock, text: 'maps.howto.hideseek.3' },
    ],
  },
  curse: {
    label: 'genre.curse',
    accent: 'text-fuchsia-300',
    howTo: [
      { icon: Skull, text: 'maps.howto.curse.1' },
      { icon: Flame, text: 'maps.howto.curse.2' },
      { icon: Package, text: 'maps.howto.curse.3' },
    ],
  },
  hero: {
    label: 'game.modePvp',
    accent: 'text-rose-300',
    howTo: [
      { icon: Users, text: 'maps.howto.hero.1' },
      { icon: Footprints, text: 'maps.howto.hero.2' },
      { icon: Swords, text: 'maps.howto.hero.3' },
    ],
  },
}
