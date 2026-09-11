<template>
  <UiModal
    :is-open="toolStore.isFillGroundModalOpen"
    :title="$t('editor.fillGroundModalTitle')"
    :subtitle="$t('editor.fillGroundModalSubtitle')"
    :icon="PaintBucket"
    icon-color="brand"
    size="lg"
    @close="toolStore.closeFillGroundModal()"
  >
    <div class="flex flex-col gap-4">
      <!-- 1. Target Layer & Fill Mode Selectors -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <!-- Target Layer -->
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Layers class="w-3.5 h-3.5 text-emerald-400" />
            <span>{{ $t('editor.targetLayer') }}</span>
          </label>
          <div class="flex items-center gap-1 overflow-x-auto pb-1 custom-scrollbar">
            <button
              v-for="layer in mapStore.project.layers"
              :key="layer.id"
              type="button"
              class="px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all border shrink-0 flex items-center gap-1.5"
              :class="selectedLayerId === layer.id
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60 shadow-xs'
                : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'"
              @click="selectedLayerId = layer.id"
            >
              <div 
                class="w-2 h-2 rounded-full"
                :class="selectedLayerId === layer.id ? 'bg-emerald-400' : 'bg-slate-600'"
              ></div>
              <span>{{ layer.name }}</span>
            </button>
          </div>
        </div>

        <!-- Mode Selector -->
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Sparkles class="w-3.5 h-3.5 text-amber-400" />
            <span>{{ $t('common.mode') }}</span>
          </label>
          <UiTabs
            v-model="fillMode"
            :items="modeTabItems"
            variant="pills"
            size="xs"
            fill
          />
        </div>
      </div>

      <!-- 2. Layer Grid Statistics Banner -->
      <div class="p-3 rounded-2xl bg-slate-950/70 border border-slate-800/90 flex items-center justify-between gap-2 flex-wrap">
        <div class="flex items-center gap-2">
          <Grid class="w-4 h-4 text-brand-400" />
          <div class="flex flex-col">
            <span class="text-xs font-bold text-slate-200">{{ currentLayer?.name || 'Ground' }}</span>
            <span class="text-[10px] text-slate-500 font-mono">
              {{ mapStore.project.cols }}x{{ mapStore.project.rows }} ({{ stats.total }} {{ $t('editor.totalCellsCount').toLowerCase() }})
            </span>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <!-- Empty Cells Badge -->
          <UiBadge variant="emerald" size="sm" class="flex items-center gap-1 font-mono">
            <span>{{ $t('editor.emptyCellsCount') }}:</span>
            <strong class="text-emerald-300">{{ stats.empty.toLocaleString() }}</strong>
          </UiBadge>

          <!-- Occupied Cells Badge -->
          <UiBadge variant="amber" size="sm" class="flex items-center gap-1 font-mono">
            <span>{{ $t('editor.occupiedCellsCount') }}:</span>
            <strong class="text-amber-300">{{ stats.occupied.toLocaleString() }}</strong>
          </UiBadge>
        </div>
      </div>

      <!-- Mode Explanation Hint -->
      <div class="p-2.5 rounded-xl border text-xs" :class="modeHintClass">
        <p class="font-medium leading-relaxed">
          <span v-if="fillMode === 'empty-only'">
            ✨ <strong>{{ $t('editor.fillOnlyEmpty') }}</strong>: {{ $t('editor.fillOnlyEmptyDesc') }}
          </span>
          <span v-else-if="fillMode === 'replace'">
            ⚠️ <strong>{{ $t('editor.replaceAllCells') }}</strong>: {{ $t('editor.replaceAllDesc') }}
          </span>
          <span v-else>
            ➕ <strong>{{ $t('editor.stackAllCells') }}</strong>: {{ $t('editor.stackAllDesc') }}
          </span>
        </p>
      </div>

      <!-- 3. Asset Selector -->
      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between gap-2">
          <label class="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <Boxes class="w-3.5 h-3.5 text-brand-400" />
            <span>{{ $t('editor.chooseAsset') }}</span>
            <span v-if="chosenAsset" class="text-brand-300 font-bold">({{ chosenAsset.name }})</span>
          </label>

          <!-- Category filter chips -->
          <div class="overflow-x-auto pb-0.5 custom-scrollbar">
            <UiTabs
              v-model="activeCategory"
              :items="categoryItems"
              variant="pills"
              size="xs"
            />
          </div>
        </div>

        <!-- Search Input -->
        <UiInput
          v-model="searchQuery"
          size="sm"
          :placeholder="$t('sidebar.searchAssets')"
          :leading-icon="Search"
          clearable
        />

        <!-- Asset Grid -->
        <div class="h-44 sm:h-52 overflow-y-auto p-1.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 custom-scrollbar">
          <div 
            v-if="filteredAssets.length > 0"
            class="grid grid-cols-4 sm:grid-cols-6 gap-2"
          >
            <button
              v-for="asset in filteredAssets"
              :key="asset.id"
              type="button"
              class="group relative flex flex-col items-center justify-center p-1.5 rounded-xl border aspect-square cursor-pointer transition-all overflow-hidden"
              :class="chosenAssetId === asset.id
                ? 'border-brand-500 bg-brand-950/80 ring-2 ring-brand-500/80 scale-[1.03]'
                : 'border-slate-800/90 bg-slate-900/80 hover:border-slate-700 hover:bg-slate-850'"
              @click="chosenAssetId = asset.id"
            >
              <img
                :src="assetStore.getAssetPreview(asset)"
                :alt="asset.name"
                width="48"
                height="48"
                decoding="async"
                class="max-w-full max-h-full aspect-square object-contain filter drop-shadow group-hover:scale-110 transition-transform pointer-events-none"
                loading="lazy"
              />
              <span class="text-[9px] text-slate-300 truncate w-full text-center mt-1 px-0.5">
                {{ asset.name.replace(/\.[^/.]+$/, '') }}
              </span>
            </button>
          </div>

          <div v-else class="h-full flex flex-col items-center justify-center text-slate-500 text-xs">
            <Boxes class="w-6 h-6 mb-1 text-slate-600" />
            <span>{{ $t('sidebar.noObjectsPlaced') }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Footer Actions -->
    <template #footer>
      <div class="flex items-center justify-between w-full gap-2">
        <UiButton
          variant="secondary"
          size="sm"
          @click="toolStore.closeFillGroundModal()"
        >
          {{ $t('common.cancel') }}
        </UiButton>

        <UiButton
          variant="primary"
          size="sm"
          :leading-icon="PaintBucket"
          :disabled="!chosenAssetId || willFillCount === 0"
          @click="handleExecuteFill"
        >
          <span>{{ $t('editor.fillAction') }} ({{ willFillCount.toLocaleString() }} {{ $t('editor.totalCellsCount').toLowerCase() }})</span>
        </UiButton>
      </div>
    </template>
  </UiModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { 
  PaintBucket, Layers, Sparkles, Grid, Boxes, Search 
} from 'lucide-vue-next'
import { UiModal, UiButton, UiTabs, UiInput, UiBadge } from './ui'
import { useMapStore } from '../stores/mapStore'
import { useToolStore } from '../stores/toolStore'
import { useAssetStore } from '../stores/assetStore'
import { useNotificationStore } from '../stores/notificationStore'
import { useI18n } from '../stores/i18nStore'

const mapStore = useMapStore()
const toolStore = useToolStore()
const assetStore = useAssetStore()
const notify = useNotificationStore()
const { t } = useI18n()

const selectedLayerId = ref<string>('layer-ground')
const fillMode = ref<'empty-only' | 'replace' | 'stack'>('empty-only')
const chosenAssetId = ref<string | null>(null)
const activeCategory = ref<string>('Terrain')
const searchQuery = ref<string>('')

// Initialize layer & default asset when modal opens
watch(() => toolStore.isFillGroundModalOpen, (isOpen) => {
  if (isOpen) {
    if (toolStore.fillModalTargetLayerId) {
      selectedLayerId.value = toolStore.fillModalTargetLayerId
    } else {
      const groundLayer = mapStore.project.layers.find(l => l.id === 'layer-ground')
      selectedLayerId.value = groundLayer ? groundLayer.id : mapStore.activeLayerId
    }

    if (assetStore.selectedAssetId) {
      chosenAssetId.value = assetStore.selectedAssetId
    } else {
      // Find first terrain asset as smart default
      const terrainAsset = assetStore.assets.find(a => a.category === 'Terrain' || /ground|grass|dirt|sand|tile|floor|terrain/i.test(a.name))
      chosenAssetId.value = terrainAsset?.id || assetStore.assets[0]?.id || null
    }
  }
})

const currentLayer = computed(() => {
  return mapStore.project.layers.find(l => l.id === selectedLayerId.value) || mapStore.activeLayer
})

const stats = computed(() => {
  return mapStore.getLayerCellStats(selectedLayerId.value)
})

const willFillCount = computed(() => {
  if (fillMode.value === 'empty-only') return stats.value.empty
  return stats.value.total
})

const chosenAsset = computed(() => {
  if (!chosenAssetId.value) return null
  return assetStore.assets.find(a => a.id === chosenAssetId.value) || null
})

const modeTabItems = computed(() => [
  { id: 'empty-only', label: t('editor.fillOnlyEmpty') },
  { id: 'replace', label: t('editor.replaceAllCells') },
  { id: 'stack', label: t('editor.stackAllCells') },
])

const modeHintClass = computed(() => {
  if (fillMode.value === 'empty-only') return 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
  if (fillMode.value === 'replace') return 'bg-rose-950/40 border-rose-500/30 text-rose-200'
  return 'bg-cyan-950/40 border-cyan-500/30 text-cyan-200'
})

const categoryItems = computed(() => [
  { id: 'All', label: t('common.all') },
  { id: 'Terrain', label: 'Terrain' },
  { id: 'Structures', label: 'Structures' },
  { id: 'Props', label: 'Props' },
])

const filteredAssets = computed(() => {
  let list = assetStore.assets

  if (activeCategory.value !== 'All') {
    list = list.filter(a => {
      if (activeCategory.value === 'Terrain') {
        return a.category === 'Terrain' || /ground|grass|dirt|sand|tile|floor|terrain|road|stone/i.test(a.name)
      }
      return a.category === activeCategory.value
    })
  }

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim()
    list = list.filter(a => a.name.toLowerCase().includes(q))
  }

  return list
})

function handleExecuteFill() {
  if (!chosenAssetId.value) {
    notify.warning(t('editor.selectAssetToFill'))
    return
  }

  const layer = currentLayer.value
  const count = mapStore.fillLayerCells(chosenAssetId.value, selectedLayerId.value, fillMode.value)
  
  // Also select this asset in assetStore for convenience
  assetStore.selectAsset(chosenAssetId.value)

  if (fillMode.value === 'empty-only') {
    notify.success(t('editor.filledEmptyCellsCount', { count, layer: layer.name }))
  } else {
    notify.success(t('editor.filledLayerCount', { count, layer: layer.name }))
  }

  toolStore.closeFillGroundModal()
}
</script>
