<template>
  <UiModal
    :is-open="isOpen"
    :title="$t('welcome.title')"
    :subtitle="$t('welcome.subtitle')"
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
        :label="$t('common.name') + ' *'"
        :placeholder="$t('welcome.projectNamePlaceholder')"
        :leading-icon="Sparkles"
        @keyup.enter="handleCreateNew"
      />

      <!-- Presets Selection -->
      <div class="flex flex-col gap-1.5">
        <label class="text-xs font-semibold text-slate-300">{{ $t('common.size') }}</label>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <UiCard
            v-for="preset in presets" 
            :key="preset.id"
            :selected="selectedPreset === preset.id"
            interactive
            padding="sm"
            variant="default"
            custom-class="text-center flex flex-col items-center justify-center gap-0.5"
            @click="applyPreset(preset)"
          >
            <span class="text-xs font-bold">{{ $t(preset.nameKey) }}</span>
            <span class="text-[11px] font-mono opacity-80 text-brand-300">{{ preset.cols }}×{{ preset.rows }}</span>
          </UiCard>
        </div>
      </div>

      <!-- Custom Sliders -->
      <UiCard variant="subtle" padding="md" custom-class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UiSlider
          v-model="cols"
          :label="$t('welcome.mapWidth')"
          :min="10"
          :max="128"
          :step="2"
          unit=" cells"
          show-min-max
          @update:model-value="selectedPreset = 'Custom'"
        />

        <UiSlider
          v-model="rows"
          :label="$t('welcome.mapHeight')"
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
        {{ $t('welcome.createEmpty') }} ({{ cols }}×{{ rows }})
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
          <h3 class="text-base font-bold text-slate-100">{{ $t('welcome.importProject') }}</h3>
          <p class="text-xs text-slate-400 mt-1">{{ $t('welcome.importDesc') }}</p>
        </div>
        <UiButton
          type="button"
          variant="game-green"
          size="sm"
          :leading-icon="Upload"
          custom-class="mt-2 pointer-events-none"
        >
          {{ $t('welcome.chooseFile') }}
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
        <span>{{ $t('home.recentMaps') }}:</span>
        <UiBadge variant="amber" size="sm">{{ recentProjects.length }}</UiBadge>
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
            <UiButton 
              variant="game-amber"
              size="sm"
              @click="openRecentProject(rec)"
            >
              {{ $t('header.openMap') }}
            </UiButton>

            <UiIconButton 
              variant="ghost"
              size="sm"
              :icon="Trash2"
              :title="$t('common.delete')"
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
import { Sparkles, Upload, History, Trash2, Map, Package } from 'lucide-vue-next'
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
import { importProjectFromJson, normalizeTileItem } from '../utils/exportHelpers'
import { 
  getRecentProjects, 
  saveRecentProject, 
  deleteRecentProject, 
  formatTimeAgo, 
  RecentProjectItem 
} from '../services/projectStorage'
import { 
  sanitizeMapId, 
  saveEditorDraft 
} from '../services/mapManager'

import { useNotificationStore } from '../stores/notificationStore'
import { useI18n } from '../stores/i18nStore'

const router = useRouter()
const route = useRoute()
const mapStore = useMapStore()
const assetStore = useAssetStore()
const toolStore = useToolStore()
const characterStore = useCharacterStore()
const towerStore = useTowerStore()
const notify = useNotificationStore()
const { t } = useI18n()

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
    { id: 'new', label: t('header.newMap'), icon: Sparkles },
    { id: 'import', label: t('welcome.importProject'), icon: Upload },
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
  nameKey: string
  cols: number
  rows: number
}

const presets: Preset[] = [
  { id: 'small', nameKey: 'welcome.presetSmall', cols: 30, rows: 30 },
  { id: 'medium', nameKey: 'welcome.presetMedium', cols: 60, rows: 60 },
  { id: 'large', nameKey: 'welcome.presetLarge', cols: 90, rows: 90 },
  { id: 'huge', nameKey: 'welcome.presetHuge', cols: 120, rows: 120 },
]

function applyPreset(preset: Preset) {
  selectedPreset.value = preset.id
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
  const newId = sanitizeMapId(`proj-${Date.now().toString(36)}`)
  mapStore.createNewProject({
    name,
    cols: cols.value,
    rows: rows.value,
    tileWidth: 128,
    tileHeight: 64,
  })
  mapStore.project.id = newId

  // Save to editor draft and recents
  saveEditorDraft(
    newId,
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
    { blueprints: towerStore.blueprints, placedTowers: towerStore.placedTowers, clans: towerStore.clans },
    { waveConfigs: characterStore.waveConfigs, currentWaveIndex: characterStore.currentWaveIndex },
    mapStore.project.gameSettings
  )

  assetStore.selectedAssetId = null
  toolStore.activeTool = 'select'
  toolStore.selectedElement = null
  isForcedMode.value = false
  isOpen.value = false

  router.push(`/editor/${newId}`)
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

    // Normalize all compact tile items to full TileItem model
    if (clonedProject.layers) {
      for (const layer of clonedProject.layers) {
        if (layer.tiles) {
          for (const [key, items] of Object.entries(layer.tiles)) {
            const [col, row] = key.split(',').map(Number)
            const itemArr = Array.isArray(items) ? items : [items]
            layer.tiles[key] = itemArr.map((item: any) => normalizeTileItem(item, col, row))
          }
        }
      }
    }

    mapStore.project = clonedProject
    mapStore.activeLayerId = clonedProject.layers?.[0]?.id || 'layer-ground'

    if (data.assets && data.assets.length > 0) {
      assetStore.reconcileImportedAssets(data.assets)
    }

    // Restore character custom routes and settings
    if (data.characterData || (project as any).customRoutes || (project as any).customWaypoints || (project as any).characterConfig) {
      const cfg = data.characterData || {}
      if (cfg.customRoutes || (project as any).customRoutes) {
        characterStore.customRoutes = JSON.parse(JSON.stringify(cfg.customRoutes || (project as any).customRoutes || {}))
        ;(mapStore.project as any).customRoutes = JSON.parse(JSON.stringify(characterStore.customRoutes))
      }
      if (cfg.customWaypoints || (project as any).customWaypoints) {
        characterStore.customWaypoints = JSON.parse(JSON.stringify(cfg.customWaypoints || (project as any).customWaypoints || {}))
        ;(mapStore.project as any).customWaypoints = JSON.parse(JSON.stringify(characterStore.customWaypoints))
      }
      if (cfg.speed !== undefined) characterStore.speed = cfg.speed
      if (cfg.formation !== undefined) characterStore.formation = cfg.formation
      if (cfg.pairDistance !== undefined) characterStore.pairDistance = cfg.pairDistance
      if (cfg.followCamera !== undefined) characterStore.followCamera = cfg.followCamera
      if (cfg.showPathTrail !== undefined) characterStore.showPathTrail = cfg.showPathTrail
      if (cfg.autoLoop !== undefined) characterStore.autoLoop = cfg.autoLoop
      if (cfg.selectedDoorIndex !== undefined) characterStore.selectedDoorIndex = cfg.selectedDoorIndex
    }

    // Restore clans, towers & blueprints
    const twrData = data.towerData || {
      placedTowers: (project as any).placedTowers || [],
      towerBlueprints: (project as any).towerBlueprints || [],
      clans: (project as any).clans || [],
    }
    ;(mapStore.project as any).clans = twrData.clans || (project as any).clans || []
    ;(mapStore.project as any).placedTowers = twrData.placedTowers || []
    ;(mapStore.project as any).towerBlueprints = twrData.towerBlueprints || []
    towerStore.restoreFromProject()

    // Restore wave configs
    const wvData = data.waveData || {
      waveConfigs: (project as any).waveConfigs || [],
      currentWaveIndex: (project as any).currentWaveIndex ?? 0,
    }
    if (wvData.waveConfigs && wvData.waveConfigs.length > 0) {
      characterStore.waveConfigs = wvData.waveConfigs.map((w: any) => ({
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
    characterStore.spawnAtDoor(characterStore.selectedDoorIndex ?? 0)

    assetStore.selectedAssetId = null
    toolStore.activeTool = 'select'
    toolStore.selectedElement = null

    const cleanId = sanitizeMapId(clonedProject.id || clonedProject.name || 'julion')
    clonedProject.id = cleanId
    mapStore.project.id = cleanId

    // Save full identical payload to editor draft and recents
    saveEditorDraft(
      cleanId,
      mapStore.project, 
      assetStore.assets, 
      {
        customRoutes: characterStore.customRoutes,
        customWaypoints: characterStore.customWaypoints,
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
      twrData,
      wvData,
      mapStore.project.gameSettings
    )

    mapStore.pushHistory(`Map loaded: ${project.name || 'Project'}`)
    isForcedMode.value = false
    isOpen.value = false

    router.push(`/editor/${cleanId}`)
  } catch (err: any) {
    console.error('Error applying map:', err)
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
    const data = await importProjectFromJson(file)
    applyMapProject(data)
    notify.success(`"${file.name}" xaritasi muvaffaqiyatli yuklandi!`)
  } catch (err: any) {
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
