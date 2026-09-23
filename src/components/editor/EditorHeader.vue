<template>
  <header class="h-12 sm:h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-2 sm:px-4 shrink-0 z-30 select-none shadow-md">
    <!-- Left: Brand / Home + Map Info -->
    <div class="flex items-center gap-2 sm:gap-3">
      <!-- Home Button -->
      <UiButton
        variant="secondary"
        size="sm"
        :leading-icon="Home"
        :title="$t('header.home')"
        @click="router.push('/')"
      >
        <span class="hidden md:inline font-bold">Defensor</span>
      </UiButton>

      <div class="h-5 w-px bg-slate-800 hidden sm:block"></div>

      <!-- Current Map Name Display -->
      <div 
        class="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-bold text-slate-200"
        :title="mapStore.project.name || $t('header.newMap')"
      >
        <span class="truncate max-w-25 sm:max-w-32.5">{{ mapStore.project.name || $t('header.newMap') }}</span>
      </div>

      <!-- New Map Action Button -->
      <UiButton
        variant="ghost"
        size="xs"
        :leading-icon="Plus"
        :title="$t('header.newMap')"
        custom-class="text-brand-300 hover:bg-brand-500/15 border-brand-500/30"
        @click="emit('open-welcome', 'new', false)"
      >
        <span class="hidden sm:inline">{{ $t('common.create') }}</span>
      </UiButton>

      <!-- Import Map Action Button -->
      <UiButton
        variant="ghost"
        size="xs"
        :leading-icon="Upload"
        :title="$t('common.import')"
        custom-class="text-teal-300 hover:bg-teal-500/15 border-teal-500/30"
        @click="emit('open-welcome', 'import', false)"
      >
        <span class="hidden sm:inline">{{ $t('common.import') }}</span>
      </UiButton>

      <!-- Map Dimensions -->
      <div class="hidden xl:flex items-center gap-1.5 text-xs text-slate-400 font-mono bg-slate-950/60 px-2.5 py-1 rounded-lg border border-slate-800">
        <span>{{ mapStore.project.cols }}x{{ mapStore.project.rows }}</span>
        <span class="text-slate-600">|</span>
        <span>{{ mapStore.project.tileWidth }}x{{ mapStore.project.tileHeight }}px</span>
      </div>
    </div>

    <!-- Center: Quick Grid & View Toggles -->
    <div class="flex items-center gap-1 sm:gap-1.5">
      <!-- Grid Toggle -->
      <UiButton
        variant="tool"
        size="xs"
        :active="toolStore.showGrid"
        :leading-icon="Grid"
        :title="`${$t('header.gridToggle')} (H)`"
        @click="toolStore.showGrid = !toolStore.showGrid"
      >
        <span class="hidden md:inline text-[11px]">{{ $t('header.gridToggle') }}</span>
      </UiButton>

      <!-- Coordinates Toggle -->
      <UiButton
        variant="tool"
        size="xs"
        :active="toolStore.showCoordinates"
        :leading-icon="Hash"
        :title="`${$t('inspector.gridPosition')} (K)`"
        @click="toolStore.showCoordinates = !toolStore.showCoordinates"
      >
        <span class="hidden md:inline text-[11px]">{{ $t('common.position') }}</span>
      </UiButton>

      <div class="h-4 w-px bg-slate-800 mx-1"></div>

      <!-- Undo -->
      <UiIconButton
        variant="ghost"
        size="sm"
        :icon="Undo2"
        :disabled="routeStore.isDrawingRoute ? !routeStore.canUndoRoute : !mapStore.canUndo"
        :title="`${$t('header.undo')} (Ctrl+Z)`"
        @click="handleUndo"
      />

      <!-- Redo -->
      <UiIconButton
        variant="ghost"
        size="sm"
        :icon="Redo2"
        :disabled="routeStore.isDrawingRoute ? !routeStore.canRedoRoute : !mapStore.canRedo"
        :title="`${$t('header.redo')} (Ctrl+Y)`"
        @click="handleRedo"
      />

      <!-- History -->
      <UiIconButton
        variant="ghost"
        size="sm"
        :icon="History"
        :active="toolStore.isHistoryModalOpen"
        :title="`${$t('header.history')} (H)`"
        @click="toolStore.isHistoryModalOpen = !toolStore.isHistoryModalOpen"
      />
    </div>

    <!-- Right: TD Hub Modal, Start Game, Export -->
    <div class="flex items-center gap-1.5 sm:gap-2">

      <!-- TD & Movement Settings Modal Button -->
      <UiButton
        :variant="toolStore.isGameConfigModalOpen ? 'game-amber' : 'secondary'"
        size="sm"
        :leading-icon="ShieldAlert"
        :title="`${$t('common.tdSettings')} (T)`"
        @click="toolStore.isGameConfigModalOpen = !toolStore.isGameConfigModalOpen"
      >
        <span class="hidden sm:inline">{{ $t('common.tdSettings') }}</span>
      </UiButton>

      <!-- Play Game Button (Navigates cleanly to /game) -->
      <UiButton
        variant="game-green"
        size="sm"
        :leading-icon="Gamepad2"
        :title="$t('header.playTest')"
        @click="handleStartGame"
      >
        <span>{{ $t('header.playTest') }}</span>
      </UiButton>

      <!-- Export Button -->
      <UiButton
        variant="primary"
        size="sm"
        :leading-icon="Download"
        :title="$t('common.export')"
        @click="toolStore.isExportModalOpen = true; emit('open-export')"
      >
        <span class="hidden sm:inline">{{ $t('common.export') }}</span>
      </UiButton>

      <!-- Language Switcher -->
      <UiLanguageSwitcher />

      <!-- Help Button -->
      <UiIconButton
        variant="ghost"
        size="sm"
        :icon="HelpCircle"
        :title="`${$t('header.help')} (?)`"
        custom-class="hidden sm:inline-flex"
        @click="toolStore.isShortcutsModalOpen = true"
      />
    </div>
  </header>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { 
  Home, Grid, Hash, Undo2, Redo2, History, Download, ShieldAlert, Gamepad2, HelpCircle, Plus, Upload
} from 'lucide-vue-next'
import { UiButton, UiIconButton, UiLanguageSwitcher } from '../ui'
import { useMapStore } from '../../stores/mapStore'
import { useAssetStore } from '../../stores/assetStore'
import { useToolStore } from '../../stores/toolStore'
import { useRouteStore } from '../../stores/routeStore'
import { useWaveStore } from '../../stores/waveStore'
import { useGameStore } from '../../stores/gameStore'
import { useTowerStore } from '../../stores/towerStore'
import { useI18nStore } from '../../stores/i18nStore'
import { sanitizeMapId, saveEditorDraft, registerSessionCustomMap } from '../../services/mapManager'
import { buildFullProjectJsonPayload } from '../../utils/exportHelpers'

const router = useRouter()
const mapStore = useMapStore()
const assetStore = useAssetStore()
const toolStore = useToolStore()
const routeStore = useRouteStore()
const waveStore = useWaveStore()
const gameStore = useGameStore()
const towerStore = useTowerStore()
const { t } = useI18nStore()

const emit = defineEmits<{
  (e: 'open-welcome', mode?: 'new' | 'import', forced?: boolean): void
  (e: 'open-export'): void
}>()

function handleUndo() {
  if (routeStore.isDrawingRoute) {
    routeStore.undoRoute()
  } else {
    mapStore.undo()
  }
}

function handleRedo() {
  if (routeStore.isDrawingRoute) {
    routeStore.redoRoute()
  } else {
    mapStore.redo()
  }
}

function handleStartGame() {
  gameStore.entrySource = 'editor'
  gameStore.startLoadingScreen(mapStore.project.name || t('game.battlefield'))
  const cleanId = sanitizeMapId(mapStore.project.id || mapStore.project.name || 'julion')
  mapStore.project.id = cleanId

  // 1. Sync store state to project
  gameStore.syncGameSettingsToProject()
  waveStore.syncWavesToProject()
  routeStore.syncRoutesToProject()
  towerStore.syncToProject()

  // 2. Save editor draft so it is 100% updated in localStorage
  saveEditorDraft(
    cleanId,
    mapStore.project,
    assetStore.assets,
    {
      routes: routeStore.routes,
    },
    {
      placedTowers: towerStore.placedTowers,
      towerBlueprints: towerStore.blueprints,
      clans: towerStore.clans,
    },
    {
      waveConfigs: waveStore.waveConfigs,
      currentWaveIndex: waveStore.currentWaveIndex,
    },
    mapStore.project.gameSettings
  )

  // 3. Register as session custom map for game
  registerSessionCustomMap(cleanId, buildFullProjectJsonPayload(
    mapStore.project,
    assetStore.assets,
    {
      routes: routeStore.routes,
    },
    {
      placedTowers: towerStore.placedTowers,
      towerBlueprints: towerStore.blueprints,
      clans: towerStore.clans,
    },
    {
      waveConfigs: waveStore.waveConfigs,
      currentWaveIndex: waveStore.currentWaveIndex,
    },
    mapStore.project.gameSettings
  ))

  router.push(`/editor-game/${cleanId}`)
}
</script>
