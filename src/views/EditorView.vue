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
    <FillGroundModal />
    <BoxClearModal />
    <KeyboardShortcutsModal />

    <WelcomeProjectModal ref="welcomeModalRef" />

    <ExportModal :viewport-ref="viewportRef" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import EditorHeader from '../components/editor/EditorHeader.vue'
import EditorCanvas from '../components/editor/EditorCanvas.vue'
import RightSidebar from '../components/RightSidebar.vue'
import WelcomeProjectModal from '../components/WelcomeProjectModal.vue'
import ExportModal from '../components/ExportModal.vue'
import GameConfigModal from '../components/GameConfigModal.vue'
import TowerCreateModal from '../components/TowerCreateModal.vue'
import FillGroundModal from '../components/FillGroundModal.vue'
import BoxClearModal from '../components/BoxClearModal.vue'
import KeyboardShortcutsModal from '../components/KeyboardShortcutsModal.vue'
import { useMapStore } from '../stores/mapStore'
import { useToolStore } from '../stores/toolStore'
import { useAssetStore } from '../stores/assetStore'
import { useCharacterStore } from '../stores/characterStore'
import { useTowerStore } from '../stores/towerStore'
import { networkSyncBuffer } from '../services/networkSync'
import { 
  getEditorMapDataById, 
  applyMapPayloadToStores, 
  saveEditorDraft, 
  sanitizeMapId 
} from '../services/mapManager'

const router = useRouter()
const route = useRoute()
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

  const currentId = sanitizeMapId(mapStore.project.id || mapStore.project.name || 'julion')
  mapStore.project.id = currentId

  // 2. Save editor draft to localStorage
  saveEditorDraft(
    currentId,
    mapStore.project,
    assetStore.assets,
    {
      customRoutes: characterStore.customRoutes,
      customWaypoints: characterStore.customWaypoints,
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
      placedTowers: towerStore.placedTowers,
      towerBlueprints: towerStore.blueprints,
      clans: towerStore.clans,
    },
    {
      waveConfigs: characterStore.waveConfigs,
      currentWaveIndex: characterStore.currentWaveIndex,
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
    characterStore.customWaypoints,
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
    towerStore.clans,
  ],
  () => {
    if (saveTimeout) clearTimeout(saveTimeout)
    saveTimeout = setTimeout(() => {
      autoSaveCurrentState()
    }, 600)
  },
  { deep: true }
)

onMounted(async () => {
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

  // 1. Resolve Map ID from route params
  const rawId = (route.params.mapId as string) || ''

  // DIRECT ACCESS: /editor without mapId prompts Welcome/Map Selection modal
  if (!rawId) {
    welcomeModalRef.value?.open('new', true)
    return
  }

  const cleanId = sanitizeMapId(rawId)

  // 2. Restore map: checks LocalStorage editor draft first (if user refreshed), else loads from src/maps/
  if (!mapStore.project.cols || mapStore.project.layers.length === 0 || sanitizeMapId(mapStore.project.id) !== cleanId) {
    const mapData = getEditorMapDataById(cleanId)
    if (mapData) {
      applyMapPayloadToStores(mapData.payload)
    } else {
      welcomeModalRef.value?.open('new', true)
      return
    }
  }

  // Detect doors for route drawing
  characterStore.detectDoors()
})

onUnmounted(() => {
  if (saveTimeout) {
    clearTimeout(saveTimeout)
    saveTimeout = null
  }
  autoSaveCurrentState()
})
</script>
