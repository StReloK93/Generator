import {
  AbilityEffects,
  AbilityId,
  AbilityMark,
  ABILITY_SLOTS,
  EffectKind,
  abilitiesOf,
  distanceToSegment,
  fireWallEnds,
  isMarkAbility,
  markLife,
  abilityCooldown,
  noEffects,
  scoutSpot,
  startAbility,
  tickAbilities,
  touchable,
} from './HideSeekAbilities'
import { GridCoord, HideSeekSettings } from '../../types/map'
import {
  ALTAR_REACH,
  AltarState,
  CollisionGrid,
  HideSeekEndReason,
  HideSeekPhase,
  HideSeekRole,
  hasLineOfSight,
  isCaught,
  pickHideSpots,
  pickObjectiveSpots,
} from './HideSeekRules'
import { TRAP_RADIUS, TRAP_RING_SEC, TrapState } from './HideSeekGadgets'
import { HideSeekMaze, HideSpot, MazeRect, insideRect } from './HideSeekMaze'
import { HideSeekTrait, catchReach, lightingSpeed, rescueReach } from './HideSeekTraits'

/**
 * The host's referee for a whole hide & seek match (pure: no Vue / Pixi / network).
 * Two sides with fixed roles for the whole match (the first lobby slots seek). Altars are spread over the labyrinth;
 * hiders standing at one light it (together faster), a seeker standing at a half-lit one puts it out. A hider who lit
 * an altar can chain a nearby seeker: both stand still until the chain runs out (the seeker is then dazed for a moment)
 * or another seeker frees them - one hider holds a seeker while a teammate lights the next altar. Caught hiders go to
 * the jail in the seekers' base until a free teammate reaches it; nobody is caught at the hiders' home.
 * The hiders win a round with all but one altar lit (or, with exit gates, by then getting out); the seekers by jailing
 * everyone or holding out. The side that wins most rounds wins the match.
 */

/** Pause between two rounds (results on screen) */
export const ROUND_BREAK_SEC = 6
/** A hider this close to the spot inside an open exit gate is out */
export const EXIT_REACH = 0.8
/** Altars keep this far apart (one seeker cannot watch two) and from both bases */
const ALTAR_SPACING = 9
const ALTAR_BASE_MARGIN = 2
/** Nobody is caught in the first seconds of seeking (everyone's position has reached the referee) */
const START_GRACE_SEC = 3
/** Never fewer altars than this (1 against 1: 3 altars, 2 of them needed) */
const MIN_ALTARS = 3

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
  /** Altars this hider helped light this round (one lit altar lets them chain seekers) */
  lit: number
  /** Seconds until this hider can chain a seeker again */
  chainCooldown: number
  /** Seconds this seeker is still dazed after a chain ran out (cannot move or catch) */
  dazed: number
  /** Hiders this seeker caught this round: each one makes them faster and slower to tire */
  catches: number
  /** Seconds until each of the hero's abilities (Q, F) is ready again, and the timed ones still running */
  cooldowns: number[]
  effects: AbilityEffects
}

/** A hider holding a seeker: both stand still until it runs out, the seeker is freed or the hider caught. */
export interface ChainState {
  hider: string
  seeker: string
  timeLeft: number
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
  altars: AltarState[]
  /** Lit altars the hiders need this round */
  altarsNeeded: number
  chains: ChainState[]
  /** Seconds a free hider has stood at the jail (at rescueTime everybody in it is set free) */
  rescueProgress: number
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
  /** Exit gates (the spot just inside each); they open once enough altars are lit */
  exits: GridCoord[]
  exitsOpen: boolean
  trapsPlaced: number
  /** What abilities left on the map: scout birds, fire walls, decoys, snares */
  marks: AbilityMark[]
  seats: HideSeekSeat[]
  /** Best total score after the last round (null = draw or not over yet) */
  champion: string | null
}

/** What the referee needs to know about a player this frame (players own their position). */
export interface MatchBody extends GridCoord {
  id: string
  moving: boolean
  /** Hiding spot the player sits in (-1 = none) */
  hidden: number
  /** Character trait (a rescuer frees from further away and, seeking, catches from further away; a firekeeper lights faster) */
  trait?: HideSeekTrait | null
  /** Hero and heading (for abilities) */
  model?: string
  facing?: number
}

/** Where each side starts. */
export interface SpawnSets {
  seekers: GridCoord[]
  hiders: GridCoord[]
}

/** The places the rules care about: the jail (null = jailed where caught) and the hiders' home (null = no safe zone). */
export interface MatchArena {
  jail: GridCoord | null
  home: MazeRect | null
}

export const NO_ARENA: MatchArena = { jail: null, home: null }

export function arenaOf(maze: HideSeekMaze | null): MatchArena {
  return maze ? { jail: maze.jail, home: maze.hiderBase } : NO_ARENA
}

export type MatchEvent =
  | { kind: 'altarLit'; altar: number; by: string }
  | { kind: 'chain'; hider: string; seeker: string }
  /** dazed: the chain ran out (the seeker stands dazed); otherwise the seeker was freed or the hider caught */
  | { kind: 'chainEnd'; hider: string; seeker: string; dazed: boolean }
  | { kind: 'caught'; id: string }
  | { kind: 'freed'; id: string; by: string }
  | { kind: 'bell'; col: number; row: number }
  | { kind: 'ability'; by: string; slot: number; ability: AbilityId; mark: AbilityMark | null }
  /** A timed effect put on a player by someone else (a roar, a fire wall, a snare) */
  | { kind: 'effect'; id: string; effect: EffectKind; seconds: number }
  /** A hook pulled a player here (their own client moves them) */
  | { kind: 'pulled'; id: string; col: number; row: number }
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
    altars: [],
    altarsNeeded: 0,
    chains: [],
    rescueProgress: 0,
    spots: [],
    traps: [],
    mazeSeed: 0,
    doors: [],
    torches: [],
    candles: [],
    exits: [],
    exitsOpen: false,
    trapsPlaced: 0,
    marks: [],
    seats: entries.map(({ id, team }) => ({
      id,
      team,
      role: team === 0 ? 'seeker' : 'hider',
      jailed: false,
      score: 0,
      lit: 0,
      chainCooldown: 0,
      dazed: 0,
      catches: 0,
      cooldowns: Array<number>(ABILITY_SLOTS).fill(0),
      effects: noEffects(),
    })),
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

/** The chain a player is in (holding or held), if any. */
export function chainOf(match: HideSeekMatch, id: string): ChainState | undefined {
  return match.chains.find(c => c.hider === id || c.seeker === id)
}

/** Cannot move: in a chain (either end) or dazed after one. */
export function isFrozen(match: HideSeekMatch, id: string): boolean {
  return !!chainOf(match, id) || (seatOf(match, id)?.dazed ?? 0) > 0
}

/** Lit altars, how many the hiders need, and how many there are. */
export function altarProgress(match: HideSeekMatch): { lit: number; needed: number; total: number } {
  return { lit: match.altars.filter(a => a.lit).length, needed: match.altarsNeeded, total: match.altars.length }
}

/** Where a jailed player stands: around the jail, one beside the other (`slot` = their place in the line). */
export function jailSpot(jail: GridCoord, slot: number): GridCoord {
  const angle = (slot * 2 * Math.PI) / 6
  return slot === 0 ? { ...jail } : { col: jail.col + Math.cos(angle) * 0.9, row: jail.row + Math.sin(angle) * 0.9 }
}

/**
 * Sets up round `round`: fresh altars (one per hider plus a few, spread over the labyrinth away from both bases) and
 * hiding spots, nobody in jail or chained. With a random labyrinth its own hiding spots are used, its doors start shut
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
    seat.lit = 0
    seat.chainCooldown = 0
    seat.dazed = 0
    seat.catches = 0
    seat.cooldowns = Array<number>(ABILITY_SLOTS).fill(0)
    seat.effects = noEffects()
  }
  match.marks = []
  const hiderCount = Math.max(1, match.seats.filter(s => s.role === 'hider').length)
  const starts = allSpawns(spawns)
  const props = maze ? [...maze.spots, ...maze.torches, ...maze.doors.map(d => d.center), ...maze.exits.map(e => e.at)] : []
  // Away from both bases and every start point, so they have to be searched for (closer again if the maze is too
  // small for that)
  const zone = (margin: number) => (p: GridCoord) =>
    starts.every(s => Math.hypot(s.col - p.col, s.row - p.row) >= margin) &&
    (!maze || (!insideRect(maze.seekerBase, p, margin) && !insideRect(maze.hiderBase, p, margin)))
  const count = Math.max(MIN_ALTARS, hiderCount + settings.altarExtra)
  let spots = pickObjectiveSpots(grid, starts, count, random, props, zone(Math.max(ALTAR_BASE_MARGIN, settings.altarBaseDistance)), ALTAR_SPACING)
  if (spots.length < count) spots = pickObjectiveSpots(grid, starts, count, random, props, zone(ALTAR_BASE_MARGIN), ALTAR_SPACING)
  match.altars = spots.map(p => ({ ...p, progress: 0, lit: false }))
  // A share of them (0.55: 2 of 3 one against one, 3 of 5, 4 of 7 five against five)
  match.altarsNeeded = Math.max(1, Math.ceil(match.altars.length * settings.altarsNeededShare - 1e-9))
  match.chains = []
  match.rescueProgress = 0
  match.spots = maze
    ? maze.spots.map(spot => ({ ...spot }))
    : pickHideSpots(grid, starts, match.altars, settings.hideSpotCount, random).map(p => ({ ...p, kind: 'barrel' as const, facing: 'E' as const }))
  match.mazeSeed = maze?.seed ?? 0
  match.doors = maze ? maze.doors.map(() => false) : []
  match.torches = maze ? maze.torches.map(() => true) : []
  match.candles = []
  match.exits = maze ? maze.exits.map(e => ({ ...e.at })) : []
  match.exitsOpen = false
  match.traps = []
  match.trapsPlaced = 0
  // The sides start far apart: without a hiding time (0) the seekers set off right away
  match.clock = settings.hideTime > 0
    ? { phase: 'hiding', timeLeft: settings.hideTime, winner: null, reason: null }
    : { phase: 'seeking', timeLeft: settings.roundTime, winner: null, reason: null }
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
  match.chains = []
  if (!last) return { kind: 'roundOver' }
  const { seeker, hider } = match.wins
  match.matchWinner = seeker > hider ? 'seeker' : hider > seeker ? 'hider' : null
  const ranked = [...match.seats].sort((a, b) => b.score - a.score)
  match.champion = ranked.length > 1 && Math.floor(ranked[0].score) === Math.floor(ranked[1].score) ? null : (ranked[0]?.id ?? null)
  return { kind: 'ended' }
}

/** Ends a chain early (the seeker was freed or the hider caught): no daze. */
function breakChain(match: HideSeekMatch, chain: ChainState, events: MatchEvent[]): void {
  match.chains = match.chains.filter(c => c !== chain)
  events.push({ kind: 'chainEnd', hider: chain.hider, seeker: chain.seeker, dazed: false })
}

/** A hider is caught: a chain they hold breaks, and they go to jail. */
function jail(match: HideSeekMatch, hider: HideSeekSeat, seeker: HideSeekSeat | undefined, settings: HideSeekSettings, events: MatchEvent[]): void {
  hider.jailed = true
  const chain = match.chains.find(c => c.hider === hider.id)
  if (chain) breakChain(match, chain, events)
  if (seeker) {
    seeker.score += settings.scoreCatch
    seeker.catches++
  }
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

  for (const seat of match.seats) {
    seat.chainCooldown = Math.max(0, seat.chainCooldown - deltaSec)
    seat.dazed = Math.max(0, seat.dazed - deltaSec)
    tickAbilities(seat.cooldowns, seat.effects, deltaSec)
  }
  dropTrails(match, bodies, settings)

  // Chains: one that runs out leaves the seeker dazed; a chain whose player left breaks
  for (const chain of [...match.chains]) {
    if (!present.has(chain.hider) || !present.has(chain.seeker)) {
      breakChain(match, chain, events)
      continue
    }
    chain.timeLeft -= deltaSec
    if (chain.timeLeft > 0) continue
    match.chains = match.chains.filter(c => c !== chain)
    const seeker = seatOf(match, chain.seeker)
    if (seeker) seeker.dazed = settings.chainDaze
    events.push({ kind: 'chainEnd', hider: chain.hider, seeker: chain.seeker, dazed: true })
  }
  /** Can act this frame: not chained, not dazed */
  const active = (seat: HideSeekSeat) => !isFrozen(match, seat.id)
  const activeSeekers = seekers.filter(s => active(s) && s.effects.burrow <= 0)
  const freeHiders = hiders.filter(h => !h.jailed && active(h) && byId.get(h.id)!.hidden === -1)
  const near = (id: string, p: GridCoord, reach: number) => {
    const b = byId.get(id)!
    return Math.hypot(b.col - p.col, b.row - p.row) <= reach
  }

  // Altars: hiders standing at one light it (together faster); a seeker standing at a half-lit one puts it out
  match.altars.forEach((altar, index) => {
    if (altar.lit) return
    const lighters = freeHiders.filter(h => near(h.id, altar, ALTAR_REACH))
    if (lighters.length > 0) {
      const rate = lighters.reduce((sum, h) => sum + lightingSpeed(settings, byId.get(h.id)!.trait), 0)
      altar.progress = Math.min(1, altar.progress + (rate * deltaSec) / settings.altarLightTime)
      if (altar.progress < 1) return
      altar.lit = true
      for (const h of lighters) {
        h.lit++
        h.score += settings.scoreAltar
      }
      events.push({ kind: 'altarLit', altar: index, by: lighters[0].id })
      return
    }
    // Put out only down to the last stage reached: a hider who had to run keeps that much
    if (altar.progress > 0 && activeSeekers.some(s => near(s.id, altar, ALTAR_REACH))) {
      const stage = Math.floor(altar.progress * settings.altarStages + 1e-9) / settings.altarStages
      altar.progress = Math.max(stage, altar.progress - deltaSec / settings.altarKickTime)
    }
  })
  if (match.altars.length > 0 && altarProgress(match).lit >= match.altarsNeeded) {
    // Enough altars: with exit gates the hiders still have to get out, otherwise they win right away
    if (match.exits.length === 0) return [...events, endRound(match, 'hider', 'altars', settings)]
    if (!match.exitsOpen) {
      match.exitsOpen = true
      events.push({ kind: 'exitsOpen' })
    }
  }

  // A free hider reaching an open gate wins the round for the hiders
  if (match.exitsOpen && freeHiders.some(h => match.exits.some(e => near(h.id, e, EXIT_REACH)))) {
    return [...events, endRound(match, 'hider', 'escaped', settings)]
  }

  if (match.clock.phase !== 'seeking') return events

  // A free seeker touching a chained teammate sets them free (no daze)
  for (const chain of [...match.chains]) {
    if (activeSeekers.some(s => near(s.id, byId.get(chain.seeker)!, settings.catchDistance))) breakChain(match, chain, events)
  }

  // Rescue: with a jail, a free hider standing at it for the rescue time sets everybody there free;
  // without one, a touch frees the touched
  if (arena.jail) {
    const jailAt = arena.jail
    const anyJailed = hiders.some(h => h.jailed)
    const rescuer = anyJailed ? freeHiders.find(h => near(h.id, jailAt, rescueReach(settings, byId.get(h.id)!.trait) + EXIT_REACH)) : undefined
    match.rescueProgress = rescuer ? match.rescueProgress + deltaSec : 0
    if (rescuer && match.rescueProgress >= settings.rescueTime) {
      match.rescueProgress = 0
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
        return near(h.id, body, rescueReach(settings, other.trait)) && hasLineOfSight(grid, other, body)
      })
      if (!rescuer) continue
      seat.jailed = false
      rescuer.score += settings.scoreRescue
      events.push({ kind: 'freed', id: seat.id, by: rescuer.id })
    }
  }

  // Catching: inside a barrel nobody can touch you (a seeker has to open it), at home nobody catches you;
  // a hider holding a chain stands still and is easy prey for the other seeker
  const graceOver = settings.roundTime - match.clock.timeLeft >= START_GRACE_SEC
  for (const seat of hiders) {
    const body = byId.get(seat.id)!
    if (seat.jailed) continue
    seat.score += settings.scorePerSecond * deltaSec
    if (!graceOver || body.hidden !== -1 || seat.effects.shield > 0 || !touchable(seat.effects) || (arena.home && insideRect(arena.home, body))) continue
    const catcher = activeSeekers.find(s => {
      const seekerBody = byId.get(s.id)!
      return isCaught(grid, seekerBody, body, { ...settings, catchDistance: catchReach(settings, seekerBody.trait) })
    })
    if (catcher) jail(match, seat, catcher, settings, events)
  }

  // Bell traps ring when a free hider walks by, then stop
  match.traps = match.traps.filter(trap => {
    if (trap.ringing > 0) {
      trap.ringing -= deltaSec
      return trap.ringing > 0
    }
    const walker = hiders.find(h => !h.jailed && byId.get(h.id)!.hidden === -1 && near(h.id, trap, TRAP_RADIUS))
    if (walker) {
      trap.ringing = TRAP_RING_SEC
      events.push({ kind: 'bell', col: trap.col, row: trap.row })
    }
    return true
  })

  tickMarks(match, bodies, settings, deltaSec, events)

  if (allHidersJailed(match, present)) return [...events, endRound(match, 'seeker', 'caught', settings)]
  return events
}

/** A stalking runner leaves a trail point every TRAIL_STEP tiles: it keeps watch for them a while */
function dropTrails(match: HideSeekMatch, bodies: MatchBody[], settings: HideSeekSettings): void {
  for (const body of bodies) {
    const seat = seatOf(match, body.id)
    if (!seat || seat.effects.stalk <= 0) continue
    const last = [...match.marks].reverse().find(m => m.kind === 'trail' && m.by === body.id)
    if (last && Math.hypot(last.col - body.col, last.row - body.row) < TRAIL_STEP) continue
    match.marks.push({ kind: 'trail', by: body.id, team: seat.team, facing: 0, timeLeft: markLife('trail', settings), model: '', col: body.col, row: body.row })
  }
}

/** A nest's cooldown starts (flown back to, or run out) */
function restNest(match: HideSeekMatch, bodies: MatchBody[], by: string, settings: HideSeekSettings): void {
  const seat = seatOf(match, by)
  const slot = abilitiesOf(bodies.find(b => b.id === by)?.model).indexOf('nest')
  if (seat && slot >= 0) seat.cooldowns[slot] = abilityCooldown('nest', settings)
}

/** Snares catch prey this close */
const SNARE_RADIUS = 0.8
/** Fire walls burn whoever comes this close to the line */
const FIRE_REACH = 0.7
/** A stalker drops a trail point every this many tiles */
const TRAIL_STEP = 1

/** Ability marks: they run out; opponents crossing a fire wall are slowed, stepping on a snare are rooted, touching a
 * decoy makes it vanish. */
function tickMarks(match: HideSeekMatch, bodies: MatchBody[], settings: HideSeekSettings, deltaSec: number, events: MatchEvent[]): void {
  const opponents = (mark: AbilityMark) =>
    bodies.filter(b => {
      const seat = seatOf(match, b.id)
      return !!seat && seat.team !== mark.team && !seat.jailed && b.hidden === -1 && touchable(seat.effects)
    })
  const put = (id: string, effect: EffectKind, seconds: number) => {
    const seat = seatOf(match, id)
    if (!seat) return
    // Only told once when it starts (staying in the fire keeps it topped up quietly)
    if (seat.effects[effect] <= 0) events.push({ kind: 'effect', id, effect, seconds })
    seat.effects[effect] = Math.max(seat.effects[effect], seconds)
  }
  match.marks = match.marks.filter(mark => {
    mark.timeLeft -= deltaSec
    if (mark.timeLeft <= 0) {
      // A nest that was never flown back to: its cooldown starts now
      if (mark.kind === 'nest') restNest(match, bodies, mark.by, settings)
      return false
    }
    if (mark.kind === 'fireWall') {
      const [a, b] = fireWallEnds(mark, settings)
      for (const o of opponents(mark)) if (distanceToSegment(o, a, b) <= FIRE_REACH) put(o.id, 'slowed', settings.fireWallSlowTime)
    } else if (mark.kind === 'snare') {
      const prey = opponents(mark).find(o => Math.hypot(o.col - mark.col, o.row - mark.row) <= SNARE_RADIUS)
      if (prey) {
        put(prey.id, 'rooted', settings.snareTime)
        return false
      }
    } else if (mark.kind === 'decoy') {
      if (opponents(mark).some(o => Math.hypot(o.col - mark.col, o.row - mark.row) <= settings.catchDistance)) return false
    }
    return true
  })
}

/**
 * Hider `hiderId` chains the nearest seeker in reach: they must have lit an altar, be free and off cooldown, and see
 * the seeker. Both stand still for the chain time.
 */
export function startChain(match: HideSeekMatch, hiderId: string, bodies: MatchBody[], grid: CollisionGrid, settings: HideSeekSettings): MatchEvent[] {
  const hider = seatOf(match, hiderId)
  const body = bodies.find(b => b.id === hiderId)
  if (match.clock.phase !== 'seeking' || !hider || !body || hider.role !== 'hider') return []
  if (hider.jailed || hider.lit === 0 || hider.chainCooldown > 0 || body.hidden !== -1 || isFrozen(match, hiderId)) return []
  const distance = (b: MatchBody) => Math.hypot(b.col - body.col, b.row - body.row)
  const target = bodies
    .filter(b => seatOf(match, b.id)?.role === 'seeker' && seatOf(match, b.id)!.effects.shield <= 0 && touchable(seatOf(match, b.id)!.effects) && !isFrozen(match, b.id) && distance(b) <= settings.chainRange && hasLineOfSight(grid, body, b))
    .sort((a, b) => distance(a) - distance(b))[0]
  if (!target) return []
  match.chains.push({ hider: hiderId, seeker: target.id, timeLeft: settings.chainTime })
  hider.chainCooldown = settings.chainTime + settings.chainCooldown
  return [{ kind: 'chain', hider: hiderId, seeker: target.id }]
}

/** A hooked hider lands this far in front of the seeker */
const HOOK_LANDING = 1.2

/**
 * Player `by` uses ability `slot` of their hero: only while free (not jailed, chained, dazed or underground) and once
 * it has cooled down. Leaps (dash, blink, a hider's hook) and second wind act on the player's own body; this keeps the
 * time, leaves the marks and puts the effects on others (a seeker's hook pulls, a roar slows).
 */
export function useAbility(match: HideSeekMatch, by: string, slot: number, bodies: MatchBody[], grid: CollisionGrid, settings: HideSeekSettings): MatchEvent[] {
  const seat = seatOf(match, by)
  const body = bodies.find(b => b.id === by)
  const ability = abilitiesOf(body?.model)[slot]
  if (!seat || !body || !ability || seat.jailed || isFrozen(match, by) || seat.effects.burrow > 0 || seat.cooldowns[slot] > 0) return []
  if (match.clock.phase !== 'hiding' && match.clock.phase !== 'seeking') return []
  const events: MatchEvent[] = []
  const facing = body.facing ?? 0
  const distance = (b: MatchBody) => Math.hypot(b.col - body.col, b.row - body.row)
  const opponents = bodies.filter(b => {
    const other = seatOf(match, b.id)
    return !!other && other.team !== seat.team && !other.jailed && b.hidden === -1 && touchable(other.effects)
  })
  /** Puts a timed effect on another player and tells everyone */
  const put = (id: string, effect: EffectKind, seconds: number) => {
    const other = seatOf(match, id)!
    other.effects[effect] = Math.max(other.effects[effect], seconds)
    events.push({ kind: 'effect', id, effect, seconds })
  }
  /** The nearest opponent in sight within `range` */
  const nearestInSight = (range: number) =>
    opponents.filter(b => distance(b) <= range && hasLineOfSight(grid, body, b)).sort((a, b) => distance(a) - distance(b))[0]

  if (ability === 'hook' && seat.role === 'seeker') {
    const prey = opponents
      .filter(b => seatOf(match, b.id)!.effects.shield <= 0 && distance(b) <= settings.hookRange && hasLineOfSight(grid, body, b))
      .sort((a, b) => distance(a) - distance(b))[0]
    // Nothing to pull: the hook is not spent
    if (!prey) return []
    const d = distance(prey)
    const t = Math.min(1, HOOK_LANDING / d)
    events.push({ kind: 'pulled', id: prey.id, col: body.col + (prey.col - body.col) * t, row: body.row + (prey.row - body.row) * t })
  } else if (ability === 'roar') {
    for (const o of opponents.filter(b => distance(b) <= settings.roarRange)) put(o.id, 'slowed', settings.roarTime)
  } else if (ability === 'bash') {
    for (const o of opponents.filter(b => distance(b) <= settings.bashRange)) put(o.id, 'rooted', settings.bashTime)
  } else if (ability === 'nest') {
    // Pressed again while the nest lasts: fly back to it (then it cools down)
    const nest = match.marks.find(m => m.kind === 'nest' && m.by === by)
    if (nest) {
      match.marks = match.marks.filter(m => m !== nest)
      seat.cooldowns[slot] = abilityCooldown('nest', settings)
      return [{ kind: 'ability', by, slot, ability, mark: null }, { kind: 'pulled', id: by, col: nest.col, row: nest.row }]
    }
  } else if (ability === 'swap') {
    const other = nearestInSight(settings.swapRange)
    // Nobody to swap with: not spent
    if (!other) return []
    events.push({ kind: 'pulled', id: other.id, col: body.col, row: body.row }, { kind: 'pulled', id: by, col: other.col, row: other.row })
  }

  let mark: AbilityMark | null = null
  if (isMarkAbility(ability)) {
    const at = ability === 'scout' ? scoutSpot(grid, body, facing, settings) : { col: body.col, row: body.row }
    mark = { kind: ability, by, team: seat.team, facing, timeLeft: markLife(ability, settings), model: body.model ?? '', ...at }
    match.marks.push(mark)
  }
  startAbility(seat.cooldowns, seat.effects, slot, ability, settings)
  return [{ kind: 'ability', by, slot, ability, mark: mark && { ...mark } }, ...events]
}

/** Seeker `by` opens a hiding spot: whoever sits inside goes to jail. */
export function searchSpot(match: HideSeekMatch, spotIndex: number, bodies: MatchBody[], settings: HideSeekSettings, by: string): MatchEvent[] {
  const seeker = seatOf(match, by)
  if (match.clock.phase !== 'seeking' || seeker?.role !== 'seeker' || isFrozen(match, by)) return []
  const present = new Set(bodies.map(b => b.id))
  const events: MatchEvent[] = []
  for (const body of bodies) {
    const seat = seatOf(match, body.id)
    if (seat?.role === 'hider' && !seat.jailed && body.hidden === spotIndex) jail(match, seat, seeker, settings, events)
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
