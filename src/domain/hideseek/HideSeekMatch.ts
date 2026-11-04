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
  isCaught,
  lootQuota,
  pickChestSpots,
  pickHideSpots,
} from './HideSeekRules'
import { TRAP_RADIUS, TRAP_RING_SEC, TrapState } from './HideSeekGadgets'
import { HideSeekMaze, HideSpot, MazeRect, insideRect } from './HideSeekMaze'
import { HideSeekTrait, catchReach, rescueReach } from './HideSeekTraits'

/**
 * The host's referee for a whole hide & seek match (pure: no Vue / Pixi / network).
 * Two sides with fixed roles for the whole match (the first lobby slots seek). A hider takes a treasure out of a chest
 * on the seekers' side and carries it home; caught, they drop it (anyone of their side can pick it up) and go to the
 * jail in the seekers' base, until a free teammate reaches the jail and sets everybody there free. Nobody is caught at
 * the hiders' home. The hiders win a round once every one of them brought their share home (or, with exit gates, then
 * got out); the seekers by jailing everyone or holding out. The side that wins most rounds wins the match.
 */

/** Pause between two rounds (results on screen) */
export const ROUND_BREAK_SEC = 6
/** A hider this close to the spot inside an open exit gate is out */
export const EXIT_REACH = 0.8
/** A hider this close to a dropped treasure picks it up */
export const PICKUP_REACH = 0.8

export type HideSeekTeam = 0 | 1

export interface HideSeekMatchClock {
  phase: HideSeekPhase
  timeLeft: number
  /** Side that won the round that just ended */
  winner: HideSeekRole | null
  reason: HideSeekEndReason | null
}

export interface HideSeekSeat {
  id: string
  team: HideSeekTeam
  role: HideSeekRole
  jailed: boolean
  score: number
  /** Treasures this hider brought home this round (each needs their own share) */
  delivered: number
  /** This hider carries a treasure (out of a chest, or picked up from the floor) */
  carrying: boolean
  /** Hiders this seeker caught this round: each one makes them faster and slower to tire */
  catches: number
}

export interface HideSeekMatch {
  /** 0-based */
  round: number
  rounds: number
  /** Rounds each side won so far */
  wins: Record<HideSeekRole, number>
  /** Side that won the match (null = draw or not over yet) */
  matchWinner: HideSeekRole | null
  clock: HideSeekMatchClock
  chests: ChestState[]
  /** Treasures dropped by caught hiders, waiting on the floor to be picked up */
  drops: GridCoord[]
  /** Barrels / cabinets a hider can hide in */
  spots: HideSpot[]
  traps: TrapState[]
  /** This round's random labyrinth (0 = the map's own layout); every client builds it from the seed */
  mazeSeed: number
  /** Per labyrinth door: open? Per candle (the labyrinth's stands, then the seekers' candles): burning? */
  doors: boolean[]
  torches: boolean[]
  /** Candles the seekers set down this round (after the labyrinth's own stands in `torches`) */
  candles: GridCoord[]
  /** Exit gates (the spot just inside each); they open once every hider brought their share home */
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
  /** Character trait (a rescuer frees from further away and, seeking, catches from further away) */
  trait?: HideSeekTrait | null
}

/** Where each side starts. */
export interface SpawnSets {
  seekers: GridCoord[]
  hiders: GridCoord[]
}

/** The places the rules care about: the jail (null = jailed where caught) and the hiders' home (null = no carrying). */
export interface MatchArena {
  jail: GridCoord | null
  home: MazeRect | null
}

export const NO_ARENA: MatchArena = { jail: null, home: null }

export function arenaOf(maze: HideSeekMaze | null): MatchArena {
  return maze ? { jail: maze.jail, home: maze.hiderBase } : NO_ARENA
}

export type MatchEvent =
  | { kind: 'loot'; chest: number; by: string }
  | { kind: 'delivered'; by: string }
  | { kind: 'pickup'; by: string }
  | { kind: 'drop'; col: number; row: number }
  | { kind: 'caught'; id: string }
  | { kind: 'freed'; id: string; by: string }
  | { kind: 'bell'; col: number; row: number }
  | { kind: 'round' }
  /** The break after a round is over: the session sets up the next round (a new labyrinth first) */
  | { kind: 'roundDue' }
  | { kind: 'exitsOpen' }
  | { kind: 'roundOver' }
  | { kind: 'ended' }

/** Every candle of the round, in `match.torches` order: the labyrinth's stands, then the seekers' candles. */
export function torchSpots(match: HideSeekMatch, maze: HideSeekMaze | null): GridCoord[] {
  return [...(maze?.torches ?? []), ...match.candles]
}

/** A new candle keeps this far from every other one */
const CANDLE_SPACING = 1.5

/** The first `seekerSlots` lobby slots are the seekers (team 0), the rest hide (team 1). */
export function teamForSlot(slotIndex: number, seekerSlots: number): HideSeekTeam {
  return slotIndex < seekerSlots ? 0 : 1
}

export function roleForSlot(slotIndex: number, seekerSlots: number): HideSeekRole {
  return teamForSlot(slotIndex, seekerSlots) === 0 ? 'seeker' : 'hider'
}

/** A map without a random labyrinth: its first start point is the seekers', the others are the hiders'. */
export function splitSpawns(points: GridCoord[]): SpawnSets {
  return { seekers: points.slice(0, 1), hiders: points.length > 1 ? points.slice(1) : points.slice(0, 1) }
}

export function allSpawns(spawns: SpawnSets): GridCoord[] {
  return [...spawns.seekers, ...spawns.hiders]
}

/** Team 0 seeks, team 1 hides, for the whole match. */
export function createMatch(entries: { id: string; team: HideSeekTeam }[], rounds = 1): HideSeekMatch {
  return {
    round: 0,
    rounds,
    wins: { seeker: 0, hider: 0 },
    matchWinner: null,
    clock: { phase: 'hiding', timeLeft: 0, winner: null, reason: null },
    chests: [],
    drops: [],
    spots: [],
    traps: [],
    mazeSeed: 0,
    doors: [],
    torches: [],
    candles: [],
    exits: [],
    exitsOpen: false,
    trapsPlaced: 0,
    seats: entries.map(({ id, team }) => ({
      id,
      team,
      role: team === 0 ? 'seeker' : 'hider',
      jailed: false,
      score: 0,
      delivered: 0,
      carrying: false,
      catches: 0,
    })),
    loot: {},
    champion: null,
  }
}

export function seatOf(match: HideSeekMatch, id: string): HideSeekSeat | undefined {
  return match.seats.find(s => s.id === id)
}

/** Seekers spread over their start points (the base), hiders over theirs (the far side). */
export function spawnForSeat(match: HideSeekMatch, id: string, spawns: SpawnSets): GridCoord {
  const seat = seatOf(match, id)
  const role = seat?.role ?? 'hider'
  const points = role === 'seeker' ? spawns.seekers : spawns.hiders
  const fallback = allSpawns(spawns)[0] ?? { col: 0, row: 0 }
  if (!seat || points.length === 0) return points[0] ?? fallback
  const index = match.seats.filter(s => s.role === role).indexOf(seat)
  return points[index % points.length]
}

/** Hiders who already brought their share home this round, out of all hiders. */
export function lootProgress(match: HideSeekMatch, settings: HideSeekSettings): { done: number; total: number } {
  const hiders = match.seats.filter(s => s.role === 'hider')
  const quota = lootQuota(settings)
  return { done: hiders.filter(s => s.delivered >= quota).length, total: hiders.length }
}

/** Where a jailed player stands: around the jail, one beside the other (`slot` = their place in the line). */
export function jailSpot(jail: GridCoord, slot: number): GridCoord {
  const angle = (slot * 2 * Math.PI) / 6
  return slot === 0 ? { ...jail } : { col: jail.col + Math.cos(angle) * 0.9, row: jail.row + Math.sin(angle) * 0.9 }
}

/**
 * Sets up round `round`: fresh chests (each hider's share, on the seekers' side of a random labyrinth) and hiding
 * spots, nobody in jail, nothing carried. With a random labyrinth its own hiding spots are used, its doors start shut
 * and its candles burn.
 */
export function startRound(
  match: HideSeekMatch,
  round: number,
  grid: CollisionGrid,
  spawns: SpawnSets,
  settings: HideSeekSettings,
  random: () => number,
  maze: HideSeekMaze | null = null
): void {
  match.round = round
  for (const seat of match.seats) {
    seat.jailed = false
    seat.delivered = 0
    seat.carrying = false
    seat.catches = 0
  }
  const hiderCount = Math.max(1, match.seats.filter(s => s.role === 'hider').length)
  const starts = allSpawns(spawns)
  const props = maze ? [...maze.spots, ...maze.torches, ...maze.doors.map(d => d.center), ...maze.exits.map(e => e.at)] : []
  const zone = maze ? (p: GridCoord) => insideRect(maze.seekerSide, p) && !insideRect(maze.seekerBase, p, 1) : undefined
  match.chests = pickChestSpots(grid, starts, settings.chestCount * hiderCount, random, props, zone).map(p => ({ ...p, looted: false }))
  match.drops = []
  match.spots = maze
    ? maze.spots.map(spot => ({ ...spot }))
    : pickHideSpots(grid, starts, match.chests, settings.hideSpotCount, random).map(p => ({ ...p, kind: 'barrel' as const, facing: 'E' as const }))
  match.mazeSeed = maze?.seed ?? 0
  match.doors = maze ? maze.doors.map(() => false) : []
  match.torches = maze ? maze.torches.map(() => true) : []
  match.candles = []
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

/** A hider blows a candle out, a seeker lights it again. */
export function useTorch(match: HideSeekMatch, index: number, role: HideSeekRole): boolean {
  const lit = role === 'seeker'
  if (index < 0 || index >= match.torches.length || match.torches[index] === lit) return false
  match.torches[index] = lit
  return true
}

function endRound(match: HideSeekMatch, winner: HideSeekRole, reason: HideSeekEndReason, settings: HideSeekSettings): MatchEvent {
  for (const seat of match.seats) if (seat.role === winner) seat.score += settings.scoreWin
  match.wins[winner]++
  // Over once all rounds are played, or one side already won most of them
  const majority = Math.floor(match.rounds / 2) + 1
  const last = match.round + 1 >= match.rounds || match.wins[winner] >= majority
  match.clock = { phase: last ? 'ended' : 'roundOver', timeLeft: last ? 0 : ROUND_BREAK_SEC, winner, reason }
  match.loot = {}
  if (!last) return { kind: 'roundOver' }
  const { seeker, hider } = match.wins
  match.matchWinner = seeker > hider ? 'seeker' : hider > seeker ? 'hider' : null
  const ranked = [...match.seats].sort((a, b) => b.score - a.score)
  match.champion = ranked.length > 1 && Math.floor(ranked[0].score) === Math.floor(ranked[1].score) ? null : (ranked[0]?.id ?? null)
  return { kind: 'ended' }
}

/** A hider is caught: a carried treasure falls where they stood, and they go to jail. */
function jail(match: HideSeekMatch, hider: HideSeekSeat, at: GridCoord, seeker: HideSeekSeat | undefined, settings: HideSeekSettings, events: MatchEvent[]): void {
  hider.jailed = true
  delete match.loot[hider.id]
  if (hider.carrying) {
    hider.carrying = false
    match.drops.push({ col: at.col, row: at.row })
    events.push({ kind: 'drop', col: at.col, row: at.row })
  }
  if (seeker) {
    seeker.score += settings.scoreCatch
    seeker.catches++
  }
  events.push({ kind: 'caught', id: hider.id })
}

function allHidersJailed(match: HideSeekMatch, present: Set<string>): boolean {
  return match.seats.filter(s => s.role === 'hider' && present.has(s.id)).every(s => s.jailed)
}

/** Every hider still in the match has brought their own share home (jailed ones too: they have to be freed first). */
function everyHiderHasShare(match: HideSeekMatch, present: Set<string>, settings: HideSeekSettings): boolean {
  const quota = lootQuota(settings)
  return match.seats.filter(s => s.role === 'hider' && present.has(s.id)).every(s => s.delivered >= quota)
}

/** One referee frame. `bodies` are the players still in the match. */
export function tickMatch(
  match: HideSeekMatch,
  bodies: MatchBody[],
  grid: CollisionGrid,
  settings: HideSeekSettings,
  deltaSec: number,
  arena: MatchArena = NO_ARENA
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
  const seekers = match.seats.filter(s => s.role === 'seeker' && present.has(s.id))
  const hiders = match.seats.filter(s => s.role === 'hider' && present.has(s.id))
  if (seekers.length === 0) return [endRound(match, 'hider', 'left', settings)]
  if (hiders.length === 0) return [endRound(match, 'seeker', 'left', settings)]

  if (clock.phase === 'hiding' && clock.timeLeft <= 0) {
    match.clock = { phase: 'seeking', timeLeft: settings.roundTime, winner: null, reason: null }
  } else if (clock.phase === 'seeking' && clock.timeLeft <= 0) {
    return [endRound(match, 'seeker', 'time', settings)]
  }

  // Treasure: a free hider (not inside a barrel) brings a carried one home, picks a dropped one up,
  // or takes one out of a chest by standing at it
  const quota = lootQuota(settings)
  const atHome = (p: GridCoord) => !!arena.home && insideRect(arena.home, p)
  for (const seat of hiders) {
    const body = byId.get(seat.id)!
    if (seat.jailed || body.hidden !== -1) {
      delete match.loot[seat.id]
      continue
    }
    let brought = false
    if (seat.carrying) {
      if (!atHome(body)) continue
      seat.carrying = false
      brought = true
    } else {
      if (seat.delivered >= quota) continue
      const drop = match.drops.findIndex(d => Math.hypot(d.col - body.col, d.row - body.row) <= PICKUP_REACH)
      if (drop !== -1) {
        match.drops.splice(drop, 1)
        seat.carrying = true
        events.push({ kind: 'pickup', by: seat.id })
        continue
      }
      const progress = advanceLoot(match.loot[seat.id] ?? NO_LOOT, body, match.chests, deltaSec)
      match.loot[seat.id] = progress
      if (progress.index === -1 || progress.time < settings.lootTime) continue
      match.chests[progress.index].looted = true
      match.loot[seat.id] = NO_LOOT
      events.push({ kind: 'loot', chest: progress.index, by: seat.id })
      // With a home the treasure has to be carried there; without one it counts right away
      if (arena.home) {
        seat.carrying = true
        continue
      }
      brought = true
    }
    if (!brought) continue
    seat.delivered++
    seat.score += settings.scoreChest
    events.push({ kind: 'delivered', by: seat.id })
    if (!everyHiderHasShare(match, present, settings)) continue
    // Everyone has their share: with exit gates the hiders still have to get out, otherwise they win right away
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

  // Rescue: with a jail, a free hider reaching it sets everybody there free; without one, a touch frees the touched
  const freeHiders = hiders.filter(h => !h.jailed && byId.get(h.id)!.hidden === -1)
  if (arena.jail) {
    const jailAt = arena.jail
    const rescuer = freeHiders.find(h => {
      const b = byId.get(h.id)!
      return Math.hypot(b.col - jailAt.col, b.row - jailAt.row) <= rescueReach(settings, b.trait) + PICKUP_REACH
    })
    if (rescuer) {
      for (const seat of hiders.filter(h => h.jailed)) {
        seat.jailed = false
        rescuer.score += settings.scoreRescue
        events.push({ kind: 'freed', id: seat.id, by: rescuer.id })
      }
    }
  } else {
    for (const seat of hiders.filter(h => h.jailed)) {
      const body = byId.get(seat.id)!
      const rescuer = freeHiders.find(h => {
        const other = byId.get(h.id)!
        return Math.hypot(other.col - body.col, other.row - body.row) <= rescueReach(settings, other.trait) && hasLineOfSight(grid, other, body)
      })
      if (!rescuer) continue
      seat.jailed = false
      rescuer.score += settings.scoreRescue
      events.push({ kind: 'freed', id: seat.id, by: rescuer.id })
    }
  }

  // Catching: inside a barrel nobody can touch you (a seeker has to open it), at home nobody catches you
  for (const seat of hiders) {
    const body = byId.get(seat.id)!
    if (seat.jailed) continue
    seat.score += settings.scorePerSecond * deltaSec
    if (body.hidden !== -1 || atHome(body)) continue
    const catcher = seekers.find(s => {
      const seekerBody = byId.get(s.id)!
      return isCaught(grid, seekerBody, body, { ...settings, catchDistance: catchReach(settings, seekerBody.trait) })
    })
    if (catcher) jail(match, seat, body, catcher, settings, events)
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

/** Seeker `by` opens a hiding spot: whoever sits inside goes to jail. */
export function searchSpot(match: HideSeekMatch, spotIndex: number, bodies: MatchBody[], settings: HideSeekSettings, by: string): MatchEvent[] {
  const seeker = seatOf(match, by)
  if (match.clock.phase !== 'seeking' || seeker?.role !== 'seeker') return []
  const present = new Set(bodies.map(b => b.id))
  const events: MatchEvent[] = []
  for (const body of bodies) {
    const seat = seatOf(match, body.id)
    if (seat?.role === 'hider' && !seat.jailed && body.hidden === spotIndex) jail(match, seat, body, seeker, settings, events)
  }
  if (events.length > 0 && allHidersJailed(match, present)) events.push(endRound(match, 'seeker', 'caught', settings))
  return events
}

/** A candle can go here: while seeking, not on top of another candle. */
export function canPlaceCandle(match: HideSeekMatch, at: GridCoord, maze: HideSeekMaze | null): boolean {
  return match.clock.phase === 'seeking' && !torchSpots(match, maze).some(t => Math.hypot(t.col - at.col, t.row - at.row) < CANDLE_SPACING)
}

/**
 * A seeker sets a burning candle down where they stand (at most `limit` for all seekers this round, not on top of
 * another candle). It joins the round's candles: hiders can blow it out, seekers light it again.
 */
export function placeCandle(match: HideSeekMatch, at: GridCoord, limit: number, maze: HideSeekMaze | null): boolean {
  if (match.candles.length >= limit || !canPlaceCandle(match, at, maze)) return false
  match.candles.push({ col: at.col, row: at.row })
  match.torches.push(true)
  return true
}

/** A seeker drops a bell trap where they stand (at most `limit` for all seekers this round). */
export function placeTrap(match: HideSeekMatch, at: GridCoord, limit: number): boolean {
  if (match.clock.phase !== 'seeking' || match.trapsPlaced >= limit) return false
  match.traps.push({ col: at.col, row: at.row, ringing: 0 })
  match.trapsPlaced++
  return true
}
