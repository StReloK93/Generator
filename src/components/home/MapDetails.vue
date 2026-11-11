<template>
  <div class="overflow-y-auto p-2.5 sm:p-4 short:p-2 flex flex-col gap-2.5 sm:gap-3 short:gap-2">
    <!-- Genre, name and size; the map's picture small in the corner (on an upright phone large, on top) -->
    <div class="flex items-start gap-3 portrait:flex-col-reverse portrait:items-stretch portrait:gap-2.5">
      <div class="min-w-0 flex-1">
        <div :class="['flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider', playInfo.accent]">
          <component :is="MAP_MODE_INFO[map.mode].icon" class="size-3.5 shrink-0" />
          {{ $t(playInfo.label) }}
        </div>
        <h3 class="mt-0.5 text-base sm:text-xl font-extrabold text-brand-200 truncate">{{ map.name }}</h3>
        <span class="text-[11px] sm:text-xs text-slate-400">{{ map.cols }} × {{ map.rows }}</span>
      </div>
      <MapPreviewImage :map="map" class="w-32 sm:w-44 short:w-28 portrait:w-full aspect-2/1 rounded-xl border border-slate-800 shrink-0" />
    </div>

    <!-- How to play: three steps of the genre -->
    <section class="flex flex-col gap-1.5">
      <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">{{ $t('maps.howToPlay') }}</span>
      <ol class="flex flex-col gap-1">
        <li v-for="(step, i) in playInfo.howTo" :key="step.text" class="flex items-start gap-2 text-xs text-slate-300 leading-snug">
          <span class="relative size-6 shrink-0 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center">
            <component :is="step.icon" :class="['size-3.5', playInfo.accent]" />
            <span class="absolute -top-1 -left-1 size-3.5 rounded-full bg-slate-800 text-[8px] font-black text-slate-300 flex items-center justify-center">{{ i + 1 }}</span>
          </span>
          <span class="pt-1">{{ $t(step.text) }}</span>
        </li>
      </ol>
    </section>

    <!-- Only the numbers that matter for this genre -->
    <div :class="['grid gap-1.5 sm:gap-2', STAT_COLUMNS[stats.length] ?? 'grid-cols-3']">
      <div
        v-for="stat in stats"
        :key="stat.label"
        class="rounded-xl bg-slate-950/50 border border-slate-800 px-2 py-1.5 short:py-1 flex items-center gap-2 min-w-0"
      >
        <component :is="stat.icon" :class="['size-4 shrink-0', stat.color]" />
        <div class="min-w-0">
          <div class="text-sm font-extrabold text-slate-50 leading-tight tabular-nums">{{ stat.value }}</div>
          <div class="text-[10px] text-slate-400 truncate">{{ $t(stat.label) }}</div>
        </div>
      </div>
    </div>

    <div v-if="map.mode === 'td' && details.clans.length > 0" class="flex flex-wrap gap-1.5 short:hidden">
      <span
        v-for="clan in details.clans"
        :key="clan.id"
        class="px-2 py-1 rounded-lg border border-slate-800 bg-slate-900/80 text-xs font-semibold text-slate-200 flex items-center gap-1.5"
      >
        <span class="size-2 rounded-full shrink-0" :style="{ backgroundColor: clan.color }" />
        {{ clan.name }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, type Component } from 'vue'
import { Coins, Crown, Flame, Heart, Repeat, Search, Swords, Timer, Users } from 'lucide-vue-next'
import { getMapDetails, type MapSummary } from '../../services/mapManager'
import { MAP_MODE_INFO, MAP_MODE_PLAY_INFO } from '../mapModeInfo'
import MapPreviewImage from './MapPreviewImage.vue'

/** The picked map: its picture, how its genre is played and the numbers of that genre */
const props = defineProps<{ map: MapSummary }>()

const details = computed(() => getMapDetails(props.map.raw))
const playInfo = computed(() => MAP_MODE_PLAY_INFO[props.map.mode])

/** One row of stats on wide screens, whatever their number */
const STAT_COLUMNS: Record<number, string> = { 4: 'grid-cols-2 sm:grid-cols-4', 5: 'grid-cols-3 sm:grid-cols-5' }

const minutes = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

const stats = computed<Array<{ icon: Component; color: string; value: string | number; label: string }>>(() => {
  const d = details.value
  const players = { icon: Users, color: 'text-sky-400', value: props.map.playersCount, label: 'home.info.players' }
  if (props.map.mode === 'td') {
    return [
      { icon: Swords, color: 'text-brand-300', value: d.waves, label: 'home.info.waves' },
      { icon: Crown, color: 'text-amber-400', value: d.bossWaves, label: 'home.info.bosses' },
      { icon: Heart, color: 'text-rose-400', value: d.startingLives, label: 'home.info.lives' },
      { icon: Coins, color: 'text-amber-300', value: d.startingGold, label: 'home.info.gold' },
      players,
    ]
  }
  if (props.map.mode === 'hideseek') {
    return [
      players,
      { icon: Search, color: 'text-rose-300', value: d.seekers, label: 'home.info.seekers' },
      { icon: Repeat, color: 'text-purple-300', value: d.rounds, label: 'home.info.rounds' },
      { icon: Timer, color: 'text-amber-300', value: minutes(d.roundTime), label: 'home.info.roundTime' },
    ]
  }
  if (props.map.mode === 'curse') {
    return [
      players,
      { icon: Repeat, color: 'text-purple-300', value: d.rounds, label: 'home.info.rounds' },
      { icon: Flame, color: 'text-fuchsia-300', value: minutes(d.roundTime), label: 'home.info.curseFuse' },
    ]
  }
  return [players]
})
</script>
