<template>
  <div 
    v-if="toolStore.placementConflict"
    @mousedown.stop
    @mouseup.stop
    @click.stop
    @pointerdown.stop
    @wheel.stop
    class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 select-none animate-in fade-in duration-150"
  >
    <div 
      @mousedown.stop
      @mouseup.stop
      @click.stop
      @pointerdown.stop
      class="glass-panel border border-brand-500/50 w-full max-w-md rounded-3xl p-5 shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200"
    >
      <!-- Modal Header -->
      <div class="flex items-center justify-between border-b border-slate-800 pb-3">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-xl bg-brand-500/20 text-brand-400 flex items-center justify-center">
            <Layers class="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 class="font-bold text-sm text-slate-100">
              Katakda element mavjud
            </h3>
            <p class="text-[11px] text-slate-400">
              Katak: <strong class="text-slate-300">X: {{ toolStore.placementConflict.col }}, Y: {{ toolStore.placementConflict.row }}</strong>
            </p>
          </div>
        </div>
        <button 
          @click="cancel"
          class="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <!-- Comparison Preview Cards -->
      <div class="grid grid-cols-2 gap-3">
        <!-- Existing Items -->
        <div class="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col items-center gap-2 text-center">
          <span class="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Mavjud ({{ existingItems.length }} ta)</span>
          <div class="w-16 h-16 rounded-xl bg-slate-950 checker-pattern flex items-center justify-center p-1 overflow-hidden">
            <img 
              v-if="topExistingAsset"
              :src="topExistingAsset.previewSrc || topExistingAsset.src" 
              :alt="topExistingAsset.name" 
              class="max-w-full max-h-full object-contain filter drop-shadow"
            />
          </div>
          <span class="text-xs font-semibold text-slate-300 truncate w-full">
            {{ topExistingAsset?.name || 'Mavjud element' }}
          </span>
        </div>

        <!-- New Item to Place -->
        <div class="p-3 rounded-2xl bg-brand-950/30 border border-brand-500/40 flex flex-col items-center gap-2 text-center shadow-glow-brand">
          <span class="text-[10px] uppercase font-bold text-brand-400 tracking-wider">Yangi element</span>
          <div class="w-16 h-16 rounded-xl bg-slate-950 checker-pattern flex items-center justify-center p-1 overflow-hidden">
            <img 
              v-if="newAsset"
              :src="newAsset.previewSrc || newAsset.src" 
              :alt="newAsset.name" 
              class="max-w-full max-h-full object-contain filter drop-shadow"
            />
          </div>
          <span class="text-xs font-semibold text-brand-300 truncate w-full">
            {{ newAsset?.name || 'Yangi element' }}
          </span>
        </div>
      </div>

      <!-- Placement Decision Buttons -->
      <div class="flex flex-col gap-2 pt-1">
        <!-- Option 1: Stack on Top (Recommended) -->
        <button 
          @click.stop="chooseStack"
          class="w-full p-3 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-brand-600/30 transition-all flex items-center justify-between group active:scale-95"
        >
          <div class="flex items-center gap-2.5">
            <PlusCircle class="w-4 h-4 text-white" />
            <div class="text-left">
              <div>Ustiga qo'yish (Stack)</div>
              <div class="text-[10px] text-brand-200 font-normal">Yangi qavat qilib ustiga joylashtiradi (Z-Index oshadi)</div>
            </div>
          </div>
          <span class="text-[10px] font-bold px-2 py-0.5 rounded bg-white/20">Tavsiya</span>
        </button>

        <!-- Option 2: Replace Existing -->
        <button 
          @click.stop="chooseReplace"
          class="w-full p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-all flex items-center gap-2.5 active:scale-95"
        >
          <RefreshCw class="w-4 h-4 text-amber-400" />
          <div class="text-left">
            <div>Almashtirish (Replace)</div>
            <div class="text-[10px] text-slate-400 font-normal">Mavjud elementni o'chirib, o'rniga yangisini qo'yadi</div>
          </div>
        </button>
      </div>

      <!-- Remember Choice / Preference -->
      <div class="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
        <label class="text-[11px] text-slate-400 flex items-center gap-1.5 cursor-pointer">
          <input 
            v-model="rememberChoice"
            type="checkbox"
            class="accent-brand-500 w-3.5 h-3.5 rounded cursor-pointer"
          />
          <span>Tanlovni eslab qolish</span>
        </label>
        <button 
          @click="cancel"
          class="text-xs text-slate-400 hover:text-slate-200 transition-colors"
        >
          Bekor qilish
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Layers, X, PlusCircle, RefreshCw } from 'lucide-vue-next'
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
