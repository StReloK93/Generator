<template>
  <UiModal
    :is-open="store.isCropModalOpen"
    :title="$t('assetEditor.cropTitle')"
    :subtitle="$t('assetEditor.cropSubtitle')"
    size="xl"
    @close="store.closeCropModal"
  >
    <div class="flex flex-col gap-4 max-h-[82vh] overflow-hidden select-none">
      
      <!-- Top Control Toolbar: Aspect Ratio, Rotation, Auto-Trim -->
      <div class="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-inner">
        <!-- 1. Aspect Ratio Presets -->
        <div class="flex items-center gap-1.5">
          <span class="text-[11px] font-semibold text-slate-400 mr-1 hidden sm:inline">{{ $t('assetEditor.aspectRatio') || 'Nisbat' }}:</span>
          <UiTabs
            v-model="aspectRatio"
            :items="aspectOptions"
            variant="cyan"
            size="xs"
            @update:model-value="(val: string | number) => applyAspectRatio(String(val))"
          />
        </div>

        <!-- 2. Auto-Trim & Transform Actions -->
        <div class="flex items-center gap-1">
          <!-- Auto-Trim Transparency -->
          <UiButton
            variant="game-amber"
            size="xs"
            :leading-icon="Sparkles"
            :title="$t('assetEditor.autoTrimDesc')"
            :loading="isTrimming"
            @click="handleAutoTrim"
          >
            <span>{{ $t('assetEditor.autoTrim') }}</span>
          </UiButton>

          <div class="h-4 w-px bg-slate-800 mx-1"></div>

          <!-- Rotate CCW -->
          <UiIconButton
            :icon="RotateCcw"
            size="xs"
            variant="ghost"
            :title="$t('assetEditor.rotate90') + ' (CCW)'"
            @click="rotateImage(-90)"
          />

          <!-- Rotate CW -->
          <UiIconButton
            :icon="RotateCw"
            size="xs"
            variant="ghost"
            :title="$t('assetEditor.rotate90') + ' (CW)'"
            @click="rotateImage(90)"
          />

          <!-- Flip Horizontal -->
          <UiIconButton
            :icon="FlipHorizontal"
            size="xs"
            variant="ghost"
            :title="$t('assetEditor.flipH')"
            @click="toggleFlipH"
          />

          <!-- Flip Vertical -->
          <UiIconButton
            :icon="FlipVertical"
            size="xs"
            variant="ghost"
            :title="$t('assetEditor.flipV')"
            @click="toggleFlipV"
          />

          <!-- Reset -->
          <UiIconButton
            :icon="RefreshCw"
            size="xs"
            variant="ghost"
            :title="$t('assetEditor.resetCrop')"
            @click="resetCrop"
          />
        </div>
      </div>

      <!-- Main Interactive Cropper Stage -->
      <div 
        ref="cropContainerRef"
        class="relative w-full h-[380px] sm:h-[440px] rounded-2xl bg-slate-950 border border-slate-800/90 overflow-hidden flex items-center justify-center checker-pattern cursor-crosshair"
        @mousedown="handleStageMouseDown"
        @mousemove="handleStageMouseMove"
        @mouseup="handleStageMouseUp"
        @mouseleave="handleStageMouseUp"
        @wheel.prevent="handleStageWheel"
      >
        <!-- Canvas containing the image & guides -->
        <canvas 
          ref="cropCanvasRef"
          class="block max-w-full max-h-full drop-shadow-2xl pointer-events-none"
        ></canvas>

        <!-- Interactive Crop Overlay Layer -->
        <div 
          v-if="imageLoaded"
          class="absolute pointer-events-none"
          :style="cropOverlayStyle"
        >
          <!-- Active Selection Box with Handles -->
          <div 
            class="absolute inset-0 border-2 border-cyan-400 bg-cyan-500/10 pointer-events-auto cursor-move shadow-[0_0_0_9999px_rgba(2,6,23,0.7)]"
            @mousedown.stop="startDragCrop('move', $event)"
          >
            <!-- Rule of Thirds Lines -->
            <div class="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
              <div class="border-r border-b border-white/20"></div>
              <div class="border-r border-b border-white/20"></div>
              <div class="border-b border-white/20"></div>
              <div class="border-r border-b border-white/20"></div>
              <div class="border-r border-b border-white/20"></div>
              <div class="border-b border-white/20"></div>
              <div class="border-r border-white/20"></div>
              <div class="border-r border-white/20"></div>
              <div></div>
            </div>

            <!-- Dimensions Float Tooltip (Width x Height px) -->
            <div class="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-slate-900/95 border border-cyan-400/60 text-cyan-300 font-mono text-[10px] font-black shadow-lg pointer-events-none whitespace-nowrap">
              {{ Math.round(cropRect.width) }} × {{ Math.round(cropRect.height) }} px
            </div>

            <!-- 8 Resizing Handles -->
            <!-- Corner: NW (Top-Left) -->
            <div 
              class="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-cyan-500 rounded-sm cursor-nwse-resize shadow hover:scale-125 transition-transform hover:bg-amber-400"
              @mousedown.stop="startDragCrop('nw', $event)"
            />
            <!-- Edge: N (Top) -->
            <div 
              class="absolute -top-1.5 left-1/2 -translate-x-1/2 w-4 h-3 bg-white border-2 border-cyan-500 rounded-sm cursor-ns-resize shadow hover:scale-125 transition-transform hover:bg-amber-400"
              @mousedown.stop="startDragCrop('n', $event)"
            />
            <!-- Corner: NE (Top-Right) -->
            <div 
              class="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-cyan-500 rounded-sm cursor-nesw-resize shadow hover:scale-125 transition-transform hover:bg-amber-400"
              @mousedown.stop="startDragCrop('ne', $event)"
            />
            <!-- Edge: E (Right) -->
            <div 
              class="absolute top-1/2 -translate-y-1/2 -right-1.5 w-3 h-4 bg-white border-2 border-cyan-500 rounded-sm cursor-ew-resize shadow hover:scale-125 transition-transform hover:bg-amber-400"
              @mousedown.stop="startDragCrop('e', $event)"
            />
            <!-- Corner: SE (Bottom-Right) -->
            <div 
              class="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-cyan-500 rounded-sm cursor-nwse-resize shadow hover:scale-125 transition-transform hover:bg-amber-400"
              @mousedown.stop="startDragCrop('se', $event)"
            />
            <!-- Edge: S (Bottom) -->
            <div 
              class="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4 h-3 bg-white border-2 border-cyan-500 rounded-sm cursor-ns-resize shadow hover:scale-125 transition-transform hover:bg-amber-400"
              @mousedown.stop="startDragCrop('s', $event)"
            />
            <!-- Corner: SW (Bottom-Left) -->
            <div 
              class="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-cyan-500 rounded-sm cursor-nesw-resize shadow hover:scale-125 transition-transform hover:bg-amber-400"
              @mousedown.stop="startDragCrop('sw', $event)"
            />
            <!-- Edge: W (Left) -->
            <div 
              class="absolute top-1/2 -translate-y-1/2 -left-1.5 w-3 h-4 bg-white border-2 border-cyan-500 rounded-sm cursor-ew-resize shadow hover:scale-125 transition-transform hover:bg-amber-400"
              @mousedown.stop="startDragCrop('w', $event)"
            />
          </div>
        </div>

        <!-- Zoom level badge in bottom-left of stage -->
        <div class="absolute bottom-2.5 left-2.5 px-2 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-[10px] font-mono text-slate-400 pointer-events-none">
          {{ Math.round(stageZoom * 100) }}% Zoom
        </div>
      </div>

      <!-- Numeric Fine-Tuning Coordinates Bar -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-2 rounded-xl bg-slate-900/60 border border-slate-800/70">
        <UiNumberInput
          :model-value="Math.round(cropRect.x)"
          label="X"
          unit="px"
          @update:model-value="(val) => updateCoord('x', val)"
        />
        <UiNumberInput
          :model-value="Math.round(cropRect.y)"
          label="Y"
          unit="px"
          @update:model-value="(val) => updateCoord('y', val)"
        />
        <UiNumberInput
          :model-value="Math.round(cropRect.width)"
          :label="$t('assetEditor.cropWidth') || 'Kenglik'"
          unit="px"
          @update:model-value="(val) => updateCoord('width', val)"
        />
        <UiNumberInput
          :model-value="Math.round(cropRect.height)"
          :label="$t('assetEditor.cropHeight') || 'Balandlik'"
          unit="px"
          @update:model-value="(val) => updateCoord('height', val)"
        />
      </div>

    </div>

    <!-- Modal Footer Actions -->
    <template #footer>
      <div class="flex flex-wrap items-center justify-between w-full gap-2">
        <UiButton
          variant="secondary"
          size="sm"
          @click="store.closeCropModal"
        >
          {{ $t('common.cancel') }}
        </UiButton>

        <div class="flex items-center gap-2">
          <!-- Add as New Layer -->
          <UiButton
            variant="secondary"
            size="sm"
            :leading-icon="Plus"
            :disabled="!imageLoaded"
            @click="handleApplyCrop(false)"
          >
            {{ $t('assetEditor.cropAsNew') || 'Yangi qatlam qilib qo\'shish' }}
          </UiButton>

          <!-- Apply & Replace Current -->
          <UiButton
            variant="game-green"
            size="sm"
            :leading-icon="Check"
            :disabled="!imageLoaded"
            @click="handleApplyCrop(true)"
          >
            {{ $t('assetEditor.applyCrop') }}
          </UiButton>
        </div>
      </div>
    </template>
  </UiModal>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, nextTick } from 'vue'
import {
  Sparkles,
  RotateCcw,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  RefreshCw,
  Plus,
  Check,
} from 'lucide-vue-next'
import {
  UiModal,
  UiButton,
  UiIconButton,
  UiTabs,
  UiNumberInput,
  TabItem,
} from '../ui'
import { useAssetEditorStore } from '../../stores/assetEditorStore'
import { useAssetStore } from '../../stores/assetStore'
import { useI18n } from '../../stores/i18nStore'
import {
  CropRect,
  loadImage,
  getAutoTrimRect,
  cropAndTransformImage,
} from '../../utils/imageCropper'

const store = useAssetEditorStore()
const assetStore = useAssetStore()
const { t } = useI18n()

const cropContainerRef = ref<HTMLElement | null>(null)
const cropCanvasRef = ref<HTMLCanvasElement | null>(null)

// Image & Transform State
const imageLoaded = ref(false)
const rawImage = ref<HTMLImageElement | null>(null)
const rotation = ref(0)
const flipH = ref(false)
const flipV = ref(false)
const isTrimming = ref(false)

// Canvas Display Scale & Pan
const stageZoom = ref(1.0)
const naturalWidth = ref(1)
const naturalHeight = ref(1)
const displayedWidth = ref(1)
const displayedHeight = ref(1)

// Crop Box in natural image coordinates
const cropRect = reactive<CropRect>({
  x: 0,
  y: 0,
  width: 100,
  height: 100,
})

// Aspect Ratio Options
const aspectRatio = ref('free')
const aspectOptions = computed<TabItem[]>(() => [
  { id: 'free', label: t('assetEditor.aspectFree') || 'Erkin' },
  { id: '1:1', label: '1:1' },
  { id: '2:1', label: '2:1 (Iso)' },
  { id: '1:2', label: '1:2' },
  { id: '4:3', label: '4:3' },
  { id: '16:9', label: '16:9' },
])

// Dragging crop box or handles
type DragHandle = 'move' | 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | null
const activeHandle = ref<DragHandle>(null)
let dragStartX = 0
let dragStartY = 0
let initialCropRect = { x: 0, y: 0, width: 0, height: 0 }

// Style of the crop overlay matching canvas display
const cropOverlayStyle = computed(() => {
  const scale = displayedWidth.value / (naturalWidth.value || 1)
  const left = cropRect.x * scale
  const top = cropRect.y * scale
  const width = cropRect.width * scale
  const height = cropRect.height * scale

  return {
    left: `calc(50% - ${displayedWidth.value / 2}px + ${left}px)`,
    top: `calc(50% - ${displayedHeight.value / 2}px + ${top}px)`,
    width: `${width}px`,
    height: `${height}px`,
  }
})

// Load Image when Modal opens
watch(() => store.isCropModalOpen, async (isOpen) => {
  if (isOpen && store.cropTarget?.src) {
    await initImage(store.cropTarget.src)
  } else {
    imageLoaded.value = false
    rawImage.value = null
  }
})

async function initImage(src: string) {
  try {
    imageLoaded.value = false
    rotation.value = 0
    flipH.value = false
    flipV.value = false
    aspectRatio.value = 'free'

    const img = await loadImage(src)
    rawImage.value = img
    naturalWidth.value = img.naturalWidth || img.width
    naturalHeight.value = img.naturalHeight || img.height

    cropRect.x = 0
    cropRect.y = 0
    cropRect.width = naturalWidth.value
    cropRect.height = naturalHeight.value

    imageLoaded.value = true
    await nextTick()
    renderCropCanvas()
  } catch (err) {
    console.error('Failed to load crop image:', err)
  }
}

function renderCropCanvas() {
  if (!cropCanvasRef.value || !rawImage.value || !cropContainerRef.value) return
  const canvas = cropCanvasRef.value
  const container = cropContainerRef.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const rot = ((rotation.value % 360) + 360) % 360
  const isSideways = rot === 90 || rot === 270
  const srcW = isSideways ? rawImage.value.height : rawImage.value.width
  const srcH = isSideways ? rawImage.value.width : rawImage.value.height

  naturalWidth.value = srcW
  naturalHeight.value = srcH

  // Fit into container with padding
  const maxW = container.clientWidth - 40
  const maxH = container.clientHeight - 40
  const fitScale = Math.min(1.0, maxW / srcW, maxH / srcH)
  const zoom = stageZoom.value * fitScale

  displayedWidth.value = Math.round(srcW * zoom)
  displayedHeight.value = Math.round(srcH * zoom)

  canvas.width = displayedWidth.value
  canvas.height = displayedHeight.value

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.save()
  ctx.translate(canvas.width / 2, canvas.height / 2)
  ctx.rotate((rot * Math.PI) / 180)
  ctx.scale(flipH.value ? -zoom : zoom, flipV.value ? -zoom : zoom)
  ctx.drawImage(rawImage.value, -rawImage.value.width / 2, -rawImage.value.height / 2)
  ctx.restore()
}

// Auto-trim transparent edges
async function handleAutoTrim() {
  if (!store.cropTarget?.src) return
  isTrimming.value = true
  try {
    const trimRect = await getAutoTrimRect(store.cropTarget.src)
    cropRect.x = trimRect.x
    cropRect.y = trimRect.y
    cropRect.width = trimRect.width
    cropRect.height = trimRect.height
    aspectRatio.value = 'free'
  } catch (err) {
    console.error('Auto trim error:', err)
  } finally {
    isTrimming.value = false
  }
}

function rotateImage(deg: number) {
  rotation.value = (rotation.value + deg + 360) % 360
  // Swap crop rect width/height if rotated 90 degrees
  const tempW = cropRect.width
  cropRect.width = cropRect.height
  cropRect.height = tempW
  renderCropCanvas()
}

function toggleFlipH() {
  flipH.value = !flipH.value
  renderCropCanvas()
}

function toggleFlipV() {
  flipV.value = !flipV.value
  renderCropCanvas()
}

function resetCrop() {
  cropRect.x = 0
  cropRect.y = 0
  cropRect.width = naturalWidth.value
  cropRect.height = naturalHeight.value
  rotation.value = 0
  flipH.value = false
  flipV.value = false
  stageZoom.value = 1.0
  aspectRatio.value = 'free'
  renderCropCanvas()
}

function applyAspectRatio(ratioKey: string) {
  if (ratioKey === 'free') return
  let ratio = 1
  if (ratioKey === '1:1') ratio = 1
  else if (ratioKey === '2:1') ratio = 2
  else if (ratioKey === '1:2') ratio = 0.5
  else if (ratioKey === '4:3') ratio = 4 / 3
  else if (ratioKey === '16:9') ratio = 16 / 9

  let targetW = cropRect.width
  let targetH = targetW / ratio

  if (targetH > naturalHeight.value) {
    targetH = naturalHeight.value
    targetW = targetH * ratio
  }

  cropRect.width = Math.round(targetW)
  cropRect.height = Math.round(targetH)
  clampCropRect()
}

function updateCoord(key: keyof CropRect, val: number) {
  cropRect[key] = val
  clampCropRect()
}

function clampCropRect() {
  cropRect.width = Math.max(8, Math.min(cropRect.width, naturalWidth.value))
  cropRect.height = Math.max(8, Math.min(cropRect.height, naturalHeight.value))
  cropRect.x = Math.max(0, Math.min(cropRect.x, naturalWidth.value - cropRect.width))
  cropRect.y = Math.max(0, Math.min(cropRect.y, naturalHeight.value - cropRect.height))
}

// Interactive Drag Handling
function startDragCrop(handle: DragHandle, e: MouseEvent) {
  activeHandle.value = handle
  dragStartX = e.clientX
  dragStartY = e.clientY
  initialCropRect = { ...cropRect }
}

function handleStageMouseMove(e: MouseEvent) {
  if (!activeHandle.value) return

  const scale = displayedWidth.value / (naturalWidth.value || 1)
  const deltaX = (e.clientX - dragStartX) / scale
  const deltaY = (e.clientY - dragStartY) / scale

  const init = initialCropRect

  if (activeHandle.value === 'move') {
    cropRect.x = Math.round(Math.max(0, Math.min(init.x + deltaX, naturalWidth.value - init.width)))
    cropRect.y = Math.round(Math.max(0, Math.min(init.y + deltaY, naturalHeight.value - init.height)))
    return
  }

  let newX = init.x
  let newY = init.y
  let newW = init.width
  let newH = init.height

  if (activeHandle.value.includes('e')) {
    newW = Math.max(10, init.width + deltaX)
  }
  if (activeHandle.value.includes('s')) {
    newH = Math.max(10, init.height + deltaY)
  }
  if (activeHandle.value.includes('w')) {
    const maxDelta = init.width - 10
    const clampedDelta = Math.min(maxDelta, deltaX)
    newX = init.x + clampedDelta
    newW = init.width - clampedDelta
  }
  if (activeHandle.value.includes('n')) {
    const maxDelta = init.height - 10
    const clampedDelta = Math.min(maxDelta, deltaY)
    newY = init.y + clampedDelta
    newH = init.height - clampedDelta
  }

  // Handle aspect ratio constraint during resize
  if (aspectRatio.value !== 'free') {
    let ratio = 1
    if (aspectRatio.value === '1:1') ratio = 1
    else if (aspectRatio.value === '2:1') ratio = 2
    else if (aspectRatio.value === '1:2') ratio = 0.5
    else if (aspectRatio.value === '4:3') ratio = 4 / 3
    else if (aspectRatio.value === '16:9') ratio = 16 / 9

    if (activeHandle.value === 'e' || activeHandle.value === 'w') {
      newH = newW / ratio
    } else {
      newW = newH * ratio
    }
  }

  cropRect.x = Math.round(newX)
  cropRect.y = Math.round(newY)
  cropRect.width = Math.round(newW)
  cropRect.height = Math.round(newH)

  clampCropRect()
}

function handleStageMouseUp() {
  activeHandle.value = null
}

function handleStageMouseDown(e: MouseEvent) {
  // If clicked outside crop box, reset or start new selection
  if (e.target === cropContainerRef.value) {
    activeHandle.value = null
  }
}

function handleStageWheel(e: WheelEvent) {
  const delta = e.deltaY > 0 ? -0.1 : 0.1
  stageZoom.value = Math.max(0.5, Math.min(3.0, stageZoom.value + delta))
  renderCropCanvas()
}

// Apply Crop Result
async function handleApplyCrop(replaceCurrent = true) {
  if (!store.cropTarget?.src) return

  try {
    const croppedDataUrl = await cropAndTransformImage(
      store.cropTarget.src,
      cropRect,
      {
        rotation: rotation.value,
        flipH: flipH.value,
        flipV: flipV.value,
      }
    )

    const croppedName = `${store.cropTarget.name}_cropped`

    if (replaceCurrent && store.cropTarget.partId) {
      // Update existing selected composite part
      store.updatePartImage(store.cropTarget.partId, croppedDataUrl)
    } else {
      // Add as brand new composite part to the canvas
      store.addPartFromAsset({
        id: `crop_${Date.now()}`,
        name: croppedName,
        src: croppedDataUrl,
        previewSrc: croppedDataUrl,
      }, 0, 0)
    }

    // Also register in custom assets gallery so user can reuse this cropped sprite!
    assetStore.addCustomAsset({
      id: `cropped_${Date.now()}`,
      name: croppedName,
      src: croppedDataUrl,
      previewSrc: croppedDataUrl,
      category: 'Custom',
      width: Math.round(cropRect.width),
      height: Math.round(cropRect.height),
      anchorX: 0.5,
      anchorY: 0.88,
      spanX: 1,
      spanY: 1,
      scale: 1.0,
      isSample: false,
    })

    store.closeCropModal()
  } catch (err) {
    console.error('Error applying crop:', err)
  }
}
</script>

<style scoped>
.checker-pattern {
  background-color: #090d16;
  background-image: 
    linear-gradient(45deg, #111827 25%, transparent 25%), 
    linear-gradient(-45deg, #111827 25%, transparent 25%), 
    linear-gradient(45deg, transparent 75%, #111827 75%), 
    linear-gradient(-45deg, transparent 75%, #111827 75%);
  background-size: 16px 16px;
  background-position: 0 0, 0 8px, 8px -8px, -8px 0px;
}
</style>
