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
    <!-- Floating Mobile Zoom & Map Navigation Widget (Right side) -->
    <div class="absolute right-3.5 top-16 z-20 flex flex-col gap-2 pointer-events-none select-none">
      <div 
        class="glass-panel p-1.5 rounded-2xl border border-slate-700/80 shadow-2xl backdrop-blur-xl bg-slate-900/90 flex flex-col gap-1.5 pointer-events-auto items-center"
        @mousedown.stop @mouseup.stop @click.stop @touchstart.stop @touchend.stop @touchmove.stop
      >
        <!-- Zoom In -->
        <button 
          @click="camera.zoomIn(viewportContainerRef)"
          class="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-sm text-sm font-bold active:scale-95"
          title="Kattalashtirish (+)"
        >
          <Plus class="w-4 h-4" />
        </button>

        <!-- Current Zoom Percentage -->
        <div class="py-0.5 text-center font-mono text-[9px] text-slate-400 font-semibold select-none leading-none">
          {{ Math.round(camera.localZoom.value * 100) }}%
        </div>

        <!-- Zoom Out -->
        <button 
          @click="camera.zoomOut(viewportContainerRef)"
          class="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-sm text-sm font-bold active:scale-95"
          title="Kichiklashtirish (-)"
        >
          <Minus class="w-4 h-4" />
        </button>

        <div class="h-px w-6 bg-slate-800 my-0.5"></div>

        <!-- Center Map View -->
        <button 
          @click="camera.focusOnCenter(viewportContainerRef)"
          class="w-8 h-8 rounded-xl bg-slate-800 hover:bg-emerald-900/60 text-emerald-400 hover:text-emerald-300 flex items-center justify-center transition-all cursor-pointer shadow-sm active:scale-95"
          title="Xaritani markazga qaytarish"
        >
          <Crosshair class="w-4 h-4" />
        </button>
      </div>
    </div>
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
  
  characterStore.setLoadingProgress(10, "Izometrik dvijok va grafik kesh tayyorlanmoqda...")
  await engine.init(viewportContainerRef.value, rect.width, rect.height)

  // Fast PixiJS 8 Asset Bundle Loading (Core + Game bundles)
  characterStore.setLoadingProgress(30, "Personajlar va minora modellari yuklanmoqda...")
  await assetManager.loadGame((prog) => {
    const p = 30 + Math.round(prog * 50)
    characterStore.setLoadingProgress(p, `O'yin teksturalari yuklanmoqda (${Math.round(prog * 100)}%)...`)
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
    const placed = towerStore.placeTowerAt(gridCoord.col, gridCoord.row)
    if (placed && multiplayerStore.roomId) {
      multiplayerStore.broadcastTowerBuild(placed)
    }
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
