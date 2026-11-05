import { GridCoord, HideSeekSettings } from '../../types/map'
import { CollisionGrid, HideSeekRole, hasLineOfSight } from './HideSeekRules'

// ==========================================
// Stamina: running tires you out, walking quietly / standing / hiding gets the breath back
// ==========================================

export interface Stamina {
  /** Seconds of running left */
  value: number
  /** Out of breath: slow until enough breath is back */
  exhausted: boolean
}

/** Out of breath until this share of the stamina is back */
const STAMINA_RECOVER_SHARE = 0.3
/** Hiding inside a barrel is the fastest way to catch your breath */
const HIDDEN_REGEN_FACTOR = 2

export type Gait = 'still' | 'sneak' | 'run' | 'hidden'

export function freshStamina(settings: HideSeekSettings): Stamina {
  return { value: settings.staminaSeconds, exhausted: false }
}

export function advanceStamina(stamina: Stamina, gait: Gait, deltaSec: number, settings: HideSeekSettings): Stamina {
  if (gait === 'run') {
    const value = Math.max(0, stamina.value - deltaSec)
    return { value, exhausted: stamina.exhausted || value <= 0 }
  }
  const regen = settings.staminaRegen * (gait === 'hidden' ? HIDDEN_REGEN_FACTOR : 1)
  const value = Math.min(settings.staminaSeconds, stamina.value + regen * deltaSec)
  return { value, exhausted: stamina.exhausted && value < settings.staminaSeconds * STAMINA_RECOVER_SHARE }
}

/** Tiles per second: sneaking is slow and silent, running is fast (seeker a bit faster) until out of breath. */
export function moveSpeed(role: HideSeekRole, sneaking: boolean, stamina: Stamina, settings: HideSeekSettings): number {
  if (sneaking) return settings.sneakSpeed
  if (stamina.exhausted) return settings.tiredSpeed
  return settings.runSpeed * (role === 'seeker' ? settings.seekerSpeedBonus : 1)
}

// ==========================================
// Gadgets: per-round bell traps and candles (seekers)
// ==========================================

export interface GadgetCounts {
  traps: number
  /** Candles the seeker sets down */
  candles: number
}

/** A round's gadgets; the trickster gets `extra` more of each of their own. */
export function gadgetsFor(role: HideSeekRole, settings: HideSeekSettings, extra = 0): GadgetCounts {
  const more = (n: number) => (n > 0 ? n + extra : 0)
  return role === 'seeker'
    ? { traps: more(settings.trapCount), candles: more(settings.seekerCandleCount) }
    : { traps: 0, candles: 0 }
}

/** A bell / door: loud nearby, fading out at noiseRange (and heard through walls, unlike sight). */
export function noiseLoudness(distance: number, settings: HideSeekSettings): number {
  return distance >= settings.noiseRange ? 0 : 1 - distance / settings.noiseRange
}

export interface TrapState {
  col: number
  row: number
  /** Seconds the bell still rings (0 = armed, waiting for a hider) */
  ringing: number
}

/** A hider walking within this distance rings the bell */
export const TRAP_RADIUS = 0.8
export const TRAP_RING_SEC = 4
/** A hider can reach into a barrel / crate from this close */
export const HIDE_SPOT_REACH = 1.3

// ==========================================
// Senses: heartbeat and the explored-map memory
// ==========================================

/** Heartbeat strength for a hider: 0 while the seeker is far, 1 when they are about to touch. */
export function heartbeatDanger(seekerDistance: number, settings: HideSeekSettings): number {
  const range = settings.hearingRange * 0.8
  return Math.max(0, Math.min(1, 1 - (seekerDistance - settings.catchDistance) / range))
}

/** Seconds between two heartbeats: faster as the seeker gets closer. */
export function heartbeatInterval(danger: number): number {
  return 1.1 - 0.7 * danger
}

/** Marks every cell under a sight polygon (origin first, then the ray ends) as explored. */
export function markExplored(explored: Uint8Array, cols: number, rows: number, sight: GridCoord[]): void {
  const [origin, ...rays] = sight
  if (!origin) return
  for (const end of rays) {
    const length = Math.hypot(end.col - origin.col, end.row - origin.row)
    for (let d = 0; d <= length; d += 0.5) {
      const t = length > 0 ? d / length : 0
      const col = Math.round(origin.col + (end.col - origin.col) * t)
      const row = Math.round(origin.row + (end.row - origin.row) * t)
      if (col >= 0 && row >= 0 && col < cols && row < rows) explored[row * cols + col] = 1
    }
  }
}

// ==========================================
// Doors, candle stands, footprints and the hunt
// ==========================================

/** A door / candle stand can be used from this far */
export const DOOR_REACH = 1.4
export const TORCH_REACH = 1.3
/** Running leaves a footprint every this many tiles */
export const FOOTPRINT_SPACING = 0.55
/** Anything standing in a candle's light is seen this many times further than the own sight range */
export const TORCH_SIGHT_FACTOR = 2

/** 0..1 light of the lit candle stands at `p` (full near a candle, fading to its radius; walls cast shadows). */
export function torchLightAt(grid: CollisionGrid, p: GridCoord, torches: GridCoord[], settings: HideSeekSettings): number {
  let best = 0
  for (const t of torches) {
    const d = Math.hypot(p.col - t.col, p.row - t.row)
    if (d >= settings.torchRadius || !hasLineOfSight(grid, t, p)) continue
    best = Math.max(best, Math.min(1, (1 - d / settings.torchRadius) * 2))
  }
  return best
}

/** The last seconds of a round: the seeker hunts. */
export function isHuntTime(phase: string, timeLeft: number, settings: HideSeekSettings): boolean {
  return phase === 'seeking' && settings.huntTime > 0 && timeLeft <= settings.huntTime
}

/** The seeker's rules during the hunt: sight reaches further. */
export function huntSettings(settings: HideSeekSettings): HideSeekSettings {
  return { ...settings, visionRange: settings.visionRange * (1 + settings.huntVisionBonus) }
}
