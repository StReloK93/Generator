import { ref, Ref } from 'vue'
import { MapProject } from '../types/map'
import { IsoEngine } from '../engine/IsoEngine'
import { gridToScreen } from '../utils/isometric'

export interface TouchGestureState {
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
}

/**
 * The map camera: pan, zoom, pinch. `bounded` (the game) keeps it on the map: the point under the screen's centre
 * never leaves the map, and it never zooms out further than the whole map in view.
 */
export function usePixiCamera(engine: IsoEngine, projectRef: Ref<MapProject>, options: { bounded?: boolean } = {}) {
  const localZoom = ref(1.0)
  const localPanX = ref(0)
  const localPanY = ref(0)

  const isPanning = ref(false)
  const isSpacePressed = ref(false)
  const panStart = { x: 0, y: 0 }
  const panOrigin = { x: 0, y: 0 }
  let isLocalDragging = false

  let cachedViewportRect: DOMRect | null = null

  const touchState = ref<TouchGestureState>({
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
    moved: false
  })

  /** The furthest the camera may zoom out: the whole map in view (bounded), or a fixed floor */
  function minZoom(): number {
    if (!options.bounded) return 0.15
    const project = projectRef.value
    const rect = cachedViewportRect ?? { width: window.innerWidth, height: window.innerHeight }
    const mapWidth = (project.cols + project.rows) * (project.tileWidth / 2)
    const mapHeight = (project.cols + project.rows) * (project.tileHeight / 2)
    return Math.max(0.15, Math.min(4.0, Math.min(rect.width / mapWidth, rect.height / mapHeight) * 0.9))
  }

  /** Bounded: pull the point under the screen's centre back onto the map */
  function keepOnMap(): void {
    if (!options.bounded) return
    const project = projectRef.value
    const rect = cachedViewportRect ?? { width: window.innerWidth, height: window.innerHeight }
    const halfW = project.tileWidth / 2
    const halfH = project.tileHeight / 2
    const zoom = localZoom.value
    const worldX = (rect.width / 2 - localPanX.value) / zoom
    const worldY = (rect.height / 2 - localPanY.value) / zoom
    // Screen to cell space, clamp to the map, back to the screen
    const col = Math.max(0, Math.min(project.cols - 1, (worldX / halfW + worldY / halfH) / 2))
    const row = Math.max(0, Math.min(project.rows - 1, (worldY / halfH - worldX / halfW) / 2))
    localPanX.value = rect.width / 2 - (col - row) * halfW * zoom
    localPanY.value = rect.height / 2 - (col + row) * halfH * zoom
  }

  /** Hand the camera to the renderer (kept on the map first, when bounded) */
  function apply(): void {
    keepOnMap()
    engine.setTransform(localZoom.value, { x: localPanX.value, y: localPanY.value })
  }

  function updateViewportRect(containerEl: HTMLElement | null) {
    if (containerEl) {
      cachedViewportRect = containerEl.getBoundingClientRect()
    }
  }

  function getViewportRect(containerEl: HTMLElement | null): DOMRect {
    if (!cachedViewportRect && containerEl) {
      cachedViewportRect = containerEl.getBoundingClientRect()
    }
    return cachedViewportRect || new DOMRect(0, 0, window.innerWidth, window.innerHeight)
  }

  function focusOnCenter(containerEl: HTMLElement | null) {
    const project = projectRef.value
    const midCol = (project.cols - 1) / 2
    const midRow = (project.rows - 1) / 2
    focusOnCell(midCol, midRow, containerEl)
  }

  function focusOnCell(col: number, row: number, containerEl: HTMLElement | null) {
    if (!containerEl) return
    updateViewportRect(containerEl)
    const rect = getViewportRect(containerEl)
    const project = projectRef.value
    const pt = gridToScreen(col, row, project.tileWidth, project.tileHeight)

    localPanX.value = rect.width / 2 - pt.x * localZoom.value
    localPanY.value = rect.height / 2 - pt.y * localZoom.value

    apply()
  }

  function centerMap(containerEl: HTMLElement | null) {
    if (!containerEl) return
    updateViewportRect(containerEl)
    const rect = getViewportRect(containerEl)
    const project = projectRef.value
    const pan = engine.centerMap(project, rect.width, rect.height, localZoom.value)
    localPanX.value = pan.x
    localPanY.value = pan.y
    apply()
  }

  function zoomIn(containerEl?: HTMLElement | null) {
    const nextZoom = Math.min(4.0, localZoom.value + 0.15)
    setZoomLevel(nextZoom, containerEl)
  }

  function zoomOut(containerEl?: HTMLElement | null) {
    const nextZoom = Math.max(minZoom(), localZoom.value - 0.15)
    setZoomLevel(nextZoom, containerEl)
  }

  function setZoomLevel(newZoom: number, containerEl?: HTMLElement | null) {
    const rect = containerEl ? getViewportRect(containerEl) : { width: window.innerWidth, height: window.innerHeight }
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    const currentZoom = localZoom.value
    const clampedZoom = Math.max(minZoom(), Math.min(4.0, Number(newZoom.toFixed(2))))

    localPanX.value = centerX - (centerX - localPanX.value) * (clampedZoom / currentZoom)
    localPanY.value = centerY - (centerY - localPanY.value) * (clampedZoom / currentZoom)
    localZoom.value = clampedZoom

    apply()
  }

  function handleWheel(e: WheelEvent, containerEl: HTMLElement | null) {
    const rect = getViewportRect(containerEl)
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89
    const newZoom = Math.max(minZoom(), Math.min(4.0, localZoom.value * zoomFactor))

    localPanX.value = mouseX - (mouseX - localPanX.value) * (newZoom / localZoom.value)
    localPanY.value = mouseY - (mouseY - localPanY.value) * (newZoom / localZoom.value)
    localZoom.value = Number(newZoom.toFixed(2))

    apply()
  }

  function startPan(clientX: number, clientY: number) {
    isPanning.value = true
    isLocalDragging = true
    panStart.x = clientX
    panStart.y = clientY
    panOrigin.x = localPanX.value
    panOrigin.y = localPanY.value
  }

  function updatePan(clientX: number, clientY: number) {
    if (!isPanning.value) return
    const dx = clientX - panStart.x
    const dy = clientY - panStart.y
    localPanX.value = panOrigin.x + dx
    localPanY.value = panOrigin.y + dy
    apply()
  }

  function endPan() {
    isPanning.value = false
    isLocalDragging = false
  }

  // --- Touch gestures: the caller passes the fingers that belong to the camera (one = tap / pan, two = pinch) ---
  function getTouchDistance(t1: Touch, t2: Touch): number {
    return Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY)
  }

  function getTouchMidpoint(t1: Touch, t2: Touch): { x: number; y: number } {
    return {
      x: (t1.clientX + t2.clientX) / 2,
      y: (t1.clientY + t2.clientY) / 2
    }
  }

  function handleTouchStart(touches: Touch[], containerEl: HTMLElement | null) {
    updateViewportRect(containerEl)

    if (touches.length === 1) {
      const t = touches[0]
      touchState.value = {
        isTouch: true,
        mode: 'tap_pending',
        startX: t.clientX,
        startY: t.clientY,
        startTime: performance.now(),
        startPanX: localPanX.value,
        startPanY: localPanY.value,
        startZoom: localZoom.value,
        initialDistance: 0,
        initialMidX: 0,
        initialMidY: 0,
        moved: false
      }
      isLocalDragging = false
    } else if (touches.length === 2) {
      const t1 = touches[0]
      const t2 = touches[1]
      const dist = getTouchDistance(t1, t2)
      const mid = getTouchMidpoint(t1, t2)

      touchState.value = {
        isTouch: true,
        mode: 'pinch',
        startX: mid.x,
        startY: mid.y,
        startTime: performance.now(),
        startPanX: localPanX.value,
        startPanY: localPanY.value,
        startZoom: localZoom.value,
        initialDistance: dist,
        initialMidX: mid.x,
        initialMidY: mid.y,
        moved: true
      }
      isLocalDragging = true
    }
  }

  function handleTouchMove(touches: Touch[], containerEl: HTMLElement | null) {
    if (touches.length === 2) {
      const t1 = touches[0]
      const t2 = touches[1]
      const curDist = getTouchDistance(t1, t2)
      const curMid = getTouchMidpoint(t1, t2)

      if (touchState.value.initialDistance > 10) {
        const scaleChange = curDist / touchState.value.initialDistance
        const targetZoom = Math.max(minZoom(), Math.min(4.0, touchState.value.startZoom * scaleChange))

        const rect = getViewportRect(containerEl)
        const focalX = touchState.value.initialMidX - rect.left
        const focalY = touchState.value.initialMidY - rect.top

        localZoom.value = targetZoom
        localPanX.value = focalX - (focalX - touchState.value.startPanX) * (targetZoom / touchState.value.startZoom) + (curMid.x - touchState.value.initialMidX)
        localPanY.value = focalY - (focalY - touchState.value.startPanY) * (targetZoom / touchState.value.startZoom) + (curMid.y - touchState.value.initialMidY)

        apply()
      }
      return
    }

    if (touches.length === 1) {
      const t = touches[0]
      const dx = t.clientX - touchState.value.startX
      const dy = t.clientY - touchState.value.startY

      if (!touchState.value.moved && Math.hypot(dx, dy) > 8) {
        touchState.value.moved = true
        touchState.value.mode = 'pan'
        isLocalDragging = true
      }

      if (touchState.value.moved) {
        localPanX.value = touchState.value.startPanX + dx
        localPanY.value = touchState.value.startPanY + dy
        apply()
      }
    }
  }

  /** remaining: the camera's fingers still on the screen */
  function handleTouchEnd(remaining: Touch[], onSingleTap?: (clientX: number, clientY: number) => void) {
    if (remaining.length === 0) {
      const elapsed = performance.now() - touchState.value.startTime

      if (!touchState.value.moved && touchState.value.mode === 'tap_pending' && elapsed < 450) {
        onSingleTap?.(touchState.value.startX, touchState.value.startY)
      }

      isLocalDragging = false
      touchState.value.mode = 'none'
      touchState.value.isTouch = false
    } else if (remaining.length === 1) {
      const t = remaining[0]
      touchState.value.startX = t.clientX
      touchState.value.startY = t.clientY
      touchState.value.startPanX = localPanX.value
      touchState.value.startPanY = localPanY.value
      touchState.value.mode = 'pan'
    }
  }

  return {
    localZoom,
    localPanX,
    localPanY,
    isPanning,
    isSpacePressed,
    touchState,
    updateViewportRect,
    getViewportRect,
    focusOnCenter,
    focusOnCell,
    centerMap,
    zoomIn,
    zoomOut,
    setZoomLevel,
    handleWheel,
    startPan,
    updatePan,
    endPan,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    isDragging: () => isLocalDragging,
  }
}
