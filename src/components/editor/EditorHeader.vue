<template>
  <header class="h-12 sm:h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-2 sm:px-4 shrink-0 z-30 select-none shadow-md">
    <!-- Left: Brand / Home + Map Info -->
    <div class="flex items-center gap-2 sm:gap-3">
      <!-- Home Button -->
      <UiButton
        variant="secondary"
        size="sm"
        :leading-icon="Home"
        title="Return to home screen"
        @click="router.push('/')"
      >
        <span class="hidden md:inline font-bold">Isocraft</span>
      </UiButton>

      <div class="h-5 w-px bg-slate-800 hidden sm:block"></div>

      <!-- Current Map Name Display -->
      <div 
        class="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-bold text-slate-200"
        :title="mapStore.project.name || 'Untitled Map'"
      >
        <span class="truncate max-w-25 sm:max-w-32.5">{{ mapStore.project.name || 'New Map' }}</span>
      </div>

      <!-- New Map Action Button -->
      <UiButton
        variant="ghost"
        size="xs"
        :leading-icon="Plus"
        title="Create new blank map"
        custom-class="text-brand-300 hover:bg-brand-500/15 border-brand-500/30"
        @click="emit('open-welcome', 'new', false)"
      >
        <span class="hidden sm:inline">New</span>
      </UiButton>

      <!-- Import Map Action Button -->
      <UiButton
        variant="ghost"
        size="xs"
        :leading-icon="Upload"
        title="Import saved project file"
        custom-class="text-teal-300 hover:bg-teal-500/15 border-teal-500/30"
        @click="emit('open-welcome', 'import', false)"
      >
        <span class="hidden sm:inline">Import</span>
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
        title="Toggle Grid Overlay (Ctrl+G)"
        @click="toolStore.showGrid = !toolStore.showGrid"
      >
        <span class="hidden md:inline text-[11px]">Grid</span>
      </UiButton>

      <!-- Coordinates Toggle -->
      <UiButton
        variant="tool"
        size="xs"
        :active="toolStore.showCoordinates"
        :leading-icon="Hash"
        title="Toggle Cell Coordinates"
        @click="toolStore.showCoordinates = !toolStore.showCoordinates"
      >
        <span class="hidden md:inline text-[11px]">Coords</span>
      </UiButton>

      <div class="h-4 w-px bg-slate-800 mx-1"></div>

      <!-- Undo -->
      <UiIconButton
        variant="ghost"
        size="sm"
        :icon="Undo2"
        :disabled="!mapStore.canUndo"
        title="Undo (Ctrl+Z)"
        @click="mapStore.undo()"
      />

      <!-- Redo -->
      <UiIconButton
        variant="ghost"
        size="sm"
        :icon="Redo2"
        :disabled="!mapStore.canRedo"
        title="Redo (Ctrl+Y)"
        @click="mapStore.redo()"
      />
    </div>

    <!-- Right: TD Hub Modal, Start Game, Export -->
    <div class="flex items-center gap-1.5 sm:gap-2">
      <!-- TD & Movement Settings Modal Button -->
      <UiButton
        :variant="toolStore.isGameConfigModalOpen ? 'game-amber' : 'secondary'"
        size="sm"
        :leading-icon="ShieldAlert"
        title="Towers, Waves & Movement Settings"
        @click="toolStore.isGameConfigModalOpen = !toolStore.isGameConfigModalOpen"
      >
        <span class="hidden sm:inline">TD Settings</span>
      </UiButton>

      <!-- Play Game Button (Navigates cleanly to /game) -->
      <UiButton
        variant="game-green"
        size="sm"
        :leading-icon="Gamepad2"
        title="Switch to Game Mode (Play on current map)"
        @click="handleStartGame"
      >
        <span>Play</span>
      </UiButton>

      <!-- Export Button -->
      <UiButton
        variant="primary"
        size="sm"
        :leading-icon="Download"
        title="Export PNG or JSON"
        @click="toolStore.isExportModalOpen = true; emit('open-export')"
      >
        <span class="hidden sm:inline">Export</span>
      </UiButton>

      <!-- Help Button -->
      <UiIconButton
        variant="ghost"
        size="sm"
        :icon="HelpCircle"
        title="Keyboard Shortcuts (Help)"
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
import { UiButton, UiIconButton } from '../ui'
import { useMapStore } from '../../stores/mapStore'
import { useToolStore } from '../../stores/toolStore'

const router = useRouter()
const mapStore = useMapStore()
const toolStore = useToolStore()

const emit = defineEmits<{
  (e: 'open-welcome', mode?: 'new' | 'import', forced?: boolean): void
  (e: 'open-export'): void
}>()

function handleStartGame() {
  router.push('/game')
}
</script>
