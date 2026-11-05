import { GridCoord, HideSeekSettings } from '../../types/map'
import {
  AltarState,
  CollisionGrid,
  HideSeekRole,
  ALTAR_REACH,
  canSee,
  findWalkPath,
  footstepLoudness,
  reachableSubCells,
} from './HideSeekRules'
import { GadgetCounts, HIDE_SPOT_REACH, sightAround } from './HideSeekGadgets'

/**
 * Solo opponent. It plays fair: it only knows what its own sight cone shows and what its ears hear,
 * then walks the same paths at the same speeds as a player and uses the same gadgets.
 */

/** Seconds between two plans (chasing re-plans faster) */
const THINK_SEC = 0.4
const CHASE_THINK_SEC = 0.2
/** Footsteps quieter than this go unnoticed */
const HEARING_THRESHOLD = 0.15
/** Hider: runs when the seeker is seen or heard this close (tiles), for at least this long */
const PANIC_DISTANCE = 4
const FLEE_SEC = 2.5
/** Hider: tiptoes when the seeker is heard within this distance */
const SNEAK_DISTANCE = 7
/** Hider: keeps away from altars near the spot it last saw the seeker, for this long */
const DANGER_RADIUS = 3
const DANGER_SEC = 20
/** Hider: dives into a barrel this close when cornered or out of breath, and stays until it has been calm this long */
const HIDE_DASH_DISTANCE = 3.5
const HIDE_CALM_SEC = 6
/** Hider: seconds between two decoy stones */
const STONE_COOLDOWN_SEC = 15
/** Seeker: a heard footstep is only placed roughly (tiles) */
const HEARING_ERROR = 1.5
/** Seeker: an altar it walked by is not visited again for this long (unless someone lights it) */
const RECHECK_SEC = 30
/** Seeker: after losing the hider, barrels this close to the last clue are opened, each at most this often */
const SUSPECT_RADIUS = 5
const SUSPECT_SEC = 12
const SPOT_RECHECK_SEC = 15
/** Seeker: seconds between two flares */
const FLARE_COOLDOWN_SEC = 20
const FLEE_CANDIDATES = 30
/** Escape routes checked per plan (each is one path search) */
const FLEE_ROUTES_TRIED = 8

export type BotMode = 'collect' | 'flee' | 'hide' | 'patrol' | 'chase' | 'search' | 'investigate' | 'suspect'

export interface BotBrain {
  mode: BotMode
  path: GridCoord[]
  thinkTimer: number
  fleeTimer: number
  time: number
  lastSeen: GridCoord | null
  lastSeenAt: number
  /** Latest hint where the opponent is (sight, footsteps, noise) */
  clue: GridCoord | null
  clueAt: number
  /** Hider: last time the seeker felt close */
  threatAt: number
  /** Hider: barrel it is running to (-1 = none) */
  hideTarget: number
  /** Seeker: barrel it is walking to, to open it (-1 = none) */
  searchTarget: number
  stoneAt: number
  flareAt: number
  /** Seeker: time each altar was last visited; altars it put a bell next to */
  checkedAt: number[]
  spotCheckedAt: number[]
  trapped: Set<number>
  /** Walkable cell centers (flee / wander targets) */
  cells: GridCoord[]
}

export interface BotSenses {
  self: GridCoord
  facing: number
  /** null when the opponent cannot be sensed at all (gone, or sitting in a barrel) */
  opponent: (GridCoord & { moving: boolean; sneaking: boolean }) | null
  altars: AltarState[]
  spots: GridCoord[]
  /** A noise heard this frame (stone, bell, an altar being lit) */
  noise: GridCoord | null
  exhausted: boolean
  /** Barrel the bot sits in (-1 = none) */
  hiddenIn: number
  gadgets: GadgetCounts
  /** Own flare burning: sees all around for a moment */
  flareActive: boolean
  /** Open exit gates (the spot inside each); empty while they are shut */
  exits: GridCoord[]
}

export interface BotAction {
  sneak: boolean
  /** Hider: barrel to sit in (-1 = out in the open) */
  hideIn: number
  /** Hider: decoy stone thrown at this spot */
  stone: GridCoord | null
  flare: boolean
  trap: boolean
  /** Seeker: barrel opened this frame (-1 = none) */
  search: number
}

const dist = (a: GridCoord, b: GridCoord) => Math.hypot(a.col - b.col, a.row - b.row)

function idle(): BotAction {
  return { sneak: false, hideIn: -1, stone: null, flare: false, trap: false, search: -1 }
}

export function createBotBrain(grid: CollisionGrid, spawns: GridCoord[], altarCount: number, spotCount: number): BotBrain {
  const reachable = reachableSubCells(grid, spawns)
  const cells: GridCoord[] = []
  for (let col = 0; col < grid.subCols / 2; col++) {
    for (let row = 0; row < grid.subRows / 2; row++) {
      if (reachable[row * 2 * grid.subCols + col * 2]) cells.push({ col, row })
    }
  }
  return {
    mode: 'patrol',
    path: [],
    thinkTimer: 0,
    fleeTimer: 0,
    time: 0,
    lastSeen: null,
    lastSeenAt: -Infinity,
    clue: null,
    clueAt: -Infinity,
    threatAt: -Infinity,
    hideTarget: -1,
    searchTarget: -1,
    stoneAt: -Infinity,
    flareAt: -Infinity,
    checkedAt: Array(altarCount).fill(-Infinity),
    spotCheckedAt: Array(spotCount).fill(-Infinity),
    trapped: new Set(),
    cells,
  }
}

function setGoal(brain: BotBrain, grid: CollisionGrid, self: GridCoord, goal: GridCoord, mode: BotMode): void {
  brain.mode = mode
  brain.path = findWalkPath(grid, self, goal)
}

function randomCell(brain: BotBrain, random: () => number): GridCoord {
  return brain.cells[Math.floor(random() * brain.cells.length)]
}

/** How close the walk along `path` (starting at `from`) comes to `point`. */
function closestApproach(from: GridCoord, path: GridCoord[], point: GridCoord): number {
  let closest = Infinity
  let a = from
  for (const b of path) {
    const length = dist(a, b)
    for (let d = 0; d <= length; d += 0.25) {
      const t = length > 0 ? d / length : 0
      closest = Math.min(closest, dist({ col: a.col + (b.col - a.col) * t, row: a.row + (b.row - a.row) * t }, point))
    }
    a = b
  }
  return closest
}

/** The escape route never runs past the seeker: it keeps at least this far from them (or as far as the bot already is) */
const SAFE_PASS_DISTANCE = 2.5

function isSafeRoute(self: GridCoord, path: GridCoord[], seeker: GridCoord): boolean {
  return path.length > 0 && closestApproach(self, path, seeker) >= Math.min(SAFE_PASS_DISTANCE, dist(self, seeker) - 0.1)
}

/** Escape route to a spot far from the seeker that does not run past them. */
function fleePath(brain: BotBrain, grid: CollisionGrid, self: GridCoord, seeker: GridCoord, random: () => number): GridCoord[] {
  const current = dist(self, seeker)
  const candidates = Array.from({ length: FLEE_CANDIDATES }, () => randomCell(brain, random))
    .map(cell => ({ cell, score: dist(cell, seeker) - dist(cell, self) * 0.6 + (dist(cell, seeker) > current + 2 ? 10 : 0) }))
    .sort((a, b) => b.score - a.score)
  let fallback: GridCoord[] = []
  for (const { cell } of candidates.slice(0, FLEE_ROUTES_TRIED)) {
    const path = findWalkPath(grid, self, cell)
    if (isSafeRoute(self, path, seeker)) return path
    if (fallback.length === 0) fallback = path
  }
  return fallback
}

/** One frame of thinking: updates the bot's plan (brain.path) and says how to move and which gadget to use. */
export function thinkBot(
  brain: BotBrain,
  role: HideSeekRole,
  senses: BotSenses,
  grid: CollisionGrid,
  settings: HideSeekSettings,
  random: () => number,
  deltaSec: number
): BotAction {
  brain.time += deltaSec
  brain.thinkTimer -= deltaSec
  brain.fleeTimer -= deltaSec

  const { self, opponent } = senses
  const distance = opponent ? dist(self, opponent) : Infinity
  // Sitting in a barrel the bot can only listen
  const sees =
    !!opponent &&
    senses.hiddenIn === -1 &&
    canSee(grid, self, senses.facing, opponent, settings, sightAround(settings, senses.flareActive))
  const hears = !!opponent && opponent.moving && !opponent.sneaking && footstepLoudness(distance, settings) >= HEARING_THRESHOLD
  if (sees && opponent) {
    brain.lastSeen = { col: opponent.col, row: opponent.row }
    brain.lastSeenAt = brain.time
  }
  if ((sees || hears) && opponent) {
    brain.clue = { col: opponent.col, row: opponent.row }
    brain.clueAt = brain.time
  }

  return role === 'hider'
    ? thinkHider(brain, senses, grid, settings, random, sees || (hears && distance < PANIC_DISTANCE), hears && distance < SNEAK_DISTANCE)
    : thinkSeeker(brain, senses, grid, random, sees, hears)
}

/** A cell for a decoy stone: as far from the bot as a throw goes, so the seeker runs the wrong way. */
function decoySpot(brain: BotBrain, self: GridCoord, settings: HideSeekSettings, random: () => number): GridCoord {
  const inReach = Array.from({ length: 24 }, () => randomCell(brain, random)).filter(c => dist(c, self) <= settings.stoneRange)
  return inReach.sort((a, b) => dist(b, self) - dist(a, self))[0] ?? self
}

function thinkHider(
  brain: BotBrain,
  senses: BotSenses,
  grid: CollisionGrid,
  settings: HideSeekSettings,
  random: () => number,
  threatened: boolean,
  seekerNear: boolean
): BotAction {
  const { self, opponent, altars, spots } = senses
  const action = idle()
  if (threatened || seekerNear) brain.threatAt = brain.time

  // In a barrel: stay put until it has been quiet for a while
  if (senses.hiddenIn !== -1) {
    brain.path = []
    if (brain.time - brain.threatAt < HIDE_CALM_SEC) action.hideIn = senses.hiddenIn
    else brain.hideTarget = -1
    return action
  }

  // Decoy stone while the seeker is close but has not spotted the bot
  if (seekerNear && !threatened && senses.gadgets.stones > 0 && brain.time - brain.stoneAt > STONE_COOLDOWN_SEC) {
    brain.stoneAt = brain.time
    action.stone = decoySpot(brain, self, settings, random)
  }

  // Cornered or out of breath: dive into a nearby barrel the seeker is not standing at
  if (threatened && opponent && brain.hideTarget === -1 && (senses.exhausted || dist(self, opponent) < PANIC_DISTANCE - 1)) {
    const spot = spots
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => dist(s, self) < HIDE_DASH_DISTANCE && dist(s, opponent) > dist(self, opponent) - 0.5)
      .sort((a, b) => dist(a.s, self) - dist(b.s, self))[0]
    if (spot) {
      brain.hideTarget = spot.i
      setGoal(brain, grid, self, spot.s, 'hide')
    }
  }
  if (brain.mode === 'hide' && brain.hideTarget !== -1) {
    if (dist(spots[brain.hideTarget], self) <= HIDE_SPOT_REACH - 0.4) {
      action.hideIn = brain.hideTarget
      brain.path = []
    }
    return action
  }

  // Keeps its escape route unless the seeker now blocks it
  const routeCut = !opponent || !isSafeRoute(self, brain.path, opponent)
  if (threatened && opponent && (brain.mode !== 'flee' || (brain.thinkTimer <= 0 && routeCut))) {
    brain.mode = 'flee'
    brain.path = fleePath(brain, grid, self, opponent, random)
    brain.fleeTimer = FLEE_SEC
    brain.thinkTimer = THINK_SEC
  }
  if (brain.mode === 'flee' && brain.fleeTimer > 0 && brain.path.length > 0) return action

  if (brain.mode !== 'collect' || brain.thinkTimer <= 0 || brain.path.length === 0) {
    brain.thinkTimer = THINK_SEC
    const danger = brain.time - brain.lastSeenAt < DANGER_SEC ? brain.lastSeen : null
    // The gates are open: run for the one the seeker was not last seen near
    if (senses.exits.length > 0) {
      const gate = [...senses.exits].sort((a, b) => dist(a, self) - (danger ? dist(a, danger) : 0) - (dist(b, self) - (danger ? dist(b, danger) : 0)))[0]
      setGoal(brain, grid, self, gate, 'collect')
      action.sneak = seekerNear
      return action
    }
    // The altar it already started first, then the nearest one away from the seeker
    const unlit = altars.filter(a => !a.lit)
    const targets = unlit.filter(a => !(danger && dist(a, danger) < DANGER_RADIUS))
    const pool = targets.length > 0 ? targets : unlit
    const target = pool.sort((a, b) => b.progress - a.progress || dist(a, self) - dist(b, self))[0]
    if (target) setGoal(brain, grid, self, target, 'collect')
  }
  action.sneak = seekerNear
  return action
}

function thinkSeeker(
  brain: BotBrain,
  senses: BotSenses,
  grid: CollisionGrid,
  random: () => number,
  sees: boolean,
  hears: boolean
): BotAction {
  const { self, opponent, altars, spots } = senses
  const action = idle()

  // Notes every altar it passes by, and leaves a bell next to the ones still unlit
  altars.forEach((altar, i) => {
    if (dist(altar, self) > ALTAR_REACH || brain.time - brain.checkedAt[i] <= RECHECK_SEC) return
    brain.checkedAt[i] = brain.time
    if (!altar.lit && senses.gadgets.traps > 0 && !brain.trapped.has(i)) {
      brain.trapped.add(i)
      action.trap = true
    }
  })

  if (senses.noise) {
    brain.clue = senses.noise
    brain.clueAt = brain.time
  }
  const suspicious = brain.clue && brain.time - brain.clueAt < SUSPECT_SEC

  // Opens a suspicious barrel it reached
  if (brain.searchTarget !== -1 && dist(spots[brain.searchTarget], self) <= HIDE_SPOT_REACH) {
    action.search = brain.searchTarget
    brain.spotCheckedAt[brain.searchTarget] = brain.time
    brain.searchTarget = -1
    brain.path = []
  }

  if (sees && opponent) {
    brain.searchTarget = -1
    if (brain.mode !== 'chase' || brain.thinkTimer <= 0) {
      setGoal(brain, grid, self, opponent, 'chase')
      brain.thinkTimer = CHASE_THINK_SEC
    }
  } else if (brain.mode === 'chase' && brain.lastSeen) {
    // Lost sight: light a flare and run to where the hider was last seen
    if (senses.gadgets.flares > 0 && brain.time - brain.flareAt > FLARE_COOLDOWN_SEC) {
      brain.flareAt = brain.time
      action.flare = true
    }
    setGoal(brain, grid, self, brain.lastSeen, 'search')
  } else if (senses.noise && (brain.mode !== 'investigate' || brain.thinkTimer <= 0)) {
    setGoal(brain, grid, self, senses.noise, 'investigate')
    brain.thinkTimer = THINK_SEC * 2
  } else if (hears && opponent && (brain.mode !== 'investigate' || brain.thinkTimer <= 0)) {
    const guess = {
      col: opponent.col + (random() * 2 - 1) * HEARING_ERROR,
      row: opponent.row + (random() * 2 - 1) * HEARING_ERROR,
    }
    setGoal(brain, grid, self, guess, 'investigate')
    brain.thinkTimer = THINK_SEC * 2
  } else if (brain.path.length === 0) {
    // The hider vanished nearby: open the barrels around the last clue
    const clue = brain.clue
    const suspect = suspicious && clue
      ? spots
          .map((s, i) => ({ s, i }))
          .filter(({ s, i }) => dist(s, clue) < SUSPECT_RADIUS && brain.time - brain.spotCheckedAt[i] > SPOT_RECHECK_SEC)
          .sort((a, b) => dist(a.s, self) - dist(b.s, self))[0]
      : undefined
    if (suspect) {
      brain.searchTarget = suspect.i
      setGoal(brain, grid, self, suspect.s, 'suspect')
    } else {
      // The gates are open: guard one of them
      if (senses.exits.length > 0) {
        setGoal(brain, grid, self, senses.exits[Math.floor(random() * senses.exits.length)], 'patrol')
        return action
      }
      // Patrol: an altar someone is lighting first, then the nearest unlit one not visited lately, otherwise anywhere
      const due = altars
        .map((altar, i) => ({ altar, i }))
        .filter(({ altar, i }) => !altar.lit && (altar.progress > 0 || brain.time - brain.checkedAt[i] > RECHECK_SEC))
        .sort((a, b) => b.altar.progress - a.altar.progress || dist(a.altar, self) - dist(b.altar, self))[0]
      setGoal(brain, grid, self, due ? due.altar : randomCell(brain, random), 'patrol')
    }
  }
  return action
}
