<template>
  <div 
    ref="viewportContainerRef"
    class="relative flex-1 h-full w-full bg-dark-950 overflow-hidden cursor-crosshair select-none"
    :class="{
      '!cursor-grab': toolStore.activeTool === 'pan' && !isPanning,
      '!cursor-grabbing': isPanning,
      '!cursor-cell': toolStore.activeTool === 'picker',
      '!cursor-pointer': !assetStore.selectedAssetId || toolStore.activeTool === 'select',
      '!cursor-move': toolStore.isMovingElement,
      '!cursor-not-allowed': mapStore.activeLayer?.locked
    }"
    @mousedown="handleMouseDown"
    @mousemove="handleMouseMove"
    @mouseup="handleMouseUp"
    @mouseleave="handleMouseLeave"
    @wheel.prevent="handleWheel"
    @dragover.prevent="handleDragOver"
    @dragleave.prevent="handleDragLeave"
    @drop.prevent="handleCanvasDrop"
    @contextmenu.prevent="handleContextMenu"
  >
    <!-- Element Inspector (When an element is selected in Select mode) -->
    <ElementInspector v-if="!characterStore.isGameMode" />

    <!-- Character Control Bar (Patrol / Tour Route Planner HUD) -->
    <CharacterControlBar v-if="!characterStore.isGameMode" />

    <!-- Tower Defense Bar (Towers & Waves Configurator) -->
    <TowerDefenseBar v-if="!characterStore.isGameMode" />

    <!-- Playable Game Mode HUD (Lives, Gold, Shop, Waves) -->
    <GamePlayHUD />

    <!-- Custom Tower Blueprint Creator Modal -->
    <TowerCreateModal />

    <!-- Top Help / Quick Guide Notification Banner -->
    <div 
      v-if="showGuide && !characterStore.isGameMode" 
      class="absolute top-4 left-1/2 -translate-x-1/2 z-20 glass-panel px-4 py-2 rounded-2xl border border-brand-500/40 shadow-2xl flex items-center gap-3 text-xs animate-in fade-in slide-in-from-top-2 duration-300 max-w-xl text-slate-200"
    >
      <div class="w-6 h-6 rounded-lg bg-brand-500/20 text-brand-400 flex items-center justify-center shrink-0">
        <Sparkles class="w-3.5 h-3.5" />
      </div>
      <div class="flex-1 leading-snug">
        <strong>Hotkeys:</strong> 
        <kbd class="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px]">Delete</kbd> — O'chirish | 
        <kbd class="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[10px]">Ctrl+Click</kbd> — Ketma-ket qo'yish | 
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

    <!-- Floating Bottom HUD info -->
    <div 
      v-if="!characterStore.isGameMode"
      class="absolute bottom-4 left-102 z-10 hidden md:flex items-center gap-2 pointer-events-none"
      @mousedown.stop
      @mouseup.stop
      @click.stop
      @pointerdown.stop
    >
      <!-- Grid Coordinates Badge -->
      <div class="glass-panel px-3 py-1.5 rounded-xl text-xs font-mono flex items-center gap-2 border border-slate-800/80 shadow-lg text-slate-300">
        <span class="text-slate-500">Kursor:</span>
        <span v-if="toolStore.hoveredCell" class="text-brand-400 font-semibold">
          X: {{ toolStore.hoveredCell.col }}, Y: {{ toolStore.hoveredCell.row }}
        </span>
        <span v-else class="text-slate-600">---</span>
      </div>

      <!-- Active Layer Badge -->
      <div class="glass-panel px-3 py-1.5 rounded-xl text-xs flex items-center gap-2 border border-slate-800/80 shadow-lg text-slate-300 pointer-events-auto">
        <span class="text-slate-500">Qatlam:</span>
        <span class="font-medium text-emerald-400 truncate max-w-[120px]">
          {{ mapStore.activeLayer?.name || 'Qatlam' }}
        </span>
        <span v-if="mapStore.activeLayer?.locked" class="text-amber-400 text-[10px] font-bold uppercase">(Qulflangan)</span>
      </div>

      <!-- Center Origin / Symmetry Focus Button -->
      <button 
        @click="focusOnCenter"
        @mousedown.stop
        @mouseup.stop
        @click.stop
        @pointerdown.stop
        class="glass-panel hover:bg-emerald-950/50 hover:border-emerald-500/50 px-2.5 py-1.5 rounded-xl text-emerald-400 border border-slate-800/80 shadow-lg pointer-events-auto transition-all flex items-center gap-1.5 text-xs font-semibold"
        title="Xarita markaziga (Center Origin) borish"
      >
        <span>🎯 Markaz</span>
      </button>

      <!-- Center Map / Reset Camera Button -->
      <button 
        @click="centerView"
        @mousedown.stop
        @mouseup.stop
        @click.stop
        @pointerdown.stop
        class="glass-panel hover:bg-slate-800 p-2 rounded-xl text-slate-400 hover:text-slate-200 border border-slate-800/80 shadow-lg pointer-events-auto transition-colors"
        title="Xaritani umumiy ko'rinishga qaytarish"
      >
        <Crosshair class="w-4 h-4" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { Crosshair, Sparkles, X, PlusCircle } from 'lucide-vue-next'
import { IsoEngine } from '../engine/IsoEngine'
import { useMapStore } from '../stores/mapStore'
import { useToolStore } from '../stores/toolStore'
import { useAssetStore } from '../stores/assetStore'
import { GridCoord, AssetItem } from '../types/map'
import ElementInspector from './ElementInspector.vue'
import CharacterControlBar from './CharacterControlBar.vue'
import TowerDefenseBar from './TowerDefenseBar.vue'
import PlacementPromptModal from './PlacementPromptModal.vue'
import GamePlayHUD from './GamePlayHUD.vue'
import TowerCreateModal from './TowerCreateModal.vue'
import { useCharacterStore } from '../stores/characterStore'
import { useTowerStore } from '../stores/towerStore'
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

// PixiJS Engine instance
const engine = new IsoEngine()

// Help guide state
const showGuide = ref(true)
const isDraggingOver = ref(false)

// Pan state
const isPanning = ref(false)
const panStart = ref({ x: 0, y: 0 })
const panOrigin = ref({ x: 0, y: 0 })
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
  const rect = viewportContainerRef.value.getBoundingClientRect()
  const pan = engine.centerMap(mapStore.project, rect.width, rect.height)
  toolStore.pan = pan
  engine.setTransform(toolStore.zoom, pan)
}

function focusOnCell(col: number, row: number) {
  if (!viewportContainerRef.value) return
  const rect = viewportContainerRef.value.getBoundingClientRect()
  const pt = gridToScreen(col, row, mapStore.project.tileWidth, mapStore.project.tileHeight)

  const panX = rect.width / 2 - pt.x * toolStore.zoom
  const panY = rect.height / 2 - pt.y * toolStore.zoom

  toolStore.pan = { x: Math.round(panX), y: Math.round(panY) }
  engine.setTransform(toolStore.zoom, toolStore.pan)
}

onMounted(async () => {
  if (!viewportContainerRef.value) return

  const rect = viewportContainerRef.value.getBoundingClientRect()
  await engine.init(viewportContainerRef.value, rect.width, rect.height)

  for (const asset of assetStore.assets) {
    engine.preloadAsset(asset)
  }

  // Hook up character and tower defense combat update ticker loop
  engine.onTick = (rawDeltaSec: number) => {
    const simSpeed = Math.max(0.1, Math.min(50.0, characterStore.gameSpeed || 1.0))
    const effectiveDelta = rawDeltaSec * simSpeed
    characterStore.updateTick(effectiveDelta)
    towerStore.updateCombatTick(effectiveDelta)
    engine.renderCharacter(characterStore, mapStore.project)
    engine.renderTowersAndCombat(towerStore, mapStore.project, characterStore, toolStore.hoveredCell)
  }

  // Restore towers from project and detect doors
  towerStore.restoreFromProject()
  characterStore.detectDoors()
  if (characterStore.detectedDoors.length > 0) {
    characterStore.spawnAtDoor(0)
  }

  centerView()
  updateEngineState()

  window.addEventListener('resize', handleResize)
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
  engine.destroy()
})

function handleResize() {
  if (!viewportContainerRef.value) return
  const rect = viewportContainerRef.value.getBoundingClientRect()
  engine.resize(rect.width, rect.height)
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

function focusOnCenter() {
  const centerCol = Math.floor(mapStore.project.cols / 2)
  const centerRow = Math.floor(mapStore.project.rows / 2)
  focusOnCell(centerCol, centerRow)
}

// Watchers
watch(
  () => [mapStore.project.layers, mapStore.project.updatedAt],
  () => {
    updateEngineState()
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
  () => updateEngineState()
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

watch(
  () => [
    toolStore.hoveredCell, 
    toolStore.previewCells, 
    toolStore.activeTool, 
    toolStore.selectedElement,
    assetStore.selectedAssetId
  ],
  () => updateEngineState()
)

watch(
  () => [toolStore.zoom, toolStore.pan],
  () => {
    engine.setTransform(toolStore.zoom, toolStore.pan)
  },
  { deep: true }
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
    panStart.value = { x: e.clientX, y: e.clientY }
    panOrigin.value = { ...toolStore.pan }
    return
  }

  if (mapStore.activeLayer?.locked) return

  const rect = viewportContainerRef.value.getBoundingClientRect()
  const { gridCoord } = engine.screenPointToGrid(e.clientX, e.clientY, rect, mapStore.project)

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
    if (!e.ctrlKey && !e.metaKey) {
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

  // 2. If NO ASSET IS ACTIVE (or in Select Mode): SELECT TOWER OR MAP ELEMENT
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
      if (toolStore.placementMode === 'ask' && !e.ctrlKey && !e.metaKey) {
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

    // If Ctrl is NOT pressed: place once and RELEASE the asset immediately!
    // If Ctrl IS pressed: keep the asset active for continuous placement!
    if (!e.ctrlKey && !e.metaKey) {
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

    if (!e.ctrlKey && !e.metaKey) {
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

function handleMouseMove(e: MouseEvent) {
  if (!viewportContainerRef.value) return

  const target = e.target as HTMLElement
  if (target && target.tagName !== 'CANVAS' && !isPanning.value && !toolStore.isMouseDown) {
    toolStore.setHoveredCell(null)
    return
  }

  if (isPanning.value) {
    const dx = e.clientX - panStart.value.x
    const dy = e.clientY - panStart.value.y
    toolStore.pan = {
      x: Math.round(panOrigin.value.x + dx),
      y: Math.round(panOrigin.value.y + dy),
    }
    return
  }

  const rect = viewportContainerRef.value.getBoundingClientRect()
  const { gridCoord } = engine.screenPointToGrid(e.clientX, e.clientY, rect, mapStore.project)

  if (isInsideGrid(gridCoord.col, gridCoord.row, mapStore.project.cols, mapStore.project.rows)) {
    toolStore.setHoveredCell(gridCoord)
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
    if (assetStore.selectedAssetId && (e.ctrlKey || e.metaKey)) {
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
  isPanning.value = false
}

function handleWheel(e: WheelEvent) {
  if (!viewportContainerRef.value) return

  const rect = viewportContainerRef.value.getBoundingClientRect()
  const mouseX = e.clientX - rect.left
  const mouseY = e.clientY - rect.top

  const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87
  const oldZoom = toolStore.zoom
  const newZoom = Math.max(0.15, Math.min(4.0, oldZoom * zoomFactor))

  if (oldZoom === newZoom) return

  const panX = mouseX - (mouseX - toolStore.pan.x) * (newZoom / oldZoom)
  const panY = mouseY - (mouseY - toolStore.pan.y) * (newZoom / oldZoom)

  toolStore.zoom = Number(newZoom.toFixed(2))
  toolStore.pan = { x: Math.round(panX), y: Math.round(panY) }
}

function handleDragOver(e: DragEvent) {
  isDraggingOver.value = true
  if (!viewportContainerRef.value) return
  const rect = viewportContainerRef.value.getBoundingClientRect()
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
  focusOnCell,
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
