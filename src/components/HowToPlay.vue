<template>
  <!-- How a genre is played, in three numbered steps (game menu, room lobby) -->
  <ol class="flex flex-col gap-2">
    <li v-for="(step, i) in info.howTo" :key="step.text" class="flex items-start gap-2.5 p-2.5 rounded-2xl bg-slate-950/60 border border-slate-800">
      <span class="size-7 shrink-0 rounded-lg bg-slate-900 border border-slate-700/80 flex items-center justify-center" :class="info.accent">
        <component :is="step.icon" class="size-4" />
      </span>
      <span class="text-xs text-slate-300 leading-snug text-left"><b class="text-slate-100">{{ i + 1 }}.</b> {{ $t(step.text) }}</span>
    </li>
  </ol>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { MapGameMode } from '../types/map'
import { MAP_MODE_PLAY_INFO } from './mapModeInfo'

const props = defineProps<{ mode: MapGameMode }>()

const info = computed(() => MAP_MODE_PLAY_INFO[props.mode])
</script>
