<template>
  <UiModal
    :is-open="toolStore.isScatterModalOpen"
    :title="$t('editor.scatterModalTitle')"
    :subtitle="$t('editor.scatterModalSubtitle')"
    size="full"
    custom-class="w-[92vw]! max-w-[92vw]! max-h-[92dvh]!"
    body-class="p-3! sm:p-4!"
    @close="toolStore.closeScatterModal"
  >
    <!-- 2-Column Responsive Layout: Left Gallery (Spacious) | Right Config & Distribution -->
    <div class="flex flex-col lg:flex-row gap-3.5 h-[78vh] max-h-[78vh] overflow-hidden select-none">
      
      <!-- ========================================================================= -->
      <!-- LEFT COLUMN: SPACIOUS SPRITE GALLERY                                      -->
      <!-- ========================================================================= -->
      <div class="flex-1 flex flex-col min-w-0 bg-slate-950/70 border border-slate-800/80 rounded-2xl overflow-hidden p-3.5 gap-3 shadow-inner">
        
        <!-- Search & Quick Selection Header -->
        <div class="flex flex-wrap items-center justify-between gap-2 shrink-0">
          <!-- Search Bar -->
          <div class="flex-1 min-w-44 max-w-sm">
            <UiInput
              v-model="searchQuery"
              size="sm"
              :placeholder="$t('sidebar.searchAssets')"
              :leading-icon="Search"
              clearable
            />
          </div>

          <!-- Quick Actions & Count Badge -->
          <div class="flex items-center gap-2">
            <UiBadge variant="brand" size="xs">
              {{ filteredAssets.length }} / {{ assetStore.assets.length }}
            </UiBadge>

            <UiButton
              variant="secondary"
              size="xs"
              :leading-icon="CheckCheck"
              custom-class="text-brand-300 hover:text-white"
              :disabled="filteredAssets.length === 0"
              @click="selectAllFiltered"
            >
              {{ $t('assetEditor.selectAll') || 'Barchasini tanlash' }}
            </UiButton>
          </div>
        </div>

        <!-- Real Categories Filter Chips -->
        <div class="overflow-x-auto no-scrollbar pb-0.5 shrink-0">
          <UiTabs
            v-model="selectedCategory"
            :items="categoryItems"
            variant="pills"
            size="xs"
          />
        </div>

        <!-- Main Sprite Grid (Large, uncropped, clean preview cards) -->
        <div class="flex-1 overflow-y-auto custom-scrollbar p-1">
          <div 
            v-if="filteredAssets.length > 0"
            class="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 gap-3"
          >
            <div
              v-for="asset in filteredAssets"
              :key="asset.id"
              class="group relative flex items-center justify-center p-2.5 rounded-2xl border aspect-square cursor-pointer transition-all duration-150 overflow-hidden select-none checker-pattern-subtle"
              :class="[
                isSelected(asset.id)
                  ? 'border-brand-400 bg-brand-950/80 ring-2 ring-brand-500/80 shadow-[0_0_20px_rgba(168,85,247,0.35)] scale-[1.02]'
                  : 'border-slate-800/90 bg-slate-900/80 hover:border-slate-600 hover:bg-slate-850 hover:scale-[1.02]'
              ]"
              :title="asset.name"
              @click="toolStore.toggleScatterAsset(asset.id)"
            >
              <!-- Selected Checkmark Badge (Top-right) -->
              <div
                v-if="isSelected(asset.id)"
                class="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-brand-500 text-white flex items-center justify-center shadow-lg animate-in zoom-in-75 duration-100 ring-2 ring-brand-950 z-10"
              >
                <Check class="w-3.5 h-3.5 stroke-3" />
              </div>

              <!-- Weight % Chip on Thumbnail (Top-left if selected) -->
              <div
                v-if="isSelected(asset.id)"
                class="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-slate-950/90 border border-brand-500/50 text-[10px] font-mono font-bold text-brand-300 shadow-md z-10"
              >
                {{ getAssetPercentage(asset.id) }}%
              </div>

              <!-- Sprite Preview Image (Centered, crisp, proportional) -->
              <img
                :src="assetStore.getAssetPreview(asset)"
                :alt="asset.name"
                width="84"
                height="84"
                decoding="async"
                class="max-w-full max-h-full aspect-square object-contain filter drop-shadow-md pointer-events-none group-hover:scale-110 transition-transform duration-200"
                loading="lazy"
              />

              <!-- Hover Name Subtitle -->
              <div class="absolute inset-x-0 bottom-0 py-0.5 px-1 bg-slate-950/95 backdrop-blur-xs text-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border-t border-slate-800/80 z-10">
                <span class="text-[9px] font-semibold text-slate-200 truncate block">
                  {{ asset.name.replace(/\.png|\.jpg|\.webp/gi, '').replace(/[_-]/g, ' ') }}
                </span>
              </div>
            </div>
          </div>

          <!-- Empty State -->
          <div
            v-else
            class="h-full min-h-60 flex flex-col items-center justify-center text-center gap-2 border-2 border-dashed border-slate-800 rounded-2xl text-slate-500"
          >
            <Search class="w-8 h-8 text-slate-600" />
            <span class="text-xs font-semibold text-slate-400">{{ $t('sidebar.noAssets') }}</span>
          </div>
        </div>
      </div>

      <!-- ========================================================================= -->
      <!-- RIGHT COLUMN: SCATTER CONFIGURATION & WEIGHT PERCENTAGES                  -->
      <!-- ========================================================================= -->
      <div class="w-full lg:w-96 xl:w-105 flex flex-col gap-3 min-w-0 bg-slate-900/90 border border-slate-800/80 rounded-2xl p-4 overflow-y-auto custom-scrollbar shrink-0 shadow-inner">
        
        <!-- SECTION 1: SHAPE, PLACEMENT MODE & DENSITY -->
        <div class="flex flex-col gap-2.5 p-3 rounded-xl bg-slate-950/70 border border-slate-800/70">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Boxes class="w-3.5 h-3.5 text-brand-400" />
              <span>{{ $t('editor.scatterShape') }}:</span>
            </span>
            <UiTabs
              v-model="toolStore.scatterShape"
              :items="shapeOptions"
              variant="brand"
              size="xs"
            />
          </div>

          <div class="flex items-center justify-between pt-2 border-t border-slate-800/60">
            <span class="text-xs font-bold text-slate-200">
              {{ $t('editor.scatterPlacementMode') }}:
            </span>
            <UiTabs
              v-model="toolStore.scatterPlacementMode"
              :items="placementOptions"
              variant="cyan"
              size="xs"
            />
          </div>

          <!-- Density Slider -->
          <div class="pt-2 border-t border-slate-800/60">
            <UiSlider
              v-model="toolStore.scatterDensity"
              :label="$t('editor.scatterDensity')"
              :min="10"
              :max="100"
              :step="5"
              unit="%"
            />
          </div>
        </div>

        <!-- SECTION 2: CONTROLLED RANDOM SCALE & FINE PIXEL OFFSET -->
        <div class="flex flex-col gap-2.5 p-3 rounded-xl bg-slate-950/70 border border-slate-800/70">
          
          <!-- Random Scale Switch & Bounds -->
          <div class="flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <label class="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-200 hover:text-white transition-colors">
                <input
                  v-model="toolStore.scatterRandomScale"
                  type="checkbox"
                  class="rounded bg-slate-950 border-slate-700 text-brand-500 focus:ring-brand-500/40 w-4 h-4 cursor-pointer"
                />
                <Maximize2 class="w-3.5 h-3.5 text-amber-400" />
                <span>{{ $t('editor.scatterRandomScale') }}</span>
              </label>

              <UiBadge v-if="toolStore.scatterRandomScale" variant="amber" size="xs">
                {{ toolStore.scatterMinScale.toFixed(2) }}x - {{ toolStore.scatterMaxScale.toFixed(2) }}x
              </UiBadge>
            </div>

            <!-- Min/Max Scale Sliders when enabled -->
            <div v-if="toolStore.scatterRandomScale" class="grid grid-cols-2 gap-2 pt-1.5 animate-in fade-in duration-150">
              <UiSlider
                v-model="toolStore.scatterMinScale"
                :label="$t('editor.scatterMinScale')"
                :min="0.3"
                :max="1.5"
                :step="0.05"
                unit="x"
              />
              <UiSlider
                v-model="toolStore.scatterMaxScale"
                :label="$t('editor.scatterMaxScale')"
                :min="0.8"
                :max="2.5"
                :step="0.05"
                unit="x"
              />
            </div>
          </div>

          <!-- Random Fine Pixel Offset Switch & Bounds -->
          <div class="flex flex-col gap-2 pt-2 border-t border-slate-800/60">
            <div class="flex items-center justify-between">
              <label class="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-200 hover:text-white transition-colors">
                <input
                  v-model="toolStore.scatterRandomOffset"
                  type="checkbox"
                  class="rounded bg-slate-950 border-slate-700 text-brand-500 focus:ring-brand-500/40 w-4 h-4 cursor-pointer"
                />
                <Move class="w-3.5 h-3.5 text-sky-400" />
                <span>{{ $t('editor.scatterRandomOffset') }}</span>
              </label>

              <UiBadge v-if="toolStore.scatterRandomOffset" variant="cyan" size="xs">
                ±{{ toolStore.scatterMaxOffsetX }}px, ±{{ toolStore.scatterMaxOffsetY }}px
              </UiBadge>
            </div>

            <!-- Max Offset X & Y Sliders when enabled -->
            <div v-if="toolStore.scatterRandomOffset" class="grid grid-cols-2 gap-2 pt-1.5 animate-in fade-in duration-150">
              <UiSlider
                v-model="toolStore.scatterMaxOffsetX"
                :label="$t('editor.scatterMaxOffsetX')"
                :min="0"
                :max="24"
                :step="1"
                unit="px"
              />
              <UiSlider
                v-model="toolStore.scatterMaxOffsetY"
                :label="$t('editor.scatterMaxOffsetY')"
                :min="0"
                :max="24"
                :step="1"
                unit="px"
              />
            </div>
          </div>

          <!-- Random Flip Switch -->
          <div class="pt-2 border-t border-slate-800/60">
            <label class="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-200 hover:text-white transition-colors">
              <input
                v-model="toolStore.scatterRandomFlip"
                type="checkbox"
                class="rounded bg-slate-950 border-slate-700 text-brand-500 focus:ring-brand-500/40 w-4 h-4 cursor-pointer"
              />
              <FlipHorizontal class="w-3.5 h-3.5 text-cyan-400" />
              <span>{{ $t('editor.scatterRandomFlip') }}</span>
            </label>
          </div>
        </div>

        <!-- SECTION 3: SELECTED ASSETS LIST & WEIGHT DISTRIBUTION (%) -->
        <div class="flex-1 flex flex-col min-h-48 gap-2 p-3 rounded-xl bg-slate-950/70 border border-slate-800/70">
          <!-- Section Title & Clear Action -->
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-1.5">
              <Percent class="w-3.5 h-3.5 text-brand-400" />
              <span class="text-xs font-bold text-slate-200">{{ $t('editor.scatterSelectedAssets') }}</span>
              <UiBadge variant="brand" size="xs">
                {{ toolStore.scatterSelectedAssetIds.length }}
              </UiBadge>
            </div>

            <UiButton
              v-if="toolStore.scatterSelectedAssetIds.length > 0"
              variant="danger"
              size="xs"
              :leading-icon="Trash2"
              @click="toolStore.clearScatterAssets()"
            >
              {{ $t('assetEditor.clearAll') || 'Tozalash' }}
            </UiButton>
          </div>

          <!-- Selected List Items with Percentage Badges and Weight Steppers -->
          <div 
            v-if="toolStore.scatterSelectedAssetIds.length > 0"
            class="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-1.5 pr-0.5"
          >
            <div
              v-for="id in toolStore.scatterSelectedAssetIds"
              :key="id"
              class="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-900/90 border border-slate-800/90 shadow-xs hover:border-slate-700 transition-colors"
            >
              <!-- Asset Preview & Name -->
              <div class="flex items-center gap-2 min-w-0 flex-1">
                <div class="w-9 h-9 rounded-lg bg-slate-950 border border-slate-800 p-0.5 flex items-center justify-center shrink-0">
                  <img
                    :src="assetStore.getAssetPreview(id)"
                    class="max-w-full max-h-full object-contain pointer-events-none"
                  />
                </div>
                <div class="flex flex-col min-w-0">
                  <span class="text-[11px] font-bold text-slate-200 truncate">
                    {{ (assetStore.assets.find(a => a.id === id)?.name || id).replace(/\.png|\.jpg|\.webp/gi, '').replace(/[_-]/g, ' ') }}
                  </span>
                  <span class="text-[10px] font-mono font-bold text-brand-300">
                    {{ getAssetPercentage(id) }}% {{ $t('editor.scatterWeight').toLowerCase() }}
                  </span>
                </div>
              </div>

              <!-- Weight Controls: Decrement / Weight input / Increment / Remove -->
              <div class="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  class="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center cursor-pointer transition-colors"
                  title="-10"
                  @click="adjustWeight(id, -10)"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  :value="toolStore.scatterAssetWeights[id] || 100"
                  class="w-11 h-6 bg-slate-950 border border-slate-700 rounded text-center text-xs font-mono font-bold text-slate-100 focus:outline-none focus:border-brand-500"
                  @input="(e) => onWeightInput(id, (e.target as HTMLInputElement).value)"
                />
                <button
                  type="button"
                  class="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center cursor-pointer transition-colors"
                  title="+10"
                  @click="adjustWeight(id, 10)"
                >
                  +
                </button>

                <button
                  type="button"
                  class="w-5 h-5 rounded bg-rose-950/80 hover:bg-rose-900 border border-rose-800/80 text-rose-300 flex items-center justify-center ml-1 cursor-pointer transition-colors"
                  :title="$t('common.remove')"
                  @click="toolStore.toggleScatterAsset(id)"
                >
                  <X class="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          <!-- Empty State when 0 assets selected -->
          <div
            v-else
            class="flex-1 flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-800 rounded-xl text-slate-500 gap-1.5"
          >
            <Boxes class="w-6 h-6 text-slate-600" />
            <span class="text-xs font-semibold text-slate-400">
              {{ $t('editor.scatterNoSelected') }}
            </span>
          </div>
        </div>

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
          {{ $t('editor.scatterStart') }}
        </UiButton>
      </div>
    </template>
  </UiModal>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  Boxes,
  Search,
  Check,
  CheckCheck,
  X,
  Dices,
  Square,
  Spline,
  Paintbrush,
  Trash2,
  Percent,
  Maximize2,
  Move,
  FlipHorizontal,
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
  { id: 'stack', label: t('editor.scatterStack') || 'Ustiga qo\'yish' },
  { id: 'replace', label: t('editor.scatterReplace') || 'Almashtirish' },
  { id: 'empty-only', label: t('editor.scatterEmptyOnly') || 'Faqat bo\'sh' },
])

// Real categories that exist in the asset store
const categoryItems = computed<TabItem[]>(() => {
  const items: TabItem[] = [
    { id: 'All', label: t('sidebar.allCategories') || t('common.all') || 'All' },
  ]

  for (const cat of assetStore.categories) {
    if (cat === 'All' || cat === 'Favorites' || cat === 'UsedInMap') continue
    // Only display categories that actually contain assets
    if (assetStore.assets.some(a => a.category === cat)) {
      const catKey = `sidebar.cat${cat}`
      const catLabel = t(catKey) !== catKey ? t(catKey) : cat
      items.push({
        id: cat,
        label: catLabel,
      })
    }
  }
  return items
})

function isSelected(id: string) {
  return toolStore.scatterSelectedAssetIds.includes(id)
}

const filteredAssets = computed(() => {
  let list = assetStore.assets

  if (selectedCategory.value !== 'All') {
    list = list.filter(item => item.category === selectedCategory.value)
  }

  const q = searchQuery.value.trim().toLowerCase()
  if (q) {
    list = list.filter(item => (item.name || '').toLowerCase().includes(q))
  }

  return list
})

function selectAllFiltered() {
  const currentIds = new Set(toolStore.scatterSelectedAssetIds)
  for (const asset of filteredAssets.value) {
    currentIds.add(asset.id)
  }
  toolStore.setScatterAssets(Array.from(currentIds))
}

// Calculate normalized percentage distribution
const totalScatterWeight = computed(() => {
  let sum = 0
  for (const id of toolStore.scatterSelectedAssetIds) {
    sum += Math.max(1, toolStore.scatterAssetWeights[id] || 100)
  }
  return sum
})

function getAssetPercentage(id: string): number {
  if (totalScatterWeight.value <= 0 || toolStore.scatterSelectedAssetIds.length === 0) return 0
  const w = Math.max(1, toolStore.scatterAssetWeights[id] || 100)
  return Math.round((w / totalScatterWeight.value) * 100)
}

function adjustWeight(id: string, delta: number) {
  const current = toolStore.scatterAssetWeights[id] || 100
  const next = Math.max(1, Math.min(1000, current + delta))
  toolStore.setScatterAssetWeight(id, next)
}

function onWeightInput(id: string, rawVal: string) {
  const parsed = parseInt(rawVal, 10)
  if (!isNaN(parsed) && parsed >= 1) {
    toolStore.setScatterAssetWeight(id, parsed)
  }
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
