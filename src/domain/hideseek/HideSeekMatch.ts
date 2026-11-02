import { GridCoord, HideSeekSettings } from '../../types/map'
import {
  ChestState,
  CollisionGrid,
  HideSeekEndReason,
  HideSeekPhase,
  HideSeekRole,
  LootProgress,
  NO_LOOT,
  advanceLoot,
  hasLineOfSight,
  hasLootedEnough,
  isCaught,
  pickChestSpots,
  pickHideSpots,
} from './HideSeekRules'
import { TRAP_RADIUS, TRAP_RING_SEC, TrapState } from './HideSeekGadgets'
import { HideSeekMaze, HideSpot } from './HideSeekMaze'

/**
 * The host's referee for a whole hide & seek match (pure: no Vue / Pixi / network).
 * Every player seeks once: round k's seeker is order[k], everyone else hides. Caught hiders go to jail where
 * they were caught; a free hider touching them sets them free. Points add up over the rounds.
 */

/** Pause between two rounds (results on screen) */
export const ROUND_BREAK_SEC = 6
/** A hider this close to the spot inside an open exit gate is out */
export const EXIT_REACH = 0.8

export interface HideSeekMatchClock {
  phase: HideSeekPhase
  timeLeft: number
  /** Side that won the round that just ended */
  winner: HideSeekRole | null
  reason: HideSeekEndReason | null
}

export interface HideSeekSeat {
  id: string
  role: HideSeekRole
  jailed: boolean
  score: number
}

export interface HideSeekMatch {
  /** 0-based */
  round: number
  rounds: number
  /** Player ids in lobby order: round k's seeker is order[k] */
  order: string[]
  clock: HideSeekMatchClock
  chests: ChestState[]
  /** Barrels / cabinets a hider can hide in */
  spots: HideSpot[]
  traps: TrapState[]
  /** This round's random labyrinth (0 = the map's own layout); every client builds it from the seed */
  mazeSeed: number
  /** Per labyrinth door: open? Per candle stand: burning? */
  doors: boolean[]
  torches: boolean[]
  /** Exit gates (the spot just inside each); they open once the hiders took enough treasure */
  exits: GridCoord[]
  exitsOpen: boolean
  trapsPlaced: number
  seats: HideSeekSeat[]
  loot: Record<string, LootProgress>
  /** Best total score after the last round (null = draw or not over yet) */
  champion: string | null
}

/** What the referee needs to know about a player this frame (players own their position). */
export interface MatchBody extends GridCoord {
  id: string
  moving: boolean
  /** Hiding spot the player sits in (-1 = none) */
  hidden: number
}

export type MatchEvent =
  | { kind: 'loot'; chest: number; by: string }
  | { kind: 'caught'; id: string }
  | { kind: 'freed'; id: string; by: string }
  | { kind: 'bell'; col: number; row: number }
  | { kind: 'round' }
  /** The break after a round is over: the session sets up the next round (a new labyrinth first) */
  | { kind: 'roundDue' }
  | { kind: 'exitsOpen' }
  | { kind: 'roundOver' }
  | { kind: 'ended' }

/** The first lobby slot seeks in round 1; the others hide. */
export function roleForSlot(slotIndex: number): HideSeekRole {
  return slotIndex === 0 ? 'seeker' : 'hider'
}

export function createMatch(order: string[]): HideSeekMatch {
  return {
    round: 0,
    rounds: order.length,
    order,
    clock: { phase: 'hiding', timeLeft: 0, winner: null, reason: null },
    chests: [],
    spots: [],
    traps: [],
    mazeSeed: 0,
    doors: [],
    torches: [],
    exits: [],
    exitsOpen: false,
    trapsPlaced: 0,
    seats: order.map(id => ({ id, role: 'hider', jailed: false, score: 0 })),
    loot: {},
    champion: null,
  }
}

export function seatOf(match: HideSeekMatch, id: string): HideSeekSeat | undefined {
  return match.seats.find(s => s.id === id)
}

/** Seeker starts on the map's first spawn, hiders spread over the others. */
export function spawnForSeat(match: HideSeekMatch, id: string, spawns: GridCoord[]): GridCoord {
  const fallback = spawns[0] ?? { col: 0, row: 0 }
  const seat = seatOf(match, id)
  if (!seat || seat.role === 'seeker' || spawns.length < 2) return fallback
  const hiderIndex = match.seats.filter(s => s.role === 'hider').indexOf(seat)
  return spawns[1 + (hiderIndex % (spawns.length - 1))]
}

/** Sets up round `round`: new seeker, fresh chests / hiding spots, nobody in jail. With a random labyrinth its own
 * hiding spots are used, its doors start shut and its candles burn. */
export function startRound(
  match: HideSeekMatch,
  round: number,
  grid: CollisionGrid,
  spawns: GridCoord[],
  settings: HideSeekSettings,
  random: () => number,
  maze: HideSeekMaze | null = null
): void {
  match.round = round
  const seekerId = match.order[round % match.order.length]
  for (const seat of match.seats) {
    seat.role = seat.id === seekerId ? 'seeker' : 'hider'
    seat.jailed = false
  }
  const props = maze ? [...maze.spots, ...maze.torches, ...maze.doors.map(d => d.center), ...maze.exits.map(e => e.at)] : []
  match.chests = pickChestSpots(grid, spawns, settings.chestCount, random, props).map(p => ({ ...p, looted: false }))
  match.spots = maze
    ? maze.spots.map(spot => ({ ...spot }))
    : pickHideSpots(grid, spawns, match.chests, settings.hideSpotCount, random).map(p => ({ ...p, kind: 'barrel' as const, facing: 'E' as const }))
  match.mazeSeed = maze?.seed ?? 0
  match.doors = maze ? maze.doors.map(() => false) : []
  match.torches = maze ? maze.torches.map(() => true) : []
  match.exits = maze ? maze.exits.map(e => ({ ...e.at })) : []
  match.exitsOpen = false
  match.traps = []
  match.trapsPlaced = 0
  match.loot = {}
  match.clock = { phase: 'hiding', timeLeft: settings.hideTime, winner: null, reason: null }
}

/** Anyone opens / shuts a door. */
export function setDoor(match: HideSeekMatch, index: number, open: boolean): boolean {
  if (index < 0 || index >= match.doors.length || match.doors[index] === open) return false
  match.doors[index] = open
  return true
}

/** A hider blows a candle out, the seeker lights it again. */
export function useTorch(match: HideSeekMatch, index: number, role: HideSeekRole): boolean {
  const lit = role === 'seeker'
  if (index < 0 || index >= match.torches.length || match.torches[index] === lit) return false
  match.torches[index] = lit
  return true
}

function endRound(match: HideSeekMatch, winner: HideSeekRole, reason: HideSeekEndReason, settings: HideSeekSettings): MatchEvent {
  for (const seat of match.seats) if (seat.role === winner) seat.score += settings.scoreWin
  const last = match.round + 1 >= match.rounds
  match.clock = { phase: last ? 'ended' : 'roundOver', timeLeft: last ? 0 : ROUND_BREAK_SEC, winner, reason }
  match.loot = {}
  if (!last) return { kind: 'roundOver' }
  const ranked = [...match.seats].sort((a, b) => b.score - a.score)
  match.champion = ranked.length > 1 && Math.floor(ranked[0].score) === Math.floor(ranked[1].score) ? null : (ranked[0]?.id ?? null)
  return { kind: 'ended' }
}

function jail(match: HideSeekMatch, hider: HideSeekSeat, seeker: HideSeekSeat | undefined, settings: HideSeekSettings, events: MatchEvent[]): void {
  hider.jailed = true
  delete match.loot[hider.id]
  if (seeker) seeker.score += settings.scoreCatch
  events.push({ kind: 'caught', id: hider.id })
}

function allHidersJailed(match: HideSeekMatch, present: Set<string>): boolean {
  return match.seats.filter(s => s.role === 'hider' && present.has(s.id)).every(s => s.jailed)
}

/** One referee frame. `bodies` are the players still in the match. */
export function tickMatch(
  match: HideSeekMatch,
  bodies: MatchBody[],
  grid: CollisionGrid,
  spawns: GridCoord[],
  settings: HideSeekSettings,
  deltaSec: number,
  random: () => number
): MatchEvent[] {
  const clock = match.clock
  if (clock.phase === 'ended') return []
  clock.timeLeft -= deltaSec

  if (clock.phase === 'roundOver') {
    return clock.timeLeft > 0 ? [] : [{ kind: 'roundDue' }]
  }

  const events: MatchEvent[] = []
  const byId = new Map(bodies.map(b => [b.id, b]))
  const present = new Set(bodies.map(b => b.id))
  const seeker = match.seats.find(s => s.role === 'seeker' && present.has(s.id))
  const hiders = match.seats.filter(s => s.role === 'hider' && present.has(s.id))
  if (!seeker) return [endRound(match, 'hider', 'left', settings)]
  if (hiders.length === 0) return [endRound(match, 'seeker', 'left', settings)]

  if (clock.phase === 'hiding' && clock.timeLeft <= 0) {
    match.clock = { phase: 'seeking', timeLeft: settings.roundTime, winner: null, reason: null }
  } else if (clock.phase === 'seeking' && clock.timeLeft <= 0) {
    return [endRound(match, 'seeker', 'time', settings)]
  }

  // Looting: a free hider standing at a chest (not inside a barrel)
  for (const seat of hiders) {
    const body = byId.get(seat.id)!
    if (seat.jailed || body.hidden !== -1) {
      delete match.loot[seat.id]
      continue
    }
    const progress = advanceLoot(match.loot[seat.id] ?? NO_LOOT, body, match.chests, deltaSec)
    match.loot[seat.id] = progress
    if (progress.index === -1 || progress.time < settings.lootTime) continue
    match.chests[progress.index].looted = true
    match.loot[seat.id] = NO_LOOT
    seat.score += settings.scoreChest
    events.push({ kind: 'loot', chest: progress.index, by: seat.id })
    if (!hasLootedEnough(match.chests, settings)) continue
    // Enough treasure: with exit gates the hiders still have to get out, otherwise they win right away
    if (match.exits.length === 0) return [...events, endRound(match, 'hider', 'chests', settings)]
    if (!match.exitsOpen) {
      match.exitsOpen = true
      events.push({ kind: 'exitsOpen' })
    }
  }

  // A free hider reaching an open gate wins the round for the hiders
  if (match.exitsOpen) {
    const escaped = hiders.some(seat => {
      const b = byId.get(seat.id)!
      return !seat.jailed && b.hidden === -1 && match.exits.some(e => Math.hypot(b.col - e.col, b.row - e.row) <= EXIT_REACH)
    })
    if (escaped) return [...events, endRound(match, 'hider', 'escaped', settings)]
  }

  if (match.clock.phase !== 'seeking') return events
  const seekerBody = byId.get(seeker.id)!

  for (const seat of hiders) {
    const body = byId.get(seat.id)!
    if (seat.jailed) {
      // A free teammate's touch opens the jail
      const rescuer = hiders.find(h => {
        const other = byId.get(h.id)!
        return !h.jailed && other.hidden === -1 && Math.hypot(other.col - body.col, other.row - body.row) <= settings.catchDistance && hasLineOfSight(grid, other, body)
      })
      if (rescuer) {
        seat.jailed = false
        rescuer.score += settings.scoreRescue
        events.push({ kind: 'freed', id: seat.id, by: rescuer.id })
      }
      continue
    }
    seat.score += settings.scorePerSecond * deltaSec
    // Inside a barrel nobody can touch you: the seeker has to open it
    if (body.hidden === -1 && isCaught(grid, seekerBody, body, settings)) jail(match, seat, seeker, settings, events)
  }

  // Bell traps ring when a free hider walks by, then stop
  match.traps = match.traps.filter(trap => {
    if (trap.ringing > 0) {
      trap.ringing -= deltaSec
      return trap.ringing > 0
    }
    const walker = hiders.find(h => {
      const b = byId.get(h.id)!
      return !h.jailed && b.hidden === -1 && Math.hypot(b.col - trap.col, b.row - trap.row) <= TRAP_RADIUS
    })
    if (walker) {
      trap.ringing = TRAP_RING_SEC
      events.push({ kind: 'bell', col: trap.col, row: trap.row })
    }
    return true
  })

  if (allHidersJailed(match, present)) return [...events, endRound(match, 'seeker', 'caught', settings)]
  return events
}

/** The seeker opens a hiding spot: whoever sits inside goes to jail. */
export function searchSpot(match: HideSeekMatch, spotIndex: number, bodies: MatchBody[], settings: HideSeekSettings): MatchEvent[] {
  if (match.clock.phase !== 'seeking') return []
  const present = new Set(bodies.map(b => b.id))
  const seeker = match.seats.find(s => s.role === 'seeker')
  const events: MatchEvent[] = []
  for (const body of bodies) {
    const seat = seatOf(match, body.id)
    if (seat?.role === 'hider' && !seat.jailed && body.hidden === spotIndex) jail(match, seat, seeker, settings, events)
  }
  if (events.length > 0 && allHidersJailed(match, present)) events.push(endRound(match, 'seeker', 'caught', settings))
  return events
}

/** The seeker drops a bell trap where they stand (limited per round). */
export function placeTrap(match: HideSeekMatch, at: GridCoord, settings: HideSeekSettings): boolean {
  if (match.clock.phase !== 'seeking' || match.trapsPlaced >= settings.trapCount) return false
  match.traps.push({ col: at.col, row: at.row, ringing: 0 })
  match.trapsPlaced++
  return true
}
