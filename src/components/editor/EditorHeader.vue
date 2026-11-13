<template>
  <header class="h-12 sm:h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-2 px-2 sm:px-3 shrink-0 z-30 select-none shadow-md">
    <!-- Left: where you are (home, the map and everything done to the map as a whole) -->
    <div class="flex items-center gap-1.5 min-w-0">
      <UiIconButton :icon="Home" variant="ghost" size="sm" :title="$t('header.home')" @click="router.push('/')" />

      <UiMenu :items="mapMenuItems" @select="onMapMenu">
        <template #trigger="{ open, toggle }">
          <UiButton
            variant="secondary"
            size="sm"
            :leading-icon="modeInfo.icon"
            :trailing-icon="ChevronDown"
            :active="open"
            :title="`${mapStore.project.name || $t('header.newMap')} · ${$t(modeInfo.label)}`"
            @click="toggle"
          >
            <span class="truncate max-w-28 sm:max-w-44">{{ mapStore.project.name || $t('header.newMap') }}</span>
          </UiButton>
        </template>
        <template #header>
          <div class="flex items-center gap-2.5 px-3 pt-1.5 pb-2.5 mb-1 border-b border-slate-800">
            <img v-if="mapStore.project.previewImage" :src="mapStore.project.previewImage" alt="" class="h-9 aspect-2/1 rounded-md object-cover border border-slate-700" />
            <div class="flex flex-col min-w-0">
              <span class="text-xs font-bold text-slate-100 truncate">{{ mapStore.project.name || $t('header.newMap') }}</span>
              <span class="text-[10px] text-slate-400 font-mono">
                {{ $t(modeInfo.label) }} · {{ mapStore.project.cols }}x{{ mapStore.project.rows }}
              </span>
            </div>
          </div>
        </template>
      </UiMenu>
      <input ref="coverInput" type="file" accept="image/*" class="hidden" @change="onCoverPicked" />
    </div>

    <!-- Middle: editing (undo, history) and what the canvas shows -->
    <div class="flex items-center gap-0.5">
      <UiIconButton
        variant="ghost"
        size="sm"
        :icon="Undo2"
        :disabled="routeStore.isDrawingRoute ? !routeStore.canUndoRoute : !mapStore.canUndo"
        :title="`${$t('header.undo')} (Ctrl+Z)`"
        @click="handleUndo"
      />
      <UiIconButton
        variant="ghost"
        size="sm"
        :icon="Redo2"
        :disabled="routeStore.isDrawingRoute ? !routeStore.canRedoRoute : !mapStore.canRedo"
        :title="`${$t('header.redo')} (Ctrl+Y)`"
        @click="handleRedo"
      />
      <UiIconButton
        variant="ghost"
        size="sm"
        :icon="History"
        :active="toolStore.isHistoryModalOpen"
        :title="$t('header.history')"
        @click="toolStore.isHistoryModalOpen = !toolStore.isHistoryModalOpen"
      />
      <div class="h-5 w-px bg-slate-800 mx-1"></div>
      <UiIconButton
        variant="ghost"
        size="sm"
        :icon="Grid"
        :active="toolStore.showGrid"
        :title="`${$t('header.gridToggle')} (H)`"
        @click="toolStore.showGrid = !toolStore.showGrid"
      />
      <UiIconButton
        variant="ghost"
        size="sm"
        :icon="Hash"
        :active="toolStore.showCoordinates"
        :title="`${$t('inspector.gridPosition')} (K)`"
        @click="toolStore.showCoordinates = !toolStore.showCoordinates"
      />
    </div>

    <!-- Right: the map's game (its genre's settings, saving it into the game, trying it), then the app's own -->
    <div class="flex items-center gap-1.5">
      <UiButton
        :variant="toolStore.isModeSettingsOpen(mapMode) ? 'game-amber' : 'secondary'"
        size="sm"
        :leading-icon="modeInfo.icon"
        :title="`${$t(modeInfo.settings)} (T)`"
        @click="toolStore.toggleModeSettings(mapMode)"
      >
        <span class="hidden lg:inline whitespace-nowrap">{{ $t(modeInfo.settings) }}</span>
      </UiButton>

      <!-- Only for whoever may change the game's maps (the signed-in admin): a game map (src/maps): what changed against
           its file, saving it back on the server; a map made here: adding it to the game. Anyone else keeps their own maps
           to themselves (export / import). -->
      <UiButton
        v-if="mapLibrary.canWrite"
        :variant="mapLibrary.changeCount > 0 ? 'game-amber' : 'secondary'"
        size="sm"
        :leading-icon="mapLibrary.entry ? Save : CloudUpload"
        :title="$t(mapLibrary.entry ? 'publish.title' : 'publish.addTitle')"
        @click="mapLibrary.open()"
      >
        <span class="hidden lg:inline whitespace-nowrap">{{ $t(mapLibrary.entry ? 'publish.button' : 'publish.addButton') }}</span>
        <UiBadge v-if="mapLibrary.changeCount > 0" variant="rose" style-type="solid" size="xs" custom-class="ml-1.5">
          {{ mapLibrary.changeCount }}
        </UiBadge>
      </UiButton>

      <UiButton variant="game-green" size="sm" :leading-icon="Gamepad2" :title="$t('header.playTest')" @click="handleStartGame">
        <span class="hidden md:inline whitespace-nowrap">{{ $t('header.playTest') }}</span>
      </UiButton>

      <div class="h-5 w-px bg-slate-800 mx-0.5 hidden sm:block"></div>

      <!-- The admin: signed in (sign out) or not (sign in); only shown when the server has an admin account -->
      <UiIconButton
        v-if="admin.enabled"
        variant="ghost"
        size="sm"
        :icon="admin.isAdmin ? LogOut : LogIn"
        :title="admin.isAdmin ? `${$t('admin.signOut')} (${admin.login})` : $t('admin.title')"
        :custom-class="admin.isAdmin ? 'text-emerald-300' : ''"
        @click="admin.isAdmin ? admin.signOut() : admin.openSignIn()"
      />
      <UiLanguageSwitcher />
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
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  Home, Grid, Hash, Undo2, Redo2, History, Download, Gamepad2, HelpCircle, Plus, Upload, ImagePlus, Trash2, Save, CloudUpload, Library, LogIn, LogOut, ChevronDown
} from 'lucide-vue-next'
import { UiButton, UiIconButton, UiLanguageSwitcher, UiBadge, UiMenu, type MenuItem } from '../ui'
import { getMapMode } from '../../domain/map'
import { MAP_MODE_INFO } from '../mapModeInfo'
import { useMapStore } from '../../stores/mapStore'
import { useToolStore } from '../../stores/toolStore'
import { useRouteStore } from '../../stores/routeStore'
import { useGameStore } from '../../stores/gameStore'
import { useI18nStore } from '../../stores/i18nStore'
import { sanitizeMapId, saveEditorDraft, registerSessionCustomMap, collectEditorMapState, buildEditorMapPayload } from '../../services/mapManager'
import { useMapLibraryStore } from '../../stores/mapLibraryStore'
import { useAdminStore } from '../../stores/adminStore'
import { imageFileToDataUrl } from '../../utils/imageCropper'

const router = useRouter()
const mapStore = useMapStore()
const toolStore = useToolStore()
const routeStore = useRouteStore()
const gameStore = useGameStore()
const mapLibrary = useMapLibraryStore()
const admin = useAdminStore()
const { t } = useI18nStore()

/** Largest stored size of the map picture (it travels inside the map file) */
const COVER_MAX_WIDTH = 640
const COVER_MAX_HEIGHT = 400
const coverInput = ref<HTMLInputElement | null>(null)

function setCover(dataUrl: string | undefined) {
  mapStore.project.previewImage = dataUrl
  mapStore.project.updatedAt = Date.now()
}

async function onCoverPicked(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (file) setCover(await imageFileToDataUrl(file, COVER_MAX_WIDTH, COVER_MAX_HEIGHT))
}

/** The map as a whole: open another, start one, bring one in, take this one out, its picture in the map list */
const mapMenuItems = computed<MenuItem[]>(() => [
  { id: 'maps', label: t('library.tab'), icon: Library },
  { id: 'new', label: t('header.newMap'), icon: Plus },
  { id: 'import', label: t('common.import'), icon: Upload },
  { id: 'export', label: t('common.export'), icon: Download },
  { id: 'cover', label: t('header.coverPick'), icon: ImagePlus, divider: true },
  ...(mapStore.project.previewImage ? [{ id: 'cover-remove', label: t('header.removeMapCover'), icon: Trash2, danger: true }] : []),
])

function onMapMenu(id: string) {
  if (id === 'maps' || id === 'new' || id === 'import') emit('open-welcome', id, false)
  else if (id === 'export') {
    toolStore.isExportModalOpen = true
    emit('open-export')
  } else if (id === 'cover') coverInput.value?.click()
  else if (id === 'cover-remove') setCover(undefined)
}

const mapMode = computed(() => getMapMode(mapStore.project))
const modeInfo = computed(() => MAP_MODE_INFO[mapMode.value])

const emit = defineEmits<{
  (e: 'open-welcome', mode?: 'maps' | 'new' | 'import', forced?: boolean): void
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

  // 1. Save editor draft so it is 100% updated in localStorage
  const state = collectEditorMapState()
  saveEditorDraft(cleanId, state.project, state.assets, state.characterData, state.towerData, state.waveData, state.gameSettings)

  // 2. Register as session custom map for game (the editor's version, saved into the map file or not)
  registerSessionCustomMap(cleanId, buildEditorMapPayload())

  router.push(`/editor-game/${cleanId}`)
}
</script>
