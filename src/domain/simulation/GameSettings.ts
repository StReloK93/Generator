import { MapGameSettings } from '../../types/map'

export type Formation = 'pairs' | 'single'
export type SpawnMode = 'all_routes' | 'single_route'

export type ResolvedGameSettings = Required<Pick<MapGameSettings,
  'startingGold' | 'startingLives' | 'wavePrepTime' | 'pairDistance' | 'unitElevation' | 'unitScaleMultiplier'
>> & {
  spawnMode: SpawnMode
  formation: Formation
  scoreMultiplier?: number
  maxPlayers?: number
}

/**
 * Single owner of the per-map TD rule defaults (used only when a map does not define a value).
 */
export const DEFAULT_GAME_SETTINGS: ResolvedGameSettings = {
  startingGold: 30,
  startingLives: 20,
  wavePrepTime: 10,
  spawnMode: 'all_routes',
  formation: 'pairs',
  pairDistance: 0.35,
  unitElevation: 0,
  unitScaleMultiplier: 1.0,
}

function num(value: unknown, fallback: number): number {
  const n = Number(value)
  return value === undefined || value === null || value === '' || Number.isNaN(n) ? fallback : n
}

/**
 * Normalizes raw/legacy game settings into a complete object. Zero is a valid value (e.g. 0 starting gold).
 * Legacy aliases ('pair', 'single' spawn) come from older exported map files.
 */
export function normalizeGameSettings(raw?: Partial<Record<keyof ResolvedGameSettings, unknown>> | null): ResolvedGameSettings {
  const gs = raw || {}
  const d = DEFAULT_GAME_SETTINGS
  const formation: Formation = gs.formation === 'single' ? 'single' : 'pairs'
  const spawnMode: SpawnMode = gs.spawnMode === 'single_route' || gs.spawnMode === 'single' ? 'single_route' : 'all_routes'
  const result: ResolvedGameSettings = {
    startingGold: Math.max(0, num(gs.startingGold, d.startingGold)),
    startingLives: Math.max(1, num(gs.startingLives, d.startingLives)),
    wavePrepTime: Math.max(0, num(gs.wavePrepTime, d.wavePrepTime)),
    spawnMode,
    formation,
    pairDistance: num(gs.pairDistance, d.pairDistance),
    unitElevation: num(gs.unitElevation, d.unitElevation),
    unitScaleMultiplier: num(gs.unitScaleMultiplier, d.unitScaleMultiplier),
  }
  if (gs.scoreMultiplier !== undefined) result.scoreMultiplier = num(gs.scoreMultiplier, 1)
  if (gs.maxPlayers !== undefined && gs.maxPlayers !== null) result.maxPlayers = num(gs.maxPlayers, 0) || undefined
  return result
}
