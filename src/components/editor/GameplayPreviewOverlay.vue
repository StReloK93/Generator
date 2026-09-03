<template>
  <div 
    v-if="toolStore.isPreviewMode"
    class="absolute inset-0 pointer-events-none z-40 flex flex-col justify-between pt-safe pb-safe animate-in fade-in duration-200 select-none"
  >
    <!-- 1. Top In-Game HUD (Identical to actual gameplay) -->
    <GameHud :is-preview="true" @exit-preview="toolStore.isPreviewMode = false" />

    <!-- 2. Bottom Controls & Tower Shop (Identical to actual gameplay) -->
    <GameControls :is-preview="true" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import GameHud from '../game/GameHud.vue'
import GameControls from '../game/GameControls.vue'
import { useToolStore } from '../../stores/toolStore'

const toolStore = useToolStore()

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape' && toolStore.isPreviewMode) {
    toolStore.isPreviewMode = false
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
</script>
