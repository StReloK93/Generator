<template>
  <div class="flex flex-col h-screen w-screen bg-dark-950 text-slate-100 overflow-hidden font-sans select-none">
    <!-- Top Global App Header (Hidden in Game Mode) -->
    <Header 
      v-if="!characterStore.isGameMode"
      @open-welcome="(mode) => welcomeModalRef?.open(mode)"
      @open-export="isExportModalOpen = true"
    />

    <!-- Main Workspace -->
    <div class="flex-1 flex overflow-hidden relative">
      <!-- Main Isometric Canvas Viewport -->
      <div class="flex-1 flex flex-col h-full relative overflow-hidden">
        <CanvasViewport 
          ref="viewportRef" 
          class="flex-1"
        />
      </div>

      <!-- Right Unified Sidebar (40% Objects/Layers, 60% Asset Gallery) -->
      <RightSidebar 
        v-if="!characterStore.isGameMode"
        @focus-cell="handleFocusCell"
      />
    </div>

    <!-- Modals & Overlays -->
    <GamePreloaderOverlay />

    <WelcomeProjectModal 
      ref="welcomeModalRef"
    />

    <ExportModal 
      :viewport-ref="viewportRef"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import Header from '../components/Header.vue'
import CanvasViewport from '../components/CanvasViewport.vue'
import RightSidebar from '../components/RightSidebar.vue'
import WelcomeProjectModal from '../components/WelcomeProjectModal.vue'
import ExportModal from '../components/ExportModal.vue'
import GamePreloaderOverlay from '../components/GamePreloaderOverlay.vue'
import { useMapStore } from '../stores/mapStore'
import { useAssetStore } from '../stores/assetStore'
import { useCharacterStore } from '../stores/characterStore'

const mapStore = useMapStore()
const assetStore = useAssetStore()
const characterStore = useCharacterStore()

const viewportRef = ref<any>(null)
const welcomeModalRef = ref<any>(null)
const isExportModalOpen = ref(false)

function handleFocusCell(pos: { col: number; row: number }) {
  if (viewportRef.value && viewportRef.value.focusOnCell) {
    viewportRef.value.focusOnCell(pos.col, pos.row)
  }
}

// Auto-Save Session to LocalStorage (debounced)
let saveTimeout: any = null
watch(
  () => [mapStore.project, assetStore.assets],
  () => {
    if (saveTimeout) clearTimeout(saveTimeout)
    saveTimeout = setTimeout(() => {
      try {
        if (mapStore.project.cols && mapStore.project.layers.length > 0) {
          localStorage.setItem('isocraft_autosave', JSON.stringify({
            project: mapStore.project,
            assets: assetStore.assets
          }))
        }
      } catch (e) {
        console.warn('Auto-save error:', e)
      }
    }, 800)
  },
  { deep: true }
)
</script>
