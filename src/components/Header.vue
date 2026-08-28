<template>
  <header class="h-14 glass-panel border-b border-slate-800/80 px-2 sm:px-4 flex items-center justify-between z-30 relative select-none">
    <!-- Left Section: Logo & Project Info -->
    <div class="flex items-center gap-2 sm:gap-4 shrink-0">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-indigo-400 flex items-center justify-center shadow-glow-brand shrink-0">
          <Layers class="w-4.5 h-4.5 text-white" />
        </div>
        <div>
          <h1 class="font-bold text-xs sm:text-sm text-white tracking-wide flex items-center gap-1.5">
            IsoCraft <span class="text-[9px] sm:text-[10px] uppercase font-semibold px-1.5 py-0.2 sm:py-0.5 rounded bg-brand-500/20 text-brand-400 border border-brand-500/30">TD</span>
          </h1>
        </div>
      </div>

      <div class="h-5 w-px bg-slate-800 hidden sm:block"></div>

      <!-- Project Badge -->
      <div class="hidden sm:flex items-center gap-2 text-xs">
        <span class="font-medium text-slate-200 max-w-[110px] md:max-w-[150px] truncate" :title="mapStore.project.name">
          {{ mapStore.project.name }}
        </span>
        <span class="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700/60 font-mono text-[10px] md:text-[11px]">
          {{ mapStore.project.cols }}×{{ mapStore.project.rows }}
        </span>
      </div>
    </div>

    <!-- Center Section: History, Mode & Grid Controls (Desktop only) -->
    <div class="hidden lg:flex items-center gap-1.5 bg-slate-900/90 p-1 rounded-lg border border-slate-800">
      <!-- Undo / Redo -->
      <button 
        @click="mapStore.undo()" 
        :disabled="!mapStore.canUndo"
        class="p-1.5 rounded hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        title="Bekor qilish (Ctrl+Z)"
      >
        <Undo2 class="w-4 h-4" />
      </button>
      <button 
        @click="mapStore.redo()" 
        :disabled="!mapStore.canRedo"
        class="p-1.5 rounded hover:bg-slate-800 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        title="Qaytarish (Ctrl+Y)"
      >
        <Redo2 class="w-4 h-4" />
      </button>

      <div class="h-4 w-px bg-slate-800 mx-1"></div>

      <!-- Placement Mode Selector -->
      <div class="flex items-center gap-1 text-xs px-1" title="Katakda element bo'lganda joylashtirish tartibi">
        <span class="text-slate-500 text-[11px]">Ustiga qo'yish:</span>
        <select 
          v-model="toolStore.placementMode"
          class="bg-slate-800 border border-slate-700 text-slate-200 rounded px-1.5 py-0.5 text-[11px] focus:outline-none focus:border-brand-500 cursor-pointer"
        >
          <option value="ask">Doim so'rash (Ask)</option>
          <option value="stack">Ustiga qo'yish (Stack)</option>
          <option value="replace">Almashtirish (Replace)</option>
        </select>
      </div>

      <div class="h-4 w-px bg-slate-800 mx-1"></div>

      <!-- Grid Toggle -->
      <button 
        @click="toolStore.showGrid = !toolStore.showGrid"
        :class="toolStore.showGrid ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30' : 'text-slate-400 hover:bg-slate-800'"
        class="flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors"
        title="Izometrik setkani yoqish/o'chirish"
      >
        <Grid class="w-3.5 h-3.5" />
        <span>Setka</span>
      </button>

      <!-- Center & Symmetry Toggle -->
      <button 
        @click="toolStore.showCenterMarker = !toolStore.showCenterMarker; toolStore.showSymmetryAxes = toolStore.showCenterMarker"
        :class="toolStore.showCenterMarker ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'text-slate-400 hover:bg-slate-800'"
        class="flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors"
        title="Xarita markazi va simmetriya o'qlarini yoqish/o'chirish"
      >
        <span>🎯 Markaz</span>
      </button>

      <!-- Coordinates Toggle -->
      <button 
        @click="toolStore.showCoordinates = !toolStore.showCoordinates"
        :class="toolStore.showCoordinates ? 'bg-brand-500/20 text-brand-400 border border-brand-500/30' : 'text-slate-400 hover:bg-slate-800'"
        class="flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors"
        title="Koordinatalarni ko'rsatish"
      >
        <Hash class="w-3.5 h-3.5" />
        <span>Koordinatalar</span>
      </button>

      <!-- Personaj / Character Tour Toggle -->
      <button 
        @click="characterStore.isEnabled = !characterStore.isEnabled"
        :class="characterStore.isEnabled ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-glow-brand' : 'text-slate-400 hover:bg-slate-800'"
        class="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors font-medium"
        title="Personaj sayri (Tour) boshqaruvi"
      >
        <User class="w-3.5 h-3.5 text-amber-400" />
        <span>Personaj</span>
      </button>

      <div class="h-4 w-px bg-slate-800 mx-1"></div>

      <!-- Zoom Controls -->
      <button 
        @click="toolStore.zoomOut()"
        class="p-1.5 rounded hover:bg-slate-800 text-slate-300 transition-colors"
        title="Kichiklashtirish (-)"
      >
        <ZoomOut class="w-4 h-4" />
      </button>
      <span class="text-xs font-mono text-slate-300 px-1 min-w-[45px] text-center">
        {{ Math.round(toolStore.zoom * 100) }}%
      </span>
      <button 
        @click="toolStore.zoomIn()"
        class="p-1.5 rounded hover:bg-slate-800 text-slate-300 transition-colors"
        title="Kattalashtirish (+)"
      >
        <ZoomIn class="w-4 h-4" />
      </button>
      <button 
        @click="toolStore.resetZoom()"
        class="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs transition-colors"
        title="Asl masshtab (100%)"
      >
        <Maximize2 class="w-3.5 h-3.5" />
      </button>
    </div>

    <!-- Right Section: Actions -->
    <div class="flex items-center gap-1.5 sm:gap-2 shrink-0">
      <!-- Maps / Play Catalog Button -->
      <button 
        @click="emit('open-welcome', 'maps')"
        class="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900/90 text-emerald-300 text-xs font-semibold border border-emerald-500/40 transition-all hover:border-emerald-400 active:scale-95 shadow-sm cursor-pointer"
        title="Tayyor xaritalar katalogi va o'yinga kirish"
      >
        <Gamepad2 class="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span class="hidden sm:inline">Xaritalar</span>
      </button>

      <!-- New Project / Launcher Button -->
      <button 
        @click="emit('open-welcome', 'new')"
        class="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all hover:border-slate-600 active:scale-95 cursor-pointer"
        title="Yangi xarita loyihasi yaratish"
      >
        <Plus class="w-3.5 h-3.5 text-brand-400 shrink-0" />
        <span class="hidden md:inline">Yangi Karta</span>
      </button>

      <!-- Import JSON file -->
      <button 
        @click="emit('open-welcome', 'import')"
        class="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all active:scale-95 cursor-pointer"
        title="JSON loyihani yuklash"
      >
        <Upload class="w-3.5 h-3.5 text-cyan-400 shrink-0" />
        <span class="hidden lg:inline">Yuklash</span>
      </button>
      <input 
        ref="fileInputRef" 
        type="file" 
        accept=".json,.isomap.json" 
        class="hidden" 
        @change="handleFileImport" 
      />

      <!-- Toggle Character Control Bar Button -->
      <button 
        @click="characterStore.isEnabled = !characterStore.isEnabled"
        :class="characterStore.isEnabled ? 'bg-amber-600/30 text-amber-300 border-amber-500/50 ring-1 ring-amber-400/40 font-bold' : 'text-slate-400 hover:text-slate-200 border-slate-700 bg-slate-850'"
        class="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-all cursor-pointer"
        title="Chiqish va Harakat Driverini ochish / yopish"
      >
        <Users class="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span>Harakat</span>
      </button>

      <!-- Play Game Mode Button (Prominent on all screens) -->
      <button 
        @click="handleStartPlayMode"
        class="flex items-center gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-all active:scale-95 cursor-pointer"
        title="O'yin rejimiga o'tish (Hozirgi xaritada o'ynab ko'rish)"
      >
        <Gamepad2 class="w-3.5 h-3.5 shrink-0" />
        <span class="font-bold">O'ynash</span>
      </button>

      <!-- Export Button -->
      <button 
        @click="toolStore.isExportModalOpen = true"
        class="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-medium shadow-md shadow-brand-600/30 transition-all active:scale-95 cursor-pointer"
        title="Rasmni yoki JSONni yuklab olish"
      >
        <Download class="w-3.5 h-3.5 shrink-0" />
        <span class="hidden sm:inline">Eksport</span>
      </button>

      <!-- Hotkeys / Help Modal -->
      <button 
        @click="toolStore.isShortcutsModalOpen = true"
        class="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors hidden sm:block"
        title="Klaviatura tugmalari (Yordam)"
      >
        <HelpCircle class="w-4 h-4" />
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { 
  Layers, Plus, Download, Upload, Undo2, Redo2, 
  Grid, Hash, ZoomIn, ZoomOut, Maximize2, HelpCircle, User, Users, Gamepad2 
} from 'lucide-vue-next'
import { useMapStore } from '../stores/mapStore'
import { useToolStore } from '../stores/toolStore'
import { useAssetStore } from '../stores/assetStore'
import { useCharacterStore } from '../stores/characterStore'
import { useTowerStore } from '../stores/towerStore'
import { importProjectFromJson } from '../utils/exportHelpers'
import { requestAppFullscreen } from '../utils/fullscreen'
import { IsoEngine } from '../engine/IsoEngine'

const emit = defineEmits<{
  (e: 'open-welcome', mode?: 'maps' | 'new' | 'import' | 'resume'): void
  (e: 'open-export'): void
}>()

const mapStore = useMapStore()
const toolStore = useToolStore()
const assetStore = useAssetStore()
const characterStore = useCharacterStore()
const towerStore = useTowerStore()

async function handleStartPlayMode() {
  requestAppFullscreen()
  characterStore.startLoadingScreen(mapStore.project.name || 'Xarita')

  // Collect unique required assets used in this map
  const usedAssetIds = new Set<string>()
  for (const layer of mapStore.project.layers) {
    if (layer.tiles) {
      for (const tileList of Object.values(layer.tiles)) {
        const items = Array.isArray(tileList) ? tileList : [tileList]
        for (const item of items) {
          if (item.assetId) usedAssetIds.add(item.assetId)
        }
      }
    }
  }

  const assetsMap = new Map<string, any>()
  for (const a of assetStore.assets) {
    assetsMap.set(a.id, a)
    const cleanId = a.id.replace(/^sprite-/, '')
    assetsMap.set(cleanId, a)
    assetsMap.set(`sprite-${cleanId}`, a)
  }

  const assetsToPreload: any[] = []
  for (const id of usedAssetIds) {
    const found = assetsMap.get(id)
    if (found) {
      assetsToPreload.push(found)
    }
  }

  if (IsoEngine.instance) {
    await IsoEngine.instance.preloadAssetsBatch(assetsToPreload, (loaded, total) => {
      const pct = Math.round((loaded / total) * 90) + 5
      characterStore.setLoadingProgress(pct, `${loaded} / ${total} ta tekstura GPU keshiga yuklanmoqda...`, loaded)
    })
  }

  characterStore.finishLoadingScreen()
  nextTick(() => {
    characterStore.startPlayMode()
  })
}

const fileInputRef = ref<HTMLInputElement | null>(null)

function triggerImport() {
  fileInputRef.value?.click()
}

async function handleFileImport(event: Event) {
  const target = event.target as HTMLInputElement
  if (!target.files || target.files.length === 0) return

  const file = target.files[0]
  try {
    const data = await importProjectFromJson(file)
    mapStore.project = data.project
    mapStore.activeLayerId = data.project.layers[0]?.id || 'layer-ground'
    
    if (data.assets && data.assets.length > 0) {
      assetStore.reconcileImportedAssets(data.assets)
    }

    // Restore character custom routes, spawn points and settings
    const charData = data.characterData || {
      customRoutes: data.project.customRoutes || {},
      spawnPoints: (data.project as any).spawnPoints || [],
      characterConfig: (data.project as any).characterConfig || {},
    }
    if (charData.customRoutes) {
      characterStore.customRoutes = { ...charData.customRoutes }
    }
    if (charData.spawnPoints) {
      (mapStore.project as any).spawnPoints = [...charData.spawnPoints]
    }
    if (charData.characterConfig) {
      const cfg = charData.characterConfig
      if (cfg.formation) characterStore.formation = cfg.formation
      if (cfg.pairDistance !== undefined) characterStore.pairDistance = cfg.pairDistance
      if (cfg.followCamera !== undefined) characterStore.followCamera = cfg.followCamera
      if (cfg.showPathTrail !== undefined) characterStore.showPathTrail = cfg.showPathTrail
    }

    // Restore towers & blueprints
    const twrData = data.towerData || {
      placedTowers: (data.project as any).placedTowers || [],
      towerBlueprints: (data.project as any).towerBlueprints || [],
    }
    ;(mapStore.project as any).placedTowers = twrData.placedTowers || []
    ;(mapStore.project as any).towerBlueprints = twrData.towerBlueprints || []
    towerStore.restoreFromProject()

    // Restore wave configs
    const wvData = data.waveData || {
      waveConfigs: (data.project as any).waveConfigs || [],
      currentWaveIndex: (data.project as any).currentWaveIndex ?? 0,
    }
    if (wvData.waveConfigs && wvData.waveConfigs.length > 0) {
      characterStore.waveConfigs = wvData.waveConfigs.map((w: any) => ({ ...w }))
      characterStore.currentWaveIndex = wvData.currentWaveIndex ?? 0
      ;(mapStore.project as any).waveConfigs = [...characterStore.waveConfigs]
    }

    characterStore.detectDoors()
    characterStore.spawnAtDoor(characterStore.selectedDoorIndex || 0)

    // Reset selection so no asset is pre-selected upon map load
    assetStore.selectedAssetId = null
    toolStore.activeTool = 'select'
    toolStore.selectedElement = null

    mapStore.pushHistory('Loyiha fayldan yuklandi')
  } catch (err: any) {
    alert('Faylni yuklashda xatolik: ' + (err?.message || 'Noma\'lum xato'))
  } finally {
    target.value = ''
  }
}
</script>
