<template>
  <header class="h-12 sm:h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-2 sm:px-4 shrink-0 z-30 select-none shadow-md">
    <!-- Left: Brand / Home + Map Info -->
    <div class="flex items-center gap-2 sm:gap-3.5">
      <!-- Home Button -->
      <button 
        @click="router.push('/')"
        class="flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer border border-slate-700 active:scale-95 touch-target"
        title="Bosh sahifaga qaytish"
      >
        <Home class="w-4 h-4 text-brand-400" />
        <span class="hidden md:inline font-bold">Isocraft</span>
      </button>

      <div class="h-5 w-px bg-slate-800 hidden sm:block"></div>

      <!-- Current Map Name Display -->
      <div 
        class="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-bold text-slate-200"
        :title="mapStore.project.name || 'Nomsiz Karta'"
      >
        <span class="text-sm">🗺️</span>
        <span class="truncate max-w-[100px] sm:max-w-[130px]">{{ mapStore.project.name || 'Yangi Karta' }}</span>
      </div>

      <!-- New Map Action Button -->
      <button 
        @click="emit('open-welcome', 'new', false)"
        class="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl bg-brand-500/10 hover:bg-brand-500/20 text-brand-300 border border-brand-500/30 text-xs font-bold transition-all cursor-pointer active:scale-95"
        title="Yangi bo'sh xarita yaratish"
      >
        <Plus class="w-3.5 h-3.5" />
        <span class="hidden sm:inline">Yangi</span>
      </button>

      <!-- Import Map Action Button -->
      <button 
        @click="emit('open-welcome', 'import', false)"
        class="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-xl bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-bold transition-all cursor-pointer active:scale-95"
        title="Saqlangan loyiha faylini yuklash"
      >
        <Upload class="w-3.5 h-3.5" />
        <span class="hidden sm:inline">Yuklash</span>
      </button>

      <!-- Map Dimensions -->
      <div class="hidden xl:flex items-center gap-1.5 text-xs text-slate-400 font-mono bg-slate-950/60 px-2.5 py-1 rounded-lg border border-slate-800">
        <span>{{ mapStore.project.cols }}x{{ mapStore.project.rows }}</span>
        <span class="text-slate-600">|</span>
        <span>{{ mapStore.project.tileWidth }}x{{ mapStore.project.tileHeight }}px</span>
      </div>
    </div>

    <!-- Center: Quick Grid & View Toggles -->
    <div class="flex items-center gap-1 sm:gap-1.5">
      <!-- Grid Toggle -->
      <button 
        @click="toolStore.showGrid = !toolStore.showGrid"
        :class="toolStore.showGrid ? 'bg-brand-500/20 text-brand-300 border-brand-500/40' : 'text-slate-400 hover:text-white border-transparent hover:bg-slate-800'"
        class="p-1.5 sm:px-2.5 sm:py-1 rounded-lg border text-xs font-medium transition-colors cursor-pointer flex items-center gap-1"
        title="Setkani ko'rsatish/yashirish (Ctrl+G)"
      >
        <Grid class="w-3.5 h-3.5" />
        <span class="hidden md:inline text-[11px]">Setka</span>
      </button>

      <!-- Coordinates Toggle -->
      <button 
        @click="toolStore.showCoordinates = !toolStore.showCoordinates"
        :class="toolStore.showCoordinates ? 'bg-brand-500/20 text-brand-300 border-brand-500/40' : 'text-slate-400 hover:text-white border-transparent hover:bg-slate-800'"
        class="p-1.5 sm:px-2.5 sm:py-1 rounded-lg border text-xs font-medium transition-colors cursor-pointer flex items-center gap-1"
        title="Koordinatalarni ko'rsatish"
      >
        <Hash class="w-3.5 h-3.5" />
        <span class="hidden md:inline text-[11px]">Raqamlar</span>
      </button>

      <div class="h-4 w-px bg-slate-800 mx-1"></div>

      <!-- Undo -->
      <button 
        @click="mapStore.undo()"
        :disabled="!mapStore.canUndo"
        class="p-1.5 sm:p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
        title="Orqaga qaytarish (Ctrl+Z)"
      >
        <Undo2 class="w-3.5 h-3.5" />
      </button>

      <!-- Redo -->
      <button 
        @click="mapStore.redo()"
        :disabled="!mapStore.canRedo"
        class="p-1.5 sm:p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
        title="Oldinga qaytarish (Ctrl+Y)"
      >
        <Redo2 class="w-3.5 h-3.5" />
      </button>
    </div>

    <!-- Right: TD Hub Modal, Start Game, Export -->
    <div class="flex items-center gap-1.5 sm:gap-2">
      <!-- TD & Movement Settings Modal Button -->
      <button 
        @click="toolStore.isGameConfigModalOpen = !toolStore.isGameConfigModalOpen"
        :class="toolStore.isGameConfigModalOpen ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 ring-1 ring-amber-400/40 font-bold shadow-glow-brand' : 'text-slate-300 hover:text-white border-slate-700 bg-slate-800/80 hover:bg-slate-750'"
        class="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer shadow-sm active:scale-95"
        title="Minoralar, To'lqinlar va Harakat sozlamalari"
      >
        <ShieldAlert class="w-3.5 h-3.5 text-amber-400 shrink-0" />
        <span class="hidden sm:inline">TD Sozlamalar</span>
      </button>

      <!-- Design Gameplay Preview Button -->
      <button 
        @click="toolStore.isPreviewMode = !toolStore.isPreviewMode"
        :class="toolStore.isPreviewMode ? 'bg-indigo-600 text-white border-indigo-400 ring-2 ring-indigo-400/50 shadow-glow-brand font-bold' : 'text-slate-300 hover:text-white border-slate-700 bg-slate-800/80 hover:bg-slate-750'"
        class="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer shadow-sm active:scale-95"
        title="Dizayn ko'rinishi (O'yinda qanday ko'rinishini simulyatsiyasiz ko'rish)"
      >
        <Eye class="w-3.5 h-3.5 text-indigo-400 shrink-0" />
        <span class="hidden sm:inline">Ko'rinish</span>
      </button>

      <!-- Play Game Button (Navigates cleanly to /game) -->
      <button 
        @click="handleStartGame"
        class="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition-all active:scale-95 cursor-pointer"
        title="O'yin rejimiga o'tish (Hozirgi xaritada o'ynash)"
      >
        <Gamepad2 class="w-4 h-4 shrink-0" />
        <span class="font-bold">O'ynash</span>
      </button>

      <!-- Export Button -->
      <button 
        @click="toolStore.isExportModalOpen = true; emit('open-export')"
        class="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-medium shadow-md shadow-brand-600/30 transition-all active:scale-95 cursor-pointer"
        title="Rasmni yoki JSONni yuklab olish"
      >
        <Download class="w-3.5 h-3.5 shrink-0" />
        <span class="hidden sm:inline">Eksport</span>
      </button>

      <!-- Help Button -->
      <button 
        @click="toolStore.isShortcutsModalOpen = true"
        class="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors hidden sm:block"
        title="Klaviatura tugmalari (Yordam)"
      >
        <HelpCircle class="w-4 h-4" />
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { 
  Home, Grid, Hash, Undo2, Redo2, Download, ShieldAlert, Gamepad2, HelpCircle, Plus, Upload, Eye 
} from 'lucide-vue-next'
import { useMapStore } from '../../stores/mapStore'
import { useToolStore } from '../../stores/toolStore'

const router = useRouter()
const mapStore = useMapStore()
const toolStore = useToolStore()

const emit = defineEmits<{
  (e: 'open-welcome', mode?: 'new' | 'import', forced?: boolean): void
  (e: 'open-export'): void
}>()

function handleStartGame() {
  router.push('/game')
}
</script>
