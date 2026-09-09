<template>
  <UiModal
    :is-open="true"
    :title="$t('anchor.title')"
    :subtitle="$t('anchor.subtitle')"
    :icon="Crosshair"
    icon-color="brand"
    size="4xl"
    @close="$emit('close')"
  >
    <div class="flex flex-col lg:grid lg:grid-cols-12 gap-5 -my-1">
      
      <!-- ================= LEFT COLUMN: VIEWPORT PREVIEW (7 cols) ================= -->
      <div class="lg:col-span-7 flex flex-col gap-2.5 min-w-0">
        
        <!-- Viewport Toolbar (Clean 2-section header, no overlapping) -->
        <div class="flex flex-wrap items-center justify-between gap-2 px-1">
          <!-- View Mode Toggle Tabs -->
          <UiTabs
            v-model="viewMode"
            :items="[
              { id: 'isometric', label: 'Iso Grid', icon: Boxes },
              { id: 'sprite', label: 'Sprite 2D', icon: Image }
            ]"
            size="xs"
          />

          <!-- Controls Group: Opacity & Zoom -->
          <div class="flex items-center gap-2">
            <!-- Sprite Opacity Toggle -->
            <div class="flex items-center gap-1">
              <span class="text-[10px] text-slate-500 font-semibold px-0.5">Opacity:</span>
              <UiTabs
                v-model="spriteOpacity"
                :items="[
                  { id: 100, label: '100%' },
                  { id: 75, label: '75%' },
                  { id: 50, label: '50%' },
                  { id: 30, label: '30%' }
                ]"
                size="xs"
              />
            </div>

            <!-- Zoom Controls -->
            <div class="flex items-center gap-1 bg-slate-950/90 p-0.5 rounded-xl border border-slate-800 text-xs shadow-xs">
              <UiIconButton 
                :icon="ZoomOut" 
                size="xs" 
                variant="ghost" 
                title="Zoom Out"
                :disabled="zoom <= 0.5"
                @click="adjustZoom(-0.25)" 
              />
              <button 
                type="button"
                class="px-1.5 py-0.5 text-[11px] font-mono text-slate-300 hover:text-brand-300 transition-colors cursor-pointer"
                title="Reset Zoom"
                @click="resetView"
              >
                {{ Math.round(zoom * 100) }}%
              </button>
              <UiIconButton 
                :icon="ZoomIn" 
                size="xs" 
                variant="ghost" 
                title="Zoom In"
                :disabled="zoom >= 4.0"
                @click="adjustZoom(0.25)" 
              />
            </div>
          </div>
        </div>

        <!-- Canvas Viewport Box (Clear Preview - High Contrast Grid) -->
        <div 
          ref="viewportRef"
          class="w-full h-80 sm:h-96 rounded-2xl bg-slate-950 checker-pattern relative overflow-hidden border border-slate-800 shadow-inner flex items-center justify-center select-none"
          @wheel.prevent="handleViewportWheel"
        >
          <!-- 1. SVG Base Isometric Grid Layer (Underneath Sprite) -->
          <svg 
            class="absolute inset-0 w-full h-full pointer-events-none"
            :style="{
              transform: `scale(${zoom})`,
              transformOrigin: `${viewportCenter.x}px ${viewportCenter.y}px`
            }"
          >
            <g v-if="viewMode === 'isometric'">
              <!-- Ambient 5x5 Isometric Diamond Grid (Bright & Clearly Visible) -->
              <g opacity="0.65">
                <polygon 
                  v-for="cell in ambientGridCells" 
                  :key="cell.key"
                  :points="cell.points"
                  fill="rgba(15, 23, 42, 0.6)"
                  stroke="rgba(100, 116, 139, 0.75)"
                  stroke-width="1.2"
                />
              </g>

              <!-- Optional Ground Slab Underneath for Preview -->
              <polygon 
                v-if="showGroundGuide"
                :points="primaryCellPolygon"
                fill="rgba(34, 197, 94, 0.25)"
                stroke="rgba(34, 197, 94, 0.8)"
                stroke-width="1.8"
              />

              <!-- Highlight Active Target Footprint Diamond Base -->
              <polygon 
                :points="footprintPolygon"
                fill="rgba(99, 102, 241, 0.2)"
                stroke="rgba(129, 140, 248, 0.9)"
                stroke-width="2"
              />
            </g>

            <!-- 2D Sprite Mode: Center Guides -->
            <g v-else opacity="0.5">
              <line 
                :x1="viewportCenter.x - 120" 
                :y1="viewportCenter.y" 
                :x2="viewportCenter.x + 120" 
                :y2="viewportCenter.y" 
                stroke="#64748b" 
                stroke-width="1" 
                stroke-dasharray="3 3" 
              />
              <line 
                :x1="viewportCenter.x" 
                :y1="viewportCenter.y - 120" 
                :x2="viewportCenter.x" 
                :y2="viewportCenter.y + 120" 
                stroke="#64748b" 
                stroke-width="1" 
                stroke-dasharray="3 3" 
              />
            </g>
          </svg>

          <!-- 2. Rendered Sprite Graphic Layer (Exact Pixel & Bounds Alignment) -->
          <div 
            class="absolute pointer-events-none transition-all duration-75"
            :style="spriteContainerStyle"
          >
            <!-- Sprite Image with Adjustable Opacity -->
            <img 
              ref="spriteImgRef"
              :src="assetPreviewSrc" 
              :alt="asset.name"
              :style="{ opacity: spriteOpacity / 100 }"
              class="w-full h-full block filter drop-shadow-lg select-none pointer-events-none"
              @load="handleImageLoaded"
            />

            <!-- Content Bounding Box Lines (Alpha Bounds - 100% Matching Graphic) -->
            <div 
              v-if="showBoundsGuide && contentBoundsStyle"
              class="absolute border-2 border-amber-400/90 bg-amber-400/10 pointer-events-none"
              :style="contentBoundsStyle"
            >
              <span class="absolute -top-3.5 left-0 text-[8px] font-mono text-amber-300 font-bold px-1 bg-slate-950/90 rounded border border-amber-400/40">
                bounds
              </span>
            </div>

            <!-- Optional Unit Silhouette Scale Reference -->
            <div 
              v-if="showUnitGuide && viewMode === 'isometric'"
              class="absolute -translate-x-1/2 -translate-y-full pointer-events-none opacity-80 z-10"
              :style="{
                left: `${currentX * 100}%`,
                top: `${currentY * 100}%`,
              }"
            >
              <div class="w-7 h-14 bg-linear-to-t from-cyan-500 to-cyan-300/50 rounded-t-full border border-cyan-200 flex items-center justify-center text-[9px] font-extrabold text-slate-950 shadow-md">
                Unit
              </div>
            </div>
          </div>

          <!-- 3. SVG Grid Overlay Layer (ALWAYS ON TOP of Sprite so Grid & Anchor are Never Hidden) -->
          <svg 
            class="absolute inset-0 w-full h-full pointer-events-none z-20"
            :style="{
              transform: `scale(${zoom})`,
              transformOrigin: `${viewportCenter.x}px ${viewportCenter.y}px`
            }"
          >
            <g v-if="viewMode === 'isometric'">
              <!-- Target Tile Diamond Outline (Glowing Cyan on top of sprite) -->
              <polygon 
                :points="footprintPolygon"
                fill="none"
                stroke="#38bdf8"
                stroke-width="1.8"
                stroke-dasharray="4 2"
              />

              <!-- 4 Diamond Vertices (Cyan Dots) -->
              <circle 
                v-for="(vert, vIdx) in footprintVertices" 
                :key="vIdx"
                :cx="vert.x" 
                :cy="vert.y" 
                r="3" 
                fill="#38bdf8" 
                stroke="#0f172a" 
                stroke-width="1" 
              />

              <!-- Footprint Center Crosshairs (Rose/Red) -->
              <line 
                :x1="footprintCenter.x - 18" 
                :y1="footprintCenter.y" 
                :x2="footprintCenter.x + 18" 
                :y2="footprintCenter.y" 
                stroke="#f43f5e" 
                stroke-width="1.8" 
              />
              <line 
                :x1="footprintCenter.x" 
                :y1="footprintCenter.y - 12" 
                :x2="footprintCenter.x" 
                :y2="footprintCenter.y + 12" 
                stroke="#f43f5e" 
                stroke-width="1.8" 
              />
              <circle 
                :cx="footprintCenter.x" 
                :cy="footprintCenter.y" 
                r="4" 
                fill="#f43f5e" 
                stroke="#ffffff" 
                stroke-width="1.5" 
              />
            </g>

            <!-- 2D Sprite Mode Pivot Indicator -->
            <g v-else>
              <circle 
                :cx="spriteModePivot.x" 
                :cy="spriteModePivot.y" 
                r="4.5" 
                fill="#f43f5e" 
                stroke="#ffffff" 
                stroke-width="1.5" 
              />
              <line 
                :x1="spriteModePivot.x - 16" 
                :y1="spriteModePivot.y" 
                :x2="spriteModePivot.x + 16" 
                :y2="spriteModePivot.y" 
                stroke="#f43f5e" 
                stroke-width="1.5" 
              />
              <line 
                :x1="spriteModePivot.x" 
                :y1="spriteModePivot.y - 16" 
                :x2="spriteModePivot.x" 
                :y2="spriteModePivot.y + 16" 
                stroke="#f43f5e" 
                stroke-width="1.5" 
              />
            </g>
          </svg>

          <!-- Bottom Viewport Helper Info Overlay -->
          <div class="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none z-30">
            <!-- Coordinates Pill -->
            <div class="px-2.5 py-1 rounded-xl bg-slate-950/95 border border-slate-800 text-[11px] font-mono text-slate-200 backdrop-blur-md flex items-center gap-2 shadow-md">
              <span class="text-rose-400 font-bold flex items-center gap-1">
                <Crosshair class="w-3 h-3" />
                <span>Pivot:</span>
              </span>
              <span>X: {{ Math.round(currentX * 1000) / 10 }}%</span>
              <span class="text-slate-600">|</span>
              <span>Y: {{ Math.round(currentY * 1000) / 10 }}%</span>
              <span class="text-slate-600">|</span>
              <span class="text-brand-300 font-bold">{{ currentPixelX }}×{{ currentPixelY }} px</span>
            </div>

            <!-- Controls Notice -->
            <div class="hidden sm:flex px-2.5 py-1 rounded-xl bg-slate-950/90 border border-slate-800 text-[10px] text-slate-400 backdrop-blur-md items-center gap-1">
              <Compass class="w-3 h-3 text-brand-400" />
              <span>Use right panel controls & arrows</span>
            </div>
          </div>
        </div>

        <!-- Viewport Helpers Toggle Row -->
        <div class="flex flex-wrap items-center justify-between gap-1.5 px-1 text-xs text-slate-400">
          <div class="flex items-center gap-2.5">
            <label class="flex items-center gap-1.5 cursor-pointer hover:text-slate-200 select-none">
              <input 
                v-model="showGroundGuide" 
                type="checkbox" 
                class="rounded border-slate-700 bg-slate-900 text-brand-500 focus:ring-0 w-3.5 h-3.5 cursor-pointer" 
              />
              <span class="text-[11px]">Ground Slab</span>
            </label>
            <label class="flex items-center gap-1.5 cursor-pointer hover:text-slate-200 select-none">
              <input 
                v-model="showUnitGuide" 
                type="checkbox" 
                class="rounded border-slate-700 bg-slate-900 text-brand-500 focus:ring-0 w-3.5 h-3.5 cursor-pointer" 
              />
              <span class="text-[11px]">Unit Scale</span>
            </label>
            <label class="flex items-center gap-1.5 cursor-pointer hover:text-slate-200 select-none">
              <input 
                v-model="showBoundsGuide" 
                type="checkbox" 
                class="rounded border-slate-700 bg-slate-900 text-brand-500 focus:ring-0 w-3.5 h-3.5 cursor-pointer" 
              />
              <span class="text-[11px]">Content Bounds</span>
            </label>
          </div>

          <span class="text-[10px] text-slate-400 font-mono bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
            Native: {{ resolvedWidth }}×{{ resolvedHeight }} px
          </span>
        </div>

      </div>

      <!-- ================= RIGHT COLUMN: PRECISION CONTROLS (5 cols) ================= -->
      <div class="lg:col-span-5 flex flex-col gap-3.5 bg-slate-950/40 p-4 rounded-2xl border border-slate-800/80">
        
        <!-- 1. Directional Nudge Row -->
        <div class="flex flex-col gap-2 p-3 rounded-xl bg-slate-900/80 border border-slate-800 shadow-xs">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Compass class="w-3.5 h-3.5 text-brand-400" />
              <span>Nudge Pivot</span>
            </span>

            <!-- Step Selector (1px, 5px, 10px) -->
            <UiTabs
              v-model="nudgeStep"
              :items="[
                { id: 1, label: '1px' },
                { id: 5, label: '5px' },
                { id: 10, label: '10px' }
              ]"
              size="xs"
            />
          </div>

          <!-- Single Row Navigation Buttons -->
          <div class="flex items-center justify-center gap-1.5 py-0.5">
            <UiButton 
              variant="secondary"
              size="sm"
              title="Nudge Left (ArrowLeft)"
              @click="nudge(-nudgeStep, 0)"
            >
              <ArrowLeft class="w-4 h-4" />
            </UiButton>
            <UiButton 
              variant="secondary"
              size="sm"
              title="Nudge Up (ArrowUp)"
              @click="nudge(0, -nudgeStep)"
            >
              <ArrowUp class="w-4 h-4" />
            </UiButton>
            <UiButton 
              variant="secondary"
              size="sm"
              title="Reset Center (0.5, 0.5)"
              custom-class="text-brand-400! font-black"
              @click="setPreset(0.5, 0.5)"
            >
              •
            </UiButton>
            <UiButton 
              variant="secondary"
              size="sm"
              title="Nudge Down (ArrowDown)"
              @click="nudge(0, nudgeStep)"
            >
              <ArrowDown class="w-4 h-4" />
            </UiButton>
            <UiButton 
              variant="secondary"
              size="sm"
              title="Nudge Right (ArrowRight)"
              @click="nudge(nudgeStep, 0)"
            >
              <ArrowRight class="w-4 h-4" />
            </UiButton>
          </div>
        </div>

        <!-- 2. Exact Pixel & Percentage Numeric Inputs -->
        <div class="grid grid-cols-2 gap-2 text-xs">
          <!-- Pixel X -->
          <div class="flex flex-col gap-1 p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xs">
            <span class="text-[11px] font-semibold text-slate-400">Anchor X:</span>
            <UiNumberInput
              :model-value="currentPixelX"
              variant="compact"
              size="xs"
              unit="px"
              :min="0"
              :max="resolvedWidth"
              @update:model-value="(val) => handlePixelXInput({ target: { value: String(val) } } as any)"
            />
            <div class="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-0.5">
              <span>{{ Math.round(currentX * 100) }}%</span>
              <span class="text-slate-600">/ {{ resolvedWidth }}px</span>
            </div>
          </div>

          <!-- Pixel Y -->
          <div class="flex flex-col gap-1 p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xs">
            <span class="text-[11px] font-semibold text-slate-400">Anchor Y:</span>
            <UiNumberInput
              :model-value="currentPixelY"
              variant="compact"
              size="xs"
              unit="px"
              :min="0"
              :max="resolvedHeight"
              @update:model-value="(val) => handlePixelYInput({ target: { value: String(val) } } as any)"
            />
            <div class="flex items-center justify-between text-[10px] text-slate-400 font-mono pt-0.5">
              <span>{{ Math.round(currentY * 100) }}%</span>
              <span class="text-slate-600">/ {{ resolvedHeight }}px</span>
            </div>
          </div>
        </div>

        <!-- 3. Smart Anchor Presets -->
        <div class="flex flex-col gap-1.5">
          <span class="text-[11px] font-semibold text-slate-400">Smart Presets:</span>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-xs">
            <UiButton 
              variant="secondary"
              size="xs"
              :leading-icon="Mountain"
              title="Align with top diamond surface for thick ground cliffs"
              custom-class="justify-start! text-left!"
              @click="applyTopSurfacePreset"
            >
              Top Surface
            </UiButton>
            <UiButton 
              variant="secondary"
              size="xs"
              :leading-icon="TreePine"
              title="Bottom of sprite for trees, characters and buildings"
              custom-class="justify-start! text-left!"
              @click="setPreset(0.5, 1.0)"
            >
              Bottom (100%)
            </UiButton>
            <UiButton 
              variant="secondary"
              size="xs"
              :leading-icon="Focus"
              title="Exact center for flat tiles (128x64)"
              custom-class="justify-start! text-left!"
              @click="setPreset(0.5, 0.5)"
            >
              Center (50%)
            </UiButton>
            <UiButton 
              variant="secondary"
              size="xs"
              :leading-icon="Footprints"
              title="Auto-detect bottom of non-transparent pixels"
              custom-class="justify-start! text-left!"
              @click="applyAutoFeetPreset"
            >
              Auto Feet
            </UiButton>
            <UiButton 
              variant="secondary"
              size="xs"
              :leading-icon="Lightbulb"
              title="Top center (0.5, 0.0)"
              custom-class="justify-start! text-left!"
              @click="setPreset(0.5, 0.0)"
            >
              Top (0%)
            </UiButton>
            <UiButton 
              variant="secondary"
              size="xs"
              :leading-icon="Castle"
              title="Tall object anchor (0.5, 0.88)"
              custom-class="justify-start! text-left!"
              @click="setPreset(0.5, 0.88)"
            >
              Tall (88%)
            </UiButton>
          </div>
        </div>

        <!-- 4. Grid Footprint Span Selector -->
        <div class="flex flex-col gap-1.5">
          <div class="flex justify-between items-center text-xs">
            <span class="text-slate-400 font-semibold text-[11px]">Footprint Span:</span>
            <span class="font-mono text-brand-300 font-bold text-xs">{{ currentSpanX }}×{{ currentSpanY }} cells</span>
          </div>
          <UiTabs
            :model-value="`${currentSpanX}x${currentSpanY}`"
            :items="spans.map(s => ({ id: `${s.x}x${s.y}`, label: s.label }))"
            size="xs"
            fill
            @update:model-value="(id) => {
              const found = spans.find(s => `${s.x}x${s.y}` === id)
              if (found) setSpan(found.x, found.y)
            }"
          />
        </div>

        <!-- 5. Base Scale Multiplier -->
        <div class="flex flex-col gap-1 pt-1 border-t border-slate-800/80">
          <div class="flex justify-between items-center text-xs">
            <span class="text-slate-400 font-semibold text-[11px]">Scale Multiplier:</span>
            <div class="flex items-center gap-1.5">
              <span class="font-mono text-brand-300 font-bold text-xs">{{ Math.round(currentScale * 100) }}%</span>
              <button 
                v-if="currentScale !== 1.0"
                type="button" 
                class="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
                @click="currentScale = 1.0"
              >
                Reset
              </button>
            </div>
          </div>
          <UiSlider
            v-model="currentScale"
            :min="0.3"
            :max="3.0"
            :step="0.05"
            :format-value="(val) => `${Math.round(val * 100)}%`"
          />
        </div>

      </div>

    </div>

    <!-- Footer Actions -->
    <template #footer>
      <div class="flex items-center justify-between w-full">
        <div class="text-[11px] text-slate-400 flex items-center gap-1">
          <Info class="w-3.5 h-3.5 text-brand-400 shrink-0" />
          <span>Use keyboard arrows or D-Pad to calibrate anchor</span>
        </div>

        <div class="flex items-center gap-2">
          <UiButton
            variant="ghost"
            size="sm"
            @click="$emit('close')"
          >
            Cancel
          </UiButton>
          <UiButton
            variant="primary"
            size="sm"
            :leading-icon="Check"
            @click="save"
          >
            Apply & Save
          </UiButton>
        </div>
      </div>
    </template>
  </UiModal>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { 
  Crosshair, Boxes, Image, ZoomIn, ZoomOut, 
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight, 
  Compass, Check, Info, Mountain, TreePine, 
  Focus, Footprints, Lightbulb, Castle 
} from 'lucide-vue-next'
import { UiModal, UiSlider, UiButton, UiIconButton, UiTabs, UiNumberInput } from './ui'
import { AssetItem } from '../types/map'
import { useAssetStore } from '../stores/assetStore'

const props = defineProps<{
  asset: AssetItem
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save', updates: { anchorX: number; anchorY: number; spanX: number; spanY: number; scale: number }): void
}>()

const assetStore = useAssetStore()

// State
const currentX = ref<number>(props.asset.anchorX ?? 0.5)
const currentY = ref<number>(props.asset.anchorY ?? 0.5)
const currentSpanX = ref<number>(props.asset.spanX ?? 1)
const currentSpanY = ref<number>(props.asset.spanY ?? 1)
const currentScale = ref<number>(props.asset.scale ?? 1.0)

const viewMode = ref<'isometric' | 'sprite'>('isometric')
const zoom = ref<number>(1.25)
const nudgeStep = ref<number>(1)
const spriteOpacity = ref<number>(100)

const showGroundGuide = ref<boolean>(true)
const showUnitGuide = ref<boolean>(false)
const showBoundsGuide = ref<boolean>(true)

const viewportRef = ref<HTMLDivElement | null>(null)
const spriteImgRef = ref<HTMLImageElement | null>(null)
const naturalImgWidth = ref<number>(props.asset.width || 128)
const naturalImgHeight = ref<number>(props.asset.height || 128)

// Isometric constants
const TILE_WIDTH = 128
const TILE_HEIGHT = 64

const spans = [
  { label: '1×1', x: 1, y: 1 },
  { label: '2×2', x: 2, y: 2 },
  { label: '3×3', x: 3, y: 3 },
  { label: '2×1', x: 2, y: 1 },
  { label: '1×2', x: 1, y: 2 },
]

const assetPreviewSrc = computed(() => {
  return assetStore.getFullAssetPreview(props.asset) || props.asset.src || props.asset.previewSrc || ''
})

const resolvedWidth = computed(() => {
  return props.asset.width || naturalImgWidth.value || 128
})

const resolvedHeight = computed(() => {
  return props.asset.height || naturalImgHeight.value || 128
})

const currentPixelX = computed(() => {
  return Math.round(currentX.value * resolvedWidth.value)
})

const currentPixelY = computed(() => {
  return Math.round(currentY.value * resolvedHeight.value)
})

// Dynamic Viewport Center based on box size
const viewportWidth = ref<number>(420)
const viewportHeight = ref<number>(380)

const viewportCenter = computed(() => {
  return { 
    x: viewportWidth.value / 2, 
    y: viewportHeight.value / 2 + 15
  }
})

// Footprint center in Isometric Space
const footprintCenter = computed(() => {
  const sx = currentSpanX.value
  const sy = currentSpanY.value
  const offsetX = ((sx - 1) - (sy - 1)) * (TILE_WIDTH / 4)
  const offsetY = ((sx - 1) + (sy - 1)) * (TILE_HEIGHT / 4)
  return {
    x: viewportCenter.value.x + offsetX,
    y: viewportCenter.value.y + offsetY,
  }
})

// Ambient 5x5 Isometric Diamond Grid (Bright and Clear)
const ambientGridCells = computed(() => {
  const cells = []
  const halfW = TILE_WIDTH / 2
  const halfH = TILE_HEIGHT / 2

  for (let c = -2; c <= 2; c++) {
    for (let r = -2; r <= 2; r++) {
      if (c === 0 && r === 0) continue
      const cx = viewportCenter.value.x + (c - r) * halfW
      const cy = viewportCenter.value.y + (c + r) * halfH
      const points = `${cx},${cy - halfH} ${cx + halfW},${cy} ${cx},${cy + halfH} ${cx - halfW},${cy}`
      cells.push({ key: `${c},${r}`, points })
    }
  }
  return cells
})

// Primary 1x1 Cell Polygon
const primaryCellPolygon = computed(() => {
  const cx = viewportCenter.value.x
  const cy = viewportCenter.value.y
  const halfW = TILE_WIDTH / 2
  const halfH = TILE_HEIGHT / 2
  return `${cx},${cy - halfH} ${cx + halfW},${cy} ${cx},${cy + halfH} ${cx - halfW},${cy}`
})

// Footprint Polygon (1x1, 2x2, etc.)
const footprintPolygon = computed(() => {
  const sx = currentSpanX.value
  const sy = currentSpanY.value
  const halfW = TILE_WIDTH / 2
  const halfH = TILE_HEIGHT / 2

  const topX = viewportCenter.value.x
  const topY = viewportCenter.value.y - halfH

  const rightX = viewportCenter.value.x + sx * halfW
  const rightY = viewportCenter.value.y - halfH + sx * halfH

  const bottomX = viewportCenter.value.x + (sx - sy) * halfW
  const bottomY = viewportCenter.value.y - halfH + (sx + sy) * halfH

  const leftX = viewportCenter.value.x - sy * halfW
  const leftY = viewportCenter.value.y - halfH + sy * halfH

  return `${topX},${topY} ${rightX},${rightY} ${bottomX},${bottomY} ${leftX},${leftY}`
})

// Vertices of Footprint Diamond for visual corner points
const footprintVertices = computed(() => {
  const sx = currentSpanX.value
  const sy = currentSpanY.value
  const halfW = TILE_WIDTH / 2
  const halfH = TILE_HEIGHT / 2

  return [
    { x: viewportCenter.value.x, y: viewportCenter.value.y - halfH }, // Top
    { x: viewportCenter.value.x + sx * halfW, y: viewportCenter.value.y - halfH + sx * halfH }, // Right
    { x: viewportCenter.value.x + (sx - sy) * halfW, y: viewportCenter.value.y - halfH + (sx + sy) * halfH }, // Bottom
    { x: viewportCenter.value.x - sy * halfW, y: viewportCenter.value.y - halfH + sy * halfH }, // Left
  ]
})

// Sprite Container CSS Style
const spriteContainerStyle = computed(() => {
  if (viewMode.value === 'isometric') {
    // Iso Engine formula: baseScale = (TILE_WIDTH * spanX) / assetWidth
    const baseScale = (TILE_WIDTH * currentSpanX.value) / resolvedWidth.value
    const effectiveScale = baseScale * currentScale.value * zoom.value
    const renderW = resolvedWidth.value * effectiveScale
    const renderH = resolvedHeight.value * effectiveScale

    const left = footprintCenter.value.x - currentX.value * renderW
    const top = footprintCenter.value.y - currentY.value * renderH

    return {
      left: `${left}px`,
      top: `${top}px`,
      width: `${renderW}px`,
      height: `${renderH}px`,
    }
  } else {
    // 2D Sprite View Mode: Centered sprite
    const renderW = resolvedWidth.value * zoom.value
    const renderH = resolvedHeight.value * zoom.value
    const left = viewportCenter.value.x - renderW / 2
    const top = viewportCenter.value.y - renderH / 2

    return {
      left: `${left}px`,
      top: `${top}px`,
      width: `${renderW}px`,
      height: `${renderH}px`,
    }
  }
})

// Sprite Mode Pivot Point (for 2D Sprite mode overlay)
const spriteModePivot = computed(() => {
  const renderW = resolvedWidth.value * zoom.value
  const renderH = resolvedHeight.value * zoom.value
  const left = viewportCenter.value.x - renderW / 2
  const top = viewportCenter.value.y - renderH / 2
  return {
    x: left + currentX.value * renderW,
    y: top + currentY.value * renderH,
  }
})

// Content Bounds (Alpha Bounding Box - 100% Matching Graphic)
const contentBoundsStyle = computed(() => {
  const b = props.asset.contentBounds
  if (!b) return null
  const w = resolvedWidth.value
  const h = resolvedHeight.value
  return {
    left: `${(b.minX / w) * 100}%`,
    top: `${(b.minY / h) * 100}%`,
    width: `${((b.maxX - b.minX) / w) * 100}%`,
    height: `${((b.maxY - b.minY) / h) * 100}%`,
  }
})

function handleImageLoaded(e: Event) {
  const img = e.target as HTMLImageElement
  if (img.naturalWidth) naturalImgWidth.value = img.naturalWidth
  if (img.naturalHeight) naturalImgHeight.value = img.naturalHeight
}

function adjustZoom(delta: number) {
  zoom.value = Number(Math.max(0.5, Math.min(4.0, zoom.value + delta)).toFixed(2))
}

function resetView() {
  zoom.value = 1.25
}

function setPreset(x: number, y: number) {
  currentX.value = Number(Math.max(0, Math.min(1, x)).toFixed(3))
  currentY.value = Number(Math.max(0, Math.min(1, y)).toFixed(3))
}

function applyTopSurfacePreset() {
  currentX.value = 0.5
  // For tall terrain, top diamond center is typically at y=32px
  if (resolvedHeight.value > 64) {
    currentY.value = Number((32 / resolvedHeight.value).toFixed(3))
  } else {
    currentY.value = 0.5
  }
}

function applyAutoFeetPreset() {
  const b = props.asset.contentBounds
  if (b) {
    const avgX = (b.minX + b.maxX) / 2
    currentX.value = Number((avgX / resolvedWidth.value).toFixed(3))
    currentY.value = Number((b.maxY / resolvedHeight.value).toFixed(3))
  } else {
    setPreset(0.5, 1.0)
  }
}

function setSpan(x: number, y: number) {
  currentSpanX.value = x
  currentSpanY.value = y
}

function nudge(dxPixels: number, dyPixels: number) {
  const nextPxX = currentPixelX.value + dxPixels
  const nextPxY = currentPixelY.value + dyPixels
  currentX.value = Number(Math.max(0, Math.min(1, nextPxX / resolvedWidth.value)).toFixed(4))
  currentY.value = Number(Math.max(0, Math.min(1, nextPxY / resolvedHeight.value)).toFixed(4))
}

function handlePixelXInput(e: Event) {
  const val = parseFloat((e.target as HTMLInputElement).value)
  if (!isNaN(val)) {
    currentX.value = Number(Math.max(0, Math.min(1, val / resolvedWidth.value)).toFixed(4))
  }
}

function handlePixelYInput(e: Event) {
  const val = parseFloat((e.target as HTMLInputElement).value)
  if (!isNaN(val)) {
    currentY.value = Number(Math.max(0, Math.min(1, val / resolvedHeight.value)).toFixed(4))
  }
}

function handleViewportWheel(e: WheelEvent) {
  const delta = e.deltaY < 0 ? 0.15 : -0.15
  adjustZoom(delta)
}

// Keyboard Navigation Listener
function handleKeyDown(e: KeyboardEvent) {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
    e.preventDefault()
    const step = e.shiftKey ? nudgeStep.value * 5 : nudgeStep.value
    if (e.key === 'ArrowUp') nudge(0, -step)
    if (e.key === 'ArrowDown') nudge(0, step)
    if (e.key === 'ArrowLeft') nudge(-step, 0)
    if (e.key === 'ArrowRight') nudge(step, 0)
  }
}

function updateViewportDimensions() {
  if (viewportRef.value) {
    viewportWidth.value = viewportRef.value.clientWidth || 420
    viewportHeight.value = viewportRef.value.clientHeight || 380
  }
}

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
  updateViewportDimensions()
  if (viewportRef.value && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      updateViewportDimensions()
    })
    resizeObserver.observe(viewportRef.value)
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
})

function save() {
  emit('save', {
    anchorX: currentX.value,
    anchorY: currentY.value,
    spanX: currentSpanX.value,
    spanY: currentSpanY.value,
    scale: currentScale.value,
  })
}
</script>

<style scoped>
.checker-pattern {
  background-image: 
    linear-gradient(45deg, rgba(30, 41, 59, 0.4) 25%, transparent 25%),
    linear-gradient(-45deg, rgba(30, 41, 59, 0.4) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, rgba(30, 41, 59, 0.4) 75%),
    linear-gradient(-45deg, transparent 75%, rgba(30, 41, 59, 0.4) 75%);
  background-size: 16px 16px;
  background-position: 0 0, 0 8px, 8px -8px, -8px 0px;
}
</style>
