import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { GridCoord, RouteInfo } from '../types/map'
import { useMapStore } from './mapStore'
import { useToolStore } from './toolStore'
import { expandWaypointsToPath } from '../utils/isometric'
import { RouteManager } from '../domain/pathfinding'

export const useRouteStore = defineStore('routeStore', () => {
  const mapStore = useMapStore()
  const toolStore = useToolStore()

  // --- ROUTE STATE (Authoritative routes array containing routePoints & playerCameraPoint) ---
  const routes = ref<RouteInfo[]>([])
  const selectedRouteIndex = ref<number | null>(null)
  const routeCache = ref<Record<number, GridCoord[]>>({})

  // Route editor interaction flags
  const isDrawingRoute = ref(false)
  const drawingWaypoints = ref<GridCoord[]>([])
  const drawingPath = computed<GridCoord[]>(() => expandWaypointsToPath(drawingWaypoints.value))
  const selectedWaypointIndex = ref<number | null>(null)
  const routeUndoStack = ref<GridCoord[][]>([])
  const routeRedoStack = ref<GridCoord[][]>([])

  const isSettingRouteStart = ref(false)
  const routeStartPlacementMode = ref<'add' | 'relocate'>('add')
  const isSettingPlayerStartPoint = ref(false)
  const showPathTrail = ref(true)
  const showSpawnPoints = ref(true)

  // Status message for route actions
  const statusMessage = ref('Waiting at spawn point')

  // --- COMPUTEDS ---
  const selectedRoute = computed<RouteInfo | null>(() => {
    if (routes.value.length === 0 || selectedRouteIndex.value === null || selectedRouteIndex.value < 0) return null
    const idx = Math.max(0, Math.min(routes.value.length - 1, selectedRouteIndex.value))
    return routes.value[idx] || null
  })

  const currentActiveRoute = computed<GridCoord[]>(() => {
    if (isDrawingRoute.value) {
      return drawingPath.value
    }
    if (selectedRouteIndex.value !== null && selectedRouteIndex.value >= 0) {
      return getRouteForIndex(selectedRouteIndex.value)
    }
    return routes.value.length > 0 ? getRouteForIndex(0) : []
  })

  const customRoutes = computed<Record<string, GridCoord[]>>(() => {
    const res: Record<string, GridCoord[]> = {}
    routes.value.forEach((r, idx) => {
      const key = r.id || `route-${idx}`
      if (Array.isArray(r.routePoints) && r.routePoints.length > 0) {
        res[key] = expandWaypointsToPath(r.routePoints)
      }
    })
    return res
  })

  const canUndoRoute = computed(() => routeUndoStack.value.length > 1)
  const canRedoRoute = computed(() => routeRedoStack.value.length > 0)

  const blockedBuildingCellsSet = computed<Set<string>>(() => {
    return RouteManager.computeBlockedCells(customRoutes.value)
  })

  function isCellBlockedForBuilding(col: number, row: number): boolean {
    return blockedBuildingCellsSet.value.has(`${col},${row}`)
  }

  // --- SYNCHRONIZATION ---
  function syncRoutesFromProject(): RouteInfo[] {
    const p = mapStore.project as any
    const rawRoutes = p.routes || []

    if (Array.isArray(rawRoutes) && rawRoutes.length > 0) {
      routes.value = rawRoutes.map((s: any, idx: number) => {
        let routePoints: GridCoord[] | undefined = Array.isArray(s.routePoints) && s.routePoints.length > 0
          ? s.routePoints.map((pt: any) => ({ col: Number(pt.col), row: Number(pt.row) }))
          : undefined

        if (!routePoints) {
          const key = s.id || `route-${idx}`
          const legacyWps = p.customWaypoints?.[key] || p.customRoutes?.[key]
          if (Array.isArray(legacyWps) && legacyWps.length > 0) {
            routePoints = legacyWps.map((pt: any) => ({ col: Number(pt.col), row: Number(pt.row) }))
          } else {
            const c = s.col !== undefined ? s.col : (s.spawnCol ?? 2)
            const r = s.row !== undefined ? s.row : (s.spawnRow ?? 2)
            routePoints = [{ col: Number(c), row: Number(r) }]
          }
        }

        let playerCameraPoint = s.playerCameraPoint
        if (!playerCameraPoint && (s.playerCol !== undefined && s.playerRow !== undefined)) {
          playerCameraPoint = { col: Number(s.playerCol), row: Number(s.playerRow) }
        }

        const startPt = routePoints && routePoints.length > 0 ? routePoints[0] : { col: 2, row: 2 }

        return {
          id: s.id || `route-${idx + 1}`,
          name: s.name ? s.name.replace(/\s*\(\d+,\s*\d+\)/g, '').trim() : `Route ${idx + 1}`,
          routePoints: routePoints || [startPt],
          playerCameraPoint: playerCameraPoint ? { col: Number(playerCameraPoint.col), row: Number(playerCameraPoint.row) } : undefined,
        }
      })
    } else if (p.customWaypoints && Object.keys(p.customWaypoints).length > 0) {
      routes.value = Object.entries(p.customWaypoints as Record<string, GridCoord[]>).map(([k, wps], idx) => {
        const startPt = Array.isArray(wps) && wps.length > 0 ? wps[0] : { col: 2, row: 2 }
        return {
          id: k,
          name: `Route ${idx + 1}`,
          routePoints: Array.isArray(wps) ? wps : [startPt],
        }
      })
    } else {
      routes.value = []
    }

    if (selectedRouteIndex.value !== null && (selectedRouteIndex.value >= routes.value.length || selectedRouteIndex.value < 0)) {
      selectedRouteIndex.value = routes.value.length > 0 ? 0 : null
    }

    routeCache.value = {}
    return routes.value
  }

  function syncRoutesToProject() {
    mapStore.project.routes = routes.value.map(r => ({
      id: r.id,
      name: r.name,
      routePoints: [...(r.routePoints || [{ col: 2, row: 2 }])],
      playerCameraPoint: r.playerCameraPoint ? { ...r.playerCameraPoint } : undefined,
    }))
  }

  // --- ROUTE CRUD ---
  function addRoute(col: number, row: number, customName?: string): RouteInfo {
    const routeIndex = routes.value.length
    const routeId = `route-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const newPoint: RouteInfo = {
      id: routeId,
      name: customName || `Route ${routeIndex + 1}`,
      routePoints: [{ col, row }],
      playerCameraPoint: { col, row },
    }

    routes.value.push(newPoint)
    selectedRouteIndex.value = routes.value.length - 1
    syncRoutesToProject()
    routeCache.value = {}
    mapStore.pushHistory(`Added route (${col}, ${row})`)
    return newPoint
  }

  function relocateCurrentRouteStart(col: number, row: number) {
    if (routes.value.length === 0) {
      addRoute(col, row)
      return
    }
    const idx = (selectedRouteIndex.value !== null && selectedRouteIndex.value >= 0) 
      ? Math.min(routes.value.length - 1, selectedRouteIndex.value) 
      : 0
    const r = routes.value[idx]
    if (r) {
      if (r.routePoints && r.routePoints.length > 0) {
        r.routePoints[0] = { col, row }
      } else {
        r.routePoints = [{ col, row }]
      }
      syncRoutesToProject()
      routeCache.value = {}
      mapStore.pushHistory(`Relocated route start to (${col}, ${row})`)
    }
  }

  function setPlayerStartPoint(routeIdx: number, col: number, row: number) {
    if (routeIdx < 0 || routeIdx >= routes.value.length) return
    const r = routes.value[routeIdx]
    if (r) {
      r.playerCameraPoint = { col, row }
      syncRoutesToProject()
      mapStore.pushHistory(`Set Player ${routeIdx + 1} camera point to (${col}, ${row})`)
    }
  }

  function relocateCurrentPlayerStartPoint(col: number, row: number) {
    const idx = (selectedRouteIndex.value !== null && selectedRouteIndex.value >= 0) 
      ? Math.min(routes.value.length - 1, selectedRouteIndex.value) 
      : 0
    setPlayerStartPoint(idx, col, row)
  }

  function clearPlayerStartPoint(routeIdx?: number) {
    const idx = routeIdx !== undefined
      ? routeIdx
      : (selectedRouteIndex.value !== null && selectedRouteIndex.value >= 0 ? selectedRouteIndex.value : 0)
    if (idx < 0 || idx >= routes.value.length) return
    const r = routes.value[idx]
    if (r) {
      delete r.playerCameraPoint
      syncRoutesToProject()
      mapStore.pushHistory(`Cleared Player ${idx + 1} camera point`)
    }
  }

  function removeRoute(idx: number) {
    if (idx < 0 || idx >= routes.value.length) return
    const removed = routes.value.splice(idx, 1)[0]
    if (selectedRouteIndex.value !== null) {
      if (routes.value.length === 0) {
        selectedRouteIndex.value = null
      } else if (selectedRouteIndex.value >= routes.value.length) {
        selectedRouteIndex.value = routes.value.length - 1
      }
    }
    routeCache.value = {}
    syncRoutesToProject()
    mapStore.pushHistory(`Removed route ${removed?.name || ''}`)
  }

  function deleteCurrentRoute() {
    const idx = selectedRouteIndex.value ?? 0
    if (idx >= 0 && idx < routes.value.length) {
      removeRoute(idx)
    }
  }

  function getRouteForIndex(routeIdx: number): GridCoord[] {
    if (routes.value.length === 0) return [{ col: 2, row: 2 }]
    const r = routes.value[routeIdx] || routes.value[0]
    if (!r) return [{ col: 2, row: 2 }]
    if (r.routePoints && r.routePoints.length > 0) {
      return expandWaypointsToPath(r.routePoints)
    }
    return [{ col: 2, row: 2 }]
  }

  // --- CUSTOM ROUTE DRAWING ACTIONS ---
  function pushRouteState() {
    routeUndoStack.value.push(JSON.parse(JSON.stringify(drawingWaypoints.value)))
    if (routeUndoStack.value.length > 50) {
      routeUndoStack.value.shift()
    }
    routeRedoStack.value = []
  }

  function startDrawingCustomRoute(targetRouteIndex?: number) {
    isDrawingRoute.value = true
    selectedWaypointIndex.value = null
    routeUndoStack.value = []
    routeRedoStack.value = []
    toolStore.setTool('select')

    if (typeof targetRouteIndex === 'number' && targetRouteIndex >= 0 && targetRouteIndex < routes.value.length) {
      selectedRouteIndex.value = targetRouteIndex
    } else if (selectedRouteIndex.value === null || selectedRouteIndex.value < 0 || selectedRouteIndex.value >= routes.value.length) {
      selectedRouteIndex.value = routes.value.length > 0 ? 0 : null
    }

    const currentRoute = selectedRoute.value
    const idx = selectedRouteIndex.value ?? 0
    const startPt = currentRoute && currentRoute.routePoints && currentRoute.routePoints.length > 0
      ? currentRoute.routePoints[0]
      : { col: 2, row: 2 }

    if (currentRoute && currentRoute.routePoints && currentRoute.routePoints.length > 0) {
      drawingWaypoints.value = JSON.parse(JSON.stringify(currentRoute.routePoints))
    } else {
      drawingWaypoints.value = [startPt]
    }
    
    routeUndoStack.value = [JSON.parse(JSON.stringify(drawingWaypoints.value))]
    statusMessage.value = `Drawing route for ${currentRoute?.name || `Route ${idx + 1}`}. Click map to add points.`
  }

  function selectWaypoint(index: number | null) {
    if (index === null || index === selectedWaypointIndex.value) {
      selectedWaypointIndex.value = null
    } else if (index >= 0 && index < drawingWaypoints.value.length) {
      selectedWaypointIndex.value = index
      const pt = drawingWaypoints.value[index]
      statusMessage.value = `Point #${index + 1} (${pt.col}, ${pt.row}) selected. Click any cell to relocate it.`
    }
  }

  function moveSelectedWaypoint(coord: GridCoord) {
    if (selectedWaypointIndex.value === null) return
    const idx = selectedWaypointIndex.value
    if (idx >= 0 && idx < drawingWaypoints.value.length) {
      const old = drawingWaypoints.value[idx]
      if (old.col === coord.col && old.row === coord.row) {
        selectedWaypointIndex.value = null
        return
      }
      drawingWaypoints.value[idx] = { col: coord.col, row: coord.row }
      
      // If moving the first waypoint (the spawn origin), update routePoints[0] immediately
      if (idx === 0 && selectedRoute.value) {
        if (selectedRoute.value.routePoints && selectedRoute.value.routePoints.length > 0) {
          selectedRoute.value.routePoints[0] = { col: coord.col, row: coord.row }
        }
        syncRoutesToProject()
      }

      pushRouteState()
      statusMessage.value = `Moved Point #${idx + 1} to (${coord.col}, ${coord.row})`
      selectedWaypointIndex.value = null
    }
  }

  function setWaypointPosition(index: number, coord: GridCoord) {
    if (index >= 0 && index < drawingWaypoints.value.length) {
      drawingWaypoints.value[index] = { col: coord.col, row: coord.row }
      if (index === 0 && selectedRoute.value) {
        if (selectedRoute.value.routePoints && selectedRoute.value.routePoints.length > 0) {
          selectedRoute.value.routePoints[0] = { col: coord.col, row: coord.row }
        }
        syncRoutesToProject()
      }
    }
  }

  function commitRouteState() {
    pushRouteState()
  }

  function deleteSelectedWaypoint() {
    if (selectedWaypointIndex.value === null) return
    deleteWaypoint(selectedWaypointIndex.value)
  }

  function deleteWaypoint(index: number) {
    if (drawingWaypoints.value.length > 1 && index >= 0 && index < drawingWaypoints.value.length) {
      drawingWaypoints.value.splice(index, 1)
      selectedWaypointIndex.value = null

      if (index === 0 && drawingWaypoints.value.length > 0 && selectedRoute.value) {
        selectedRoute.value.routePoints = [...drawingWaypoints.value]
        syncRoutesToProject()
      }

      pushRouteState()
      statusMessage.value = `Deleted Point #${index + 1}`
    }
  }

  function addWaypoint(coord: GridCoord) {
    if (!isDrawingRoute.value) return

    const existingIdx = drawingWaypoints.value.findIndex(p => p.col === coord.col && p.row === coord.row)
    if (existingIdx !== -1) {
      selectWaypoint(existingIdx)
      return
    }

    if (selectedWaypointIndex.value !== null) {
      moveSelectedWaypoint(coord)
      return
    }

    const len = drawingWaypoints.value.length
    if (len > 0) {
      const last = drawingWaypoints.value[len - 1]
      if (last.col === coord.col && last.row === coord.row) return
    }
    drawingWaypoints.value.push({ col: coord.col, row: coord.row })
    pushRouteState()
    statusMessage.value = `Added Point #${drawingWaypoints.value.length} at (${coord.col}, ${coord.row})`
  }

  function addPathTile(coord: GridCoord) {
    addWaypoint(coord)
  }

  function undoRoute() {
    if (routeUndoStack.value.length > 1) {
      const current = routeUndoStack.value.pop()!
      routeRedoStack.value.push(current)
      const prev = routeUndoStack.value[routeUndoStack.value.length - 1]
      drawingWaypoints.value = JSON.parse(JSON.stringify(prev))
      selectedWaypointIndex.value = null
      if (drawingWaypoints.value.length > 0 && selectedRoute.value) {
        selectedRoute.value.routePoints = [...drawingWaypoints.value]
        syncRoutesToProject()
      }
      statusMessage.value = `Undo route (${drawingWaypoints.value.length} points)`
    }
  }

  function redoRoute() {
    if (routeRedoStack.value.length > 0) {
      const next = routeRedoStack.value.pop()!
      routeUndoStack.value.push(next)
      drawingWaypoints.value = JSON.parse(JSON.stringify(next))
      selectedWaypointIndex.value = null
      if (drawingWaypoints.value.length > 0 && selectedRoute.value) {
        selectedRoute.value.routePoints = [...drawingWaypoints.value]
        syncRoutesToProject()
      }
      statusMessage.value = `Redo route (${drawingWaypoints.value.length} points)`
    }
  }

  function undoLastPathTile() {
    undoRoute()
  }

  function clearDrawnRoute() {
    const startPt = selectedRoute.value && selectedRoute.value.routePoints && selectedRoute.value.routePoints.length > 0
      ? selectedRoute.value.routePoints[0]
      : { col: 2, row: 2 }
    drawingWaypoints.value = [startPt]
    selectedWaypointIndex.value = null
    pushRouteState()
    statusMessage.value = 'Route reset to start point'
  }

  function finishDrawingRoute() {
    if (drawingWaypoints.value.length > 1) {
      if (selectedRoute.value) {
        selectedRoute.value.routePoints = [...drawingWaypoints.value]
        syncRoutesToProject()
      }

      isDrawingRoute.value = false
      selectedWaypointIndex.value = null
      routeCache.value = {}
      mapStore.pushHistory(`Saved route (${drawingWaypoints.value.length} waypoints)`)
      statusMessage.value = `Route saved (${drawingWaypoints.value.length} points)! Ready to begin.`
    } else {
      isDrawingRoute.value = false
      selectedWaypointIndex.value = null
      statusMessage.value = 'Route drawing cancelled (at least 2 points required)'
    }
  }

  function cancelDrawingRoute() {
    isDrawingRoute.value = false
    selectedWaypointIndex.value = null
    statusMessage.value = 'Route drawing cancelled'
  }

  function resetForNewProject() {
    routes.value = []
    selectedRouteIndex.value = null
    routeCache.value = {}
    routeUndoStack.value = []
    routeRedoStack.value = []
    isDrawingRoute.value = false
    isSettingRouteStart.value = false
    isSettingPlayerStartPoint.value = false
    showPathTrail.value = true
    showSpawnPoints.value = true
    statusMessage.value = 'Waiting at spawn point'
  }

  return {
    routes,
    selectedRouteIndex,
    selectedRoute,
    currentActiveRoute,
    customRoutes,
    routeCache,
    isDrawingRoute,
    drawingWaypoints,
    drawingPath,
    selectedWaypointIndex,
    routeUndoStack,
    routeRedoStack,
    canUndoRoute,
    canRedoRoute,
    isSettingRouteStart,
    routeStartPlacementMode,
    isSettingPlayerStartPoint,
    showPathTrail,
    showSpawnPoints,
    statusMessage,
    blockedBuildingCellsSet,
    isCellBlockedForBuilding,
    syncRoutesFromProject,
    syncRoutesToProject,
    addRoute,
    relocateCurrentRouteStart,
    setPlayerStartPoint,
    relocateCurrentPlayerStartPoint,
    clearPlayerStartPoint,
    removeRoute,
    deleteCurrentRoute,
    getRouteForIndex,
    pushRouteState,
    startDrawingCustomRoute,
    selectWaypoint,
    moveSelectedWaypoint,
    setWaypointPosition,
    commitRouteState,
    deleteSelectedWaypoint,
    deleteWaypoint,
    addWaypoint,
    addPathTile,
    undoRoute,
    redoRoute,
    undoLastPathTile,
    clearDrawnRoute,
    finishDrawingRoute,
    cancelDrawingRoute,
    resetForNewProject,
  }
})
