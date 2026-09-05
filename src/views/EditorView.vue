<template>
  <div
    class="flex flex-col h-dvh min-h-dvh max-h-dvh w-screen bg-dark-950 text-slate-100 overflow-hidden font-sans select-none">
    <!-- Top Global Editor Header -->
    <EditorHeader 
      @open-welcome="(mode, forced) => welcomeModalRef?.open(mode, forced)"
      @open-export="isExportModalOpen = true" 
    />

    <!-- Main Workspace -->
    <div class="flex-1 flex overflow-hidden relative">
      <!-- Main Isometric Canvas Viewport -->
      <div class="flex-1 flex flex-col h-full relative overflow-hidden">
        <EditorCanvas ref="viewportRef" class="flex-1" />
      </div>

      <!-- Right Unified Sidebar (Objects/Layers + Asset Gallery) -->
      <RightSidebar 
        @focus-cell="handleFocusCell" 
      />
    </div>

    <!-- Modals & Overlays -->
    <GameConfigModal />
    <TowerCreateModal />
    <KeyboardShortcutsModal />

    <WelcomeProjectModal ref="welcomeModalRef" />

    <ExportModal :viewport-ref="viewportRef" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import EditorHeader from '../components/editor/EditorHeader.vue'
import EditorCanvas from '../components/editor/EditorCanvas.vue'
import RightSidebar from '../components/RightSidebar.vue'
import WelcomeProjectModal from '../components/WelcomeProjectModal.vue'
import ExportModal from '../components/ExportModal.vue'
import GameConfigModal from '../components/GameConfigModal.vue'
import TowerCreateModal from '../components/TowerCreateModal.vue'
import KeyboardShortcutsModal from '../components/KeyboardShortcutsModal.vue'
import { useMapStore } from '../stores/mapStore'
import { useToolStore } from '../stores/toolStore'
import { useAssetStore } from '../stores/assetStore'
import { useCharacterStore } from '../stores/characterStore'
import { useTowerStore } from '../stores/towerStore'
import { networkSyncBuffer } from '../services/networkSync'
import { saveRecentProject } from '../services/projectStorage'

const mapStore = useMapStore()
const toolStore = useToolStore()
const assetStore = useAssetStore()
const characterStore = useCharacterStore()
const towerStore = useTowerStore()

const viewportRef = ref<any>(null)
const welcomeModalRef = ref<any>(null)
const isExportModalOpen = ref(false)

function handleFocusCell(pos: { col: number; row: number }) {
  if (viewportRef.value && viewportRef.value.focusOnCell) {
    viewportRef.value.focusOnCell(pos.col, pos.row)
  }
}

// Debounced recent project storage with user-given name and timestamp (only when editing in Editor!)
let saveTimeout: any = null

function autoSaveCurrentState() {
  if (mapStore.isGameMap || !mapStore.project.cols || !mapStore.project.layers || mapStore.project.layers.length === 0) {
    return
  }

  // 1. Synchronize all reactive store values into project
  characterStore.syncGameSettingsToProject()
  characterStore.syncWavesToProject()
  characterStore.syncSpawnPointsToProject()
  towerStore.syncToProject()

  // 2. Save full payload to autosave (100% identical to export JSON)
  saveRecentProject(
    mapStore.project,
    assetStore.assets,
    {
      customRoutes: characterStore.customRoutes,
      spawnPoints: characterStore.detectedDoors,
      characterConfig: {
        spawnCount: characterStore.spawnCount,
        spawnMode: characterStore.spawnMode,
        formation: characterStore.formation,
        pairDistance: characterStore.pairDistance,
        speed: characterStore.speed,
        selectedDoorIndex: characterStore.selectedDoorIndex,
        followCamera: characterStore.followCamera,
        showPathTrail: characterStore.showPathTrail,
        autoLoop: characterStore.autoLoop,
      },
      speed: characterStore.speed,
      formation: characterStore.formation,
      pairDistance: characterStore.pairDistance,
      followCamera: characterStore.followCamera,
      showPathTrail: characterStore.showPathTrail,
    },
    {
      waveConfigs: characterStore.waveConfigs,
      currentWaveIndex: characterStore.currentWaveIndex,
    },
    {
      placedTowers: towerStore.placedTowers,
      towerBlueprints: towerStore.blueprints,
    },
    {
      startingGold: characterStore.startingGold,
      startingLives: characterStore.startingLives,
      wavePrepTime: characterStore.wavePrepDuration,
    }
  )
}

watch(
  () => [
    mapStore.project,
    assetStore.assets,
    characterStore.waveConfigs,
    characterStore.customRoutes,
    characterStore.startingGold,
    characterStore.startingLives,
    characterStore.wavePrepDuration,
    characterStore.speed,
    characterStore.formation,
    characterStore.pairDistance,
    characterStore.followCamera,
    characterStore.showPathTrail,
    towerStore.blueprints,
    towerStore.placedTowers,
  ],
  () => {
    if (saveTimeout) clearTimeout(saveTimeout)
    saveTimeout = setTimeout(() => {
      autoSaveCurrentState()
    }, 600)
  },
  { deep: true }
)

onMounted(() => {
  // Purge any legacy single auto-saved session data
  try {
    localStorage.removeItem('isocraft_autosave')
  } catch (e) {
    // Ignore
  }

  // Active in Editor mode: mark that maps worked on here are editor projects
  mapStore.isGameMap = false

  // STRICT CLEANUP: Always stop any previous game simulation & network snapshots when entering editor
  characterStore.exitPlayMode()
  characterStore.isPlaying = false
  characterStore.isGameMode = false
  characterStore.gameState = 'ready'
  characterStore.units = []
  towerStore.clearCombatEffects()
  networkSyncBuffer.clear()

  // Detect doors for route drawing
  characterStore.detectDoors()

  // Prompt mandatory map initialization modal (Create new or Upload file) if no map is active
  if (!mapStore.project.cols || mapStore.project.layers.length === 0) {
    welcomeModalRef.value?.open('new', true)
  }
})

onUnmounted(() => {
  if (saveTimeout) {
    clearTimeout(saveTimeout)
    saveTimeout = null
  }
  autoSaveCurrentState()
})
</script>
