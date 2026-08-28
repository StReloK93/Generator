<template>
  <div 
    v-if="isOpen"
    @mousedown.stop
    @mouseup.stop
    @click.stop
    @pointerdown.stop
    @wheel.stop
    class="fixed inset-0 z-50 bg-black/80 backdrop-blur-lg flex items-center justify-center p-4 select-none animate-in fade-in duration-200"
  >
    <div class="glass-panel border border-brand-500/40 w-full max-w-2xl rounded-3xl p-6 sm:p-7 shadow-2xl flex flex-col gap-5 animate-in zoom-in-95 duration-200 bg-dark-900/95">
      <!-- Welcome Header -->
      <div class="flex items-center justify-between border-b border-slate-800/80 pb-4">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-linear-to-tr from-brand-600 to-indigo-400 flex items-center justify-center text-white shadow-glow-brand">
            <Layers class="w-5 h-5" />
          </div>
          <div>
            <h2 class="font-bold text-base sm:text-lg text-slate-100 flex items-center gap-2">
              IsoCraft Generator
              <span class="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-400 border border-brand-500/30">v2.0</span>
            </h2>
            <p class="text-xs text-slate-400">
              Yangi izometrik loyiha boshlang yoki avval saqlangan loyihani davom ettiring
            </p>
          </div>
        </div>

        <button 
          v-if="canClose"
          @click="isOpen = false"
          class="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          title="Yopish"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Mode Selector Tabs -->
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-950/80 p-1.5 rounded-2xl border border-slate-800 text-xs">
        <button 
          @click="activeMode = 'new'"
          :class="activeMode === 'new' ? 'bg-brand-600 text-white font-bold shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'"
          class="py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-2 text-center"
        >
          <Sparkles class="w-4 h-4 text-brand-300" />
          <span>Yangi Karta</span>
        </button>

        <button 
          @click="activeMode = 'import'"
          :class="activeMode === 'import' ? 'bg-brand-600 text-white font-bold shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'"
          class="py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-2 text-center"
        >
          <Upload class="w-4 h-4 text-emerald-400" />
          <span>Loyihani Yuklash</span>
        </button>

        <button 
          v-if="hasSavedSession"
          @click="activeMode = 'resume'"
          :class="activeMode === 'resume' ? 'bg-brand-600 text-white font-bold shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'"
          class="col-span-2 sm:col-span-1 py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-2 text-center"
        >
          <History class="w-4 h-4 text-amber-400" />
          <span>Davom Ettirish</span>
        </button>
      </div>

      <!-- TAB 1: CREATE NEW MAP -->
      <div v-if="activeMode === 'new'" class="flex flex-col gap-4">
        <!-- Project Name -->
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-semibold text-slate-300">Loyiha Nomi</label>
          <input 
            v-model="newProjectName"
            type="text"
            placeholder="Masalan: Simmetrik Qal'a Kartasi"
            class="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-brand-500 transition-colors placeholder-slate-500 font-medium"
            @keyup.enter="handleCreateNew"
          />
        </div>

        <!-- Presets Selection -->
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-semibold text-slate-300">Xarita O'lchami (Kataklar Soni)</label>
          <div class="grid grid-cols-4 gap-2">
            <button 
              v-for="preset in presets"
              :key="preset.name"
              @click="applyPreset(preset)"
              :class="selectedPreset === preset.name ? 'border-brand-500 bg-brand-950/50 text-brand-300 shadow-glow-brand ring-1 ring-brand-500/50' : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'"
              class="border rounded-2xl p-2.5 flex flex-col items-center justify-center gap-1 transition-all text-center"
            >
              <span class="text-xs font-bold">{{ preset.name }}</span>
              <span class="text-[10px] font-mono opacity-80">{{ preset.cols }}×{{ preset.rows }}</span>
            </button>
          </div>
        </div>

        <!-- Sliders -->
        <div class="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-950/40 border border-slate-800/80">
          <div class="flex flex-col gap-1">
            <div class="flex justify-between items-center text-xs">
              <span class="text-slate-400">Ustunlar (Cols):</span>
              <span class="font-mono text-brand-400 font-bold">{{ cols }} katak</span>
            </div>
            <input 
              v-model.number="cols"
              type="range"
              min="10"
              max="128"
              step="2"
              class="accent-brand-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
              @input="selectedPreset = 'Custom'"
            />
          </div>

          <div class="flex flex-col gap-1">
            <div class="flex justify-between items-center text-xs">
              <span class="text-slate-400">Qatorlar (Rows):</span>
              <span class="font-mono text-brand-400 font-bold">{{ rows }} katak</span>
            </div>
            <input 
              v-model.number="rows"
              type="range"
              min="10"
              max="128"
              step="2"
              class="accent-brand-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
              @input="selectedPreset = 'Custom'"
            />
          </div>
        </div>

        <!-- Submit Button -->
        <button 
          @click="handleCreateNew"
          class="w-full p-3.5 rounded-2xl bg-linear-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-brand-600/30 transition-all active:scale-95 flex items-center justify-center gap-2 mt-1"
        >
          <Sparkles class="w-4 h-4" />
          <span>Yangi Kartani Boshlash ({{ cols }}×{{ rows }})</span>
        </button>
      </div>

      <!-- TAB 2: IMPORT PROJECT JSON -->
      <div v-else-if="activeMode === 'import'" class="flex flex-col gap-4">
        <div 
          @click="triggerFileInput"
          class="border-2 border-dashed border-slate-700/80 hover:border-brand-500/80 rounded-3xl p-8 flex flex-col items-center justify-center gap-3 text-center cursor-pointer transition-all bg-slate-950/40 hover:bg-slate-950/70 group"
        >
          <div class="w-14 h-14 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Upload class="w-7 h-7" />
          </div>
          <div>
            <h3 class="text-sm font-bold text-slate-100">Saqlangan Loyiha Faylini Yuklang</h3>
            <p class="text-xs text-slate-400 mt-1">.json yoki .isomap.json formatdagi loyiha fayli</p>
          </div>
          <button 
            type="button"
            class="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md transition-all mt-1"
          >
            Faylni Tanlash
          </button>
        </div>

        <input 
          ref="fileInputRef" 
          type="file" 
          accept=".json,.isomap.json" 
          class="hidden" 
          @change="handleFileSelected" 
        />
      </div>

      <!-- TAB 3: RESUME SAVED SESSION -->
      <div v-else-if="activeMode === 'resume' && savedSessionData" class="flex flex-col gap-4">
        <div class="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col gap-2.5">
          <div class="flex items-center justify-between">
            <span class="text-xs text-slate-400">Loyiha:</span>
            <strong class="text-xs text-brand-300 font-mono">{{ savedSessionData.project.name }}</strong>
          </div>
          <div class="flex items-center justify-between text-xs">
            <span class="text-slate-400">Xarita o'lchami:</span>
            <span class="text-slate-200 font-mono">{{ savedSessionData.project.cols }}×{{ savedSessionData.project.rows }} katak</span>
          </div>
          <div class="flex items-center justify-between text-xs">
            <span class="text-slate-400">Yuklangan assetlar:</span>
            <span class="text-emerald-400 font-mono font-semibold">{{ savedSessionData.assets?.length || 0 }} ta</span>
          </div>
        </div>

        <button 
          @click="handleResumeSession"
          class="w-full p-3.5 rounded-2xl bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-emerald-600/30 transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <History class="w-4 h-4" />
          <span>Oxirgi Holatni Davom Ettirish</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { Layers, Sparkles, Upload, History, X } from 'lucide-vue-next'
import { useMapStore } from '../stores/mapStore'
import { useAssetStore } from '../stores/assetStore'
import { useToolStore } from '../stores/toolStore'
import { useCharacterStore } from '../stores/characterStore'
import { useTowerStore } from '../stores/towerStore'
import { importProjectFromJson } from '../utils/exportHelpers'

const mapStore = useMapStore()
const assetStore = useAssetStore()
const toolStore = useToolStore()
const characterStore = useCharacterStore()
const towerStore = useTowerStore()

const isOpen = ref(false)
const activeMode = ref<'new' | 'import' | 'resume'>('new')
const newProjectName = ref('Simmetrik Xarita #1')
const cols = ref(60)
const rows = ref(60)
const selectedPreset = ref("O'rtacha (60x60)")
const fileInputRef = ref<HTMLInputElement | null>(null)

const savedSessionData = ref<{ project: any; assets: any[] } | null>(null)

const hasSavedSession = computed(() => !!savedSessionData.value)
const canClose = computed(() => mapStore.project.layers.length > 0 && mapStore.totalTilesCount > 0)

interface Preset {
  name: string
  cols: number
  rows: number
}

const presets: Preset[] = [
  { name: 'Kichik', cols: 30, rows: 30 },
  { name: "O'rtacha", cols: 60, rows: 60 },
  { name: 'Katta', cols: 90, rows: 90 },
  { name: 'Ulkan', cols: 120, rows: 120 },
]

onMounted(() => {
  // Check localStorage for auto-saved project
  try {
    const raw = localStorage.getItem('isocraft_autosave')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed.project && parsed.project.cols) {
        savedSessionData.value = parsed
        activeMode.value = 'resume'
      }
    }
  } catch (e) {
    console.warn('LocalStorage read error:', e)
  }

  // Open Welcome Launcher on initial startup if map is empty
  if (mapStore.totalTilesCount === 0 && assetStore.assets.length === 0) {
    isOpen.value = true
  }
})

function applyPreset(preset: Preset) {
  selectedPreset.value = preset.name
  cols.value = preset.cols
  rows.value = preset.rows
}

function handleCreateNew() {
  mapStore.createNewProject({
    name: newProjectName.value || 'Yangi Izometrik Karta',
    cols: cols.value,
    rows: rows.value,
    tileWidth: 128,
    tileHeight: 64,
  })
  assetStore.selectedAssetId = null
  toolStore.activeTool = 'select'
  toolStore.selectedElement = null
  isOpen.value = false
}

function triggerFileInput() {
  fileInputRef.value?.click()
}

async function handleFileSelected(event: Event) {
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

    assetStore.selectedAssetId = null
    toolStore.activeTool = 'select'
    toolStore.selectedElement = null

    mapStore.pushHistory('Loyiha import qilindi')
    isOpen.value = false
  } catch (err: any) {
    alert('Faylni yuklashda xatolik: ' + (err?.message || 'Noto‘g‘ri format'))
  } finally {
    target.value = ''
  }
}

function handleResumeSession() {
  if (!savedSessionData.value) return
  mapStore.project = savedSessionData.value.project
  mapStore.activeLayerId = savedSessionData.value.project.layers[0]?.id || 'layer-ground'

  if (savedSessionData.value.assets && savedSessionData.value.assets.length > 0) {
    assetStore.reconcileImportedAssets(savedSessionData.value.assets)
  }

  towerStore.restoreFromProject()
  characterStore.detectDoors()
  characterStore.spawnAtDoor(characterStore.selectedDoorIndex || 0)

  assetStore.selectedAssetId = null
  toolStore.activeTool = 'select'
  toolStore.selectedElement = null

  mapStore.pushHistory('Oxirgi loyiha tiklandi')
  isOpen.value = false
}

defineExpose({
  open: () => {
    isOpen.value = true
  }
})
</script>
