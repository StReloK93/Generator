<template>
  <div 
    ref="viewportContainerRef"
    class="relative flex-1 h-full w-full bg-dark-950 overflow-hidden cursor-crosshair select-none canvas-touch-container"
    :class="{
      'cursor-grab!': toolStore.activeTool === 'pan' && !isPanning,
      'cursor-grabbing!': isPanning,
      'cursor-cell!': toolStore.activeTool === 'picker',
      'cursor-pointer!': !assetStore.selectedAssetId || toolStore.activeTool === 'select',
      'cursor-move!': toolStore.isMovingElement,
      'cursor-not-allowed!': mapStore.activeLayer?.locked
    }"
    @mousedown="handleMouseDown"
    @mousemove="handleMouseMove"
    @mouseup="handleMouseUp"
    @mouseleave="handleMouseLeave"
    @touchstart="handleTouchStart"
    @touchmove="handleTouchMove"
    @touchend="handleTouchEnd"
    @touchcancel="handleTouchCancel"
    @wheel.prevent="handleWheel"
    @dragover.prevent="handleDragOver"
    @dragleave.prevent="handleDragLeave"
    @drop.prevent="handleCanvasDrop"
    @contextmenu.prevent="handleContextMenu"
  >
    <!-- Element Inspector (When an element is selected in Select mode) -->
    <ElementInspector v-if="!characterStore.isGameMode" />

    <!-- Unified Tower Defense & Movement Hub Modal -->
    <GameConfigModal />

    <!-- Playable Game Mode HUD (Lives, Gold, Shop, Waves) -->
    <GamePlayHUD />

    <!-- Custom Tower Blueprint Creator Modal -->
    <TowerCreateModal />

    <!-- Floating HUD when Setting Spawn Point -->
    <div 
      v-if="characterStore.isSettingSpawnPoint && !characterStore.isGameMode" 
      class="absolute top-16 left-1/2 -translate-x-1/2 z-30 glass-panel px-4 py-2.5 rounded-2xl border border-amber-500/60 shadow-2xl flex items-center gap-3 text-xs bg-slate-900/95 text-amber-200 animate-in fade-in slide-in-from-top-2"
    >
      <MapPin class="w-4 h-4 text-amber-400 animate-bounce shrink-0" />
      <span>
        <strong>{{ characterStore.spawnPointPlacementMode === 'add' ? '➕ Yangi Chiqish Nuqtasi' : '📍 Chiqish Nuqtasini Ko\'chirish' }}:</strong> 
        Xaritadagi istalgan katakni bosing
      </span>
      <button 
        @click="characterStore.isSettingSpawnPoint = false" 
        class="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold border border-slate-700 cursor-pointer"
      >
        Bekor qilish
      </button>
    </div>

    <!-- Floating HUD when Drawing Custom Route -->
    <div 
      v-if="characterStore.isDrawingRoute && !characterStore.isGameMode" 
      class="absolute top-16 left-1/2 -translate-x-1/2 z-30 glass-panel px-4 py-2.5 rounded-2xl border border-brand-500/60 shadow-2xl flex items-center gap-3 text-xs bg-slate-900/95 text-brand-200 animate-in fade-in slide-in-from-top-2"
    >
      <PenTool class="w-4 h-4 text-brand-400 animate-pulse shrink-0" />
      <span>
        <strong>🖌️ Marshrut chizilmoqda:</strong> Kataklarni ketma-ket bosing (Nuqtalar: {{ characterStore.drawingPath.length }})
      </span>
      <button 
        @click="characterStore.finishDrawingRoute()" 
        class="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow-sm cursor-pointer"
      >
        Tugatish
      </button>
      <button 
        @click="characterStore.cancelDrawingRoute()" 
        class="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold border border-slate-700 cursor-pointer"
      >
        Bekor qilish
      </button>
    </div>

    <!-- Top Help / Quick Guide Notification Banner -->
    <div 
      v-if="showGuide && !characterStore.isGameMode" 
      class="absolute top-4 left-1/2 -translate-x-1/2 z-20 glass-panel px-4 py-2 rounded-2xl border border-brand-500/40 shadow-2xl hidden md:flex items-center gap-3 text-xs animate-in fade-in slide-in-from-top-2 duration-300 max-w-xl text-slate-200"
    >
      <div class="w-6 h-6 rounded-lg bg-brand-500/20 text-brand-400 flex items-center justify-center shrink-0">
        <Sparkles class="w-3.5 h-3.5" />
      </div>
      <div class="flex-1 leading-snug">
        <strong>Hotkeys:</strong> 
        <kbd class="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px]">Delete</kbd> — O'chirish | 
        <kbd class="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px]">Shift+Click</kbd> — Ketma-ket qo'yish | 
        <kbd class="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px]">R</kbd> — Aylantirish | 
        <kbd class="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px]">F</kbd> — Flip | 
        <span class="text-amber-300 font-semibold">O'ng tugma</span> — Bo'shatish
      </div>
      <button 
        @click="showGuide = false" 
        class="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
        title="Yopish"
      >
        <X class="w-3.5 h-3.5" />
      </button>
    </div>

    <!-- Drag & Drop Overlay Indicator -->
    <div 
      v-if="isDraggingOver"
      class="absolute inset-0 z-30 pointer-events-none bg-brand-600/10 border-2 border-dashed border-brand-400 flex items-center justify-center backdrop-blur-[2px]"
    >
      <div class="glass-panel px-6 py-3 rounded-2xl border border-brand-400 text-brand-300 font-semibold text-sm shadow-2xl flex items-center gap-2">
        <PlusCircle class="w-5 h-5 animate-bounce" />
        <span>Plitkani shu yerga tashlang</span>
      </div>
    </div>

    <!-- Placement Conflict Decision Modal -->
    <PlacementPromptModal />

    <!-- Bottom-Left Map & Hover Cell Helper Badge -->
    <div 
      v-if="!characterStore.isGameMode"
      class="absolute bottom-4 left-4 z-20 pointer-events-none flex items-center gap-2 select-none animate-in fade-in duration-150"
    >
      <div class="glass-panel px-3 py-1.5 rounded-xl text-xs font-mono flex items-center gap-2.5 border border-slate-800/90 shadow-xl text-slate-300 backdrop-blur-xl bg-slate-900/90">
        <!-- Hover Grid Coordinates -->
        <div class="flex items-center gap-1.5">
          <span class="text-slate-500 font-sans text-[11px]">Katak:</span>
          <span v-if="toolStore.hoveredCell" class="text-brand-300 font-bold bg-brand-500/20 px-1.5 py-0.5 rounded border border-brand-500/30">
            ({{ toolStore.hoveredCell.col }}, {{ toolStore.hoveredCell.row }})
          </span>
          <span v-else class="text-slate-600">---</span>
        </div>

        <div class="h-3 w-px bg-slate-800"></div>

        <!-- Active Layer Name -->
        <div class="flex items-center gap-1">
          <span class="text-slate-500 font-sans text-[11px]">Qatlam:</span>
          <span class="text-emerald-400 font-sans font-medium truncate max-w-[110px]">
            {{ mapStore.activeLayer?.name || 'Qatlam' }}
          </span>
        </div>

        <template v-if="toolStore.hoveredCell && hoveredCellItemsCount > 0">
          <div class="h-3 w-px bg-slate-800 hidden sm:block"></div>
          <!-- Items count on hovered cell -->
          <div class="hidden sm:flex items-center gap-1 text-[11px] text-amber-300 font-sans">
            <span>📦 {{ hoveredCellItemsCount }} ta element</span>
          </div>
        </template>
      </div>
    </div>

    <!-- Floating Mobile Zoom & Map Navigation Widget (Right side) -->
    <div 
      class="absolute right-3.5 top-20 z-20 flex flex-col gap-2 pointer-events-none select-none"
    >
      <div 
        class="glass-panel p-1.5 rounded-2xl border border-slate-700/80 shadow-2xl backdrop-blur-xl bg-slate-900/90 flex flex-col gap-1.5 pointer-events-auto items-center"
        @mousedown.stop
        @mouseup.stop
        @click.stop
        @touchstart.stop
        @touchend.stop
        @touchmove.stop
      >
        <!-- Zoom In -->
        <button 
          @click="toolStore.zoomIn()"
          class="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-sm text-sm font-bold active:scale-95"
          title="Kattalashtirish (+)"
        >
          <Plus class="w-4 h-4" />
        </button>

        <!-- Current Zoom Percentage -->
        <div class="py-0.5 text-center font-mono text-[9px] text-slate-400 font-semibold select-none leading-none">
          {{ Math.round(toolStore.zoom * 100) }}%
        </div>

        <!-- Zoom Out -->
        <button 
          @click="toolStore.zoomOut()"
          class="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-sm text-sm font-bold active:scale-95"
          title="Kichiklashtirish (-)"
        >
          <Minus class="w-4 h-4" />
        </button>

        <div class="h-px w-6 bg-slate-800 my-0.5"></div>

        <!-- Center Map View -->
        <button 
          @click="centerView"
          class="w-8 h-8 rounded-xl bg-slate-800 hover:bg-emerald-900/60 text-emerald-400 hover:text-emerald-300 flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95"
          title="Xaritani umumiy ko'rinishga qaytarish"
        >
          <Crosshair class="w-4 h-4" />
        </button>

        <!-- Center Origin Focus (🎯) -->
        <button 
          @click="focusOnCenter"
          class="w-8 h-8 rounded-xl bg-slate-800 hover:bg-amber-900/60 text-amber-300 hover:text-amber-200 flex items-center justify-center transition-all cursor-pointer shadow-sm text-xs font-bold active:scale-95"
          title="Markaziy koordinata (Center Origin)ga borish"
        >
          <span>🎯</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { Crosshair, Sparkles, X, PlusCircle, Plus, Minus, MapPin, PenTool } from 'lucide-vue-next'
import { IsoEngine } from '../engine/IsoEngine'
import { useMapStore } from '../stores/mapStore'
import { useToolStore } from '../stores/toolStore'
import { useAssetStore } from '../stores/assetStore'
import { GridCoord, AssetItem, Point2D } from '../types/map'
import ElementInspector from './ElementInspector.vue'
import GameConfigModal from './GameConfigModal.vue'
import PlacementPromptModal from './PlacementPromptModal.vue'
import GamePlayHUD from './GamePlayHUD.vue'
import TowerCreateModal from './TowerCreateModal.vue'
import { useCharacterStore } from '../stores/characterStore'
import { useTowerStore } from '../stores/towerStore'
import { useMultiplayerStore } from '../stores/multiplayerStore'
import { 
  getBresenhamLine, 
  getRectangleCells, 
  floodFill, 
  isInsideGrid, 
  cellKey, 
  gridToScreen 
} from '../utils/isometric'

const viewportContainerRef = ref<HTMLDivElement | null>(null)

const mapStore = useMapStore()
const toolStore = useToolStore()
const assetStore = useAssetStore()
const characterStore = useCharacterStore()
const towerStore = useTowerStore()
const multiplayerStore = useMultiplayerStore()

// PixiJS Engine instance
const engine = new IsoEngine()
let resizeObserver: ResizeObserver | null = null

// Help guide state
const showGuide = ref(true)
const isDraggingOver = ref(false)

const hoveredCellItemsCount = computed(() => {
  if (!toolStore.hoveredCell) return 0
  return mapStore.getCellItems(toolStore.hoveredCell.col, toolStore.hoveredCell.row).length
})

// Cached Viewport DOMRect (eliminates layout thrashing in input handlers)
let cachedViewportRect: DOMRect | null = null
function updateViewportRect() {
  if (viewportContainerRef.value) {
    cachedViewportRect = viewportContainerRef.value.getBoundingClientRect()
  }
}
function getViewportRect(): DOMRect {
  if (!cachedViewportRect && viewportContainerRef.value) {
    cachedViewportRect = viewportContainerRef.value.getBoundingClientRect()
  }
  return cachedViewportRect || new DOMRect(0, 0, window.innerWidth, window.innerHeight)
}

// Local Non-Reactive Camera State (Direct Pixi transform with zero Vue/Pinia overhead during drag)
let localPanX = 0
let localPanY = 0
let localZoom = 1.0
let isLocalDragging = false

// Pan state for cursor class
const isPanning = ref(false)
const panStart = { x: 0, y: 0 }
const panOrigin = { x: 0, y: 0 }
const isSpacePressed = ref(false)

function getAssetMap(): Map<string, AssetItem> {
  const map = new Map<string, AssetItem>()
  for (const asset of assetStore.assets) {
    if (!asset) continue
    map.set(asset.id, asset)
    const cleanId = asset.id.replace(/^sprite-/, '')
    map.set(cleanId, asset)
    map.set(`sprite-${cleanId}`, asset)
    if (asset.fileRelativePath) {
      map.set(asset.fileRelativePath, asset)
      const baseNoExt = asset.fileRelativePath.replace(/\.[^/.]+$/, '')
      map.set(baseNoExt, asset)
      map.set(`sprite-${baseNoExt}`, asset)
    }
    if (asset.name) {
      map.set(asset.name, asset)
      map.set(asset.name.toLowerCase(), asset)
    }
  }
  return map
}

function centerView() {
  if (!viewportContainerRef.value) return
  cachedViewportRect = null
  updateViewportRect()
  const rect = getViewportRect()
  const pan = engine.centerMap(mapStore.project, rect.width, rect.height, toolStore.zoom)
  localPanX = pan.x
  localPanY = pan.y
  localZoom = toolStore.zoom
  toolStore.pan = { x: Math.round(pan.x), y: Math.round(pan.y) }
  engine.setTransform(localZoom, { x: localPanX, y: localPanY })
}

function focusOnCenter() {
  const centerCol = Math.floor(mapStore.project.cols / 2)
  const centerRow = Math.floor(mapStore.project.rows / 2)
  focusOnCell(centerCol, centerRow)
}

function focusOnCell(col: number, row: number) {
  if (!viewportContainerRef.value) return
  cachedViewportRect = null
  updateViewportRect()
  const rect = getViewportRect()
  const pt = gridToScreen(col, row, mapStore.project.tileWidth, mapStore.project.tileHeight)

  localPanX = rect.width / 2 - pt.x * toolStore.zoom
  localPanY = rect.height / 2 - pt.y * toolStore.zoom
  localZoom = toolStore.zoom

  toolStore.pan = { x: Math.round(localPanX), y: Math.round(localPanY) }
  engine.setTransform(localZoom, { x: localPanX, y: localPanY })
}

onMounted(async () => {
  if (!viewportContainerRef.value) return

  cachedViewportRect = null
  updateViewportRect()
  const rect = getViewportRect()
  await engine.init(viewportContainerRef.value, rect.width, rect.height)

  // Auto re-sync visible sprites whenever any texture finishes loading
  let syncLayersTimer: any = null
  engine.onTextureLoaded = () => {
    if (syncLayersTimer) return
    syncLayersTimer = requestAnimationFrame(() => {
      syncLayersTimer = null
      if (engine.isInitialized) {
        engine.syncLayers(mapStore.project, getAssetMap())
      }
    })
  }

  // Ensure builtin sprites are loaded and preloaded
  await assetStore.loadBuiltinSprites()
  await engine.preloadAssetsBatch(assetStore.assets)

  // Hook up character and tower defense combat update ticker loop
  engine.onTick = (rawDeltaSec: number) => {
    characterStore.fps = engine.currentFps
    const simSpeed = Math.max(0.1, Math.min(50.0, characterStore.gameSpeed || 1.0))
    const effectiveDelta = rawDeltaSec * simSpeed

    // In Multiplayer: Only Host runs authoritative wave & combat simulation
    // Client runs visual smoothing and receives authoritative frames from Host
    if (!multiplayerStore.roomId || multiplayerStore.isHost) {
      characterStore.updateTick(effectiveDelta)
      towerStore.updateCombatTick(effectiveDelta)

      if (multiplayerStore.roomId && multiplayerStore.isHost) {
        multiplayerStore.broadcastGameTick()
      }
    } else {
      characterStore.updateClientInterpolation(effectiveDelta)
      towerStore.updateClientCombatInterpolation(effectiveDelta)
    }

    engine.renderCharacter(characterStore, mapStore.project)
    engine.renderTowersAndCombat(towerStore, mapStore.project, characterStore, toolStore.hoveredCell)
    engine.renderTeammateHovers(multiplayerStore.teammateHovers, mapStore.project)
  }

  // Restore towers from project and detect doors
  towerStore.restoreFromProject()
  characterStore.detectDoors()
  if (characterStore.detectedDoors.length > 0) {
    characterStore.spawnAtDoor(0)
  }

  localZoom = toolStore.zoom
  localPanX = toolStore.pan.x
  localPanY = toolStore.pan.y

  focusOnCenter()
  updateEngineState()

  // Automatic ResizeObserver: instantly resizes canvas whenever parent size changes (e.g. game mode toggle)
  if (typeof ResizeObserver !== 'undefined' && viewportContainerRef.value) {
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
          updateViewportRect()
          engine.resize(entry.contentRect.width, entry.contentRect.height)
        }
      }
    })
    resizeObserver.observe(viewportContainerRef.value)
  }

  window.addEventListener('resize', handleResize)
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
  engine.destroy()
})

function handleResize() {
  if (!viewportContainerRef.value || !engine.isInitialized) return
  updateViewportRect()
  const rect = getViewportRect()
  if (rect.width > 0 && rect.height > 0) {
    engine.resize(rect.width, rect.height)
  }
}

function updateEngineState() {
  if (!engine.isInitialized) return

  for (const asset of assetStore.assets) {
    if (asset.src) {
      engine.preloadAsset(asset)
    }
  }

  engine.syncLayers(mapStore.project, getAssetMap())

  engine.renderGrid(
    mapStore.project,
    toolStore.showGrid,
    toolStore.gridOpacity,
    toolStore.showCoordinates,
    toolStore.showCenterMarker,
    toolStore.showSymmetryAxes
  )

  let spanX = 1
  let spanY = 1
  if (toolStore.selectedElement) {
    const items = mapStore.getCellItems(toolStore.selectedElement.col, toolStore.selectedElement.row, toolStore.selectedElement.layerId)
    const item = items.find(i => i.id === toolStore.selectedElement?.itemId) || items[items.length - 1]
    if (item) {
      spanX = item.spanX || 1
      spanY = item.spanY || 1
    }
  }

  engine.renderSelection(toolStore.selectedElement, mapStore.project, spanX, spanY)

  if (toolStore.previewCells.length > 0) {
    engine.renderPreviewCells(
      toolStore.previewCells,
      mapStore.project,
      assetStore.selectedAsset,
      toolStore.activeTool
    )
  } else {
    engine.renderHoverCell(
      toolStore.hoveredCell,
      mapStore.project,
      assetStore.selectedAsset,
      toolStore.activeTool
    )
  }

  // Render character and path trail
  engine.renderCharacter(characterStore, mapStore.project)
}

// Watchers: Optimized and decoupled so hover/selection does NOT trigger full layer and grid rebuilds
watch(
  () => [mapStore.project.layers, mapStore.project.updatedAt],
  () => {
    if (!engine.isInitialized) return
    engine.syncLayers(mapStore.project, getAssetMap())
    if (!characterStore.isPlaying && !characterStore.isGameMode) {
      characterStore.detectDoors()
    }
  },
  { deep: true }
)

watch(
  () => [
    characterStore.isEnabled,
    characterStore.showPathTrail,
    characterStore.isDrawingRoute,
    characterStore.drawingPath,
    characterStore.currentActiveRoute,
    characterStore.selectedDoorIndex,
    characterStore.spawnMode,
    characterStore.formation,
    characterStore.units,
  ],
  () => {
    engine.renderCharacter(characterStore, mapStore.project)
  },
  { deep: true }
)

watch(
  () => [
    towerStore.placedTowers,
    towerStore.selectedPlacedTowerId,
    towerStore.activeBuildTowerId,
    toolStore.hoveredCell,
  ],
  () => {
    engine.renderTowersAndCombat(towerStore, mapStore.project, characterStore, toolStore.hoveredCell)
  },
  { deep: true }
)

watch(
  () => [
    mapStore.project.cols, 
    mapStore.project.rows, 
    mapStore.project.tileWidth, 
    mapStore.project.tileHeight,
    toolStore.showGrid,
    toolStore.showCoordinates,
    toolStore.showCenterMarker,
    toolStore.showSymmetryAxes,
    toolStore.gridOpacity
  ],
  () => {
    if (!engine.isInitialized) return
    engine.renderGrid(
      mapStore.project,
      toolStore.showGrid,
      toolStore.gridOpacity,
      toolStore.showCoordinates,
      toolStore.showCenterMarker,
      toolStore.showSymmetryAxes
    )
  }
)

watch(
  () => assetStore.assets,
  async (newAssets) => {
    for (const a of newAssets) {
      await engine.preloadAsset(a)
    }
    updateEngineState()
  },
  { deep: true }
)

// Lightweight hover and preview updates (zero layer or grid overhead)
watch(
  () => [
    toolStore.hoveredCell, 
    toolStore.previewCells, 
    toolStore.activeTool, 
    assetStore.selectedAssetId
  ],
  () => {
    if (!engine.isInitialized) return
    if (toolStore.previewCells.length > 0) {
      engine.renderPreviewCells(
        toolStore.previewCells,
        mapStore.project,
        assetStore.selectedAsset,
        toolStore.activeTool
      )
    } else {
      engine.renderHoverCell(
        toolStore.hoveredCell,
        mapStore.project,
        assetStore.selectedAsset,
        toolStore.activeTool
      )
    }
  }
)

// Lightweight selection box update
watch(
  () => toolStore.selectedElement,
  (newSel) => {
    if (!engine.isInitialized) return
    let spanX = 1
    let spanY = 1
    if (newSel) {
      const items = mapStore.getCellItems(newSel.col, newSel.row, newSel.layerId)
      const item = items.find(i => i.id === newSel?.itemId) || items[items.length - 1]
      if (item) {
        spanX = item.spanX || 1
        spanY = item.spanY || 1
      }
    }
    engine.renderSelection(newSel, mapStore.project, spanX, spanY)
  }
)

// External Pan & Zoom sync watcher (guarded against self-trigger during local drag)
watch(
  () => [toolStore.zoom, toolStore.pan],
  ([newZoom, newPan]) => {
    if (isLocalDragging) return
    const z = newZoom as number
    const p = newPan as Point2D
    localZoom = z
    localPanX = p.x
    localPanY = p.y
    engine.setTransform(localZoom, { x: localPanX, y: localPanY })
  },
  { deep: true }
)

// Auto-resize and adapt viewport when toggling Play / Game Mode
watch(
  () => characterStore.isGameMode,
  () => {
    const refreshView = () => {
      cachedViewportRect = null
      updateViewportRect()
      handleResize()
      focusOnCenter()
      updateEngineState()
    }

    nextTick(() => {
      refreshView()
    })
    setTimeout(() => {
      refreshView()
    }, 60)
    setTimeout(() => {
      refreshView()
    }, 180)
    setTimeout(() => {
      refreshView()
    }, 350)
  }
)

// Re-center and synchronize when a new map project is loaded or dimensions change
watch(
  () => [mapStore.project.id, mapStore.project.cols, mapStore.project.rows],
  () => {
    const refreshView = () => {
      cachedViewportRect = null
      updateViewportRect()
      handleResize()
      focusOnCenter()
      updateEngineState()
    }

    nextTick(() => {
      refreshView()
    })
    setTimeout(() => {
      refreshView()
    }, 100)
  }
)

// Mouse Right Click Handler (Releases active asset, cancels selection, cancels move)
function handleContextMenu() {
  if (toolStore.isMovingElement) {
    toolStore.isMovingElement = false
    return
  }
  if (assetStore.selectedAssetId) {
    assetStore.selectAsset(null)
    return
  }
  if (toolStore.selectedElement) {
    toolStore.setSelectedElement(null)
    return
  }
  if (toolStore.placementConflict) {
    toolStore.placementConflict = null
    return
  }
  toolStore.previewCells = []
  toolStore.isMouseDown = false
}

// Reusable Cell Click / Tap Action Execution
function executeCellClick(gridCoord: GridCoord, isContinuous = false) {
  if (mapStore.activeLayer?.locked) return

  if (!isInsideGrid(gridCoord.col, gridCoord.row, mapStore.project.cols, mapStore.project.rows)) {
    if (!assetStore.selectedAssetId || toolStore.activeTool === 'select') {
      toolStore.setSelectedElement(null)
    }
    return
  }

  // 0. If Setting/Placing a Spawn Point:
  if (characterStore.isSettingSpawnPoint) {
    if (characterStore.spawnPointPlacementMode === 'add') {
      characterStore.addSpawnPoint(gridCoord.col, gridCoord.row)
    } else {
      characterStore.relocateCurrentSpawnPoint(gridCoord.col, gridCoord.row)
    }
    characterStore.isSettingSpawnPoint = false
    engine.renderCharacter(characterStore, mapStore.project)
    return
  }

  // 0.1 If Tower Build Placement Mode is active:
  if (towerStore.activeBuildTowerId) {
    towerStore.placeTowerAt(gridCoord.col, gridCoord.row)
    engine.renderTowersAndCombat(towerStore, mapStore.project, characterStore, toolStore.hoveredCell)
    if (!isContinuous) {
      towerStore.selectBuildTower(null)
    }
    return
  }

  // 0.2 If Custom Route Drawing Mode is active:
  if (characterStore.isDrawingRoute) {
    characterStore.addPathTile(gridCoord)
    engine.renderCharacter(characterStore, mapStore.project)
    return
  }

  // 1. If Moving an Element:
  if (toolStore.isMovingElement && toolStore.selectedElement) {
    mapStore.moveTileItem(
      toolStore.selectedElement.col,
      toolStore.selectedElement.row,
      gridCoord.col,
      gridCoord.row,
      toolStore.selectedElement.itemId,
      toolStore.selectedElement.layerId
    )
    toolStore.selectedElement.col = gridCoord.col
    toolStore.selectedElement.row = gridCoord.row
    toolStore.isMovingElement = false
    return
  }

  // 2. If NO ASSET IS ACTIVE (or in Select Mode / Game Mode): SELECT TOWER OR MAP ELEMENT
  if (!assetStore.selectedAssetId || toolStore.activeTool === 'select') {
    // Check if clicked on a Placed Tower
    const clickedTower = towerStore.placedTowers.find(t => t.col === gridCoord.col && t.row === gridCoord.row)
    if (clickedTower) {
      towerStore.selectedPlacedTowerId = clickedTower.id
      engine.renderTowersAndCombat(towerStore, mapStore.project, characterStore, toolStore.hoveredCell)
      toolStore.setSelectedElement(null)
      return
    } else {
      towerStore.selectedPlacedTowerId = null
      engine.renderTowersAndCombat(towerStore, mapStore.project, characterStore, toolStore.hoveredCell)
    }

    const elementsOnCell = mapStore.getElementsAtOrCoveringCell(gridCoord.col, gridCoord.row, mapStore.activeLayerId)
    if (elementsOnCell.length > 0) {
      const topEntry = elementsOnCell[0]
      toolStore.setSelectedElement({
        col: topEntry.originCol,
        row: topEntry.originRow,
        layerId: mapStore.activeLayerId,
        itemId: topEntry.item.id,
      })
    } else {
      toolStore.setSelectedElement(null)
    }
    return
  }

  // 3. AN ASSET IS ACTIVE: PLACE IT ON THE GRID
  if (assetStore.selectedAssetId) {
    const placedAssetId = assetStore.selectedAssetId
    const existingDirect = mapStore.getCellItems(gridCoord.col, gridCoord.row)

    if (existingDirect.length > 0) {
      if (toolStore.placementMode === 'ask' && !isContinuous) {
        toolStore.placementConflict = {
          col: gridCoord.col,
          row: gridCoord.row,
          assetId: placedAssetId,
        }
        return
      } else {
        mapStore.setTile(gridCoord.col, gridCoord.row, placedAssetId, toolStore.placementMode === 'replace' ? 'replace' : 'stack')
      }
    } else {
      mapStore.setTile(gridCoord.col, gridCoord.row, placedAssetId, 'stack')
    }

    if (!isContinuous) {
      assetStore.selectAsset(null)
    } else {
      toolStore.isMouseDown = true
      toolStore.dragStartCell = gridCoord
    }
    return
  }

  // 4. ERASER TOOL (E)
  if (toolStore.activeTool === 'eraser') {
    mapStore.removeTile(gridCoord.col, gridCoord.row)
    toolStore.isMouseDown = true
    toolStore.dragStartCell = gridCoord
    return
  }

  // 5. PICKER TOOL (I)
  if (toolStore.activeTool === 'picker') {
    const key = cellKey(gridCoord.col, gridCoord.row)
    let foundAssetId: string | null = null

    const layer = mapStore.activeLayer
    if (layer && layer.tiles[key]) {
      const items = mapStore.getCellItems(gridCoord.col, gridCoord.row)
      if (items.length > 0) foundAssetId = items[items.length - 1].assetId
    } else {
      for (let i = mapStore.project.layers.length - 1; i >= 0; i--) {
        const l = mapStore.project.layers[i]
        if (l.visible && l.tiles[key]) {
          const items = mapStore.getCellItems(gridCoord.col, gridCoord.row, l.id)
          if (items.length > 0) {
            foundAssetId = items[items.length - 1].assetId
            break
          }
        }
      }
    }

    if (foundAssetId) {
      assetStore.selectAsset(foundAssetId)
    }
    return
  }

  // 6. BUCKET TOOL (G)
  if (toolStore.activeTool === 'bucket' && assetStore.selectedAssetId) {
    const activeTilesRecord: Record<string, { assetId: string }> = {}
    for (const [key, items] of Object.entries(mapStore.activeLayer.tiles)) {
      const itemArr = Array.isArray(items) ? items : [items]
      if (itemArr.length > 0) {
        activeTilesRecord[key] = { assetId: itemArr[itemArr.length - 1].assetId }
      }
    }

    const targetCells = floodFill(
      gridCoord.col,
      gridCoord.row,
      assetStore.selectedAssetId,
      activeTilesRecord,
      mapStore.project.cols,
      mapStore.project.rows
    )
    if (targetCells.length > 0) {
      mapStore.fillTiles(targetCells, assetStore.selectedAssetId)
    }

    if (!isContinuous) {
      assetStore.selectAsset(null)
    }
    return
  }

  // 7. LINE / RECT TOOLS
  if (toolStore.activeTool === 'line' || toolStore.activeTool === 'rect') {
    toolStore.isMouseDown = true
    toolStore.dragStartCell = gridCoord
  }
}

// Mouse Down Handler
function handleMouseDown(e: MouseEvent) {
  if (!viewportContainerRef.value) return

  // Prevent clicks on floating UI components / modals from triggering the map!
  const target = e.target as HTMLElement
  if (target && target.tagName !== 'CANVAS') {
    return
  }

  // Right Click handled in handleContextMenu
  if (e.button === 2) {
    handleContextMenu()
    return
  }

  // Middle Click or Space Key or Pan Tool activates panning
  if (e.button === 1 || isSpacePressed.value || toolStore.activeTool === 'pan') {
    isPanning.value = true
    isLocalDragging = true
    panStart.x = e.clientX
    panStart.y = e.clientY
    panOrigin.x = localPanX
    panOrigin.y = localPanY
    return
  }

  if (mapStore.activeLayer?.locked) return

  const rect = getViewportRect()
  const { gridCoord } = engine.screenPointToGrid(e.clientX, e.clientY, rect, mapStore.project)

  executeCellClick(gridCoord, e.shiftKey || e.ctrlKey || e.metaKey)
}

// Touch Interaction State & Multi-touch Gestures (Pinch-to-zoom, Pan, Tap)
interface TouchState {
  isTouch: boolean
  mode: 'none' | 'pan' | 'pinch' | 'tap_pending'
  startX: number
  startY: number
  startTime: number
  startPanX: number
  startPanY: number
  startZoom: number
  initialDistance: number
  initialMidX: number
  initialMidY: number
  moved: boolean
  lastTapTime: number
  lastTapPos: { x: number; y: number }
}

const touchState = ref<TouchState>({
  isTouch: false,
  mode: 'none',
  startX: 0,
  startY: 0,
  startTime: 0,
  startPanX: 0,
  startPanY: 0,
  startZoom: 1.0,
  initialDistance: 0,
  initialMidX: 0,
  initialMidY: 0,
  moved: false,
  lastTapTime: 0,
  lastTapPos: { x: 0, y: 0 }
})

function getTouchDistance(t1: Touch, t2: Touch): number {
  return Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY)
}

function getTouchMidpoint(t1: Touch, t2: Touch): { x: number; y: number } {
  return {
    x: (t1.clientX + t2.clientX) / 2,
    y: (t1.clientY + t2.clientY) / 2
  }
}

function handleTouchStart(e: TouchEvent) {
  if (!viewportContainerRef.value) return
  const target = e.target as HTMLElement
  if (target && target.tagName !== 'CANVAS') {
    return
  }

  updateViewportRect()

  if (e.touches.length === 1) {
    const t = e.touches[0]
    touchState.value = {
      isTouch: true,
      mode: 'tap_pending',
      startX: t.clientX,
      startY: t.clientY,
      startTime: performance.now(),
      startPanX: localPanX,
      startPanY: localPanY,
      startZoom: localZoom,
      initialDistance: 0,
      initialMidX: 0,
      initialMidY: 0,
      moved: false,
      lastTapTime: touchState.value.lastTapTime,
      lastTapPos: touchState.value.lastTapPos
    }
    isLocalDragging = false
  } else if (e.touches.length === 2) {
    const t1 = e.touches[0]
    const t2 = e.touches[1]
    const dist = getTouchDistance(t1, t2)
    const mid = getTouchMidpoint(t1, t2)

    touchState.value = {
      isTouch: true,
      mode: 'pinch',
      startX: mid.x,
      startY: mid.y,
      startTime: performance.now(),
      startPanX: localPanX,
      startPanY: localPanY,
      startZoom: localZoom,
      initialDistance: dist,
      initialMidX: mid.x,
      initialMidY: mid.y,
      moved: true,
      lastTapTime: touchState.value.lastTapTime,
      lastTapPos: touchState.value.lastTapPos
    }
    isLocalDragging = true
  }
}

function handleTouchMove(e: TouchEvent) {
  if (!viewportContainerRef.value) return
  const target = e.target as HTMLElement
  if (target && target.tagName !== 'CANVAS') {
    return
  }

  // Multi-touch: Pinch to Zoom + 2-Finger Pan (Pure Pixi transform, zero Vue reactivity)
  if (e.touches.length === 2) {
    const t1 = e.touches[0]
    const t2 = e.touches[1]
    const curDist = getTouchDistance(t1, t2)
    const curMid = getTouchMidpoint(t1, t2)

    if (touchState.value.initialDistance > 10) {
      const scaleChange = curDist / touchState.value.initialDistance
      const targetZoom = Math.max(0.15, Math.min(4.0, touchState.value.startZoom * scaleChange))

      const rect = getViewportRect()
      const focalX = touchState.value.initialMidX - rect.left
      const focalY = touchState.value.initialMidY - rect.top

      localZoom = targetZoom
      localPanX = focalX - (focalX - touchState.value.startPanX) * (targetZoom / touchState.value.startZoom) + (curMid.x - touchState.value.initialMidX)
      localPanY = focalY - (focalY - touchState.value.startPanY) * (targetZoom / touchState.value.startZoom) + (curMid.y - touchState.value.initialMidY)

      engine.setTransform(localZoom, { x: localPanX, y: localPanY })
    }
    return
  }

  // Single-touch: Fast Smooth Pan (Zero DOM queries, zero hover calculations, direct Pixi pan)
  if (e.touches.length === 1) {
    const t = e.touches[0]
    const dx = t.clientX - touchState.value.startX
    const dy = t.clientY - touchState.value.startY

    if (!touchState.value.moved && Math.hypot(dx, dy) > 8) {
      touchState.value.moved = true
      touchState.value.mode = 'pan'
      isLocalDragging = true
    }

    if (touchState.value.moved) {
      if (characterStore.isDrawingRoute) {
        const rect = getViewportRect()
        const { gridCoord } = engine.screenPointToGrid(t.clientX, t.clientY, rect, mapStore.project)
        if (isInsideGrid(gridCoord.col, gridCoord.row, mapStore.project.cols, mapStore.project.rows)) {
          characterStore.addPathTile(gridCoord)
          engine.renderCharacter(characterStore, mapStore.project)
        }
      } else {
        localPanX = touchState.value.startPanX + dx
        localPanY = touchState.value.startPanY + dy
        engine.setPan(localPanX, localPanY)
      }
    }
  }
}

function handleTouchEnd(e: TouchEvent) {
  if (e.touches.length === 0) {
    const now = performance.now()
    const elapsed = now - touchState.value.startTime

    // Single Tap Detection (minimal drag, fast tap)
    if (!touchState.value.moved && touchState.value.mode === 'tap_pending' && elapsed < 450) {
      if (viewportContainerRef.value) {
        const rect = getViewportRect()
        const { gridCoord } = engine.screenPointToGrid(touchState.value.startX, touchState.value.startY, rect, mapStore.project)
        executeCellClick(gridCoord, false)

        // Double Tap detection for quick zoom-in
        const distFromLastTap = Math.hypot(
          touchState.value.startX - touchState.value.lastTapPos.x,
          touchState.value.startY - touchState.value.lastTapPos.y
        )
        if (now - touchState.value.lastTapTime < 350 && distFromLastTap < 30) {
          toolStore.zoomIn()
          touchState.value.lastTapTime = 0
        } else {
          touchState.value.lastTapTime = now
          touchState.value.lastTapPos = { x: touchState.value.startX, y: touchState.value.startY }
        }
      }
    }

    // Synchronize local camera state to Pinia state once at end of drag/pinch
    if (isLocalDragging) {
      isLocalDragging = false
      toolStore.pan = { x: Math.round(localPanX), y: Math.round(localPanY) }
      toolStore.zoom = Number(localZoom.toFixed(2))
    }

    touchState.value.mode = 'none'
    touchState.value.isTouch = false
    toolStore.setHoveredCell(null)
  } else if (e.touches.length === 1) {
    // Transitioning from 2-finger pinch back to 1-finger drag
    const t = e.touches[0]
    touchState.value.startX = t.clientX
    touchState.value.startY = t.clientY
    touchState.value.startPanX = localPanX
    touchState.value.startPanY = localPanY
    touchState.value.moved = true
    touchState.value.mode = 'pan'
  }
}

function handleTouchCancel() {
  if (isLocalDragging) {
    isLocalDragging = false
    toolStore.pan = { x: Math.round(localPanX), y: Math.round(localPanY) }
    toolStore.zoom = Number(localZoom.toFixed(2))
  }
  touchState.value.mode = 'none'
  touchState.value.isTouch = false
  toolStore.setHoveredCell(null)
}

function handleMouseMove(e: MouseEvent) {
  if (!viewportContainerRef.value) return

  const target = e.target as HTMLElement
  if (target && target.tagName !== 'CANVAS' && !isPanning.value && !toolStore.isMouseDown) {
    toolStore.setHoveredCell(null)
    return
  }

  // Mouse pan: Direct Pixi position update without triggering Pinia watchers per mouse event
  if (isPanning.value) {
    const dx = e.clientX - panStart.x
    const dy = e.clientY - panStart.y
    localPanX = panOrigin.x + dx
    localPanY = panOrigin.y + dy
    engine.setPan(localPanX, localPanY)
    return
  }

  const rect = getViewportRect()
  const { gridCoord } = engine.screenPointToGrid(e.clientX, e.clientY, rect, mapStore.project)

  if (isInsideGrid(gridCoord.col, gridCoord.row, mapStore.project.cols, mapStore.project.rows)) {
    toolStore.setHoveredCell(gridCoord)
    if (multiplayerStore.roomId) {
      multiplayerStore.broadcastTeammateHover(gridCoord.col, gridCoord.row)
    }
  } else {
    toolStore.setHoveredCell(null)
  }

  // Route drawing drag support
  if (characterStore.isDrawingRoute && e.buttons === 1) {
    if (isInsideGrid(gridCoord.col, gridCoord.row, mapStore.project.cols, mapStore.project.rows)) {
      characterStore.addPathTile(gridCoord)
      engine.renderCharacter(characterStore, mapStore.project)
    }
    return
  }

  if (toolStore.isMouseDown && !mapStore.activeLayer?.locked) {
    if (assetStore.selectedAssetId && (e.shiftKey || e.ctrlKey || e.metaKey)) {
      if (isInsideGrid(gridCoord.col, gridCoord.row, mapStore.project.cols, mapStore.project.rows)) {
        const existing = mapStore.getCellItems(gridCoord.col, gridCoord.row)
        if (existing.length === 0 || toolStore.placementMode === 'stack') {
          mapStore.setTile(gridCoord.col, gridCoord.row, assetStore.selectedAssetId, 'stack', undefined, false)
        }
      }
    } else if (toolStore.activeTool === 'eraser') {
      if (isInsideGrid(gridCoord.col, gridCoord.row, mapStore.project.cols, mapStore.project.rows)) {
        mapStore.removeTile(gridCoord.col, gridCoord.row, undefined, false)
      }
    } else if (toolStore.activeTool === 'line' && toolStore.dragStartCell) {
      toolStore.previewCells = getBresenhamLine(
        toolStore.dragStartCell.col,
        toolStore.dragStartCell.row,
        gridCoord.col,
        gridCoord.row
      )
    } else if (toolStore.activeTool === 'rect' && toolStore.dragStartCell) {
      toolStore.previewCells = getRectangleCells(
        toolStore.dragStartCell.col,
        toolStore.dragStartCell.row,
        gridCoord.col,
        gridCoord.row
      )
    }
  }
}

function handleMouseUp() {
  if (isPanning.value) {
    isPanning.value = false
    isLocalDragging = false
    toolStore.pan = { x: Math.round(localPanX), y: Math.round(localPanY) }
    return
  }

  if (toolStore.isMouseDown) {
    toolStore.isMouseDown = false

    if ((toolStore.activeTool === 'line' || toolStore.activeTool === 'rect') && toolStore.previewCells.length > 0) {
      if (assetStore.selectedAssetId && !mapStore.activeLayer?.locked) {
        mapStore.fillTiles(toolStore.previewCells, assetStore.selectedAssetId)
      }
      toolStore.previewCells = []
      assetStore.selectAsset(null)
    } else if (toolStore.activeTool === 'brush' || toolStore.activeTool === 'eraser') {
      mapStore.pushHistory('Chizish yakunlandi')
    }

    toolStore.dragStartCell = null
  }
}

function handleMouseLeave() {
  toolStore.setHoveredCell(null)
  toolStore.previewCells = []
  if (toolStore.isMouseDown) {
    toolStore.isMouseDown = false
    toolStore.dragStartCell = null
  }
  if (isPanning.value) {
    isPanning.value = false
    isLocalDragging = false
    toolStore.pan = { x: Math.round(localPanX), y: Math.round(localPanY) }
  }
}

function handleWheel(e: WheelEvent) {
  if (!viewportContainerRef.value) return

  const rect = getViewportRect()
  const mouseX = e.clientX - rect.left
  const mouseY = e.clientY - rect.top

  const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87
  const oldZoom = localZoom
  const newZoom = Math.max(0.15, Math.min(4.0, oldZoom * zoomFactor))

  if (oldZoom === newZoom) return

  localPanX = mouseX - (mouseX - localPanX) * (newZoom / oldZoom)
  localPanY = mouseY - (mouseY - localPanY) * (newZoom / oldZoom)
  localZoom = Number(newZoom.toFixed(2))

  engine.setTransform(localZoom, { x: localPanX, y: localPanY })
  toolStore.zoom = localZoom
  toolStore.pan = { x: Math.round(localPanX), y: Math.round(localPanY) }
}

function handleDragOver(e: DragEvent) {
  isDraggingOver.value = true
  if (!viewportContainerRef.value) return
  const rect = getViewportRect()
  const { gridCoord } = engine.screenPointToGrid(e.clientX, e.clientY, rect, mapStore.project)
  if (isInsideGrid(gridCoord.col, gridCoord.row, mapStore.project.cols, mapStore.project.rows)) {
    toolStore.setHoveredCell(gridCoord)
  }
}

function handleDragLeave() {
  isDraggingOver.value = false
}

async function handleCanvasDrop(e: DragEvent) {
  isDraggingOver.value = false
  if (!viewportContainerRef.value) return

  const rect = viewportContainerRef.value.getBoundingClientRect()
  const { gridCoord } = engine.screenPointToGrid(e.clientX, e.clientY, rect, mapStore.project)

  if (!isInsideGrid(gridCoord.col, gridCoord.row, mapStore.project.cols, mapStore.project.rows)) {
    return
  }

  const assetId = e.dataTransfer?.getData('text/plain')
  if (assetId && assetStore.assets.some(a => a.id === assetId)) {
    assetStore.selectAsset(assetId)
    const existing = mapStore.getCellItems(gridCoord.col, gridCoord.row)
    if (existing.length > 0 && toolStore.placementMode === 'ask') {
      toolStore.placementConflict = {
        col: gridCoord.col,
        row: gridCoord.row,
        assetId,
      }
    } else {
      mapStore.setTile(gridCoord.col, gridCoord.row, assetId, toolStore.placementMode === 'replace' ? 'replace' : 'stack')
    }
    assetStore.selectAsset(null)
    return
  }

  if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
    const count = await assetStore.uploadFiles(e.dataTransfer.files)
    if (count > 0 && assetStore.selectedAssetId) {
      mapStore.setTile(gridCoord.col, gridCoord.row, assetStore.selectedAssetId, 'stack')
      assetStore.selectAsset(null)
    }
  }
}

// Complete Hotkey Management
function handleKeyDown(e: KeyboardEvent) {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return

  if (e.code === 'Space') {
    isSpacePressed.value = true
  }

  // DELETE / BACKSPACE: Delete selected element
  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (toolStore.selectedElement) {
      e.preventDefault()
      mapStore.removeTileItem(
        toolStore.selectedElement.col,
        toolStore.selectedElement.row,
        toolStore.selectedElement.itemId,
        toolStore.selectedElement.layerId
      )
      const remaining = mapStore.getElementsAtOrCoveringCell(
        toolStore.selectedElement.col,
        toolStore.selectedElement.row,
        toolStore.selectedElement.layerId
      )
      if (remaining.length > 0) {
        toolStore.selectedElement.itemId = remaining[0].item.id
      } else {
        toolStore.setSelectedElement(null)
      }
    }
    return
  }

  // ROTATE (R): Rotate selected element
  if (e.key.toLowerCase() === 'r' && !e.ctrlKey && !e.metaKey) {
    if (toolStore.selectedElement) {
      e.preventDefault()
      mapStore.rotateTileItem(
        toolStore.selectedElement.col,
        toolStore.selectedElement.row,
        toolStore.selectedElement.itemId,
        toolStore.selectedElement.layerId
      )
    }
    return
  }

  // FLIP (F): Flip selected element
  if (e.key.toLowerCase() === 'f' && !e.ctrlKey && !e.metaKey) {
    if (toolStore.selectedElement) {
      e.preventDefault()
      mapStore.flipTileItem(
        toolStore.selectedElement.col,
        toolStore.selectedElement.row,
        toolStore.selectedElement.itemId,
        toolStore.selectedElement.layerId
      )
    }
    return
  }

  // RELATIVE DEPTH SHIFT: ] or PageUp (Forward/Pastdagining ustiga), [ or PageDown (Backward/Tepadagining tagiga)
  if ((e.key === ']' || e.key === 'PageUp') && !e.ctrlKey && !e.metaKey) {
    if (toolStore.selectedElement) {
      e.preventDefault()
      mapStore.shiftItemDepthOffset(
        toolStore.selectedElement.col,
        toolStore.selectedElement.row,
        toolStore.selectedElement.itemId,
        +1,
        toolStore.selectedElement.layerId
      )
    }
    return
  }

  if ((e.key === '[' || e.key === 'PageDown') && !e.ctrlKey && !e.metaKey) {
    if (toolStore.selectedElement) {
      e.preventDefault()
      mapStore.shiftItemDepthOffset(
        toolStore.selectedElement.col,
        toolStore.selectedElement.row,
        toolStore.selectedElement.itemId,
        -1,
        toolStore.selectedElement.layerId
      )
    }
    return
  }

  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault()
    mapStore.undo()
  } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
    e.preventDefault()
    mapStore.redo()
  } else if (e.key.toLowerCase() === 'v' || e.key.toLowerCase() === 's') {
    toolStore.setTool('select')
    assetStore.selectAsset(null)
  } else if (e.key.toLowerCase() === 'b') {
    toolStore.setTool('brush')
  } else if (e.key.toLowerCase() === 'g') {
    toolStore.setTool('bucket')
  } else if (e.key.toLowerCase() === 'e') {
    toolStore.setTool('eraser')
  } else if (e.key.toLowerCase() === 'i') {
    toolStore.setTool('picker')
  } else if (e.key.toLowerCase() === 'l') {
    toolStore.setTool('line')
  } else if (e.key.toLowerCase() === 'u') {
    toolStore.setTool('rect')
  } else if (e.key.toLowerCase() === 'h') {
    toolStore.setTool('pan')
  } else if (e.key.toLowerCase() === 'p' && !e.ctrlKey && !e.metaKey) {
    e.preventDefault()
    characterStore.togglePlay()
  } else if (e.key === 'Escape') {
    toolStore.setSelectedElement(null)
    toolStore.placementConflict = null
    toolStore.isMovingElement = false
    assetStore.selectAsset(null)
  }
}

function handleKeyUp(e: KeyboardEvent) {
  if (e.code === 'Space') {
    isSpacePressed.value = false
  }
}

defineExpose({
  centerView,
  focusOnCenter,
  focusOnCell,
  updateEngineState,
  handleResize,
  engine,
  exportPng: async (options: { includeGrid: boolean; transparentBg: boolean }) => {
    return engine.exportImage({
      includeGrid: options.includeGrid,
      transparentBg: options.transparentBg,
      project: mapStore.project,
      assetMap: getAssetMap(),
    })
  }
})
</script>
