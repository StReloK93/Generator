import { HideSeekSettings } from '../../types/map'

/** Single owner of the hide & seek rule defaults (used only when a map does not define a value). */
export const DEFAULT_HIDE_SEEK_SETTINGS: HideSeekSettings = {
  roundTime: 180,
  hideTime: 5,
  runSpeed: 4,
  sneakSpeed: 2,
  visionRange: 10,
  visionAngle: 90,
  hearingRange: 9,
  catchDistance: 0.9,
  chestCount: 6,
  lootTime: 2,
  chestsToWin: 5,
  lanternRadius: 0,
  staminaSeconds: 8,
  staminaRegen: 1,
  tiredSpeed: 2.8,
  seekerSpeedBonus: 1.12,
  hideSpotCount: 6,
  stoneCount: 3,
  stoneRange: 8,
  noiseRange: 12,
  flareCount: 2,
  flareDuration: 3,
  flareRadius: 7,
  trapCount: 2,
  scoreChest: 20,
  scoreCatch: 30,
  scoreRescue: 15,
  scoreWin: 50,
  scorePerSecond: 1,
  randomMaze: false,
  mazeCols: 40,
  mazeRows: 40,
  roomCount: 7,
  doorCount: 6,
  holeCount: 4,
  torchCount: 8,
  torchRadius: 4,
  exitCount: 2,
  footprintSeconds: 8,
  huntTime: 30,
  huntPingInterval: 5,
  huntVisionBonus: 0.3,
}

function positive(value: unknown, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

/** Counts and points may be 0 (e.g. a map without flares) */
function nonNegative(value: unknown, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) && n >= 0 ? n : fallback
}

const count = (value: unknown, fallback: number) => Math.round(nonNegative(value, fallback))

export function normalizeHideSeekSettings(raw?: Partial<Record<keyof HideSeekSettings, unknown>> | null): HideSeekSettings {
  const s = raw || {}
  const d = DEFAULT_HIDE_SEEK_SETTINGS
  return {
    roundTime: positive(s.roundTime, d.roundTime),
    hideTime: positive(s.hideTime, d.hideTime),
    runSpeed: positive(s.runSpeed, d.runSpeed),
    sneakSpeed: positive(s.sneakSpeed, d.sneakSpeed),
    visionRange: positive(s.visionRange, d.visionRange),
    visionAngle: Math.min(180, positive(s.visionAngle, d.visionAngle)),
    hearingRange: positive(s.hearingRange, d.hearingRange),
    catchDistance: positive(s.catchDistance, d.catchDistance),
    chestCount: Math.round(positive(s.chestCount, d.chestCount)),
    lootTime: positive(s.lootTime, d.lootTime),
    chestsToWin: Math.round(positive(s.chestsToWin, d.chestsToWin)),
    lanternRadius: nonNegative(s.lanternRadius, d.lanternRadius),
    staminaSeconds: positive(s.staminaSeconds, d.staminaSeconds),
    staminaRegen: positive(s.staminaRegen, d.staminaRegen),
    tiredSpeed: positive(s.tiredSpeed, d.tiredSpeed),
    seekerSpeedBonus: positive(s.seekerSpeedBonus, d.seekerSpeedBonus),
    hideSpotCount: count(s.hideSpotCount, d.hideSpotCount),
    stoneCount: count(s.stoneCount, d.stoneCount),
    stoneRange: positive(s.stoneRange, d.stoneRange),
    noiseRange: positive(s.noiseRange, d.noiseRange),
    flareCount: count(s.flareCount, d.flareCount),
    flareDuration: positive(s.flareDuration, d.flareDuration),
    flareRadius: positive(s.flareRadius, d.flareRadius),
    trapCount: count(s.trapCount, d.trapCount),
    scoreChest: nonNegative(s.scoreChest, d.scoreChest),
    scoreCatch: nonNegative(s.scoreCatch, d.scoreCatch),
    scoreRescue: nonNegative(s.scoreRescue, d.scoreRescue),
    scoreWin: nonNegative(s.scoreWin, d.scoreWin),
    scorePerSecond: nonNegative(s.scorePerSecond, d.scorePerSecond),
    randomMaze: typeof s.randomMaze === 'boolean' ? s.randomMaze : d.randomMaze,
    // Maze cells are 2x2 map cells: even sizes, at least 8
    mazeCols: Math.max(8, Math.round(positive(s.mazeCols, d.mazeCols) / 2) * 2),
    mazeRows: Math.max(8, Math.round(positive(s.mazeRows, d.mazeRows) / 2) * 2),
    roomCount: count(s.roomCount, d.roomCount),
    doorCount: count(s.doorCount, d.doorCount),
    holeCount: count(s.holeCount, d.holeCount),
    torchCount: count(s.torchCount, d.torchCount),
    torchRadius: positive(s.torchRadius, d.torchRadius),
    exitCount: Math.min(4, count(s.exitCount, d.exitCount)),
    footprintSeconds: nonNegative(s.footprintSeconds, d.footprintSeconds),
    huntTime: nonNegative(s.huntTime, d.huntTime),
    huntPingInterval: positive(s.huntPingInterval, d.huntPingInterval),
    huntVisionBonus: nonNegative(s.huntVisionBonus, d.huntVisionBonus),
  }
}
