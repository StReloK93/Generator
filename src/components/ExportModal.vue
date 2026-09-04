<template>
  <UiModal
    :is-open="toolStore.isExportModalOpen"
    title="Export Map"
    subtitle="Save project to file or download as PNG image"
    :icon="Download"
    icon-color="brand"
    size="md"
    @close="closeModal"
  >
    <!-- Export Options Tabs -->
    <UiTabs
      v-model="exportType"
      :items="tabItems"
      variant="segmented"
      size="md"
      fill
    />

    <!-- JSON Settings (Recommended) -->
    <div v-if="exportType === 'json'" class="flex flex-col gap-3 text-xs">
      <div class="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col gap-2">
        <div class="flex justify-between items-center">
          <span class="text-slate-400">Project Name:</span>
          <span class="font-mono text-brand-300 font-semibold truncate max-w-50">{{ mapStore.project.name }}</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-slate-400">Map Dimensions:</span>
          <span class="font-mono text-slate-200">{{ mapStore.project.cols }}×{{ mapStore.project.rows }} cells</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-slate-400">Placed Elements:</span>
          <span class="font-mono text-emerald-400 font-semibold">{{ mapStore.totalTilesCount }} items</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-slate-400">Custom Assets (Sprites):</span>
          <span class="font-mono text-indigo-400 font-semibold">{{ assetStore.assets.length }} items</span>
        </div>
      </div>

      <div class="text-[11px] leading-relaxed bg-brand-950/20 p-3 rounded-xl border border-brand-500/20 text-brand-200/90">
        💡 <strong>Complete Project Backup:</strong> This file embeds all layers, coordinates, and custom uploaded sprites. You can import and resume editing anytime!
      </div>
    </div>

    <!-- PNG Settings -->
    <div v-else class="flex flex-col gap-3 text-xs">
      <UiSwitch
        v-model="includeGrid"
        label="Include Grid Lines"
        description="Renders isometric grid lines in the exported image"
      />

      <UiSwitch
        v-model="transparentBg"
        label="Transparent Background"
        description="Exports with a transparent alpha channel background"
      />

      <div class="text-[11px] text-slate-400 leading-relaxed bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/40">
        PNG export is ideal for direct use in game engines (Unity, Godot, Web games) or graphic design.
      </div>
    </div>

    <!-- Actions Footer -->
    <template #footer>
      <UiButton
        variant="ghost"
        size="sm"
        @click="closeModal"
      >
        Cancel
      </UiButton>
      <UiButton
        variant="primary"
        size="sm"
        :loading="isExporting"
        :leading-icon="Download"
        @click="handleExport"
      >
        {{ isExporting ? 'Exporting...' : 'Download' }}
      </UiButton>
    </template>
  </UiModal>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Download, Image, FileCode } from 'lucide-vue-next'
import { UiModal, UiTabs, UiButton, UiSwitch, TabItem } from './ui'
import { useMapStore } from '../stores/mapStore'
import { useToolStore } from '../stores/toolStore'
import { useAssetStore } from '../stores/assetStore'
import { useCharacterStore } from '../stores/characterStore'
import { useTowerStore } from '../stores/towerStore'
import { exportProjectJson, downloadDataUrl } from '../utils/exportHelpers'

const props = defineProps<{
  viewportRef?: any
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const mapStore = useMapStore()
const toolStore = useToolStore()
const assetStore = useAssetStore()
const characterStore = useCharacterStore()
const towerStore = useTowerStore()

const exportType = ref<string | number>('json')
const includeGrid = ref<boolean>(false)
const transparentBg = ref<boolean>(true)
const isExporting = ref<boolean>(false)

const tabItems: TabItem[] = [
  { id: 'json', label: 'JSON Project', icon: FileCode },
  { id: 'png', label: 'PNG Image', icon: Image },
]

function closeModal() {
  toolStore.isExportModalOpen = false
  emit('close')
}

async function handleExport() {
  if (isExporting.value) return
  isExporting.value = true

  try {
    if (exportType.value === 'json') {
      towerStore.syncToProject()
      characterStore.syncWavesToProject()
      characterStore.syncSpawnPointsToProject()
      characterStore.syncGameSettingsToProject()

      exportProjectJson(
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
        {
          placedTowers: towerStore.placedTowers,
          towerBlueprints: towerStore.blueprints,
        },
        {
          waveConfigs: characterStore.waveConfigs,
          currentWaveIndex: characterStore.currentWaveIndex,
        },
        {
          startingGold: characterStore.startingGold,
          startingLives: characterStore.startingLives,
          wavePrepTime: characterStore.wavePrepDuration,
        }
      )
      closeModal()
    } else {
      // PNG Export
      if (props.viewportRef && props.viewportRef.exportPng) {
        const dataUrl = await props.viewportRef.exportPng({
          includeGrid: includeGrid.value,
          transparentBg: transparentBg.value,
        })
        if (dataUrl) {
          const cleanName = (mapStore.project.name || 'isocraft_map').toLowerCase().replace(/[^a-z0-9_-]+/gi, '_')
          downloadDataUrl(dataUrl, `${cleanName}.png`)
        }
      }
      closeModal()
    }
  } catch (err: any) {
    console.error('Export error:', err)
    alert('Eksport qilishda xatolik yuz berdi: ' + (err?.message || ''))
  } finally {
    isExporting.value = false
  }
}
</script>
