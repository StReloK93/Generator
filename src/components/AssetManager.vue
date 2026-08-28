<template>
  <aside 
    class="glass-panel border-l border-slate-800/80 flex flex-col z-20 transition-all duration-300 select-none overflow-hidden"
    :class="toolStore.isAssetManagerOpen ? 'w-80' : 'w-10'"
  >
    <!-- Collapsed Toggle Strip -->
    <div v-if="!toolStore.isAssetManagerOpen" class="h-full flex flex-col items-center py-4 gap-4">
      <button 
        @click="toolStore.isAssetManagerOpen = true"
        class="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
        title="Assetlar panelini ochish"
      >
        <ChevronLeft class="w-5 h-5" />
      </button>
      <div class="writing-mode-vertical text-xs font-semibold text-slate-500 uppercase tracking-widest mt-4">
        Assetlar ({{ assetStore.assets.length }})
      </div>
    </div>

    <!-- Expanded Asset Panel -->
    <div v-else class="flex flex-col h-full">
      <!-- Panel Header -->
      <div class="p-3.5 border-b border-slate-800 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <FolderOpen class="w-4 h-4 text-brand-400" />
          <h2 class="text-xs font-bold uppercase tracking-wider text-slate-200">
            Assetlar Galereyasi
          </h2>
          <span class="px-1.5 py-0.5 rounded-full bg-slate-800 text-[10px] font-mono text-slate-400">
            {{ assetStore.assets.length }}
          </span>
        </div>
        <button 
          @click="toolStore.isAssetManagerOpen = false"
          class="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          title="Panelni yopish"
        >
          <ChevronRight class="w-4 h-4" />
        </button>
      </div>

      <!-- Upload Actions & Dropzone -->
      <div class="p-3 border-b border-slate-800/80 flex flex-col gap-2">
        <div class="grid grid-cols-2 gap-2">
          <!-- Folder Upload Button -->
          <button 
            @click="triggerFolderUpload"
            class="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg bg-brand-600/20 hover:bg-brand-600/30 text-brand-300 border border-brand-500/40 text-xs font-medium transition-all shadow-sm group"
            title="Kompyuterdan butun bir papkani yuklash"
          >
            <FolderUp class="w-4 h-4 text-brand-400 group-hover:scale-110 transition-transform" />
            <span>Papka yuklash</span>
          </button>
          <input 
            ref="folderInputRef"
            type="file"
            webkitdirectory
            directory
            multiple
            class="hidden"
            @change="handleFolderSelect"
          />

          <!-- Files Upload Button -->
          <button 
            @click="triggerFilesUpload"
            class="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700/80 text-slate-300 border border-slate-700 text-xs font-medium transition-all group"
            title="Bir nechta rasm fayllarini yuklash"
          >
            <ImagePlus class="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span>Rasmlar</span>
          </button>
          <input 
            ref="filesInputRef"
            type="file"
            accept="image/*"
            multiple
            class="hidden"
            @change="handleFilesSelect"
          />
        </div>

        <!-- Drag & Drop Zone -->
        <div 
          @dragover.prevent="isDragging = true"
          @dragleave.prevent="isDragging = false"
          @drop.prevent="handleDrop"
          :class="isDragging ? 'border-brand-500 bg-brand-500/10' : 'border-slate-800 hover:border-slate-700 bg-slate-900/40'"
          class="border border-dashed rounded-lg p-2.5 flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors text-center"
          @click="triggerFilesUpload"
        >
          <UploadCloud class="w-4 h-4 text-slate-400" />
          <p class="text-[11px] text-slate-400">
            Papka yoki rasmlarni shu yerga tashlang
          </p>
        </div>

        <!-- Upload Progress Indicator -->
        <div v-if="assetStore.uploadProgress.active" class="flex flex-col gap-1 p-2 rounded bg-slate-900 border border-slate-800 text-xs">
          <div class="flex justify-between text-[11px] text-slate-300">
            <span>Rasmlar yuklanmoqda...</span>
            <span class="font-mono">{{ assetStore.uploadProgress.current }} / {{ assetStore.uploadProgress.total }}</span>
          </div>
          <div class="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div 
              class="bg-brand-500 h-full transition-all duration-150"
              :style="{ width: `${(assetStore.uploadProgress.current / Math.max(1, assetStore.uploadProgress.total)) * 100}%` }"
            ></div>
          </div>
        </div>
      </div>

      <!-- Search & Category Filters -->
      <div class="p-3 border-b border-slate-800/80 flex flex-col gap-2">
        <!-- Search Input -->
        <div class="relative">
          <Search class="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            v-model="assetStore.searchQuery"
            type="text"
            placeholder="Asset nomini qidirish..."
            class="w-full bg-slate-900/80 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
          />
        </div>

        <!-- Category Badges -->
        <div class="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          <button 
            v-for="cat in assetStore.categories"
            :key="cat"
            @click="assetStore.selectedCategory = cat"
            :class="assetStore.selectedCategory === cat ? 'bg-brand-600 text-white font-medium shadow-sm' : 'bg-slate-800/70 text-slate-400 hover:bg-slate-800 hover:text-slate-200'"
            class="px-2.5 py-1 rounded-md text-[11px] whitespace-nowrap transition-colors"
          >
            {{ cat }}
          </button>
        </div>
      </div>

      <!-- Asset Grid (With Drag & Drop support) -->
      <div class="flex-1 p-3 overflow-y-auto">
        <div v-if="assetStore.filteredAssets.length === 0" class="h-40 flex flex-col items-center justify-center text-center text-slate-500 gap-2">
          <ImageOff class="w-8 h-8 opacity-40" />
          <p class="text-xs">Hech qanday asset topilmadi</p>
        </div>

        <div v-else class="grid grid-cols-2 gap-2.5">
          <div 
            v-for="asset in assetStore.filteredAssets"
            :key="asset.id"
            draggable="true"
            @dragstart="(e) => handleAssetDragStart(e, asset)"
            @click="handleAssetClick(asset.id)"
            :class="assetStore.selectedAssetId === asset.id ? 'ring-2 ring-brand-500 border-brand-500 bg-brand-950/30' : 'border-slate-800/80 hover:border-slate-700 bg-slate-900/60'"
            class="group relative rounded-xl border p-2 flex flex-col items-center justify-between cursor-pointer transition-all duration-150 hover:shadow-lg active:scale-95"
            :title="`${asset.name} — Bosing yoki xaritaga Drag & Drop qiling`"
          >
            <!-- Asset Thumbnail Preview -->
            <div class="w-full h-24 rounded-lg bg-slate-950/80 checker-pattern flex items-center justify-center p-1.5 overflow-hidden relative">
              <img 
                :src="asset.src" 
                :alt="asset.name"
                class="max-w-full max-h-full object-contain filter drop-shadow-md group-hover:scale-105 transition-transform pointer-events-none"
                loading="lazy"
              />
              
              <!-- Category chip on thumbnail -->
              <span class="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-slate-900/90 border border-slate-800 text-[9px] text-slate-400 font-medium">
                {{ asset.category }}
              </span>

              <!-- Anchor Edit Button -->
              <button 
                @click.stop="openAnchorModal(asset)"
                class="absolute bottom-1 right-1 p-1 rounded bg-slate-900/90 border border-slate-700 text-slate-300 opacity-0 group-hover:opacity-100 hover:text-brand-400 transition-all"
                title="Tayanch nuqtasi (Anchor) sozlash"
              >
                <Crosshair class="w-3 h-3" />
              </button>
            </div>

            <!-- Asset Info -->
            <div class="w-full mt-2 flex items-center justify-between">
              <span class="text-[11px] font-medium text-slate-300 truncate" :title="asset.name">
                {{ asset.name }}
              </span>
              
              <!-- Delete Custom Asset -->
              <button 
                v-if="!asset.isSample"
                @click.stop="assetStore.deleteAsset(asset.id)"
                class="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-colors p-0.5"
                title="O'chirish"
              >
                <Trash2 class="w-3 h-3" />
              </button>
            </div>

            <div class="w-full flex items-center justify-between text-[10px] text-slate-500 font-mono mt-0.5">
              <span>{{ asset.width }}×{{ asset.height }}</span>
              <span>anc: {{ Math.round(asset.anchorY * 100) }}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer Info -->
      <div class="p-2.5 border-t border-slate-800/80 bg-slate-900/50 flex items-center justify-between text-[11px] text-slate-400">
        <span v-if="assetStore.selectedAsset" class="truncate max-w-[180px]">
          Tanlandi: <strong class="text-slate-200">{{ assetStore.selectedAsset.name }}</strong>
        </span>
        <span v-else>Asset tanlanmagan</span>

        <button 
          v-if="assetStore.assets.some(a => !a.isSample)"
          @click="assetStore.clearCustomAssets()"
          class="text-xs text-red-400/80 hover:text-red-400 transition-colors"
          title="Yuklangan assetlarni tozalash"
        >
          Tozalash
        </button>
      </div>
    </div>

    <!-- Anchor Adjust Modal Component -->
    <AnchorAdjustModal 
      v-if="selectedAssetForAnchor" 
      :asset="selectedAssetForAnchor" 
      @close="selectedAssetForAnchor = null"
      @save="handleAnchorSave"
    />
  </aside>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { 
  FolderOpen, FolderUp, ImagePlus, UploadCloud, 
  Search, ChevronLeft, ChevronRight, ImageOff, Crosshair, Trash2 
} from 'lucide-vue-next'
import { useAssetStore } from '../stores/assetStore'
import { useToolStore } from '../stores/toolStore'
import { AssetItem } from '../types/map'
import AnchorAdjustModal from './AnchorAdjustModal.vue'

const assetStore = useAssetStore()
const toolStore = useToolStore()

const folderInputRef = ref<HTMLInputElement | null>(null)
const filesInputRef = ref<HTMLInputElement | null>(null)
const isDragging = ref<boolean>(false)
const selectedAssetForAnchor = ref<AssetItem | null>(null)

function triggerFolderUpload() {
  folderInputRef.value?.click()
}

function triggerFilesUpload() {
  filesInputRef.value?.click()
}

async function handleFolderSelect(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    await assetStore.uploadFiles(target.files)
    target.value = ''
  }
}

async function handleFilesSelect(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    await assetStore.uploadFiles(target.files)
    target.value = ''
  }
}

async function handleDrop(event: DragEvent) {
  isDragging.value = false
  if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
    await assetStore.uploadFiles(event.dataTransfer.files)
  }
}

function handleAssetClick(assetId: string) {
  assetStore.selectAsset(assetId)
  if (toolStore.activeTool === 'eraser' || toolStore.activeTool === 'picker' || toolStore.activeTool === 'pan') {
    toolStore.setTool('brush')
  }
}

function handleAssetDragStart(event: DragEvent, asset: AssetItem) {
  if (!event.dataTransfer) return
  event.dataTransfer.setData('text/plain', asset.id)
  event.dataTransfer.setData('application/json', JSON.stringify({
    id: asset.id,
    name: asset.name,
  }))
  event.dataTransfer.effectAllowed = 'copy'
  assetStore.selectAsset(asset.id)
}

function openAnchorModal(asset: AssetItem) {
  selectedAssetForAnchor.value = asset
}

function handleAnchorSave(updates: { anchorX: number; anchorY: number; spanX: number; spanY: number; scale: number }) {
  if (selectedAssetForAnchor.value) {
    assetStore.updateAssetProperties(selectedAssetForAnchor.value.id, updates)
    selectedAssetForAnchor.value = null
  }
}
</script>

<style scoped>
.writing-mode-vertical {
  writing-mode: vertical-rl;
  text-orientation: mixed;
}
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
