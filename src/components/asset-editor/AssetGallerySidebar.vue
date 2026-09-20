<template>
  <aside class="flex flex-col h-full w-100  bg-slate-900/90 border-r border-slate-800/80 backdrop-blur-xl shrink-0 overflow-hidden select-none">
    
    <!-- Sidebar Header -->
    <div class="p-3 border-b border-slate-800/80 flex items-center justify-between gap-2 shrink-0 bg-slate-950/40">
      <div class="flex items-center gap-2 min-w-0">
        <div class="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-bold shrink-0">
          <Boxes class="w-4 h-4" />
        </div>
        <div class="min-w-0">
          <h3 class="font-bold text-xs text-white truncate">{{ $t('sidebar.spriteLibrary') }}</h3>
          <p class="text-[10px] text-slate-400 truncate">{{ $t('assetEditor.addComponents') }}</p>
        </div>
      </div>
      
      <div class="flex items-center gap-1.5 shrink-0">
        <UiBadge variant="cyan" size="xs">
          {{ filteredAssets.length }}
        </UiBadge>
        <UiButton
          size="xs"
          variant="secondary"
          :leading-icon="Upload"
          :title="$t('common.import')"
          @click="triggerSidebarFileInput"
        >
          <span class="text-[10px]">{{ $t('common.upload') }}</span>
        </UiButton>
        <input 
          ref="sidebarFileInputRef"
          type="file"
          multiple
          accept="image/*,.png,.webp,.jpg,.jpeg,.svg"
          class="hidden"
          @change="handleSidebarFileInput"
        />
      </div>
    </div>

    <!-- Search input -->
    <div class="p-2.5 border-b border-slate-800/60 shrink-0">
      <UiInput 
        v-model="searchQuery" 
        size="sm" 
        :placeholder="$t('sidebar.searchAssets')" 
        :leading-icon="Search" 
        clearable 
      />
    </div>

    <!-- Category Filter Tabs -->
    <div class="px-2.5 pt-2 pb-1 border-b border-slate-800/60 shrink-0 overflow-x-auto no-scrollbar">
      <UiTabs
        v-model="selectedCategory"
        :items="categories"
        variant="cyan"
        size="xs"
      />
    </div>

    <!-- Sprites Grid List -->
    <div class="flex-1 overflow-y-auto p-2.5 custom-scrollbar grid grid-cols-3 gap-2 auto-rows-max">
      <div
        v-for="asset in filteredAssets"
        :key="asset.id"
        draggable="true"
        class="group relative rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-cyan-400/60 hover:bg-slate-800/60 p-1.5 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing transition-all duration-150 aspect-square hover:scale-105 active:scale-95 shadow-sm overflow-hidden"
        :title="`${asset.name} (${$t('assetEditor.clickOrDragToAdd')})`"
        @dragstart="handleDragStart($event, asset)"
        @click="handleAdd(asset)"
      >
        <!-- Sprite Image (Trimmed and centered for Asset Editor) -->
        <img 
          :src="assetStore.getAssetPreview(asset)" 
          :alt="asset.name"
          width="64"
          height="64"
          decoding="async"
          class="max-w-full max-h-full aspect-square object-contain filter drop-shadow-md group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(6,182,212,0.5)] transition-all pointer-events-none"
          loading="lazy"
        />

        <!-- Hover Action Buttons (Plus & Crop) -->
        <div class="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
          <!-- Crop Button -->
          <button 
            type="button" 
            class="w-5 h-5 rounded-lg bg-slate-900/90 text-cyan-300 hover:bg-cyan-500 hover:text-slate-950 border border-cyan-400/50 flex items-center justify-center text-[10px] font-bold shadow cursor-pointer transition-colors"
            :title="$t('assetEditor.crop')"
            @click.stop="openCropForAsset(asset)"
          >
            <Crop class="w-3 h-3" />
          </button>

          <!-- Add to Canvas Button -->
          <div class="w-5 h-5 rounded-lg bg-cyan-500 text-slate-950 flex items-center justify-center text-[10px] font-bold shadow pointer-events-none">
            <Plus class="w-3 h-3" />
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Tip Footer -->
    <div class="p-2 border-t border-slate-800 bg-slate-950/60 text-[10px] text-slate-400 flex items-center gap-1.5 shrink-0">
      <Sparkles class="w-3.5 h-3.5 text-amber-400 shrink-0" />
      <span class="truncate">{{ $t('assetEditor.clickOrDragToAdd') }}</span>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Boxes, Search, Plus, Sparkles, Upload, Crop } from 'lucide-vue-next'
import { UiInput, UiBadge, UiButton, UiTabs, TabItem } from '../ui'
import { useAssetStore } from '../../stores/assetStore'
import { useAssetEditorStore } from '../../stores/assetEditorStore'
import { useI18n } from '../../stores/i18nStore'
import { AssetItem } from '../../types/map'

const assetStore = useAssetStore()
const editorStore = useAssetEditorStore()
const { t } = useI18n()

const searchQuery = ref('')
const selectedCategory = ref('all')
const sidebarFileInputRef = ref<HTMLInputElement | null>(null)

function triggerSidebarFileInput() {
  sidebarFileInputRef.value?.click()
}

async function handleSidebarFileInput(event: Event) {
  const target = event.target as HTMLInputElement
  const files = target.files
  if (!files || files.length === 0) return

  const newAssets = await assetStore.uploadFiles(files)
  if (newAssets && newAssets.length > 0) {
    selectedCategory.value = 'custom'
  }
  target.value = ''
}

function handleDragStart(e: DragEvent, asset: AssetItem) {
  if (!e.dataTransfer) return
  const preview = assetStore.getAssetPreview(asset)
  const payload = {
    id: asset.id,
    name: asset.name,
    src: preview || asset.src || '',
    previewSrc: preview,
  }
  e.dataTransfer.setData('application/json', JSON.stringify(payload))
  e.dataTransfer.effectAllowed = 'copy'
}

const categories = computed<TabItem[]>(() => [
  { id: 'all', label: t('common.all') },
  { id: 'custom', label: t('common.custom'), count: assetStore.customAssets.length || undefined },
  { id: 'towers', label: t('common.towers') || 'Towers' },
  { id: 'walls', label: t('assets.catWalls') },
  { id: 'ground', label: t('assets.catGround') },
  { id: 'stairs', label: t('assets.catStairs') },
  { id: 'props', label: t('assets.catProps') },
])

const filteredAssets = computed(() => {
  let list = assetStore.assets

  // Filter by category
  if (selectedCategory.value !== 'all') {
    list = list.filter(item => {
      const lower = (item.name || item.id || '').toLowerCase()
      if (selectedCategory.value === 'custom') {
        return item.id.startsWith('custom-') || item.category === 'Custom' || item.isSample === false
      }
      if (selectedCategory.value === 'towers') {
        return lower.includes('tower') || lower.includes('turret') || lower.includes('cannon') || item.category?.toLowerCase() === 'towers'
      }
      if (selectedCategory.value === 'walls') {
        return lower.includes('wall') || lower.includes('gate') || lower.includes('door') || lower.includes('archway') || lower.includes('column') || lower.includes('support')
      }
      if (selectedCategory.value === 'ground') {
        return lower.includes('dirt') || lower.includes('planks') || (lower.includes('stone') && !lower.includes('wall') && !lower.includes('column'))
      }
      if (selectedCategory.value === 'stairs') {
        return lower.includes('stairs') || lower.includes('bridge')
      }
      if (selectedCategory.value === 'props') {
        return lower.includes('barrel') || lower.includes('chest') || lower.includes('crate') || lower.includes('table') || lower.includes('chair')
      }
      return true
    })
  }

  // Filter by search query
  const query = searchQuery.value.trim().toLowerCase()
  if (query) {
    list = list.filter(item => (item.name || '').toLowerCase().includes(query))
  }

  return list
})

function handleAdd(asset: AssetItem) {
  const preview = assetStore.getAssetPreview(asset)
  editorStore.addPartFromAsset({
    id: asset.id,
    name: asset.name,
    src: preview || asset.src || '',
    previewSrc: preview,
  })
}

function openCropForAsset(asset: AssetItem) {
  const preview = assetStore.getAssetPreview(asset) || asset.src || ''
  editorStore.openCropModal(undefined, preview, asset.name)
}
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(15, 23, 42, 0.4);
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(6, 182, 212, 0.3);
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(6, 182, 212, 0.6);
}
</style>
