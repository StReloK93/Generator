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
import type { GridCoord } from '../../types/map'
import { useMapStore } from '../../stores/mapStore'
import { useToolStore } from '../../stores/toolStore'
import { useAssetStore } from '../../stores/assetStore'
import { useCharacterStore } from '../../stores/characterStore'
import { useRouteStore } from '../../stores/routeStore'
import { useGameStore } from '../../stores/gameStore'
import { useTowerStore } from '../../stores/towerStore'
import { useMultiplayerStore } from '../../stores/multiplayerStore'
import { useNotificationStore } from '../../stores/notificationStore'
import { useI18n } from '../../stores/i18nStore'
import { useHideSeekStore } from '../../stores/hideSeekStore'
import { IsoEngine } from '../../engine/IsoEngine'
import { usePixiCamera } from '../../composables/usePixiCamera'
import {  AssetItem } from '../../types/map'
import { assetManager } from '../../services/assetManager'
import { GameController } from '../../controllers/game/GameController'
import { getMapMode, isMazeMode } from '../../domain/map'

const mapStore = useMapStore()
const toolStore = useToolStore()
const assetStore = useAssetStore()
const characterStore = useCharacterStore()
const routeStore = useRouteStore()
const gameStore = useGameStore()
const towerStore = useTowerStore()
const multiplayerStore = useMultiplayerStore()
const notify = useNotificationStore()
const hideSeekStore = useHideSeekStore()
const { t } = useI18n()

const viewportContainerRef = ref<HTMLElement | null>(null)
const engine = new IsoEngine()
// The game keeps the camera on the map
const camera = usePixiCamera(engine, toRef(mapStore, 'project'), { bounded: true })
const gameController = new GameController({
  engine,
  mapStore,
  toolStore,
  towerStore,
  characterStore,
  routeStore,
  gameStore,
  multiplayerStore,
  notify,
  t,
  followCamera: (col, row) => camera.focusOnCell(col, row, viewportContainerRef.value),
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
  engine.setBackground(mapStore.project.bgColor || '#090d16')
  // The world around the map (woods fading into the background); a maze stays in its darkness
  engine.renderer.map.surroundDepth = isMazeMode(getMapMode(mapStore.project)) ? 0 : 10
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
  try {
    if (engine.buildableOverlayGraphics && !engine.buildableOverlayGraphics.destroyed) {
      engine.buildableOverlayGraphics.clear()
    }
  } catch {
    // Ignored
  }
}

const emit = defineEmits<{
  (e: 'ready'): void
}>()

onMounted(async () => {
  if (!viewportContainerRef.value) return
  camera.updateViewportRect(viewportContainerRef.value)
  const rect = camera.getViewportRect(viewportContainerRef.value)
  
  gameStore.setLoadingProgress(15, t('loader.initShaders'))
  await engine.init(viewportContainerRef.value, rect.width, rect.height)
  await new Promise(resolve => setTimeout(resolve, 150))

  // Fast PixiJS 8 Asset Bundle Loading (Core + Game + Props + Sprites)
  gameStore.setLoadingProgress(50, t('loader.loadTexturesModels'))
  if (!assetStore.isLoaded || assetStore.assets.length === 0) {
    await assetStore.loadBuiltinSprites()
  }
  await assetManager.loadGame()
  try {
    await assetManager.loadBundle('props')
  } catch (e) {
    console.warn('[GameCanvas] Props bundle preload:', e)
  }

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
    const activeRoute = routeStore.selectedRoute || routeStore.routes[0]
    const camPt = activeRoute?.playerCameraPoint
    if (camPt) {
      targetCol = camPt.col
      targetRow = camPt.row
    } else {
      const savedRoute = mapStore.project.routes?.find((s: any) => s.playerCameraPoint)
      if (savedRoute?.playerCameraPoint) {
        targetCol = savedRoute.playerCameraPoint.col ?? targetCol
        targetRow = savedRoute.playerCameraPoint.row ?? targetRow
      }
    }
  }

  camera.focusOnCell(targetCol, targetRow, viewportContainerRef.value)
  updateEngineState()

  gameStore.setLoadingProgress(85, t('loader.syncLayersGrid'))
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

  gameStore.setLoadingProgress(100, t('loader.battlefieldReady'))
  // Double requestAnimationFrame ensures that GPU has completed drawing the frame buffer
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  await new Promise(resolve => setTimeout(resolve, 250))

  gameStore.finishLoadingScreen()
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

// Hide & seek: every round can bring a new labyrinth
watch(() => [assetStore.isLoaded, assetManager.atlasRevision.value, hideSeekStore.mazeRevision], () => {
  if (engine.isInitialized) {
    updateEngineState()
  }
})

onUnmounted(() => {
  releaseLead()
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

  // Shift is "sneak" in hide & seek, so it must not start a camera pan there
  const shiftPans = e.shiftKey && !isMazeMode(getMapMode(mapStore.project))
  if (e.button === 1 || camera.isSpacePressed.value || (!towerStore.activeBuildTowerId && e.button === 0 && shiftPans)) {
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

function gridAt(clientX: number, clientY: number): GridCoord {
  const rect = camera.getViewportRect(viewportContainerRef.value)
  return engine.screenPointToGrid(clientX, clientY, rect, mapStore.project).gridCoord
}

/** A touch tap on the map (hide & seek: the hero runs there) */
function cellClickAt(clientX: number, clientY: number) {
  gameController.handleCellClick(gridAt(clientX, clientY))
}

/** A tap that landed on an overlay over the map (the hide & seek joystick zone) */
defineExpose({ tapAt: cellClickAt })

// Hide & seek on a touch screen: the hero runs the moment a finger lands. A finger kept still on the map this long
// sneaks (slow and silent) until it lifts, and a finger sliding over the map leads the hero after it.
const HOLD_TO_SNEAK_MS = 220
/** A finger this far from where it landed is steering, not holding */
const HOLD_SLOP_PX = 12
/** The finger leading the hero (null: none, or two fingers zooming) */
let leadFinger: { id: number; x: number; y: number; cell: GridCoord } | null = null
let sneakTimer: ReturnType<typeof setTimeout> | null = null

function releaseLead() {
  if (sneakTimer) clearTimeout(sneakTimer)
  sneakTimer = null
  if (leadFinger) hideSeekStore.setSneakHeld(false)
  leadFinger = null
}

function handleTouchStart(e: TouchEvent) {
  gameController.lastTouchTimestamp = Date.now()
  const target = e.target as HTMLElement
  if (target && target.tagName !== 'CANVAS') return
  camera.handleTouchStart(Array.from(e.targetTouches), viewportContainerRef.value)
  if (!isMazeMode(getMapMode(mapStore.project))) return
  releaseLead()
  if (e.targetTouches.length !== 1) return
  const t = e.targetTouches[0]
  leadFinger = { id: t.identifier, x: t.clientX, y: t.clientY, cell: gridAt(t.clientX, t.clientY) }
  cellClickAt(t.clientX, t.clientY)
  sneakTimer = setTimeout(() => {
    sneakTimer = null
    hideSeekStore.setSneakHeld(true)
  }, HOLD_TO_SNEAK_MS)
}

function handleTouchMove(e: TouchEvent) {
  const target = e.target as HTMLElement
  if (target && target.tagName !== 'CANVAS') return
  const t = leadFinger && Array.from(e.targetTouches).find(touch => touch.identifier === leadFinger?.id)
  if (!leadFinger || !t) {
    camera.handleTouchMove(Array.from(e.targetTouches), viewportContainerRef.value)
    return
  }
  // Slid off quickly: it steers at a run; once sneaking, it keeps sneaking while it steers
  if (sneakTimer && Math.hypot(t.clientX - leadFinger.x, t.clientY - leadFinger.y) > HOLD_SLOP_PX) {
    clearTimeout(sneakTimer)
    sneakTimer = null
  }
  const cell = gridAt(t.clientX, t.clientY)
  if (cell.col === leadFinger.cell.col && cell.row === leadFinger.cell.row) return
  leadFinger.cell = cell
  hideSeekStore.steerTo(cell.col, cell.row)
}

function handleTouchEnd(e: TouchEvent) {
  gameController.lastTouchTimestamp = Date.now()
  const remaining = Array.from(e.targetTouches)
  if (isMazeMode(getMapMode(mapStore.project))) {
    // The hero already ran off when the finger landed: lifting it only ends the sneak
    if (!remaining.some(touch => touch.identifier === leadFinger?.id)) releaseLead()
    camera.handleTouchEnd(remaining)
    return
  }
  camera.handleTouchEnd(remaining, cellClickAt)
}

function handleTouchCancel() {
  releaseLead()
  camera.touchState.value.isTouch = false
  camera.touchState.value.mode = 'none'
}
</script>
