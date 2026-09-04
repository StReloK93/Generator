<template>
  <aside class="flex flex-col h-full w-72 sm:w-80 bg-slate-900/90 border-r border-slate-800/80 backdrop-blur-xl shrink-0 overflow-hidden select-none">
    
    <!-- Sidebar Header -->
    <div class="p-3 border-b border-slate-800/80 flex items-center justify-between gap-2 shrink-0 bg-slate-950/40">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-bold">
          <Boxes class="w-4 h-4" />
        </div>
        <div>
          <h3 class="font-bold text-xs text-white">Sprite Library</h3>
          <p class="text-[10px] text-slate-400">Add components to canvas</p>
        </div>
      </div>
      <UiBadge variant="cyan" size="xs">
        {{ filteredAssets.length }}
      </UiBadge>
    </div>

    <!-- Search input -->
    <div class="p-2.5 border-b border-slate-800/60 shrink-0">
      <UiInput 
        v-model="searchQuery" 
        size="sm" 
        placeholder="Search sprites..." 
        :leading-icon="Search" 
        clearable 
      />
    </div>

    <!-- Category Filter Tabs -->
    <div class="px-2.5 pt-2 pb-1 border-b border-slate-800/60 shrink-0 overflow-x-auto no-scrollbar flex items-center gap-1.5">
      <button 
        v-for="cat in categories" 
        :key="cat.id"
        type="button"
        class="px-2.5 py-1 rounded-xl text-[10px] font-bold whitespace-nowrap transition-all cursor-pointer select-none"
        :class="selectedCategory === cat.id 
          ? 'bg-cyan-500 text-slate-950 font-black shadow-md shadow-cyan-500/20' 
          : 'bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800'"
        @click="selectedCategory = cat.id"
      >
        {{ cat.label }}
      </button>
    </div>

    <!-- Sprites Grid List -->
    <div class="flex-1 overflow-y-auto p-2.5 custom-scrollbar grid grid-cols-3 gap-2 auto-rows-max">
      <div
        v-for="asset in filteredAssets"
        :key="asset.id"
        class="group relative rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-cyan-400/60 hover:bg-slate-800/60 p-1.5 flex flex-col items-center justify-center cursor-pointer transition-all duration-150 aspect-square hover:scale-105 active:scale-95 shadow-sm overflow-hidden"
        :title="`${asset.name} (Click to add)`"
        @click="handleAdd(asset)"
      >
        <!-- Sprite Image (Trimmed and centered for Asset Editor) -->
        <img 
          :src="assetStore.getAssetPreview(asset)" 
          :alt="asset.name"
          class="max-w-full max-h-full object-contain filter drop-shadow-md group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(6,182,212,0.5)] transition-all pointer-events-none"
          loading="lazy"
        />

        <!-- Hover Mini-plus Icon -->
        <div class="absolute bottom-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5 rounded-lg bg-cyan-500 text-slate-950 flex items-center justify-center text-[10px] font-bold shadow">
          <Plus class="w-3 h-3" />
        </div>
      </div>
    </div>

    <!-- Quick Tip Footer -->
    <div class="p-2 border-t border-slate-800 bg-slate-950/60 text-[10px] text-slate-400 flex items-center gap-1.5 shrink-0">
      <Sparkles class="w-3.5 h-3.5 text-amber-400 shrink-0" />
      <span class="truncate">Click sprite to add to canvas</span>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Boxes, Search, Plus, Sparkles } from 'lucide-vue-next'
import { UiInput, UiBadge } from '../ui'
import { useAssetStore } from '../../stores/assetStore'
import { useAssetEditorStore } from '../../stores/assetEditorStore'
import { AssetItem } from '../../types/map'

const assetStore = useAssetStore()
const editorStore = useAssetEditorStore()

const searchQuery = ref('')
const selectedCategory = ref('all')

const categories = [
  { id: 'all', label: 'All' },
  { id: 'walls', label: 'Walls & Towers' },
  { id: 'ground', label: 'Ground & Stone' },
  { id: 'stairs', label: 'Stairs & Bridges' },
  { id: 'props', label: 'Objects & Props' },
]

const filteredAssets = computed(() => {
  let list = assetStore.assets

  // Filter by category
  if (selectedCategory.value !== 'all') {
    list = list.filter(item => {
      const lower = (item.name || item.id || '').toLowerCase()
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
