<template>
  <UiModal
    :is-open="toolStore.isScatterModalOpen"
    :title="$t('editor.scatterModalTitle') || 'Tasodifiy Asset To\'ldirish (Scatter)'"
    :subtitle="$t('editor.scatterModalSubtitle') || 'Bir nechta assetlarni tanlang va to\'rtburchak yoki chiziq bo\'ylab tasodifiy joylashtiring'"
    size="xl"
    @close="toolStore.closeScatterModal"
  >
    <div class="flex flex-col gap-3 max-h-[82vh] overflow-hidden select-none">
      
      <!-- Top Configurations Bar: Shape, Density, Placement Mode & Variation -->
      <div class="flex flex-col gap-2.5 p-3 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-inner">
        <!-- Row 1: Shape Selector & Placement Mode -->
        <div class="flex flex-wrap items-center justify-between gap-2.5">
          <!-- 1. Placement Shape (Box / Line / Brush) -->
          <div class="flex items-center gap-2">
            <span class="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
              <Boxes class="w-3.5 h-3.5 text-purple-400" />
              <span>{{ $t('editor.scatterShape') || 'Shakl' }}:</span>
            </span>
            <UiTabs
              v-model="toolStore.scatterShape"
              :items="shapeOptions"
              variant="brand"
              size="xs"
            />
          </div>

          <!-- 2. Placement Mode (Replace / Stack / Empty Only) -->
          <div class="flex items-center gap-2">
            <span class="text-[11px] font-bold text-slate-300">
              {{ $t('editor.scatterPlacementMode') || 'Rejim' }}:
            </span>
            <UiTabs
              v-model="toolStore.scatterPlacementMode"
              :items="placementOptions"
              variant="cyan"
              size="xs"
            />
          </div>
        </div>

        <!-- Row 2: Density Slider & Random Variation Toggles -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800/70 items-center">
          <!-- Density -->
          <div class="flex flex-col gap-1">
            <UiSlider
              v-model="toolStore.scatterDensity"
              :label="$t('editor.scatterDensity') || 'Zichlik (Ehtimollik)'"
              :min="10"
              :max="100"
              :step="5"
              unit="%"
            />
          </div>

          <!-- Random Rotation & Flip Switches -->
          <div class="flex items-center justify-end gap-3 flex-wrap">
            <label class="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-300 hover:text-white transition-colors">
              <input
                v-model="toolStore.scatterRandomRotation"
                type="checkbox"
                class="rounded bg-slate-950 border-slate-700 text-purple-500 focus:ring-purple-500/40 w-4 h-4 cursor-pointer"
              />
              <RotateCw class="w-3.5 h-3.5 text-amber-400" />
              <span>{{ $t('editor.scatterRandomRotation') || 'Tasodifiy burchak (0°-270°)' }}</span>
            </label>

            <label class="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-300 hover:text-white transition-colors">
              <input
                v-model="toolStore.scatterRandomFlip"
                type="checkbox"
                class="rounded bg-slate-950 border-slate-700 text-purple-500 focus:ring-purple-500/40 w-4 h-4 cursor-pointer"
              />
              <FlipHorizontal class="w-3.5 h-3.5 text-cyan-400" />
              <span>{{ $t('editor.scatterRandomFlip') || 'Tasodifiy aks (Flip)' }}</span>
            </label>
          </div>
        </div>
      </div>

      <!-- Quick Preset Filter Buttons & Search -->
      <div class="flex flex-wrap items-center justify-between gap-2">
        <!-- Presets & Select All / Clear All -->
        <div class="flex items-center gap-1.5 flex-wrap">
          <span class="text-[11px] font-semibold text-slate-400 mr-1">{{ $t('editor.scatterPresets') || 'Andozalar' }}:</span>
          
          <UiButton
            v-for="preset in quickPresets"
            :key="preset.id"
            variant="secondary"
            size="xs"
            :leading-icon="preset.icon"
            @click="applyPreset(preset.id)"
          >
            {{ preset.label }}
          </UiButton>

          <div class="h-4 w-px bg-slate-800 mx-0.5"></div>

          <!-- Select All in Category -->
          <UiButton
            variant="secondary"
            size="xs"
            :leading-icon="CheckCheck"
            custom-class="text-purple-300 hover:text-white"
            @click="selectAllFiltered"
          >
            {{ $t('assetEditor.selectAll') || 'Barchasini tanlash' }}
          </UiButton>

          <!-- Clear All -->
          <UiButton
            v-if="toolStore.scatterSelectedAssetIds.length > 0"
            variant="danger"
            size="xs"
            :leading-icon="Trash2"
            @click="toolStore.clearScatterAssets()"
          >
            {{ $t('assetEditor.clearAll') || 'Barchasini tozalash' }}
          </UiButton>
        </div>

        <!-- Search Bar -->
        <div class="w-48 sm:w-56">
          <UiInput
            v-model="searchQuery"
            size="sm"
            :placeholder="$t('sidebar.searchAssets')"
            :leading-icon="Search"
            clearable
          />
        </div>
      </div>

      <!-- Category Filter Tabs -->
      <div class="overflow-x-auto no-scrollbar pb-0.5 shrink-0">
        <UiTabs
          v-model="selectedCategory"
          :items="categoryItems"
          variant="segmented"
          size="xs"
        />
      </div>

      <!-- Main Assets Grid (Spacious, Uncropped, High-Resolution Previews) -->
      <div class="flex-1 overflow-y-auto custom-scrollbar p-2.5 h-85 sm:h-100 grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 gap-2.5 bg-slate-950/70 rounded-2xl border border-slate-800/80">
        <div
          v-for="asset in filteredAssets"
          :key="asset.id"
          class="group relative flex items-center justify-center p-2 rounded-2xl border aspect-square cursor-pointer transition-all duration-150 overflow-hidden select-none checker-pattern-subtle"
          :class="[
            isSelected(asset.id)
              ? 'border-purple-400 bg-purple-950/80 ring-2 ring-purple-500/80 shadow-[0_0_20px_rgba(168,85,247,0.4)] scale-[1.02]'
              : 'border-slate-800/90 bg-slate-900/80 hover:border-slate-600 hover:bg-slate-850 hover:scale-[1.03]'
          ]"
          :title="asset.name"
          @click="toolStore.toggleScatterAsset(asset.id)"
        >
          <!-- Sprite Preview Thumbnail (Centered, unclipped, full size) -->
          <img
            :src="assetStore.getAssetPreview(asset)"
            :alt="asset.name"
            width="80"
            height="80"
            decoding="async"
            class="max-w-full max-h-full aspect-square object-contain filter drop-shadow-md pointer-events-none group-hover:scale-115 transition-transform duration-200"
            loading="lazy"
          />

          <!-- Selection Checkmark Badge -->
          <div
            v-if="isSelected(asset.id)"
            class="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-purple-500 text-white flex items-center justify-center shadow-lg animate-in zoom-in-75 duration-100 ring-2 ring-purple-950 z-10"
          >
            <Check class="w-3.5 h-3.5 stroke-3" />
          </div>

          <!-- Hover Subtitle Name Bar -->
          <div class="absolute inset-x-0 bottom-0 py-0.5 px-1 bg-slate-950/95 backdrop-blur-xs text-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border-t border-slate-800/80 z-10">
            <span class="text-[9px] font-semibold text-slate-200 truncate block">
              {{ asset.name.replace(/\.png|\.jpg|\.webp/gi, '').replace(/[_-]/g, ' ') }}
            </span>
          </div>
        </div>

        <!-- Empty State -->
        <div
          v-if="filteredAssets.length === 0"
          class="col-span-full py-12 flex flex-col items-center justify-center text-center gap-2 border-2 border-dashed border-slate-800 rounded-2xl text-slate-500"
        >
          <Search class="w-8 h-8 text-slate-600" />
          <span class="text-xs font-semibold text-slate-400">{{ $t('sidebar.noAssets') }}</span>
        </div>
      </div>

      <!-- Selected Assets Bottom Shelf Strip -->
      <div class="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800/80 shrink-0">
        <div class="flex items-center gap-2 min-w-0">
          <UiBadge variant="brand" size="xs">
            {{ toolStore.scatterSelectedAssetIds.length }} {{ $t('editor.scatterSelectedCount') || 'ta asset tanlandi' }}
          </UiBadge>
          
          <!-- Horizontal Chips Row of Selected Sprites -->
          <div class="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 max-w-sm sm:max-w-md">
            <div
              v-for="id in toolStore.scatterSelectedAssetIds"
              :key="id"
              class="relative shrink-0 w-8.5 h-8.5 rounded-xl bg-slate-950 border border-purple-500/60 p-0.5 flex items-center justify-center group shadow"
            >
              <img
                :src="assetStore.getAssetPreview(id)"
                class="w-full h-full object-contain pointer-events-none"
              />
              <button
                type="button"
                class="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow"
                @click.stop="toolStore.toggleScatterAsset(id)"
              >
                <X class="w-2.5 h-2.5" />
              </button>
            </div>
          </div>
        </div>

        <!-- Clear Selection Button -->
        <UiButton
          v-if="toolStore.scatterSelectedAssetIds.length > 0"
          variant="danger"
          size="xs"
          :leading-icon="Trash2"
          @click="toolStore.clearScatterAssets()"
        >
          {{ $t('assetEditor.clearAll') || 'Barchasini tozalash' }}
        </UiButton>
      </div>

    </div>

    <!-- Modal Footer Actions -->
    <template #footer>
      <div class="flex items-center justify-between w-full gap-2">
        <UiButton
          variant="secondary"
          size="sm"
          @click="toolStore.closeScatterModal"
        >
          {{ $t('common.cancel') }}
        </UiButton>

        <UiButton
          variant="game-green"
          size="sm"
          :leading-icon="Dices"
          :disabled="toolStore.scatterSelectedAssetIds.length === 0"
          @click="startScattering"
        >
          {{ $t('editor.scatterStart') || 'Chizishni Boshlash' }}
        </UiButton>
      </div>
    </template>
  </UiModal>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  Boxes,
  RotateCw,
  FlipHorizontal,
  Search,
  Check,
  CheckCheck,
  X,
  Dices,
  TreePine,
  Mountain,
  Square,
  Spline,
  Paintbrush,
  BrickWall,
  Trash2,
} from 'lucide-vue-next'
import {
  UiModal,
  UiButton,
  UiTabs,
  UiSlider,
  UiInput,
  UiBadge,
  TabItem,
} from '../ui'
import { useToolStore } from '../../stores/toolStore'
import { useAssetStore } from '../../stores/assetStore'
import { useI18n } from '../../stores/i18nStore'

const toolStore = useToolStore()
const assetStore = useAssetStore()
const { t } = useI18n()

const searchQuery = ref('')
const selectedCategory = ref('All')

onMounted(() => {
  assetStore.loadBuiltinSprites()
})

const shapeOptions = computed<TabItem[]>(() => [
  { id: 'box', label: t('editor.scatterBox') || 'To\'rtburchak', icon: Square },
  { id: 'line', label: t('editor.scatterLine') || 'Chiziq', icon: Spline },
  { id: 'brush', label: t('editor.scatterBrush') || 'Cho\'tka', icon: Paintbrush },
])

const placementOptions = computed<TabItem[]>(() => [
  { id: 'replace', label: t('editor.scatterReplace') || 'Almashtirish' },
  { id: 'stack', label: t('editor.scatterStack') || 'Ustiga qo\'yish' },
  { id: 'empty-only', label: t('editor.scatterEmptyOnly') || 'Faqat bo\'sh joyga' },
])

const categoryItems = computed<TabItem[]>(() => {
  const items: TabItem[] = [
    { id: 'All', label: t('common.all') || 'Barchasi' },
    { id: 'Trees', label: 'Daraxtlar' },
  ]

  for (const cat of assetStore.categories) {
    if (cat === 'All' || cat === 'Favorites' || cat === 'UsedInMap') continue
    const catLabel = t(`assets.cat${cat}`) !== `assets.cat${cat}` ? t(`assets.cat${cat}`) : cat
    items.push({
      id: cat,
      label: catLabel,
    })
  }
  return items
})

const quickPresets = computed(() => [
  { id: 'trees', label: 'Barcha Daraxtlar', icon: TreePine },
  { id: 'rocks', label: 'Barcha Toshlar', icon: Mountain },
  { id: 'walls', label: 'Devorlar', icon: BrickWall },
])

function isSelected(id: string) {
  return toolStore.scatterSelectedAssetIds.includes(id)
}

const filteredAssets = computed(() => {
  let list = assetStore.assets

  if (selectedCategory.value !== 'All') {
    if (selectedCategory.value === 'Trees') {
      list = list.filter(item => {
        const lower = (item.name || item.id || '').toLowerCase()
        return lower.includes('tree') || lower.includes('oak') || lower.includes('pine') || lower.includes('bush')
      })
    } else {
      list = list.filter(item => item.category === selectedCategory.value)
    }
  }

  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    list = list.filter(item => (item.name || '').toLowerCase().includes(q))
  }

  return list
})

function applyPreset(presetId: string) {
  const ids: string[] = []
  for (const asset of assetStore.assets) {
    const lower = (asset.name || asset.id || '').toLowerCase()
    if (presetId === 'trees') {
      if (lower.includes('tree') || lower.includes('oak') || lower.includes('pine') || lower.includes('bush')) {
        ids.push(asset.id)
      }
    } else if (presetId === 'rocks') {
      if (lower.includes('rock') || lower.includes('stone') || lower.includes('boulder') || lower.includes('ore')) {
        ids.push(asset.id)
      }
    } else if (presetId === 'walls') {
      if (lower.includes('wall') || lower.includes('gate') || lower.includes('fence')) {
        ids.push(asset.id)
      }
    }
  }

  if (ids.length > 0) {
    toolStore.setScatterAssets(ids)
  }
}

function selectAllFiltered() {
  const currentIds = new Set(toolStore.scatterSelectedAssetIds)
  for (const asset of filteredAssets.value) {
    currentIds.add(asset.id)
  }
  toolStore.setScatterAssets(Array.from(currentIds))
}

function startScattering() {
  toolStore.setTool('scatter')
  toolStore.closeScatterModal()
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
  background: rgba(168, 85, 247, 0.3);
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(168, 85, 247, 0.6);
}

.checker-pattern-subtle {
  background-image: 
    linear-gradient(45deg, rgba(255,255,255,0.02) 25%, transparent 25%), 
    linear-gradient(-45deg, rgba(255,255,255,0.02) 25%, transparent 25%), 
    linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.02) 75%), 
    linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.02) 75%);
  background-size: 16px 16px;
  background-position: 0 0, 0 8px, 8px -8px, -8px 0px;
}
</style>
