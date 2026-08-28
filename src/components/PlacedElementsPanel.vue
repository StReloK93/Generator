<template>
  <aside 
    @mousedown.stop
    @mouseup.stop
    @click.stop
    @pointerdown.stop
    @wheel.stop
    class="glass-panel border-l border-slate-800/90 flex flex-col z-20 transition-all duration-300 select-none w-72 lg:w-80 h-full bg-dark-900/95 backdrop-blur-xl shadow-2xl"
    :class="{ 'w-12 !min-w-[48px]': isCollapsed }"
  >
    <!-- Collapsed Toggle Strip -->
    <div v-if="isCollapsed" class="h-full flex flex-col items-center py-4 gap-4">
      <button 
        @click="isCollapsed = false"
        class="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-brand-400 border border-slate-700 transition-all shadow-md"
        title="Obyektlar panelini ochish"
      >
        <ChevronLeft class="w-4 h-4" />
      </button>
      <div class="writing-mode-vertical text-xs font-bold text-slate-400 tracking-wider flex items-center gap-2">
        <Boxes class="w-3.5 h-3.5 text-brand-400" />
        <span>Kartadagi Obyektlar ({{ mapStore.allPlacedElements.length }})</span>
      </div>
    </div>

    <!-- Expanded Full Panel -->
    <div v-else class="flex flex-col h-full overflow-hidden">
      <!-- Header with Tabs & Collapse Button -->
      <div class="p-3 border-b border-slate-800 bg-slate-900/70 flex items-center justify-between">
        <!-- Tab Switcher -->
        <div class="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800/80">
          <button 
            @click="activeTab = 'elements'"
            :class="activeTab === 'elements' ? 'bg-brand-600 text-white font-bold shadow-sm' : 'text-slate-400 hover:text-slate-200'"
            class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all"
          >
            <Boxes class="w-3.5 h-3.5" />
            <span>Obyektlar ({{ mapStore.allPlacedElements.length }})</span>
          </button>
          <button 
            @click="activeTab = 'layers'"
            :class="activeTab === 'layers' ? 'bg-brand-600 text-white font-bold shadow-sm' : 'text-slate-400 hover:text-slate-200'"
            class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all"
          >
            <Layers class="w-3.5 h-3.5" />
            <span>Qatlamlar</span>
          </button>
        </div>

        <button 
          @click="isCollapsed = true"
          class="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          title="Yig‘ish"
        >
          <ChevronRight class="w-4 h-4" />
        </button>
      </div>

      <!-- TAB 1: PLACED ELEMENTS OUTLINER -->
      <div v-if="activeTab === 'elements'" class="flex-1 flex flex-col overflow-hidden p-3 gap-2">
        <!-- Search filter -->
        <div class="relative">
          <Search class="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input 
            v-model="searchQuery"
            type="text"
            placeholder="Obyektlarni qidirish..."
            class="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500"
          />
        </div>

        <!-- Elements List -->
        <div 
          v-if="filteredPlacedElements.length > 0"
          class="flex-1 overflow-y-auto flex flex-col gap-1.5 pr-0.5 custom-scrollbar"
        >
          <div 
            v-for="entry in filteredPlacedElements" 
            :key="entry.item.id"
            @click="handleSelectAndFocus(entry)"
            :class="toolStore.selectedElement?.itemId === entry.item.id ? 'border-brand-500 bg-brand-950/40 ring-1 ring-brand-500/50' : 'border-slate-800/80 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-850'"
            class="border rounded-xl p-2 flex items-center gap-2.5 cursor-pointer transition-all group"
          >
            <!-- Thumbnail -->
            <div class="w-9 h-9 rounded-lg bg-slate-950 checker-pattern flex items-center justify-center p-1 shrink-0 overflow-hidden shadow-inner">
              <img 
                :src="getAsset(entry.item.assetId)?.previewSrc || getAsset(entry.item.assetId)?.src" 
                :alt="getAsset(entry.item.assetId)?.name"
                class="max-w-full max-h-full object-contain filter drop-shadow group-hover:scale-105 transition-transform"
                loading="lazy"
              />
            </div>

            <!-- Meta details -->
            <div class="flex-1 min-w-0">
              <div class="text-xs font-semibold text-slate-200 truncate flex items-center justify-between">
                <span>{{ getAsset(entry.item.assetId)?.name || 'Element' }}</span>
                <span class="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-brand-300 font-bold">
                  Z: {{ entry.item.zIndex || 0 }}
                </span>
              </div>
              <div class="text-[10px] text-slate-400 font-mono flex items-center justify-between mt-0.5">
                <span class="text-emerald-400 font-semibold">X: {{ entry.col }}, Y: {{ entry.row }}</span>
                <span class="text-[9px] text-slate-500 truncate max-w-[80px]">{{ entry.layerName }}</span>
              </div>
            </div>

            <!-- Focus / Delete buttons on hover -->
            <div class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                @click.stop="handleFocusOnly(entry)"
                class="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-brand-400"
                title="Kartada markazlashtirish"
              >
                <Crosshair class="w-3.5 h-3.5" />
              </button>
              <button 
                @click.stop="handleDeleteItem(entry)"
                class="p-1 rounded hover:bg-red-950/60 text-slate-400 hover:text-red-400"
                title="O'chirish"
              >
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <!-- Empty state when map has 0 elements -->
        <div 
          v-else 
          class="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-800/80 rounded-2xl bg-slate-950/40 p-4 text-center"
        >
          <Boxes class="w-8 h-8 text-slate-600 mb-2" />
          <p class="text-xs font-bold text-slate-300">Hozircha obyektlar yo'q</p>
          <p class="text-[10px] text-slate-500 mt-1">Pastdagi paneldan asset tanlab kartaga bosing</p>
        </div>
      </div>

      <!-- TAB 2: LAYERS LIST -->
      <div v-else class="flex-1 overflow-hidden flex flex-col">
        <LayerPanel class="!border-0 !w-full !h-full" />
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { 
  Boxes, Layers, ChevronLeft, ChevronRight, 
  Search, Crosshair, Trash2 
} from 'lucide-vue-next'
import { useMapStore, PlacedElementEntry } from '../stores/mapStore'
import { useToolStore } from '../stores/toolStore'
import { useAssetStore } from '../stores/assetStore'
import LayerPanel from './LayerPanel.vue'

const emit = defineEmits<{
  (e: 'focus-cell', pos: { col: number; row: number }): void
}>()

const mapStore = useMapStore()
const toolStore = useToolStore()
const assetStore = useAssetStore()

const isCollapsed = ref(false)
const activeTab = ref<'elements' | 'layers'>('elements')
const searchQuery = ref('')

const filteredPlacedElements = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  return mapStore.allPlacedElements.filter(entry => {
    if (!query) return true
    const asset = getAsset(entry.item.assetId)
    const nameMatch = asset ? asset.name.toLowerCase().includes(query) : false
    const layerMatch = entry.layerName.toLowerCase().includes(query)
    const coordMatch = `${entry.col},${entry.row}`.includes(query)
    return nameMatch || layerMatch || coordMatch
  })
})

function getAsset(assetId: string) {
  return assetStore.assets.find(a => a.id === assetId) || null
}

function handleSelectAndFocus(entry: PlacedElementEntry) {
  toolStore.setSelectedElement({
    col: entry.col,
    row: entry.row,
    layerId: entry.layerId,
    itemId: entry.item.id,
  })
  emit('focus-cell', { col: entry.col, row: entry.row })
}

function handleFocusOnly(entry: PlacedElementEntry) {
  emit('focus-cell', { col: entry.col, row: entry.row })
}

function handleDeleteItem(entry: PlacedElementEntry) {
  mapStore.removeTileItem(entry.col, entry.row, entry.item.id, entry.layerId)
  if (toolStore.selectedElement?.itemId === entry.item.id) {
    toolStore.setSelectedElement(null)
  }
}
</script>

<style scoped>
.writing-mode-vertical {
  writing-mode: vertical-rl;
  text-orientation: mixed;
}
.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(15, 23, 42, 0.6);
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(56, 189, 248, 0.25);
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(56, 189, 248, 0.45);
}
</style>
