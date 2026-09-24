import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useMapStore } from './mapStore'
import { useTowerStore } from './towerStore'
import { useWaveStore } from './waveStore'
import { useMultiplayerStore } from './multiplayerStore'
import { useCharacterStore } from './characterStore'

export const useGameStore = defineStore('gameStore', () => {
  const mapStore = useMapStore()
  const towerStore = useTowerStore()
  const waveStore = useWaveStore()
  const multiplayerStore = useMultiplayerStore()

  // --- GAME MODE & ECONOMY STATE ---
  const isGameMode = ref(false)
  const entrySource = ref<'editor' | 'home' | 'play' | 'lobby'>('home')
  const gameSpeed = ref(1.0)
  const totalKills = ref(0)
  const totalGoldEarned = ref(0)
  const playerLives = ref(20)
  const maxLives = ref(20)
  const gameState = ref<'ready' | 'build_prep' | 'wave_running' | 'wave_completed' | 'game_over' | 'victory'>('ready')
  const prepCountdown = ref(10)
  const gold = ref(150)
  const spawnMode = ref<'all_routes' | 'single_route'>('all_routes')

  // --- PER-MAP TD SETTINGS COMPUTEDS ---
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

  const formation = computed({
    get: () => (mapStore.project.gameSettings?.formation as 'pairs' | 'single') || 'pairs',
    set: (v: 'pairs' | 'single') => {
      if (!mapStore.project.gameSettings) {
        mapStore.project.gameSettings = { startingGold: 150, startingLives: 20, wavePrepTime: 10, formation: v }
      } else {
        mapStore.project.gameSettings.formation = v
      }
    }
  })

  const pairDistance = computed({
    get: () => mapStore.project.gameSettings?.pairDistance ?? 0.35,
    set: (v: number) => {
      if (!mapStore.project.gameSettings) {
        mapStore.project.gameSettings = { startingGold: 150, startingLives: 20, wavePrepTime: 10, pairDistance: v }
      } else {
        mapStore.project.gameSettings.pairDistance = v
      }
    }
  })

  const unitElevation = computed({
    get: () => mapStore.project.gameSettings?.unitElevation ?? 0,
    set: (v: number) => {
      if (!mapStore.project.gameSettings) {
        mapStore.project.gameSettings = { startingGold: 150, startingLives: 20, wavePrepTime: 10, unitElevation: v }
      } else {
        mapStore.project.gameSettings.unitElevation = v
      }
    }
  })

  const unitScaleMultiplier = computed({
    get: () => mapStore.project.gameSettings?.unitScaleMultiplier ?? 1.0,
    set: (v: number) => {
      if (!mapStore.project.gameSettings) {
        mapStore.project.gameSettings = { startingGold: 150, startingLives: 20, wavePrepTime: 10, unitScaleMultiplier: v }
      } else {
        mapStore.project.gameSettings.unitScaleMultiplier = v
      }
    }
  })

  // --- LOADING SCREEN / PRELOADER STATE ---
  const isLoadingGame = ref(false)
  const loadingProgress = ref(0)
  const loadingMapTitle = ref('')
  const loadingMessage = ref('')
  const loadingAssetsCount = ref(0)

  function startLoadingScreen(mapTitle = 'Game Map') {
    isLoadingGame.value = true
    loadingProgress.value = 0
    loadingMapTitle.value = mapTitle
    loadingMessage.value = 'Preparing graphic assets and textures...'
    loadingAssetsCount.value = 0
  }

  function setLoadingProgress(progress: number, message?: string, loadedCount?: number) {
    loadingProgress.value = Math.max(0, Math.min(100, progress))
    if (message) loadingMessage.value = message
    if (loadedCount !== undefined) loadingAssetsCount.value = loadedCount
  }

  function finishLoadingScreen() {
    loadingProgress.value = 100
    loadingMessage.value = 'All textures loaded! Starting game...'
    setTimeout(() => {
      isLoadingGame.value = false
    }, 280)
  }

  // --- SYNCHRONIZATION ---
  function syncGameSettingsToProject() {
    if (!mapStore.project) return
    mapStore.project.gameSettings = {
      startingGold: Number(startingGold.value) || 150,
      startingLives: Number(startingLives.value) || 20,
      wavePrepTime: Number(wavePrepDuration.value) || 10,
      spawnMode: spawnMode.value || 'all_routes',
      formation: formation.value || 'pairs',
      pairDistance: Number(pairDistance.value) || 0.35,
      unitElevation: Number(unitElevation.value) || 0,
      unitScaleMultiplier: Number(unitScaleMultiplier.value) || 1.0,
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
      formation.value = gs.formation || 'pairs'
      pairDistance.value = gs.pairDistance !== undefined ? Number(gs.pairDistance) : 0.35
      unitElevation.value = gs.unitElevation !== undefined ? Number(gs.unitElevation) : 0
      unitScaleMultiplier.value = gs.unitScaleMultiplier !== undefined ? Number(gs.unitScaleMultiplier) : 1.0
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

  // --- GAME LIFECYCLE CONTROLS ---
  function startPlayMode() {
    restoreGameSettingsFromProject()
    waveStore.restoreWavesFromProject()
    towerStore.saveEditorTowersSnapshot()
    towerStore.clearCombatEffects()
    isGameMode.value = true
    const initLives = startingLives.value
    maxLives.value = initLives
    playerLives.value = initLives
    gold.value = startingGold.value
    totalKills.value = 0
    totalGoldEarned.value = 0
    waveStore.currentWaveIndex = 0
    gameState.value = 'build_prep'
    prepCountdown.value = wavePrepDuration.value
    gameSpeed.value = 1.0

    // Always reset character units to 1st Wave at the spawn point!
    useCharacterStore().resetTour()
  }

  function setGameSpeed(speed: number) {
    gameSpeed.value = speed
  }

  function exitPlayMode() {
    isGameMode.value = false
    gameState.value = 'ready'
    isLoadingGame.value = false
    loadingProgress.value = 0
    loadingMessage.value = ''
    towerStore.restoreEditorTowersSnapshot()
    useCharacterStore().resetTour()
  }

  function startNextWaveInGame() {
    towerStore.clearCombatEffects()
    gameState.value = 'wave_running'
    prepCountdown.value = 0
  }

  function restartGame() {
    towerStore.restoreEditorTowersSnapshot()
    startPlayMode()
  }

  // --- DEV & SANDBOX TEST CONTROLS ---
  function devResetGame(customStartingGold?: number, clearTowers: boolean = true) {
    if (clearTowers) {
      towerStore.clearAllTowers()
    } else {
      towerStore.restoreEditorTowersSnapshot()
    }
    towerStore.clearCombatEffects()
    waveStore.currentWaveIndex = 0
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
    gameSpeed.value = 1.0

    // Reset character units to 1st Wave!
    useCharacterStore().resetTour()
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
    if (waveStore.waveConfigs.length === 0) return
    const targetIdx = Math.max(0, Math.min(waveStore.waveConfigs.length - 1, waveIdx))
    waveStore.currentWaveIndex = targetIdx
    gameState.value = 'build_prep'
    prepCountdown.value = 0
    towerStore.clearCombatEffects()
  }

  function devRestartCurrentWave() {
    towerStore.clearCombatEffects()
    gameState.value = 'build_prep'
    prepCountdown.value = 0
  }

  function devSpawnWaveNow() {
    towerStore.clearCombatEffects()
    gameState.value = 'wave_running'
    prepCountdown.value = 0
  }

  function resetForNewProject() {
    startingGold.value = 150
    startingLives.value = 20
    wavePrepDuration.value = 10
    gold.value = 150
    maxLives.value = 20
    playerLives.value = 20
    prepCountdown.value = 10
    totalKills.value = 0
    totalGoldEarned.value = 150
    spawnMode.value = 'all_routes'
    isGameMode.value = false
    gameState.value = 'ready'
  }

  return {
    isGameMode,
    entrySource,
    gameSpeed,
    setGameSpeed,
    totalKills,
    totalGoldEarned,
    playerLives,
    maxLives,
    gameState,
    prepCountdown,
    gold,
    spawnMode,
    formation,
    pairDistance,
    unitElevation,
    unitScaleMultiplier,
    startingGold,
    startingLives,
    wavePrepDuration,
    isLoadingGame,
    loadingProgress,
    loadingMapTitle,
    loadingMessage,
    loadingAssetsCount,
    startLoadingScreen,
    setLoadingProgress,
    finishLoadingScreen,
    syncGameSettingsToProject,
    restoreGameSettingsFromProject,
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
    devSpawnWaveNow,
    resetForNewProject,
  }
})
