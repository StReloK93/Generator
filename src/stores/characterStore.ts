import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { GridCoord, UnitVariantType, WaveConfig, TowerTraitType, RouteInfo, Route } from '../types/map'
import { useMapStore } from './mapStore'
import { useToolStore } from './toolStore'
import { useTowerStore } from './towerStore'
import { useMultiplayerStore } from './multiplayerStore'
import { networkSyncBuffer } from '../services/networkSync'
import { gridToScreen, expandWaypointsToPath, extractWaypointsFromPath } from '../utils/isometric'
import characterManifest from '../assets/generated/characterManifest.json'
import { RouteManager } from '../domain/pathfinding'
import { CrowdSimulation, WaveManager, GameStateMachine } from '../domain/simulation'

export type CharacterAction = 'Idle' | 'Run' | 'Pickup' | 'Walk' | 'Attack' | 'Die' | 'Hit' | 'Block' | 'Cast' | 'Jump' | 'Taunt' | (string & {})
export type CharacterModel = 'male' | 'warrior' | (string & {})
export type { WaveConfig, RouteInfo, Route }

export interface UnitStatusEffect {
  type: TowerTraitType
  duration: number // remaining seconds
  dps?: number // damage per second
  slowPercent?: number
  amplification?: number
  tickTimer?: number
  sourceTowerId?: string
}

export interface CharacterUnit {
  id: string
  routeIndex: number
  routeId: string
  unitIndex: number
  pairIndex: number
  sideOffset: number // -1 (Left side) or +1 (Right side) for 2 people running side-by-side!
  currentCol: number
  currentRow: number
  screenX: number
  screenY: number
  direction: number // 0..7
  action: CharacterAction
  characterModel?: CharacterModel
  animSpeed?: number
  offsetY?: number
  unitScale?: number
  unitVariant?: UnitVariantType
  variantTint?: number | string
  frameIndex: number
  animTimer: number
  pathIndex: number
  pathInterpolation: number
  isSpawned: boolean
  hasReachedEnd: boolean
  celebrationTimer: number
  maxHp: number
  currentHp: number
  isDead: boolean
  deathFade: number
  distanceTraveled?: number
  immunities?: TowerTraitType[]
  statusEffects?: UnitStatusEffect[]
  consecutiveHits?: Record<string, number>
}

export const useCharacterStore = defineStore('characterStore', () => {
  const mapStore = useMapStore()
  const toolStore = useToolStore()
  const towerStore = useTowerStore()
  const multiplayerStore = useMultiplayerStore()

  const isEnabled = ref(true)
  const isPlaying = ref(false)
  const gameSpeed = ref(1.0) // Global Game Simulation Speed Multiplier (1x, 2x, 5x, 10x, 20x, 50x)
  const unitSpeed = ref(2.5) // Unit Walking Speed (tiles per second, 0.8 to 6.0)
  const speed = unitSpeed // Backward-compat alias pointing to unitSpeed
  const spawnCount = ref(10) // Number of people per route (1 to 100)
  const spawnMode = ref<'all_routes' | 'single_route'>('all_routes')
  const formation = ref<'pairs' | 'single'>('pairs') // 'pairs': 2 people side-by-side in each tile!
  const pairDistance = ref(0.35) // Constant spatial distance in tiles between consecutive pairs (tight and dense!)
  const followCamera = ref(false)
  const showPathTrail = ref(true)
  const showSpawnPoints = ref(true)
  const autoLoop = ref(true)
  const unitElevation = ref(0) // Global unit elevation / height offset in pixels (-60 to +60)
  const unitScaleMultiplier = ref(1.0) // Global unit scale multiplier (0.5 to 2.0)

  // Game Mode & Economy State (Configured per map in mapStore.project.gameSettings)
  const isGameMode = ref(false) // Toggle between Map Redaktor and Playable Game Mode
  const entrySource = ref<'editor' | 'home' | 'play' | 'lobby'>('home') // Context-aware origin
  const fps = ref(60) // Live Engine FPS Counter
  const totalKills = ref(0) // Total enemy units defeated in current match
  const totalGoldEarned = ref(0) // Total gold accumulated during current match
  const playerLives = ref(20)
  const maxLives = ref(20)
  const gameState = ref<'ready' | 'build_prep' | 'wave_running' | 'wave_completed' | 'game_over' | 'victory'>('ready')
  const prepCountdown = ref(10) // building countdown before each wave
  const gold = ref(150)
  const currentWaveIndex = ref(0)

  // Per-Map TD Settings Computeds
  const startingGold = computed({
    get: () => mapStore.project.gameSettings?.startingGold ?? 150,
    set: (v: number) => {
      if (!mapStore.project.gameSettings) {
        mapStore.project.gameSettings = { startingGold: v, startingLives: 20, wavePrepTime: 10 }
      } else {
        mapStore.project.gameSettings.startingGold = v
      }
      gold.value = v
    }
  })

  const startingLives = computed({
    get: () => mapStore.project.gameSettings?.startingLives ?? 20,
    set: (v: number) => {
      if (!mapStore.project.gameSettings) {
        mapStore.project.gameSettings = { startingGold: 150, startingLives: v, wavePrepTime: 10 }
      } else {
        mapStore.project.gameSettings.startingLives = v
      }
      maxLives.value = v
      playerLives.value = v
    }
  })

  const wavePrepDuration = computed({
    get: () => mapStore.project.gameSettings?.wavePrepTime ?? 10,
    set: (v: number) => {
      if (!mapStore.project.gameSettings) {
        mapStore.project.gameSettings = { startingGold: 150, startingLives: 20, wavePrepTime: v }
      } else {
        mapStore.project.gameSettings.wavePrepTime = v
      }
      prepCountdown.value = v
    }
  })

  // User-created Wave Configurations (Starts empty so user defines their own waves)
  const waveConfigs = ref<WaveConfig[]>([])

  const currentWaveConfig = computed<WaveConfig | null>(() => {
    if (waveConfigs.value.length === 0) return null
    const idx = Math.max(0, Math.min(waveConfigs.value.length - 1, currentWaveIndex.value))
    return waveConfigs.value[idx] || waveConfigs.value[0] || null
  })

  // Game Mode Loading Screen / Preloader state (Zagruzka)
  const isLoadingGame = ref(false)
  const loadingProgress = ref(0)
  const loadingMapTitle = ref('')
  const loadingMessage = ref('')
  const loadingAssetsCount = ref(0)

  function startLoadingScreen(mapTitle = "Game Map") {
    isLoadingGame.value = true
    loadingProgress.value = 0
    loadingMapTitle.value = mapTitle
    loadingMessage.value = "Preparing graphic assets and textures..."
    loadingAssetsCount.value = 0
  }

  function setLoadingProgress(progress: number, message?: string, loadedCount?: number) {
    loadingProgress.value = Math.max(0, Math.min(100, progress))
    if (message) loadingMessage.value = message
    if (loadedCount !== undefined) loadingAssetsCount.value = loadedCount
  }

  function finishLoadingScreen() {
    loadingProgress.value = 100
    loadingMessage.value = "All textures loaded! Starting game..."
    setTimeout(() => {
      isLoadingGame.value = false
    }, 280)
  }

  // Custom Route Drawing & Undo/Redo State
  const isDrawingRoute = ref(false)
  
  // Routes & Spawns (Authoritative array of RouteInfo objects containing routePoints & playerCameraPoint)
  const routes = ref<RouteInfo[]>([])
  const selectedRouteIndex = ref<number | null>(null)
  const routeCache = ref<Record<number, GridCoord[]>>({})

  const customWaypoints = computed<Record<string, GridCoord[]>>({
    get: () => {
      const res: Record<string, GridCoord[]> = {}
      routes.value.forEach((r, idx) => {
        const key = r.id || `route-${idx}`
        res[key] = r.routePoints || [{ col: r.col, row: r.row }]
      })
      return res
    },
    set: (val: Record<string, GridCoord[]>) => {
      if (!val) return
      for (const [k, wps] of Object.entries(val)) {
        const found = routes.value.find(r => r.id === k)
        if (found && Array.isArray(wps) && wps.length > 0) {
          found.routePoints = [...wps]
          found.col = wps[0].col
          found.row = wps[0].row
          found.spawnCol = wps[0].col
          found.spawnRow = wps[0].row
        }
      }
    }
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

  const drawingWaypoints = ref<GridCoord[]>([])
  const drawingPath = computed<GridCoord[]>(() => expandWaypointsToPath(drawingWaypoints.value))
  const selectedWaypointIndex = ref<number | null>(null)
  const routeUndoStack = ref<GridCoord[][]>([])
  const routeRedoStack = ref<GridCoord[][]>([])

  const canUndoRoute = computed(() => routeUndoStack.value.length > 1)
  const canRedoRoute = computed(() => routeRedoStack.value.length > 0)

  // Wave distance progress per route
  const routeWaveProgress = ref<Record<number, number>>({})

  // Multi-unit Crowd Array
  const units = ref<CharacterUnit[]>([])
  const lapCount = ref(0)
  const statusMessage = ref("Waiting at spawn point")

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

  const spawnedUnitsCount = computed(() => {
    return units.value.filter(u => u.isSpawned && !u.hasReachedEnd).length
  })

  const completedUnitsCount = computed(() => {
    return units.value.filter(u => u.hasReachedEnd).length
  })

  // Multiplayer live enemy counts
  const aliveEnemiesCount = computed(() => {
    if (multiplayerStore.roomId) {
      return networkSyncBuffer.renderUnitsList.filter(u => u.isSpawned && !u.isDead && !u.hasReachedEnd).length
    }
    return units.value.filter(u => u.isSpawned && !u.isDead && !u.hasReachedEnd).length
  })

  const deadEnemiesCount = computed(() => {
    if (multiplayerStore.roomId) {
      return networkSyncBuffer.renderUnitsList.filter(u => u.isDead).length
    }
    return units.value.filter(u => u.isDead).length
  })

  const leakedEnemiesCount = computed(() => {
    if (multiplayerStore.roomId) {
      return networkSyncBuffer.renderUnitsList.filter(u => u.hasReachedEnd).length
    }
    return units.value.filter(u => u.hasReachedEnd).length
  })

  const totalWaveEnemiesCount = computed(() => {
    if (multiplayerStore.roomId) {
      return networkSyncBuffer.renderUnitsList.length
    }
    return units.value.length
  })

  const progressPercent = computed(() => {
    const active = units.value.filter(u => u.isSpawned)
    if (active.length === 0) return 0
    let totalInterp = 0
    for (const u of active) {
      const route = getRouteForIndex(u.routeIndex ?? 0)
      const maxLen = Math.max(1, route.length - 1)
      totalInterp += Math.min(100, Math.round((u.pathIndex / maxLen) * 100))
    }
    return Math.round(totalInterp / active.length)
  })

  /**
   * Scans all map layers to find tiles representing doors or gates
   */
  const isSettingSpawnPoint = ref(false)
  const spawnPointPlacementMode = ref<'add' | 'relocate'>('add')
  const isSettingPlayerStartPoint = ref(false)

  function syncRoutesFromProject(): RouteInfo[] {
    const p = mapStore.project as any
    const rawRoutes = p.routes || p.spawnPoints || []

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
          col: startPt.col,
          row: startPt.row,
          spawnCol: startPt.col,
          spawnRow: startPt.row,
          playerCol: playerCameraPoint?.col,
          playerRow: playerCameraPoint?.row,
        }
      })
    } else if (p.customWaypoints && Object.keys(p.customWaypoints).length > 0) {
      routes.value = Object.entries(p.customWaypoints as Record<string, GridCoord[]>).map(([k, wps], idx) => {
        const startPt = Array.isArray(wps) && wps.length > 0 ? wps[0] : { col: 2, row: 2 }
        return {
          id: k,
          name: `Route ${idx + 1}`,
          routePoints: Array.isArray(wps) ? wps : [startPt],
          col: startPt.col,
          row: startPt.row,
          spawnCol: startPt.col,
          spawnRow: startPt.row,
        }
      })
    } else {
      routes.value = []
    }

    if (selectedRouteIndex.value !== null && (selectedRouteIndex.value >= routes.value.length || selectedRouteIndex.value < 0)) {
      selectedRouteIndex.value = routes.value.length > 0 ? 0 : null
    }

    routeCache.value = {}
    if (routes.value.length > 0) {
      spawnAtRoute(selectedRouteIndex.value)
    } else {
      units.value = []
    }
    return routes.value
  }

  function addRoute(col: number, row: number, customName?: string): RouteInfo {
    const routeIndex = routes.value.length
    const routeId = `route-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const newPoint: RouteInfo = {
      id: routeId,
      name: customName || `Route ${routeIndex + 1}`,
      routePoints: [{ col, row }],
      playerCameraPoint: { col, row },
      col,
      row,
      spawnCol: col,
      spawnRow: row,
      playerCol: col,
      playerRow: row,
    }

    routes.value.push(newPoint)
    selectedRouteIndex.value = routes.value.length - 1
    syncRoutesToProject()
    routeCache.value = {}
    spawnAtRoute(selectedRouteIndex.value)
    mapStore.pushHistory(`Added route (${col}, ${row})`)
    return newPoint
  }

  const addSpawnPoint = addRoute

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
      r.col = col
      r.row = row
      r.spawnCol = col
      r.spawnRow = row
      if (r.routePoints && r.routePoints.length > 0) {
        r.routePoints[0] = { col, row }
      } else {
        r.routePoints = [{ col, row }]
      }
      syncRoutesToProject()
      routeCache.value = {}
      spawnAtRoute(idx)
      mapStore.pushHistory(`Relocated route start to (${col}, ${row})`)
    }
  }

  const relocateCurrentSpawnPoint = relocateCurrentRouteStart

  function setPlayerStartPoint(routeIdx: number, col: number, row: number) {
    if (routeIdx < 0 || routeIdx >= routes.value.length) return
    const r = routes.value[routeIdx]
    if (r) {
      r.playerCameraPoint = { col, row }
      r.playerCol = col
      r.playerRow = row
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
      delete r.playerCol
      delete r.playerRow
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
    if (routes.value.length > 0) {
      spawnAtRoute(selectedRouteIndex.value)
    } else {
      units.value = []
    }
    mapStore.pushHistory(`Removed route ${removed?.name || ''}`)
  }

  const removeSpawnPoint = removeRoute

  function syncRoutesToProject() {
    mapStore.project.routes = routes.value.map(r => ({
      id: r.id,
      name: r.name,
      routePoints: [...(r.routePoints || [{ col: r.col, row: r.row }])],
      playerCameraPoint: r.playerCameraPoint ? { ...r.playerCameraPoint } : (r.playerCol !== undefined ? { col: r.playerCol, row: r.playerRow! } : undefined),
      col: r.col,
      row: r.row,
      spawnCol: r.spawnCol ?? r.col,
      spawnRow: r.spawnRow ?? r.row,
      playerCol: r.playerCameraPoint?.col ?? r.playerCol,
      playerRow: r.playerCameraPoint?.row ?? r.playerRow,
    }))
  }

  const syncSpawnPointsToProject = syncRoutesToProject

  function getRouteForIndex(routeIdx: number): GridCoord[] {
    if (routes.value.length === 0) return [{ col: 2, row: 2 }]
    const r = routes.value[routeIdx] || routes.value[0]
    if (!r) return [{ col: 2, row: 2 }]
    if (r.routePoints && r.routePoints.length > 0) {
      return expandWaypointsToPath(r.routePoints)
    }
    if (r.spawnCol !== undefined && r.spawnRow !== undefined) {
      return [{ col: r.spawnCol, row: r.spawnRow }]
    }
    return [{ col: 2, row: 2 }]
  }

  const blockedBuildingCellsSet = computed<Set<string>>(() => {
    return RouteManager.computeBlockedCells(
      customRoutes.value
    )
  })

  function isCellBlockedForBuilding(col: number, row: number): boolean {
    return blockedBuildingCellsSet.value.has(`${col},${row}`)
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
    pauseTour()
    isDrawingRoute.value = true
    selectedWaypointIndex.value = null
    routeUndoStack.value = []
    routeRedoStack.value = []
    toolStore.setTool('select')

    // 1. If an explicit route index was provided, activate it
    if (typeof targetRouteIndex === 'number' && targetRouteIndex >= 0 && targetRouteIndex < routes.value.length) {
      selectedRouteIndex.value = targetRouteIndex
    } else if (selectedRouteIndex.value === null || selectedRouteIndex.value < 0 || selectedRouteIndex.value >= routes.value.length) {
      selectedRouteIndex.value = routes.value.length > 0 ? 0 : null
    }

    const currentRoute = selectedRoute.value
    const idx = selectedRouteIndex.value ?? 0
    const startPt = currentRoute && currentRoute.routePoints && currentRoute.routePoints.length > 0
      ? currentRoute.routePoints[0]
      : (currentRoute ? { col: currentRoute.spawnCol ?? currentRoute.col, row: currentRoute.spawnRow ?? currentRoute.row } : { col: 2, row: 2 })

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
      
      // If moving the first waypoint (the spawn origin), update the route start point immediately
      if (idx === 0 && selectedRoute.value) {
        selectedRoute.value.col = coord.col
        selectedRoute.value.row = coord.row
        selectedRoute.value.spawnCol = coord.col
        selectedRoute.value.spawnRow = coord.row
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
        selectedRoute.value.col = coord.col
        selectedRoute.value.row = coord.row
        selectedRoute.value.spawnCol = coord.col
        selectedRoute.value.spawnRow = coord.row
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
        const newStart = drawingWaypoints.value[0]
        selectedRoute.value.col = newStart.col
        selectedRoute.value.row = newStart.row
        selectedRoute.value.spawnCol = newStart.col
        selectedRoute.value.spawnRow = newStart.row
        syncRoutesToProject()
      }

      pushRouteState()
      statusMessage.value = `Deleted Point #${index + 1}`
    }
  }

  function addWaypoint(coord: GridCoord) {
    if (!isDrawingRoute.value) return

    // 1. If user clicked directly on an existing waypoint, toggle select it!
    const existingIdx = drawingWaypoints.value.findIndex(p => p.col === coord.col && p.row === coord.row)
    if (existingIdx !== -1) {
      selectWaypoint(existingIdx)
      return
    }

    // 2. If a waypoint was previously selected, move it to this clicked cell!
    if (selectedWaypointIndex.value !== null) {
      moveSelectedWaypoint(coord)
      return
    }

    // 3. Normal path addition
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
        const startPt = drawingWaypoints.value[0]
        selectedRoute.value.col = startPt.col
        selectedRoute.value.row = startPt.row
        selectedRoute.value.spawnCol = startPt.col
        selectedRoute.value.spawnRow = startPt.row
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
        const startPt = drawingWaypoints.value[0]
        selectedRoute.value.col = startPt.col
        selectedRoute.value.row = startPt.row
        selectedRoute.value.spawnCol = startPt.col
        selectedRoute.value.spawnRow = startPt.row
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
      : (selectedRoute.value ? { col: selectedRoute.value.spawnCol ?? selectedRoute.value.col, row: selectedRoute.value.spawnRow ?? selectedRoute.value.row } : { col: 2, row: 2 })
    drawingWaypoints.value = [startPt]
    selectedWaypointIndex.value = null
    pushRouteState()
    statusMessage.value = "Route reset to start point"
  }

  function finishDrawingRoute() {
    if (drawingWaypoints.value.length > 1) {
      if (selectedRoute.value) {
        selectedRoute.value.routePoints = [...drawingWaypoints.value]
        const startPt = drawingWaypoints.value[0]
        selectedRoute.value.col = startPt.col
        selectedRoute.value.row = startPt.row
        selectedRoute.value.spawnCol = startPt.col
        selectedRoute.value.spawnRow = startPt.row
        syncRoutesToProject()
      }

      isDrawingRoute.value = false
      selectedWaypointIndex.value = null
      routeCache.value = {}
      spawnAtRoute(selectedRouteIndex.value)
      mapStore.pushHistory(`Saved route (${drawingWaypoints.value.length} waypoints)`)
      statusMessage.value = `Route saved (${drawingWaypoints.value.length} points)! Ready to begin.`
    } else {
      isDrawingRoute.value = false
      selectedWaypointIndex.value = null
      statusMessage.value = "Route drawing cancelled (at least 2 points required)"
    }
  }

  function cancelDrawingRoute() {
    isDrawingRoute.value = false
    selectedWaypointIndex.value = null
    statusMessage.value = "Route drawing cancelled"
  }

  function deleteCurrentRoute() {
    const idx = selectedRouteIndex.value ?? 0
    if (idx >= 0 && idx < routes.value.length) {
      routes.value.splice(idx, 1)
      if (routes.value.length === 0) {
        selectedRouteIndex.value = null
      } else if (selectedRouteIndex.value !== null && selectedRouteIndex.value >= routes.value.length) {
        selectedRouteIndex.value = routes.value.length - 1
      }
      syncRoutesToProject()
      selectedWaypointIndex.value = null
      routeCache.value = {}
      spawnAtRoute(selectedRouteIndex.value)
      mapStore.pushHistory("Route deleted")
      statusMessage.value = "Route deleted"
    }
  }

  function setWaveUnitCount(count: number) {
    spawnCount.value = count
    if (currentWaveConfig.value) {
      currentWaveConfig.value.unitCount = count
    }
    syncWavesToProject()
    resetTour()
  }

  function setWaveUnitHp(hp: number) {
    if (currentWaveConfig.value) {
      currentWaveConfig.value.unitHp = hp
    }
    syncWavesToProject()
    resetTour()
  }

  function setWaveSpeed(spd: number) {
    unitSpeed.value = spd
    if (currentWaveConfig.value) {
      currentWaveConfig.value.unitSpeed = spd
    }
    syncWavesToProject()
  }

  function setWaveUnitBonus(bonus: number) {
    if (currentWaveConfig.value) {
      currentWaveConfig.value.unitBonus = Math.max(0, Math.round(bonus))
      currentWaveConfig.value.goldReward = currentWaveConfig.value.unitBonus
    }
    syncWavesToProject()
  }

  function setWaveEndBonus(bonus: number) {
    if (currentWaveConfig.value) {
      currentWaveConfig.value.endWaveBonus = Math.max(0, Math.round(bonus))
    }
    syncWavesToProject()
  }

  function setWaveGoldReward(reward: number) {
    setWaveUnitBonus(reward)
  }

  function setWaveCharacterModel(model: CharacterModel) {
    if (currentWaveConfig.value) {
      currentWaveConfig.value.characterModel = model
    }
    syncWavesToProject()
    resetTour()
  }

  function setWaveAnimSpeed(speed: number) {
    if (currentWaveConfig.value) {
      currentWaveConfig.value.animSpeed = Math.min(4.0, Math.max(0.2, Math.round(speed * 10) / 10))
    }
    syncWavesToProject()
  }

  function setWaveOffsetY(offset: number) {
    if (currentWaveConfig.value) {
      currentWaveConfig.value.offsetY = Math.min(100, Math.max(-100, Math.round(offset)))
    }
    syncWavesToProject()
  }

  function setWaveUnitScale(scale: number) {
    if (currentWaveConfig.value) {
      currentWaveConfig.value.unitScale = Math.min(4.0, Math.max(0.3, Math.round(scale * 100) / 100))
    }
    syncWavesToProject()
  }

  function setWaveUnitVariant(variant: UnitVariantType) {
    if (currentWaveConfig.value) {
      currentWaveConfig.value.unitVariant = variant
    }
    syncWavesToProject()
    resetTour()
  }

  function setWaveVariantTint(tint?: number | string) {
    if (currentWaveConfig.value) {
      currentWaveConfig.value.variantTint = tint
    }
    syncWavesToProject()
    resetTour()
  }

  function updateWaveConfig(idx: number, updates: Partial<WaveConfig>) {
    const cfg = waveConfigs.value[idx]
    if (!cfg) return
    Object.assign(cfg, updates)
    if (updates.unitCount !== undefined) spawnCount.value = updates.unitCount
    if (updates.unitSpeed !== undefined) unitSpeed.value = updates.unitSpeed
    syncWavesToProject()
  }

  function selectWave(idx: number) {
    currentWaveIndex.value = Math.max(0, Math.min(waveConfigs.value.length - 1, idx))
    const cfg = waveConfigs.value[currentWaveIndex.value]
    if (cfg) {
      spawnCount.value = cfg.unitCount
      unitSpeed.value = cfg.unitSpeed
    }
    syncWavesToProject()
    resetTour()
  }

  const isWaveSaveFeedback = ref(false)

  function saveCurrentWave() {
    if (!currentWaveConfig.value) return
    syncWavesToProject()
    mapStore.pushHistory(`Saved Wave ${currentWaveConfig.value.waveNumber} settings`)
    isWaveSaveFeedback.value = true
    setTimeout(() => {
      isWaveSaveFeedback.value = false
    }, 2500)
  }

  function resetForNewProject() {
    waveConfigs.value = []
    routes.value = []
    selectedRouteIndex.value = null
    routeCache.value = {}
    routeWaveProgress.value = {}
    routeUndoStack.value = []
    routeRedoStack.value = []
    units.value = []
    unitSpeed.value = 2.5
    spawnCount.value = 10
    spawnMode.value = 'all_routes'
    formation.value = 'pairs'
    pairDistance.value = 0.35
    followCamera.value = false
    showPathTrail.value = true
    autoLoop.value = true
    unitElevation.value = 0
    unitScaleMultiplier.value = 1.0
    startingGold.value = 150
    startingLives.value = 20
    wavePrepDuration.value = 10
    gold.value = 150
    maxLives.value = 20
    playerLives.value = 20
    prepCountdown.value = 10
    currentWaveIndex.value = 0
    totalKills.value = 0
    totalGoldEarned.value = 150
    lapCount.value = 0
    isDrawingRoute.value = false
    isSettingSpawnPoint.value = false
    isSettingPlayerStartPoint.value = false
    statusMessage.value = "Waiting at spawn point"
  }

  function syncGameSettingsToProject() {
    if (!mapStore.project) return
    mapStore.project.gameSettings = {
      startingGold: Number(startingGold.value) || 150,
      startingLives: Number(startingLives.value) || 20,
      wavePrepTime: Number(wavePrepDuration.value) || 10,
      spawnMode: spawnMode.value || 'all_routes',
      formation: formation.value,
      pairDistance: pairDistance.value,
      unitElevation: unitElevation.value,
      unitScaleMultiplier: unitScaleMultiplier.value,
    }
  }

  function restoreGameSettingsFromProject() {
    const p = mapStore.project as any
    const gs = p?.gameSettings || p?.characterConfig
    if (gs) {
      startingGold.value = gs.startingGold ?? 150
      startingLives.value = gs.startingLives ?? 20
      wavePrepDuration.value = gs.wavePrepTime ?? 10
      if (gs.spawnMode) spawnMode.value = gs.spawnMode === 'single_route' ? 'single_route' : 'all_routes'
      if (gs.formation) formation.value = gs.formation
      if (gs.pairDistance !== undefined) pairDistance.value = gs.pairDistance
      if (gs.unitElevation !== undefined) unitElevation.value = Number(gs.unitElevation) || 0
      if (gs.unitScaleMultiplier !== undefined) unitScaleMultiplier.value = Number(gs.unitScaleMultiplier) || 1.0
      gold.value = startingGold.value
      maxLives.value = startingLives.value
      playerLives.value = startingLives.value
      prepCountdown.value = wavePrepDuration.value
    } else {
      startingGold.value = 150
      startingLives.value = 20
      wavePrepDuration.value = 10
      spawnMode.value = 'all_routes'
      formation.value = 'pairs'
      pairDistance.value = 0.35
      unitElevation.value = 0
      unitScaleMultiplier.value = 1.0
      gold.value = 150
      maxLives.value = 20
      playerLives.value = 20
      prepCountdown.value = 10
    }
  }

  const syncCharacterConfigToProject = syncGameSettingsToProject
  const restoreCharacterConfigFromProject = restoreGameSettingsFromProject

  function syncWavesToProject() {
    if (!mapStore.project) return
    ;(mapStore.project as any).waveConfigs = waveConfigs.value.map(w => ({ ...w }))
    ;(mapStore.project as any).currentWaveIndex = currentWaveIndex.value
    syncGameSettingsToProject()
    syncCharacterConfigToProject()
  }

  function restoreWavesFromProject() {
    const p = mapStore.project as any
    const waves = p.waveConfigs || p.waveData?.waveConfigs || []
    if (waves && Array.isArray(waves) && waves.length > 0) {
      waveConfigs.value = waves.map((w: any) => ({
        ...w,
        unitBonus: w.unitBonus !== undefined ? Number(w.unitBonus) : (Number(w.goldReward) || 1),
        endWaveBonus: w.endWaveBonus !== undefined ? Number(w.endWaveBonus) : 50,
        characterModel: w.characterModel || 'male',
        animSpeed: Number(w.animSpeed) || 1.0,
        offsetY: Number(w.offsetY) || 0,
        unitScale: Number(w.unitScale) || 1.0,
        unitVariant: w.unitVariant || 'normal',
        variantTint: w.variantTint,
        immunities: Array.isArray(w.immunities) ? w.immunities : [],
      }))
      currentWaveIndex.value = Math.max(0, Math.min(waveConfigs.value.length - 1, p.currentWaveIndex ?? p.waveData?.currentWaveIndex ?? 0))
    } else {
      waveConfigs.value = []
      currentWaveIndex.value = 0
    }
    restoreGameSettingsFromProject()
    restoreCharacterConfigFromProject()
  }

  function addNewWave() {
    const newWave = WaveManager.createNextWave(waveConfigs.value)
    waveConfigs.value.push(newWave)
    syncWavesToProject()
    selectWave(waveConfigs.value.length - 1)
  }

  function deleteWave(idx: number) {
    if (waveConfigs.value.length <= 1) return
    waveConfigs.value.splice(idx, 1)
    WaveManager.reindexWaves(waveConfigs.value)
    syncWavesToProject()
    selectWave(Math.max(0, idx - 1))
  }

  function getModelActionFrameCount(model: string = 'male', action: string = 'Run'): number {
    const meta = (characterManifest as any)?.[String(model || 'male').toLowerCase()]
    if (!meta || !meta.actions) {
      return model === 'warrior' ? 24 : 10
    }
    const actions = Object.values(meta.actions) as any[]
    const act = actions.find((a: any) => a.id.toLowerCase() === action.toLowerCase())
      || actions.find((a: any) => action.toLowerCase() === 'run' && /run|walk|sprint|move/i.test(a.id))
      || actions.find((a: any) => action.toLowerCase() === 'idle' && /idle|stand|wait/i.test(a.id))
      || actions.find((a: any) => action.toLowerCase() === 'pickup' && /die|death|dead|pickup|hit|collapse/i.test(a.id))
      || actions[0]
    return act?.frameCount || (model === 'warrior' ? 24 : 10)
  }

  // --- MULTI-UNIT CROWD INITIALIZATION & SPAWNING ---

  /**
   * Initializes units:
   * Uses spatial distance spacing (distance in tiles) so units stay tightly packed at any speed!
   */
  function initializeUnits() {
    if (routes.value.length === 0) {
      units.value = []
      return
    }

    const list: CharacterUnit[] = []
    const waveCfg = currentWaveConfig.value
    const count = Math.max(1, Math.min(100, waveCfg ? waveCfg.unitCount : spawnCount.value))
    const isPairFormation = formation.value === 'pairs'
    const model: CharacterModel = (waveCfg?.characterModel as CharacterModel) || 'male'
    const initialMaxFrames = getModelActionFrameCount(model, 'Run')

    const activeRoutesToSpawn = (spawnMode.value === 'all_routes' && routes.value.length > 1)
      ? routes.value.map((_, idx) => idx)
      : [selectedRouteIndex.value !== null && selectedRouteIndex.value >= 0 ? selectedRouteIndex.value : 0]

    const progressMap: Record<number, number> = {}
    const baseHp = waveCfg ? waveCfg.unitHp : 100

    for (const rIdx of activeRoutesToSpawn) {
      progressMap[rIdx] = 0 // Leader starts at distance 0
      const route = getRouteForIndex(rIdx)
      const startPt = route[0] || { col: 2, row: 2 }
      const startScreen = gridToScreen(startPt.col, startPt.row, mapStore.project.tileWidth, mapStore.project.tileHeight)
      const routeItem = routes.value[rIdx]
      const routeId = routeItem ? routeItem.id : `route-${rIdx}`

      for (let i = 0; i < count; i++) {
        const pairIndex = isPairFormation ? Math.floor(i / 2) : i
        const sideOffset = isPairFormation ? (i % 2 === 0 ? -1 : 1) : 0

        const waveImmunities = waveCfg?.immunities || []
        const effectiveImmunities = [...waveImmunities]
        if (effectiveImmunities.length === 0 && waveCfg?.unitVariant) {
          const varType = String(waveCfg.unitVariant).toLowerCase()
          if (['fire', 'frost', 'poison', 'blood', 'electric', 'void'].includes(varType)) {
            effectiveImmunities.push(varType as TowerTraitType)
          }
        }

        list.push({
          id: `unit-r${rIdx}-${i}-${Date.now()}`,
          routeIndex: rIdx,
          routeId,
          unitIndex: i,
          pairIndex,
          sideOffset,
          currentCol: startPt.col,
          currentRow: startPt.row,
          screenX: startScreen.x,
          screenY: startScreen.y,
          direction: 2,
          action: 'Idle',
          characterModel: model,
          animSpeed: waveCfg?.animSpeed || 1.0,
          offsetY: waveCfg?.offsetY || 0,
          unitScale: waveCfg?.unitScale || 1.0,
          unitVariant: waveCfg?.unitVariant || 'normal',
          variantTint: waveCfg?.variantTint,
          frameIndex: (i * 2) % initialMaxFrames,
          animTimer: 0,
          pathIndex: 0,
          pathInterpolation: 0,
          isSpawned: pairIndex === 0, // First pair is visible immediately
          hasReachedEnd: false,
          celebrationTimer: 0,
          maxHp: baseHp,
          currentHp: baseHp,
          isDead: false,
          deathFade: 1.0,
          distanceTraveled: 0,
          immunities: effectiveImmunities,
          statusEffects: [],
          consecutiveHits: {},
        })
      }
    }

    routeWaveProgress.value = progressMap
    units.value = list
  }

  function spawnAtRoute(routeIdx?: number | null) {
    if (routeIdx !== undefined) {
      selectedRouteIndex.value = routeIdx
    }
    initializeUnits()
    isPlaying.value = false
    const totalCount = units.value.length
    const hpStr = currentWaveConfig.value ? `(HP: ${currentWaveConfig.value.unitHp})` : ''
    statusMessage.value = spawnMode.value === 'all_routes' && routes.value.length > 1
      ? `All ${routes.value.length} routes ready (${totalCount} units ${hpStr})`
      : `${selectedRoute.value?.name || 'Route'} ready (${totalCount} units ${hpStr})`
  }

  function startTour() {
    if (units.value.length === 0) {
      initializeUnits()
    }
    isPlaying.value = true
    for (const u of units.value) {
      if (u.isSpawned && !u.hasReachedEnd && !u.isDead) {
        u.action = 'Run'
      }
    }
    const waveName = currentWaveConfig.value ? currentWaveConfig.value.name : 'Units'
    statusMessage.value = `${waveName} — ${units.value.length} units marching to target...`
  }

  function pauseTour() {
    isPlaying.value = false
    for (const u of units.value) {
      if (!u.hasReachedEnd && !u.isDead) {
        u.action = 'Idle'
      }
    }
    statusMessage.value = "Movement paused"
  }

  function togglePlay() {
    if (isPlaying.value) {
      pauseTour()
    } else {
      startTour()
    }
  }

  function resetTour() {
    pauseTour()
    lapCount.value = 0
    initializeUnits()
    statusMessage.value = "Reset to spawn point and ready"
  }

  function calculateDirection(fromCol: number, fromRow: number, toCol: number, toRow: number): number {
    return CrowdSimulation.calculateDirection(
      fromCol,
      fromRow,
      toCol,
      toRow,
      mapStore.project.tileWidth,
      mapStore.project.tileHeight
    )
  }

  /**
   * Main multi-unit animation & movement tick
   * deltaSec is already scaled by gameSpeed (simulation multiplier) in engine.onTick!
   */
  function updateTick(deltaSec: number) {
    if (!isEnabled.value) return

    // Building & prep phase in Play Mode (Auto-countdown ONLY in real multiplayer games)
    if (isGameMode.value && gameState.value === 'build_prep') {
      if (multiplayerStore.roomId) {
        prepCountdown.value -= deltaSec
        if (prepCountdown.value <= 0) {
          prepCountdown.value = 0
          startNextWaveInGame()
        }
      }
      return
    }

    // If not actively playing (e.g. paused in editor or waiting), do not advance movement
    if (!isPlaying.value) {
      for (const unit of units.value) {
        if (!unit.isDead && !unit.hasReachedEnd) {
          unit.action = 'Idle'
          unit.animTimer += deltaSec
          if (unit.animTimer >= 0.15) {
            unit.animTimer = 0
            const maxIdle = getModelActionFrameCount(unit.characterModel, 'Idle')
            unit.frameIndex = (unit.frameIndex + 1) % maxIdle
          }
        }
      }
      return
    }

    const tileWidth = mapStore.project.tileWidth
    const tileHeight = mapStore.project.tileHeight
    const waveCfg = currentWaveConfig.value
    const unitBaseSpeed = waveCfg ? waveCfg.unitSpeed : 2.5
    const stepDistance = unitBaseSpeed * deltaSec
    const spacingInTiles = pairDistance.value
    // Advance wave distance along path for each route
    for (const rIdxStr in routeWaveProgress.value) {
      const rIdx = Number(rIdxStr)
      routeWaveProgress.value[rIdx] += stepDistance
    }

    let allCompletedOrDead = true
    let leaderUnit: CharacterUnit | null = null

    for (const unit of units.value) {
      const route = getRouteForIndex(unit.routeIndex ?? 0)
      if (!route || route.length <= 1) continue

      // Dead unit handling: play bending / collapsing animation and fade out opacity
      if (unit.isDead) {
        unit.action = 'Pickup'
        unit.animTimer += deltaSec
        if (unit.animTimer >= 0.08) {
          unit.animTimer = 0
          const maxDead = getModelActionFrameCount(unit.characterModel, 'Pickup')
          if (unit.frameIndex < maxDead) {
            unit.frameIndex++
          }
        }
        if (unit.deathFade > 0) {
          unit.deathFade = Math.max(0, unit.deathFade - deltaSec * 1.2)
        }
        continue
      }

      // --- 1. PROCESS STATUS EFFECTS via CrowdSimulation (DoTs, Slows, Stuns, Buffs) ---
      let maxSlowPercent = 0
      if (unit.statusEffects && unit.statusEffects.length > 0) {
        const effectRes = CrowdSimulation.processStatusEffects(unit, deltaSec)
        maxSlowPercent = effectRes.maxSlowPercent

        if (effectRes.dotDamage > 0) {
          towerStore.damageFloaters.push({
            id: `dot-${Date.now()}-${Math.random()}`,
            text: effectRes.dotText || `-${effectRes.dotDamage}`,
            x: unit.screenX + (Math.random() * 16 - 8),
            y: unit.screenY - tileHeight * 1.05,
            color: effectRes.dotColor || 0xf97316,
            alpha: 1.0,
            lifeTimer: 0,
          })
        }

        if (effectRes.unitDied) {
          totalKills.value++
        }
      }

      if (unit.isDead) continue

      const speedMultiplier = Math.max(0.15, 1.0 - (Math.min(85, maxSlowPercent) / 100))

      const waveDist = routeWaveProgress.value[unit.routeIndex ?? 0] ?? 0
      const targetSpawnDist = unit.pairIndex * spacingInTiles

      // Unit has not emerged from route start yet
      if (waveDist < targetSpawnDist && (unit.distanceTraveled === undefined || unit.distanceTraveled === 0)) {
        unit.isSpawned = false
        unit.action = 'Idle'
        allCompletedOrDead = false
        continue
      }

      unit.isSpawned = true

      // Advance individual unit distance along path accounting for slow effects!
      if (unit.distanceTraveled === undefined) {
        unit.distanceTraveled = Math.max(0, waveDist - targetSpawnDist)
      } else {
        unit.distanceTraveled += (unitBaseSpeed * speedMultiplier) * deltaSec
      }

      const unitDist = unit.distanceTraveled

      // Unit has reached the center/destination
      if (unitDist >= route.length - 1) {
        if (!unit.hasReachedEnd) {
          unit.hasReachedEnd = true
          // Deduct life in Game Mode via GameStateMachine
          if (isGameMode.value && gameState.value === 'wave_running') {
            const lifeRes = GameStateMachine.deductLife(playerLives.value)
            playerLives.value = lifeRes.remainingLives
            if (lifeRes.isGameOver) {
              gameState.value = 'game_over'
              isPlaying.value = false
              statusMessage.value = "Defeat! All lives lost."
            }
          }
        }
        unit.pathIndex = route.length - 1
        unit.pathInterpolation = 0
        unit.action = 'Pickup'
        unit.celebrationTimer += deltaSec
        unit.animTimer += deltaSec
        if (unit.animTimer >= 0.1) {
          unit.animTimer = 0
          const maxAction = getModelActionFrameCount(unit.characterModel, 'Pickup')
          unit.frameIndex = (unit.frameIndex + 1) % maxAction
        }
        unit.currentCol = route[route.length - 1].col
        unit.currentRow = route[route.length - 1].row
        const ptScreen = gridToScreen(unit.currentCol, unit.currentRow, tileWidth, tileHeight)
        unit.screenX = ptScreen.x
        unit.screenY = ptScreen.y
        continue
      }

      allCompletedOrDead = false
      if (!leaderUnit && unit.routeIndex === selectedRouteIndex.value) {
        leaderUnit = unit
      }

      unit.hasReachedEnd = false
      unit.action = 'Run'
      unit.pathIndex = Math.floor(unitDist)
      unit.pathInterpolation = unitDist - unit.pathIndex

      const idxA = unit.pathIndex
      const idxB = Math.min(route.length - 1, idxA + 1)
      const ptA = route[idxA]
      const ptB = route[idxB]

      const t = unit.pathInterpolation
      unit.currentCol = ptA.col + (ptB.col - ptA.col) * t
      unit.currentRow = ptA.row + (ptB.row - ptA.row) * t

      const baseScreen = gridToScreen(unit.currentCol, unit.currentRow, tileWidth, tileHeight)

      // Side-by-side (2 units side-by-side) perpendicular offset via CrowdSimulation
      if (formation.value === 'pairs' && unit.sideOffset !== 0) {
        const offsetPt = CrowdSimulation.calculateSideOffset(
          baseScreen.x,
          baseScreen.y,
          ptA,
          ptB,
          unit.sideOffset,
          tileWidth,
          tileHeight
        )
        unit.screenX = offsetPt.screenX
        unit.screenY = offsetPt.screenY
      } else {
        unit.screenX = baseScreen.x
        unit.screenY = baseScreen.y
      }

      if (idxA !== idxB) {
        unit.direction = calculateDirection(ptA.col, ptA.row, ptB.col, ptB.row)
      }

      // Animation frame duration
      unit.animTimer += deltaSec
      const maxRun = getModelActionFrameCount(unit.characterModel, 'Run')
      const animMultiplier = unit.animSpeed || currentWaveConfig.value?.animSpeed || 1.0
      const frameDuration = ((maxRun > 15 ? 0.04 : 0.07) / Math.min(5, unitBaseSpeed / 2.5)) / Math.max(0.1, animMultiplier)
      if (unit.animTimer >= frameDuration) {
        unit.animTimer = 0
        unit.frameIndex = (unit.frameIndex + 1) % maxRun
      }
    }

    // Camera follow leader (only when active and playing)
    if (followCamera.value && isPlaying.value && leaderUnit && leaderUnit.isSpawned && !leaderUnit.isDead && !leaderUnit.hasReachedEnd) {
      const panX = window.innerWidth / 2 - leaderUnit.screenX * toolStore.zoom
      const panY = window.innerHeight / 2 - leaderUnit.screenY * toolStore.zoom
      toolStore.pan.x += (panX - toolStore.pan.x) * 0.08
      toolStore.pan.y += (panY - toolStore.pan.y) * 0.08
    }

    // If all units completed or died
    if (allCompletedOrDead && units.value.length > 0) {
      lapCount.value++
      const completedWave = currentWaveConfig.value
      const reward = completedWave ? (completedWave.endWaveBonus ?? completedWave.goldReward ?? 50) : 50

      if (isGameMode.value) {
        if (playerLives.value > 0) {
          if (multiplayerStore.roomId) {
            for (const p of multiplayerStore.players) {
              p.gold = (p.gold || 0) + reward
              p.totalGoldEarned = (p.totalGoldEarned || p.gold || 0) + reward
              if (p.id === multiplayerStore.myPlayerId) {
                gold.value = p.gold
                totalGoldEarned.value = p.totalGoldEarned
              }
            }
          } else {
            gold.value += reward
            totalGoldEarned.value += reward
          }

          const completion = GameStateMachine.evaluateWaveCompletion(
            currentWaveIndex.value,
            waveConfigs.value.length
          )

          if (completion.isVictory) {
            gameState.value = 'victory'
            isPlaying.value = false
            statusMessage.value = "Victory! All waves successfully cleared!"
          } else {
            // Next wave: Enter building & prep phase!
            currentWaveIndex.value++
            gameState.value = 'build_prep'
            prepCountdown.value = wavePrepDuration.value
            isPlaying.value = false
            spawnAtRoute(0)
            if (multiplayerStore.roomId) {
              statusMessage.value = `${completedWave?.name || 'Wave'} cleared! +${reward} Gold. ${wavePrepDuration.value}s build prep...`
            } else {
              statusMessage.value = `${completedWave?.name || 'Wave'} cleared! +${reward} Gold. Click Start to begin next wave.`
            }
          }
        }
      } else {
        // Redaktor mode: Stop after testing the wave
        gold.value += reward
        pauseTour()
        statusMessage.value = `${completedWave?.name || 'Wave'} test completed!`
      }
    }
  }

  /**
   * Client-side visual animation frame cycle between authoritative network ticks
   */
  function updateClientInterpolation(deltaSec: number) {
    networkSyncBuffer.interpolate(deltaSec)
  }

  // --- GAME MODE CONTROLS ---

  function startPlayMode() {
    restoreGameSettingsFromProject()
    restoreWavesFromProject()
    towerStore.saveEditorTowersSnapshot()
    towerStore.clearCombatEffects()
    isGameMode.value = true
    const initLives = startingLives.value
    maxLives.value = initLives
    playerLives.value = initLives
    gold.value = startingGold.value
    totalKills.value = 0
    totalGoldEarned.value = 0
    currentWaveIndex.value = 0
    gameState.value = 'build_prep'
    prepCountdown.value = wavePrepDuration.value
    gameSpeed.value = 1.0
    followCamera.value = false
    spawnAtRoute(0)
    isPlaying.value = false
    statusMessage.value = multiplayerStore.roomId 
      ? `Battle starting in ${wavePrepDuration.value}s...` 
      : 'Ready! Place defense towers and click Start to begin.'
  }

  function setGameSpeed(speed: number) {
    gameSpeed.value = speed
  }

  function exitPlayMode() {
    isGameMode.value = false
    gameState.value = 'ready'
    isPlaying.value = false
    followCamera.value = false
    isLoadingGame.value = false
    loadingProgress.value = 0
    loadingMessage.value = ''
    resetTour()
    towerStore.restoreEditorTowersSnapshot()
  }

  function startNextWaveInGame() {
    towerStore.clearCombatEffects()
    gameState.value = 'wave_running'
    prepCountdown.value = 0
    spawnAtRoute(0)
    startTour()
  }


  function restartGame() {
    towerStore.restoreEditorTowersSnapshot()
    startPlayMode()
  }

  // --- DEV & SANDBOX TEST MODE CONTROLS (ONLY USED WHEN TESTING FROM EDITOR) ---
  function devResetGame(customStartingGold?: number, clearTowers: boolean = true) {
    if (clearTowers) {
      towerStore.clearAllTowers()
    } else {
      towerStore.restoreEditorTowersSnapshot()
    }
    towerStore.clearCombatEffects()
    units.value = []
    lapCount.value = 0
    currentWaveIndex.value = 0
    if (customStartingGold !== undefined) {
      startingGold.value = Math.max(0, customStartingGold)
      gold.value = startingGold.value
      syncGameSettingsToProject()
    } else {
      gold.value = startingGold.value
    }
    const initLives = startingLives.value || 20
    maxLives.value = initLives
    playerLives.value = initLives
    totalKills.value = 0
    totalGoldEarned.value = 0
    gameState.value = 'build_prep'
    prepCountdown.value = wavePrepDuration.value
    isPlaying.value = false
    spawnAtRoute(0)
    statusMessage.value = 'Match reset to Wave 1 with clean battlefield.'
  }

  function devAddGold(amount: number) {
    gold.value = Math.max(0, gold.value + amount)
  }

  function devSetGold(amount: number) {
    gold.value = Math.max(0, amount)
  }

  function devSetStartingGold(amount: number) {
    startingGold.value = Math.max(0, amount)
    syncGameSettingsToProject()
  }

  function devAddLives(amount: number) {
    playerLives.value = Math.min(999, playerLives.value + amount)
    maxLives.value = Math.max(maxLives.value, playerLives.value)
  }

  function devSetLives(amount: number) {
    playerLives.value = Math.max(1, amount)
    maxLives.value = Math.max(maxLives.value, playerLives.value)
  }

  function devJumpToWave(waveIdx: number) {
    if (waveConfigs.value.length === 0) return
    const targetIdx = Math.max(0, Math.min(waveConfigs.value.length - 1, waveIdx))
    currentWaveIndex.value = targetIdx
    gameState.value = 'build_prep'
    prepCountdown.value = 0
    isPlaying.value = false
    towerStore.clearCombatEffects()
    spawnAtRoute(0)
  }

  function devRestartCurrentWave() {
    towerStore.clearCombatEffects()
    gameState.value = 'build_prep'
    prepCountdown.value = 0
    isPlaying.value = false
    spawnAtRoute(0)
  }

  function devClearAllCreeps() {
    for (const u of units.value) {
      u.isDead = true
      u.action = 'Pickup'
      u.deathFade = 0.2
    }
    units.value = []
    towerStore.clearCombatEffects()
  }

  function devSpawnWaveNow() {
    towerStore.clearCombatEffects()
    gameState.value = 'wave_running'
    prepCountdown.value = 0
    spawnAtRoute(0)
    startTour()
  }

  function devAddWave(): WaveConfig {
    const nextNum = waveConfigs.value.length + 1
    const prevWave = waveConfigs.value[waveConfigs.value.length - 1]
    const newWave: WaveConfig = {
      waveNumber: nextNum,
      name: `Wave ${nextNum}`,
      unitHp: prevWave ? Math.round(prevWave.unitHp * 1.3) : 100,
      unitSpeed: prevWave ? prevWave.unitSpeed : 2.5,
      unitCount: prevWave ? Math.min(50, prevWave.unitCount + 2) : 12,
      isBoss: nextNum % 5 === 0,
      goldReward: prevWave ? Math.round(prevWave.goldReward * 1.2) : 50,
      characterModel: prevWave?.characterModel || 'male',
      unitVariant: prevWave?.unitVariant || 'normal',
      immunities: prevWave?.immunities ? [...prevWave.immunities] : [],
    }
    waveConfigs.value.push(newWave)
    syncWavesToProject()
    return newWave
  }

  function devUpdateActiveWaveHp(hp: number) {
    const wave = currentWaveConfig.value
    if (!wave) return
    wave.unitHp = Math.max(1, hp)
    for (const u of units.value) {
      u.maxHp = wave.unitHp
      u.currentHp = Math.min(u.currentHp, wave.unitHp)
    }
    syncWavesToProject()
  }

  function devUpdateActiveWaveSpeed(speed: number) {
    const wave = currentWaveConfig.value
    if (!wave) return
    wave.unitSpeed = Math.max(0.2, Number(speed.toFixed(2)))
    syncWavesToProject()
  }

  function devUpdateActiveWaveCount(count: number) {
    const wave = currentWaveConfig.value
    if (!wave) return
    wave.unitCount = Math.max(1, Math.min(100, count))
    syncWavesToProject()
  }

  function devToggleActiveWaveImmunity(trait: TowerTraitType) {
    const wave = currentWaveConfig.value
    if (!wave) return
    if (!wave.immunities) wave.immunities = []
    const idx = wave.immunities.indexOf(trait)
    if (idx === -1) {
      wave.immunities.push(trait)
    } else {
      wave.immunities.splice(idx, 1)
    }
    for (const u of units.value) {
      if (!u.immunities) u.immunities = []
      if (idx === -1) {
        if (!u.immunities.includes(trait)) u.immunities.push(trait)
      } else {
        const uIdx = u.immunities.indexOf(trait)
        if (uIdx !== -1) u.immunities.splice(uIdx, 1)
      }
    }
    syncWavesToProject()
  }

  /**
   * Authentic 4-player Warcraft Burbenog TD map generator
   */
  function createSamplePathWithDoors() {
    const cols = mapStore.project.cols
    const rows = mapStore.project.rows
    const midC = Math.floor(cols / 2)
    const midR = Math.floor(rows / 2)

    const cornerDoors = [
      { col: 2, row: 2, assetId: 'sprite-stoneWallDoor_S' },
      { col: cols - 3, row: 2, assetId: 'sprite-stoneWallDoor_W' },
      { col: cols - 3, row: rows - 3, assetId: 'sprite-stoneWallDoor_N' },
      { col: 2, row: rows - 3, assetId: 'sprite-stoneWallDoor_E' },
    ]

    for (const d of cornerDoors) {
      mapStore.setTile(d.col, d.row, d.assetId, 'replace', 'layer-objects', false)
    }

    const pathCells: GridCoord[] = []
    const circleRadius = Math.min(5, Math.floor(cols / 10))
    
    // Top Circle (2, 2)
    for (let c = 2; c <= 2 + circleRadius; c++) {
      pathCells.push({ col: c, row: 2 }, { col: c, row: 2 + circleRadius })
    }
    for (let r = 2; r <= 2 + circleRadius; r++) {
      pathCells.push({ col: 2, row: r }, { col: 2 + circleRadius, row: r })
    }

    // Right Circle (cols - 3, 2)
    for (let c = cols - 3 - circleRadius; c <= cols - 3; c++) {
      pathCells.push({ col: c, row: 2 }, { col: c, row: 2 + circleRadius })
    }
    for (let r = 2; r <= 2 + circleRadius; r++) {
      pathCells.push({ col: cols - 3 - circleRadius, row: r }, { col: cols - 3, row: r })
    }

    // Bottom Circle (cols - 3, rows - 3)
    for (let c = cols - 3 - circleRadius; c <= cols - 3; c++) {
      pathCells.push({ col: c, row: rows - 3 - circleRadius }, { col: c, row: rows - 3 })
    }
    for (let r = rows - 3 - circleRadius; r <= rows - 3; r++) {
      pathCells.push({ col: cols - 3 - circleRadius, row: r }, { col: cols - 3, row: r })
    }

    // Left Circle (2, rows - 3)
    for (let c = 2; c <= 2 + circleRadius; c++) {
      pathCells.push({ col: c, row: rows - 3 - circleRadius }, { col: c, row: rows - 3 })
    }
    for (let r = rows - 3 - circleRadius; r <= rows - 3; r++) {
      pathCells.push({ col: 2, row: r }, { col: 2 + circleRadius, row: r })
    }

    // Connect Circles with Outer Lanes
    for (let c = 2 + circleRadius; c <= cols - 3 - circleRadius; c++) {
      pathCells.push({ col: c, row: 2 })
    }
    for (let r = 2 + circleRadius; r <= rows - 3 - circleRadius; r++) {
      pathCells.push({ col: cols - 3, row: r })
    }
    for (let c = 2 + circleRadius; c <= cols - 3 - circleRadius; c++) {
      pathCells.push({ col: c, row: rows - 3 })
    }
    for (let r = rows - 3 - circleRadius; r >= midR; r--) {
      pathCells.push({ col: 2, row: r })
    }

    // Central Gateway leading into Center
    for (let c = 2; c <= midC; c++) {
      pathCells.push({ col: c, row: midR })
    }

    // Center Platform
    for (let c = midC - 1; c <= midC + 1; c++) {
      for (let r = midR - 1; r <= midR + 1; r++) {
        pathCells.push({ col: c, row: r })
      }
    }

    mapStore.fillTiles(pathCells, 'sprite-stoneTile_E', 'layer-ground')
    mapStore.pushHistory("Created Warcraft Burbenog TD map (4 Circles & Center)")

    spawnAtRoute(0)
  }

  return {
    isEnabled,
    isPlaying,
    speed,
    unitSpeed,
    gameSpeed,
    setGameSpeed,
    spawnCount,
    spawnMode,
    formation,
    pairDistance,
    followCamera,
    showPathTrail,
    showSpawnPoints,
    autoLoop,
    isDrawingRoute,
    drawingWaypoints,
    drawingPath,
    customWaypoints,
    selectedWaypointIndex,
    routeUndoStack,
    routeRedoStack,
    canUndoRoute,
    canRedoRoute,
    customRoutes,
    units,
    spawnedUnitsCount,
    completedUnitsCount,
    lapCount,
    statusMessage,
    routes,
    selectedRouteIndex,
    selectedRoute,
    currentActiveRoute,
    progressPercent,
    syncRoutesFromProject,
    addRoute,
    getRouteForIndex,
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
    spawnAtRoute,
    startTour,
    pauseTour,
    togglePlay,
    resetTour,
    updateTick,
    updateClientInterpolation,
    gold,
    waveConfigs,
    currentWaveIndex,
    currentWaveConfig,
    selectWave,
    setWaveUnitCount,
    setWaveUnitHp,
    setWaveSpeed,
    setWaveGoldReward,
    setWaveUnitBonus,
    setWaveEndBonus,
    setWaveCharacterModel,
    setWaveAnimSpeed,
    setWaveOffsetY,
    setWaveUnitScale,
    setWaveUnitVariant,
    setWaveVariantTint,
    updateWaveConfig,
    addNewWave,
    deleteWave,
    isGameMode,
    entrySource,
    playerLives,
    maxLives,
    gameState,
    prepCountdown,
    startingGold,
    startingLives,
    wavePrepDuration,
    startPlayMode,
    exitPlayMode,
    startNextWaveInGame,
    restartGame,
    devResetGame,
    devAddGold,
    devSetGold,
    devSetStartingGold,
    devAddLives,
    devSetLives,
    devJumpToWave,
    devRestartCurrentWave,
    devClearAllCreeps,
    devSpawnWaveNow,
    devAddWave,
    devUpdateActiveWaveHp,
    devUpdateActiveWaveSpeed,
    devUpdateActiveWaveCount,
    devToggleActiveWaveImmunity,
    deleteCurrentRoute,
    isWaveSaveFeedback,
    saveCurrentWave,
    syncWavesToProject,
    restoreWavesFromProject,
    resetForNewProject,
    syncGameSettingsToProject,
    restoreGameSettingsFromProject,
    syncRoutesToProject,
    syncSpawnPointsToProject,
    isSettingSpawnPoint,
    spawnPointPlacementMode,
    isSettingPlayerStartPoint,
    addSpawnPoint,
    removeRoute,
    removeSpawnPoint,
    relocateCurrentRouteStart,
    relocateCurrentSpawnPoint,
    setPlayerStartPoint,
    relocateCurrentPlayerStartPoint,
    clearPlayerStartPoint,
    isLoadingGame,
    loadingProgress,
    loadingMapTitle,
    loadingMessage,
    loadingAssetsCount,
    startLoadingScreen,
    setLoadingProgress,
    finishLoadingScreen,
    createSamplePathWithDoors,
    blockedBuildingCellsSet,
    isCellBlockedForBuilding,
    fps,
    totalKills,
    totalGoldEarned,
    aliveEnemiesCount,
    leakedEnemiesCount,
    unitElevation,
    unitScaleMultiplier,
    syncCharacterConfigToProject,
    restoreCharacterConfigFromProject,
    deadEnemiesCount,
    totalWaveEnemiesCount,
  }
})
