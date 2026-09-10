<template>
  <UiModal
    :is-open="toolStore.isExportModalOpen"
    :title="$t('export.title')"
    :subtitle="$t('export.jsonDesc')"
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
          <span class="text-slate-400">{{ $t('export.projectName') }}</span>
          <span class="font-mono text-brand-300 font-semibold truncate max-w-50">{{ mapStore.project.name }}</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-slate-400">{{ $t('export.mapDimensions') }}</span>
          <span class="font-mono text-slate-200">{{ $t('export.cellsCount', { cols: mapStore.project.cols, rows: mapStore.project.rows }) }}</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-slate-400">{{ $t('export.placedElements') }}</span>
          <span class="font-mono text-emerald-400 font-semibold">{{ $t('export.itemsCount', { count: mapStore.totalTilesCount }) }}</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-slate-400">{{ $t('export.customAssets') }}</span>
          <span class="font-mono text-indigo-400 font-semibold">{{ $t('export.itemsCount', { count: assetStore.assets.length }) }}</span>
        </div>
      </div>

      <div class="text-[11px] leading-relaxed bg-brand-950/20 p-3 rounded-xl border border-brand-500/20 text-brand-200/90 flex items-start gap-2">
        <Lightbulb class="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
        <span v-html="$t('export.projectBackupTip')"></span>
      </div>
    </div>

    <!-- PNG Settings -->
    <div v-else class="flex flex-col gap-3 text-xs">
      <UiSwitch
        v-model="includeGrid"
        :label="$t('export.includeGrid')"
        :description="$t('export.includeGridDesc')"
      />

      <UiSwitch
        v-model="transparentBg"
        :label="$t('export.transparentBg')"
        :description="$t('export.transparentBgDesc')"
      />

      <div class="text-[11px] text-slate-400 leading-relaxed bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/40">
        {{ $t('export.pngDesc') }}
      </div>
    </div>

    <!-- Actions Footer -->
    <template #footer>
      <UiButton
        variant="ghost"
        size="sm"
        @click="closeModal"
      >
        {{ $t('common.cancel') }}
      </UiButton>
      <UiButton
        variant="primary"
        size="sm"
        :loading="isExporting"
        :leading-icon="Download"
        @click="handleExport"
      >
        {{ isExporting ? $t('common.exporting') : $t('common.download') }}
      </UiButton>
    </template>
  </UiModal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Download, Image, FileCode, Lightbulb } from 'lucide-vue-next'
import { UiModal, UiTabs, UiButton, UiSwitch, TabItem } from './ui'
import { useMapStore } from '../stores/mapStore'
import { useToolStore } from '../stores/toolStore'
import { useAssetStore } from '../stores/assetStore'
import { useCharacterStore } from '../stores/characterStore'
import { useTowerStore } from '../stores/towerStore'
import { useNotificationStore } from '../stores/notificationStore'
import { exportProjectJson, downloadDataUrl } from '../utils/exportHelpers'
import { useI18n } from '../stores/i18nStore'

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
const notify = useNotificationStore()
const { t } = useI18n()

const exportType = ref<'json' | 'png'>('json')
const includeGrid = ref<boolean>(false)
const transparentBg = ref<boolean>(true)
const isExporting = ref<boolean>(false)

const tabItems = computed<TabItem[]>(() => [
  { id: 'json', label: t('export.jsonTab') || 'JSON Project', icon: FileCode },
  { id: 'png', label: t('export.pngTab') || 'PNG Image', icon: Image },
])

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
      notify.success(`"${mapStore.project.name || 'Loyiha'}" JSON formati muvaffaqiyatli yuklab olindi!`)
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
          notify.success(`"${cleanName}.png" rasm muvaffaqiyatli saqlandi!`)
        }
      }
      closeModal()
    }
  } catch (err: any) {
    console.error('Export error:', err)
    notify.error('Eksport qilishda xatolik yuz berdi: ' + (err?.message || ''), 'Eksport xatosi')
  } finally {
    isExporting.value = false
  }
}
</script>
