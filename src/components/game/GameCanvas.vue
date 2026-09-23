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
import { ref, onMounted, onUnmounted, toRef, watch } from 'vue'
import { useMapStore } from '../../stores/mapStore'
import { useToolStore } from '../../stores/toolStore'
import { useAssetStore } from '../../stores/assetStore'
import { useCharacterStore } from '../../stores/characterStore'
import { useTowerStore } from '../../stores/towerStore'
import { useMultiplayerStore } from '../../stores/multiplayerStore'
import { useNotificationStore } from '../../stores/notificationStore'
import { useI18n } from '../../stores/i18nStore'
import { IsoEngine } from '../../engine/IsoEngine'
import { usePixiCamera } from '../../composables/usePixiCamera'
import {  AssetItem } from '../../types/map'
import { assetManager } from '../../services/assetManager'
import { GameController } from '../../controllers/game/GameController'

const mapStore = useMapStore()
const toolStore = useToolStore()
const assetStore = useAssetStore()
const characterStore = useCharacterStore()
const towerStore = useTowerStore()
const multiplayerStore = useMultiplayerStore()
const notify = useNotificationStore()
const { t } = useI18n()

const viewportContainerRef = ref<HTMLElement | null>(null)
const engine = new IsoEngine()
const camera = usePixiCamera(engine, toRef(mapStore, 'project'))
const gameController = new GameController({
  engine,
  mapStore,
  toolStore,
  towerStore,
  characterStore,
  multiplayerStore,
  notify,
  t,
})

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
  engine.syncWater(mapStore.project)
  engine.renderGrid(
    mapStore.project,
    false, // No grid overlay in game mode for clean cinematic look
    0.3,
    false,
    false,
    false
  )
  engine.buildableOverlayGraphics.clear()
}

const emit = defineEmits<{
  (e: 'ready'): void
}>()

onMounted(async () => {
  if (!viewportContainerRef.value) return
  camera.updateViewportRect(viewportContainerRef.value)
  const rect = camera.getViewportRect(viewportContainerRef.value)
  
  characterStore.setLoadingProgress(15, t('loader.initShaders'))
  await engine.init(viewportContainerRef.value, rect.width, rect.height)
  await new Promise(resolve => setTimeout(resolve, 150))

  // Fast PixiJS 8 Asset Bundle Loading (Core + Game bundles)
  characterStore.setLoadingProgress(50, t('loader.loadTexturesModels'))
  await assetManager.loadGame()

  // Focus on player's build base / camera start point
  let targetCol = Math.floor((mapStore.project.cols - 1) / 2)
  let targetRow = Math.floor((mapStore.project.rows - 1) / 2)

  if (multiplayerStore.roomId && multiplayerStore.mySlot) {
    if (multiplayerStore.mySlot.playerCol !== undefined && multiplayerStore.mySlot.playerRow !== undefined) {
      targetCol = multiplayerStore.mySlot.playerCol
      targetRow = multiplayerStore.mySlot.playerRow
    } else if (multiplayerStore.mySlot.spawnCol !== undefined && multiplayerStore.mySlot.spawnRow !== undefined) {
      targetCol = multiplayerStore.mySlot.spawnCol
      targetRow = multiplayerStore.mySlot.spawnRow
    }
  } else {
    // Singleplayer / Test mode: prioritize camera / player base point
    const activeDoor = characterStore.selectedDoor || characterStore.detectedDoors[0]
    if (activeDoor && activeDoor.playerCol !== undefined && activeDoor.playerRow !== undefined) {
      targetCol = activeDoor.playerCol
      targetRow = activeDoor.playerRow
    } else {
      const savedSpawn = mapStore.project.spawnPoints?.find((s: any) => s.playerCol !== undefined && s.playerRow !== undefined)
      if (savedSpawn && savedSpawn.playerCol !== undefined && savedSpawn.playerRow !== undefined) {
        targetCol = savedSpawn.playerCol
        targetRow = savedSpawn.playerRow
      }
    }
  }

  camera.focusOnCell(targetCol, targetRow, viewportContainerRef.value)
  updateEngineState()

  characterStore.setLoadingProgress(85, t('loader.syncLayersGrid'))
  await new Promise(resolve => setTimeout(resolve, 150))

  // Render initial frame to eliminate initial WebGL pipeline compile hiccups
  if (engine.app?.renderer) {
    try {
      engine.app.renderer.render(engine.app.stage)
    } catch (e) {
      console.warn('Initial render frame:', e)
    }
  }

  // Hook up 60 FPS Game Simulation Ticker via GameController
  gameController.setupSimulationLoop()

  characterStore.setLoadingProgress(100, t('loader.battlefieldReady'))
  // Double requestAnimationFrame ensures that GPU has completed drawing the frame buffer
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  await new Promise(resolve => setTimeout(resolve, 250))

  characterStore.finishLoadingScreen()
  emit('ready')

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
  try {
    if (cleanListeners) {
      cleanListeners()
      cleanListeners = null
    }

    if (resizeObserver) {
      resizeObserver.disconnect()
      resizeObserver = null
    }
    gameController.destroy()
    engine.clearCombatVisuals()
    engine.clearCharacterVisuals()
    if (engine.buildableOverlayGraphics && !engine.buildableOverlayGraphics.destroyed) {
      engine.buildableOverlayGraphics.clear()
    }
    engine.destroy()
  } catch (err) {
    console.warn('[GameCanvas] onUnmounted caught error:', err)
  }
})

// --- Game Cell Tap / Click Handling via GameController ---
watch(() => towerStore.activeBuildTowerId, (newId) => {
  if (!newId) {
    gameController.resetBuildState()
  }
})

function handleMouseDown(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (target && target.tagName !== 'CANVAS') return

  // Prevent synthetic mouse event right after touch
  if (Date.now() - gameController.lastTouchTimestamp < 450) {
    return
  }

  if (e.button === 2) {
    gameController.handleContextMenu()
    return
  }

  if (e.button === 1 || camera.isSpacePressed.value || (!towerStore.activeBuildTowerId && e.button === 0 && e.shiftKey)) {
    camera.startPan(e.clientX, e.clientY)
    return
  }

  if (!viewportContainerRef.value || !engine.renderer?.isInitialized) return
  const rect = camera.getViewportRect(viewportContainerRef.value)
  const { gridCoord } = engine.screenPointToGrid(e.clientX, e.clientY, rect, mapStore.project)
  gameController.handleCellClick(gridCoord)
}

function handleMouseMove(e: MouseEvent) {
  if (camera.isPanning.value) {
    camera.updatePan(e.clientX, e.clientY)
    return
  }
  if (!viewportContainerRef.value || !engine.renderer?.isInitialized) return
  const rect = camera.getViewportRect(viewportContainerRef.value)
  const { gridCoord } = engine.screenPointToGrid(e.clientX, e.clientY, rect, mapStore.project)
  gameController.handlePointerMove(gridCoord)
}

function handleMouseUp() {
  if (camera.isPanning.value) camera.endPan()
}

function handleMouseLeave() {
  if (camera.isPanning.value) camera.endPan()
  gameController.handlePointerLeave()
}

function handleWheel(e: WheelEvent) {
  camera.handleWheel(e, viewportContainerRef.value)
}

function handleContextMenu() {
  gameController.handleContextMenu()
}

// --- Touch Handling ---
function handleTouchStart(e: TouchEvent) {
  gameController.lastTouchTimestamp = Date.now()
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
  gameController.lastTouchTimestamp = Date.now()
  camera.handleTouchEnd(
    e,
    (clientX, clientY) => {
      const rect = camera.getViewportRect(viewportContainerRef.value)
      const { gridCoord } = engine.screenPointToGrid(clientX, clientY, rect, mapStore.project)
      gameController.handleCellClick(gridCoord)
    },
    !!towerStore.activeBuildTowerId
  )
}

function handleTouchCancel() {
  camera.touchState.value.isTouch = false
  camera.touchState.value.mode = 'none'
}
</script>
