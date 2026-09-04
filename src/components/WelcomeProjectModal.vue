<template>
  <UiModal
    :is-open="isOpen"
    title="Map Architect"
    subtitle="Create a new isometric map, import an existing project, or resume recent work"
    :icon="Map"
    icon-color="brand"
    size="2xl"
    :show-close="canClose"
    :close-on-backdrop="canClose"
    :close-on-escape="canClose"
    @close="isOpen = false"
  >
    <!-- Mode Selector Tabs -->
    <UiTabs
      v-model="activeMode"
      :items="tabItems"
      fill
      size="md"
    />

    <!-- ========================================== -->
    <!-- TAB 1: CREATE NEW MAP                      -->
    <!-- ========================================== -->
    <div v-if="activeMode === 'new'" class="flex flex-col gap-4">
      <!-- Project Name Input -->
      <UiInput
        v-model="newProjectName"
        label="Map Name (Required)"
        placeholder="e.g. Castle Fortress Siege #1"
        :leading-icon="Sparkles"
        @keyup.enter="handleCreateNew"
      />

      <!-- Presets Selection -->
      <div class="flex flex-col gap-1.5">
        <label class="text-xs font-semibold text-slate-300">Dimension Presets</label>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <UiCard
            v-for="preset in presets" 
            :key="preset.name"
            :selected="selectedPreset === preset.name"
            interactive
            padding="sm"
            variant="default"
            custom-class="text-center flex flex-col items-center justify-center gap-0.5"
            @click="applyPreset(preset)"
          >
            <span class="text-xs font-bold">{{ preset.name }}</span>
            <span class="text-[11px] font-mono opacity-80 text-brand-300">{{ preset.cols }}×{{ preset.rows }}</span>
          </UiCard>
        </div>
      </div>

      <!-- Custom Sliders -->
      <UiCard variant="subtle" padding="md" custom-class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UiSlider
          v-model="cols"
          label="Columns (Width)"
          :min="10"
          :max="128"
          :step="2"
          unit=" cells"
          show-min-max
          @update:model-value="selectedPreset = 'Custom'"
        />

        <UiSlider
          v-model="rows"
          label="Rows (Height)"
          :min="10"
          :max="128"
          :step="2"
          unit=" cells"
          show-min-max
          @update:model-value="selectedPreset = 'Custom'"
        />
      </UiCard>

      <!-- Submit Button -->
      <UiButton
        variant="primary"
        size="lg"
        block
        :leading-icon="Sparkles"
        @click="handleCreateNew"
      >
        Enter Editor ({{ cols }}×{{ rows }})
      </UiButton>
    </div>

    <!-- ========================================== -->
    <!-- TAB 2: IMPORT PROJECT JSON                 -->
    <!-- ========================================== -->
    <div v-else-if="activeMode === 'import'" class="flex flex-col gap-4">
      <div 
        @click="triggerFileInput"
        class="border-2 border-dashed border-slate-700/80 hover:border-emerald-500/80 rounded-3xl p-8 sm:p-10 flex flex-col items-center justify-center gap-3.5 text-center cursor-pointer transition-all bg-slate-900/40 hover:bg-slate-900/80 group"
      >
        <div class="w-16 h-16 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
          <Upload class="w-8 h-8" />
        </div>
        <div>
          <h3 class="text-base font-bold text-slate-100">Select Map Project File</h3>
          <p class="text-xs text-slate-400 mt-1">.json or .isomap.json format project file</p>
        </div>
        <UiButton
          type="button"
          variant="game-green"
          size="sm"
          :leading-icon="Upload"
          custom-class="mt-2 pointer-events-none"
        >
          Choose File
        </UiButton>
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
        <span>Recent workspace projects:</span>
        <UiBadge variant="amber" size="sm">{{ recentProjects.length }} saved</UiBadge>
      </div>

      <div class="flex flex-col gap-2">
        <UiCard 
          v-for="rec in recentProjects"
          :key="rec.id"
          variant="default"
          padding="sm"
          custom-class="flex items-center justify-between gap-3 group hover:border-amber-500/50"
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
                <span>{{ rec.cols }}×{{ rec.rows }} cells</span>
                <span>•</span>
                <span>📦 {{ rec.tilesCount }} tiles</span>
                <span>•</span>
                <span class="text-amber-400/90">{{ formatTimeAgo(rec.updatedAt) }}</span>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-1.5 shrink-0">
            <UiButton 
              variant="game-amber"
              size="sm"
              @click="openRecentProject(rec)"
            >
              Open
            </UiButton>

            <UiIconButton 
              variant="ghost"
              size="sm"
              :icon="Trash2"
              title="Delete from history"
              custom-class="text-slate-400 hover:text-rose-400 hover:bg-rose-950/40"
              @click="removeRecent(rec.id)"
            />
          </div>
        </UiCard>
      </div>
    </div>
  </UiModal>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Sparkles, Upload, History, Trash2, Map } from 'lucide-vue-next'
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
const newProjectName = ref('My Defense Map')
const cols = ref(60)
const rows = ref(60)
const selectedPreset = ref("Medium")
const fileInputRef = ref<HTMLInputElement | null>(null)
const recentProjects = ref<RecentProjectItem[]>([])

const tabItems = computed<TabItem[]>(() => {
  const items: TabItem[] = [
    { id: 'new', label: 'New Map', icon: Sparkles },
    { id: 'import', label: 'Import File', icon: Upload },
  ]
  if (recentProjects.value.length > 0) {
    items.push({
      id: 'recents',
      label: 'Recents',
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
  name: string
  cols: number
  rows: number
}

const presets: Preset[] = [
  { name: 'Small', cols: 30, rows: 30 },
  { name: 'Medium', cols: 60, rows: 60 },
  { name: 'Large', cols: 90, rows: 90 },
  { name: 'Huge', cols: 120, rows: 120 },
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

  const name = newProjectName.value.trim() || 'New Isometric Map'
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
      throw new Error("Invalid map format")
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

    mapStore.pushHistory(`Map loaded: ${project.name || 'Project'}`)
    isForcedMode.value = false
    isOpen.value = false

    if (route.name !== 'editor') {
      router.push('/editor')
    }
  } catch (err: any) {
    console.error('Error applying map:', err)
    alert("Error loading map: " + (err?.message || 'Unknown format'))
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
    alert('Failed to import file: ' + (err?.message || 'Invalid format'))
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
