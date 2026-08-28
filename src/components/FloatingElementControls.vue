<template>
  <div 
    v-if="selectedItem && cellItems.length > 0"
    @mousedown.stop
    @mouseup.stop
    @click.stop
    @pointerdown.stop
    class="fixed z-50 glass-panel border border-brand-500/70 rounded-2xl p-3.5 shadow-2xl flex flex-col gap-3 min-w-[310px] max-w-sm animate-in fade-in zoom-in-95 duration-150 select-none text-slate-200"
    :style="{
      left: `${screenPos.x}px`,
      top: `${screenPos.y - 12}px`,
      transform: 'translate(-50%, -100%)'
    }"
  >
    <!-- Header / Stack Elements Selector -->
    <div class="flex items-center justify-between border-b border-slate-800 pb-2">
      <div class="flex items-center gap-2">
        <Layers class="w-4 h-4 text-brand-400" />
        <span class="text-xs font-bold text-slate-200">
          Element Sozlamalari ({{ cellItems.length }} ta)
        </span>
      </div>
      <button 
        @click.stop="toolStore.setSelectedElement(null)"
        class="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
        title="Yopish (Esc)"
      >
        <X class="w-3.5 h-3.5" />
      </button>
    </div>

    <!-- Stack Tabs if cell has multiple elements -->
    <div v-if="cellItems.length > 1" class="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
      <button 
        v-for="(item, idx) in cellItems" 
        :key="item.id"
        @click.stop="selectItem(item.id)"
        :class="toolStore.selectedElement?.itemId === item.id ? 'bg-brand-600 text-white font-semibold shadow-sm' : 'bg-slate-800/80 text-slate-400 hover:bg-slate-800'"
        class="px-2 py-1 rounded-lg text-[11px] whitespace-nowrap flex items-center gap-1 transition-all"
      >
        <span>#{{ idx + 1 }} {{ getAssetName(item.assetId) }}</span>
        <span class="text-[9px] opacity-75 font-mono">(Z:{{ item.zIndex }})</span>
      </button>
    </div>

    <!-- Active Item Preview & Info -->
    <div class="flex items-center gap-2.5 p-2 rounded-xl bg-slate-900/80 border border-slate-800/80">
      <div class="w-11 h-11 rounded-lg bg-slate-950 checker-pattern flex items-center justify-center p-1 overflow-hidden shrink-0">
        <img 
          :src="currentAsset?.src" 
          :alt="currentAsset?.name" 
          class="max-w-full max-h-full object-contain filter drop-shadow"
          :style="{
            transform: `scaleX(${selectedItem.flipX ? -1 : 1}) rotate(${selectedItem.rotation || 0}deg)`
          }"
        />
      </div>
      <div class="flex-1 min-w-0">
        <div class="text-xs font-semibold text-slate-100 truncate">
          {{ currentAsset?.name || 'Element' }}
        </div>
        <div class="text-[10px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
          <span>Katak: {{ selectedItem.x }}, {{ selectedItem.y }}</span>
          <span class="text-brand-400 font-bold">Z-Index: {{ selectedItem.zIndex }}</span>
          <span class="text-emerald-400 font-bold">{{ selectedItem.spanX || 1 }}×{{ selectedItem.spanY || 1 }}</span>
        </div>
      </div>
    </div>

    <!-- Footprint / Katak o'lchami (Span) -->
    <div class="flex flex-col gap-1">
      <div class="flex justify-between items-center text-[11px]">
        <span class="text-slate-400 font-medium">Katak o'lchami (Span):</span>
        <span class="font-mono text-brand-300 font-semibold">{{ selectedItem.spanX || 1 }}×{{ selectedItem.spanY || 1 }} katak</span>
      </div>
      <div class="grid grid-cols-5 gap-1">
        <button 
          v-for="span in spans"
          :key="span.label"
          @click.stop="handleSetSpan(span.x, span.y)"
          :class="(selectedItem.spanX || 1) === span.x && (selectedItem.spanY || 1) === span.y ? 'bg-brand-600 text-white font-bold' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'"
          class="py-1 rounded-lg text-[10px] text-center border border-slate-700/80 transition-colors"
        >
          {{ span.label }}
        </button>
      </div>
    </div>

    <!-- Scaling Controls -->
    <div class="flex flex-col gap-1">
      <div class="flex justify-between items-center text-[11px]">
        <span class="text-slate-400 font-medium">Masshtab (Scale):</span>
        <span class="font-mono text-brand-300 font-semibold">{{ Math.round((selectedItem.scale || 1.0) * 100) }}%</span>
      </div>
      <div class="flex items-center gap-2">
        <button 
          @click.stop="adjustScale(-0.1)"
          class="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold w-7 text-center"
          title="Kichiklashtirish"
        >
          -
        </button>
        <input 
          type="range"
          min="0.3"
          max="3.0"
          step="0.05"
          :value="selectedItem.scale || 1.0"
          @input.stop="(e) => handleScaleInput(parseFloat((e.target as HTMLInputElement).value))"
          class="flex-1 accent-brand-500 cursor-pointer h-1.5 bg-slate-800 rounded"
        />
        <button 
          @click.stop="adjustScale(+0.1)"
          class="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold w-7 text-center"
          title="Kattalashtirish"
        >
          +
        </button>
        <button 
          @click.stop="handleScaleInput(1.0)"
          class="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 text-[10px]"
          title="100% asl o'lcham"
        >
          1x
        </button>
      </div>
    </div>

    <!-- Flip, Rotate & Z-Index Buttons -->
    <div class="grid grid-cols-4 gap-1.5 pt-1 text-xs">
      <!-- Flip Horizontal -->
      <button 
        @click.stop="handleFlip"
        class="flex flex-col items-center justify-center gap-1 p-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all group"
        title="Gorizontal burish (Flip)"
      >
        <FlipHorizontal class="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
        <span class="text-[10px]">Burish</span>
      </button>

      <!-- Rotate 90 deg -->
      <button 
        @click.stop="handleRotate"
        class="flex flex-col items-center justify-center gap-1 p-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all group"
        title="90° ga aylantirish"
      >
        <RotateCw class="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
        <span class="text-[10px]">90°</span>
      </button>

      <!-- Z-Index Bring Forward -->
      <button 
        @click.stop="handleBringForward"
        class="flex flex-col items-center justify-center gap-1 p-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all group"
        title="Z-Index oshirish (Oldinga chiqarish)"
      >
        <ArrowUpToLine class="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
        <span class="text-[10px]">Z+ Oldinga</span>
      </button>

      <!-- Z-Index Send Backward -->
      <button 
        @click.stop="handleSendBackward"
        class="flex flex-col items-center justify-center gap-1 p-2 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all group"
        title="Z-Index kamaytirish (Orqaga tushirish)"
      >
        <ArrowDownToLine class="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
        <span class="text-[10px]">Z- Orqaga</span>
      </button>
    </div>

    <!-- Secondary Actions (Move, Delete) -->
    <div class="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
      <!-- Move Tool -->
      <button 
        @click.stop="handleMoveMode"
        :class="toolStore.isMovingElement ? 'bg-brand-600 text-white shadow-glow-brand animate-pulse' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'"
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 text-xs font-semibold transition-all flex-1 justify-center"
        title="Boshqa katakka ko'chirish"
      >
        <Move class="w-3.5 h-3.5" />
        <span>{{ toolStore.isMovingElement ? 'Yangi katakni bosing' : 'Ko‘chirish' }}</span>
      </button>

      <!-- Delete Element -->
      <button 
        @click.stop="handleDelete"
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-950/50 hover:bg-red-900/80 text-red-300 border border-red-800/60 text-xs font-semibold transition-all"
        title="O'chirish"
      >
        <Trash2 class="w-3.5 h-3.5" />
        <span>O‘chirish</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { 
  Layers, X, FlipHorizontal, RotateCw, 
  ArrowUpToLine, ArrowDownToLine, Move, Trash2 
} from 'lucide-vue-next'
import { useMapStore } from '../stores/mapStore'
import { useToolStore } from '../stores/toolStore'
import { useAssetStore } from '../stores/assetStore'
import { TileItem } from '../types/map'

const props = defineProps<{
  screenPos: { x: number; y: number }
}>()

const mapStore = useMapStore()
const toolStore = useToolStore()
const assetStore = useAssetStore()

const spans = [
  { label: '1×1', x: 1, y: 1 },
  { label: '2×2', x: 2, y: 2 },
  { label: '3×3', x: 3, y: 3 },
  { label: '2×1', x: 2, y: 1 },
  { label: '1×2', x: 1, y: 2 },
]

const cellItems = computed<TileItem[]>(() => {
  if (!toolStore.selectedElement) return []
  return mapStore.getCellItems(toolStore.selectedElement.col, toolStore.selectedElement.row, toolStore.selectedElement.layerId)
})

const selectedItem = computed<TileItem | null>(() => {
  if (!toolStore.selectedElement) return null
  const items = cellItems.value
  return items.find(i => i.id === toolStore.selectedElement?.itemId) || items[items.length - 1] || null
})

const currentAsset = computed(() => {
  if (!selectedItem.value) return null
  return assetStore.assets.find(a => a.id === selectedItem.value?.assetId) || null
})

function getAssetName(assetId: string): string {
  const a = assetStore.assets.find(item => item.id === assetId)
  return a ? a.name : 'Element'
}

function selectItem(itemId: string) {
  if (toolStore.selectedElement) {
    toolStore.selectedElement.itemId = itemId
  }
}

function handleSetSpan(spanX: number, spanY: number) {
  if (!selectedItem.value || !toolStore.selectedElement) return
  mapStore.updateItemSpan(
    toolStore.selectedElement.col,
    toolStore.selectedElement.row,
    selectedItem.value.id,
    spanX,
    spanY,
    toolStore.selectedElement.layerId
  )
}

function handleScaleInput(scale: number) {
  if (!selectedItem.value || !toolStore.selectedElement) return
  mapStore.updateItemScale(
    toolStore.selectedElement.col,
    toolStore.selectedElement.row,
    selectedItem.value.id,
    scale,
    toolStore.selectedElement.layerId
  )
}

function adjustScale(delta: number) {
  if (!selectedItem.value) return
  const current = selectedItem.value.scale || 1.0
  handleScaleInput(current + delta)
}

function handleFlip() {
  if (!selectedItem.value || !toolStore.selectedElement) return
  mapStore.flipTileItem(
    toolStore.selectedElement.col, 
    toolStore.selectedElement.row, 
    selectedItem.value.id, 
    toolStore.selectedElement.layerId
  )
}

function handleRotate() {
  if (!selectedItem.value || !toolStore.selectedElement) return
  mapStore.rotateTileItem(
    toolStore.selectedElement.col, 
    toolStore.selectedElement.row, 
    selectedItem.value.id, 
    toolStore.selectedElement.layerId
  )
}

function handleBringForward() {
  if (!selectedItem.value || !toolStore.selectedElement) return
  mapStore.bringItemForward(
    toolStore.selectedElement.col, 
    toolStore.selectedElement.row, 
    selectedItem.value.id, 
    toolStore.selectedElement.layerId
  )
}

function handleSendBackward() {
  if (!selectedItem.value || !toolStore.selectedElement) return
  mapStore.sendItemBackward(
    toolStore.selectedElement.col, 
    toolStore.selectedElement.row, 
    selectedItem.value.id, 
    toolStore.selectedElement.layerId
  )
}

function handleMoveMode() {
  toolStore.isMovingElement = !toolStore.isMovingElement
}

function handleDelete() {
  if (!selectedItem.value || !toolStore.selectedElement) return
  const col = toolStore.selectedElement.col
  const row = toolStore.selectedElement.row
  const layerId = toolStore.selectedElement.layerId
  const itemId = selectedItem.value.id

  mapStore.removeTileItem(col, row, itemId, layerId)

  const remaining = mapStore.getCellItems(col, row, layerId)
  if (remaining.length > 0) {
    toolStore.selectedElement.itemId = remaining[remaining.length - 1].id
  } else {
    toolStore.setSelectedElement(null)
  }
}
</script>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
