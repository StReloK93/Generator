<template>
  <span
    class="relative inline-flex items-center justify-center rounded-xl border border-slate-700/70 bg-slate-950 shrink-0 overflow-hidden"
    :class="size === 'sm' ? 'size-8' : 'size-11'"
  >
    <span class="absolute inset-0" :style="{ background: glow }" />
    <component :is="BEHAVIOR_INFO[def.behavior].icon" v-if="def.behavior !== 'flying'" class="relative size-3.5 text-white/80" />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ProjectileDefinition } from '../../types/projectile'
import { BEHAVIOR_INFO, projectileSwatch } from './projectileLabels'

const props = withDefaults(defineProps<{ def: ProjectileDefinition; size?: 'sm' | 'md' }>(), { size: 'md' })

/** A soft glow built from the projectile's own colors, outer to inner */
const glow = computed(() => {
  const colors = projectileSwatch(props.def)
  const stops = colors.map((c, i) => `${c} ${Math.round(70 - (i / Math.max(1, colors.length - 1)) * 55)}%`).reverse()
  return `radial-gradient(circle at 50% 50%, ${stops.join(', ')}, transparent 78%)`
})
</script>
