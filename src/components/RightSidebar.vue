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
      <UiIconButton 
        :icon="ChevronLeft"
        size="sm"
        title="Expand Right Panel"
        @click="isCollapsed = false"
      />

      <div class="writing-mode-vertical text-xs font-bold text-slate-400 tracking-wider flex items-center gap-2">
        <Boxes class="w-3.5 h-3.5 text-brand-400" />
        <span>Objects & Assets ({{ mapStore.allPlacedElements.length }} / {{ assetStore.assets.length }})</span>
      </div>

      <UiIconButton 
        :icon="FolderOpen"
        size="sm"
        title="Open"
        @click="isCollapsed = false"
      />
    </div>

    <!-- Expanded Right Sidebar with 40% / 60% Split -->
    <div v-else class="flex flex-col h-full overflow-hidden">
      
      <!-- ========================================================================= -->
      <!-- TOP SECTION: 40% OBJECTS & LAYERS DRIVER                                  -->
      <!-- ========================================================================= -->
      <div class="h-[40%] min-h-[160px] flex flex-col border-b border-slate-800/90 bg-slate-900/40 overflow-hidden shrink-0">
        
        <!-- Top Driver Header & Tab Switcher -->
        <div class="p-2 border-b border-slate-800 bg-slate-900/80 flex items-center justify-between gap-2 shrink-0">
          <div class="flex-1 min-w-0">
            <UiTabs
              v-model="activeTopTab"
              :items="topTabItems"
              size="sm"
              fill
            />
          </div>

          <!-- Collapse Panel Button -->
          <UiIconButton
            :icon="ChevronRight"
            size="sm"
            variant="ghost"
            title="Collapse Panel"
            @click="isCollapsed = true"
          />
        </div>

        <!-- TAB 1: PLACED OBJECTS OUTLINER -->
        <div v-if="activeTopTab === 'elements'" class="flex-1 flex flex-col overflow-hidden p-2 gap-1.5">
          <!-- Search filter -->
          <UiInput 
            v-model="elementSearchQuery"
            size="sm"
            placeholder="Search placed objects..."
            :leading-icon="Search"
            clearable
          />

          <!-- Placed Elements List -->
          <div 
            v-if="filteredPlacedElements.length > 0"
            class="flex-1 overflow-y-auto flex flex-col gap-1.5 p-1 custom-scrollbar"
          >
            <UiCard 
              v-for="entry in filteredPlacedElements" 
              :key="entry.item.id"
              :selected="toolStore.selectedElement?.itemId === entry.item.id"
              variant="default"
              padding="sm"
              interactive
              custom-class="p-1.5! flex items-center gap-2 shrink-0 group hover:border-slate-700"
              @click="handleSelectAndFocus(entry)"
            >
              <!-- Thumbnail -->
              <div class="w-8 h-8 rounded-lg bg-slate-950 checker-pattern flex items-center justify-center p-1 shrink-0 overflow-hidden shadow-inner border border-slate-800/80">
                <img 
                  :src="assetStore.getAssetPreview(entry.item.assetId)" 
                  :alt="getAsset(entry.item.assetId)?.name"
                  class="max-w-full max-h-full object-contain filter drop-shadow group-hover:scale-105 transition-transform"
                  loading="lazy"
                />
              </div>

              <!-- Meta details -->
              <div class="flex-1 min-w-0">
                <div class="text-[11px] font-semibold text-slate-200 truncate flex items-center justify-between">
                  <span class="truncate">{{ getAsset(entry.item.assetId)?.name || 'Element' }}</span>
                  <UiBadge variant="brand" size="xs">
                    Z:{{ entry.item.zIndex || 0 }}
                  </UiBadge>
                </div>
                <div class="text-[9px] text-slate-400 font-mono flex items-center justify-between mt-0.5">
                  <span class="text-emerald-400 font-semibold">X:{{ entry.col }}, Y:{{ entry.row }}</span>
                  <span class="text-[9px] text-slate-500 truncate max-w-[90px]">{{ entry.layerName }}</span>
                </div>
              </div>

              <!-- Focus / Delete buttons on hover -->
              <div class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <UiIconButton 
                  :icon="Crosshair"
                  size="sm"
                  variant="ghost"
                  title="Focus on Map"
                  custom-class="p-0.5! w-6! h-6!"
                  @click.stop="handleFocusOnly(entry)"
                />
                <UiIconButton 
                  :icon="Trash2"
                  size="sm"
                  variant="danger"
                  title="Delete Object"
                  custom-class="p-0.5! w-6! h-6!"
                  @click.stop="handleDeleteItem(entry)"
                />
              </div>
            </UiCard>
          </div>

          <!-- Empty state when map has 0 elements -->
          <div 
            v-else 
            class="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-800/80 rounded-2xl bg-slate-950/40 p-3 text-center"
          >
            <Boxes class="w-6 h-6 text-slate-600 mb-1" />
            <p class="text-[11px] font-bold text-slate-300">No objects placed</p>
            <p class="text-[10px] text-slate-500 mt-0.5">Select a sprite from the library below to place on the map</p>
          </div>
        </div>

        <!-- TAB 2: LAYERS LIST -->
        <div v-else class="flex-1 overflow-hidden flex flex-col p-2 gap-1.5 custom-scrollbar">
          <!-- Add Layer Action Row -->
          <div class="flex items-center justify-between px-1 shrink-0">
            <span class="text-[11px] font-semibold text-slate-300">Layers List</span>
            <UiButton 
              variant="primary"
              size="xs"
              :leading-icon="Plus"
              @click="mapStore.addLayer()"
            >
              New Layer
            </UiButton>
          </div>

          <!-- Scrollable Layer Items -->
          <div class="flex-1 overflow-y-auto flex flex-col gap-1.5 custom-scrollbar p-1">
            <UiCard 
              v-for="layer in reversedLayers" 
              :key="layer.id"
              :selected="mapStore.activeLayerId === layer.id"
              variant="default"
              padding="sm"
              custom-class="p-1.5! flex flex-col gap-1 cursor-pointer shrink-0 hover:border-slate-700"
              @click="mapStore.activeLayerId = layer.id"
            >
              <div class="flex items-center justify-between gap-1.5">
                <div class="flex items-center gap-1.5 flex-1 min-w-0">
                  <UiIconButton 
                    :icon="layer.visible ? Eye : EyeOff"
                    size="sm"
                    variant="ghost"
                    :title="layer.visible ? 'Hide Layer' : 'Show Layer'"
                    :custom-class="layer.visible ? 'text-emerald-400 hover:text-emerald-300' : 'text-slate-600'"
                    @click.stop="mapStore.toggleLayerVisibility(layer.id)"
                  />

                  <input 
                    :value="layer.name"
                    @change="(e) => mapStore.renameLayer(layer.id, (e.target as HTMLInputElement).value)"
                    @click.stop
                    class="bg-transparent text-[11px] font-semibold text-slate-200 focus:outline-none focus:bg-slate-800/80 px-1 py-0.5 rounded truncate flex-1"
                  />
                </div>

                <div class="flex items-center gap-0.5 shrink-0">
                  <UiIconButton 
                    :icon="layer.locked ? Lock : Unlock"
                    size="sm"
                    variant="ghost"
                    :title="layer.locked ? 'Unlock Layer' : 'Lock Layer'"
                    :custom-class="layer.locked ? 'text-amber-400' : 'text-slate-500'"
                    @click.stop="mapStore.toggleLayerLock(layer.id)"
                  />
                  <UiIconButton 
                    :icon="ArrowUp"
                    size="sm"
                    variant="ghost"
                    title="Move Up"
                    @click.stop="mapStore.moveLayer(layer.id, 'up')"
                  />
                  <UiIconButton 
                    :icon="ArrowDown"
                    size="sm"
                    variant="ghost"
                    title="Move Down"
                    @click.stop="mapStore.moveLayer(layer.id, 'down')"
                  />
                  <UiIconButton 
                    v-if="mapStore.project.layers.length > 1"
                    :icon="Trash2"
                    size="sm"
                    variant="danger"
                    title="Delete Layer"
                    @click.stop="mapStore.removeLayer(layer.id)"
                  />
                </div>
              </div>

              <!-- Layer Opacity -->
              <div class="flex items-center justify-between gap-2 text-[9px] text-slate-400 pt-0.5 border-t border-slate-800/50">
                <div class="flex items-center gap-1.5 flex-1" @click.stop>
                  <span>Opacity:</span>
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
                <span class="font-mono text-slate-500">{{ Object.keys(layer.tiles).length }} items</span>
              </div>
            </UiCard>
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
                Asset Library
              </span>
              <UiBadge variant="brand" size="xs">
                {{ assetStore.assets.length }}
              </UiBadge>
            </div>

            <!-- Upload Action Buttons -->
            <div class="flex items-center gap-1">
              <UiButton 
                variant="primary"
                size="xs"
                :leading-icon="FolderUp"
                title="Upload sprite folder"
                @click="triggerFolderUpload"
              >
                Folder
              </UiButton>

              <UiButton 
                variant="secondary"
                size="xs"
                :leading-icon="ImagePlus"
                title="Upload sprite image files"
                @click="triggerFilesUpload"
              >
                Images
              </UiButton>

              <UiIconButton 
                v-if="assetStore.assets.length > 0"
                :icon="Trash2"
                size="sm"
                variant="danger"
                title="Clear all assets"
                @click="assetStore.clearAllAssets()"
              />
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
          <UiInput 
            v-model="assetStore.searchQuery"
            size="sm"
            placeholder="Search asset library..."
            :leading-icon="Search"
            clearable
          />

          <!-- Category Filter Chips -->
          <div class="flex items-center gap-1 overflow-x-auto pb-0.5 custom-scrollbar shrink-0 text-[10px]">
            <button 
              v-for="cat in assetStore.categories"
              :key="cat"
              @click="assetStore.selectedCategory = cat"
              :class="assetStore.selectedCategory === cat ? 'bg-brand-600/30 text-brand-300 border-brand-500/50 font-bold shadow-sm' : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border-slate-800/80'"
              class="px-2.5 py-1 rounded-xl border whitespace-nowrap transition-all cursor-pointer shrink-0 text-xs"
            >
              {{ cat }}
            </button>
          </div>
        </div>

        <!-- Scrollable Asset Grid (3 Columns, Square Aspect Ratio, Crisp Large Previews) -->
        <div class="flex-1 p-2 overflow-y-auto overflow-x-hidden custom-scrollbar">
          <div 
            v-if="assetStore.filteredAssets.length > 0"
            class="grid grid-cols-3 gap-2"
          >
            <div 
              v-for="asset in assetStore.filteredAssets" 
              :key="asset.id"
              @click="handleAssetClick(asset.id)"
              draggable="true"
              @dragstart="(e) => handleAssetDragStart(e, asset)"
              :class="assetStore.selectedAssetId === asset.id ? 'border-brand-500 bg-brand-950/80 ring-2 ring-brand-500/80 scale-[1.03]' : 'border-slate-800/90 bg-slate-900/80 hover:border-slate-700 hover:bg-slate-850'"
              class="group relative flex items-center justify-center p-2 rounded-2xl border aspect-square cursor-pointer transition-all shadow-sm overflow-hidden"
              :title="asset.name"
            >
              <!-- Thumbnail Image (Large, fills box, perfectly centered) -->
              <img 
                :src="assetStore.getAssetPreview(asset)" 
                :alt="asset.name"
                class="max-w-full max-h-full object-contain filter drop-shadow group-hover:scale-115 transition-transform duration-200 pointer-events-none"
                loading="lazy"
              />

              <!-- Hover Subtitle Name Bar -->
              <div class="absolute inset-x-0 bottom-0 py-0.5 px-1 bg-slate-950/90 backdrop-blur-xs text-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border-t border-slate-800/60">
                <span class="text-[9px] font-semibold text-slate-200 truncate block">
                  {{ asset.name.replace(/\.png|\.jpg|\.webp/gi, '') }}
                </span>
              </div>

              <!-- Quick Hover Actions (Anchor & Delete) -->
              <div class="absolute top-1 right-1 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950/95 rounded-xl p-0.5 border border-slate-800 shadow-md backdrop-blur-sm z-10">
                <UiIconButton 
                  :icon="Crosshair"
                  size="sm"
                  variant="ghost"
                  title="Adjust Anchor"
                  custom-class="p-0.5! w-5! h-5!"
                  @click.stop="openAnchorModal(asset)"
                />
                <UiIconButton 
                  :icon="Trash2"
                  size="sm"
                  variant="danger"
                  title="Delete Asset"
                  custom-class="p-0.5! w-5! h-5!"
                  @click.stop="assetStore.deleteAsset(asset.id)"
                />
              </div>
            </div>
          </div>

          <!-- Empty State when no assets uploaded -->
          <div 
            v-else 
            class="h-full flex flex-col items-center justify-center border-2 border-dashed border-slate-800/80 rounded-3xl bg-slate-950/40 p-4 text-center"
          >
            <UploadCloud class="w-8 h-8 text-brand-400/60 mb-2" />
            <p class="text-xs font-bold text-slate-300">Asset library is empty</p>
            <p class="text-[10px] text-slate-500 max-w-[180px] mt-0.5 mb-3">Upload sprite images or folders to use on your map</p>
            <div class="flex items-center gap-1.5">
              <UiButton 
                variant="primary"
                size="sm"
                :leading-icon="FolderUp"
                @click="triggerFolderUpload"
              >
                Upload Folder
              </UiButton>
              <UiButton 
                variant="secondary"
                size="sm"
                :leading-icon="ImagePlus"
                @click="triggerFilesUpload"
              >
                Images
              </UiButton>
            </div>
          </div>
        </div>

        <!-- Bottom Selected Asset Status Bar -->
        <div 
          v-if="assetStore.selectedAsset" 
          class="p-2 border-t border-slate-800/90 bg-slate-900/95 flex items-center justify-between shrink-0 text-xs"
        >
          <div class="flex items-center gap-2 min-w-0">
            <div class="w-7 h-7 rounded-lg bg-slate-950 checker-pattern flex items-center justify-center p-0.5 shrink-0 border border-slate-800">
              <img 
                :src="assetStore.getAssetPreview(assetStore.selectedAsset)" 
                :alt="assetStore.selectedAsset.name" 
                class="max-w-full max-h-full object-contain"
              />
            </div>
            <div class="flex flex-col min-w-0">
              <span class="text-[9px] text-slate-400 font-semibold">Selected:</span>
              <span class="text-xs font-bold text-brand-300 truncate max-w-[140px]">{{ assetStore.selectedAsset.name }}</span>
            </div>
          </div>

          <div class="flex items-center gap-1.5 shrink-0">
            <UiButton 
              variant="secondary"
              size="xs"
              :leading-icon="Crosshair"
              @click="openAnchorModal(assetStore.selectedAsset)"
            >
              Anchor
            </UiButton>

            <UiIconButton 
              :icon="X"
              size="sm"
              variant="ghost"
              title="Deselect"
              @click="assetStore.selectAsset(null)"
            />
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
import { 
  UiButton, 
  UiIconButton, 
  UiInput, 
  UiCard, 
  UiTabs, 
  UiBadge, 
  TabItem 
} from './ui'
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

const topTabItems = computed<TabItem[]>(() => [
  { id: 'elements', label: 'Objects', icon: Boxes, count: mapStore.allPlacedElements.length },
  { id: 'layers', label: 'Layers', icon: Layers, count: mapStore.project.layers.length }
])

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
  if (!assetId) return null
  const cleanId = assetId.replace(/^sprite-/, '').replace(/\.[^/.]+$/, '').toLowerCase()
  return assetStore.assets.find(a => {
    if (a.id === assetId) return true
    const aClean = a.id.replace(/^sprite-/, '').replace(/\.[^/.]+$/, '').toLowerCase()
    return aClean === cleanId || (a.fileRelativePath && a.fileRelativePath.toLowerCase().includes(cleanId))
  }) || null
}

function getAssetThumbnailStyle(asset: AssetItem) {
  if (asset.contentBounds && asset.height && asset.width) {
    const b = asset.contentBounds
    const contentCenterY = (b.minY + b.maxY) / 2
    const contentCenterX = (b.minX + b.maxX) / 2
    
    // Shift content to exact center of the box
    const offsetYPercent = ((asset.height / 2 - contentCenterY) / asset.height) * 100
    const offsetXPercent = ((asset.width / 2 - contentCenterX) / asset.width) * 100
    
    const contentW = Math.max(1, b.maxX - b.minX)
    const contentH = Math.max(1, b.maxY - b.minY)
    
    // Calculate scale to fill ~90% of the square thumbnail container
    const scaleX = asset.width / contentW
    const scaleY = asset.height / contentH
    const fillScale = Math.min(1.85, Math.max(1.0, Math.min(scaleX, scaleY) * 0.90))
    
    return {
      transform: `translate(${offsetXPercent.toFixed(1)}%, ${offsetYPercent.toFixed(1)}%) scale(${fillScale.toFixed(2)})`,
      transformOrigin: 'center center',
    }
  }

  // Fallback for square or standard assets
  return {
    transform: 'scale(1.05)',
    transformOrigin: 'center center',
  }
}

function handleSelectAndFocus(entry: PlacedElementEntry) {
  toolStore.setSelectedElement({
    col: entry.col,
    row: entry.row,
    layerId: entry.layerId,
    itemId: entry.item.id,
  })
  toolStore.setTool('select')
  mapStore.activeLayerId = entry.layerId
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
