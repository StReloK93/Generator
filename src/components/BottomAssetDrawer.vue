<template>
  <div 
    @mousedown.stop
    @mouseup.stop
    @click.stop
    @pointerdown.stop
    @wheel.stop
    class="glass-panel border-t border-slate-800/90 z-20 transition-all duration-300 flex flex-col bg-dark-900/95 backdrop-blur-xl shadow-2xl"
    :class="isCollapsed ? 'h-11' : 'h-48 sm:h-52'"
  >
    <!-- Drawer Top Bar -->
    <div class="px-4 py-2 flex items-center justify-between border-b border-slate-800/80 bg-slate-900/60 select-none">
      <div class="flex items-center gap-3">
        <div class="flex items-center gap-2">
          <FolderOpen class="w-4 h-4 text-brand-400" />
          <span class="text-xs font-bold uppercase tracking-wider text-slate-200">
            Assetlar Galereyasi ({{ assetStore.assets.length }})
          </span>
        </div>

        <!-- Upload Buttons -->
        <div class="hidden sm:flex items-center gap-2 ml-3">
          <button 
            @click="triggerFolderUpload"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600/20 hover:bg-brand-600/30 text-brand-300 border border-brand-500/40 text-xs font-semibold transition-all shadow-sm active:scale-95"
            title="Butun boshli rasmlar papkasini yuklash"
          >
            <FolderUp class="w-3.5 h-3.5" />
            <span>Papka yuklash</span>
          </button>

          <button 
            @click="triggerFilesUpload"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition-all active:scale-95"
            title="Bir nechta rasm fayllarini yuklash"
          >
            <ImagePlus class="w-3.5 h-3.5" />
            <span>Rasmlar</span>
          </button>

          <button 
            v-if="assetStore.assets.length > 0"
            @click="assetStore.clearAllAssets()"
            class="px-2.5 py-1.5 rounded-lg text-red-400/70 hover:text-red-400 hover:bg-red-950/40 text-xs transition-colors ml-1"
            title="Barcha assetlarni tozalash"
          >
            Tozalash
          </button>
        </div>
      </div>

      <!-- Hidden file inputs -->
      <input 
        ref="folderInputRef"
        type="file"
        webkitdirectory
        directory
        multiple
        class="hidden"
        @change="handleFolderSelect"
      />
      <input 
        ref="filesInputRef"
        type="file"
        multiple
        accept="image/*,.png,.jpg,.jpeg,.webp,.svg"
        class="hidden"
        @change="handleFilesSelect"
      />

      <!-- Right controls / Search / Collapse toggle -->
      <div class="flex items-center gap-2.5">
        <!-- Search bar (when expanded) -->
        <div v-if="!isCollapsed" class="relative hidden md:block w-40 lg:w-52">
          <Search class="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input 
            v-model="assetStore.searchQuery"
            type="text"
            placeholder="Qidirish..."
            class="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-8 pr-2.5 py-1 text-xs placeholder-slate-500 focus:outline-none"
          />
        </div>

        <!-- Selected Asset Indicator -->
        <div v-if="assetStore.selectedAsset" class="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-brand-950/60 border border-brand-500/40 text-brand-300 text-xs">
          <span class="text-[10px] text-slate-400">Tanlandi:</span>
          <strong class="truncate max-w-30">{{ assetStore.selectedAsset.name }}</strong>
          <button 
            @click.stop="assetStore.selectAsset(null)"
            class="p-0.5 rounded hover:bg-brand-800/50 text-slate-400 hover:text-slate-200"
            title="Tanlovni bekor qilish"
          >
            <X class="w-3 h-3" />
          </button>
        </div>

        <!-- Collapse / Expand Toggle Button -->
        <button 
          @click="isCollapsed = !isCollapsed"
          class="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          :title="isCollapsed ? 'Panelni ochish' : 'Panelni yig‘ish'"
        >
          <ChevronUp v-if="isCollapsed" class="w-4 h-4" />
          <ChevronDown v-else class="w-4 h-4" />
        </button>
      </div>
    </div>

    <!-- Drawer Content (Horizontal Asset Shelf) -->
    <div v-if="!isCollapsed" class="flex-1 p-2.5 overflow-hidden flex flex-col gap-1.5 select-none">
      <!-- Assets Horizontal Scroll Container -->
      <div 
        v-if="assetStore.filteredAssets.length > 0"
        class="flex-1 flex items-center gap-2.5 overflow-x-auto overflow-y-hidden pb-1 px-1 custom-scrollbar"
      >
        <div 
          v-for="asset in assetStore.filteredAssets" 
          :key="asset.id"
          @click="handleAssetClick(asset.id)"
          draggable="true"
          @dragstart="(e) => handleAssetDragStart(e, asset)"
          :class="assetStore.selectedAssetId === asset.id ? 'border-brand-500 bg-brand-950/60 ring-2 ring-brand-500/60 scale-[1.02]' : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-850'"
          class="group relative flex flex-col items-center justify-between p-1.5 rounded-xl border w-28 h-28 sm:w-32 sm:h-32 shrink-0 cursor-pointer transition-all shadow-sm"
        >
          <!-- Asset Thumbnail Preview -->
          <div class="w-full flex-1 rounded-lg bg-slate-950 checker-pattern flex items-center justify-center p-1.5 overflow-hidden">
            <img 
              :src="asset.previewSrc || asset.src" 
              :alt="asset.name"
              class="max-w-full max-h-full object-contain filter drop-shadow hover:scale-105 transition-transform"
              loading="lazy"
            />
          </div>

          <!-- Name bar -->
          <!-- <div class="w-full text-center mt-1 px-1">
            <div class="text-[10px] font-semibold text-slate-300 truncate">
              {{ asset.name }}
            </div>
          </div> -->

          <!-- Quick Action Hover Buttons (Anchor / Delete) -->
          <div class="absolute top-1.5 right-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950/90 rounded-lg p-1 border border-slate-800 shadow-md">
            <button 
              @click.stop="openAnchorModal(asset)"
              class="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-brand-400"
              title="Anchor & O'lcham sozlash"
            >
              <Crosshair class="w-3.5 h-3.5" />
            </button>
            <button 
              @click.stop="assetStore.deleteAsset(asset.id)"
              class="p-1 rounded hover:bg-red-900/60 text-slate-400 hover:text-red-400"
              title="O'chirish"
            >
              <Trash2 class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <!-- Empty State / Upload Dropzone Prompt when no assets -->
      <div 
        v-else
        class="flex-1 flex items-center justify-center border-2 border-dashed border-slate-800/80 rounded-2xl bg-slate-950/40 p-4"
      >
        <div class="flex items-center gap-4 text-center">
          <div class="w-11 h-11 rounded-xl bg-brand-600/10 border border-brand-500/20 flex items-center justify-center text-brand-400 shrink-0">
            <UploadCloud class="w-5 h-5" />
          </div>
          <div class="text-left">
            <h4 class="text-xs font-bold text-slate-200">Assetlar yuklanmagan</h4>
            <p class="text-[11px] text-slate-400 mt-0.5">O'zingizning rasmlar papkangizni yoki fayllarni bu yerga yuklang</p>
          </div>
          <div class="flex items-center gap-2 ml-4">
            <button 
              @click="triggerFolderUpload"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md transition-all active:scale-95"
            >
              <FolderUp class="w-3.5 h-3.5" />
              <span>Papka yuklash</span>
            </button>
            <button 
              @click="triggerFilesUpload"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all active:scale-95"
            >
              <ImagePlus class="w-3.5 h-3.5" />
              <span>Rasmlar</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Anchor Adjust Modal Component -->
    <AnchorAdjustModal 
      v-if="selectedAssetForAnchor" 
      :asset="selectedAssetForAnchor" 
      @close="selectedAssetForAnchor = null"
      @save="handleAnchorSave"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { 
  FolderOpen, FolderUp, ImagePlus, UploadCloud, 
  Search, ChevronUp, ChevronDown, Crosshair, Trash2, X 
} from 'lucide-vue-next'
import { useAssetStore } from '../stores/assetStore'
import { useToolStore } from '../stores/toolStore'
import { AssetItem } from '../types/map'
import AnchorAdjustModal from './AnchorAdjustModal.vue'

const assetStore = useAssetStore()
const toolStore = useToolStore()

const isCollapsed = ref(false)
const folderInputRef = ref<HTMLInputElement | null>(null)
const filesInputRef = ref<HTMLInputElement | null>(null)
const selectedAssetForAnchor = ref<AssetItem | null>(null)

function triggerFolderUpload() {
  folderInputRef.value?.click()
}

function triggerFilesUpload() {
  filesInputRef.value?.click()
}

async function handleFolderSelect(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files && input.files.length > 0) {
    await assetStore.uploadFiles(input.files)
    input.value = ''
  }
}

async function handleFilesSelect(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files && input.files.length > 0) {
    await assetStore.uploadFiles(input.files)
    input.value = ''
  }
}

function handleAssetClick(assetId: string) {
  if (assetStore.selectedAssetId === assetId) {
    assetStore.selectAsset(null)
  } else {
    assetStore.selectAsset(assetId)
  }
}

function handleAssetDragStart(event: DragEvent, asset: AssetItem) {
  if (!event.dataTransfer) return
  event.dataTransfer.setData('text/plain', asset.id)
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
.custom-scrollbar::-webkit-scrollbar {
  height: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(15, 23, 42, 0.6);
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(99, 102, 241, 0.3);
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(99, 102, 241, 0.6);
}
</style>
