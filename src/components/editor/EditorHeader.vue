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
        :disabled="characterStore.isDrawingRoute ? !characterStore.canUndoRoute : !mapStore.canUndo"
        :title="`${$t('header.undo')} (Ctrl+Z)`"
        @click="handleUndo"
      />

      <!-- Redo -->
      <UiIconButton
        variant="ghost"
        size="sm"
        :icon="Redo2"
        :disabled="characterStore.isDrawingRoute ? !characterStore.canRedoRoute : !mapStore.canRedo"
        :title="`${$t('header.redo')} (Ctrl+Y)`"
        @click="handleRedo"
      />
    </div>

    <!-- Right: TD Hub Modal, Start Game, Export -->
    <div class="flex items-center gap-1.5 sm:gap-2">
      <!-- TD & Movement Settings Modal Button -->
      <UiButton
        :variant="toolStore.isGameConfigModalOpen ? 'game-amber' : 'secondary'"
        size="sm"
        :leading-icon="ShieldAlert"
        :title="`${$t('header.gameConfig')} (T)`"
        @click="toolStore.isGameConfigModalOpen = !toolStore.isGameConfigModalOpen"
      >
        <span class="hidden sm:inline">{{ $t('header.gameConfig') }}</span>
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
  Home, Grid, Hash, Undo2, Redo2, Download, ShieldAlert, Gamepad2, HelpCircle, Plus, Upload
} from 'lucide-vue-next'
import { UiButton, UiIconButton, UiLanguageSwitcher } from '../ui'
import { useMapStore } from '../../stores/mapStore'
import { useToolStore } from '../../stores/toolStore'
import { useCharacterStore } from '../../stores/characterStore'
import { useI18nStore } from '../../stores/i18nStore'
import { sanitizeMapId } from '../../services/mapManager'

const router = useRouter()
const mapStore = useMapStore()
const toolStore = useToolStore()
const characterStore = useCharacterStore()
const { t } = useI18nStore()

const emit = defineEmits<{
  (e: 'open-welcome', mode?: 'new' | 'import', forced?: boolean): void
  (e: 'open-export'): void
}>()

function handleUndo() {
  if (characterStore.isDrawingRoute) {
    characterStore.undoRoute()
  } else {
    mapStore.undo()
  }
}

function handleRedo() {
  if (characterStore.isDrawingRoute) {
    characterStore.redoRoute()
  } else {
    mapStore.redo()
  }
}

function handleStartGame() {
  characterStore.entrySource = 'editor'
  characterStore.startLoadingScreen(mapStore.project.name || t('game.battlefield'))
  const cleanId = sanitizeMapId(mapStore.project.id || mapStore.project.name || 'julion')
  router.push(`/game/${cleanId}`)
}
</script>
