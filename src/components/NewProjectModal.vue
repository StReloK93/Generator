<template>
  <div 
    v-if="toolStore.isNewProjectModalOpen"
    class="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 select-none"
  >
    <div class="glass-panel border border-slate-700/80 w-full max-w-xl rounded-3xl p-6 shadow-2xl flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200">
      <!-- Modal Header -->
      <div class="flex items-center justify-between border-b border-slate-800 pb-3.5">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-brand-600/30 border border-brand-500/40 flex items-center justify-center text-brand-400">
            <Sparkles class="w-5 h-5" />
          </div>
          <div>
            <h2 class="font-bold text-base text-slate-100">
              Yangi Izometrik Xarita Yaratish
            </h2>
            <p class="text-xs text-slate-400">
              Xarita o'lchami va plitka parametrlarini belgilang
            </p>
          </div>
        </div>
        <button 
          @click="toolStore.isNewProjectModalOpen = false"
          class="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Form Body -->
      <div class="flex flex-col gap-4">
        <!-- Project Name -->
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-semibold text-slate-300">Loyiha nomi</label>
          <input 
            v-model="projectName"
            type="text"
            placeholder="Masalan: O'rta asr shahri"
            class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-100 focus:outline-none focus:border-brand-500 transition-colors"
          />
        </div>

        <!-- Presets Selection -->
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-semibold text-slate-300">O'lcham shablonlari (Presets)</label>
          <div class="grid grid-cols-4 gap-2">
            <button 
              v-for="preset in presets"
              :key="preset.name"
              @click="applyPreset(preset)"
              :class="selectedPreset === preset.name ? 'border-brand-500 bg-brand-950/40 text-brand-300 shadow-glow-brand' : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'"
              class="border rounded-xl p-2.5 flex flex-col items-center justify-center gap-1 transition-all text-center"
            >
              <span class="text-xs font-bold">{{ preset.name }}</span>
              <span class="text-[10px] font-mono opacity-80">{{ preset.cols }}×{{ preset.rows }} katak</span>
            </button>
          </div>
        </div>

        <!-- Custom Grid Dimensions -->
        <div class="grid grid-cols-2 gap-3">
          <!-- Cols (Kenglik) -->
          <div class="flex flex-col gap-1">
            <div class="flex justify-between items-center text-xs">
              <span class="text-slate-300 font-medium">Ustunlar (Cols)</span>
              <span class="font-mono text-brand-400 font-semibold">{{ cols }} katak</span>
            </div>
            <input 
              v-model.number="cols"
              type="range"
              min="10"
              max="128"
              step="2"
              class="accent-brand-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
              @input="selectedPreset = 'Custom'"
            />
          </div>

          <!-- Rows (Balandlik) -->
          <div class="flex flex-col gap-1">
            <div class="flex justify-between items-center text-xs">
              <span class="text-slate-300 font-medium">Qatorlar (Rows)</span>
              <span class="font-mono text-brand-400 font-semibold">{{ rows }} katak</span>
            </div>
            <input 
              v-model.number="rows"
              type="range"
              min="10"
              max="128"
              step="2"
              class="accent-brand-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
              @input="selectedPreset = 'Custom'"
            />
          </div>
        </div>

        <!-- Tile Size Selection -->
        <div class="flex flex-col gap-1.5">
          <label class="text-xs font-semibold text-slate-300">Izometrik Plitka Nisbati (Tile Size)</label>
          <div class="grid grid-cols-3 gap-2">
            <button 
              v-for="size in tileSizes"
              :key="size.label"
              @click="setTileSize(size.w, size.h)"
              :class="tileWidth === size.w && tileHeight === size.h ? 'border-brand-500 bg-brand-950/40 text-brand-300' : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:border-slate-700'"
              class="border rounded-xl py-2 px-3 flex flex-col items-center justify-center gap-0.5 text-center transition-all"
            >
              <span class="text-xs font-bold">{{ size.label }}</span>
              <span class="text-[10px] font-mono text-slate-500">{{ size.w }}×{{ size.h }} px</span>
            </button>
          </div>
        </div>

        <!-- Background Color -->
        <div class="flex items-center justify-between p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div class="flex flex-col">
            <span class="text-xs font-semibold text-slate-200">Fon rangi</span>
            <span class="text-[10px] text-slate-400">Xarita orqa foni rangi</span>
          </div>
          <div class="flex items-center gap-2">
            <input 
              v-model="bgColor" 
              type="color" 
              class="w-8 h-8 rounded-lg bg-transparent border-0 cursor-pointer"
            />
            <span class="text-xs font-mono text-slate-400">{{ bgColor }}</span>
          </div>
        </div>
      </div>

      <!-- Action Buttons -->
      <div class="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
        <button 
          @click="toolStore.isNewProjectModalOpen = false"
          class="px-4 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800 text-xs font-semibold transition-colors"
        >
          Bekor qilish
        </button>
        <button 
          @click="handleCreateProject"
          class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-brand-600/30 transition-all active:scale-95 flex items-center gap-2"
        >
          <Check class="w-4 h-4" />
          <span>Loyihani Yaratish</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Sparkles, X, Check } from 'lucide-vue-next'
import { useMapStore } from '../stores/mapStore'
import { useToolStore } from '../stores/toolStore'

const mapStore = useMapStore()
const toolStore = useToolStore()

const projectName = ref<string>('Yangi Izometrik Karta')
const cols = ref<number>(60)
const rows = ref<number>(60)
const tileWidth = ref<number>(128)
const tileHeight = ref<number>(64)
const bgColor = ref<string>('#0d1322')
const showGrid = ref<boolean>(true)
const selectedPreset = ref<string>("O'rtacha (60x60)")

interface Preset {
  name: string
  cols: number
  rows: number
}

const presets: Preset[] = [
  { name: 'Kichik', cols: 30, rows: 30 },
  { name: "O'rtacha", cols: 60, rows: 60 },
  { name: 'Katta', cols: 90, rows: 90 },
  { name: 'Ulkan', cols: 120, rows: 120 },
]

const tileSizes = [
  { label: 'Standart (2:1)', w: 128, h: 64 },
  { label: 'Kichik (2:1)', w: 64, h: 32 },
  { label: 'Yuqori Sifat (HD)', w: 256, h: 128 },
]

function applyPreset(preset: Preset) {
  selectedPreset.value = preset.name
  cols.value = preset.cols
  rows.value = preset.rows
}

function setTileSize(w: number, h: number) {
  tileWidth.value = w
  tileHeight.value = h
}

function handleCreateProject() {
  mapStore.createNewProject({
    name: projectName.value || 'Yangi Izometrik Karta',
    cols: cols.value,
    rows: rows.value,
    tileWidth: tileWidth.value,
    tileHeight: tileHeight.value,
    bgColor: bgColor.value,
    showGrid: showGrid.value,
  })

  toolStore.showGrid = showGrid.value
  toolStore.isNewProjectModalOpen = false
}
</script>
