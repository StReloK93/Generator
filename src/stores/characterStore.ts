import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { GridCoord, UnitVariantType, WaveConfig, TowerTraitType, RouteInfo, Route } from '../types/map'
import { useMapStore } from './mapStore'
import { useToolStore } from './toolStore'
import { useTowerStore } from './towerStore'
import { useMultiplayerStore } from './multiplayerStore'
import { useRouteStore } from './routeStore'
import { useWaveStore } from './waveStore'
import { useGameStore } from './gameStore'
import { networkSyncBuffer } from '../services/networkSync'
import { gridToScreen } from '../utils/isometric'
import characterManifest from '../assets/generated/characterManifest.json'
import { CrowdSimulation, GameStateMachine } from '../domain/simulation'

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
  const routeStore = useRouteStore()
  const waveStore = useWaveStore()
  const gameStore = useGameStore()

  // --- UNIT SIMULATION & HARAKAT STATE ---
  const isEnabled = ref(true)
  const isPlaying = ref(false)
  const unitSpeed = ref(2.5) // Unit Walking Speed (tiles per second, 0.8 to 6.0)
  const speed = unitSpeed // Backward-compat alias
  const spawnCount = ref(10)
  const formation = ref<'pairs' | 'single'>('pairs')
  const pairDistance = ref(0.35)
  const followCamera = ref(false)
  const showPathTrail = ref(true)
  const showSpawnPoints = ref(true)
  const autoLoop = ref(true)
  const unitElevation = ref(0)
  const unitScaleMultiplier = ref(1.0)
  const fps = ref(60)

  // Units array & crowd tracking
  const units = ref<CharacterUnit[]>([])
  const lapCount = ref(0)
  const routeWaveProgress = ref<Record<number, number>>({})
  const statusMessage = ref('Waiting at spawn point')

  // --- COMPUTEDS ---
  const spawnedUnitsCount = computed(() => {
    return units.value.filter(u => u.isSpawned && !u.hasReachedEnd).length
  })

  const completedUnitsCount = computed(() => {
    return units.value.filter(u => u.hasReachedEnd).length
  })

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
      const route = routeStore.getRouteForIndex(u.routeIndex ?? 0)
      const maxLen = Math.max(1, route.length - 1)
      totalInterp += Math.min(100, Math.round((u.pathIndex / maxLen) * 100))
    }
    return Math.round(totalInterp / active.length)
  })

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
  function initializeUnits() {
    if (routeStore.routes.length === 0) {
      units.value = []
      return
    }

    const list: CharacterUnit[] = []
    const waveCfg = waveStore.currentWaveConfig
    const count = Math.max(1, Math.min(100, waveCfg ? waveCfg.unitCount : spawnCount.value))
    const isPairFormation = formation.value === 'pairs'
    const model: CharacterModel = (waveCfg?.characterModel as CharacterModel) || 'male'
    const initialMaxFrames = getModelActionFrameCount(model, 'Run')

    const activeRoutesToSpawn = (gameStore.spawnMode === 'all_routes' && routeStore.routes.length > 1)
      ? routeStore.routes.map((_, idx) => idx)
      : [routeStore.selectedRouteIndex !== null && routeStore.selectedRouteIndex >= 0 ? routeStore.selectedRouteIndex : 0]

    const progressMap: Record<number, number> = {}
    const baseHp = waveCfg ? waveCfg.unitHp : 100

    for (const rIdx of activeRoutesToSpawn) {
      progressMap[rIdx] = 0 // Leader starts at distance 0
      const route = routeStore.getRouteForIndex(rIdx)
      const startPt = route[0] || { col: 2, row: 2 }
      const startScreen = gridToScreen(startPt.col, startPt.row, mapStore.project.tileWidth, mapStore.project.tileHeight)
      const routeItem = routeStore.routes[rIdx]
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
          isSpawned: pairIndex === 0, // First pair visible immediately
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
    if (routeIdx !== undefined && routeIdx !== null) {
      routeStore.selectedRouteIndex = routeIdx
    }
    initializeUnits()
    isPlaying.value = false
    const totalCount = units.value.length
    const hpStr = waveStore.currentWaveConfig ? `(HP: ${waveStore.currentWaveConfig.unitHp})` : ''
    statusMessage.value = gameStore.spawnMode === 'all_routes' && routeStore.routes.length > 1
      ? `All ${routeStore.routes.length} routes ready (${totalCount} units ${hpStr})`
      : `${routeStore.selectedRoute?.name || 'Route'} ready (${totalCount} units ${hpStr})`
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
    const waveName = waveStore.currentWaveConfig ? waveStore.currentWaveConfig.name : 'Units'
    statusMessage.value = `${waveName} — ${units.value.length} units marching to target...`
  }

  function pauseTour() {
    isPlaying.value = false
    for (const u of units.value) {
      if (!u.hasReachedEnd && !u.isDead) {
        u.action = 'Idle'
      }
    }
    statusMessage.value = 'Movement paused'
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
    statusMessage.value = 'Reset to spawn point and ready'
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
   */
  function updateTick(deltaSec: number) {
    if (!isEnabled.value) return

    // Building & prep phase in Play Mode
    if (gameStore.isGameMode && gameStore.gameState === 'build_prep') {
      if (multiplayerStore.roomId) {
        gameStore.prepCountdown -= deltaSec
        if (gameStore.prepCountdown <= 0) {
          gameStore.prepCountdown = 0
          startNextWaveInGame()
        }
      }
      return
    }

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
    const waveCfg = waveStore.currentWaveConfig
    const unitBaseSpeed = waveCfg ? waveCfg.unitSpeed : 2.5
    const stepDistance = unitBaseSpeed * deltaSec
    const spacingInTiles = pairDistance.value

    for (const rIdxStr in routeWaveProgress.value) {
      const rIdx = Number(rIdxStr)
      routeWaveProgress.value[rIdx] += stepDistance
    }

    let allCompletedOrDead = true
    let leaderUnit: CharacterUnit | null = null

    for (const unit of units.value) {
      const route = routeStore.getRouteForIndex(unit.routeIndex ?? 0)
      if (!route || route.length <= 1) continue

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

      // 1. PROCESS STATUS EFFECTS
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
          gameStore.totalKills++
        }
      }

      if (unit.isDead) continue

      const speedMultiplier = Math.max(0.15, 1.0 - (Math.min(85, maxSlowPercent) / 100))
      const waveDist = routeWaveProgress.value[unit.routeIndex ?? 0] ?? 0
      const targetSpawnDist = unit.pairIndex * spacingInTiles

      if (waveDist < targetSpawnDist && (unit.distanceTraveled === undefined || unit.distanceTraveled === 0)) {
        unit.isSpawned = false
        unit.action = 'Idle'
        allCompletedOrDead = false
        continue
      }

      unit.isSpawned = true

      if (unit.distanceTraveled === undefined) {
        unit.distanceTraveled = Math.max(0, waveDist - targetSpawnDist)
      } else {
        unit.distanceTraveled += (unitBaseSpeed * speedMultiplier) * deltaSec
      }

      const unitDist = unit.distanceTraveled

      if (unitDist >= route.length - 1) {
        if (!unit.hasReachedEnd) {
          unit.hasReachedEnd = true
          if (gameStore.isGameMode && gameStore.gameState === 'wave_running') {
            const lifeRes = GameStateMachine.deductLife(gameStore.playerLives)
            gameStore.playerLives = lifeRes.remainingLives
            if (lifeRes.isGameOver) {
              gameStore.gameState = 'game_over'
              isPlaying.value = false
              statusMessage.value = 'Defeat! All lives lost.'
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
      if (!leaderUnit && unit.routeIndex === routeStore.selectedRouteIndex) {
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

      unit.animTimer += deltaSec
      const maxRun = getModelActionFrameCount(unit.characterModel, 'Run')
      const animMultiplier = unit.animSpeed || waveStore.currentWaveConfig?.animSpeed || 1.0
      const frameDuration = ((maxRun > 15 ? 0.04 : 0.07) / Math.min(5, unitBaseSpeed / 2.5)) / Math.max(0.1, animMultiplier)
      if (unit.animTimer >= frameDuration) {
        unit.animTimer = 0
        unit.frameIndex = (unit.frameIndex + 1) % maxRun
      }
    }

    // Camera follow leader
    if (followCamera.value && isPlaying.value && leaderUnit && leaderUnit.isSpawned && !leaderUnit.isDead && !leaderUnit.hasReachedEnd) {
      const panX = window.innerWidth / 2 - leaderUnit.screenX * toolStore.zoom
      const panY = window.innerHeight / 2 - leaderUnit.screenY * toolStore.zoom
      toolStore.pan.x += (panX - toolStore.pan.x) * 0.08
      toolStore.pan.y += (panY - toolStore.pan.y) * 0.08
    }

    // Wave completion
    if (allCompletedOrDead && units.value.length > 0) {
      lapCount.value++
      const completedWave = waveStore.currentWaveConfig
      const reward = completedWave ? (completedWave.endWaveBonus ?? completedWave.goldReward ?? 50) : 50

      if (gameStore.isGameMode) {
        if (gameStore.playerLives > 0) {
          if (multiplayerStore.roomId) {
            for (const p of multiplayerStore.players) {
              p.gold = (p.gold || 0) + reward
              p.totalGoldEarned = (p.totalGoldEarned || p.gold || 0) + reward
              if (p.id === multiplayerStore.myPlayerId) {
                gameStore.gold = p.gold
                gameStore.totalGoldEarned = p.totalGoldEarned
              }
            }
          } else {
            gameStore.gold += reward
            gameStore.totalGoldEarned += reward
          }

          const completion = GameStateMachine.evaluateWaveCompletion(
            waveStore.currentWaveIndex,
            waveStore.waveConfigs.length
          )

          if (completion.isVictory) {
            gameStore.gameState = 'victory'
            isPlaying.value = false
            statusMessage.value = 'Victory! All waves successfully cleared!'
          } else {
            waveStore.currentWaveIndex++
            gameStore.gameState = 'build_prep'
            gameStore.prepCountdown = gameStore.wavePrepDuration
            isPlaying.value = false
            spawnAtRoute(0)
            if (multiplayerStore.roomId) {
              statusMessage.value = `${completedWave?.name || 'Wave'} cleared! +${reward} Gold. ${gameStore.wavePrepDuration}s build prep...`
            } else {
              statusMessage.value = `${completedWave?.name || 'Wave'} cleared! +${reward} Gold. Click Start to begin next wave.`
            }
          }
        }
      } else {
        gameStore.gold += reward
        pauseTour()
        statusMessage.value = `${completedWave?.name || 'Wave'} test completed!`
      }
    }
  }

  function updateClientInterpolation(deltaSec: number) {
    networkSyncBuffer.interpolate(deltaSec)
  }

  function startPlayMode() {
    gameStore.startPlayMode()
    followCamera.value = false
    spawnAtRoute(0)
    isPlaying.value = false
    statusMessage.value = multiplayerStore.roomId 
      ? `Battle starting in ${gameStore.wavePrepDuration}s...` 
      : 'Ready! Place defense towers and click Start to begin.'
  }

  function exitPlayMode() {
    gameStore.exitPlayMode()
    isPlaying.value = false
    followCamera.value = false
    resetTour()
  }

  function startNextWaveInGame() {
    gameStore.startNextWaveInGame()
    spawnAtRoute(0)
    startTour()
  }

  function restartGame() {
    gameStore.restartGame()
    startPlayMode()
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

  function resetForNewProject() {
    routeStore.resetForNewProject()
    waveStore.resetForNewProject()
    gameStore.resetForNewProject()
    units.value = []
    unitSpeed.value = 2.5
    spawnCount.value = 10
    formation.value = 'pairs'
    pairDistance.value = 0.35
    followCamera.value = false
    showPathTrail.value = true
    autoLoop.value = true
    unitElevation.value = 0
    unitScaleMultiplier.value = 1.0
    lapCount.value = 0
    statusMessage.value = 'Waiting at spawn point'
  }

  // --- RE-EXPORTS & BRIDGES FOR COMPATIBILITY ---
  return {
    // Unit state
    units,
    isEnabled,
    isPlaying,
    speed,
    unitSpeed,
    spawnCount,
    formation,
    pairDistance,
    followCamera,
    showPathTrail,
    showSpawnPoints,
    autoLoop,
    unitElevation,
    unitScaleMultiplier,
    fps,
    lapCount,
    statusMessage,
    spawnedUnitsCount,
    completedUnitsCount,
    aliveEnemiesCount,
    deadEnemiesCount,
    leakedEnemiesCount,
    totalWaveEnemiesCount,
    progressPercent,
    // Unit actions
    initializeUnits,
    spawnAtRoute,
    startTour,
    pauseTour,
    togglePlay,
    resetTour,
    calculateDirection,
    updateTick,
    updateClientInterpolation,
    devClearAllCreeps,
    resetForNewProject,
    // Game lifecycle bridge
    isGameMode: computed({ get: () => gameStore.isGameMode, set: v => { gameStore.isGameMode = v } }),
    entrySource: computed({ get: () => gameStore.entrySource, set: v => { gameStore.entrySource = v } }),
    gameState: computed({ get: () => gameStore.gameState, set: v => { gameStore.gameState = v } }),
    prepCountdown: computed({ get: () => gameStore.prepCountdown, set: v => { gameStore.prepCountdown = v } }),
    gold: computed({ get: () => gameStore.gold, set: v => { gameStore.gold = v } }),
    playerLives: computed({ get: () => gameStore.playerLives, set: v => { gameStore.playerLives = v } }),
    maxLives: computed({ get: () => gameStore.maxLives, set: v => { gameStore.maxLives = v } }),
    totalKills: computed({ get: () => gameStore.totalKills, set: v => { gameStore.totalKills = v } }),
    totalGoldEarned: computed({ get: () => gameStore.totalGoldEarned, set: v => { gameStore.totalGoldEarned = v } }),
    gameSpeed: computed({ get: () => gameStore.gameSpeed, set: v => { gameStore.setGameSpeed(v) } }),
    setGameSpeed: gameStore.setGameSpeed,
    startingGold: computed({ get: () => gameStore.startingGold, set: v => { gameStore.startingGold = v } }),
    startingLives: computed({ get: () => gameStore.startingLives, set: v => { gameStore.startingLives = v } }),
    wavePrepDuration: computed({ get: () => gameStore.wavePrepDuration, set: v => { gameStore.wavePrepDuration = v } }),
    spawnMode: computed({ get: () => gameStore.spawnMode, set: v => { gameStore.spawnMode = v } }),
    isLoadingGame: computed({ get: () => gameStore.isLoadingGame, set: v => { gameStore.isLoadingGame = v } }),
    loadingProgress: computed({ get: () => gameStore.loadingProgress, set: v => { gameStore.loadingProgress = v } }),
    loadingMapTitle: computed({ get: () => gameStore.loadingMapTitle, set: v => { gameStore.loadingMapTitle = v } }),
    loadingMessage: computed({ get: () => gameStore.loadingMessage, set: v => { gameStore.loadingMessage = v } }),
    loadingAssetsCount: computed({ get: () => gameStore.loadingAssetsCount, set: v => { gameStore.loadingAssetsCount = v } }),
    startLoadingScreen: gameStore.startLoadingScreen,
    setLoadingProgress: gameStore.setLoadingProgress,
    finishLoadingScreen: gameStore.finishLoadingScreen,
    syncGameSettingsToProject: gameStore.syncGameSettingsToProject,
    restoreGameSettingsFromProject: gameStore.restoreGameSettingsFromProject,
    syncCharacterConfigToProject: gameStore.syncGameSettingsToProject,
    restoreCharacterConfigFromProject: gameStore.restoreGameSettingsFromProject,
    startPlayMode,
    exitPlayMode,
    startNextWaveInGame,
    restartGame,
    devResetGame: gameStore.devResetGame,
    devAddGold: gameStore.devAddGold,
    devSetGold: gameStore.devSetGold,
    devSetStartingGold: gameStore.devSetStartingGold,
    devAddLives: gameStore.devAddLives,
    devSetLives: gameStore.devSetLives,
    devJumpToWave: gameStore.devJumpToWave,
    devRestartCurrentWave: gameStore.devRestartCurrentWave,
    devSpawnWaveNow: gameStore.devSpawnWaveNow,
    // Wave bridge
    waveConfigs: computed({ get: () => waveStore.waveConfigs, set: v => { waveStore.waveConfigs = v } }),
    currentWaveIndex: computed({ get: () => waveStore.currentWaveIndex, set: v => { waveStore.currentWaveIndex = v } }),
    currentWaveConfig: computed(() => waveStore.currentWaveConfig),
    isWaveSaveFeedback: computed(() => waveStore.isWaveSaveFeedback),
    syncWavesToProject: waveStore.syncWavesToProject,
    restoreWavesFromProject: waveStore.restoreWavesFromProject,
    selectWave: waveStore.selectWave,
    addNewWave: waveStore.addNewWave,
    deleteWave: waveStore.deleteWave,
    saveCurrentWave: waveStore.saveCurrentWave,
    updateWaveConfig: waveStore.updateWaveConfig,
    setWaveUnitCount: waveStore.setWaveUnitCount,
    setWaveUnitHp: waveStore.setWaveUnitHp,
    setWaveSpeed: waveStore.setWaveSpeed,
    setWaveUnitBonus: waveStore.setWaveUnitBonus,
    setWaveEndBonus: waveStore.setWaveEndBonus,
    setWaveGoldReward: waveStore.setWaveGoldReward,
    setWaveCharacterModel: waveStore.setWaveCharacterModel,
    setWaveAnimSpeed: waveStore.setWaveAnimSpeed,
    setWaveOffsetY: waveStore.setWaveOffsetY,
    setWaveUnitScale: waveStore.setWaveUnitScale,
    setWaveUnitVariant: waveStore.setWaveUnitVariant,
    setWaveVariantTint: waveStore.setWaveVariantTint,
    devAddWave: waveStore.devAddWave,
    devUpdateActiveWaveHp: waveStore.devUpdateActiveWaveHp,
    devUpdateActiveWaveSpeed: waveStore.devUpdateActiveWaveSpeed,
    devUpdateActiveWaveCount: waveStore.devUpdateActiveWaveCount,
    devToggleActiveWaveImmunity: waveStore.devToggleActiveWaveImmunity,
    // Route bridge
    routes: computed({ get: () => routeStore.routes, set: v => { routeStore.routes = v } }),
    selectedRouteIndex: computed({ get: () => routeStore.selectedRouteIndex, set: v => { routeStore.selectedRouteIndex = v } }),
    selectedRoute: computed(() => routeStore.selectedRoute),
    currentActiveRoute: computed(() => routeStore.currentActiveRoute),
    customRoutes: computed(() => routeStore.customRoutes),
    isDrawingRoute: computed({ get: () => routeStore.isDrawingRoute, set: v => { routeStore.isDrawingRoute = v } }),
    drawingWaypoints: computed({ get: () => routeStore.drawingWaypoints, set: v => { routeStore.drawingWaypoints = v } }),
    drawingPath: computed(() => routeStore.drawingPath),
    selectedWaypointIndex: computed({ get: () => routeStore.selectedWaypointIndex, set: v => { routeStore.selectedWaypointIndex = v } }),
    routeUndoStack: computed({ get: () => routeStore.routeUndoStack, set: v => { routeStore.routeUndoStack = v } }),
    routeRedoStack: computed({ get: () => routeStore.routeRedoStack, set: v => { routeStore.routeRedoStack = v } }),
    canUndoRoute: computed(() => routeStore.canUndoRoute),
    canRedoRoute: computed(() => routeStore.canRedoRoute),
    isSettingRouteStart: computed({ get: () => routeStore.isSettingRouteStart, set: v => { routeStore.isSettingRouteStart = v } }),
    routeStartPlacementMode: computed({ get: () => routeStore.routeStartPlacementMode, set: v => { routeStore.routeStartPlacementMode = v } }),
    isSettingPlayerStartPoint: computed({ get: () => routeStore.isSettingPlayerStartPoint, set: v => { routeStore.isSettingPlayerStartPoint = v } }),
    blockedBuildingCellsSet: computed(() => routeStore.blockedBuildingCellsSet),
    isCellBlockedForBuilding: routeStore.isCellBlockedForBuilding,
    syncRoutesFromProject: routeStore.syncRoutesFromProject,
    syncRoutesToProject: routeStore.syncRoutesToProject,
    addRoute: routeStore.addRoute,
    relocateCurrentRouteStart: routeStore.relocateCurrentRouteStart,
    setPlayerStartPoint: routeStore.setPlayerStartPoint,
    relocateCurrentPlayerStartPoint: routeStore.relocateCurrentPlayerStartPoint,
    clearPlayerStartPoint: routeStore.clearPlayerStartPoint,
    removeRoute: routeStore.removeRoute,
    deleteCurrentRoute: routeStore.deleteCurrentRoute,
    getRouteForIndex: routeStore.getRouteForIndex,
    pushRouteState: routeStore.pushRouteState,
    startDrawingCustomRoute: routeStore.startDrawingCustomRoute,
    selectWaypoint: routeStore.selectWaypoint,
    moveSelectedWaypoint: routeStore.moveSelectedWaypoint,
    setWaypointPosition: routeStore.setWaypointPosition,
    commitRouteState: routeStore.commitRouteState,
    deleteSelectedWaypoint: routeStore.deleteSelectedWaypoint,
    deleteWaypoint: routeStore.deleteWaypoint,
    addWaypoint: routeStore.addWaypoint,
    addPathTile: routeStore.addPathTile,
    undoRoute: routeStore.undoRoute,
    redoRoute: routeStore.redoRoute,
    undoLastPathTile: routeStore.undoLastPathTile,
    clearDrawnRoute: routeStore.clearDrawnRoute,
    finishDrawingRoute: routeStore.finishDrawingRoute,
    cancelDrawingRoute: routeStore.cancelDrawingRoute,
  }
})
