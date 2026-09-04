import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { GridCoord } from '../types/map'
import { useMapStore } from './mapStore'
import { useToolStore } from './toolStore'
import { useTowerStore } from './towerStore'
import { useMultiplayerStore } from './multiplayerStore'
import { networkSyncBuffer } from '../services/networkSync'
import { gridToScreen } from '../utils/isometric'

export interface DoorInfo {
  id: string
  col: number
  row: number
  assetId: string
  name: string
  layerId: string
  quadrant: number // 0: Top, 1: Right, 2: Bottom, 3: Left
  isCorner: boolean
  cornerName?: string
  spawnCol: number
  spawnRow: number
}

export type CharacterAction = 'Idle' | 'Run' | 'Pickup'

export interface WaveConfig {
  waveNumber: number
  name: string
  unitHp: number
  unitSpeed: number
  unitCount: number
  isBoss: boolean
  goldReward: number
}

export interface CharacterUnit {
  id: string
  doorIndex: number
  doorId: string
  unitIndex: number
  pairIndex: number
  sideOffset: number // -1 (Left side) or +1 (Right side) for 2 people running side-by-side!
  currentCol: number
  currentRow: number
  screenX: number
  screenY: number
  direction: number // 0..7
  action: CharacterAction
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
  const spawnCount = ref(10) // Number of people per door (1 to 100)
  const spawnMode = ref<'all_doors' | 'single_door'>('all_doors') // All doors at once or single door
  const formation = ref<'pairs' | 'single'>('pairs') // 'pairs': 2 people side-by-side in each tile!
  const pairDistance = ref(0.35) // Constant spatial distance in tiles between consecutive pairs (tight and dense!)
  const followCamera = ref(false)
  const showPathTrail = ref(true)
  const autoLoop = ref(true)

  // Game Mode & Economy State (Configured per map in mapStore.project.gameSettings)
  const isGameMode = ref(false) // Toggle between Map Redaktor and Playable Game Mode
  const fps = ref(60) // Live Engine FPS Counter
  const totalKills = ref(0) // Total enemy units defeated
  const playerLives = ref(20)
  const maxLives = ref(20)
  const gameState = ref<'ready' | 'build_prep' | 'wave_running' | 'wave_completed' | 'game_over' | 'victory'>('ready')
  const prepCountdown = ref(10) // building countdown before each wave
  const gold = ref(150)
  const score = ref(0)
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
    loadingProgress.value = 5
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

  // Custom Route Drawing State
  const isDrawingRoute = ref(false)
  const customRoutes = ref<Record<string, GridCoord[]>>({}) // key: door.id or doorIndex
  const drawingPath = ref<GridCoord[]>([])

  // Wave distance progress per door
  const doorWaveProgress = ref<Record<number, number>>({})

  // Multi-unit Crowd Array
  const units = ref<CharacterUnit[]>([])
  const lapCount = ref(0)
  const statusMessage = ref("Waiting at spawn point")

  // Doors
  const detectedDoors = ref<DoorInfo[]>([])
  const selectedDoorIndex = ref(0)
  const doorRoutesCache = ref<Record<number, GridCoord[]>>({})

  const selectedDoor = computed<DoorInfo | null>(() => {
    if (detectedDoors.value.length === 0) return null
    const idx = Math.max(0, Math.min(detectedDoors.value.length - 1, selectedDoorIndex.value))
    return detectedDoors.value[idx] || null
  })

  const currentActiveRoute = computed<GridCoord[]>(() => {
    if (isDrawingRoute.value) {
      return drawingPath.value
    }
    return getRouteForDoor(selectedDoorIndex.value)
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
      const route = getRouteForDoor(u.doorIndex)
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

  function detectDoors(): DoorInfo[] {
    const p = mapStore.project as any

    // 1. If project already has saved spawn points, restore them
    if (p.spawnPoints && Array.isArray(p.spawnPoints) && p.spawnPoints.length > 0) {
      detectedDoors.value = p.spawnPoints.map((s: any) => {
        const c = s.col !== undefined ? s.col : (s.spawnCol ?? 2)
        const r = s.row !== undefined ? s.row : (s.spawnRow ?? 2)
        return {
          id: s.id || `spawn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          col: c,
          row: r,
          spawnCol: c,
          spawnRow: r,
          assetId: s.assetId || '',
          name: s.name || `Spawn Point (${c}, ${r})`,
          layerId: s.layerId || 'layer-ground',
          quadrant: s.quadrant ?? 0,
          isCorner: s.isCorner ?? true,
          cornerName: s.cornerName,
        }
      })
      if (selectedDoorIndex.value >= detectedDoors.value.length || selectedDoorIndex.value < 0) {
        selectedDoorIndex.value = 0
      }
      if (p.customRoutes) {
        customRoutes.value = { ...p.customRoutes }
      }
      doorRoutesCache.value = {}
      if (detectedDoors.value.length > 0) {
        spawnAtDoor(selectedDoorIndex.value)
      }
      return detectedDoors.value
    }

    // 2. Otherwise: start with empty spawn points on new maps (user adds them explicitly)
    detectedDoors.value = []
    selectedDoorIndex.value = 0
    doorRoutesCache.value = {}
    units.value = []
    return []
  }

  function addSpawnPoint(col: number, row: number, customName?: string) {
    const cols = mapStore.project.cols
    const rows = mapStore.project.rows
    const midC = Math.floor(cols / 2)
    const midR = Math.floor(rows / 2)

    let quadrant = 0
    let cornerName = 'Circle 1 (North)'
    if (col <= midC && row <= midR) {
      quadrant = 0
      cornerName = "Circle 1 (North)"
    } else if (col >= midC && row <= midR) {
      quadrant = 1
      cornerName = "Circle 2 (East)"
    } else if (col >= midC && row >= midR) {
      quadrant = 2
      cornerName = "Circle 3 (South)"
    } else {
      quadrant = 3
      cornerName = "Circle 4 (West)"
    }

    const num = detectedDoors.value.length + 1
    const newPoint: DoorInfo = {
      id: `spawn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      col,
      row,
      spawnCol: col,
      spawnRow: row,
      quadrant,
      isCorner: true,
      cornerName,
      assetId: '',
      layerId: 'layer-ground',
      name: customName || `Spawn Point ${num} (${col}, ${row})`,
    }

    detectedDoors.value.push(newPoint)
    selectedDoorIndex.value = detectedDoors.value.length - 1
    syncSpawnPointsToProject()
    doorRoutesCache.value = {}
    spawnAtDoor(selectedDoorIndex.value)
    mapStore.pushHistory(`Added spawn point (${col}, ${row})`)
    return newPoint
  }

  function relocateCurrentSpawnPoint(col: number, row: number) {
    if (detectedDoors.value.length === 0) {
      addSpawnPoint(col, row)
      return
    }
    const idx = Math.max(0, Math.min(detectedDoors.value.length - 1, selectedDoorIndex.value))
    const pt = detectedDoors.value[idx]
    if (pt) {
      pt.col = col
      pt.row = row
      pt.spawnCol = col
      pt.spawnRow = row
      pt.name = `Spawn Point ${idx + 1} (${col}, ${row})`
      syncSpawnPointsToProject()
      doorRoutesCache.value = {}
      spawnAtDoor(idx)
      mapStore.pushHistory(`Moved spawn point to (${col}, ${row})`)
    }
  }

  function removeSpawnPoint(idx: number) {
    if (idx < 0 || idx >= detectedDoors.value.length) return
    const removed = detectedDoors.value[idx]
    detectedDoors.value.splice(idx, 1)
    if (detectedDoors.value.length === 0) {
      selectedDoorIndex.value = 0
      units.value = []
      statusMessage.value = "No spawn point configured"
    } else {
      selectedDoorIndex.value = Math.max(0, Math.min(detectedDoors.value.length - 1, idx > 0 ? idx - 1 : 0))
    }
    syncSpawnPointsToProject()
    doorRoutesCache.value = {}
    if (detectedDoors.value.length > 0) {
      spawnAtDoor(selectedDoorIndex.value)
    }
    mapStore.pushHistory(`Deleted ${removed ? removed.name : 'spawn point'}`)
  }

  function syncSpawnPointsToProject() {
    (mapStore.project as any).spawnPoints = detectedDoors.value.map(d => ({
      id: d.id,
      col: d.col,
      row: d.row,
      spawnCol: d.spawnCol,
      spawnRow: d.spawnRow,
      name: d.name,
      quadrant: d.quadrant,
      isCorner: d.isCorner,
      cornerName: d.cornerName,
      assetId: d.assetId,
    }))
  }

  function getRouteForDoor(doorIdx: number): GridCoord[] {
    const door = detectedDoors.value[doorIdx]
    if (!door) return []
    const doorKey = door.id || `door-${doorIdx}`

    if (customRoutes.value[doorKey] && customRoutes.value[doorKey].length > 0) {
      return customRoutes.value[doorKey]
    }

    // Default route: only the spawn point cell until user draws their custom path
    return [{ col: door.spawnCol ?? door.col, row: door.spawnRow ?? door.row }]
  }

  const blockedBuildingCellsSet = computed<Set<string>>(() => {
    const set = new Set<string>()

    // 1. All spawn points / doors
    for (const d of detectedDoors.value) {
      set.add(`${d.col},${d.row}`)
      if (d.spawnCol !== undefined && d.spawnRow !== undefined) {
        set.add(`${d.spawnCol},${d.spawnRow}`)
      }
    }

    // 2. All custom routes for each door
    if (customRoutes.value) {
      for (const route of Object.values(customRoutes.value)) {
        if (Array.isArray(route)) {
          for (const pt of route) {
            set.add(`${pt.col},${pt.row}`)
          }
        }
      }
    }

    // 3. Project custom routes fallback
    if (mapStore.project?.customRoutes) {
      for (const route of Object.values(mapStore.project.customRoutes)) {
        if (Array.isArray(route)) {
          for (const pt of route) {
            set.add(`${pt.col},${pt.row}`)
          }
        }
      }
    }

    return set
  })

  function isCellBlockedForBuilding(col: number, row: number): boolean {
    return blockedBuildingCellsSet.value.has(`${col},${row}`)
  }

  // --- CUSTOM ROUTE DRAWING ACTIONS ---

  function startDrawingCustomRoute() {
    pauseTour()
    isDrawingRoute.value = true
    toolStore.setTool('select')

    const startPt = selectedDoor.value 
      ? { col: selectedDoor.value.spawnCol ?? selectedDoor.value.col, row: selectedDoor.value.spawnRow ?? selectedDoor.value.row } 
      : { col: 2, row: 2 }

    const doorKey = selectedDoor.value ? selectedDoor.value.id : `door-${selectedDoorIndex.value}`
    
    // If a route already exists for this door, start from it, otherwise start with the spawn point
    if (customRoutes.value[doorKey] && customRoutes.value[doorKey].length > 0) {
      drawingPath.value = [...customRoutes.value[doorKey]]
    } else {
      drawingPath.value = [startPt]
    }
    
    statusMessage.value = "✏️ Click consecutive cells on the map to draw. Finish your route anywhere!"
  }

  function addPathTile(coord: GridCoord) {
    if (!isDrawingRoute.value) return
    const len = drawingPath.value.length

    if (len > 0) {
      const last = drawingPath.value[len - 1]
      if (last.col === coord.col && last.row === coord.row) return

      // Connect straight line if adjacent or clicked ahead
      const dc = Math.sign(coord.col - last.col)
      const dr = Math.sign(coord.row - last.row)
      
      let currC = last.col
      let currR = last.row
      while (currC !== coord.col || currR !== coord.row) {
        if (currC !== coord.col) currC += dc
        if (currR !== coord.row) currR += dr
        drawingPath.value.push({ col: currC, row: currR })
      }
    } else {
      drawingPath.value.push(coord)
    }
  }

  function undoLastPathTile() {
    if (drawingPath.value.length > 1) {
      drawingPath.value.pop()
    }
  }

  function clearDrawnRoute() {
    const startPt = selectedDoor.value 
      ? { col: selectedDoor.value.spawnCol ?? selectedDoor.value.col, row: selectedDoor.value.spawnRow ?? selectedDoor.value.row } 
      : { col: 2, row: 2 }
    drawingPath.value = [startPt]
  }

  function finishDrawingRoute() {
    if (drawingPath.value.length > 1) {
      const doorKey = selectedDoor.value ? selectedDoor.value.id : `door-${selectedDoorIndex.value}`
      customRoutes.value[doorKey] = [...drawingPath.value]
      mapStore.project.customRoutes = { ...customRoutes.value }
      mapStore.project.characterConfig = {
        spawnCount: spawnCount.value,
        speed: speed.value,
        spawnMode: spawnMode.value,
        formation: formation.value,
        pairDistance: pairDistance.value,
        selectedDoorIndex: selectedDoorIndex.value,
        followCamera: followCamera.value,
        showPathTrail: showPathTrail.value,
        autoLoop: autoLoop.value,
      }
      isDrawingRoute.value = false
      doorRoutesCache.value = {}
      spawnAtDoor(selectedDoorIndex.value)
      mapStore.pushHistory(`Saved route (${drawingPath.value.length} cells)`)
      statusMessage.value = `✅ Route saved (${drawingPath.value.length} cells)! Ready to begin movement.`
    } else {
      isDrawingRoute.value = false
      statusMessage.value = "Route drawing cancelled (at least 2 cells required)"
    }
  }

  function cancelDrawingRoute() {
    isDrawingRoute.value = false
    statusMessage.value = "Route drawing cancelled"
  }

  function deleteCurrentRoute() {
    const doorKey = selectedDoor.value ? selectedDoor.value.id : `door-${selectedDoorIndex.value}`
    delete customRoutes.value[doorKey]
    if (mapStore.project.customRoutes) {
      delete mapStore.project.customRoutes[doorKey]
    }
    doorRoutesCache.value = {}
    spawnAtDoor(selectedDoorIndex.value)
    mapStore.pushHistory("Route deleted")
    statusMessage.value = "Route deleted"
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

  function setWaveGoldReward(reward: number) {
    if (currentWaveConfig.value) {
      currentWaveConfig.value.goldReward = reward
    }
    syncWavesToProject()
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

  function syncGameSettingsToProject() {
    if (!mapStore.project) return
    mapStore.project.gameSettings = {
      startingGold: Number(startingGold.value) || 150,
      startingLives: Number(startingLives.value) || 20,
      wavePrepTime: Number(wavePrepDuration.value) || 10,
    }
  }

  function restoreGameSettingsFromProject() {
    const p = mapStore.project as any
    if (p && p.gameSettings) {
      const gs = p.gameSettings
      startingGold.value = gs.startingGold ?? 150
      startingLives.value = gs.startingLives ?? 20
      wavePrepDuration.value = gs.wavePrepTime ?? 10
      gold.value = startingGold.value
      maxLives.value = startingLives.value
      playerLives.value = startingLives.value
      prepCountdown.value = wavePrepDuration.value
    }
  }

  function syncWavesToProject() {
    if (!mapStore.project) return
    ;(mapStore.project as any).waveConfigs = waveConfigs.value.map(w => ({ ...w }))
    ;(mapStore.project as any).currentWaveIndex = currentWaveIndex.value
    syncGameSettingsToProject()
  }

  function restoreWavesFromProject() {
    const p = mapStore.project as any
    const waves = p.waveConfigs || p.waveData?.waveConfigs || []
    if (waves && Array.isArray(waves) && waves.length > 0) {
      waveConfigs.value = waves.map((w: any) => ({ ...w }))
      currentWaveIndex.value = Math.max(0, Math.min(waveConfigs.value.length - 1, p.currentWaveIndex ?? p.waveData?.currentWaveIndex ?? 0))
    }
    restoreGameSettingsFromProject()
  }

  function addNewWave() {
    const nextNum = waveConfigs.value.length + 1
    const prevWave = waveConfigs.value[waveConfigs.value.length - 1]
    const baseHp = prevWave ? Math.round(prevWave.unitHp * 1.5) : 200
    const baseCount = prevWave ? Math.min(50, prevWave.unitCount + 2) : 10
    const baseReward = prevWave ? Math.round(prevWave.goldReward * 1.4) : 80

    waveConfigs.value.push({
      waveNumber: nextNum,
      name: `Wave ${nextNum} (New Wave)`,
      unitHp: baseHp,
      unitSpeed: 3.5,
      unitCount: baseCount,
      isBoss: nextNum % 5 === 0,
      goldReward: baseReward,
    })

    syncWavesToProject()
    selectWave(waveConfigs.value.length - 1)
  }

  function deleteWave(idx: number) {
    if (waveConfigs.value.length <= 1) return
    waveConfigs.value.splice(idx, 1)
    // Re-number remaining waves
    waveConfigs.value.forEach((w, i) => {
      w.waveNumber = i + 1
    })
    syncWavesToProject()
    selectWave(Math.max(0, idx - 1))
  }

  // --- MULTI-UNIT CROWD INITIALIZATION & SPAWNING ---

  /**
   * Initializes units:
   * Uses spatial distance spacing (distance in tiles) so units stay tightly packed at any speed!
   */
  function initializeUnits() {
    if (detectedDoors.value.length === 0) {
      units.value = []
      return
    }

    const list: CharacterUnit[] = []
    const waveCfg = currentWaveConfig.value
    const count = Math.max(1, Math.min(100, waveCfg ? waveCfg.unitCount : spawnCount.value))
    const isPairFormation = formation.value === 'pairs'

    const activeDoorsToSpawn = (spawnMode.value === 'all_doors' && detectedDoors.value.length > 1)
      ? detectedDoors.value.map((_, idx) => idx)
      : [selectedDoorIndex.value]

    const progressMap: Record<number, number> = {}
    const baseHp = waveCfg ? waveCfg.unitHp : 100

    for (const dIdx of activeDoorsToSpawn) {
      progressMap[dIdx] = 0 // Leader starts at distance 0
      const route = getRouteForDoor(dIdx)
      const startPt = route[0] || { col: 2, row: 2 }
      const startScreen = gridToScreen(startPt.col, startPt.row, mapStore.project.tileWidth, mapStore.project.tileHeight)
      const door = detectedDoors.value[dIdx]
      const doorId = door ? door.id : `door-${dIdx}`

      for (let i = 0; i < count; i++) {
        const pairIndex = isPairFormation ? Math.floor(i / 2) : i
        const sideOffset = isPairFormation ? (i % 2 === 0 ? -1 : 1) : 0

        list.push({
          id: `unit-d${dIdx}-${i}-${Date.now()}`,
          doorIndex: dIdx,
          doorId,
          unitIndex: i,
          pairIndex,
          sideOffset,
          currentCol: startPt.col,
          currentRow: startPt.row,
          screenX: startScreen.x,
          screenY: startScreen.y,
          direction: 2,
          action: 'Idle',
          frameIndex: (i * 2) % 10,
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
        })
      }
    }

    doorWaveProgress.value = progressMap
    units.value = list
  }

  function spawnAtDoor(doorIdx?: number) {
    if (doorIdx !== undefined) {
      selectedDoorIndex.value = doorIdx
    }
    initializeUnits()
    isPlaying.value = false
    const totalCount = units.value.length
    const hpStr = currentWaveConfig.value ? `(HP: ${currentWaveConfig.value.unitHp})` : ''
    statusMessage.value = spawnMode.value === 'all_doors' && detectedDoors.value.length > 1
      ? `All ${detectedDoors.value.length} spawn points ready (${totalCount} units ${hpStr})`
      : `${selectedDoor.value?.name || 'Spawn point'} ready (${totalCount} units ${hpStr})`
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
    const fromScreen = gridToScreen(fromCol, fromRow, mapStore.project.tileWidth, mapStore.project.tileHeight)
    const toScreen = gridToScreen(toCol, toRow, mapStore.project.tileWidth, mapStore.project.tileHeight)

    const dx = toScreen.x - fromScreen.x
    const dy = toScreen.y - fromScreen.y

    if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return 2

    let angle = Math.atan2(dy, dx)
    if (angle < 0) angle += 2 * Math.PI

    const sector = Math.floor(((angle + Math.PI / 8) % (2 * Math.PI)) / (Math.PI / 4))
    const dirMap = [1, 2, 3, 4, 5, 6, 7, 0]
    return dirMap[sector] !== undefined ? dirMap[sector] : 2
  }

  /**
   * Main multi-unit animation & movement tick
   * deltaSec is already scaled by gameSpeed (simulation multiplier) in engine.onTick!
   */
  function updateTick(deltaSec: number) {
    if (!isEnabled.value) return

    // 10-second building & prep phase in Play Mode
    if (isGameMode.value && gameState.value === 'build_prep') {
      prepCountdown.value -= deltaSec
      if (prepCountdown.value <= 0) {
        prepCountdown.value = 0
        startNextWaveInGame()
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
            unit.frameIndex = (unit.frameIndex + 1) % 4
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

    // Advance wave distance along path for each door
    for (const dIdxStr in doorWaveProgress.value) {
      const dIdx = Number(dIdxStr)
      doorWaveProgress.value[dIdx] += stepDistance
    }

    let allCompletedOrDead = true
    let leaderUnit: CharacterUnit | null = null

    for (const unit of units.value) {
      const route = getRouteForDoor(unit.doorIndex)
      if (!route || route.length <= 1) continue

      // Dead unit handling: play bending / collapsing animation and fade out opacity
      if (unit.isDead) {
        unit.action = 'Pickup'
        unit.animTimer += deltaSec
        if (unit.animTimer >= 0.08) {
          unit.animTimer = 0
          if (unit.frameIndex < 4) {
            unit.frameIndex++
          }
        }
        if (unit.deathFade > 0) {
          unit.deathFade = Math.max(0, unit.deathFade - deltaSec * 1.2)
        }
        continue
      }

      const waveDist = doorWaveProgress.value[unit.doorIndex] ?? 0
      const unitDist = waveDist - (unit.pairIndex * spacingInTiles)

      // Unit has not emerged from door yet
      if (unitDist < 0) {
        unit.isSpawned = false
        unit.action = 'Idle'
        allCompletedOrDead = false
        continue
      }

      unit.isSpawned = true

      // Unit has reached the center/destination
      if (unitDist >= route.length - 1) {
        if (!unit.hasReachedEnd) {
          unit.hasReachedEnd = true
          // Deduct life in Game Mode
          if (isGameMode.value && gameState.value === 'wave_running') {
            playerLives.value = Math.max(0, playerLives.value - 1)
            if (playerLives.value <= 0) {
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
          unit.frameIndex = (unit.frameIndex + 1) % 10
        }
        unit.currentCol = route[route.length - 1].col
        unit.currentRow = route[route.length - 1].row
        const ptScreen = gridToScreen(unit.currentCol, unit.currentRow, tileWidth, tileHeight)
        unit.screenX = ptScreen.x
        unit.screenY = ptScreen.y
        continue
      }

      allCompletedOrDead = false
      if (!leaderUnit && unit.doorIndex === selectedDoorIndex.value) {
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

      // Side-by-side (2 units side-by-side) perpendicular offset calculation
      if (formation.value === 'pairs' && unit.sideOffset !== 0) {
        const ptAScreen = gridToScreen(ptA.col, ptA.row, tileWidth, tileHeight)
        const ptBScreen = gridToScreen(ptB.col, ptB.row, tileWidth, tileHeight)
        const dx = ptBScreen.x - ptAScreen.x
        const dy = ptBScreen.y - ptAScreen.y
        const len = Math.hypot(dx, dy) || 1
        const perpX = -dy / len
        const perpY = dx / len

        const offsetDist = tileWidth * 0.15 * unit.sideOffset
        unit.screenX = baseScreen.x + perpX * offsetDist
        unit.screenY = baseScreen.y + perpY * offsetDist
      } else {
        unit.screenX = baseScreen.x
        unit.screenY = baseScreen.y
      }

      if (idxA !== idxB) {
        unit.direction = calculateDirection(ptA.col, ptA.row, ptB.col, ptB.row)
      }

      // Animation frame duration
      unit.animTimer += deltaSec
      const frameDuration = 0.07 / Math.min(5, unitBaseSpeed / 2.5)
      if (unit.animTimer >= frameDuration) {
        unit.animTimer = 0
        unit.frameIndex = (unit.frameIndex + 1) % 10
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
      const reward = completedWave ? completedWave.goldReward : 50

      if (isGameMode.value) {
        if (playerLives.value > 0) {
          if (multiplayerStore.roomId) {
            for (const p of multiplayerStore.players) {
              p.gold = (p.gold || 0) + reward
              p.score = (p.score || 0) + reward * 10
              if (p.id === multiplayerStore.myPlayerId) {
                gold.value = p.gold
                score.value = p.score
              }
            }
          } else {
            gold.value += reward
            score.value += reward * 10
          }

          if (currentWaveIndex.value >= waveConfigs.value.length - 1) {
            gameState.value = 'victory'
            isPlaying.value = false
            statusMessage.value = "🏆 Victory! All waves successfully cleared!"
          } else {
            // Next wave: Enter building & prep phase!
            currentWaveIndex.value++
            gameState.value = 'build_prep'
            prepCountdown.value = wavePrepDuration.value
            isPlaying.value = false
            spawnAtDoor(0)
            statusMessage.value = `🎉 ${completedWave?.name || 'Wave'} cleared! +${reward} Gold. ${wavePrepDuration.value}s build prep...`
          }
        }
      } else {
        // Redaktor mode: Stop after testing the wave
        gold.value += reward
        pauseTour()
        statusMessage.value = `🎉 ${completedWave?.name || 'Wave'} test completed!`
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
    towerStore.saveEditorTowersSnapshot()
    towerStore.clearCombatEffects()
    isGameMode.value = true
    const initLives = startingLives.value
    maxLives.value = initLives
    playerLives.value = initLives
    gold.value = startingGold.value
    score.value = 0
    currentWaveIndex.value = 0
    gameState.value = 'build_prep'
    prepCountdown.value = wavePrepDuration.value
    gameSpeed.value = 1.0
    followCamera.value = false
    spawnAtDoor(0)
    isPlaying.value = false
  }

  function setGameSpeed(speed: number) {
    gameSpeed.value = speed
  }

  function exitPlayMode() {
    isGameMode.value = false
    gameState.value = 'ready'
    isPlaying.value = false
    followCamera.value = false
    resetTour()
    towerStore.restoreEditorTowersSnapshot()
  }

  function startNextWaveInGame() {
    towerStore.clearCombatEffects()
    gameState.value = 'wave_running'
    prepCountdown.value = 0
    spawnAtDoor(0)
    startTour()
  }

  function testWave(idx?: number) {
    towerStore.clearCombatEffects()
    if (idx !== undefined) {
      selectWave(idx)
    }
    spawnAtDoor(0)
    startTour()
  }

  function restartGame() {
    towerStore.restoreEditorTowersSnapshot()
    startPlayMode()
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

    spawnAtDoor(0)
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
    autoLoop,
    isDrawingRoute,
    drawingPath,
    customRoutes,
    units,
    spawnedUnitsCount,
    completedUnitsCount,
    lapCount,
    statusMessage,
    detectedDoors,
    selectedDoorIndex,
    selectedDoor,
    currentActiveRoute,
    progressPercent,
    detectDoors,
    getRouteForDoor,
    startDrawingCustomRoute,
    addPathTile,
    undoLastPathTile,
    clearDrawnRoute,
    finishDrawingRoute,
    cancelDrawingRoute,
    spawnAtDoor,
    startTour,
    pauseTour,
    togglePlay,
    resetTour,
    updateTick,
    updateClientInterpolation,
    gold,
    score,
    waveConfigs,
    currentWaveIndex,
    currentWaveConfig,
    selectWave,
    setWaveUnitCount,
    setWaveUnitHp,
    setWaveSpeed,
    setWaveGoldReward,
    updateWaveConfig,
    addNewWave,
    deleteWave,
    isGameMode,
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
    testWave,
    restartGame,
    deleteCurrentRoute,
    isWaveSaveFeedback,
    saveCurrentWave,
    syncWavesToProject,
    restoreWavesFromProject,
    syncGameSettingsToProject,
    restoreGameSettingsFromProject,
    syncSpawnPointsToProject,
    isSettingSpawnPoint,
    spawnPointPlacementMode,
    addSpawnPoint,
    relocateCurrentSpawnPoint,
    removeSpawnPoint,
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
    aliveEnemiesCount,
    leakedEnemiesCount,
    deadEnemiesCount,
    totalWaveEnemiesCount,
  }
})
