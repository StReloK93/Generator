<template>
  <div 
    ref="viewportContainerRef"
    class="relative flex-1 h-full w-full bg-dark-950 overflow-hidden cursor-crosshair select-none canvas-touch-container"
    :class="{
      'cursor-grab!': !camera.isPanning.value && !towerStore.activeBuildTowerId,
      'cursor-grabbing!': camera.isPanning.value,
      'cursor-cell!': towerStore.activeBuildTowerId
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
    @contextmenu.prevent="handleContextMenu"
  >
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, toRef } from 'vue'
import { Plus, Minus, Crosshair } from 'lucide-vue-next'
import { useMapStore } from '../../stores/mapStore'
import { useToolStore } from '../../stores/toolStore'
import { useAssetStore } from '../../stores/assetStore'
import { useCharacterStore } from '../../stores/characterStore'
import { useTowerStore } from '../../stores/towerStore'
import { useMultiplayerStore } from '../../stores/multiplayerStore'
import { IsoEngine } from '../../engine/IsoEngine'
import { usePixiCamera } from '../../composables/usePixiCamera'
import { GridCoord, AssetItem } from '../../types/map'
import { isInsideGrid } from '../../utils/isometric'
import { assetManager } from '../../services/assetManager'

const mapStore = useMapStore()
const toolStore = useToolStore()
const assetStore = useAssetStore()
const characterStore = useCharacterStore()
const towerStore = useTowerStore()
const multiplayerStore = useMultiplayerStore()

const viewportContainerRef = ref<HTMLElement | null>(null)
const engine = new IsoEngine()
const camera = usePixiCamera(engine, toRef(mapStore, 'project'))

let resizeObserver: ResizeObserver | null = null
let cleanListeners: (() => void) | null = null

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
    false, // No grid overlay in game mode for clean cinematic look
    0.3,
    false,
    false,
    false
  )
}

onMounted(async () => {
  if (!viewportContainerRef.value) return
  camera.updateViewportRect(viewportContainerRef.value)
  const rect = camera.getViewportRect(viewportContainerRef.value)
  
  characterStore.setLoadingProgress(10, "Initializing isometric engine and graphics cache...")
  await engine.init(viewportContainerRef.value, rect.width, rect.height)

  // Fast PixiJS 8 Asset Bundle Loading (Core + Game bundles)
  characterStore.setLoadingProgress(30, "Loading character and tower models...")
  await assetManager.loadGame((prog) => {
    const p = 30 + Math.round(prog * 50)
    characterStore.setLoadingProgress(p, `Loading game textures (${Math.round(prog * 100)}%)...`)
  })

  // Ensure asset store manifest is ready
  await assetStore.loadBuiltinSprites()

  // Restore placed towers from map
  towerStore.restoreFromProject()
  characterStore.detectDoors()

  // Hook up 60 FPS Game Simulation Ticker
  engine.onTick = (rawDeltaSec: number) => {
    characterStore.fps = engine.currentFps
    const simSpeed = Math.max(0.1, Math.min(50.0, characterStore.gameSpeed || 1.0))
    const effectiveDelta = rawDeltaSec * simSpeed

    if (!multiplayerStore.roomId || multiplayerStore.isHost) {
      characterStore.updateTick(effectiveDelta)
      towerStore.updateCombatTick(effectiveDelta)

      if (multiplayerStore.roomId && multiplayerStore.isHost) {
        multiplayerStore.broadcastGameTick()
      }
    } else {
      characterStore.updateClientInterpolation(rawDeltaSec)
    }

    engine.renderCharacter(characterStore, mapStore.project)
    engine.renderTowersAndCombat(towerStore, mapStore.project, characterStore, toolStore.hoveredCell)
    engine.renderTeammateHovers(multiplayerStore.teammateHovers, mapStore.project)
  }

  camera.focusOnCenter(viewportContainerRef.value)
  updateEngineState()

  function onZoomIn() {
    camera.zoomIn(viewportContainerRef.value)
  }
  function onZoomOut() {
    camera.zoomOut(viewportContainerRef.value)
  }
  function onFocusCenter() {
    camera.focusOnCenter(viewportContainerRef.value)
  }

  window.addEventListener('game-zoom-in', onZoomIn)
  window.addEventListener('game-zoom-out', onZoomOut)
  window.addEventListener('game-focus-center', onFocusCenter)

  cleanListeners = () => {
    window.removeEventListener('game-zoom-in', onZoomIn)
    window.removeEventListener('game-zoom-out', onZoomOut)
    window.removeEventListener('game-focus-center', onFocusCenter)
  }

  // Automatic canvas resize on window or container size change
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
})

onUnmounted(() => {
  if (cleanListeners) {
    cleanListeners()
    cleanListeners = null
  }

  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  engine.stopTicker()
  engine.clearCombatVisuals()
  engine.clearCharacterVisuals()
  engine.destroy()
})

// --- Game Cell Tap / Click Handling ---
function handleGameCellClick(gridCoord: GridCoord) {
  if (!isInsideGrid(gridCoord.col, gridCoord.row, mapStore.project.cols, mapStore.project.rows)) {
    towerStore.selectPlacedTower(null)
    return
  }

  // 1. If building a tower from shop
  if (towerStore.activeBuildTowerId) {
    towerStore.placeTowerAt(gridCoord.col, gridCoord.row)
    towerStore.selectBuildTower(null)
    return
  }

  // 2. Check if a placed tower exists on this cell
  const clickedTower = towerStore.placedTowers.find(t => t.col === gridCoord.col && t.row === gridCoord.row)
  if (clickedTower) {
    towerStore.selectPlacedTower(clickedTower.id)
  } else {
    towerStore.selectPlacedTower(null)
  }
}

function handleMouseDown(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (target && target.tagName !== 'CANVAS') return

  if (e.button === 2) {
    handleContextMenu()
    return
  }

  if (e.button === 1 || camera.isSpacePressed.value || (!towerStore.activeBuildTowerId && e.button === 0 && e.shiftKey)) {
    camera.startPan(e.clientX, e.clientY)
    return
  }

  const rect = camera.getViewportRect(viewportContainerRef.value)
  const { gridCoord } = engine.screenPointToGrid(e.clientX, e.clientY, rect, mapStore.project)
  handleGameCellClick(gridCoord)
}

function handleMouseMove(e: MouseEvent) {
  if (camera.isPanning.value) {
    camera.updatePan(e.clientX, e.clientY)
    return
  }
  const rect = camera.getViewportRect(viewportContainerRef.value)
  const { gridCoord } = engine.screenPointToGrid(e.clientX, e.clientY, rect, mapStore.project)
  toolStore.setHoveredCell(gridCoord)

  if (multiplayerStore.roomId && isInsideGrid(gridCoord.col, gridCoord.row, mapStore.project.cols, mapStore.project.rows)) {
    multiplayerStore.broadcastTeammateHover(gridCoord.col, gridCoord.row)
  }
}

function handleMouseUp() {
  if (camera.isPanning.value) camera.endPan()
}

function handleMouseLeave() {
  if (camera.isPanning.value) camera.endPan()
  toolStore.setHoveredCell(null)
}

function handleWheel(e: WheelEvent) {
  camera.handleWheel(e, viewportContainerRef.value)
}

function handleContextMenu() {
  if (towerStore.activeBuildTowerId) {
    towerStore.selectBuildTower(null)
    return
  }
  if (towerStore.selectedPlacedTowerId) {
    towerStore.selectPlacedTower(null)
  }
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
    handleGameCellClick(gridCoord)
  })
}

function handleTouchCancel() {
  camera.touchState.value.isTouch = false
  camera.touchState.value.mode = 'none'
}
</script>
