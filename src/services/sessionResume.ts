import type { CharacterUnit } from '../types/unit'
import type { PlacedTower } from '../types/tower'
import { useGameStore } from '../stores/gameStore'
import { useWaveStore } from '../stores/waveStore'
import { useTowerStore } from '../stores/towerStore'
import { useCharacterStore } from '../stores/characterStore'

/**
 * Per-tab session state that survives a browser refresh (sessionStorage: cleared when the tab closes,
 * never shared between two open tabs, so two tabs can still play against each other).
 */
export function readSession<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function writeSession(key: string, value: unknown): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.warn(`[sessionResume] Could not save ${key}:`, e)
  }
}

export function removeSession(key: string): void {
  try {
    sessionStorage.removeItem(key)
  } catch {
    // Storage unavailable: nothing to remove
  }
}

const MATCH_KEY = 'defensor_match'
/** Hide & seek match of this tab (written and read by the hide & seek store, which owns that state) */
export const HIDE_SEEK_MATCH_KEY = 'defensor_hideseek_match'

type GameState = ReturnType<typeof useGameStore>['gameState']

/** Everything a running TD match needs to continue exactly where it was. */
interface MatchSnapshot {
  /** Which game this belongs to (map in single player, room in multiplayer) */
  owner: string
  gold: number
  playerLives: number
  maxLives: number
  gameState: GameState
  prepCountdown: number
  totalKills: number
  totalGoldEarned: number
  gameSpeed: number
  currentWaveIndex: number
  placedTowers: PlacedTower[]
  selectedClanId: string
  units: CharacterUnit[]
  routeWaveProgress: Record<number, number>
  isPlaying: boolean
}

/** Saves the running match of the simulating side (single player or multiplayer host). */
export function saveMatch(owner: string): void {
  const gameStore = useGameStore()
  const waveStore = useWaveStore()
  const towerStore = useTowerStore()
  const characterStore = useCharacterStore()

  const snapshot: MatchSnapshot = {
    owner,
    gold: gameStore.gold,
    playerLives: gameStore.playerLives,
    maxLives: gameStore.maxLives,
    gameState: gameStore.gameState,
    prepCountdown: gameStore.prepCountdown,
    totalKills: gameStore.totalKills,
    totalGoldEarned: gameStore.totalGoldEarned,
    gameSpeed: gameStore.gameSpeed,
    currentWaveIndex: waveStore.currentWaveIndex,
    placedTowers: towerStore.placedTowers,
    selectedClanId: towerStore.selectedClanId,
    units: characterStore.units,
    routeWaveProgress: characterStore.routeWaveProgress,
    isPlaying: characterStore.isPlaying,
  }
  writeSession(MATCH_KEY, snapshot)
}

/** Puts a saved match of this owner back into the stores. Returns false when there is none. */
export function restoreMatch(owner: string): boolean {
  const snapshot = readSession<MatchSnapshot>(MATCH_KEY)
  if (!snapshot || snapshot.owner !== owner) return false

  const gameStore = useGameStore()
  const waveStore = useWaveStore()
  const towerStore = useTowerStore()
  const characterStore = useCharacterStore()

  gameStore.gold = snapshot.gold
  gameStore.playerLives = snapshot.playerLives
  gameStore.maxLives = snapshot.maxLives
  gameStore.gameState = snapshot.gameState
  gameStore.prepCountdown = snapshot.prepCountdown
  gameStore.totalKills = snapshot.totalKills
  gameStore.totalGoldEarned = snapshot.totalGoldEarned
  gameStore.gameSpeed = snapshot.gameSpeed
  waveStore.currentWaveIndex = Math.min(snapshot.currentWaveIndex, Math.max(0, waveStore.waveConfigs.length - 1))
  towerStore.placedTowers = snapshot.placedTowers
  if (snapshot.selectedClanId) towerStore.setPlayerClan(snapshot.selectedClanId)
  characterStore.units = snapshot.units
  characterStore.routeWaveProgress = snapshot.routeWaveProgress
  characterStore.isPlaying = snapshot.isPlaying
  return true
}

export function clearMatch(): void {
  removeSession(MATCH_KEY)
  removeSession(HIDE_SEEK_MATCH_KEY)
}
