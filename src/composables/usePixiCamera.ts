import { ref, Ref } from 'vue'
import { Point2D, GridCoord, MapProject } from '../types/map'
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
  lastTapTime: number
  lastTapPos: { x: number; y: number }
}

export function usePixiCamera(engine: IsoEngine, projectRef: Ref<MapProject>) {
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
    moved: false,
    lastTapTime: 0,
    lastTapPos: { x: 0, y: 0 }
  })

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
    const centerCol = Math.floor(project.cols / 2)
    const centerRow = Math.floor(project.rows / 2)
    focusOnCell(centerCol, centerRow, containerEl)
  }

  function focusOnCell(col: number, row: number, containerEl: HTMLElement | null) {
    if (!containerEl) return
    updateViewportRect(containerEl)
    const rect = getViewportRect(containerEl)
    const project = projectRef.value
    const pt = gridToScreen(col, row, project.tileWidth, project.tileHeight)

    localPanX.value = rect.width / 2 - pt.x * localZoom.value
    localPanY.value = rect.height / 2 - pt.y * localZoom.value

    engine.setTransform(localZoom.value, { x: localPanX.value, y: localPanY.value })
  }

  function centerMap(containerEl: HTMLElement | null) {
    if (!containerEl) return
    updateViewportRect(containerEl)
    const rect = getViewportRect(containerEl)
    const project = projectRef.value
    const pan = engine.centerMap(project, rect.width, rect.height, localZoom.value)
    localPanX.value = pan.x
    localPanY.value = pan.y
    engine.setTransform(localZoom.value, { x: localPanX.value, y: localPanY.value })
  }

  function zoomIn(containerEl?: HTMLElement | null) {
    const nextZoom = Math.min(4.0, localZoom.value + 0.15)
    setZoomLevel(nextZoom, containerEl)
  }

  function zoomOut(containerEl?: HTMLElement | null) {
    const nextZoom = Math.max(0.15, localZoom.value - 0.15)
    setZoomLevel(nextZoom, containerEl)
  }

  function setZoomLevel(newZoom: number, containerEl?: HTMLElement | null) {
    const rect = containerEl ? getViewportRect(containerEl) : { width: window.innerWidth, height: window.innerHeight }
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    const currentZoom = localZoom.value
    const clampedZoom = Math.max(0.15, Math.min(4.0, Number(newZoom.toFixed(2))))

    localPanX.value = centerX - (centerX - localPanX.value) * (clampedZoom / currentZoom)
    localPanY.value = centerY - (centerY - localPanY.value) * (clampedZoom / currentZoom)
    localZoom.value = clampedZoom

    engine.setTransform(localZoom.value, { x: localPanX.value, y: localPanY.value })
  }

  function handleWheel(e: WheelEvent, containerEl: HTMLElement | null) {
    const rect = getViewportRect(containerEl)
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89
    const newZoom = Math.max(0.15, Math.min(4.0, localZoom.value * zoomFactor))

    localPanX.value = mouseX - (mouseX - localPanX.value) * (newZoom / localZoom.value)
    localPanY.value = mouseY - (mouseY - localPanY.value) * (newZoom / localZoom.value)
    localZoom.value = Number(newZoom.toFixed(2))

    engine.setTransform(localZoom.value, { x: localPanX.value, y: localPanY.value })
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
    engine.setPan(localPanX.value, localPanY.value)
  }

  function endPan() {
    isPanning.value = false
    isLocalDragging = false
  }

  // --- Touch Gesture Utilities ---
  function getTouchDistance(t1: Touch, t2: Touch): number {
    return Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY)
  }

  function getTouchMidpoint(t1: Touch, t2: Touch): { x: number; y: number } {
    return {
      x: (t1.clientX + t2.clientX) / 2,
      y: (t1.clientY + t2.clientY) / 2
    }
  }

  function handleTouchStart(e: TouchEvent, containerEl: HTMLElement | null) {
    updateViewportRect(containerEl)

    if (e.touches.length === 1) {
      const t = e.touches[0]
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
        startPanX: localPanX.value,
        startPanY: localPanY.value,
        startZoom: localZoom.value,
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

  function handleTouchMove(e: TouchEvent, containerEl: HTMLElement | null) {
    if (e.touches.length === 2) {
      const t1 = e.touches[0]
      const t2 = e.touches[1]
      const curDist = getTouchDistance(t1, t2)
      const curMid = getTouchMidpoint(t1, t2)

      if (touchState.value.initialDistance > 10) {
        const scaleChange = curDist / touchState.value.initialDistance
        const targetZoom = Math.max(0.15, Math.min(4.0, touchState.value.startZoom * scaleChange))

        const rect = getViewportRect(containerEl)
        const focalX = touchState.value.initialMidX - rect.left
        const focalY = touchState.value.initialMidY - rect.top

        localZoom.value = targetZoom
        localPanX.value = focalX - (focalX - touchState.value.startPanX) * (targetZoom / touchState.value.startZoom) + (curMid.x - touchState.value.initialMidX)
        localPanY.value = focalY - (focalY - touchState.value.startPanY) * (targetZoom / touchState.value.startZoom) + (curMid.y - touchState.value.initialMidY)

        engine.setTransform(localZoom.value, { x: localPanX.value, y: localPanY.value })
      }
      return
    }

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
        localPanX.value = touchState.value.startPanX + dx
        localPanY.value = touchState.value.startPanY + dy
        engine.setPan(localPanX.value, localPanY.value)
      }
    }
  }

  function handleTouchEnd(e: TouchEvent, onSingleTap?: (clientX: number, clientY: number) => void) {
    if (e.touches.length === 0) {
      const now = performance.now()
      const elapsed = now - touchState.value.startTime

      if (!touchState.value.moved && touchState.value.mode === 'tap_pending' && elapsed < 450) {
        if (onSingleTap) {
          onSingleTap(touchState.value.startX, touchState.value.startY)
        }

        const distFromLastTap = Math.hypot(
          touchState.value.startX - touchState.value.lastTapPos.x,
          touchState.value.startY - touchState.value.lastTapPos.y
        )
        if (now - touchState.value.lastTapTime < 350 && distFromLastTap < 30) {
          zoomIn()
          touchState.value.lastTapTime = 0
        } else {
          touchState.value.lastTapTime = now
          touchState.value.lastTapPos = { x: touchState.value.startX, y: touchState.value.startY }
        }
      }

      isLocalDragging = false
      touchState.value.mode = 'none'
      touchState.value.isTouch = false
    } else if (e.touches.length === 1) {
      const t = e.touches[0]
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
  }
}
