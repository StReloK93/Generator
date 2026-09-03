<template>
  <div 
    v-if="isOpen"
    @mousedown.stop
    @mouseup.stop
    @click.stop
    @pointerdown.stop
    @wheel.stop
    class="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-5 select-none animate-in fade-in duration-200 pt-safe pb-safe"
  >
    <div class="glass-panel border border-brand-500/50 w-full max-w-2xl max-h-[90dvh] rounded-3xl p-4 sm:p-6 md:p-7 shadow-2xl flex flex-col gap-4 sm:gap-5 animate-in zoom-in-95 duration-200 bg-slate-950/98 overflow-hidden">
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-slate-800/80 pb-3 sm:pb-4 shrink-0">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-brand-600 via-indigo-500 to-teal-400 flex items-center justify-center text-white shadow-glow-brand shrink-0 text-xl">
            🗺️
          </div>
          <div>
            <h2 class="font-black text-base sm:text-lg md:text-xl text-slate-100 flex items-center gap-2">
              <span>Xarita Tahrirlovchisi</span>
            </h2>
            <p class="text-xs text-slate-400">
              Davom etish uchun yangi xarita yarating, fayldan yuklang yoki yaqinda ishlangan kartani oching
            </p>
          </div>
        </div>

        <!-- Close Button (Only if a map is already loaded and active) -->
        <button 
          v-if="canClose"
          @click="isOpen = false"
          class="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors shrink-0 cursor-pointer"
          title="Yopish"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Mode Selector Tabs -->
      <div class="grid gap-1.5 sm:gap-2 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 text-xs sm:text-sm shrink-0"
        :class="recentProjects.length > 0 ? 'grid-cols-3' : 'grid-cols-2'"
      >
        <!-- 1. Yangi Karta -->
        <button 
          @click="activeMode = 'new'"
          :class="activeMode === 'new' 
            ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white font-bold shadow-lg shadow-brand-600/30 ring-1 ring-brand-400/40' 
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'"
          class="py-2.5 sm:py-3 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 text-center cursor-pointer active:scale-95"
        >
          <Sparkles class="w-4 h-4 text-amber-300 shrink-0" />
          <span class="truncate font-bold">✨ Yangi Karta</span>
        </button>

        <!-- 2. Fayldan Yuklash -->
        <button 
          @click="activeMode = 'import'"
          :class="activeMode === 'import' 
            ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-bold shadow-lg shadow-teal-600/30 ring-1 ring-teal-400/40' 
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'"
          class="py-2.5 sm:py-3 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 text-center cursor-pointer active:scale-95"
        >
          <Upload class="w-4 h-4 text-teal-300 shrink-0" />
          <span class="truncate font-bold">📤 Fayldan Yuklash</span>
        </button>

        <!-- 3. Yaqinda Ishlangan Kartalar (If available) -->
        <button 
          v-if="recentProjects.length > 0"
          @click="activeMode = 'recents'"
          :class="activeMode === 'recents' 
            ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold shadow-lg shadow-amber-600/30 ring-1 ring-amber-400/40' 
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'"
          class="py-2.5 sm:py-3 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 text-center cursor-pointer active:scale-95"
        >
          <History class="w-4 h-4 text-amber-300 shrink-0" />
          <span class="truncate font-bold">🕒 Yaqinda ({{ recentProjects.length }})</span>
        </button>
      </div>

      <!-- SCROLLABLE BODY -->
      <div class="flex-1 overflow-y-auto pr-0.5 sm:pr-1 min-h-0 flex flex-col gap-4">
        
        <!-- ========================================== -->
        <!-- TAB 1: CREATE NEW MAP                      -->
        <!-- ========================================== -->
        <div v-if="activeMode === 'new'" class="flex flex-col gap-4">
          <!-- Project Name Input -->
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold text-slate-300">Xarita Nomi (Majburiy)</label>
            <input 
              v-model="newProjectName"
              type="text"
              placeholder="Masalan: Qal'a Mudofaasi #1"
              class="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-brand-500 transition-colors placeholder-slate-500 font-medium"
              @keyup.enter="handleCreateNew"
            />
          </div>

          <!-- Presets Selection -->
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold text-slate-300">O'lcham Shablonlari</label>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button 
                v-for="preset in presets" 
                :key="preset.name"
                @click="applyPreset(preset)"
                :class="selectedPreset === preset.name ? 'border-brand-500 bg-brand-950/70 text-brand-300 ring-2 ring-brand-500/50 shadow-md' : 'border-slate-800 bg-slate-900/70 text-slate-400 hover:border-slate-700 hover:text-slate-200'"
                class="border rounded-2xl p-2.5 flex flex-col items-center justify-center gap-1 transition-all text-center cursor-pointer"
              >
                <span class="text-xs font-bold">{{ preset.name }}</span>
                <span class="text-[11px] font-mono opacity-80">{{ preset.cols }}×{{ preset.rows }}</span>
              </button>
            </div>
          </div>

          <!-- Custom Sliders -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
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
            class="w-full p-3.5 rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-sm font-bold shadow-lg shadow-brand-600/30 transition-all active:scale-95 flex items-center justify-center gap-2 mt-1 cursor-pointer"
          >
            <Sparkles class="w-4 h-4 text-amber-300" />
            <span>Redaktorga Kirish ({{ cols }}×{{ rows }})</span>
          </button>
        </div>

        <!-- ========================================== -->
        <!-- TAB 2: IMPORT PROJECT JSON                 -->
        <!-- ========================================== -->
        <div v-else-if="activeMode === 'import'" class="flex flex-col gap-4">
          <div 
            @click="triggerFileInput"
            class="border-2 border-dashed border-slate-700/80 hover:border-teal-500/80 rounded-3xl p-8 sm:p-10 flex flex-col items-center justify-center gap-3.5 text-center cursor-pointer transition-all bg-slate-900/40 hover:bg-slate-900/80 group"
          >
            <div class="w-16 h-16 rounded-2xl bg-teal-950/60 border border-teal-500/40 text-teal-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
              <Upload class="w-8 h-8" />
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-100">Saqlangan Xarita Faylini Tanlang</h3>
              <p class="text-xs text-slate-400 mt-1">.json yoki .isomap.json formatdagi xarita loyihasi</p>
            </div>
            <button 
              type="button"
              class="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md transition-all mt-2 cursor-pointer"
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
        <!-- TAB 3: RECENT PROJECTS LIST (LOCALSTORAGE) -->
        <!-- ========================================== -->
        <div v-else-if="activeMode === 'recents'" class="flex flex-col gap-3">
          <div class="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>Siz oxirgi ishlagan xaritalar:</span>
            <span class="font-mono text-amber-400">{{ recentProjects.length }} ta saqlangan</span>
          </div>

          <div class="flex flex-col gap-2">
            <div 
              v-for="rec in recentProjects"
              :key="rec.id"
              class="p-3 sm:p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/50 flex items-center justify-between gap-3 transition-all group"
            >
              <div class="flex items-center gap-3 min-w-0">
                <div class="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold text-base shrink-0">
                  🗺️
                </div>
                <div class="min-w-0">
                  <h4 class="font-bold text-sm text-slate-100 group-hover:text-amber-300 transition-colors truncate">
                    {{ rec.name }}
                  </h4>
                  <div class="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5">
                    <span>{{ rec.cols }}×{{ rec.rows }} katak</span>
                    <span>•</span>
                    <span>📦 {{ rec.tilesCount }} element</span>
                    <span>•</span>
                    <span class="text-amber-400/90">{{ formatTimeAgo(rec.updatedAt) }}</span>
                  </div>
                </div>
              </div>

              <div class="flex items-center gap-1.5 shrink-0">
                <!-- Open Button -->
                <button 
                  @click="openRecentProject(rec)"
                  class="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  Ochish
                </button>

                <!-- Delete Button -->
                <button 
                  @click="removeRecent(rec.id)"
                  class="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-900/60 text-slate-400 hover:text-rose-200 transition-colors cursor-pointer"
                  title="Tarixdan o'chirish"
                >
                  <Trash2 class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Sparkles, Upload, X, History, Trash2 } from 'lucide-vue-next'
import { useMapStore } from '../stores/mapStore'
import { useAssetStore } from '../stores/assetStore'
import { useToolStore } from '../stores/toolStore'
import { useCharacterStore } from '../stores/characterStore'
import { useTowerStore } from '../stores/towerStore'
import { importProjectFromJson } from '../utils/exportHelpers'
import { 
  getRecentProjects, 
  saveRecentProject, 
  deleteRecentProject, 
  formatTimeAgo, 
  RecentProjectItem 
} from '../services/projectStorage'

const router = useRouter()
const route = useRoute()
const mapStore = useMapStore()
const assetStore = useAssetStore()
const toolStore = useToolStore()
const characterStore = useCharacterStore()
const towerStore = useTowerStore()

const isOpen = ref(false)
const isForcedMode = ref(false)
const activeMode = ref<'new' | 'import' | 'recents'>('new')
const newProjectName = ref('Mening Yangi Kartam')
const cols = ref(60)
const rows = ref(60)
const selectedPreset = ref("O'rtacha")
const fileInputRef = ref<HTMLInputElement | null>(null)
const recentProjects = ref<RecentProjectItem[]>([])

function reloadRecents() {
  recentProjects.value = getRecentProjects()
}

onMounted(() => {
  reloadRecents()
})

const canClose = computed(() => {
  if (isForcedMode.value) return false
  return !!mapStore.project?.cols && mapStore.project?.layers?.length > 0
})

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

function applyPreset(preset: Preset) {
  selectedPreset.value = preset.name
  cols.value = preset.cols
  rows.value = preset.rows
}

function handleCreateNew() {
  characterStore.exitPlayMode()
  characterStore.isPlaying = false
  characterStore.isGameMode = false
  characterStore.gameState = 'ready'
  towerStore.clearCombatEffects()

  const name = newProjectName.value.trim() || 'Yangi Izometrik Karta'
  mapStore.createNewProject({
    name,
    cols: cols.value,
    rows: rows.value,
    tileWidth: 128,
    tileHeight: 64,
  })

  // Save to recents with timestamp and user's chosen name
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
    { waveConfigs: characterStore.waveConfigs, currentWaveIndex: characterStore.currentWaveIndex },
    { blueprints: towerStore.blueprints, placedTowers: towerStore.placedTowers },
    mapStore.project.gameSettings
  )

  assetStore.selectedAssetId = null
  toolStore.activeTool = 'select'
  toolStore.selectedElement = null
  isForcedMode.value = false
  isOpen.value = false

  if (route.name !== 'editor') {
    router.push('/editor')
  }
}

async function applyMapProject(rawData: any) {
  try {
    const data = rawData.payload || rawData
    const project = data.project || data
    if (!project || !project.cols || !project.rows) {
      throw new Error("Noto'g'ri xarita formati")
    }

    characterStore.exitPlayMode()
    characterStore.isPlaying = false
    characterStore.isGameMode = false
    characterStore.gameState = 'ready'
    towerStore.clearCombatEffects()

    const clonedProject = JSON.parse(JSON.stringify(project))
    if (!clonedProject.id) {
      clonedProject.id = `proj-${Date.now()}`
    }
    mapStore.project = clonedProject
    mapStore.activeLayerId = project.layers[0]?.id || 'layer-ground'

    if (data.assets && data.assets.length > 0) {
      assetStore.reconcileImportedAssets(data.assets)
    }

    // Restore character custom routes and settings
    if (data.characterData || (project as any).customRoutes || (project as any).characterConfig) {
      const cfg = data.characterData || {}
      if (cfg.customRoutes || (project as any).customRoutes) {
        characterStore.customRoutes = JSON.parse(JSON.stringify(cfg.customRoutes || (project as any).customRoutes || {}))
        ;(mapStore.project as any).customRoutes = JSON.parse(JSON.stringify(characterStore.customRoutes))
      }
      if (cfg.speed !== undefined) characterStore.speed = cfg.speed
      if (cfg.formation !== undefined) characterStore.formation = cfg.formation
      if (cfg.pairDistance !== undefined) characterStore.pairDistance = cfg.pairDistance
      if (cfg.followCamera !== undefined) characterStore.followCamera = cfg.followCamera
      if (cfg.showPathTrail !== undefined) characterStore.showPathTrail = cfg.showPathTrail
      if (cfg.autoLoop !== undefined) characterStore.autoLoop = cfg.autoLoop
      if (cfg.selectedDoorIndex !== undefined) characterStore.selectedDoorIndex = cfg.selectedDoorIndex
    }

    // Restore towers & blueprints
    const twrData = data.towerData || {
      placedTowers: (project as any).placedTowers || [],
      towerBlueprints: (project as any).towerBlueprints || [],
    }
    ;(mapStore.project as any).placedTowers = twrData.placedTowers || []
    ;(mapStore.project as any).towerBlueprints = twrData.towerBlueprints || []
    towerStore.restoreFromProject()

    // Restore wave configs
    const wvData = data.waveData || {
      waveConfigs: (project as any).waveConfigs || [],
      currentWaveIndex: (project as any).currentWaveIndex ?? 0,
    }
    if (wvData.waveConfigs && wvData.waveConfigs.length > 0) {
      characterStore.waveConfigs = wvData.waveConfigs.map((w: any) => ({ ...w }))
      characterStore.currentWaveIndex = wvData.currentWaveIndex ?? 0
      ;(mapStore.project as any).waveConfigs = [...characterStore.waveConfigs]
    }

    // Restore Game Settings (Starting Gold, Starting Lives, Wave Prep Time)
    const gSettings = clonedProject.gameSettings || data.gameSettings || (data.characterData && data.characterData.gameSettings) || {
      startingGold: 150,
      startingLives: 20,
      wavePrepTime: 10,
    }
    mapStore.project.gameSettings = {
      startingGold: Number(gSettings.startingGold) || 150,
      startingLives: Number(gSettings.startingLives) || 20,
      wavePrepTime: Number(gSettings.wavePrepTime) || 10,
    }
    characterStore.restoreGameSettingsFromProject()

    characterStore.detectDoors()
    characterStore.spawnAtDoor(characterStore.selectedDoorIndex || 0)

    assetStore.selectedAssetId = null
    toolStore.activeTool = 'select'
    toolStore.selectedElement = null

    // Save full identical payload to recents
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
      wvData,
      twrData,
      mapStore.project.gameSettings
    )

    mapStore.pushHistory(`Xarita yuklandi: ${project.name || 'Loyiha'}`)
    isForcedMode.value = false
    isOpen.value = false

    if (route.name !== 'editor') {
      router.push('/editor')
    }
  } catch (err: any) {
    console.error('Error applying map:', err)
    alert("Xaritani ochishda xatolik: " + (err?.message || 'Noma\'lum format'))
  }
}

function openRecentProject(rec: RecentProjectItem) {
  applyMapProject({
    project: rec.project,
    assets: rec.assets,
    characterData: rec.characterData,
    waveData: rec.waveData,
    towerData: rec.towerData,
  })
}

function removeRecent(id: string) {
  recentProjects.value = deleteRecentProject(id)
  if (recentProjects.value.length === 0 && activeMode.value === 'recents') {
    activeMode.value = 'new'
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
    applyMapProject(data)
  } catch (err: any) {
    alert('Faylni yuklashda xatolik: ' + (err?.message || 'Noto‘g‘ri format'))
  } finally {
    target.value = ''
  }
}

defineExpose({
  open: (mode: 'new' | 'import' | 'recents' = 'new', forced = false) => {
    reloadRecents()
    activeMode.value = mode === 'recents' && recentProjects.value.length === 0 ? 'new' : mode
    isForcedMode.value = forced
    isOpen.value = true
  }
})
</script>
