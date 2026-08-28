<template>
  <div 
    v-if="isOpen"
    @mousedown.stop
    @mouseup.stop
    @click.stop
    @pointerdown.stop
    @wheel.stop
    class="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 select-none animate-in fade-in duration-200"
  >
    <div class="glass-panel border border-brand-500/40 w-full max-w-3xl max-h-[92vh] rounded-3xl p-4 sm:p-6 md:p-7 shadow-2xl flex flex-col gap-4 sm:gap-5 animate-in zoom-in-95 duration-200 bg-dark-900/95 overflow-hidden">
      <!-- Welcome Header -->
      <div class="flex items-center justify-between border-b border-slate-800/80 pb-3.5 shrink-0">
        <div class="flex items-center gap-2.5 sm:gap-3.5">
          <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 via-indigo-500 to-teal-400 flex items-center justify-center text-white shadow-glow-brand shrink-0">
            <Layers class="w-5 h-5" />
          </div>
          <div>
            <h2 class="font-bold text-sm sm:text-base md:text-lg text-slate-100 flex items-center gap-2">
              <span>IsoCraft Generator & TD</span>
              <span class="text-[9px] sm:text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">v2.1</span>
            </h2>
            <p class="text-[11px] sm:text-xs text-slate-400 line-clamp-1">
              Tayyor xaritani tanlab o'ynang, yangi xarita yarating yoki loyihani yuklang
            </p>
          </div>
        </div>

        <button 
          v-if="canClose"
          @click="isOpen = false"
          class="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors shrink-0 cursor-pointer"
          title="Yopish"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Mode Selector Tabs (Mobile responsive 2x2 or 4-cols) -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 bg-slate-950/90 p-1.5 rounded-2xl border border-slate-800 text-xs shrink-0">
        <!-- 1. Play Maps Tab -->
        <button 
          @click="activeMode = 'maps'"
          :class="activeMode === 'maps' 
            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold shadow-lg shadow-emerald-600/30 ring-1 ring-emerald-400/40' 
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'"
          class="py-2.5 px-2.5 sm:px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 sm:gap-2 text-center cursor-pointer active:scale-95"
        >
          <Gamepad2 class="w-4 h-4 text-emerald-300 shrink-0" />
          <span class="truncate">O'yinga Kirish</span>
          <span v-if="availableMaps.length > 0" class="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/30 text-emerald-200 font-mono font-bold">{{ availableMaps.length }}</span>
        </button>

        <!-- 2. Create New Map Tab -->
        <button 
          @click="activeMode = 'new'"
          :class="activeMode === 'new' 
            ? 'bg-brand-600 text-white font-bold shadow-md shadow-brand-600/30 ring-1 ring-brand-400/40' 
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'"
          class="py-2.5 px-2.5 sm:px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 sm:gap-2 text-center cursor-pointer active:scale-95"
        >
          <Sparkles class="w-4 h-4 text-brand-300 shrink-0" />
          <span class="truncate">Yangi Karta</span>
        </button>

        <!-- 3. Import JSON Project Tab -->
        <button 
          @click="activeMode = 'import'"
          :class="activeMode === 'import' 
            ? 'bg-brand-600 text-white font-bold shadow-md shadow-brand-600/30 ring-1 ring-brand-400/40' 
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'"
          class="py-2.5 px-2.5 sm:px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 sm:gap-2 text-center cursor-pointer active:scale-95"
        >
          <Upload class="w-4 h-4 text-cyan-400 shrink-0" />
          <span class="truncate">Loyihani Yuklash</span>
        </button>

        <!-- 4. Resume Session Tab (or fallback info) -->
        <button 
          v-if="hasSavedSession"
          @click="activeMode = 'resume'"
          :class="activeMode === 'resume' 
            ? 'bg-amber-600 text-white font-bold shadow-md shadow-amber-600/30 ring-1 ring-amber-400/40' 
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'"
          class="py-2.5 px-2.5 sm:px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 sm:gap-2 text-center cursor-pointer active:scale-95"
        >
          <History class="w-4 h-4 text-amber-300 shrink-0" />
          <span class="truncate">Davom Ettirish</span>
        </button>

        <!-- If no saved session, fill 4th slot nicely -->
        <div v-else class="hidden sm:flex items-center justify-center text-[10px] text-slate-500 font-medium px-2 py-1 text-center">
          <span>🎮 Izometrik TD Dvijogi</span>
        </div>
      </div>

      <!-- SCROLLABLE BODY AREA -->
      <div class="flex-1 overflow-y-auto pr-0.5 sm:pr-1 min-h-0 flex flex-col gap-4">
        
        <!-- ========================================== -->
        <!-- TAB 1: PLAY MAPS CATALOG (src/maps/*.json) -->
        <!-- ========================================== -->
        <div v-if="activeMode === 'maps'" class="flex flex-col gap-3">
          <div class="flex items-center justify-between px-1">
            <div class="flex items-center gap-2">
              <Gamepad2 class="w-4 h-4 text-emerald-400" />
              <span class="text-xs font-bold text-slate-200">Xaritani Tanlang va O'ynang</span>
            </div>
            <span class="text-[11px] text-slate-400">{{ availableMaps.length }} ta tayyor xarita</span>
          </div>

          <!-- Maps Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div 
              v-for="map in availableMaps" 
              :key="map.filename"
              class="group relative rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950/95 border border-slate-800 hover:border-emerald-500/60 p-4 transition-all duration-200 hover:shadow-xl hover:shadow-emerald-500/10 flex flex-col justify-between gap-3.5"
            >
              <!-- Card Header -->
              <div class="flex flex-col gap-2.5">
                <div class="flex items-start justify-between gap-2">
                  <div class="flex items-center gap-2.5 min-w-0">
                    <div class="w-9 h-9 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shrink-0 shadow-glow-emerald group-hover:scale-105 transition-transform">
                      <Gamepad2 class="w-5 h-5" />
                    </div>
                    <div class="min-w-0">
                      <h3 class="text-sm font-bold text-slate-100 group-hover:text-emerald-300 transition-colors truncate" :title="map.name">
                        {{ map.name }}
                      </h3>
                      <p class="text-[10px] text-slate-400 font-mono truncate">{{ map.filename }}</p>
                    </div>
                  </div>
                  <span class="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold shrink-0">
                    {{ map.tag }}
                  </span>
                </div>

                <p class="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {{ map.description }}
                </p>

                <!-- Stats Chips -->
                <div class="grid grid-cols-3 gap-1.5 text-[11px] font-medium">
                  <div class="px-2 py-1.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col items-center justify-center text-center">
                    <span class="text-[9px] text-slate-500 uppercase font-bold">O'lcham</span>
                    <span class="text-slate-200 font-mono font-bold">{{ map.cols }}×{{ map.rows }}</span>
                  </div>
                  <div class="px-2 py-1.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col items-center justify-center text-center">
                    <span class="text-[9px] text-slate-500 uppercase font-bold">Darvoza</span>
                    <span class="text-amber-400 font-mono font-bold">{{ map.doorsCount }} ta</span>
                  </div>
                  <div class="px-2 py-1.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col items-center justify-center text-center">
                    <span class="text-[9px] text-slate-500 uppercase font-bold">To'lqinlar</span>
                    <span class="text-cyan-400 font-mono font-bold">{{ map.wavesCount }} ta</span>
                  </div>
                </div>
              </div>

              <!-- Action Buttons -->
              <div class="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/60">
                <button 
                  @click="applyMapProject(map.rawData, true)"
                  class="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-600/25 transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Ushbu xaritani yuklab to'g'ridan-to'g'ri o'yinni boshlash"
                >
                  <Gamepad2 class="w-3.5 h-3.5" />
                  <span>O'ynash</span>
                </button>

                <button 
                  @click="applyMapProject(map.rawData, false)"
                  class="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 hover:border-slate-600 transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                  title="Ushbu xaritani redaktorda tahrirlash uchun ochish"
                >
                  <span>Tahrirlash</span>
                </button>
              </div>
            </div>
          </div>

          <div v-if="availableMaps.length === 0" class="p-8 text-center text-xs text-slate-400 bg-slate-950/40 rounded-2xl border border-slate-800">
            Hozircha src/maps papkasida xaritalar topilmadi.
          </div>
        </div>

        <!-- ========================================== -->
        <!-- TAB 2: CREATE NEW MAP                      -->
        <!-- ========================================== -->
        <div v-else-if="activeMode === 'new'" class="flex flex-col gap-4">
          <!-- Project Name -->
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold text-slate-300">Loyiha Nomi</label>
            <input 
              v-model="newProjectName"
              type="text"
              placeholder="Masalan: Yangi Izometrik Karta"
              class="w-full bg-slate-950/80 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-brand-500 transition-colors placeholder-slate-500 font-medium"
              @keyup.enter="handleCreateNew"
            />
          </div>

          <!-- Presets Selection -->
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold text-slate-300">Xarita O'lchami (Kataklar Soni)</label>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button 
                v-for="preset in presets"
                :key="preset.name"
                @click="applyPreset(preset)"
                :class="selectedPreset === preset.name ? 'border-brand-500 bg-brand-950/50 text-brand-300 shadow-glow-brand ring-1 ring-brand-500/50' : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'"
                class="border rounded-2xl p-2.5 flex flex-col items-center justify-center gap-1 transition-all text-center cursor-pointer"
              >
                <span class="text-xs font-bold">{{ preset.name }}</span>
                <span class="text-[10px] font-mono opacity-80">{{ preset.cols }}×{{ preset.rows }}</span>
              </button>
            </div>
          </div>

          <!-- Sliders -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-950/40 border border-slate-800/80">
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
            class="w-full p-3.5 rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-brand-600/30 transition-all active:scale-95 flex items-center justify-center gap-2 mt-1 cursor-pointer"
          >
            <Sparkles class="w-4 h-4" />
            <span>Yangi Kartani Boshlash ({{ cols }}×{{ rows }})</span>
          </button>
        </div>

        <!-- ========================================== -->
        <!-- TAB 3: IMPORT PROJECT JSON                 -->
        <!-- ========================================== -->
        <div v-else-if="activeMode === 'import'" class="flex flex-col gap-4">
          <div 
            @click="triggerFileInput"
            class="border-2 border-dashed border-slate-700/80 hover:border-brand-500/80 rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center gap-3 text-center cursor-pointer transition-all bg-slate-950/40 hover:bg-slate-950/70 group"
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

        <!-- ========================================== -->
        <!-- TAB 4: RESUME SAVED SESSION                -->
        <!-- ========================================== -->
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
            class="w-full p-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-emerald-600/30 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <History class="w-4 h-4" />
            <span>Oxirgi Holatni Davom Ettirish</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, nextTick } from 'vue'
import { Layers, Sparkles, Upload, History, X, Gamepad2 } from 'lucide-vue-next'
import { useMapStore } from '../stores/mapStore'
import { useAssetStore } from '../stores/assetStore'
import { useToolStore } from '../stores/toolStore'
import { useCharacterStore } from '../stores/characterStore'
import { useTowerStore } from '../stores/towerStore'
import { importProjectFromJson } from '../utils/exportHelpers'
import { requestAppFullscreen } from '../utils/fullscreen'
import { IsoEngine } from '../engine/IsoEngine'

const mapStore = useMapStore()
const assetStore = useAssetStore()
const toolStore = useToolStore()
const characterStore = useCharacterStore()
const towerStore = useTowerStore()

const isOpen = ref(false)
const activeMode = ref<'maps' | 'new' | 'import' | 'resume'>('maps')
const newProjectName = ref('Simmetrik Xarita #1')
const cols = ref(60)
const rows = ref(60)
const selectedPreset = ref("O'rtacha")
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

// Dynamically discover all maps placed in src/maps/*.json
const availableMaps = computed(() => {
  const mapModules = import.meta.glob<any>('../maps/*.json', { eager: true })
  const result: any[] = []

  for (const [path, mod] of Object.entries(mapModules)) {
    const raw = mod.default || mod
    const proj = raw.project || raw
    if (!proj || !proj.cols) continue

    const filename = path.split('/').pop() || ''
    const baseName = filename.replace(/\.json$/i, '')

    let totalTiles = 0
    if (proj.layers && Array.isArray(proj.layers)) {
      for (const l of proj.layers) {
        if (l.tiles) {
          for (const items of Object.values(l.tiles)) {
            totalTiles += Array.isArray(items) ? items.length : 1
          }
        }
      }
    }

    const waves = raw.waveData?.waveConfigs || proj.waveConfigs || []
    const placedTowers = raw.towerData?.placedTowers || proj.placedTowers || []
    const spawnPoints = raw.characterData?.spawnPoints || proj.spawnPoints || []
    const doorsCount = spawnPoints.length || 4

    let displayName = proj.name || baseName
    if (baseName.toLowerCase() === 'burbenog') {
      displayName = 'Burbenog TD'
    }

    result.push({
      id: proj.id || baseName,
      filename,
      name: displayName,
      cols: proj.cols,
      rows: proj.rows,
      layersCount: proj.layers?.length || 1,
      wavesCount: waves.length,
      towersCount: placedTowers.length,
      doorsCount,
      tilesCount: totalTiles,
      rawData: raw,
      tag: waves.length > 0 ? 'Tower Defense' : 'Izometrik Xarita',
      description: baseName.toLowerCase() === 'burbenog' 
        ? "4 ta burchak darvozalari, simmetrik himoya yo'llari va to'lqinli personajlar bilan jihozlangan rasmiy TD xaritasi" 
        : `${proj.cols}×${proj.rows} o'lchamli tayyor izometrik xarita`
    })
  }

  return result
})

onMounted(() => {
  // Check localStorage for auto-saved project
  try {
    const raw = localStorage.getItem('isocraft_autosave')
    if (raw) {
      const parsed = JSON.parse(raw)
      if (parsed.project && parsed.project.cols) {
        savedSessionData.value = parsed
      }
    }
  } catch (e) {
    console.warn('LocalStorage read error:', e)
  }

  // Open Welcome Launcher on initial startup if map is empty
  if (mapStore.totalTilesCount === 0 && assetStore.assets.length === 0) {
    isOpen.value = true
    if (availableMaps.value.length > 0) {
      activeMode.value = 'maps'
    } else {
      activeMode.value = 'new'
    }
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

async function applyMapProject(rawData: any, isPlayMode = true) {
  try {
    const project = rawData.project || rawData
    if (!project || !project.cols || !project.rows) {
      throw new Error("Noto'g'ri xarita formati")
    }

    if (isPlayMode) {
      requestAppFullscreen()
      characterStore.startLoadingScreen(project.name || 'Burbenog TD')
    }

    mapStore.project = JSON.parse(JSON.stringify(project))
    mapStore.activeLayerId = project.layers[0]?.id || 'layer-ground'

    if (rawData.assets && rawData.assets.length > 0) {
      assetStore.reconcileImportedAssets(rawData.assets)
    }

    // Restore character custom routes, spawn points and settings
    const charData = rawData.characterData || {
      customRoutes: project.customRoutes || {},
      spawnPoints: (project as any).spawnPoints || [],
      characterConfig: (project as any).characterConfig || {},
    }
    if (charData.customRoutes) {
      characterStore.customRoutes = JSON.parse(JSON.stringify(charData.customRoutes))
    } else {
      characterStore.customRoutes = {}
    }
    if (charData.spawnPoints) {
      (mapStore.project as any).spawnPoints = JSON.parse(JSON.stringify(charData.spawnPoints))
    }
    if (charData.characterConfig) {
      const cfg = charData.characterConfig
      if (cfg.formation) characterStore.formation = cfg.formation
      if (cfg.pairDistance !== undefined) characterStore.pairDistance = cfg.pairDistance
      if (cfg.followCamera !== undefined) characterStore.followCamera = cfg.followCamera
      if (cfg.showPathTrail !== undefined) characterStore.showPathTrail = cfg.showPathTrail
    }

    // Restore towers & blueprints
    const twrData = rawData.towerData || {
      placedTowers: (project as any).placedTowers || [],
      towerBlueprints: (project as any).towerBlueprints || [],
    }
    ;(mapStore.project as any).placedTowers = JSON.parse(JSON.stringify(twrData.placedTowers || []))
    ;(mapStore.project as any).towerBlueprints = JSON.parse(JSON.stringify(twrData.towerBlueprints || []))
    towerStore.restoreFromProject()

    // Restore wave configs
    const wvData = rawData.waveData || {
      waveConfigs: (project as any).waveConfigs || [],
      currentWaveIndex: (project as any).currentWaveIndex ?? 0,
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

    mapStore.pushHistory(`Xarita yuklandi: ${project.name || 'Burbenog'}`)
    isOpen.value = false

    if (isPlayMode) {
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

      // Collect assets to preload
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
  } catch (err: any) {
    console.error('Error applying map:', err)
    characterStore.finishLoadingScreen()
    alert("Xaritani ochishda xatolik: " + (err?.message || 'Noma\'lum xatolik'))
  }
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
    applyMapProject(data, false)
  } catch (err: any) {
    alert('Faylni yuklashda xatolik: ' + (err?.message || 'Noto‘g‘ri format'))
  } finally {
    target.value = ''
  }
}

function handleResumeSession() {
  if (!savedSessionData.value) return
  applyMapProject(savedSessionData.value, false)
}

defineExpose({
  open: (mode: 'maps' | 'new' | 'import' | 'resume' = 'maps') => {
    activeMode.value = mode
    isOpen.value = true
  }
})
</script>
