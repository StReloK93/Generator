<template>
  <div ref="viewportContainerRef"
    class="relative flex-1 h-full w-full bg-dark-950 overflow-hidden cursor-crosshair select-none canvas-touch-container"
    :class="{
      'cursor-grab!': toolStore.activeTool === 'pan' && !camera.isPanning.value,
      'cursor-grabbing!': camera.isPanning.value,
      'cursor-cell!': toolStore.activeTool === 'picker',
      'cursor-crosshair!': characterStore.isDrawingRoute || characterStore.isSettingSpawnPoint,
      'cursor-pointer!': (!assetStore.selectedAssetId || toolStore.activeTool === 'select') && !characterStore.isDrawingRoute && !characterStore.isSettingSpawnPoint,
      'cursor-move!': toolStore.isMovingElement,
      'cursor-not-allowed!': mapStore.activeLayer?.locked
    }" @mousedown="handleMouseDown" @mousemove="handleMouseMove" @mouseup="handleMouseUp"
    @mouseleave="handleMouseLeave" @touchstart="handleTouchStart" @touchmove="handleTouchMove"
    @touchend="handleTouchEnd" @touchcancel="handleTouchCancel" @wheel.prevent="handleWheel"
    @dragover.prevent="handleDragOver" @dragleave.prevent="handleDragLeave" @drop.prevent="handleCanvasDrop"
    @contextmenu.prevent="handleContextMenu">
    <!-- Element Inspector (When an element is selected in Select mode) -->
    <ElementInspector />

    <!-- Placement Conflict Decision Modal -->
    <PlacementPromptModal />

    <!-- Floating HUD when Setting Spawn Point -->
    <div v-if="characterStore.isSettingSpawnPoint"
      class="absolute top-16 left-1/2 -translate-x-1/2 z-30 glass-panel px-4 py-2.5 rounded-2xl border border-amber-500/60 shadow-2xl flex items-center gap-3 text-xs bg-slate-900/95 text-amber-200 animate-in fade-in slide-in-from-top-2">
      <MapPin class="w-4 h-4 text-amber-400 animate-bounce shrink-0" />
      <span class="flex items-center gap-1.5">
        <component :is="characterStore.spawnPointPlacementMode === 'add' ? Plus : MapPin" class="w-3.5 h-3.5 text-amber-400" />
        <strong>{{ characterStore.spawnPointPlacementMode === 'add' ? $t('editor.newSpawnPoint') : $t('editor.relocateSpawnPoint') }}:</strong>
        {{ $t('editor.clickAnyCell') }}
      </span>
      <UiButton
        variant="secondary"
        size="xs"
        @click="characterStore.isSettingSpawnPoint = false"
      >
        {{ $t('common.cancel') }}
      </UiButton>
    </div>

    <!-- Floating HUD when Drawing Custom Route -->
    <div v-if="characterStore.isDrawingRoute"
      class="absolute top-16 left-1/2 -translate-x-1/2 z-30 glass-panel px-3.5 py-2 rounded-2xl border border-brand-500/60 shadow-2xl flex items-center flex-wrap gap-2 text-xs bg-slate-900/95 text-brand-200 animate-in fade-in slide-in-from-top-2">
      
      <!-- Icon & Status text -->
      <div class="flex items-center gap-2 pr-1">
        <PenTool class="w-4 h-4 text-brand-400 animate-pulse shrink-0" />
        <template v-if="characterStore.selectedWaypointIndex !== null">
          <span class="font-medium text-amber-300">
            <strong>{{ $t('editor.pointSelected', { num: characterStore.selectedWaypointIndex + 1 }) }}</strong> {{ $t('editor.clickMapToMove') }}
          </span>
          <UiButton
            variant="ghost"
            size="xs"
            :title="$t('editor.deselectPoint')"
            @click="characterStore.selectedWaypointIndex = null; engine.renderCharacter(characterStore, mapStore.project)"
          >
            {{ $t('editor.deselect') }}
          </UiButton>
          <UiIconButton
            variant="danger"
            size="xs"
            :icon="Trash2"
            :title="$t('editor.deleteWaypoint')"
            @click="characterStore.deleteSelectedWaypoint(); engine.renderCharacter(characterStore, mapStore.project)"
          />
        </template>
        <template v-else>
          <span>
            <strong>{{ $t('editor.waypoints') }}</strong> {{ characterStore.drawingWaypoints.length }} <span class="text-slate-400 font-mono">({{ $t('editor.tilesCount', { count: characterStore.drawingPath.length }) }})</span>
          </span>
        </template>
      </div>

      <div class="h-4 w-px bg-slate-700/80"></div>

      <!-- Undo / Redo / Reset for Route -->
      <div class="flex items-center gap-1">
        <UiIconButton
          variant="ghost"
          size="xs"
          :icon="Undo2"
          :disabled="!characterStore.canUndoRoute"
          :title="$t('editor.undoStep')"
          @click="characterStore.undoRoute(); engine.renderCharacter(characterStore, mapStore.project)"
        />
        <UiIconButton
          variant="ghost"
          size="xs"
          :icon="Redo2"
          :disabled="!characterStore.canRedoRoute"
          :title="$t('editor.redoStep')"
          @click="characterStore.redoRoute(); engine.renderCharacter(characterStore, mapStore.project)"
        />
        <UiIconButton
          variant="ghost"
          size="xs"
          :icon="RotateCcw"
          :title="$t('editor.resetStartPoint')"
          @click="characterStore.clearDrawnRoute(); engine.renderCharacter(characterStore, mapStore.project)"
        />
      </div>

      <div class="h-4 w-px bg-slate-700/80"></div>

      <!-- Action Buttons -->
      <div class="flex items-center gap-1.5">
        <UiButton
          variant="game-green"
          size="xs"
          :leading-icon="Check"
          @click="characterStore.finishDrawingRoute()"
        >
          {{ $t('editor.finish') }}
        </UiButton>
        <UiButton
          variant="secondary"
          size="xs"
          @click="characterStore.cancelDrawingRoute()"
        >
          {{ $t('common.cancel') }}
        </UiButton>
      </div>
    </div>

    <!-- Drag & Drop Overlay Indicator -->
    <div v-if="isDraggingOver"
      class="absolute inset-0 z-30 pointer-events-none bg-brand-600/10 border-2 border-dashed border-brand-400 flex items-center justify-center backdrop-blur-[2px]">
      <div
        class="glass-panel px-6 py-3 rounded-2xl border border-brand-400 text-brand-300 font-semibold text-sm shadow-2xl flex items-center gap-2">
        <PlusCircle class="w-5 h-5 animate-bounce" />
        <span>{{ $t('editor.dropSpriteHere') }}</span>
      </div>
    </div>

    <!-- Bottom-Left Map & Hover Cell Helper Badge -->
    <div
      class="absolute bottom-4 left-4 z-20 pointer-events-none flex items-center gap-2 select-none animate-in fade-in duration-150">
      <div
        class="glass-panel px-3 py-1.5 rounded-xl text-xs font-mono flex items-center gap-2.5 border border-slate-800/90 shadow-xl text-slate-300 backdrop-blur-xl bg-slate-900/90">
        <!-- Hover Grid Coordinates -->
        <div class="flex items-center gap-1.5">
          <span class="text-slate-500 font-sans text-[11px]">{{ $t('inspector.gridPosition') }}:</span>
          <span v-if="toolStore.hoveredCell"
            class="text-brand-300 font-bold bg-brand-500/20 px-1.5 py-0.5 rounded border border-brand-500/30">
            ({{ toolStore.hoveredCell.col }}, {{ toolStore.hoveredCell.row }})
          </span>
          <span v-else class="text-slate-600">---</span>
        </div>

        <div class="h-3 w-px bg-slate-800"></div>

        <!-- Active Layer Name -->
        <div class="flex items-center gap-1">
          <span class="text-slate-500 font-sans text-[11px]">{{ $t('inspector.layer') }}</span>
          <span class="text-emerald-400 font-sans font-medium truncate max-w-27.5">
            {{ mapStore.activeLayer?.name || $t('inspector.layer') }}
          </span>
        </div>

        <template v-if="toolStore.hoveredCell && hoveredCellItemsCount > 0">
          <div class="h-3 w-px bg-slate-800 hidden sm:block"></div>
          <div class="hidden sm:flex items-center gap-1.5 text-[11px] text-amber-300 font-sans">
            <Package class="w-3.5 h-3.5 text-amber-400" />
            <span>{{ $t('editor.itemsCount', { count: hoveredCellItemsCount }) }}</span>
          </div>
        </template>

        <!-- Dynamic Modifier Placement Mode Indicator -->
        <template v-if="isCtrlPressed">
          <div class="h-3 w-px bg-slate-800"></div>
          <span class="bg-rose-500/25 text-rose-300 font-bold px-1.5 py-0.5 rounded border border-rose-500/40 text-[10px] uppercase font-sans">
            {{ $t('editor.ctrlReplace') }}
          </span>
        </template>
        <template v-else-if="isShiftPressed">
          <div class="h-3 w-px bg-slate-800"></div>
          <span class="bg-cyan-500/25 text-cyan-300 font-bold px-1.5 py-0.5 rounded border border-cyan-500/40 text-[10px] uppercase font-sans">
            {{ $t('editor.shiftStack') }}
          </span>
        </template>
      </div>
    </div>

    <!-- Floating Mobile Zoom & Map Navigation Widget -->
    <div class="absolute right-3 top-3 z-20 flex gap-2 items-center pointer-events-none select-none">
      <div
        class="py-1 px-2.5 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl text-center font-mono text-[10px] text-slate-300 font-semibold select-none leading-none shadow-lg">
        {{ Math.round(camera.localZoom.value * 100) }}%
      </div>
      <div class="pointer-events-auto flex items-center gap-1.5">
        <!-- Route Lines Toggle Button (Top of the map) -->
        <UiIconButton
          variant="tool"
          size="sm"
          :active="characterStore.showPathTrail !== false"
          :icon="Footprints"
          :title="characterStore.showPathTrail !== false ? $t('editor.hideRouteLines') : $t('editor.showRouteLines')"
          @click="characterStore.showPathTrail = !characterStore.showPathTrail"
        />

        <!-- Reset View to Center -->
        <UiIconButton
          variant="default"
          size="sm"
          :icon="Crosshair"
          title="Center Origin"
          @click="camera.focusOnCenter(viewportContainerRef)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, toRef } from 'vue'
import { Plus, Minus, Crosshair, Sparkles, X, MapPin, PenTool, PlusCircle, Package, Undo2, Redo2, RotateCcw, Trash2, Check, Footprints } from 'lucide-vue-next'
import { UiButton, UiIconButton } from '../ui'
import ElementInspector from '../ElementInspector.vue'
import PlacementPromptModal from '../PlacementPromptModal.vue'
import { useMapStore } from '../../stores/mapStore'
import { useToolStore } from '../../stores/toolStore'
import { useAssetStore } from '../../stores/assetStore'
import { useCharacterStore } from '../../stores/characterStore'
import { IsoEngine } from '../../engine/IsoEngine'
import { usePixiCamera } from '../../composables/usePixiCamera'
import { GridCoord, AssetItem } from '../../types/map'
import { cellKey, isInsideGrid, getBresenhamLine, getRectangleCells, floodFill } from '../../utils/isometric'
import { assetManager } from '../../services/assetManager'

const mapStore = useMapStore()
const toolStore = useToolStore()
const assetStore = useAssetStore()
const characterStore = useCharacterStore()

const viewportContainerRef = ref<HTMLElement | null>(null)
const engine = new IsoEngine()
const camera = usePixiCamera(engine, toRef(mapStore, 'project'))

const showGuide = ref(true)
const isDraggingOver = ref(false)
let resizeObserver: ResizeObserver | null = null

const hoveredCellItemsCount = computed(() => {
  if (!toolStore.hoveredCell) return 0
  const items = mapStore.getCellItems(toolStore.hoveredCell.col, toolStore.hoveredCell.row)
  return items.length
})

function getAssetMap(): Map<string, AssetItem> {
  const map = new Map<string, AssetItem>()
  for (const a of assetStore.assets) {
    map.set(a.id, a)
  }
  return map
}

function updateEngineState() {
  if (!engine.isInitialized) return
  engine.syncLayers(mapStore.project, getAssetMap())
  engine.renderGrid(
    mapStore.project,
    toolStore.showGrid,
    toolStore.gridOpacity,
    toolStore.showCoordinates,
    toolStore.showCenterMarker,
    toolStore.showSymmetryAxes
  )
  engine.renderCharacter(characterStore, mapStore.project)
}

onMounted(async () => {
  if (!viewportContainerRef.value) return
  camera.updateViewportRect(viewportContainerRef.value)
  const rect = camera.getViewportRect(viewportContainerRef.value)
  await engine.init(viewportContainerRef.value, rect.width, rect.height)

  // Load editor assets & structures bundle via central AssetManager
  await assetManager.loadEditor()
  await assetStore.loadBuiltinSprites()

  // Texture load listener for custom dynamic uploads
  let syncTimer: any = null
  engine.onTextureLoaded = () => {
    if (syncTimer) return
    syncTimer = requestAnimationFrame(() => {
      syncTimer = null
      if (engine.isInitialized) engine.syncLayers(mapStore.project, getAssetMap())
    })
  }

  camera.focusOnCenter(viewportContainerRef.value)
  if (!characterStore.detectedDoors || characterStore.detectedDoors.length === 0) {
    characterStore.detectDoors()
  }
  updateEngineState()

  if (typeof ResizeObserver !== 'undefined' && viewportContainerRef.value) {
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
          camera.updateViewportRect(viewportContainerRef.value)
          engine.resize(entry.contentRect.width, entry.contentRect.height)
        }
      }
    })
    resizeObserver.observe(viewportContainerRef.value)
  }

  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
})

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
  engine.destroy()
})

// Watchers for editor rendering
watch(() => mapStore.project.layers, () => {
  if (engine.isInitialized) engine.syncLayers(mapStore.project, getAssetMap())
}, { deep: true })

watch(() => [
  mapStore.project.cols, mapStore.project.rows, mapStore.project.tileWidth, mapStore.project.tileHeight,
  toolStore.showGrid, toolStore.showCoordinates, toolStore.showCenterMarker, toolStore.showSymmetryAxes, toolStore.gridOpacity
], () => {
  if (engine.isInitialized) {
    engine.renderGrid(
      mapStore.project,
      toolStore.showGrid,
      toolStore.gridOpacity,
      toolStore.showCoordinates,
      toolStore.showCenterMarker,
      toolStore.showSymmetryAxes
    )
  }
})

watch(() => [toolStore.hoveredCell, toolStore.previewCells, toolStore.activeTool, assetStore.selectedAssetId], () => {
  if (!engine.isInitialized) return
  if (toolStore.previewCells.length > 0) {
    engine.renderPreviewCells(toolStore.previewCells, mapStore.project, assetStore.selectedAsset, toolStore.activeTool)
  } else {
    engine.renderHoverCell(toolStore.hoveredCell, mapStore.project, assetStore.selectedAsset, toolStore.activeTool)
  }
})

watch(() => toolStore.selectedElement, (newSel) => {
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
})

watch(() => [
  characterStore.isEnabled,
  characterStore.showSpawnPoints,
  characterStore.showPathTrail,
  characterStore.isDrawingRoute,
  characterStore.drawingPath.length,
  characterStore.selectedWaypointIndex,
  characterStore.detectedDoors.length,
  characterStore.selectedDoorIndex,
  characterStore.spawnMode,
  characterStore.isSettingSpawnPoint,
  characterStore.customRoutes,
], () => {
  if (engine.isInitialized) engine.renderCharacter(characterStore, mapStore.project)
}, { deep: true })

// Track modifier keys for strict replace (Ctrl) vs stack (Shift) placement
const isCtrlPressed = ref(false)
const isShiftPressed = ref(false)

// Track waypoint dragging during route draw
const isDraggingWaypoint = ref(false)
const draggedWaypointIndex = ref<number | null>(null)

// Track last drawn cell during mouse drag to prevent duplicate placement in the same cell
const lastDrawnCell = ref<GridCoord | null>(null)

// --- Mouse / Tool Handling ---
function executeCellClick(gridCoord: GridCoord, isContinuous = false, e?: MouseEvent | TouchEvent) {
  if (mapStore.activeLayer?.locked) return
  if (!isInsideGrid(gridCoord.col, gridCoord.row, mapStore.project.cols, mapStore.project.rows)) {
    if (!assetStore.selectedAssetId || toolStore.activeTool === 'select') {
      toolStore.setSelectedElement(null)
    }
    return
  }

  // Spawn Point Setting
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

  // Custom Route Drawing
  if (characterStore.isDrawingRoute) {
    characterStore.addPathTile(gridCoord)
    engine.renderCharacter(characterStore, mapStore.project)
    return
  }

  // Spawn Point / Route Selection & Deselection on canvas
  if (!characterStore.isDrawingRoute) {
    const clickedDoorIdx = characterStore.detectedDoors.findIndex(d => {
      const dc = d.spawnCol ?? d.col
      const dr = d.spawnRow ?? d.row
      return dc === gridCoord.col && dr === gridCoord.row
    })

    if (clickedDoorIdx !== -1 && !assetStore.selectedAssetId && toolStore.activeTool === 'select') {
      characterStore.selectedDoorIndex = (characterStore.selectedDoorIndex === clickedDoorIdx) ? null : clickedDoorIdx
      engine.renderCharacter(characterStore, mapStore.project)
      return
    } else if (characterStore.selectedDoorIndex !== null) {
      characterStore.selectedDoorIndex = null
      engine.renderCharacter(characterStore, mapStore.project)
    }
  }

  // Moving Element
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

  // Select Tool OR when NO ASSET IS ACTIVE: Select map element & open Element Inspector Driver!
  if (!assetStore.selectedAssetId || toolStore.activeTool === 'select') {
    let foundEntry: { originCol: number; originRow: number; layerId: string; itemId: string } | null = null
    
    // First check active layer
    const activeLayerEls = mapStore.getElementsAtOrCoveringCell(gridCoord.col, gridCoord.row, mapStore.activeLayerId)
    if (activeLayerEls.length > 0) {
      const top = activeLayerEls[activeLayerEls.length - 1]
      foundEntry = { originCol: top.originCol, originRow: top.originRow, layerId: mapStore.activeLayerId, itemId: top.item.id }
    } else {
      // Search all other visible layers from top to bottom
      for (let i = mapStore.project.layers.length - 1; i >= 0; i--) {
        const layer = mapStore.project.layers[i]
        if (layer.id === mapStore.activeLayerId || !layer.visible || layer.locked) continue
        const els = mapStore.getElementsAtOrCoveringCell(gridCoord.col, gridCoord.row, layer.id)
        if (els.length > 0) {
          const top = els[els.length - 1]
          foundEntry = { originCol: top.originCol, originRow: top.originRow, layerId: layer.id, itemId: top.item.id }
          break
        }
      }
    }
    
    if (foundEntry) {
      mapStore.activeLayerId = foundEntry.layerId
      toolStore.setSelectedElement({
        col: foundEntry.originCol,
        row: foundEntry.originRow,
        layerId: foundEntry.layerId,
        itemId: foundEntry.itemId,
      })
    } else {
      toolStore.setSelectedElement(null)
    }
    return
  }

  // Brush / Placing Asset
  if (assetStore.selectedAssetId) {
    const placedAssetId = assetStore.selectedAssetId
    const existingDirect = mapStore.getCellItems(gridCoord.col, gridCoord.row)

    const isCtrl = !!((e && 'ctrlKey' in e && (e.ctrlKey || (e as MouseEvent).metaKey)) || isCtrlPressed.value)
    const isShift = !!((e && 'shiftKey' in e && e.shiftKey) || isShiftPressed.value)

    let effectiveMode: 'replace' | 'stack' | 'ask' = toolStore.placementMode
    if (isCtrl) {
      effectiveMode = 'replace'
    } else if (isShift) {
      effectiveMode = 'stack'
    }

    if (existingDirect.length > 0) {
      if (effectiveMode === 'replace' && existingDirect.length === 1 && existingDirect[0].assetId === placedAssetId) {
        toolStore.isMouseDown = true
        toolStore.dragStartCell = gridCoord
        lastDrawnCell.value = { col: gridCoord.col, row: gridCoord.row }
        return
      }

      if (effectiveMode === 'ask' && !isContinuous) {
        toolStore.placementConflict = {
          col: gridCoord.col,
          row: gridCoord.row,
          assetId: placedAssetId,
        }
        return
      } else {
        mapStore.setTile(gridCoord.col, gridCoord.row, placedAssetId, effectiveMode === 'replace' ? 'replace' : 'stack')
      }
    } else {
      mapStore.setTile(gridCoord.col, gridCoord.row, placedAssetId, 'stack')
    }

    toolStore.isMouseDown = true
    toolStore.dragStartCell = gridCoord
    lastDrawnCell.value = { col: gridCoord.col, row: gridCoord.row }
    return
  }

  // Eraser Tool
  if (toolStore.activeTool === 'eraser') {
    mapStore.removeTile(gridCoord.col, gridCoord.row)
    toolStore.isMouseDown = true
    toolStore.dragStartCell = gridCoord
    lastDrawnCell.value = { col: gridCoord.col, row: gridCoord.row }
    return
  }

  // Picker Tool
  if (toolStore.activeTool === 'picker') {
    const key = cellKey(gridCoord.col, gridCoord.row)
    let foundAssetId: string | null = null
    const layer = mapStore.activeLayer
    if (layer && layer.tiles[key]) {
      const items = mapStore.getCellItems(gridCoord.col, gridCoord.row)
      if (items.length > 0) foundAssetId = items[items.length - 1].assetId
    }
    if (foundAssetId) assetStore.selectAsset(foundAssetId)
    return
  }

  // Bucket Tool
  if (toolStore.activeTool === 'bucket' && assetStore.selectedAssetId) {
    const activeTilesRecord: Record<string, { assetId: string }> = {}
    for (const [key, items] of Object.entries(mapStore.activeLayer.tiles)) {
      const itemArr = Array.isArray(items) ? items : [items]
      if (itemArr.length > 0) activeTilesRecord[key] = { assetId: itemArr[itemArr.length - 1].assetId }
    }
    const targetCells = floodFill(gridCoord.col, gridCoord.row, assetStore.selectedAssetId, activeTilesRecord, mapStore.project.cols, mapStore.project.rows)
    const isCtrl = isCtrlPressed.value
    const isShift = isShiftPressed.value
    const mode = isCtrl ? 'replace' : (isShift ? 'stack' : (toolStore.placementMode === 'replace' ? 'replace' : 'stack'))
    if (targetCells.length > 0) mapStore.fillTiles(targetCells, assetStore.selectedAssetId, mapStore.activeLayerId, mode)
    if (!isContinuous) assetStore.selectAsset(null)
    return
  }

  // Line / Rect Tools
  if (toolStore.activeTool === 'line' || toolStore.activeTool === 'rect') {
    toolStore.isMouseDown = true
    toolStore.dragStartCell = gridCoord
    lastDrawnCell.value = { col: gridCoord.col, row: gridCoord.row }
  }
}

function handleMouseDown(e: MouseEvent) {
  isCtrlPressed.value = e.ctrlKey || e.metaKey
  isShiftPressed.value = e.shiftKey
  const target = e.target as HTMLElement
  if (target && target.tagName !== 'CANVAS') return
  if (e.button === 2) {
    handleContextMenu()
    return
  }
  if (e.button === 1 || camera.isSpacePressed.value || toolStore.activeTool === 'pan') {
    camera.startPan(e.clientX, e.clientY)
    return
  }
  if (mapStore.activeLayer?.locked) return
  const rect = camera.getViewportRect(viewportContainerRef.value)
  const { gridCoord } = engine.screenPointToGrid(e.clientX, e.clientY, rect, mapStore.project)
  lastDrawnCell.value = { col: gridCoord.col, row: gridCoord.row }

  // Custom Route Drawing & Point Selection/Relocation Dragging
  if (characterStore.isDrawingRoute) {
    const wpList = characterStore.drawingWaypoints
    const clickedWpIdx = wpList.findIndex(p => p.col === gridCoord.col && p.row === gridCoord.row)
    
    if (clickedWpIdx !== -1) {
      if (characterStore.selectedWaypointIndex === clickedWpIdx) {
        isDraggingWaypoint.value = true
        draggedWaypointIndex.value = clickedWpIdx
      } else {
        characterStore.selectWaypoint(clickedWpIdx)
        isDraggingWaypoint.value = true
        draggedWaypointIndex.value = clickedWpIdx
      }
      engine.renderCharacter(characterStore, mapStore.project)
      return
    }

    if (characterStore.selectedWaypointIndex !== null) {
      characterStore.moveSelectedWaypoint(gridCoord)
      engine.renderCharacter(characterStore, mapStore.project)
      return
    }

    characterStore.addWaypoint(gridCoord)
    engine.renderCharacter(characterStore, mapStore.project)
    return
  }

  executeCellClick(gridCoord, false, e)
}

function handleMouseMove(e: MouseEvent) {
  isCtrlPressed.value = e.ctrlKey || e.metaKey
  isShiftPressed.value = e.shiftKey
  if (camera.isPanning.value) {
    camera.updatePan(e.clientX, e.clientY)
    return
  }
  const rect = camera.getViewportRect(viewportContainerRef.value)
  const { gridCoord } = engine.screenPointToGrid(e.clientX, e.clientY, rect, mapStore.project)
  toolStore.setHoveredCell(gridCoord)

  if (characterStore.isDrawingRoute && isDraggingWaypoint.value && draggedWaypointIndex.value !== null) {
    const idx = draggedWaypointIndex.value
    if (idx >= 0 && idx < characterStore.drawingWaypoints.length) {
      const current = characterStore.drawingWaypoints[idx]
      if (current.col !== gridCoord.col || current.row !== gridCoord.row) {
        characterStore.setWaypointPosition(idx, gridCoord)
        engine.renderCharacter(characterStore, mapStore.project)
      }
    }
    return
  }

  if (toolStore.isMouseDown && toolStore.dragStartCell) {
    const isSameAsLast = lastDrawnCell.value && lastDrawnCell.value.col === gridCoord.col && lastDrawnCell.value.row === gridCoord.row

    if (toolStore.activeTool === 'brush' && assetStore.selectedAssetId) {
      if (!isSameAsLast && isInsideGrid(gridCoord.col, gridCoord.row, mapStore.project.cols, mapStore.project.rows)) {
        lastDrawnCell.value = { col: gridCoord.col, row: gridCoord.row }
        const isCtrl = e.ctrlKey || e.metaKey || isCtrlPressed.value
        const isShift = e.shiftKey || isShiftPressed.value
        const mode = isCtrl ? 'replace' : (isShift ? 'stack' : (toolStore.placementMode === 'replace' ? 'replace' : 'stack'))
        mapStore.setTile(gridCoord.col, gridCoord.row, assetStore.selectedAssetId, mode)
      }
    } else if (toolStore.activeTool === 'eraser') {
      if (!isSameAsLast && isInsideGrid(gridCoord.col, gridCoord.row, mapStore.project.cols, mapStore.project.rows)) {
        lastDrawnCell.value = { col: gridCoord.col, row: gridCoord.row }
        mapStore.removeTile(gridCoord.col, gridCoord.row)
      }
    } else if (toolStore.activeTool === 'line') {
      toolStore.previewCells = getBresenhamLine(toolStore.dragStartCell.col, toolStore.dragStartCell.row, gridCoord.col, gridCoord.row)
    } else if (toolStore.activeTool === 'rect') {
      toolStore.previewCells = getRectangleCells(toolStore.dragStartCell.col, toolStore.dragStartCell.row, gridCoord.col, gridCoord.row)
    }
  }
}

function handleMouseUp(e?: MouseEvent) {
  if (e) {
    isCtrlPressed.value = e.ctrlKey || e.metaKey
    isShiftPressed.value = e.shiftKey
  }
  if (camera.isPanning.value) camera.endPan()

  if (isDraggingWaypoint.value) {
    isDraggingWaypoint.value = false
    draggedWaypointIndex.value = null
    characterStore.commitRouteState()
    engine.renderCharacter(characterStore, mapStore.project)
    return
  }

  if (toolStore.isMouseDown && toolStore.dragStartCell && assetStore.selectedAssetId) {
    if (toolStore.previewCells.length > 0) {
      const isCtrl = (e && (e.ctrlKey || e.metaKey)) || isCtrlPressed.value
      const isShift = (e && e.shiftKey) || isShiftPressed.value
      const mode = isCtrl ? 'replace' : (isShift ? 'stack' : (toolStore.placementMode === 'replace' ? 'replace' : 'stack'))
      mapStore.fillTiles(toolStore.previewCells, assetStore.selectedAssetId, mapStore.activeLayerId, mode)
      toolStore.previewCells = []
    }
  }
  toolStore.isMouseDown = false
  toolStore.dragStartCell = null
  lastDrawnCell.value = null
}

function handleMouseLeave() {
  if (camera.isPanning.value) camera.endPan()
  toolStore.setHoveredCell(null)
  toolStore.isMouseDown = false
  lastDrawnCell.value = null
}

function handleWheel(e: WheelEvent) {
  camera.handleWheel(e, viewportContainerRef.value)
}

function handleContextMenu() {
  if (characterStore.isDrawingRoute) {
    if (characterStore.selectedWaypointIndex !== null) {
      characterStore.selectedWaypointIndex = null
      engine.renderCharacter(characterStore, mapStore.project)
      return
    }
  }
  if (characterStore.selectedDoorIndex !== null) {
    characterStore.selectedDoorIndex = null
    engine.renderCharacter(characterStore, mapStore.project)
    return
  }
  if (characterStore.isSettingSpawnPoint) {
    characterStore.isSettingSpawnPoint = false
    return
  }
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
  toolStore.previewCells = []
  toolStore.isMouseDown = false
}

// --- Touch Handling ---
function handleTouchStart(e: TouchEvent) {
  const target = e.target as HTMLElement
  if (target && target.tagName !== 'CANVAS') return
  camera.handleTouchStart(e, viewportContainerRef.value)
}

function handleTouchMove(e: TouchEvent) {
  const target = e.target as HTMLElement
  if (target && target.tagName !== 'CANVAS') return
  camera.handleTouchMove(e, viewportContainerRef.value)
}

function handleTouchEnd(e: TouchEvent) {
  camera.handleTouchEnd(e, (clientX, clientY) => {
    const rect = camera.getViewportRect(viewportContainerRef.value)
    const { gridCoord } = engine.screenPointToGrid(clientX, clientY, rect, mapStore.project)
    executeCellClick(gridCoord, false)
  })
}

function handleTouchCancel() {
  camera.touchState.value.isTouch = false
  camera.touchState.value.mode = 'none'
}

// --- Drag & Drop ---
function handleDragOver(e: DragEvent) { 
  isDraggingOver.value = true
  isCtrlPressed.value = e.ctrlKey || e.metaKey
  isShiftPressed.value = e.shiftKey
}
function handleDragLeave() { isDraggingOver.value = false }
function handleCanvasDrop(e: DragEvent) {
  isDraggingOver.value = false
  const assetId = e.dataTransfer?.getData('text/plain')
  if (!assetId) return
  const rect = camera.getViewportRect(viewportContainerRef.value)
  const { gridCoord } = engine.screenPointToGrid(e.clientX, e.clientY, rect, mapStore.project)
  if (isInsideGrid(gridCoord.col, gridCoord.row, mapStore.project.cols, mapStore.project.rows)) {
    const isCtrl = e.ctrlKey || e.metaKey || isCtrlPressed.value
    const isShift = e.shiftKey || isShiftPressed.value
    const existingDirect = mapStore.getCellItems(gridCoord.col, gridCoord.row)

    if (isCtrl) {
      mapStore.setTile(gridCoord.col, gridCoord.row, assetId, 'replace')
    } else if (isShift) {
      mapStore.setTile(gridCoord.col, gridCoord.row, assetId, 'stack')
    } else if (existingDirect.length > 0 && toolStore.placementMode === 'ask') {
      toolStore.placementConflict = {
        col: gridCoord.col,
        row: gridCoord.row,
        assetId,
      }
    } else {
      mapStore.setTile(gridCoord.col, gridCoord.row, assetId, toolStore.placementMode === 'replace' ? 'replace' : 'stack')
    }
  }
}

// --- Hotkeys ---
function handleKeyDown(e: KeyboardEvent) {
  isCtrlPressed.value = e.ctrlKey || e.metaKey
  isShiftPressed.value = e.shiftKey
  if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return
  if (e.code === 'Space') camera.isSpacePressed.value = true

  // Route & Map Undo (Ctrl+Z) / Redo (Ctrl+Y / Ctrl+Shift+Z)
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault()
    if (e.shiftKey) {
      if (characterStore.isDrawingRoute) {
        characterStore.redoRoute()
        engine.renderCharacter(characterStore, mapStore.project)
      } else {
        mapStore.redo()
      }
    } else {
      if (characterStore.isDrawingRoute) {
        characterStore.undoRoute()
        engine.renderCharacter(characterStore, mapStore.project)
      } else {
        mapStore.undo()
      }
    }
    return
  }

  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
    e.preventDefault()
    if (characterStore.isDrawingRoute) {
      characterStore.redoRoute()
      engine.renderCharacter(characterStore, mapStore.project)
    } else {
      mapStore.redo()
    }
    return
  }

  if (e.key === 'Escape') {
    if (characterStore.isDrawingRoute && characterStore.selectedWaypointIndex !== null) {
      characterStore.selectedWaypointIndex = null
      engine.renderCharacter(characterStore, mapStore.project)
      return
    }
  }

  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (characterStore.isDrawingRoute && characterStore.selectedWaypointIndex !== null) {
      characterStore.deleteSelectedWaypoint()
      engine.renderCharacter(characterStore, mapStore.project)
      return
    }
    if (toolStore.selectedElement) {
      mapStore.removeTileItem(toolStore.selectedElement.col, toolStore.selectedElement.row, toolStore.selectedElement.itemId, toolStore.selectedElement.layerId)
      toolStore.setSelectedElement(null)
    }
  }
}

function handleKeyUp(e: KeyboardEvent) {
  isCtrlPressed.value = e.ctrlKey || e.metaKey
  isShiftPressed.value = e.shiftKey
  if (e.code === 'Space') camera.isSpacePressed.value = false
}

defineExpose({
  focusOnCell: (col: number, row: number) => camera.focusOnCell(col, row, viewportContainerRef.value),
  focusOnCenter: () => camera.focusOnCenter(viewportContainerRef.value),
  exportPng: (options: { includeGrid?: boolean; transparentBg?: boolean }) => engine.exportImage({
    includeGrid: options?.includeGrid,
    transparentBg: options?.transparentBg,
    project: mapStore.project,
    assetMap: getAssetMap()
  }),
  exportImage: (options: { includeGrid?: boolean; transparentBg?: boolean }) => engine.exportImage({
    includeGrid: options?.includeGrid,
    transparentBg: options?.transparentBg,
    project: mapStore.project,
    assetMap: getAssetMap()
  })
})
</script>
