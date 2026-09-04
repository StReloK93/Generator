<template>
  <UiModal
    :is-open="!!toolStore.placementConflict"
    title="Cell Already Occupied"
    :subtitle="toolStore.placementConflict ? `Target Cell: X: ${toolStore.placementConflict.col}, Y: ${toolStore.placementConflict.row}` : ''"
    :icon="Layers"
    icon-color="brand"
    size="md"
    @close="cancel"
  >
    <!-- Comparison Preview Cards -->
    <div class="grid grid-cols-2 gap-3">
      <!-- Existing Items -->
      <UiCard variant="subtle" padding="sm" custom-class="flex flex-col items-center text-center">
        <span class="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Existing ({{ existingItems.length }})</span>
        <div class="w-16 h-16 rounded-xl bg-slate-950 checker-pattern flex items-center justify-center p-1 overflow-hidden my-1">
          <img 
            v-if="topExistingAsset"
            :src="topExistingAsset.previewSrc || topExistingAsset.src" 
            :alt="topExistingAsset.name" 
            class="max-w-full max-h-full object-contain filter drop-shadow"
          />
        </div>
        <span class="text-xs font-semibold text-slate-300 truncate w-full">
          {{ topExistingAsset?.name || 'Existing Element' }}
        </span>
      </UiCard>

      <!-- New Item to Place -->
      <UiCard variant="brand" padding="sm" custom-class="flex flex-col items-center text-center">
        <span class="text-[10px] uppercase font-bold text-brand-400 tracking-wider">New Element</span>
        <div class="w-16 h-16 rounded-xl bg-slate-950 checker-pattern flex items-center justify-center p-1 overflow-hidden my-1">
          <img 
            v-if="newAsset"
            :src="newAsset.previewSrc || newAsset.src" 
            :alt="newAsset.name" 
            class="max-w-full max-h-full object-contain filter drop-shadow"
          />
        </div>
        <span class="text-xs font-semibold text-brand-300 truncate w-full">
          {{ newAsset?.name || 'New Element' }}
        </span>
      </UiCard>
    </div>

    <!-- Placement Decision Buttons -->
    <div class="flex flex-col gap-2 pt-1">
      <!-- Option 1: Stack on Top (Recommended) -->
      <button 
        type="button"
        class="w-full p-3 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-brand-600/30 transition-all flex items-center justify-between group active:scale-95 cursor-pointer touch-target"
        @click="chooseStack"
      >
        <div class="flex items-center gap-2.5">
          <PlusCircle class="w-4 h-4 text-white shrink-0" />
          <div class="text-left">
            <div>Stack on Top</div>
            <div class="text-[10px] text-brand-200 font-normal">Places as a new layer on top (increases Z-Index)</div>
          </div>
        </div>
        <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-white/20 shrink-0">Recommended</span>
      </button>

      <!-- Option 2: Replace Existing -->
      <button 
        type="button"
        class="w-full p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-all flex items-center gap-2.5 active:scale-95 cursor-pointer touch-target"
        @click="chooseReplace"
      >
        <RefreshCw class="w-4 h-4 text-amber-400 shrink-0" />
        <div class="text-left">
          <div>Replace Existing</div>
          <div class="text-[10px] text-slate-400 font-normal">Removes existing element and replaces it with the new one</div>
        </div>
      </button>
    </div>

    <!-- Footer: Remember Choice & Cancel -->
    <template #footer>
      <div class="flex items-center justify-between w-full">
        <label class="text-[11px] text-slate-400 flex items-center gap-1.5 cursor-pointer">
          <input 
            v-model="rememberChoice"
            type="checkbox"
            class="accent-brand-500 w-3.5 h-3.5 rounded cursor-pointer"
          />
          <span>Remember my choice</span>
        </label>
        
        <UiButton
          variant="ghost"
          size="xs"
          @click="cancel"
        >
          Cancel
        </UiButton>
      </div>
    </template>
  </UiModal>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Layers, PlusCircle, RefreshCw } from 'lucide-vue-next'
import { UiModal, UiCard, UiButton } from './ui'
import { useMapStore } from '../stores/mapStore'
import { useToolStore } from '../stores/toolStore'
import { useAssetStore } from '../stores/assetStore'
import { TileItem } from '../types/map'

const mapStore = useMapStore()
const toolStore = useToolStore()
const assetStore = useAssetStore()

const rememberChoice = ref(false)

const conflict = computed(() => toolStore.placementConflict)

const existingItems = computed<TileItem[]>(() => {
  if (!conflict.value) return []
  return mapStore.getCellItems(conflict.value.col, conflict.value.row)
})

const topExistingAsset = computed(() => {
  const items = existingItems.value
  if (items.length === 0) return null
  const topItem = items[items.length - 1]
  return assetStore.assets.find(a => a.id === topItem.assetId) || null
})

const newAsset = computed(() => {
  if (!conflict.value) return null
  return assetStore.assets.find(a => a.id === conflict.value?.assetId) || null
})

function chooseStack() {
  if (!conflict.value) return
  const targetCol = conflict.value.col
  const targetRow = conflict.value.row
  const targetAssetId = conflict.value.assetId

  if (rememberChoice.value) {
    toolStore.placementMode = 'stack'
  }
  mapStore.setTile(targetCol, targetRow, targetAssetId, 'stack')
  toolStore.placementConflict = null
  assetStore.selectAsset(null)
}

function chooseReplace() {
  if (!conflict.value) return
  const targetCol = conflict.value.col
  const targetRow = conflict.value.row
  const targetAssetId = conflict.value.assetId

  if (rememberChoice.value) {
    toolStore.placementMode = 'replace'
  }
  mapStore.setTile(targetCol, targetRow, targetAssetId, 'replace')
  toolStore.placementConflict = null
  assetStore.selectAsset(null)
}

function cancel() {
  toolStore.placementConflict = null
  assetStore.selectAsset(null)
}
</script>
