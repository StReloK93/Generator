import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useMapStore } from './mapStore'
import { useTowerStore } from './towerStore'
import { useWaveStore } from './waveStore'
import { useCharacterStore } from './characterStore'
import { MapGameSettings, MapProject } from '../types/map'
import { DEFAULT_GAME_SETTINGS, ResolvedGameSettings, normalizeGameSettings } from '../domain/simulation/GameSettings'

export const useGameStore = defineStore('gameStore', () => {
  const mapStore = useMapStore()
  const towerStore = useTowerStore()
  const waveStore = useWaveStore()

  // --- GAME MODE & ECONOMY STATE ---
  const isGameMode = ref(false)
  const entrySource = ref<'editor' | 'home' | 'play' | 'lobby'>('home')
  const gameSpeed = ref(1.0)
  const totalKills = ref(0)
  const totalGoldEarned = ref(0)
  const playerLives = ref(DEFAULT_GAME_SETTINGS.startingLives)
  const maxLives = ref(DEFAULT_GAME_SETTINGS.startingLives)
  const gameState = ref<'ready' | 'build_prep' | 'wave_running' | 'wave_completed' | 'game_over' | 'victory'>('ready')
  const prepCountdown = ref(DEFAULT_GAME_SETTINGS.wavePrepTime)
  const gold = ref(DEFAULT_GAME_SETTINGS.startingGold)

  // --- PER-MAP TD SETTINGS (single source of truth: mapStore.project.gameSettings) ---
  function ensureGameSettings(): MapGameSettings {
    if (!mapStore.project.gameSettings) {
      mapStore.project.gameSettings = normalizeGameSettings()
    }
    return mapStore.project.gameSettings
  }

  function projectSetting<K extends keyof ResolvedGameSettings>(key: K, onSet?: (v: ResolvedGameSettings[K]) => void) {
    return computed<ResolvedGameSettings[K]>({
      get: () => normalizeGameSettings(mapStore.project.gameSettings)[key],
      set: (v) => {
        Object.assign(ensureGameSettings(), { [key]: v })
        onSet?.(v)
      },
    })
  }

  const startingGold = projectSetting('startingGold', (v) => { gold.value = v })
  const startingLives = projectSetting('startingLives', (v) => {
    maxLives.value = v
    playerLives.value = v
  })
  const wavePrepDuration = projectSetting('wavePrepTime', (v) => { prepCountdown.value = v })
  const spawnMode = projectSetting('spawnMode')
  const formation = projectSetting('formation')
  const pairDistance = projectSetting('pairDistance')
  const unitElevation = projectSetting('unitElevation')
  const unitScaleMultiplier = projectSetting('unitScaleMultiplier')

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
  /** Writes the complete, normalized settings object into the project (before export / save). */
  function syncGameSettingsToProject() {
    if (!mapStore.project) return
    mapStore.project.gameSettings = normalizeGameSettings(mapStore.project.gameSettings)
  }

  /** Normalizes project settings (incl. legacy `characterConfig`) and resets runtime economy from them. */
  function restoreGameSettingsFromProject() {
    const p = mapStore.project as MapProject & { characterConfig?: Partial<MapGameSettings> }
    mapStore.project.gameSettings = normalizeGameSettings(p.gameSettings || p.characterConfig)
    resetRuntimeEconomy()
  }

  function resetRuntimeEconomy() {
    gold.value = startingGold.value
    maxLives.value = startingLives.value
    playerLives.value = startingLives.value
    prepCountdown.value = wavePrepDuration.value
    totalKills.value = 0
    totalGoldEarned.value = 0
    gameSpeed.value = 1.0
  }

  // --- GAME LIFECYCLE CONTROLS ---
  function startPlayMode() {
    restoreGameSettingsFromProject()
    waveStore.restoreWavesFromProject()
    towerStore.saveEditorTowersSnapshot()
    towerStore.clearCombatEffects()
    isGameMode.value = true
    waveStore.currentWaveIndex = 0
    gameState.value = 'build_prep'

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
    towerStore.initGameClanSelection()
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
    }
    resetRuntimeEconomy()
    gameState.value = 'build_prep'

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
    mapStore.project.gameSettings = normalizeGameSettings()
    resetRuntimeEconomy()
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
