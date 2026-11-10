import type { Component } from 'vue'
import { Castle, Ghost, Swords } from 'lucide-vue-next'
import type { MapGameMode } from '../types/map'
import type { BadgeVariant } from './ui'

/** How a genre is shown in the editor (new map picker, header badge, settings button). */
export const MAP_MODE_INFO: Record<MapGameMode, { icon: Component; label: string; desc: string; settings: string; badge: BadgeVariant }> = {
  td: { icon: Castle, label: 'genre.td', desc: 'genre.tdDesc', settings: 'common.tdSettings', badge: 'amber' },
  hideseek: { icon: Ghost, label: 'genre.hideseek', desc: 'genre.hideseekDesc', settings: 'genre.hideseekSettings', badge: 'purple' },
  hero: { icon: Swords, label: 'genre.hero', desc: 'genre.heroDesc', settings: 'genre.heroSettings', badge: 'emerald' },
}
