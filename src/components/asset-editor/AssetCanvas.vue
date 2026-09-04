<template>
  <div 
    ref="viewportRef"
    class="relative w-full h-full bg-slate-950 overflow-hidden select-none flex items-center justify-center cursor-crosshair touch-manipulation"
    @wheel.prevent="handleWheel"
    @mousedown="handleMouseDown"
    @mousemove="handleMouseMove"
    @mouseup="handleMouseUp"
    @mouseleave="handleMouseUp"
  >
    <!-- Background Grid / Work Area Canvas -->
    <div 
      class="relative transition-transform duration-75 shadow-2xl rounded-2xl border border-slate-800/80 overflow-hidden checker-pattern"
      :style="{
        width: `${store.canvasWidth}px`,
        height: `${store.canvasHeight}px`,
        transform: `translate(${store.panX}px, ${store.panY}px) scale(${store.zoom})`,
        transformOrigin: 'center center',
      }"
    >
      <!-- HTML5 Rendering Canvas for Export & Composing -->
      <canvas 
        ref="canvasRef"
        :width="store.canvasWidth"
        :height="store.canvasHeight"
        class="absolute inset-0 w-full h-full pointer-events-none"
      ></canvas>

      <!-- 2:1 Isometric Diamond Base Guide -->
      <svg 
        v-if="store.showGridGuide"
        class="absolute inset-0 w-full h-full pointer-events-none opacity-60"
        :viewBox="`0 0 ${store.canvasWidth} ${store.canvasHeight}`"
      >
        <!-- Center diamond base 128x64 or 256x128 -->
        <polygon 
          :points="`
            ${store.canvasWidth / 2}, ${store.canvasHeight / 2 + 100 - 64} 
            ${store.canvasWidth / 2 + 128}, ${store.canvasHeight / 2 + 100} 
            ${store.canvasWidth / 2}, ${store.canvasHeight / 2 + 100 + 64} 
            ${store.canvasWidth / 2 - 128}, ${store.canvasHeight / 2 + 100}
          `"
          fill="rgba(56, 189, 248, 0.08)"
          stroke="#38bdf8"
          stroke-width="1.5"
          stroke-dasharray="4 4"
        />

        <!-- Secondary grid lines -->
        <line 
          :x1="store.canvasWidth / 2 - 128" 
          :y1="store.canvasHeight / 2 + 100" 
          :x2="store.canvasWidth / 2 + 128" 
          :y2="store.canvasHeight / 2 + 100" 
          stroke="rgba(56, 189, 248, 0.4)" 
          stroke-width="1" 
        />
        <line 
          :x1="store.canvasWidth / 2" 
          :y1="store.canvasHeight / 2 + 100 - 64" 
          :x2="store.canvasWidth / 2" 
          :y2="store.canvasHeight / 2 + 100 + 64" 
          stroke="rgba(56, 189, 248, 0.4)" 
          stroke-width="1" 
        />

        <!-- Vertical axis line -->
        <line 
          v-if="store.showCenterOrigin"
          :x1="store.canvasWidth / 2" 
          y1="20" 
          :x2="store.canvasWidth / 2" 
          :y2="store.canvasHeight - 20" 
          stroke="rgba(245, 158, 11, 0.5)" 
          stroke-width="1" 
          stroke-dasharray="3 3"
        />
      </svg>

      <!-- Interactive Part Overlays (Selection Boxes, Scale Badges & Drag Handles) -->
      <div 
        v-for="part in store.sortedParts"
        :key="part.id"
        v-show="part.visible"
        class="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-move transition-shadow"
        :style="{
          left: `${store.canvasWidth / 2 + part.x}px`,
          top: `${store.canvasHeight / 2 + part.y}px`,
          zIndex: part.zIndex,
          opacity: part.opacity,
          transform: `translate(-50%, -50%) scaleX(${part.scaleX}) scaleY(${part.scaleY}) rotate(${part.rotation}deg)`,
        }"
        @mousedown.stop="handlePartMouseDown($event, part.id)"
      >
        <img 
          :src="part.src || assetStore.getAssetPreview(part.assetId || part.assetName)" 
          :alt="part.assetName"
          class="max-w-none pointer-events-none select-none drop-shadow-md"
          draggable="false"
        />

        <!-- Active Selection Ring, Badges & 4 Corner Scale Handles -->
        <div 
          v-if="store.isSelected(part.id)"
          class="absolute inset-0 border-2 border-brand-400 rounded-lg pointer-events-none ring-4 ring-brand-500/25 shadow-[0_0_15px_rgba(99,102,241,0.6)]"
        >
          <!-- 1. Top Info Badge (Name & Z-Index & Scale) -->
          <div class="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-lg bg-brand-600/95 text-white font-mono text-[9px] font-bold whitespace-nowrap shadow-lg flex items-center gap-1.5 pointer-events-none border border-brand-400/30">
            <span>{{ part.assetName }}</span>
            <span class="bg-brand-950/80 px-1 rounded text-amber-300">Z: {{ part.zIndex }}</span>
            <span class="bg-emerald-950/80 text-emerald-300 px-1 rounded font-black">{{ Math.abs(part.scaleX).toFixed(2) }}x</span>
          </div>

          <!-- 2. Bottom Permanent Scale Badge (Click to type scale or press S) -->
          <div 
            class="absolute -bottom-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-lg bg-slate-900/95 border border-emerald-500/80 text-emerald-300 font-mono text-[9px] font-bold whitespace-nowrap shadow-xl flex items-center gap-1.5 pointer-events-auto cursor-pointer hover:bg-emerald-950 hover:border-emerald-400 hover:scale-105 transition-all"
            title="Change scale (or press 'S' on keyboard)"
            @mousedown.stop
            @click.stop="openQuickScaleModal"
          >
            <span class="text-slate-400 font-normal">Scale:</span>
            <span class="text-white font-black">{{ Math.abs(part.scaleX).toFixed(2) }}x</span>
            <span class="bg-emerald-500/20 text-emerald-300 px-1 rounded text-[8px] border border-emerald-500/30 font-bold">S</span>
          </div>

          <!-- 3. Live Scaling Feedback Float (during corner drag) -->
          <div 
            v-if="isScaling && activeScaleValue !== null"
            class="absolute -bottom-14 left-1/2 -translate-x-1/2 px-3 py-1 rounded-xl bg-slate-900/95 border-2 border-emerald-400 text-emerald-300 font-mono text-xs font-black shadow-2xl flex items-center gap-1.5 pointer-events-none z-50 whitespace-nowrap animate-pulse ring-4 ring-emerald-500/30"
          >
            <span>SCALE:</span>
            <span class="text-white text-sm font-black">{{ activeScaleValue.toFixed(2) }}x</span>
            <span class="text-[9px] text-emerald-400/80 font-normal">(0.05 step)</span>
          </div>

          <!-- 4. Corner Scale Handles (0.05 Step Scaling) -->
          <!-- Top-Left Handle -->
          <div 
            class="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-brand-500 rounded-sm shadow-md hover:scale-125 transition-transform cursor-nwse-resize pointer-events-auto hover:bg-amber-300"
            title="Change scale (0.05 step)"
            @mousedown.stop="handleScaleStart($event, part, 'tl')"
          ></div>

          <!-- Top-Right Handle -->
          <div 
            class="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-brand-500 rounded-sm shadow-md hover:scale-125 transition-transform cursor-nesw-resize pointer-events-auto hover:bg-amber-300"
            title="Change scale (0.05 step)"
            @mousedown.stop="handleScaleStart($event, part, 'tr')"
          ></div>

          <!-- Bottom-Right Handle -->
          <div 
            class="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border-2 border-brand-500 rounded-sm shadow-md hover:scale-125 transition-transform cursor-nwse-resize pointer-events-auto hover:bg-amber-300"
            title="Change scale (0.05 step)"
            @mousedown.stop="handleScaleStart($event, part, 'br')"
          ></div>

          <!-- Bottom-Left Handle -->
          <div 
            class="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border-2 border-brand-500 rounded-sm shadow-md hover:scale-125 transition-transform cursor-nesw-resize pointer-events-auto hover:bg-amber-300"
            title="Change scale (0.05 step)"
            @mousedown.stop="handleScaleStart($event, part, 'bl')"
          ></div>
        </div>
      </div>
    </div>

    <!-- Quick Tooltip / Hotkey Indicator Banner -->
    <div class="absolute top-4 left-4 z-30 flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 px-3 py-1.5 rounded-2xl shadow-xl backdrop-blur-md text-[10px] text-slate-300 font-mono">
      <span class="text-amber-400 font-bold">Shift+Click:</span>
      <span>Multi-select</span>
      <span class="text-slate-600">|</span>
      <span class="text-emerald-400 font-bold">"S" key:</span>
      <span>Exact Scale Input</span>
      <span class="text-slate-600">|</span>
      <span class="text-amber-400 font-bold">Corners:</span>
      <span>0.05 Scale</span>
      <span class="text-slate-600">|</span>
      <span class="text-amber-400 font-bold">Ctrl+Wheel:</span>
      <span>Z-Index</span>
    </div>

    <!-- Selected Part Live Scale Indicator in Viewport HUD -->
    <div 
      v-if="store.selectedParts.length > 0" 
      class="absolute top-4 right-4 z-30 flex items-center gap-2 bg-slate-900/95 border border-emerald-500/50 px-3 py-1.5 rounded-2xl shadow-xl backdrop-blur-md font-mono text-xs"
    >
      <span class="text-slate-400 text-[10px]">Scale:</span>
      <span class="text-emerald-300 font-black text-sm">{{ Math.abs(store.selectedPart?.scaleX || 1.0).toFixed(2) }}x</span>
      <button 
        type="button" 
        class="px-1.5 py-0.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500 hover:text-slate-950 text-emerald-300 border border-emerald-500/40 text-[9px] font-bold transition-colors cursor-pointer"
        title="Press 'S' on keyboard"
        @click="openQuickScaleModal"
      >
        (S) Change
      </button>
    </div>

    <!-- Viewport Floating HUD Controls (Zoom, Pan Reset, Grid Toggle) -->
    <div class="absolute bottom-4 left-4 z-30 flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 p-1.5 rounded-2xl shadow-xl backdrop-blur-md">
      <UiIconButton 
        :icon="ZoomOut" 
        size="sm" 
        variant="ghost" 
        title="Zoom Out (-)" 
        @click="zoomOut" 
      />
      <span class="text-[11px] font-mono font-bold text-amber-300 w-12 text-center">
        {{ Math.round(store.zoom * 100) }}%
      </span>
      <UiIconButton 
        :icon="ZoomIn" 
        size="sm" 
        variant="ghost" 
        title="Zoom In (+)" 
        @click="zoomIn" 
      />
      
      <div class="w-px h-4 bg-slate-700 mx-1"></div>

      <UiIconButton 
        :icon="RotateCcw" 
        size="sm" 
        variant="ghost" 
        title="Reset View (Pan & Zoom)" 
        @click="store.resetView()" 
      />
      
      <UiIconButton 
        :icon="Grid" 
        size="sm" 
        :variant="store.showGridGuide ? 'tool' : 'ghost'"
        :active="store.showGridGuide"
        title="Toggle 2:1 Isometric Grid Guide" 
        @click="store.showGridGuide = !store.showGridGuide" 
      />
    </div>

    <!-- ================= QUICK SCALE INPUT MODAL (Triggered by 'S' or click) ================= -->
    <div 
      v-if="isQuickScaleOpen" 
      class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm"
      @click.self="closeQuickScale"
    >
      <div 
        class="bg-slate-900 border border-brand-500/80 rounded-2xl p-5 shadow-2xl w-80 sm:w-96 flex flex-col gap-3.5 ring-4 ring-brand-500/20 animate-in zoom-in-95 duration-150"
        @keydown.stop
      >
        <div class="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div class="flex items-center gap-2">
            <div class="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center">
              <Scaling class="w-4 h-4" />
            </div>
            <div>
              <span class="text-xs font-bold text-white block">Enter Exact Scale</span>
              <span class="text-[10px] text-slate-400 block font-mono">Confirm with "Enter"</span>
            </div>
          </div>
          <button 
            type="button" 
            class="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            @click="closeQuickScale"
          >
            <X class="w-4 h-4" />
          </button>
        </div>

        <!-- Numeric Input Box -->
        <div class="flex flex-col gap-1.5">
          <label class="text-[11px] font-mono font-bold text-slate-300">
            Scale Multiplier:
          </label>
          <div class="relative">
            <input 
              ref="quickScaleInputRef"
              v-model="quickScaleInput"
              type="number"
              step="0.05"
              min="0.01"
              max="10.0"
              class="w-full bg-slate-950 border-2 border-emerald-500 rounded-xl px-3.5 py-2 text-emerald-300 font-mono text-xl font-bold text-center focus:outline-none focus:ring-4 focus:ring-emerald-500/30"
              placeholder="e.g. 0.25"
              @keydown.enter.prevent="applyQuickScale"
              @keydown.esc.prevent="closeQuickScale"
            />
            <span class="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-sm font-bold">x</span>
          </div>
        </div>

        <!-- Preset Fast Buttons -->
        <div class="flex flex-col gap-1">
          <span class="text-[10px] text-slate-400 font-mono">Quick Presets:</span>
          <div class="grid grid-cols-6 gap-1">
            <button 
              v-for="p in [0.1, 0.25, 0.5, 0.75, 1.0, 1.5]"
              :key="p"
              type="button"
              class="py-1 rounded-lg bg-slate-800 hover:bg-emerald-500 hover:text-slate-950 text-slate-300 font-mono text-[10px] font-bold transition-all border border-slate-700 cursor-pointer text-center"
              @click="quickScaleInput = p.toString(); applyQuickScale()"
            >
              {{ p }}x
            </button>
          </div>
        </div>

        <!-- Modal Actions -->
        <div class="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
          <UiButton variant="ghost" size="sm" @click="closeQuickScale">
            Cancel (Esc)
          </UiButton>
          <UiButton variant="game-green" size="sm" @click="applyQuickScale">
            Apply (Enter)
          </UiButton>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, onUnmounted } from 'vue'
import { ZoomIn, ZoomOut, RotateCcw, Grid, Scaling, X } from 'lucide-vue-next'
import { UiIconButton, UiButton } from '../ui'
import { useAssetEditorStore, type CompositePart } from '../../stores/assetEditorStore'
import { useAssetStore } from '../../stores/assetStore'

const store = useAssetEditorStore()
const assetStore = useAssetStore()

const viewportRef = ref<HTMLElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)

// Dragging, Scaling & Panning state
const isDraggingPart = ref(false)
const isScaling = ref(false)
const scaleHandle = ref<'tl' | 'tr' | 'br' | 'bl' | null>(null)
const scaleStartMouseX = ref(0)
const scaleStartMouseY = ref(0)
const activeScaleValue = ref<number | null>(null)

const isPanning = ref(false)
const dragStartX = ref(0)
const dragStartY = ref(0)
const panStartX = ref(0)
const panStartY = ref(0)

// Quick Scale Modal State
const isQuickScaleOpen = ref(false)
const quickScaleInput = ref('1.00')
const quickScaleInputRef = ref<HTMLInputElement | null>(null)

function openQuickScaleModal() {
  if (store.selectedParts.length === 0) return
  const primary = store.selectedPart || store.selectedParts[0]
  const currentScale = Math.abs(primary.scaleX) || 1.0
  quickScaleInput.value = currentScale.toString()
  isQuickScaleOpen.value = true

  nextTick(() => {
    quickScaleInputRef.value?.focus()
    quickScaleInputRef.value?.select()
  })
}

function closeQuickScale() {
  isQuickScaleOpen.value = false
}

function applyQuickScale() {
  const val = parseFloat(quickScaleInput.value)
  if (!isNaN(val) && val > 0) {
    const clampedVal = Number(Math.max(0.01, Math.min(10.0, val)).toFixed(3))
    
    for (const part of store.selectedParts) {
      const signX = Math.sign(part.scaleX) || 1
      const signY = Math.sign(part.scaleY) || 1
      part.scaleX = signX * clampedVal
      part.scaleY = signY * clampedVal
    }
    store.recordHistory()
  }
  closeQuickScale()
}

// Start positions for all multi-selected parts during group drag
const startPositionsMap = new Map<string, { x: number; y: number }>()
// Start scales for all multi-selected parts during scale
const initialScalesMap = new Map<string, { scaleX: number; scaleY: number }>()

function handleWheel(e: WheelEvent) {
  // Feature: Ctrl + MouseWheel to change Z-Index of selected element(s)!
  if (e.ctrlKey || e.metaKey) {
    if (store.selectedParts.length > 0) {
      if (e.deltaY < 0) {
        // Scroll Up -> Increase Z-Index (Bring Forward)
        store.moveUp()
      } else {
        // Scroll Down -> Decrease Z-Index (Send Backward)
        store.moveDown()
      }
      return
    }
  }

  // Normal Wheel -> Zoom Canvas
  const delta = e.deltaY < 0 ? 0.1 : -0.1
  const newZoom = Math.max(0.25, Math.min(4.0, store.zoom + delta))
  store.zoom = Number(newZoom.toFixed(2))
}

function zoomIn() {
  store.zoom = Number(Math.min(4.0, store.zoom + 0.25).toFixed(2))
}

function zoomOut() {
  store.zoom = Number(Math.max(0.25, store.zoom - 0.25).toFixed(2))
}

function handleMouseDown(e: MouseEvent) {
  // If clicking on empty canvas space
  if (e.target === viewportRef.value || (e.target as HTMLElement).tagName === 'CANVAS') {
    if (!e.shiftKey) {
      store.selectPart(null)
    }
  }

  // Pan with middle click or Left click on blank space
  if (e.button === 1 || e.button === 0) {
    isPanning.value = true
    dragStartX.value = e.clientX
    dragStartY.value = e.clientY
    panStartX.value = store.panX
    panStartY.value = store.panY
  }
}

function handlePartMouseDown(e: MouseEvent, partId: string) {
  e.stopPropagation()

  // Feature: Shift + Click for Multi-Selection
  if (e.shiftKey) {
    store.selectPart(partId, true)
  } else {
    // If not holding shift, and clicking an item not already in selection, make it sole selection
    if (!store.isSelected(partId)) {
      store.selectPart(partId, false)
    }
  }

  const selectedParts = store.selectedParts
  if (selectedParts.length === 0) return

  isDraggingPart.value = true
  dragStartX.value = e.clientX
  dragStartY.value = e.clientY

  // Record start positions for ALL selected elements for synchronized group dragging
  startPositionsMap.clear()
  for (const p of selectedParts) {
    startPositionsMap.set(p.id, { x: p.x, y: p.y })
  }
}

function handleScaleStart(e: MouseEvent, part: CompositePart, handle: 'tl' | 'tr' | 'br' | 'bl') {
  e.stopPropagation()
  e.preventDefault()

  if (!store.isSelected(part.id)) {
    store.selectPart(part.id, false)
  }

  isScaling.value = true
  scaleHandle.value = handle
  scaleStartMouseX.value = e.clientX
  scaleStartMouseY.value = e.clientY

  initialScalesMap.clear()
  for (const p of store.selectedParts) {
    initialScalesMap.set(p.id, { scaleX: p.scaleX, scaleY: p.scaleY })
  }

  const primary = store.selectedPart || part
  activeScaleValue.value = Math.abs(primary.scaleX)
}

function handleMouseMove(e: MouseEvent) {
  // 1. Handling Corner Drag Scaling with 0.05 Step
  if (isScaling.value && scaleHandle.value && store.selectedParts.length > 0) {
    const dx = (e.clientX - scaleStartMouseX.value) / store.zoom
    const dy = (e.clientY - scaleStartMouseY.value) / store.zoom

    let signX = 1
    let signY = 1
    if (scaleHandle.value === 'tl') {
      signX = -1
      signY = -1
    } else if (scaleHandle.value === 'tr') {
      signX = 1
      signY = -1
    } else if (scaleHandle.value === 'bl') {
      signX = -1
      signY = 1
    } else if (scaleHandle.value === 'br') {
      signX = 1
      signY = 1
    }

    const primary = store.selectedPart
    const initialPrimary = primary ? initialScalesMap.get(primary.id) : null
    const baseScale = initialPrimary ? Math.abs(initialPrimary.scaleX) : 1.0

    // Sensitivity: 120 pixels per 1.0 scale
    const dScale = (signX * dx + signY * dy) / 120
    const rawTargetScale = Math.max(0.1, Math.min(5.0, baseScale + dScale))
    const snappedTargetScale = Math.round(rawTargetScale / 0.05) * 0.05
    const ratio = snappedTargetScale / (baseScale || 1.0)

    store.setScaleForSelectedParts(ratio, initialScalesMap, 0.05)
    if (primary) {
      activeScaleValue.value = Math.abs(primary.scaleX)
    }
    return
  }

  // 2. Handling Group Dragging
  if (isDraggingPart.value && store.selectedParts.length > 0) {
    const dx = (e.clientX - dragStartX.value) / store.zoom
    const dy = (e.clientY - dragStartY.value) / store.zoom
    store.moveSelectedPartsBy(dx, dy, startPositionsMap)
    return
  }

  // 3. Handling Canvas Panning
  if (isPanning.value) {
    const dx = e.clientX - dragStartX.value
    const dy = e.clientY - dragStartY.value
    store.panX = panStartX.value + dx
    store.panY = panStartY.value + dy
  }
}

function handleMouseUp() {
  if (isScaling.value) {
    isScaling.value = false
    scaleHandle.value = null
    activeScaleValue.value = null
    initialScalesMap.clear()
    store.recordHistory()
  }

  if (isDraggingPart.value) {
    isDraggingPart.value = false
    startPositionsMap.clear()
    store.recordHistory()
  }
  isPanning.value = false
}

// Global keyboard listeners for hotkeys
function handleKeyDown(e: KeyboardEvent) {
  // If quick scale modal is active, let input handle keys
  if (isQuickScaleOpen.value) {
    if (e.key === 'Escape') {
      closeQuickScale()
    }
    return
  }

  // Don't intercept if typing in an input
  const activeTag = (document.activeElement?.tagName || '').toLowerCase()
  if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') return

  const isCtrl = e.ctrlKey || e.metaKey
  const mult = e.shiftKey ? 10 : 1

  // Feature: Press 'S' to open Quick Scale Input
  if ((e.key === 's' || e.key === 'S') && !isCtrl && !e.altKey) {
    if (store.selectedParts.length > 0) {
      e.preventDefault()
      openQuickScaleModal()
      return
    }
  }

  // Arrow Keypad Nudging
  if (e.key === 'ArrowUp') {
    e.preventDefault()
    store.nudgeSelected(0, -mult)
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    store.nudgeSelected(0, mult)
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault()
    store.nudgeSelected(-mult, 0)
  } else if (e.key === 'ArrowRight') {
    e.preventDefault()
    store.nudgeSelected(mult, 0)
  } 
  // Delete / Backspace
  else if (e.key === 'Delete' || e.key === 'Backspace') {
    if (store.selectedPartIds.length > 0) {
      e.preventDefault()
      store.deleteSelected()
    }
  } 
  // Ctrl + C (Copy)
  else if (isCtrl && e.key.toLowerCase() === 'c') {
    e.preventDefault()
    store.copySelection()
  } 
  // Ctrl + V (Paste)
  else if (isCtrl && e.key.toLowerCase() === 'v') {
    e.preventDefault()
    store.pasteSelection()
  }
  // Ctrl + D (Duplicate)
  else if (isCtrl && e.key.toLowerCase() === 'd') {
    e.preventDefault()
    store.duplicateSelected()
  }
  // Ctrl + A (Select All)
  else if (isCtrl && e.key.toLowerCase() === 'a') {
    e.preventDefault()
    store.selectAll()
  }
  // Undo / Redo
  else if (isCtrl && e.key.toLowerCase() === 'z') {
    e.preventDefault()
    if (e.shiftKey) {
      store.redo()
    } else {
      store.undo()
    }
  }
}

// Export canvas image to transparent PNG Data URL with dynamic bounding box (no clipping!)
async function exportToTransparentBlob(): Promise<{ blob: Blob; dataUrl: string; width: number; height: number }> {
  // 1. Pre-load all images
  const loadedImages: { img: HTMLImageElement; part: typeof store.parts[0] }[] = []
  
  for (const part of store.sortedParts) {
    if (!part.visible) continue
    const img = new Image()
    img.crossOrigin = 'anonymous'
    await new Promise<void>((resolve) => {
      img.onload = () => resolve()
      img.onerror = () => resolve()
      img.src = part.src || assetStore.getAssetPreview(part.assetId || part.assetName)
    })
    loadedImages.push({ img, part })
  }

  if (loadedImages.length === 0) {
    throw new Error('No visible layers found to export')
  }

  // 2. Compute dynamic bounding box across ALL parts regardless of how low or high they are
  let minPartX = Infinity, maxPartX = -Infinity
  let minPartY = Infinity, maxPartY = -Infinity

  for (const { img, part } of loadedImages) {
    if (!img.width || !img.height) continue
    const scaleX = Math.abs(part.scaleX) || 1
    const scaleY = Math.abs(part.scaleY) || 1
    const rad = (part.rotation * Math.PI) / 180
    const cos = Math.abs(Math.cos(rad))
    const sin = Math.abs(Math.sin(rad))

    const w = img.width * scaleX
    const h = img.height * scaleY
    // Rotated dimensions
    const boundW = w * cos + h * sin
    const boundH = w * sin + h * cos

    const left = part.x - boundW / 2
    const right = part.x + boundW / 2
    const top = part.y - boundH / 2
    const bottom = part.y + boundH / 2

    if (left < minPartX) minPartX = left
    if (right > maxPartX) maxPartX = right
    if (top < minPartY) minPartY = top
    if (bottom > maxPartY) maxPartY = bottom
  }

  // Extra safety margin around bounding box to prevent clipping
  const padding = 64
  const renderWidth = Math.max(128, Math.ceil(maxPartX - minPartX + padding * 2))
  const renderHeight = Math.max(128, Math.ceil(maxPartY - minPartY + padding * 2))

  const offscreen = document.createElement('canvas')
  offscreen.width = renderWidth
  offscreen.height = renderHeight
  const ctx = offscreen.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Canvas 2D context unavailable')

  ctx.clearRect(0, 0, renderWidth, renderHeight)

  // 3. Draw each part sorted by z-index into dynamically bounded canvas
  for (const { img, part } of loadedImages) {
    if (!img.width || !img.height) continue
    ctx.save()
    ctx.globalAlpha = part.opacity

    const drawX = part.x - minPartX + padding
    const drawY = part.y - minPartY + padding

    ctx.translate(drawX, drawY)
    ctx.rotate((part.rotation * Math.PI) / 180)
    ctx.scale(part.scaleX, part.scaleY)

    ctx.drawImage(img, -img.width / 2, -img.height / 2)
    ctx.restore()
  }

  // 4. Auto-trim transparent pixel borders
  const imgData = ctx.getImageData(0, 0, renderWidth, renderHeight)
  const data = imgData.data
  let minX = renderWidth, minY = renderHeight, maxX = 0, maxY = 0
  let hasPixels = false

  for (let y = 0; y < renderHeight; y++) {
    for (let x = 0; x < renderWidth; x++) {
      const a = data[(y * renderWidth + x) * 4 + 3]
      if (a > 10) {
        hasPixels = true
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }

  let finalCanvas = offscreen
  if (hasPixels) {
    const pad = 2
    const cropX = Math.max(0, minX - pad)
    const cropY = Math.max(0, minY - pad)
    const cropW = Math.min(renderWidth - cropX, maxX - minX + pad * 2)
    const cropH = Math.min(renderHeight - cropY, maxY - minY + pad * 2)

    const trimmedCanvas = document.createElement('canvas')
    trimmedCanvas.width = cropW
    trimmedCanvas.height = cropH
    const trimCtx = trimmedCanvas.getContext('2d')
    if (trimCtx) {
      trimCtx.drawImage(offscreen, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH)
      finalCanvas = trimmedCanvas
    }
  }

  return new Promise((resolve) => {
    finalCanvas.toBlob((blob) => {
      resolve({
        blob: blob!,
        dataUrl: finalCanvas.toDataURL('image/png'),
        width: finalCanvas.width,
        height: finalCanvas.height,
      })
    }, 'image/png')
  })
}

defineExpose({
  exportToTransparentBlob,
  openQuickScaleModal,
})

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('mouseup', handleMouseUp)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('mouseup', handleMouseUp)
})
</script>

<style scoped>
.checker-pattern {
  background-image: 
    linear-gradient(45deg, rgba(255,255,255,0.06) 25%, transparent 25%), 
    linear-gradient(-45deg, rgba(255,255,255,0.06) 25%, transparent 25%), 
    linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.06) 75%), 
    linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.06) 75%);
  background-size: 16px 16px;
  background-position: 0 0, 0 8px, 8px -8px, -8px 0px;
}
</style>
