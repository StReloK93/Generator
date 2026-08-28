<template>
  <div 
    class="absolute right-84 top-16 z-20 w-72 rounded-2xl glass-panel shadow-2xl border border-slate-800/90 flex flex-col select-none overflow-hidden transition-all duration-200"
    :class="toolStore.isLayerPanelOpen ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'"
  >
    <!-- Header -->
    <div class="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
      <div class="flex items-center gap-2">
        <Layers class="w-4 h-4 text-brand-400" />
        <h3 class="text-xs font-bold uppercase tracking-wider text-slate-200">
          Qatlamlar (Layers)
        </h3>
      </div>
      <div class="flex items-center gap-1">
        <button 
          @click="mapStore.addLayer()"
          class="p-1 rounded hover:bg-slate-800 text-brand-400 hover:text-brand-300 transition-colors"
          title="Yangi qatlam qo'shish"
        >
          <Plus class="w-4 h-4" />
        </button>
        <button 
          @click="toolStore.isLayerPanelOpen = false"
          class="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          title="Yopish"
        >
          <X class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Layers List -->
    <div class="p-2 flex flex-col gap-1.5 max-h-72 overflow-y-auto">
      <!-- Reverse iterate layers so higher layers appear on top -->
      <div 
        v-for="(layer, index) in reversedLayers" 
        :key="layer.id"
        @click="mapStore.activeLayerId = layer.id"
        :class="mapStore.activeLayerId === layer.id ? 'border-brand-500/80 bg-brand-950/30' : 'border-slate-800/80 hover:border-slate-700 bg-slate-900/40'"
        class="border rounded-xl p-2 flex flex-col gap-1.5 cursor-pointer transition-all duration-150"
      >
        <!-- Top Row: Visibility, Name, Lock, Actions -->
        <div class="flex items-center justify-between gap-2">
          <div class="flex items-center gap-2 flex-1 min-w-0">
            <!-- Visibility Button -->
            <button 
              @click.stop="mapStore.toggleLayerVisibility(layer.id)"
              class="text-slate-400 hover:text-slate-200 transition-colors"
              :title="layer.visible ? 'Qatlamni yashirish' : 'Qatlamni ko\'rsatish'"
            >
              <Eye v-if="layer.visible" class="w-4 h-4 text-emerald-400" />
              <EyeOff v-else class="w-4 h-4 text-slate-600" />
            </button>

            <!-- Inline Editable Layer Name -->
            <input 
              :value="layer.name"
              @change="(e) => mapStore.renameLayer(layer.id, (e.target as HTMLInputElement).value)"
              @click.stop
              class="bg-transparent text-xs font-medium text-slate-200 focus:outline-none focus:bg-slate-800/80 px-1 py-0.5 rounded truncate flex-1"
            />
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-1">
            <!-- Lock Button -->
            <button 
              @click.stop="mapStore.toggleLayerLock(layer.id)"
              class="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
              :title="layer.locked ? 'Qatlamni blokdan chiqarish' : 'Qatlamni bloklash'"
            >
              <Lock v-if="layer.locked" class="w-3.5 h-3.5 text-amber-400" />
              <Unlock v-else class="w-3.5 h-3.5 text-slate-500" />
            </button>

            <!-- Move Up -->
            <button 
              @click.stop="mapStore.moveLayer(layer.id, 'up')"
              class="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-slate-200 transition-colors"
              title="Yuqoriga ko'chirish"
            >
              <ArrowUp class="w-3 h-3" />
            </button>

            <!-- Move Down -->
            <button 
              @click.stop="mapStore.moveLayer(layer.id, 'down')"
              class="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-slate-200 transition-colors"
              title="Pastga ko'chirish"
            >
              <ArrowDown class="w-3 h-3" />
            </button>

            <!-- Delete Layer -->
            <button 
              v-if="mapStore.project.layers.length > 1"
              @click.stop="mapStore.removeLayer(layer.id)"
              class="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-red-400 transition-colors"
              title="Qatlamni o'chirish"
            >
              <Trash2 class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <!-- Bottom Row: Opacity slider & Placed tiles count -->
        <div class="flex items-center justify-between gap-3 text-[10px] text-slate-400 pt-1 border-t border-slate-800/40">
          <div class="flex items-center gap-1.5 flex-1" @click.stop>
            <span>Shaffoflik:</span>
            <input 
              type="range"
              min="0"
              max="1"
              step="0.05"
              :value="layer.opacity"
              @input="(e) => mapStore.setLayerOpacity(layer.id, parseFloat((e.target as HTMLInputElement).value))"
              class="flex-1 accent-brand-500 cursor-pointer h-1 bg-slate-800 rounded"
            />
            <span class="font-mono w-7 text-right">{{ Math.round(layer.opacity * 100) }}%</span>
          </div>

          <span class="font-mono text-slate-500">
            {{ Object.keys(layer.tiles).length }} ta
          </span>
        </div>
      </div>
    </div>

    <!-- Footer Action -->
    <div class="p-2 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs">
      <button 
        @click="mapStore.clearLayerTiles()"
        class="text-red-400/80 hover:text-red-400 text-[11px] transition-colors"
        title="Joriy faol qatlamdagi barcha plitkalarni tozalash"
      >
        Faol qatlamni tozalash
      </button>
      <span class="text-[11px] text-slate-500 font-mono">
        Jami: {{ mapStore.totalTilesCount }} plitka
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { 
  Layers, Plus, X, Eye, EyeOff, Lock, Unlock, 
  ArrowUp, ArrowDown, Trash2 
} from 'lucide-vue-next'
import { useMapStore } from '../stores/mapStore'
import { useToolStore } from '../stores/toolStore'

const mapStore = useMapStore()
const toolStore = useToolStore()

// Higher index layers render visually on top
const reversedLayers = computed(() => {
  return [...mapStore.project.layers].reverse()
})
</script>
