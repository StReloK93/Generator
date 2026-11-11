<template>
  <div ref="hostRef" class="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true" />
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { HomeBackdropRenderer } from '../../rendering/pixi/HomeBackdropRenderer'

/** The home page's moving background (embers, light rays, fog), drawn by its Pixi renderer */
const hostRef = ref<HTMLElement | null>(null)
let backdrop: HomeBackdropRenderer | null = null

onMounted(() => {
  if (!hostRef.value) return
  backdrop = new HomeBackdropRenderer(hostRef.value)
  backdrop.start().catch(err => console.warn('[HomeBackdrop]', err))
})

onUnmounted(() => {
  backdrop?.destroy()
  backdrop = null
})
</script>
