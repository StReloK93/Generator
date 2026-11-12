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
      <!-- Left Unified Sidebar (Objects/Layers + Asset Gallery) -->
      <RightSidebar 
        @focus-cell="handleFocusCell" 
      />

      <!-- Main Isometric Canvas Viewport -->
      <div class="flex-1 flex flex-col h-full relative overflow-hidden">
        <EditorCanvas 
          ref="viewportRef" 
          class="flex-1" 
          @ready="handleEditorReady"
          @progress="handleEditorProgress"
        />

        <!-- Seamless Editor Readiness Preloader (Covers until PixiJS canvas & assets are 100% loaded) -->
        <Transition name="preloader-fade">
          <div 
            v-if="!isEditorReady" 
            class="absolute inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-6 text-center select-none"
          >
            <!-- Ambient Background Glows -->
            <div class="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] bg-size-[24px_24px] opacity-20 pointer-events-none"></div>
            <div class="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-125 h-87.5 bg-amber-500/10 rounded-full blur-[140px] pointer-events-none animate-pulse"></div>

            <div class="relative z-10 flex flex-col items-center max-w-sm w-full">
              <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-2xl shadow-amber-500/20 mb-4 animate-bounce">
                <Layers class="w-8 h-8 sm:w-10 sm:h-10 text-amber-400" />
              </div>

              <!-- Prominent Map / Studio Title -->
              <h2 class="text-xl sm:text-2xl font-black tracking-wider text-white uppercase mb-1 drop-shadow-md truncate max-w-full">
                {{ mapStore.project.name || $t('editor.loadingTitle') }}
              </h2>
              <p class="text-xs font-semibold text-amber-400 mb-6 tracking-widest uppercase flex items-center gap-2">
                <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                <span>{{ editorStageMessage || $t('editor.loadingSubtitle') }}</span>
              </p>

              <!-- Minimal Linear Progress Bar -->
              <div class="w-full bg-slate-900 border border-slate-800 rounded-full h-2.5 overflow-hidden shadow-inner mb-2 p-0.5">
                <div 
                  class="h-full bg-linear-to-r from-amber-500 via-orange-400 to-amber-300 transition-all duration-300 ease-out rounded-full shadow-sm shadow-amber-500/50"
                  :style="{ width: `${editorProgress}%` }"
                ></div>
              </div>
              <span class="font-mono text-xs text-slate-500 font-bold">
                {{ Math.round(editorProgress) }}%
              </span>
            </div>
          </div>
        </Transition>
      </div>
    </div>

    <!-- Modals & Overlays -->
    <!-- Only the map genre's own settings -->
    <template v-if="mapMode === 'td'">
      <GameConfigModal />
      <TowerCreateModal />
    </template>
    <HideSeekConfigModal v-else-if="isMazeMode(mapMode)" />
    <HeroConfigModal v-else />

    <BoxClearModal />
    <KeyboardShortcutsModal />
    <HistoryModal />

    <WelcomeProjectModal ref="welcomeModalRef" />

    <ExportModal :viewport-ref="viewportRef" />
    <MapPublishModal @focus-cell="handleFocusCell" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Layers } from 'lucide-vue-next'
import EditorHeader from '../components/editor/EditorHeader.vue'
import EditorCanvas from '../components/editor/EditorCanvas.vue'
import RightSidebar from '../components/RightSidebar.vue'
import WelcomeProjectModal from '../components/WelcomeProjectModal.vue'
import ExportModal from '../components/ExportModal.vue'
import GameConfigModal from '../components/GameConfigModal.vue'
import HeroConfigModal from '../components/HeroConfigModal.vue'
import HideSeekConfigModal from '../components/HideSeekConfigModal.vue'
import { getMapMode, isMazeMode } from '../domain/map'
import TowerCreateModal from '../components/TowerCreateModal.vue'
import BoxClearModal from '../components/BoxClearModal.vue'
import KeyboardShortcutsModal from '../components/KeyboardShortcutsModal.vue'
import HistoryModal from '../components/editor/HistoryModal.vue'
import MapPublishModal from '../components/editor/MapPublishModal.vue'
import { useMapStore } from '../stores/mapStore'
import { useAssetStore } from '../stores/assetStore'
import { useRouteStore } from '../stores/routeStore'
import { useWaveStore } from '../stores/waveStore'
import { useGameStore } from '../stores/gameStore'
import { useTowerStore } from '../stores/towerStore'
import { networkSyncBuffer } from '../services/networkSync'
import { 
  getEditorMapDataById, 
  applyMapPayloadToStores, 
  saveEditorDraft, 
  sanitizeMapId,
  collectEditorMapState
} from '../services/mapManager'
import { useMapLibraryStore } from '../stores/mapLibraryStore'

const router = useRouter()
const route = useRoute()
const mapStore = useMapStore()
const assetStore = useAssetStore()
const routeStore = useRouteStore()
const waveStore = useWaveStore()
const gameStore = useGameStore()
const towerStore = useTowerStore()
const mapLibrary = useMapLibraryStore()

const mapMode = computed(() => getMapMode(mapStore.project))

const viewportRef = ref<any>(null)
const welcomeModalRef = ref<any>(null)
const isExportModalOpen = ref(false)

const isEditorReady = ref(false)
const editorProgress = ref(0)
const editorStageMessage = ref('')

function handleEditorProgress(data: { percent: number; message: string }) {
  editorProgress.value = data.percent
  editorStageMessage.value = data.message
}

function handleEditorReady() {
  editorProgress.value = 100
  setTimeout(() => {
    isEditorReady.value = true
  }, 120)
}

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
  const state = collectEditorMapState()

  const currentId = sanitizeMapId(mapStore.project.id || mapStore.project.name || 'julion')
  mapStore.project.id = currentId

  // 2. Save editor draft to localStorage
  saveEditorDraft(currentId, state.project, state.assets, state.characterData, state.towerData, state.waveData, state.gameSettings)

  // 3. A built-in map: what differs from its saved file
  mapLibrary.refresh()
}

watch(
  () => [
    mapStore.project.updatedAt,
    assetStore.assets.length,
    waveStore.waveConfigs,
    routeStore.routes,
    gameStore.startingGold,
    gameStore.startingLives,
    gameStore.wavePrepDuration,
    gameStore.spawnMode,
    gameStore.formation,
    gameStore.pairDistance,
    towerStore.blueprints,
    towerStore.placedTowers.length,
    towerStore.clans,
    mapStore.project.hideSeekSettings,
  ],
  () => {
    if (saveTimeout) clearTimeout(saveTimeout)
    saveTimeout = setTimeout(() => {
      autoSaveCurrentState()
    }, 2500)
  }
)

/** `fromGame`: the map in the stores is a game's copy (a game draws some pieces itself and changes it), so it is loaded again */
function initEditorMap(fromGame = false) {
  // 1. Resolve Map ID from route params, or fallback to active project in store
  let rawId = (route.params.mapId as string) || ''
  
  // /editor without a map while a map was being edited (it has a draft): back to that map, not the blank default one
  const currentId = sanitizeMapId(mapStore.project.id || mapStore.project.name || 'julion')
  if (!rawId && getEditorMapDataById(currentId)) {
    router.replace(`/editor/${currentId}`)
    return
  }

  // DIRECT ACCESS: /editor without mapId offers the game's maps (or a new one)
  if (!rawId) {
    welcomeModalRef.value?.open('maps', true)
    return
  }

  const cleanId = sanitizeMapId(rawId)

  // 2. Restore map: if mapStore does not have this map loaded or user accessed different map, load from editor draft or src/maps/
  if (fromGame || !mapStore.project.cols || mapStore.project.layers.length === 0 || sanitizeMapId(mapStore.project.id) !== cleanId) {
    const mapData = getEditorMapDataById(cleanId)
    if (mapData) {
      applyMapPayloadToStores(mapData.payload)
      mapLibrary.startEditing(cleanId, mapData.source)
    } else {
      welcomeModalRef.value?.open('maps', true)
      return
    }
  }
}

onMounted(async () => {
  // Purge any legacy single auto-saved session data
  try {
    localStorage.removeItem('isocraft_autosave')
  } catch (e) {
    // Ignore
  }

  // Active in Editor mode: mark that maps worked on here are editor projects
  const fromGame = mapStore.isGameMap
  mapStore.isGameMap = false

  // STRICT CLEANUP: Always stop any previous game simulation & network snapshots when entering editor
  gameStore.exitPlayMode()
  towerStore.clearCombatEffects()
  networkSyncBuffer.clear()

  initEditorMap(fromGame)
})

watch(() => route.params.mapId, (newMapId, oldMapId) => {
  if (route.name === 'editor' && newMapId !== oldMapId) {
    initEditorMap()
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

<style scoped>
.preloader-fade-leave-active {
  transition: opacity 0.35s ease-out;
}
.preloader-fade-leave-to {
  opacity: 0;
  pointer-events: none;
}
</style>
