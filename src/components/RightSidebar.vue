<template>
  <aside 
    @mousedown.stop
    @mouseup.stop
    @click.stop
    @pointerdown.stop
    @wheel.stop
    class="glass-panel border-l border-slate-800/90 flex flex-col z-20 transition-all duration-300 select-none w-80 md:w-88 lg:w-96 h-full bg-dark-900/95 backdrop-blur-xl shadow-2xl overflow-hidden max-w-[95vw] md:relative absolute inset-y-0 right-0"
    :class="{ 'w-10 sm:w-12 !min-w-[40px] sm:!min-w-[48px] !relative': isCollapsed }"
  >
    <!-- Collapsed Toggle Strip -->
    <div v-if="isCollapsed" class="h-full flex flex-col items-center py-4 justify-between">
      <button 
        @click="isCollapsed = false"
        class="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-brand-400 border border-slate-700 transition-all shadow-md cursor-pointer"
        title="O'ng panelni ochish"
      >
        <ChevronLeft class="w-4 h-4" />
      </button>

      <div class="writing-mode-vertical text-xs font-bold text-slate-400 tracking-wider flex items-center gap-2">
        <Boxes class="w-3.5 h-3.5 text-brand-400" />
        <span>Obyektlar & Assetlar ({{ mapStore.allPlacedElements.length }} / {{ assetStore.assets.length }})</span>
      </div>

      <button 
        @click="isCollapsed = false"
        class="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-all cursor-pointer"
        title="Ochish"
      >
        <FolderOpen class="w-4 h-4 text-brand-400" />
      </button>
    </div>

    <!-- Expanded Right Sidebar with 40% / 60% Split -->
    <div v-else class="flex flex-col h-full overflow-hidden">
      
      <!-- ========================================================================= -->
      <!-- TOP SECTION: 40% OBJECTS & LAYERS DRIVER                                  -->
      <!-- ========================================================================= -->
      <div class="h-[40%] min-h-[160px] flex flex-col border-b border-slate-800/90 bg-slate-900/40 overflow-hidden shrink-0">
        
        <!-- Top Driver Header & Tab Switcher -->
        <div class="p-2.5 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between shrink-0">
          <div class="flex items-center gap-1 bg-slate-950/80 p-0.5 rounded-xl border border-slate-800">
            <!-- Objects Tab -->
            <button 
              @click="activeTopTab = 'elements'"
              :class="activeTopTab === 'elements' ? 'bg-brand-600 text-white font-bold shadow-sm' : 'text-slate-400 hover:text-slate-200'"
              class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer"
            >
              <Boxes class="w-3.5 h-3.5" />
              <span>Obyektlar ({{ mapStore.allPlacedElements.length }})</span>
            </button>

            <!-- Layers Tab -->
            <button 
              @click="activeTopTab = 'layers'"
              :class="activeTopTab === 'layers' ? 'bg-brand-600 text-white font-bold shadow-sm' : 'text-slate-400 hover:text-slate-200'"
              class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer"
            >
              <Layers class="w-3.5 h-3.5" />
              <span>Qatlamlar ({{ mapStore.project.layers.length }})</span>
            </button>
          </div>

          <!-- Collapse Panel Button -->
          <button 
            @click="isCollapsed = true"
            class="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            title="Panelni yig'ish"
          >
            <ChevronRight class="w-4 h-4" />
          </button>
        </div>

        <!-- TAB 1: PLACED OBJECTS OUTLINER -->
        <div v-if="activeTopTab === 'elements'" class="flex-1 flex flex-col overflow-hidden p-2.5 gap-2">
          <!-- Search filter -->
          <div class="relative shrink-0">
            <Search class="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input 
              v-model="elementSearchQuery"
              type="text"
              placeholder="Obyektlarni qidirish..."
              class="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-8 pr-2.5 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          <!-- Placed Elements List -->
          <div 
            v-if="filteredPlacedElements.length > 0"
            class="flex-1 overflow-y-auto flex flex-col gap-1.5 pr-0.5 custom-scrollbar"
          >
            <div 
              v-for="entry in filteredPlacedElements" 
              :key="entry.item.id"
              @click="handleSelectAndFocus(entry)"
              :class="toolStore.selectedElement?.itemId === entry.item.id ? 'border-brand-500 bg-brand-950/40 ring-1 ring-brand-500/50' : 'border-slate-800/80 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-850'"
              class="border rounded-xl p-1.5 flex items-center gap-2 cursor-pointer transition-all group shrink-0"
            >
              <!-- Thumbnail -->
              <div class="w-8 h-8 rounded-lg bg-slate-950 checker-pattern flex items-center justify-center p-1 shrink-0 overflow-hidden shadow-inner">
                <img 
                  :src="getAsset(entry.item.assetId)?.previewSrc || getAsset(entry.item.assetId)?.src" 
                  :alt="getAsset(entry.item.assetId)?.name"
                  class="max-w-full max-h-full object-contain filter drop-shadow group-hover:scale-105 transition-transform"
                  loading="lazy"
                />
              </div>

              <!-- Meta details -->
              <div class="flex-1 min-w-0">
                <div class="text-[11px] font-semibold text-slate-200 truncate flex items-center justify-between">
                  <span class="truncate">{{ getAsset(entry.item.assetId)?.name || 'Element' }}</span>
                  <span class="text-[9px] font-mono px-1 rounded bg-slate-800 text-brand-300 font-bold shrink-0 ml-1">
                    Z:{{ entry.item.zIndex || 0 }}
                  </span>
                </div>
                <div class="text-[9px] text-slate-400 font-mono flex items-center justify-between mt-0.5">
                  <span class="text-emerald-400 font-semibold">X:{{ entry.col }}, Y:{{ entry.row }}</span>
                  <span class="text-[9px] text-slate-500 truncate max-w-[90px]">{{ entry.layerName }}</span>
                </div>
              </div>

              <!-- Focus / Delete buttons on hover -->
              <div class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button 
                  @click.stop="handleFocusOnly(entry)"
                  class="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-brand-400 cursor-pointer"
                  title="Xaritada ko'rish"
                >
                  <Crosshair class="w-3.5 h-3.5" />
                </button>
                <button 
                  @click.stop="handleDeleteItem(entry)"
                  class="p-1 rounded hover:bg-red-950/60 text-slate-400 hover:text-red-400 cursor-pointer"
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
            class="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-800/80 rounded-xl bg-slate-950/40 p-3 text-center"
          >
            <Boxes class="w-6 h-6 text-slate-600 mb-1" />
            <p class="text-[11px] font-bold text-slate-300">Obyektlar yo'q</p>
            <p class="text-[10px] text-slate-500 mt-0.5">Quyidagi galereyadan rasm tanlab xaritaga qo'ying</p>
          </div>
        </div>

        <!-- TAB 2: LAYERS LIST -->
        <div v-else class="flex-1 overflow-hidden flex flex-col p-2 gap-1.5 custom-scrollbar">
          <!-- Add Layer Action Row -->
          <div class="flex items-center justify-between px-1 shrink-0">
            <span class="text-[11px] font-semibold text-slate-300">Qatlamlar Ro'yxati</span>
            <button 
              @click="mapStore.addLayer()"
              class="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-brand-600/30 hover:bg-brand-600/50 text-brand-300 text-[10px] font-semibold border border-brand-500/40 transition-all cursor-pointer"
            >
              <Plus class="w-3 h-3" />
              <span>Yangi Qatlam</span>
            </button>
          </div>

          <!-- Scrollable Layer Items -->
          <div class="flex-1 overflow-y-auto flex flex-col gap-1.5 custom-scrollbar pr-0.5">
            <div 
              v-for="layer in reversedLayers" 
              :key="layer.id"
              @click="mapStore.activeLayerId = layer.id"
              :class="mapStore.activeLayerId === layer.id ? 'border-brand-500/80 bg-brand-950/40 ring-1 ring-brand-500/50' : 'border-slate-800/80 hover:border-slate-700 bg-slate-900/50'"
              class="border rounded-xl p-1.5 flex flex-col gap-1 cursor-pointer transition-all shrink-0"
            >
              <div class="flex items-center justify-between gap-1.5">
                <div class="flex items-center gap-1.5 flex-1 min-w-0">
                  <button 
                    @click.stop="mapStore.toggleLayerVisibility(layer.id)"
                    class="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                    :title="layer.visible ? 'Qatlamni yashirish' : 'Qatlamni ko\'rsatish'"
                  >
                    <Eye v-if="layer.visible" class="w-3.5 h-3.5 text-emerald-400" />
                    <EyeOff v-else class="w-3.5 h-3.5 text-slate-600" />
                  </button>

                  <input 
                    :value="layer.name"
                    @change="(e) => mapStore.renameLayer(layer.id, (e.target as HTMLInputElement).value)"
                    @click.stop
                    class="bg-transparent text-[11px] font-semibold text-slate-200 focus:outline-none focus:bg-slate-800/80 px-1 py-0.5 rounded truncate flex-1"
                  />
                </div>

                <div class="flex items-center gap-0.5 shrink-0">
                  <button 
                    @click.stop="mapStore.toggleLayerLock(layer.id)"
                    class="p-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer"
                    :title="layer.locked ? 'Qatlamni ochish' : 'Qatlamni qulflash'"
                  >
                    <Lock v-if="layer.locked" class="w-3 h-3 text-amber-400" />
                    <Unlock v-else class="w-3 h-3 text-slate-500" />
                  </button>
                  <button 
                    @click.stop="mapStore.moveLayer(layer.id, 'up')"
                    class="p-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer"
                    title="Yuqoriga"
                  >
                    <ArrowUp class="w-3 h-3" />
                  </button>
                  <button 
                    @click.stop="mapStore.moveLayer(layer.id, 'down')"
                    class="p-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer"
                    title="Pastga"
                  >
                    <ArrowDown class="w-3 h-3" />
                  </button>
                  <button 
                    v-if="mapStore.project.layers.length > 1"
                    @click.stop="mapStore.removeLayer(layer.id)"
                    class="p-0.5 rounded hover:bg-red-950/60 text-slate-500 hover:text-red-400 cursor-pointer"
                    title="O'chirish"
                  >
                    <Trash2 class="w-3 h-3" />
                  </button>
                </div>
              </div>

              <!-- Layer Opacity -->
              <div class="flex items-center justify-between gap-2 text-[9px] text-slate-400 pt-0.5 border-t border-slate-800/50">
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
                  <span class="font-mono w-6 text-right">{{ Math.round(layer.opacity * 100) }}%</span>
                </div>
                <span class="font-mono text-slate-500">{{ Object.keys(layer.tiles).length }} ta</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ========================================================================= -->
      <!-- BOTTOM SECTION: 60% ASSET GALLERY                                         -->
      <!-- ========================================================================= -->
      <div class="h-[60%] flex flex-col bg-dark-950/70 overflow-hidden flex-1">
        
        <!-- Gallery Header & Actions -->
        <div class="p-2.5 border-b border-slate-800/90 bg-slate-900/90 flex flex-col gap-2 shrink-0">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <FolderOpen class="w-4 h-4 text-brand-400" />
              <span class="text-xs font-bold text-slate-200">
                Assetlar Galereyasi
              </span>
              <span class="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] font-mono text-brand-400 font-bold">
                {{ assetStore.assets.length }}
              </span>
            </div>

            <!-- Upload Action Buttons -->
            <div class="flex items-center gap-1">
              <button 
                @click="triggerFolderUpload"
                class="flex items-center gap-1 px-2 py-1 rounded-lg bg-brand-600/20 hover:bg-brand-600/30 text-brand-300 border border-brand-500/40 text-[10px] font-semibold transition-all active:scale-95 cursor-pointer"
                title="Butun rasmlar papkasini yuklash"
              >
                <FolderUp class="w-3 h-3" />
                <span>Papka</span>
              </button>

              <button 
                @click="triggerFilesUpload"
                class="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[10px] font-semibold transition-all active:scale-95 cursor-pointer"
                title="Rasm fayllarini yuklash"
              >
                <ImagePlus class="w-3 h-3 text-emerald-400" />
                <span>Rasmlar</span>
              </button>

              <button 
                v-if="assetStore.assets.length > 0"
                @click="assetStore.clearAllAssets()"
                class="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-950/40 text-[10px] transition-colors cursor-pointer"
                title="Barcha assetlarni tozalash"
              >
                <Trash2 class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <!-- Hidden Upload Inputs -->
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

          <!-- Search Filter -->
          <div class="flex items-center gap-1.5">
            <div class="relative flex-1">
              <Search class="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input 
                v-model="assetStore.searchQuery"
                type="text"
                placeholder="Asset nomini qidirish..."
                class="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-8 pr-2.5 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>
        </div>

        <!-- Scrollable Asset Grid -->
        <div class="flex-1 p-2.5 overflow-y-auto overflow-x-hidden custom-scrollbar">
          <div 
            v-if="assetStore.filteredAssets.length > 0"
            class="grid grid-cols-3 sm:grid-cols-4 gap-2"
          >
            <div 
              v-for="asset in assetStore.filteredAssets" 
              :key="asset.id"
              @click="handleAssetClick(asset.id)"
              draggable="true"
              @dragstart="(e) => handleAssetDragStart(e, asset)"
              :class="assetStore.selectedAssetId === asset.id ? 'border-brand-500 bg-brand-950/70 ring-2 ring-brand-500/80 scale-[1.03]' : 'border-slate-800/90 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-850'"
              class="group relative flex flex-col items-center justify-between p-1.5 rounded-xl border aspect-square cursor-pointer transition-all shadow-sm"
              :title="asset.name"
            >
              <!-- Thumbnail -->
              <div class="w-full flex-1 rounded-lg bg-slate-950 checker-pattern flex items-center justify-center p-1 overflow-hidden">
                <img 
                  :src="asset.previewSrc || asset.src" 
                  :alt="asset.name"
                  class="max-w-full max-h-full object-contain filter drop-shadow group-hover:scale-110 transition-transform"
                  loading="lazy"
                />
              </div>

              <!-- Name -->
              <div class="w-full text-center mt-1 px-0.5">
                <span class="text-[9px] font-medium text-slate-300 truncate block">
                  {{ asset.name.replace(/\.png|\.jpg|\.webp/gi, '') }}
                </span>
              </div>

              <!-- Quick Hover Actions (Anchor & Delete) -->
              <div class="absolute top-1 right-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950/90 rounded-lg p-0.5 border border-slate-800 shadow-md">
                <button 
                  @click.stop="openAnchorModal(asset)"
                  class="p-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-brand-400 cursor-pointer"
                  title="Anchor & O'lcham sozlash"
                >
                  <Crosshair class="w-3 h-3" />
                </button>
                <button 
                  @click.stop="assetStore.deleteAsset(asset.id)"
                  class="p-0.5 rounded hover:bg-red-950/60 text-slate-400 hover:text-red-400 cursor-pointer"
                  title="O'chirish"
                >
                  <Trash2 class="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          <!-- Empty State when no assets uploaded -->
          <div 
            v-else 
            class="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-800/80 rounded-2xl bg-slate-950/40 p-4 text-center"
          >
            <UploadCloud class="w-8 h-8 text-brand-400/60 mb-2" />
            <h4 class="text-xs font-bold text-slate-200">Assetlar yuklanmagan</h4>
            <p class="text-[10px] text-slate-400 mt-0.5 mb-3">Papka yoki rasmlarni yuklang</p>
            <div class="flex items-center gap-2">
              <button 
                @click="triggerFolderUpload"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <FolderUp class="w-3.5 h-3.5" />
                <span>Papka yuklash</span>
              </button>
              <button 
                @click="triggerFilesUpload"
                class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all active:scale-95 cursor-pointer"
              >
                <ImagePlus class="w-3.5 h-3.5 text-emerald-400" />
                <span>Rasmlar</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Bottom Selected Asset Status Bar -->
        <div 
          v-if="assetStore.selectedAsset" 
          class="p-2 border-t border-slate-800/90 bg-slate-900/95 flex items-center justify-between shrink-0 text-xs"
        >
          <div class="flex items-center gap-2 min-w-0">
            <div class="w-6 h-6 rounded bg-slate-950 checker-pattern flex items-center justify-center p-0.5 shrink-0 border border-slate-800">
              <img 
                :src="assetStore.selectedAsset.previewSrc || assetStore.selectedAsset.src" 
                :alt="assetStore.selectedAsset.name" 
                class="max-w-full max-h-full object-contain"
              />
            </div>
            <div class="flex flex-col min-w-0">
              <span class="text-[10px] text-slate-400 font-semibold">Tanlangan:</span>
              <span class="text-xs font-bold text-brand-300 truncate max-w-[140px]">{{ assetStore.selectedAsset.name }}</span>
            </div>
          </div>

          <div class="flex items-center gap-1.5 shrink-0">
            <button 
              @click="openAnchorModal(assetStore.selectedAsset)"
              class="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold border border-slate-700 flex items-center gap-1 cursor-pointer"
              title="Anchor sozlash"
            >
              <Crosshair class="w-3 h-3 text-brand-400" />
              <span>Anchor</span>
            </button>

            <button 
              @click="assetStore.selectAsset(null)"
              class="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              title="Tanlovni bekor qilish"
            >
              <X class="w-3.5 h-3.5" />
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
  </aside>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { 
  Boxes, Layers, ChevronLeft, ChevronRight, Search, 
  Crosshair, Trash2, FolderOpen, FolderUp, ImagePlus, 
  UploadCloud, Plus, Eye, EyeOff, Lock, Unlock, 
  ArrowUp, ArrowDown, X 
} from 'lucide-vue-next'
import { useMapStore, PlacedElementEntry } from '../stores/mapStore'
import { useToolStore } from '../stores/toolStore'
import { useAssetStore } from '../stores/assetStore'
import { AssetItem } from '../types/map'
import AnchorAdjustModal from './AnchorAdjustModal.vue'

const emit = defineEmits<{
  (e: 'focus-cell', pos: { col: number; row: number }): void
}>()

const mapStore = useMapStore()
const toolStore = useToolStore()
const assetStore = useAssetStore()

const isCollapsed = ref(typeof window !== 'undefined' ? window.innerWidth < 1024 : false)
const activeTopTab = ref<'elements' | 'layers'>('elements')
const elementSearchQuery = ref('')

const folderInputRef = ref<HTMLInputElement | null>(null)
const filesInputRef = ref<HTMLInputElement | null>(null)
const selectedAssetForAnchor = ref<AssetItem | null>(null)

const reversedLayers = computed(() => {
  return [...mapStore.project.layers].reverse()
})

const filteredPlacedElements = computed(() => {
  const query = elementSearchQuery.value.trim().toLowerCase()
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
.writing-mode-vertical {
  writing-mode: vertical-rl;
  text-orientation: mixed;
}
.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
  height: 5px;
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
