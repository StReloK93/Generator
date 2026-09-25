<template>
  <UiModal :is-open="isOpen" :title="$t('welcome.title')" :subtitle="$t('welcome.subtitle')" :icon="Map"
    icon-color="brand" size="5xl" :show-close="canClose && !isImporting" :close-on-backdrop="canClose && !isImporting"
    :close-on-escape="canClose && !isImporting" @close="isOpen = false">
    <!-- Stable wrapper to prevent layout jumps -->
    <div class="flex flex-col gap-4 min-h-100 relative">
      <!-- Mode Selector Tabs (Always mounted to preserve layout height & prevent jumps) -->
      <UiTabs v-model="activeMode" :items="tabItems" fill size="md"
        :class="{ 'opacity-40 pointer-events-none': isImporting }" />

      <!-- Content Container with fixed min-height -->
      <div class="relative flex-1 flex flex-col">
        <!-- ASYNCHRONOUS IMPORT PROGRESS OVERLAY -->
        <div v-if="isImporting"
          class="absolute inset-0 z-20 flex flex-col items-center justify-center p-6 gap-4 text-center bg-slate-900/90 backdrop-blur-xs rounded-2xl animate-in fade-in duration-200">
          <!-- Elegant glowing icon (calm, no jittery bounce) -->
          <div class="relative flex items-center justify-center">
            <div class="absolute inset-0 rounded-2xl bg-amber-500/20 blur-md animate-pulse"></div>
            <div
              class="relative w-16 h-16 rounded-2xl bg-slate-900/90 border border-amber-500/40 text-amber-400 flex items-center justify-center shadow-xl">
              <Upload class="w-8 h-8 text-amber-400" />
            </div>
          </div>

          <div class="flex flex-col gap-1.5 max-w-sm w-full">
            <span class="text-sm font-bold text-white uppercase tracking-wider">
              {{ $t('import.processingMap') }}
            </span>
            <div class="h-6 flex items-center justify-center">
              <span class="text-xs text-amber-300 font-medium flex items-center justify-center gap-1.5 truncate px-2">
                <span class="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0"></span>
                <span class="truncate">{{ importStageMessage || $t('import.readingFile') }}</span>
              </span>
            </div>
          </div>

          <!-- Animated Progress Bar with smooth duration -->
          <div
            class="w-full max-w-sm bg-slate-950 border border-slate-800 rounded-full h-3 overflow-hidden shadow-inner p-0.5">
            <div
              class="h-full bg-linear-to-r from-amber-500 via-orange-400 to-amber-300 transition-all duration-300 ease-out rounded-full shadow-sm shadow-amber-500/50"
              :style="{ width: `${importProgress}%` }"></div>
          </div>
          <span class="font-mono text-xs text-slate-400 font-bold tracking-wider">
            {{ Math.round(importProgress) }}%
          </span>
        </div>

        <!-- ========================================== -->
        <!-- TAB 1: CREATE NEW MAP                      -->
        <!-- ========================================== -->
        <div v-show="!isImporting && activeMode === 'new'" class="flex flex-col gap-4 flex-1">
          <!-- Project Name Input -->
          <UiInput v-model="newProjectName" :label="$t('common.name') + ' *'"
            :placeholder="$t('welcome.projectNamePlaceholder')" :leading-icon="Sparkles"
            @keyup.enter="handleCreateNew" />

          <!-- Game Mode Selector: TD vs Hero -->
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold text-slate-300">O'yin Rejimi (Game Mode)</label>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <UiCard :selected="selectedGameMode === 'td'" interactive padding="md"
                custom-class="flex flex-col gap-1.5 cursor-pointer border-slate-800 hover:border-amber-500/50 transition-colors"
                @click="selectedGameMode = 'td'">
                <div class="flex items-center gap-2 text-amber-400">
                  <Castle class="w-5 h-5 shrink-0" />
                  <span class="font-bold text-sm">Tower Defense</span>
                  <UiBadge v-if="selectedGameMode === 'td'" variant="amber" size="xs" class="ml-auto">Faol</UiBadge>
                </div>
                <p class="text-[11px] text-slate-400 leading-tight">
                  To'lqinlar, klanlar, minoralar qurish va bazani himoyalash.
                </p>
              </UiCard>

              <UiCard :selected="selectedGameMode === 'hero'" interactive padding="md"
                custom-class="flex flex-col gap-1.5 cursor-pointer border-slate-800 hover:border-emerald-500/50 transition-colors"
                @click="selectedGameMode = 'hero'">
                <div class="flex items-center gap-2 text-emerald-400">
                  <Swords class="w-5 h-5 shrink-0" />
                  <span class="font-bold text-sm">Hero Adventure</span>
                  <UiBadge v-if="selectedGameMode === 'hero'" variant="emerald" size="xs" class="ml-auto">Faol</UiBadge>
                </div>
                <p class="text-[11px] text-slate-400 leading-tight">
                  Qahramon (Warrior, Orc, Demon), to'siqlar, sarguzasht va janglar.
                </p>
              </UiCard>
            </div>
          </div>

          <!-- Presets Selection -->
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold text-slate-300">{{ $t('common.size') }}</label>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <UiCard v-for="preset in presets" :key="preset.id" :selected="selectedPreset === preset.id" interactive
                padding="sm" variant="default"
                custom-class="text-center flex flex-col items-center justify-center gap-0.5"
                @click="applyPreset(preset)">
                <span class="text-[11px] font-mono opacity-80 text-brand-300">{{ preset.cols }}×{{ preset.rows }}</span>
              </UiCard>
            </div>
          </div>

          <!-- Custom Sliders -->
          <UiCard variant="subtle" padding="md" custom-class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UiSlider v-model="cols" :label="$t('welcome.mapWidth')" :min="10" :max="128" :step="2" unit=" cells"
              show-min-max @update:model-value="selectedPreset = 'Custom'" />

            <UiSlider v-model="rows" :label="$t('welcome.mapHeight')" :min="10" :max="128" :step="2" unit=" cells"
              show-min-max @update:model-value="selectedPreset = 'Custom'" />
          </UiCard>

          <!-- Submit Button -->
          <UiButton variant="primary" size="lg" block :leading-icon="Sparkles" @click="handleCreateNew">
            {{ $t('common.create') }} ({{ cols }}×{{ rows }})
          </UiButton>
        </div>

        <!-- ========================================== -->
        <!-- TAB 2: IMPORT PROJECT JSON                 -->
        <!-- ========================================== -->
        <div v-show="!isImporting && activeMode === 'import'" class="flex flex-col gap-4 flex-1 justify-center">
          <div @click="triggerFileInput"
            class="border-2 border-dashed border-slate-700/80 hover:border-emerald-500/80 rounded-3xl p-8 sm:p-10 flex flex-col items-center justify-center gap-3.5 text-center cursor-pointer transition-all bg-slate-900/40 hover:bg-slate-900/80 group">
            <div
              class="w-16 h-16 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
              <Upload class="w-8 h-8" />
            </div>
            <div>
              <h3 class="text-base font-bold text-slate-100">{{ $t('common.import') }}</h3>
              <p class="text-xs text-slate-400 mt-1">{{ $t('welcome.importDesc') }}</p>
            </div>
            <UiButton type="button" variant="game-green" size="sm" :leading-icon="Upload"
              custom-class="mt-2 pointer-events-none">
              {{ $t('welcome.chooseFile') }}
            </UiButton>
          </div>

          <input ref="fileInputRef" type="file" accept=".json,.isomap.json" class="hidden"
            @change="handleFileSelected" />
        </div>

        <!-- ========================================== -->
        <!-- TAB 3: RECENT PROJECTS LIST (LOCALSTORAGE) -->
        <!-- ========================================== -->
        <div v-show="!isImporting && activeMode === 'recents'" class="flex flex-col gap-3 flex-1">
          <div class="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>{{ $t('home.recentMaps') }}:</span>
            <UiBadge variant="amber" size="sm">{{ recentProjects.length }}</UiBadge>
          </div>

          <div class="flex flex-col gap-2">
            <UiCard v-for="rec in recentProjects" :key="rec.id" variant="default" padding="sm"
              custom-class="flex items-center justify-between gap-3 group hover:border-amber-500/50">
              <div class="flex items-center gap-3 min-w-0">
                <div
                  class="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center font-bold text-base shrink-0">
                  <Map class="w-5 h-5" />
                </div>
                <div class="min-w-0">
                  <h4 class="font-bold text-sm text-slate-100 group-hover:text-amber-300 transition-colors truncate">
                    {{ rec.name }}
                  </h4>
                  <div class="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5">
                    <span>{{ rec.cols }}×{{ rec.rows }}</span>
                    <span>•</span>
                    <span class="flex items-center gap-1">
                      <Package class="w-3 h-3 text-amber-400" />
                      <span>{{ rec.tilesCount }}</span>
                    </span>
                    <span>•</span>
                    <span class="text-amber-400/90">{{ formatTimeAgo(rec.updatedAt) }}</span>
                  </div>
                </div>
              </div>

              <div class="flex items-center gap-1.5 shrink-0">
                <UiButton variant="game-amber" size="sm" @click="openRecentProject(rec)">
                  {{ $t('common.open') }}
                </UiButton>

                <UiIconButton variant="ghost" size="sm" :icon="Trash2" :title="$t('common.delete')"
                  custom-class="text-slate-400 hover:text-rose-400 hover:bg-rose-950/40"
                  @click="removeRecent(rec.id)" />
              </div>
            </UiCard>
          </div>
        </div>
      </div>
    </div>
  </UiModal>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Sparkles, Upload, History, Trash2, Map, Package, Castle, Swords } from 'lucide-vue-next'
import {
  UiModal,
  UiTabs,
  UiInput,
  UiSlider,
  UiButton,
  UiCard,
  UiBadge,
  UiIconButton,
  TabItem
} from './ui'
import { useMapStore } from '../stores/mapStore'
import { useAssetStore } from '../stores/assetStore'
import { useToolStore } from '../stores/toolStore'
import { useCharacterStore } from '../stores/characterStore'
import { useRouteStore } from '../stores/routeStore'
import { useWaveStore } from '../stores/waveStore'
import { useGameStore } from '../stores/gameStore'
import { useTowerStore } from '../stores/towerStore'
import { useHeroStore } from '../stores/heroStore'
import { importProjectFromJson, normalizeTileItem, yieldToMain } from '../utils/exportHelpers'
import {
  getRecentProjects,
  deleteRecentProject,
  formatTimeAgo,
  RecentProjectItem
} from '../services/projectStorage'
import {
  sanitizeMapId,
  saveEditorDraft,
  registerSessionCustomMap
} from '../services/mapManager'
import { buildFullProjectJsonPayload } from '../utils/exportHelpers'

import { useNotificationStore } from '../stores/notificationStore'
import { useI18n } from '../stores/i18nStore'

const router = useRouter()
const mapStore = useMapStore()
const assetStore = useAssetStore()
const toolStore = useToolStore()
const characterStore = useCharacterStore()
const routeStore = useRouteStore()
const waveStore = useWaveStore()
const gameStore = useGameStore()
const towerStore = useTowerStore()
const heroStore = useHeroStore()
const notify = useNotificationStore()
const { t } = useI18n()

const isOpen = ref(false)
const isForcedMode = ref(false)
const isImporting = ref(false)
const importProgress = ref(0)
const importStageMessage = ref('')
const activeMode = ref<'new' | 'import' | 'recents'>('new')
const selectedGameMode = ref<'td' | 'hero'>('td')
const newProjectName = ref('My Defense Map')
const cols = ref(60)
const rows = ref(60)
const selectedPreset = ref("Medium")
const fileInputRef = ref<HTMLInputElement | null>(null)
const recentProjects = ref<RecentProjectItem[]>([])

const tabItems = computed<TabItem[]>(() => {
  const items: TabItem[] = [
    { id: 'new', label: t('header.newMap'), icon: Sparkles },
    { id: 'import', label: t('common.import'), icon: Upload },
  ]
  if (recentProjects.value.length > 0) {
    items.push({
      id: 'recents',
      label: t('home.recentMaps'),
      icon: History,
      count: recentProjects.value.length
    })
  }
  return items
})

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
  id: string
  cols: number
  rows: number
}

const presets: Preset[] = [
  { id: 'small', cols: 30, rows: 30 },
  { id: 'medium', cols: 60, rows: 60 },
  { id: 'large', cols: 90, rows: 90 },
  { id: 'huge', cols: 120, rows: 120 },
]

function applyPreset(preset: Preset) {
  selectedPreset.value = preset.id
  cols.value = preset.cols
  rows.value = preset.rows
}

function handleCreateNew() {
  gameStore.exitPlayMode()
  characterStore.resetTour()
  characterStore.isPlaying = false
  towerStore.clearCombatEffects()
  gameStore.resetForNewProject()
  routeStore.resetForNewProject()
  waveStore.resetForNewProject()
  characterStore.resetForNewProject()
  towerStore.resetForNewProject()

  const name = newProjectName.value.trim() || (selectedGameMode.value === 'hero' ? 'My Hero Adventure' : 'My Defense Map')
  const newId = sanitizeMapId(`proj-${Date.now().toString(36)}`)
  mapStore.createNewProject({
    name,
    gameMode: selectedGameMode.value,
    cols: cols.value,
    rows: rows.value,
    tileWidth: 128,
    tileHeight: 64,
  })
  mapStore.project.id = newId

  // Configure Hero mode state
  heroStore.toggleHero(selectedGameMode.value === 'hero')
  if (selectedGameMode.value === 'hero') {
    heroStore.selectHero(true)
  }

  // Save to editor draft and recents
  saveEditorDraft(
    newId,
    mapStore.project,
    assetStore.assets,
    {
      routes: routeStore.routes,
    },
    { blueprints: towerStore.blueprints, placedTowers: towerStore.placedTowers, clans: towerStore.clans },
    { waveConfigs: waveStore.waveConfigs, currentWaveIndex: waveStore.currentWaveIndex },
    mapStore.project.gameSettings
  )

  assetStore.selectedAssetId = null
  toolStore.activeTool = 'select'
  toolStore.selectedElement = null
  isForcedMode.value = false
  isOpen.value = false

  router.push(`/editor/${newId}`)
}

async function applyMapProject(rawData: any, options: { isAlreadyNormalized?: boolean } = {}) {
  try {
    isImporting.value = true
    if (!options.isAlreadyNormalized) {
      importProgress.value = 25
      importStageMessage.value = t('import.readingFile')
      await yieldToMain()
    }

    const data = rawData.payload || rawData
    const project = data.project || data
    if (!project || !project.cols || !project.rows) {
      throw new Error("Invalid map format")
    }

    gameStore.exitPlayMode()
    characterStore.resetTour()
    characterStore.isPlaying = false
    towerStore.clearCombatEffects()

    if (!options.isAlreadyNormalized) {
      importProgress.value = 45
      importStageMessage.value = t('import.syncingAssets')
      await yieldToMain()
    }

    const clonedProject = JSON.parse(JSON.stringify(project))
    if (!clonedProject.id) {
      clonedProject.id = `proj-${Date.now()}`
    }

    if (data.assets && data.assets.length > 0) {
      assetStore.reconcileImportedAssets(data.assets)
    }

    // Normalize only if not already done in importProjectFromJson
    if (!options.isAlreadyNormalized && clonedProject.layers && Array.isArray(clonedProject.layers)) {
      const totalLayers = clonedProject.layers.length
      for (let lIdx = 0; lIdx < totalLayers; lIdx++) {
        const layer = clonedProject.layers[lIdx]
        if (layer.tiles) {
          const entries = Object.entries(layer.tiles)
          const batchSize = 1000
          for (let i = 0; i < entries.length; i += batchSize) {
            const chunk = entries.slice(i, i + batchSize)
            for (const [key, items] of chunk) {
              const [col, row] = key.split(',').map(Number)
              const itemArr = Array.isArray(items) ? items : [items]
              layer.tiles[key] = itemArr.map((item: any) => normalizeTileItem(item, col, row))
            }
            if (entries.length > batchSize) {
              await yieldToMain()
            }
          }
        }
      }
      importProgress.value = 75
      importStageMessage.value = t('import.restoringLayers')
      await yieldToMain()
    }

    if (!options.isAlreadyNormalized) {
      importProgress.value = 90
      importStageMessage.value = t('import.hydratingTD')
      await yieldToMain()
    }

    mapStore.project = clonedProject
    mapStore.activeLayerId = clonedProject.layers?.[0]?.id || 'layer-ground'

    // Synchronize routes and character waypoints from imported project
    routeStore.syncRoutesFromProject()

    // Restore Game Settings (Starting Gold, Starting Lives, Wave Prep Time, formation, etc.)
    const gSettings = clonedProject.gameSettings || data.gameSettings || (data.characterData && data.characterData.gameSettings) || {
      startingGold: 150,
      startingLives: 20,
      wavePrepTime: 10,
    }
    mapStore.project.gameSettings = {
      startingGold: Number(gSettings.startingGold) || 150,
      startingLives: Number(gSettings.startingLives) || 20,
      wavePrepTime: Number(gSettings.wavePrepTime) || 10,
      maxPlayers: gSettings.maxPlayers || undefined,
      spawnMode: gSettings.spawnMode || 'single',
      formation: gSettings.formation || 'pair',
      pairDistance: gSettings.pairDistance !== undefined ? Number(gSettings.pairDistance) : 0.45,
      unitElevation: gSettings.unitElevation !== undefined ? Number(gSettings.unitElevation) : 0,
      unitScaleMultiplier: gSettings.unitScaleMultiplier !== undefined ? Number(gSettings.unitScaleMultiplier) : 1.0,
    }
    gameStore.restoreGameSettingsFromProject()

    // Restore clans, towers & blueprints
    const twrData = data.towerData || {
      placedTowers: (project as any).placedTowers || [],
      towerBlueprints: (project as any).towerBlueprints || [],
      clans: (project as any).clans || [],
    }
      ; (mapStore.project as any).clans = twrData.clans || (project as any).clans || []
      ; (mapStore.project as any).placedTowers = twrData.placedTowers || []
      ; (mapStore.project as any).towerBlueprints = twrData.towerBlueprints || []
    towerStore.restoreFromProject()

    // Restore wave configs
    const wvData = data.waveData || {
      waveConfigs: (project as any).waveConfigs || [],
      currentWaveIndex: (project as any).currentWaveIndex ?? 0,
    }
    if (wvData.waveConfigs && wvData.waveConfigs.length > 0) {
      waveStore.waveConfigs = wvData.waveConfigs.map((w: any) => ({
        ...w,
        unitBonus: w.unitBonus !== undefined ? Number(w.unitBonus) : (Number(w.goldReward) || 1),
        endWaveBonus: w.endWaveBonus !== undefined ? Number(w.endWaveBonus) : 50,
        characterModel: w.characterModel || 'male',
        animSpeed: Number(w.animSpeed) || 1.0,
        offsetY: Number(w.offsetY) || 0,
        unitScale: Number(w.unitScale) || 1.0,
        unitVariant: w.unitVariant || 'normal',
        variantTint: w.variantTint,
        immunities: Array.isArray(w.immunities) ? [...w.immunities] : [],
      }))
      waveStore.currentWaveIndex = wvData.currentWaveIndex ?? 0
        ; (mapStore.project as any).waveConfigs = [...waveStore.waveConfigs]
    }
    waveStore.restoreWavesFromProject()

    characterStore.spawnAtRoute(routeStore.selectedRouteIndex ?? 0)

    const isHeroMode = clonedProject.gameMode === 'hero'
    heroStore.toggleHero(isHeroMode)
    if (isHeroMode) {
      heroStore.selectHero(true)
    }

    assetStore.selectedAssetId = null
    toolStore.activeTool = 'select'
    toolStore.selectedElement = null

    const cleanId = sanitizeMapId(clonedProject.id || clonedProject.name || 'julion')
    clonedProject.id = cleanId
    mapStore.project.id = cleanId

    importProgress.value = 100
    importStageMessage.value = t('import.mapReady')
    await yieldToMain()

    // Save full identical payload to editor draft and recents
    saveEditorDraft(
      cleanId,
      mapStore.project,
      assetStore.assets,
      {
        routes: routeStore.routes,
      },
      twrData,
      wvData,
      mapStore.project.gameSettings
    )

    // Register into session memory so immediate game play has latest imported data
    registerSessionCustomMap(cleanId, buildFullProjectJsonPayload(
      mapStore.project,
      assetStore.assets,
      {
        routes: routeStore.routes,
      },
      twrData,
      wvData,
      mapStore.project.gameSettings
    ))

    mapStore.resetHistory(`Map loaded: ${project.name || 'Project'}`)
    await new Promise(r => setTimeout(r, 220))

    isForcedMode.value = false
    isOpen.value = false
    isImporting.value = false

    router.push(`/editor/${cleanId}`)
  } catch (err: any) {
    console.error('Error applying map:', err)
    isImporting.value = false
    notify.error("Xaritani yuklashda xatolik yuz berdi: " + (err?.message || 'Noma\'lum format'))
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
    isImporting.value = true
    importProgress.value = 15
    importStageMessage.value = t('import.readingFile')

    const data = await importProjectFromJson(file, (pct, stageKey) => {
      importProgress.value = pct
      importStageMessage.value = t(stageKey) || stageKey
    })

    await applyMapProject(data, { isAlreadyNormalized: true })
    notify.success(`"${file.name}" xaritasi muvaffaqiyatli yuklandi!`)
  } catch (err: any) {
    isImporting.value = false
    notify.error('Faylni import qilishda xatolik: ' + (err?.message || 'Noto\'g\'ri format'))
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
