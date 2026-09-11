<template>
  <UiModal
    :is-open="toolStore.isBoxClearModalOpen"
    :title="$t('editor.boxClearModalTitle')"
    :subtitle="$t('editor.boxClearModalSubtitle')"
    :icon="Trash2"
    icon-color="rose"
    size="xl"
    @close="handleClose"
  >
    <div v-if="toolStore.boxClearData" class="flex flex-col gap-5">
      
      <!-- 1. Top Summary Banner (Area Coordinates & Found Items) -->
      <div class="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-4 flex-wrap shadow-inner">
        <!-- Area Range -->
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0 shadow-xs">
            <Scan class="w-5 h-5 text-rose-400" />
          </div>
          <div class="flex flex-col gap-0.5">
            <div class="flex items-center gap-2">
              <span class="text-xs font-semibold text-slate-400">{{ $t('editor.selectedArea') }}:</span>
              <span class="font-mono font-bold text-amber-300 text-sm bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                ({{ toolStore.boxClearData.col0 }}, {{ toolStore.boxClearData.row0 }}) → ({{ toolStore.boxClearData.col1 }}, {{ toolStore.boxClearData.row1 }})
              </span>
            </div>
            <span class="text-xs text-slate-500 font-mono">
              {{ $t('editor.cellsInArea', { count: toolStore.boxClearData.totalCells }) }}
            </span>
          </div>
        </div>

        <!-- Total Found Elements Counter -->
        <div class="flex items-center gap-2">
          <UiBadge variant="rose" size="md" class="flex items-center gap-2 font-mono shadow-xs px-3 py-1.5">
            <Package class="w-4 h-4 text-rose-400" />
            <span class="text-xs text-slate-300">{{ $t('editor.elementsFound') }}:</span>
            <strong class="text-rose-200 font-bold text-sm">{{ totalItemsInScope }}</strong>
          </UiBadge>
        </div>
      </div>

      <!-- 2. Layer Scope Selector -->
      <div class="flex flex-col gap-2">
        <label class="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
          <Layers class="w-4 h-4 text-emerald-400" />
          <span>{{ $t('editor.layerFilterLabel') }}</span>
        </label>
        
        <div class="flex items-center gap-2 flex-wrap">
          <!-- Active Layer Option -->
          <button
            type="button"
            class="px-4 py-2 rounded-xl text-xs font-semibold transition-all border shrink-0 flex items-center gap-2 cursor-pointer shadow-xs"
            :class="layerScope === 'active'
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60 shadow-emerald-500/10'
              : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'"
            @click="layerScope = 'active'"
          >
            <div 
              class="w-2.5 h-2.5 rounded-full shrink-0"
              :class="layerScope === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'"
            ></div>
            <span class="whitespace-nowrap">{{ $t('editor.activeLayerOnly') }}</span>
            <span class="font-normal text-slate-400 truncate max-w-32">({{ mapStore.activeLayer?.name || 'Active' }})</span>
            <span class="font-mono text-xs px-1.5 py-0.5 rounded-md bg-slate-950/80 text-slate-300 border border-slate-800/80 ml-1">
              {{ activeLayerItemsCount }}
            </span>
          </button>

          <!-- All Layers Option -->
          <button
            type="button"
            class="px-4 py-2 rounded-xl text-xs font-semibold transition-all border shrink-0 flex items-center gap-2 cursor-pointer shadow-xs"
            :class="layerScope === 'all'
              ? 'bg-brand-500/20 text-brand-300 border-brand-500/60 shadow-brand-500/10'
              : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'"
            @click="layerScope = 'all'"
          >
            <div 
              class="w-2.5 h-2.5 rounded-full shrink-0"
              :class="layerScope === 'all' ? 'bg-brand-400 animate-pulse' : 'bg-slate-600'"
            ></div>
            <span class="whitespace-nowrap">{{ $t('editor.allLayers') }}</span>
            <span class="font-mono text-xs px-1.5 py-0.5 rounded-md bg-slate-950/80 text-slate-300 border border-slate-800/80 ml-1">
              {{ toolStore.boxClearData.totalItems }}
            </span>
          </button>
        </div>
      </div>

      <!-- 3. Asset Selection Toolbar & Search Filter -->
      <div class="flex items-center justify-between gap-3 pt-3 border-t border-slate-800/80 flex-wrap">
        <!-- Summary Stats -->
        <div class="flex items-center gap-2 text-xs">
          <span class="font-semibold text-slate-300">
            {{ $t('editor.assetTypesCount', { count: availableAssets.length }) }}
          </span>
          <span class="text-slate-600">•</span>
          <span class="text-rose-300 font-mono font-medium">
            {{ $t('editor.selectedTypesCount', { count: selectedAssetIds.length }) }} ({{ $t('editor.totalItemsToDelete', { count: selectedItemsCount }) }})
          </span>
        </div>

        <!-- Toolbar Actions -->
        <div class="flex items-center gap-2">
          <!-- Search input if many assets -->
          <div v-if="availableAssets.length > 3" class="relative w-40">
            <Search class="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              v-model="searchQuery"
              type="text"
              :placeholder="$t('common.search')"
              class="w-full pl-8 pr-2.5 py-1 text-xs rounded-lg bg-slate-900/90 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-slate-600 transition-colors"
            />
          </div>

          <UiButton
            variant="ghost"
            size="xs"
            :leading-icon="CheckSquare"
            @click="selectAll"
          >
            {{ $t('editor.selectAll') }}
          </UiButton>
          <UiButton
            variant="ghost"
            size="xs"
            :leading-icon="Square"
            @click="deselectAll"
          >
            {{ $t('editor.deselectAll') }}
          </UiButton>
        </div>
      </div>

      <!-- 4. Asset Cards Grid -->
      <div v-if="filteredAssets.length > 0" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div
          v-for="asset in filteredAssets"
          :key="asset.assetId"
          class="p-3 rounded-xl border transition-all flex items-center gap-3.5 cursor-pointer select-none group"
          :class="isAssetSelected(asset.assetId)
            ? 'bg-rose-500/10 border-rose-500/50 shadow-xs shadow-rose-950/20'
            : 'bg-slate-900/60 border-slate-800/80 opacity-60 hover:opacity-100 hover:border-slate-700'"
          @click="toggleAsset(asset.assetId)"
        >
          <!-- Custom Checkbox Indicator -->
          <div 
            class="w-4.5 h-4.5 rounded-md border flex items-center justify-center shrink-0 transition-colors"
            :class="isAssetSelected(asset.assetId)
              ? 'bg-rose-500 border-rose-400 text-white shadow-xs'
              : 'border-slate-700 bg-slate-950/80 group-hover:border-slate-600'"
          >
            <Check v-if="isAssetSelected(asset.assetId)" class="w-3.5 h-3.5 stroke-[3]" />
          </div>

          <!-- Thumbnail Preview Image -->
          <div class="w-13 h-13 rounded-xl bg-slate-950/90 border border-slate-800 flex items-center justify-center shrink-0 overflow-hidden p-1.5 shadow-inner">
            <img 
              v-if="getAssetImage(asset)" 
              :src="getAssetImage(asset)" 
              :alt="asset.assetName"
              class="max-w-full max-h-full object-contain pixelated transition-transform group-hover:scale-105"
            />
            <Package v-else class="w-6 h-6 text-slate-600" />
          </div>

          <!-- Asset Info -->
          <div class="flex flex-col min-w-0 flex-1 gap-1">
            <span class="text-xs font-bold text-slate-200 truncate group-hover:text-white" :title="asset.assetName">
              {{ formatAssetName(asset.assetName) }}
            </span>
            <div class="flex items-center gap-1.5">
              <span class="text-[10px] font-medium text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700/50 truncate max-w-24">
                {{ asset.category }}
              </span>
            </div>
          </div>

          <!-- Item Quantity Badge in Box -->
          <div 
            class="shrink-0 font-mono text-xs font-bold px-2.5 py-1 rounded-lg border shadow-xs"
            :class="isAssetSelected(asset.assetId)
              ? 'bg-rose-500/25 text-rose-200 border-rose-500/40'
              : 'bg-slate-800/80 text-slate-400 border-slate-700/60'"
          >
            x{{ asset.totalCount }}
          </div>
        </div>
      </div>

      <!-- Empty Filter State -->
      <div v-else class="py-8 flex flex-col items-center justify-center text-center gap-2 text-slate-500">
        <Package class="w-8 h-8 opacity-40" />
        <span class="text-xs">{{ $t('common.noResults') }}</span>
      </div>

    </div>

    <!-- Modal Footer Actions -->
    <template #footer>
      <div class="flex items-center justify-between w-full gap-3">
        <UiButton
          variant="secondary"
          size="sm"
          @click="handleClose"
        >
          {{ $t('common.cancel') }}
        </UiButton>

        <UiButton
          variant="danger"
          size="sm"
          :leading-icon="Trash2"
          :disabled="selectedAssetIds.length === 0"
          @click="handleConfirmDelete"
        >
          {{ $t('editor.deleteSelectedCount', { count: selectedItemsCount }) }}
        </UiButton>
      </div>
    </template>
  </UiModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Trash2, Scan, Layers, Package, Check, CheckSquare, Square, Search } from 'lucide-vue-next'
import { UiModal, UiButton, UiBadge } from './ui'
import { useToolStore } from '../stores/toolStore'
import { useMapStore } from '../stores/mapStore'
import { useAssetStore } from '../stores/assetStore'
import { useNotificationStore } from '../stores/notificationStore'
import { useI18n } from '../stores/i18nStore'
import { BoxAssetSummary } from '../types/map'

const toolStore = useToolStore()
const mapStore = useMapStore()
const assetStore = useAssetStore()
const notify = useNotificationStore()
const { t } = useI18n()

// Scope: 'active' (active layer only) vs 'all' (all layers)
const layerScope = ref<'active' | 'all'>('active')

// Optional search filter
const searchQuery = ref('')

// Selected asset IDs to delete
const selectedAssetIds = ref<string[]>([])

// Get reactive sprite thumbnail preview from assetStore
function getAssetImage(asset: BoxAssetSummary): string {
  return assetStore.getAssetPreview(asset.assetId) || asset.previewSrc || ''
}

// Format asset name to clean readable title
function formatAssetName(name: string): string {
  if (!name) return ''
  return name.replace(/[_-]/g, ' ').replace(/\.png$/i, '')
}

// Compute available assets based on chosen scope
const availableAssets = computed<BoxAssetSummary[]>(() => {
  if (!toolStore.boxClearData) return []
  if (layerScope.value === 'all') {
    return toolStore.boxClearData.assets
  }
  const activeLayerData = toolStore.boxClearData.layerItems[mapStore.activeLayerId]
  return activeLayerData?.assets || []
})

// Search filtered list of assets
const filteredAssets = computed<BoxAssetSummary[]>(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return availableAssets.value
  return availableAssets.value.filter(a =>
    a.assetName.toLowerCase().includes(query) ||
    a.category.toLowerCase().includes(query) ||
    a.assetId.toLowerCase().includes(query)
  )
})

const activeLayerItemsCount = computed(() => {
  if (!toolStore.boxClearData) return 0
  const activeLayerData = toolStore.boxClearData.layerItems[mapStore.activeLayerId]
  return activeLayerData?.totalItems || 0
})

const totalItemsInScope = computed(() => {
  if (!toolStore.boxClearData) return 0
  if (layerScope.value === 'all') {
    return toolStore.boxClearData.totalItems
  }
  return activeLayerItemsCount.value
})

const selectedItemsCount = computed(() => {
  const set = new Set(selectedAssetIds.value)
  let count = 0
  for (const a of availableAssets.value) {
    if (set.has(a.assetId)) {
      count += a.totalCount
    }
  }
  return count
})

// When boxClearData opens or layerScope changes, select all available assets by default
watch(() => toolStore.boxClearData, (newData) => {
  if (newData) {
    searchQuery.value = ''
    selectedAssetIds.value = availableAssets.value.map(a => a.assetId)
  }
}, { immediate: true })

watch(layerScope, () => {
  selectedAssetIds.value = availableAssets.value.map(a => a.assetId)
})

function isAssetSelected(assetId: string): boolean {
  return selectedAssetIds.value.includes(assetId)
}

function toggleAsset(assetId: string) {
  if (selectedAssetIds.value.includes(assetId)) {
    selectedAssetIds.value = selectedAssetIds.value.filter(id => id !== assetId)
  } else {
    selectedAssetIds.value.push(assetId)
  }
}

function selectAll() {
  selectedAssetIds.value = availableAssets.value.map(a => a.assetId)
}

function deselectAll() {
  selectedAssetIds.value = []
}

function handleClose() {
  toolStore.closeBoxClearModal()
}

function handleConfirmDelete() {
  if (!toolStore.boxClearData || selectedAssetIds.value.length === 0) return

  const data = toolStore.boxClearData
  const targetLayers = layerScope.value === 'all'
    ? mapStore.project.layers.map(l => l.id)
    : [mapStore.activeLayerId]

  const count = mapStore.deleteElementsInBox(
    data.col0,
    data.row0,
    data.col1,
    data.row1,
    selectedAssetIds.value,
    targetLayers
  )

  if (count > 0) {
    notify.success(t('editor.boxClearedCount', { count }))
  }

  toolStore.closeBoxClearModal()
}
</script>
