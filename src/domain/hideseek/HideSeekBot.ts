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
 * A bot player, for either side and for team games. It plays fair: it only knows what its own sight cone shows and
 * what its ears hear (and, like everyone, which altars are fully lit), keeps its own memory of the labyrinth, walks
 * the same paths at the same speeds as a player and uses the same gadgets.
 * Hider: runs from seekers it notices, hides in barrels, lights the altars it has found (exploring for more), frees
 * jailed teammates and chains a seeker while a teammate can use the time. Seeker: chases what it sees, follows noises,
 * runs to altars it saw being lit, guards the jail and searches the parts of the maze it has not seen lately.
 */

/** Seconds between two plans (chasing re-plans faster) */
const THINK_SEC = 0.4
const CHASE_THINK_SEC = 0.2
/** Footsteps quieter than this go unnoticed */
const HEARING_THRESHOLD = 0.15
/** Hider: runs when a seeker is seen or heard this close (tiles), for at least this long */
const PANIC_DISTANCE = 4
/** Hider: below this share of breath it walks quietly until full again */
const REST_BELOW_BREATH = 0.6
const FLEE_SEC = 2.5
/** Hider: tiptoes when a seeker is heard within this distance */
const SNEAK_DISTANCE = 7
/** Hider: keeps away from altars near the spot it last saw a seeker, for this long */
const DANGER_RADIUS = 4
const DANGER_SEC = 20
/** Hider: dives into a barrel this close when cornered or out of breath, and stays until it has been calm this long */
const HIDE_DASH_DISTANCE = 3.5
const HIDE_CALM_SEC = 6
/** Hider: seconds between two decoy stones */
const STONE_COOLDOWN_SEC = 15
/** Hider: does not go for the jail while a seeker was seen this close to it within this many seconds */
const JAIL_DANGER_RADIUS = 7
const JAIL_DANGER_SEC = 8
/** Hider: chains a seeker this close to catching it, when a teammate is free to use the time */
const CHAIN_PANIC_DISTANCE = 2.2
/** Seeker: a heard footstep is only placed roughly (tiles) */
const HEARING_ERROR = 1.5
/** Seeker: an altar it walked by is not visited again for this long (unless it saw someone light it) */
const RECHECK_SEC = 30
/** Seeker: an altar it saw growing is worth running to for this long */
const LIT_ALERT_SEC = 20
/** Seeker: after losing a hider, barrels this close to the last clue are opened, each at most this often */
const SUSPECT_RADIUS = 5
const SUSPECT_SEC = 12
const SPOT_RECHECK_SEC = 15
/** Seeker: seconds between two flares */
const FLARE_COOLDOWN_SEC = 20
/** Seeker guarding the jail: walks around it this close */
const JAIL_GUARD_RADIUS = 5
const FLEE_CANDIDATES = 30
/** Escape routes checked per plan (each is one path search) */
const FLEE_ROUTES_TRIED = 8
/** Memory of where the bot has been: one entry per square of this many tiles */
const MEMORY_CELL = 4
/** Exploring: candidate cells tried per plan */
const EXPLORE_CANDIDATES = 30

export type BotMode = 'collect' | 'flee' | 'hide' | 'rescue' | 'patrol' | 'explore' | 'guard' | 'chase' | 'search' | 'investigate' | 'suspect'

export interface BotBrain {
  mode: BotMode
  path: GridCoord[]
  thinkTimer: number
  fleeTimer: number
  time: number
  /** Last opponent seen and where */
  lastSeen: GridCoord | null
  lastSeenAt: number
  /** Latest hint where an opponent is (sight, footsteps, noise) */
  clue: GridCoord | null
  clueAt: number
  /** Hider: last time a seeker felt close; last time a seeker was seen near the jail */
  threatAt: number
  jailDangerAt: number
  /** Hider: barrel it is running to (-1 = none) */
  hideTarget: number
  /** Seeker: barrel it is walking to, to open it (-1 = none) */
  searchTarget: number
  stoneAt: number
  flareAt: number
  /** Altars this bot has seen: their progress when last seen (-1 = never seen), and when it grew last */
  altarSeen: number[]
  altarGrewAt: number[]
  /** Seeker: time each altar was last visited; altars it put a bell next to */
  checkedAt: number[]
  spotCheckedAt: number[]
  trapped: Set<number>
  /** Walkable cell centers (flee / explore targets) */
  cells: GridCoord[]
  /** When the bot was last near each memory square (exploring goes where it has not been for long) */
  visitedAt: Float64Array
  memoryCols: number
  /** Hider: walking quietly to get its breath back before the next chase */
  resting: boolean
}

/** An opponent's true state: the bot only uses it when it can see or hear them. */
export interface BotOpponent extends GridCoord {
  id: string
  moving: boolean
  sneaking: boolean
  /** Inside a barrel / in jail: cannot be sensed or is no threat */
  hidden: boolean
  jailed: boolean
  /** Share of the sight range they are spotted within (a shadow: less) and how loud their steps are */
  spotted: number
  quiet: number
}

/** A noise and how far it carries (tiles) */
export interface BotNoise extends GridCoord {
  range: number
}

export interface BotTeammate extends GridCoord {
  id: string
  jailed: boolean
}

export interface BotSenses {
  self: GridCoord
  facing: number
  opponents: BotOpponent[]
  /** The other players on the bot's side (everyone knows where their teammates are) */
  teammates: BotTeammate[]
  /** Every altar: the bot only uses the ones it has seen, and the lit ones (everyone hears an altar flare up) */
  altars: AltarState[]
  spots: GridCoord[]
  /** Noises this frame (stones, bells, altars being lit), each heard within its own range */
  noises: BotNoise[]
  exhausted: boolean
  /** Share of the running breath left (0..1) */
  breath: number
  /** Barrel the bot sits in (-1 = none) */
  hiddenIn: number
  gadgets: GadgetCounts
  /** Own flare burning: sees all around for a moment */
  flareActive: boolean
  /** Open exit gates (the spot inside each); empty while they are shut */
  exits: GridCoord[]
  /** The jail in the seekers' base (null = jailed where caught), and the middle of the hiders' safe home (null = none) */
  jail: GridCoord | null
  home: GridCoord | null
  /** Hider: can chain a seeker now (lit an altar, off cooldown) */
  canChain: boolean
  /** The bot's place among the bots of its side (the first seeker guards the jail) */
  rank: number
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
  /** Hider: chain the nearest seeker */
  chain: boolean
}

const dist = (a: GridCoord, b: GridCoord) => Math.hypot(a.col - b.col, a.row - b.row)

function idle(): BotAction {
  return { sneak: false, hideIn: -1, stone: null, flare: false, trap: false, search: -1, chain: false }
}

export function createBotBrain(grid: CollisionGrid, spawns: GridCoord[], altarCount: number, spotCount: number): BotBrain {
  const reachable = reachableSubCells(grid, spawns)
  const cells: GridCoord[] = []
  for (let col = 0; col < grid.subCols / 2; col++) {
    for (let row = 0; row < grid.subRows / 2; row++) {
      if (reachable[row * 2 * grid.subCols + col * 2]) cells.push({ col, row })
    }
  }
  const memoryCols = Math.ceil(grid.subCols / 2 / MEMORY_CELL)
  const memoryRows = Math.ceil(grid.subRows / 2 / MEMORY_CELL)
  return {
    mode: 'explore',
    path: [],
    thinkTimer: 0,
    fleeTimer: 0,
    time: 0,
    lastSeen: null,
    lastSeenAt: -Infinity,
    clue: null,
    clueAt: -Infinity,
    threatAt: -Infinity,
    jailDangerAt: -Infinity,
    hideTarget: -1,
    searchTarget: -1,
    stoneAt: -Infinity,
    flareAt: -Infinity,
    altarSeen: Array(altarCount).fill(-1),
    altarGrewAt: Array(altarCount).fill(-Infinity),
    checkedAt: Array(altarCount).fill(-Infinity),
    spotCheckedAt: Array(spotCount).fill(-Infinity),
    trapped: new Set(),
    cells,
    visitedAt: new Float64Array(memoryCols * memoryRows).fill(-Infinity),
    memoryCols,
    resting: false,
  }
}

function setGoal(brain: BotBrain, grid: CollisionGrid, self: GridCoord, goal: GridCoord, mode: BotMode): void {
  brain.mode = mode
  brain.path = findWalkPath(grid, self, goal)
}

function randomCell(brain: BotBrain, random: () => number): GridCoord {
  return brain.cells[Math.floor(random() * brain.cells.length)]
}

function memoryIndex(brain: BotBrain, p: GridCoord): number {
  return Math.floor(p.row / MEMORY_CELL) * brain.memoryCols + Math.floor(p.col / MEMORY_CELL)
}

/** Explore: a cell in a part of the maze the bot has not been to for long, not too far away. */
function exploreTarget(brain: BotBrain, self: GridCoord, random: () => number): GridCoord {
  const candidates = Array.from({ length: EXPLORE_CANDIDATES }, () => randomCell(brain, random))
  const score = (c: GridCoord) => Math.min(120, brain.time - brain.visitedAt[memoryIndex(brain, c)]) - dist(c, self) * 0.8
  return candidates.sort((a, b) => score(b) - score(a))[0] ?? self
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

/** Hider: runs for its safe home when it is at most this much further than the seeker is from the bot */
const HOME_FLEE_MARGIN = 6

/** Escape route: home when it is near enough and the way there does not run past the seeker, otherwise a spot far
 * from the seeker that does not run past them. */
function fleePath(brain: BotBrain, grid: CollisionGrid, self: GridCoord, seeker: GridCoord, random: () => number, home: GridCoord | null): GridCoord[] {
  const current = dist(self, seeker)
  if (home && dist(self, home) < current + HOME_FLEE_MARGIN) {
    const homeward = findWalkPath(grid, self, home)
    if (isSafeRoute(self, homeward, seeker)) return homeward
  }
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

interface Perceived {
  /** Nearest opponent the bot sees, and the nearest it only hears */
  seen: BotOpponent | null
  heard: BotOpponent | null
}

/** What the bot notices this frame: opponents in sight or heard running, altars in sight, noises within reach. */
function perceive(brain: BotBrain, senses: BotSenses, grid: CollisionGrid, settings: HideSeekSettings): Perceived {
  const { self } = senses
  const around = sightAround(settings, senses.flareActive)
  const looking = senses.hiddenIn === -1
  let seen: BotOpponent | null = null
  let heard: BotOpponent | null = null
  for (const o of senses.opponents) {
    if (o.hidden || o.jailed) continue
    const d = dist(self, o)
    const sight = { ...settings, visionRange: settings.visionRange * o.spotted }
    if (looking && canSee(grid, self, senses.facing, o, sight, around * o.spotted)) {
      if (!seen || d < dist(self, seen)) seen = o
    } else if (o.moving && !o.sneaking && footstepLoudness(d, settings) * o.quiet >= HEARING_THRESHOLD) {
      if (!heard || d < dist(self, heard)) heard = o
    }
  }
  if (seen) {
    brain.lastSeen = { col: seen.col, row: seen.row }
    brain.lastSeenAt = brain.time
  }
  const hint = seen ?? heard
  if (hint) {
    brain.clue = { col: hint.col, row: hint.row }
    brain.clueAt = brain.time
  }
  for (const noise of senses.noises) {
    if (dist(noise, self) > noise.range) continue
    brain.clue = { col: noise.col, row: noise.row }
    brain.clueAt = brain.time
  }

  // Altars: learnt by seeing them (or by being right there); every lit one is known to all
  senses.altars.forEach((altar, i) => {
    const inView = dist(altar, self) < 2 || (looking && canSee(grid, self, senses.facing, altar, settings, around))
    if (altar.lit || inView) {
      if (inView && altar.progress > brain.altarSeen[i] + 0.01 && brain.altarSeen[i] >= 0) brain.altarGrewAt[i] = brain.time
      brain.altarSeen[i] = Math.max(altar.lit ? 1 : 0, inView ? altar.progress : brain.altarSeen[i])
    }
  })
  brain.visitedAt[memoryIndex(brain, self)] = brain.time
  return { seen, heard }
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
  const perceived = perceive(brain, senses, grid, settings)
  return role === 'hider'
    ? thinkHider(brain, senses, grid, settings, random, perceived)
    : thinkSeeker(brain, senses, grid, settings, random, perceived)
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
  { seen, heard }: Perceived
): BotAction {
  const { self, altars, spots } = senses
  const action = idle()
  const seeker = seen ?? heard
  const distance = seeker ? dist(self, seeker) : Infinity
  // Any seeker in sight is a threat (it may have spotted the bot too); a heard one only when close
  const threatened = !!seen || (!!heard && distance < PANIC_DISTANCE)
  const seekerNear = !!heard && distance < SNEAK_DISTANCE
  if (threatened || seekerNear) brain.threatAt = brain.time
  if (seen && senses.jail && dist(seen, senses.jail) < JAIL_DANGER_RADIUS) brain.jailDangerAt = brain.time
  const freeTeammates = senses.teammates.filter(t => !t.jailed)

  // In a barrel: stay put until it has been quiet for a while
  if (senses.hiddenIn !== -1) {
    brain.path = []
    if (brain.time - brain.threatAt < HIDE_CALM_SEC) action.hideIn = senses.hiddenIn
    else brain.hideTarget = -1
    return action
  }

  // Chain a seeker in sight: when it is about to catch the bot, or while the bot or a teammate lights an altar -
  // only worth it with a free teammate to use the time
  if (senses.canChain && seen && freeTeammates.length > 0 && distance <= settings.chainRange - 0.3) {
    const unlit = altars.filter((a, i) => !a.lit && brain.altarSeen[i] >= 0)
    const lightingNear = unlit.some(a => dist(a, self) <= ALTAR_REACH || freeTeammates.some(t => dist(t, a) <= ALTAR_REACH + 0.5))
    if (distance < CHAIN_PANIC_DISTANCE || lightingNear) {
      action.chain = true
      return action
    }
  }

  // Decoy stone while a seeker is close but has not spotted the bot
  if (seekerNear && !seen && senses.gadgets.stones > 0 && brain.time - brain.stoneAt > STONE_COOLDOWN_SEC) {
    brain.stoneAt = brain.time
    action.stone = decoySpot(brain, self, settings, random)
  }

  // Cornered or out of breath: dive into a nearby barrel the seeker is not standing at
  if (threatened && seeker && brain.hideTarget === -1 && (senses.exhausted || distance < PANIC_DISTANCE - 1)) {
    const spot = spots
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => dist(s, self) < HIDE_DASH_DISTANCE && dist(s, seeker) > distance - 0.5)
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
  const routeCut = !seeker || !isSafeRoute(self, brain.path, seeker)
  if (threatened && seeker && (brain.mode !== 'flee' || (brain.thinkTimer <= 0 && routeCut))) {
    brain.mode = 'flee'
    brain.path = fleePath(brain, grid, self, seeker, random, senses.home)
    brain.fleeTimer = FLEE_SEC
    brain.thinkTimer = THINK_SEC
  }
  if (brain.mode === 'flee' && brain.fleeTimer > 0 && brain.path.length > 0) return action

  // Out of a chase it walks quietly until its breath is full again, so it can outrun the next seeker
  if (senses.breath < REST_BELOW_BREATH) brain.resting = true
  else if (senses.breath >= 1) brain.resting = false
  action.sneak = seekerNear || brain.resting
  if (brain.thinkTimer > 0 && brain.path.length > 0 && brain.mode !== 'flee') return action
  brain.thinkTimer = THINK_SEC
  const danger = brain.time - brain.lastSeenAt < DANGER_SEC ? brain.lastSeen : null

  // The gates are open: run for the one a seeker was not last seen near
  if (senses.exits.length > 0) {
    const gate = [...senses.exits].sort((a, b) => dist(a, self) - (danger ? dist(a, danger) : 0) - (dist(b, self) - (danger ? dist(b, danger) : 0)))[0]
    setGoal(brain, grid, self, gate, 'collect')
    return action
  }

  // Free jailed teammates: the free hider closest to the jail goes (everyone when several are in), unless it is guarded
  const jailed = senses.teammates.filter(t => t.jailed)
  if (senses.jail && jailed.length > 0 && brain.time - brain.jailDangerAt > JAIL_DANGER_SEC) {
    const jail = senses.jail
    const closest = freeTeammates.every(t => dist(t, jail) >= dist(self, jail))
    if (closest || jailed.length >= 2) {
      if (dist(self, jail) > ALTAR_REACH) setGoal(brain, grid, self, jail, 'rescue')
      else brain.path = []
      return action
    }
  }

  // Light an altar it knows: the furthest along first, away from where a seeker was seen, not crowding teammates
  const known = altars
    .map((altar, i) => ({ altar, i }))
    .filter(({ altar, i }) => !altar.lit && brain.altarSeen[i] >= 0)
  if (known.length > 0) {
    const score = ({ altar, i }: { altar: AltarState; i: number }) =>
      dist(altar, self) - brain.altarSeen[i] * 15 +
      (danger && dist(altar, danger) < DANGER_RADIUS ? 25 : 0) +
      (freeTeammates.some(t => dist(t, altar) < 3) && dist(altar, self) > 3 ? 8 : 0)
    const best = known.sort((a, b) => score(a) - score(b))[0]
    if (dist(best.altar, self) <= ALTAR_REACH - 0.3) {
      brain.mode = 'collect'
      brain.path = []
      action.sneak = true
    } else {
      setGoal(brain, grid, self, best.altar, 'collect')
    }
    return action
  }

  // Nothing known: search the parts of the maze it has not seen yet
  if (brain.mode !== 'explore' || brain.path.length === 0) setGoal(brain, grid, self, exploreTarget(brain, self, random), 'explore')
  return action
}

function thinkSeeker(
  brain: BotBrain,
  senses: BotSenses,
  grid: CollisionGrid,
  settings: HideSeekSettings,
  random: () => number,
  { seen, heard }: Perceived
): BotAction {
  const { self, altars, spots } = senses
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

  const suspicious = brain.clue && brain.time - brain.clueAt < SUSPECT_SEC

  // Opens a suspicious barrel it reached
  if (brain.searchTarget !== -1 && dist(spots[brain.searchTarget], self) <= HIDE_SPOT_REACH) {
    action.search = brain.searchTarget
    brain.spotCheckedAt[brain.searchTarget] = brain.time
    brain.searchTarget = -1
    brain.path = []
  }

  if (seen) {
    brain.searchTarget = -1
    if (brain.mode !== 'chase' || brain.thinkTimer <= 0) {
      setGoal(brain, grid, self, seen, 'chase')
      brain.thinkTimer = CHASE_THINK_SEC
    }
    return action
  }
  if (brain.mode === 'chase' && brain.lastSeen) {
    // Lost sight: light a flare and run to where the hider was last seen
    if (senses.gadgets.flares > 0 && brain.time - brain.flareAt > FLARE_COOLDOWN_SEC) {
      brain.flareAt = brain.time
      action.flare = true
    }
    setGoal(brain, grid, self, brain.lastSeen, 'search')
    return action
  }
  if (heard && (brain.mode !== 'investigate' || brain.thinkTimer <= 0)) {
    const guess = {
      col: heard.col + (random() * 2 - 1) * HEARING_ERROR,
      row: heard.row + (random() * 2 - 1) * HEARING_ERROR,
    }
    setGoal(brain, grid, self, guess, 'investigate')
    brain.thinkTimer = THINK_SEC * 2
    return action
  }
  if (brain.thinkTimer > 0 && brain.path.length > 0) return action
  brain.thinkTimer = THINK_SEC

  // A noise just now (stone, bell, an altar humming): go and look
  if (suspicious && brain.clue && brain.time - brain.clueAt < 1 && brain.mode !== 'investigate') {
    setGoal(brain, grid, self, brain.clue, 'investigate')
    return action
  }

  // An altar it saw being lit: stand at it until it is put out (down to its last stage)
  const alert = altars
    .map((altar, i) => ({ altar, i }))
    .filter(({ altar, i }) => !altar.lit && brain.time - brain.altarGrewAt[i] < LIT_ALERT_SEC)
    .sort((a, b) => dist(a.altar, self) - dist(b.altar, self))[0]
  if (alert) {
    if (dist(alert.altar, self) > ALTAR_REACH - 0.3) setGoal(brain, grid, self, alert.altar, 'guard')
    else {
      brain.path = []
      // Seen it put out to where nobody can push it further: no longer an alarm
      const stage = Math.floor(alert.altar.progress * settings.altarStages + 1e-9) / settings.altarStages
      if (alert.altar.progress <= stage + 0.01) brain.altarGrewAt[alert.i] = -Infinity
    }
    return action
  }

  // The first seeker keeps an eye on a jail with prisoners in it
  const jailedHiders = senses.opponents.filter(o => o.jailed).length
  if (senses.rank === 0 && senses.jail && jailedHiders > 0) {
    const jail = senses.jail
    const around = brain.cells.filter(c => dist(c, jail) < JAIL_GUARD_RADIUS)
    setGoal(brain, grid, self, around[Math.floor(random() * around.length)] ?? jail, 'guard')
    return action
  }

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
    return action
  }

  // The gates are open: guard one of them
  if (senses.exits.length > 0) {
    setGoal(brain, grid, self, senses.exits[Math.floor(random() * senses.exits.length)], 'patrol')
    return action
  }

  // Patrol the unlit altars it knows and has not checked lately, otherwise search the maze
  const due = altars
    .map((altar, i) => ({ altar, i }))
    .filter(({ altar, i }) => !altar.lit && brain.altarSeen[i] >= 0 && brain.time - brain.checkedAt[i] > RECHECK_SEC)
    .sort((a, b) => dist(a.altar, self) - dist(b.altar, self))[0]
  if (due && random() < 0.6) setGoal(brain, grid, self, due.altar, 'patrol')
  else setGoal(brain, grid, self, exploreTarget(brain, self, random), 'explore')
  return action
}
