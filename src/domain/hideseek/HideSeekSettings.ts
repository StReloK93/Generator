import { HideSeekSettings } from '../../types/map'

/** Single owner of the hide & seek rule defaults (used only when a map does not define a value). */
export const DEFAULT_HIDE_SEEK_SETTINGS: HideSeekSettings = {
  roundTime: 240,
  hideTime: 0,
  runSpeed: 4,
  sneakSpeed: 2,
  visionRange: 10,
  visionAngle: 90,
  hearingRange: 9,
  catchDistance: 0.9,
  maxPlayers: 10,
  seekerSlots: 5,
  roundCount: 3,
  altarExtra: 2,
  altarLightTime: 10,
  altarKickTime: 4,
  altarStages: 4,
  altarsNeededShare: 0.55,
  rescueTime: 3,
  chainRange: 5,
  chainTime: 15,
  chainCooldown: 30,
  chainDaze: 3,
  lanternRadius: 0,
  staminaSeconds: 8,
  staminaRegen: 1,
  tiredSpeed: 2.8,
  seekerSpeedBonus: 1.12,
  hideSpotCount: 6,
  noiseRange: 12,
  trapCount: 2,
  scoreAltar: 20,
  scoreCatch: 30,
  scoreRescue: 15,
  scoreWin: 50,
  scorePerSecond: 1,
  randomMaze: false,
  mazeCols: 36,
  mazeRows: 36,
  mazeGrowPerSeeker: 6,
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
  seekerCandleCount: 4,
  catchSpeedBonus: 0.03,
  catchStaminaBonus: 0.25,
  traitSpeedBonus: 0.15,
  traitStaminaBonus: 0.5,
  traitVisionBonus: 0.25,
  traitRescueReach: 2.5,
  traitCatchReach: 1.3,
  traitStealthSight: 0.6,
  traitStealthNoise: 0.4,
  traitLightBonus: 0.5,
  traitExtraGadgets: 1,
}

function positive(value: unknown, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : fallback
}

/** Counts and points may be 0 (e.g. a map without bell traps) */
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
    // 0 = no hiding time: the seekers do not wait with closed eyes
    hideTime: nonNegative(s.hideTime, d.hideTime),
    runSpeed: positive(s.runSpeed, d.runSpeed),
    sneakSpeed: positive(s.sneakSpeed, d.sneakSpeed),
    visionRange: positive(s.visionRange, d.visionRange),
    visionAngle: Math.min(180, positive(s.visionAngle, d.visionAngle)),
    hearingRange: positive(s.hearingRange, d.hearingRange),
    catchDistance: positive(s.catchDistance, d.catchDistance),
    // Two teams: at least one player each
    maxPlayers: Math.max(2, Math.min(10, Math.round(positive(s.maxPlayers, d.maxPlayers)))),
    // At least one seat on each side
    seekerSlots: Math.max(1, Math.min(9, Math.round(positive(s.seekerSlots, d.seekerSlots)))),
    roundCount: Math.max(1, Math.round(positive(s.roundCount, d.roundCount))),
    altarExtra: count(s.altarExtra, d.altarExtra),
    altarLightTime: positive(s.altarLightTime, d.altarLightTime),
    altarKickTime: positive(s.altarKickTime, d.altarKickTime),
    altarStages: Math.max(1, Math.round(positive(s.altarStages, d.altarStages))),
    altarsNeededShare: Math.min(1, positive(s.altarsNeededShare, d.altarsNeededShare)),
    rescueTime: nonNegative(s.rescueTime, d.rescueTime),
    chainRange: positive(s.chainRange, d.chainRange),
    chainTime: positive(s.chainTime, d.chainTime),
    chainCooldown: nonNegative(s.chainCooldown, d.chainCooldown),
    chainDaze: nonNegative(s.chainDaze, d.chainDaze),
    lanternRadius: nonNegative(s.lanternRadius, d.lanternRadius),
    staminaSeconds: positive(s.staminaSeconds, d.staminaSeconds),
    staminaRegen: positive(s.staminaRegen, d.staminaRegen),
    tiredSpeed: positive(s.tiredSpeed, d.tiredSpeed),
    seekerSpeedBonus: positive(s.seekerSpeedBonus, d.seekerSpeedBonus),
    hideSpotCount: count(s.hideSpotCount, d.hideSpotCount),
    noiseRange: positive(s.noiseRange, d.noiseRange),
    trapCount: count(s.trapCount, d.trapCount),
    scoreAltar: nonNegative(s.scoreAltar, d.scoreAltar),
    scoreCatch: nonNegative(s.scoreCatch, d.scoreCatch),
    scoreRescue: nonNegative(s.scoreRescue, d.scoreRescue),
    scoreWin: nonNegative(s.scoreWin, d.scoreWin),
    scorePerSecond: nonNegative(s.scorePerSecond, d.scorePerSecond),
    randomMaze: typeof s.randomMaze === 'boolean' ? s.randomMaze : d.randomMaze,
    // Maze cells are 2x2 map cells: even sizes, at least 8
    mazeCols: Math.max(8, Math.round(positive(s.mazeCols, d.mazeCols) / 2) * 2),
    mazeRows: Math.max(8, Math.round(positive(s.mazeRows, d.mazeRows) / 2) * 2),
    mazeGrowPerSeeker: Math.round(nonNegative(s.mazeGrowPerSeeker, d.mazeGrowPerSeeker) / 2) * 2,
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
    seekerCandleCount: count(s.seekerCandleCount, d.seekerCandleCount),
    catchSpeedBonus: nonNegative(s.catchSpeedBonus, d.catchSpeedBonus),
    catchStaminaBonus: nonNegative(s.catchStaminaBonus, d.catchStaminaBonus),
    traitSpeedBonus: nonNegative(s.traitSpeedBonus, d.traitSpeedBonus),
    traitStaminaBonus: nonNegative(s.traitStaminaBonus, d.traitStaminaBonus),
    traitVisionBonus: nonNegative(s.traitVisionBonus, d.traitVisionBonus),
    traitRescueReach: positive(s.traitRescueReach, d.traitRescueReach),
    traitCatchReach: positive(s.traitCatchReach, d.traitCatchReach),
    // Shares: a shadow is never easier to spot / hear than anyone else
    traitStealthSight: Math.min(1, positive(s.traitStealthSight, d.traitStealthSight)),
    traitStealthNoise: Math.min(1, nonNegative(s.traitStealthNoise, d.traitStealthNoise)),
    traitLightBonus: nonNegative(s.traitLightBonus, d.traitLightBonus),
    traitExtraGadgets: count(s.traitExtraGadgets, d.traitExtraGadgets),
  }
}

/** Labyrinth size for this many seekers: more seekers get a bigger maze (more room for the hiders). */
export function mazeSize(settings: HideSeekSettings, seekers: number): { cols: number; rows: number } {
  const grow = settings.mazeGrowPerSeeker * Math.max(0, seekers - 1)
  return { cols: settings.mazeCols + grow, rows: settings.mazeRows + grow }
}
