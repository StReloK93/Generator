import { defineStore } from 'pinia'
import { ref, computed, reactive } from 'vue'
import { useMapStore } from './mapStore'
import { useMultiplayerStore } from './multiplayerStore'
import { HERO_MODELS } from './heroStore'
import { networkService } from '../services/networkService'
import { hideSeekAudio } from '../services/hideSeekAudio'
import { getModelActionFrameCount } from '../utils/characterUtils'
import { readSession, writeSession, HIDE_SEEK_MATCH_KEY } from '../services/sessionResume'
import { getProjectMapId } from '../services/mapManager'
import { HideSeekBody, HideSeekViewContext, buildMinimapView, buildRenderView, isRoundOver } from './hideSeekViews'
import {
  HideSeekPhase,
  HideSeekRole,
  HideSeekEndReason,
  HideSeekMatch,
  MatchBody,
  MatchEvent,
  CollisionGrid,
  Stamina,
  GadgetCounts,
  BotBrain,
  BotNoise,
  normalizeHideSeekSettings,
  buildCollisionGrid,
  canAct,
  moveWithCollision,
  stepAlongPath,
  findWalkPath,
  screenInputToGrid,
  castVision,
  footstepLoudness,
  footstepInterval,
  altarLoudness,
  altarHumLoudness,
  altarProgress,
  startChain,
  isFrozen,
  chainOf,
  splitSpawns,
  allSpawns,
  teamForSlot,
  SpawnSets,
  crawlsThroughHoles,
  HideSeekTeam,
  arenaOf,
  jailSpot,
  mazeSize,
  turnTowards,
  hasLineOfSight,
  HIDE_SPOT_REACH,
  createMatch,
  startRound,
  tickMatch,
  searchSpot,
  placeTrap,
  seatOf,
  spawnForSeat,
  roleForSlot,
  freshStamina,
  advanceStamina,
  moveSpeed,
  gadgetsFor,
  noiseLoudness,
  heartbeatDanger,
  heartbeatInterval,
  markExplored,
  createBotBrain,
  shareAltarSightings,
  thinkBot,
  HideSeekMaze,
  generateMaze,
  buildMazeGrid,
  buildMazeMap,
  castGlow,
  setDoor,
  useTorch,
  isHuntTime,
  huntSettings,
  DOOR_REACH,
  TORCH_REACH,
  FOOTPRINT_SPACING,
  HideSeekTrait,
  torchSpots,
  placeCandle,
  canPlaceCandle,
  traitOf,
  playerRules,
  spottedWithin,
  stepLoudness,
  extraGadgets,
} from '../domain/hideseek'
import type { GridCoord, HideSeekSettings } from '../types/map'
import type {
  NetMessage,
  HideSeekPlayerStatePayload,
  HideSeekMatchStatePayload,
  HideSeekActionPayload,
  HideSeekEventPayload,
} from '../types/multiplayer'
import { getSlotColor } from '../types/multiplayer'
import type { HideSeekFootprintView, HideSeekMinimapView, HideSeekRenderView, HideSeekRippleView } from '../rendering/types'

export const DEFAULT_HERO_MODEL = 'male'

export interface HideSeekScoreRow {
  id: string
  name: string
  color: string
  score: number
  role: HideSeekRole
  jailed: boolean
  isMe: boolean
}

const SEND_INTERVAL_SEC = 1 / 15
const STATE_BROADCAST_SEC = 1
/** Run animation pace, same as the Hero mode: legs keep up with the ground speed */
const RUN_FRAME_SEC = 0.28
/** How fast the sight cone swings to a new heading (radians per second) */
const VISION_TURN_SPEED = 9
/** The seeker stops this far in front of a barrel they walked to (so it is not hidden behind them) */
const STOP_DISTANCE = 0.9
/** An altar being lit hums across the labyrinth this often */
const ALTAR_HUM_SEC = 2
const RIPPLE_SEC = 1.2
/** A click this close to a barrel / door / candle uses it */
const CLICK_PICK = 0.8
/** Walking a route, a shut door this close ahead is pushed open */
const DOOR_AUTO_OPEN = 1.1
/** The hunt hint (arrow to the nearest hider) fades out over this long */
const HUNT_HINT_SEC = 1.6
const EMPTY_GRID: CollisionGrid = { subCols: 0, subRows: 0, blocked: new Uint8Array(0) }
/** Use / open / hide (E or Space), bell trap (T), candle (C), chain (R) */
const ACTION_KEYS = new Set(['KeyE', 'Space'])
const MOVE_KEYS: Record<string, [number, number]> = {
  KeyW: [0, -1], ArrowUp: [0, -1],
  KeyS: [0, 1], ArrowDown: [0, 1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0],
  KeyD: [1, 0], ArrowRight: [1, 0],
}

type PendingUse = { kind: 'search' | 'hide' | 'door' | 'torch'; index: number }

/** What a page refresh needs to continue the match where it was. */
interface SavedHideSeekMatch {
  owner: string
  /** The whole match (host / solo only: guests get it from the host) */
  match: HideSeekMatch | null
  mazeSeed: number
  round: number
  /** Host / solo: every character (and the bot); guest: its own */
  bodies: HideSeekBody[]
  gadgets: GadgetCounts
  stamina: Stamina
  explored: number[]
  /** Solo: each bot's gadgets and breath (their minds start fresh) */
  bots: Record<string, { gadgets: GadgetCounts; stamina: Stamina; rank: number }>
}

/** A bot player in a solo game: its own mind, breath and gadgets. rank = its place among the bots of its side */
interface BotState {
  brain: BotBrain
  stamina: Stamina
  gadgets: GadgetCounts
  rank: number
}

/**
 * Hide & seek session: local input and movement, gadgets, the network, the solo bot and the per-frame views.
 * The rules live in domain/hideseek: the host (or a solo game) runs the referee (HideSeekMatch), guests mirror it.
 */
export const useHideSeekStore = defineStore('hideSeek', () => {
  const mapStore = useMapStore()
  const multiplayerStore = useMultiplayerStore()

  // Reactive HUD state
  const isActive = ref(false)
  const phase = ref<HideSeekPhase>('hiding')
  const secondsLeft = ref(0)
  /** 1-based */
  const round = ref(1)
  const rounds = ref(1)
  const winner = ref<HideSeekRole | null>(null)
  const endReason = ref<HideSeekEndReason | null>(null)
  const champion = ref<string | null>(null)
  /** Lit altars, how many the hiders need, and how many I helped light */
  const altarsLit = ref(0)
  const altarsNeeded = ref(0)
  const myAltars = ref(0)
  /** Chain: seconds until I can chain again; seconds left while I hold a seeker / am held; seconds still dazed */
  const chainCooldown = ref(0)
  const chainHolding = ref(0)
  const chainHeld = ref(0)
  const dazedLeft = ref(0)
  /** In a chain or dazed: cannot move */
  const isFrozenMe = ref(false)
  /** Rounds each side won, and the side that won the match */
  const roundWins = ref<Record<HideSeekRole, number>>({ seeker: 0, hider: 0 })
  const matchWinner = ref<HideSeekRole | null>(null)
  const myRole = ref<HideSeekRole>('hider')
  const isSneaking = ref(false)
  const heardLevel = ref(0)
  /** Hider's heartbeat: 0 = seeker far, 1 = right behind you */
  const dangerLevel = ref(0)
  const staminaLevel = ref(1)
  const isExhausted = ref(false)
  const gadgets = reactive<GadgetCounts>({ traps: 0, candles: 0 })
  const isJailed = ref(false)
  const isHidden = ref(false)
  const scores = ref<HideSeekScoreRow[]>([])
  /** Solo game (no room): waiting for the player to pick a role; a bot plays the other one */
  const needsSoloRole = ref(false)
  /** The last seconds of the round: the seeker hunts */
  const isHunting = ref(false)
  /** The exit gates are open: the hiders lit enough altars and now have to get out */
  const exitsOpen = ref(false)
  /** Bumped when this round's labyrinth replaced the map (the canvas redraws its layers) */
  const mazeRevision = ref(0)
  /** Own character's trait (kept in both roles) */
  const myTrait = ref<HideSeekTrait | null>(null)
  /** Hiders the seeker caught this round (each makes the seeker faster and slower to tire) */
  const seekerCatches = ref(0)

  const canMove = computed(() => !needsSoloRole.value && !isJailed.value && !isFrozenMe.value && canAct(myRole.value, phase.value))
  const didIWin = computed(() => winner.value !== null && winner.value === myRole.value)

  // Per-frame runtime (non-reactive)
  let settings: HideSeekSettings = normalizeHideSeekSettings(null)
  /** Sight (and the seeker's walking): walls, crawl holes, shut doors */
  let grid: CollisionGrid | null = null
  /** Hiders walk through crawl holes */
  let hiderGrid = EMPTY_GRID
  /** Route finding with every door open (a shut door on the way is pushed open) */
  let seekerPaths = EMPTY_GRID
  let hiderPaths = EMPTY_GRID
  /** This round's random labyrinth (null = the map's own layout) */
  let maze: HideSeekMaze | null = null
  /** Light polygon of each candle stand (walls cast shadows) */
  let torchGlows: GridCoord[][] = []
  let footprints: HideSeekFootprintView[] = []
  const lastPositions = new Map<string, GridCoord & { travel: number; left: boolean }>()
  let huntHint: { angle: number; strength: number } | null = null
  let huntTimer = 0
  let spawns: SpawnSets = { seekers: [], hiders: [] }
  let match: HideSeekMatch = createMatch([])
  let lastRound = -1
  let stateDirty = false
  const players = new Map<string, HideSeekBody>()
  const pressedKeys = new Set<string>()
  const joystick = { x: 0, y: 0 }
  let sneakHeld = false
  let clickPath: GridCoord[] = []
  let pending: PendingUse | null = null
  let stamina: Stamina = freshStamina(settings)
  /** Altar progress at the last hum (an altar whose progress grew since then is heard) */
  let altarHumAt: number[] = []
  let altarHumTimer = 0
  /** Own sight heading: follows the body facing smoothly so the cone never snaps */
  let visionFacing = 0
  let explored = new Uint8Array(0)
  /** round:phase the last tune was played for */
  let lastTuneKey = ''
  let ripples: HideSeekRippleView[] = []
  let heartbeatTimer = 0
  let heardDecay = 0
  let sendTimer = 0
  let stateTimer = 0
  // Solo bot
  const bots = new Map<string, BotState>()
  /** Noises of this frame the bots may hear (each hears the ones within its reach) */
  let botNoises: BotNoise[] = []
  const isBot = (id: string) => bots.has(id)
  let viewContext: HideSeekViewContext | null = null
  let renderView: HideSeekRenderView | null = null

  const myId = () => multiplayerStore.myPlayerId

  function myPlayer(): HideSeekBody | undefined {
    return players.get(myId())
  }

  /** A character's own rules: their trait, and for the seeker the momentum of this round's catches. */
  function rulesOf(p: HideSeekBody): HideSeekSettings {
    const seat = seatOf(match, p.id)
    return playerRules(settings, traitOf(p.model), p.role, seat?.catches ?? 0)
  }

  /** All seekers' traps / candles this round together (what the referee lets them place in total). */
  function seekersGadgets(kind: 'traps' | 'candles'): number {
    return [...players.values()].filter(p => p.role === 'seeker').reduce((sum, p) => sum + gadgetsOf(p)[kind], 0)
  }

  /** A round's gadgets for a character (the trickster gets more). */
  function gadgetsOf(p: HideSeekBody): GadgetCounts {
    return gadgetsFor(p.role, settings, extraGadgets(settings, traitOf(p.model)))
  }

  /** Solo game without a room: the player picks a role, a bot plays the other one. */
  function isSolo(): boolean {
    return !multiplayerStore.roomId
  }

  /** The host and a solo game run the referee; guests mirror the host's state. */
  function isReferee(): boolean {
    return isSolo() || multiplayerStore.isHost
  }

  function addPlayer(id: string, name: string, color: string, model: string, role: HideSeekRole): void {
    const spawn = allSpawns(spawns)[0] ?? { col: 0, row: 0 }
    players.set(id, {
      id, name, color, model, role,
      col: spawn.col, row: spawn.row, targetCol: spawn.col, targetRow: spawn.row,
      facing: Math.PI / 4, moving: false, sneaking: false, hidden: -1,
      frame: 0, animTimer: 0, stepTimer: 0,
    })
  }

  function routeSpawns(): GridCoord[] {
    return (mapStore.project.routes ?? []).flatMap(r => r.routePoints?.slice(0, 1) ?? [])
  }

  /** Walking / route finding: only the crawler squeezes through the crawl holes */
  const moveGrid = (p: HideSeekBody) => (crawlsThroughHoles(traitOf(p.model)) ? hiderGrid : (grid ?? EMPTY_GRID))
  const pathGrid = (p: HideSeekBody) => (crawlsThroughHoles(traitOf(p.model)) ? hiderPaths : seekerPaths)

  /** Collision for the current doors (a random labyrinth) or the map's own walls. */
  function rebuildGrids(): void {
    if (maze) {
      grid = buildMazeGrid(maze, true, match.doors)
      hiderGrid = buildMazeGrid(maze, false, match.doors)
      seekerPaths = buildMazeGrid(maze, true, null)
      hiderPaths = buildMazeGrid(maze, false, null)
    } else {
      grid = hiderGrid = seekerPaths = hiderPaths = buildCollisionGrid(mapStore.project)
    }
    refreshTorchGlows()
  }

  /** Light polygon of every candle (walls and shut doors cast shadows). */
  function refreshTorchGlows(): void {
    const at = grid
    torchGlows = at ? torchSpots(match, maze).map(t => castGlow(at, t, settings.torchRadius)) : []
  }

  /** Builds the round's labyrinth from its seed (every client gets the same one) and puts it on the map. */
  function loadMaze(seed: number): void {
    const size = mazeSize(settings, Math.max(1, match.seats.filter(s => s.role === 'seeker').length))
    if (!seed || (maze?.seed === seed && maze.cols === size.cols && maze.rows === size.rows)) return
    maze = generateMaze(seed, {
      cols: size.cols,
      rows: size.rows,
      roomCount: settings.roomCount,
      doorCount: settings.doorCount,
      holeCount: settings.holeCount,
      torchCount: settings.torchCount,
      hideSpotCount: settings.hideSpotCount,
      exitCount: settings.exitCount,
    })
    Object.assign(mapStore.project, buildMazeMap(maze))
    spawns = { seekers: maze.seekerSpawns, hiders: maze.hiderSpawns }
    explored = new Uint8Array(maze.cols * maze.rows)
    mazeRevision.value++
  }

  /** Referee: round `round` on a fresh labyrinth (when the map asks for one). */
  function setupRound(round: number): void {
    if (settings.randomMaze) loadMaze(1 + Math.floor(Math.random() * 0x7ffffffe))
    rebuildGrids()
    startRound(match, round, seekerPaths, spawns, settings, Math.random, maze)
    rebuildGrids()
  }

  function bodies(): MatchBody[] {
    return [...players.values()].map(p => ({ id: p.id, col: p.col, row: p.row, moving: p.moving, hidden: p.hidden, trait: traitOf(p.model) }))
  }

  // ==========================================
  // Match / rounds
  // ==========================================
  function startMatch(): void {
    settings = normalizeHideSeekSettings(mapStore.project.hideSeekSettings)
    maze = null
    match = createMatch([])
    rebuildGrids()
    spawns = splitSpawns(routeSpawns())
    footprints = []
    explored = new Uint8Array(mapStore.project.cols * mapStore.project.rows)
    players.clear()
    bots.clear()
    lastRound = -1
    // Only a solo game waits for a role pick (a solo game earlier in this tab must not leave it set for a room)
    needsSoloRole.value = false

    // Page refresh: this tab's saved match of the same game continues instead of a new one
    const saved = readSession<SavedHideSeekMatch>(HIDE_SEEK_MATCH_KEY)
    const resume = saved?.owner === sessionOwner() ? saved : null

    if (isSolo()) {
      addPlayer(myId(), multiplayerStore.myPlayerName, multiplayerStore.myPlayerColor, DEFAULT_HERO_MODEL, 'hider')
      match = createMatch([{ id: myId(), team: 1 }])
      needsSoloRole.value = true
      if (resume?.match) resumeAsReferee(resume, resume.match)
    } else {
      const ordered = [...multiplayerStore.players].sort((a, b) => a.slotIndex - b.slotIndex)
      for (const p of ordered) addPlayer(p.id, p.name, p.color, p.heroModel || DEFAULT_HERO_MODEL, roleForSlot(p.slotIndex, settings.seekerSlots))
      match = createMatch(ordered.map(p => ({ id: p.id, team: teamForSlot(p.slotIndex, settings.seekerSlots) })), settings.roundCount)
      if (multiplayerStore.isHost) {
        if (resume?.match) {
          resumeAsReferee(resume, resume.match)
        } else {
          setupRound(0)
          onRoundStarted()
        }
        broadcastState()
      } else {
        myRole.value = myPlayer()?.role ?? 'hider'
        if (resume) resumeAsGuest(resume)
      }
    }
    isActive.value = true
    applyHud()
  }

  // ==========================================
  // Page refresh (sessionStorage)
  // ==========================================
  /** One running game: the room, or the solo map */
  function sessionOwner(): string {
    return multiplayerStore.roomId ? `room:${multiplayerStore.roomId}` : `solo:${getProjectMapId(mapStore.project)}`
  }

  /** Saves where this tab is in the match: the referee (host / solo) the whole match, a guest its own character. */
  function saveSession(): void {
    if (!isActive.value) return
    const me = myPlayer()
    const isRunningReferee = isReferee() && !needsSoloRole.value
    const snapshot: SavedHideSeekMatch = {
      owner: sessionOwner(),
      match: isRunningReferee ? match : null,
      mazeSeed: match.mazeSeed,
      round: match.round,
      bodies: isRunningReferee ? [...players.values()] : me ? [me] : [],
      gadgets: { ...gadgets },
      stamina,
      explored: Array.from(explored),
      bots: Object.fromEntries([...bots].map(([id, b]) => [id, { gadgets: b.gadgets, stamina: b.stamina, rank: b.rank }])),
    }
    writeSession(HIDE_SEEK_MATCH_KEY, snapshot)
  }

  /** Puts the saved labyrinth back on the map and the own character, gadgets and explored fog back in place. */
  function restoreOwnState(saved: SavedHideSeekMatch): void {
    if (saved.mazeSeed) loadMaze(saved.mazeSeed)
    rebuildGrids()
    lastRound = saved.round
    const me = myPlayer()
    const savedMe = saved.bodies.find(b => b.id === myId())
    if (me && savedMe) Object.assign(me, savedMe, { moving: false })
    visionFacing = me?.facing ?? 0
    isHidden.value = (me?.hidden ?? -1) !== -1
    Object.assign(gadgets, saved.gadgets)
    stamina = saved.stamina
    if (saved.explored.length === explored.length) explored = Uint8Array.from(saved.explored)
  }

  /** Host / solo: the match goes on from the saved state (same round, clock, altars, seats and scores). */
  function resumeAsReferee(saved: SavedHideSeekMatch, savedMatch: HideSeekMatch): void {
    match = savedMatch
    for (const body of saved.bodies) {
      // Solo brings its bots back; in a room only players still in it come back
      if (isSolo() || players.has(body.id)) players.set(body.id, { ...body, moving: false })
    }
    restoreOwnState(saved)
    needsSoloRole.value = false
    myRole.value = seatOf(match, myId())?.role ?? 'hider'
    // Everyone else is already where they were: this tune has played
    lastTuneKey = `${match.round}:${match.clock.phase}`

    for (const [id, savedBot] of Object.entries(saved.bots ?? {})) {
      const bot = players.get(id)
      if (!bot) continue
      bots.set(id, { ...newBot(bot, savedBot.rank), gadgets: savedBot.gadgets, stamina: savedBot.stamina })
    }
  }

  /** Guest: back on the same labyrinth and spot; the host's next state brings the match itself. */
  function resumeAsGuest(saved: SavedHideSeekMatch): void {
    match.mazeSeed = saved.mazeSeed
    match.round = saved.round
    restoreOwnState(saved)
    const me = myPlayer()
    if (me) sendMyState(me)
  }

  /**
   * Solo: the player takes `role` with `teamSize - 1` bot teammates, against `teamSize` bots on the other side
   * (seekers are team 0 for the whole match).
   */
  function startSoloRound(role: HideSeekRole, teamSize: number): void {
    const me = myPlayer()
    if (!me || !grid) return
    for (const id of bots.keys()) players.delete(id)
    bots.clear()
    const other: HideSeekRole = role === 'seeker' ? 'hider' : 'seeker'
    const roster: { role: HideSeekRole; count: number }[] = [
      { role, count: teamSize - 1 },
      { role: other, count: teamSize },
    ]
    const entries: { id: string; team: HideSeekTeam }[] = [{ id: me.id, team: role === 'seeker' ? 0 : 1 }]
    let n = 0
    for (const side of roster) {
      for (let k = 0; k < side.count; k++) {
        n++
        const id = `bot-${n}`
        const model = HERO_MODELS[Math.floor(Math.random() * HERO_MODELS.length)].id
        addPlayer(id, `Bot ${n}`, getSlotColor(n), model, side.role)
        bots.set(id, { brain: createBotBrain(EMPTY_GRID, [], 0, 0), stamina: freshStamina(settings), gadgets: gadgetsFor(side.role, settings), rank: side.role === role ? k + 1 : k })
        entries.push({ id, team: side.role === 'seeker' ? 0 : 1 })
      }
    }
    match = createMatch(entries, settings.roundCount)
    setupRound(0)
    needsSoloRole.value = false
    onRoundStarted()
  }

  /** Solo: back to the role picker for another match. */
  function chooseSoloRole(): void {
    needsSoloRole.value = true
    releaseInput()
  }

  /** A new round: everyone takes their new role, walks back to their spawn and gets fresh gadgets. */
  function onRoundStarted(): void {
    lastRound = match.round
    for (const p of players.values()) {
      const seat = seatOf(match, p.id)
      if (!seat) continue
      p.role = seat.role
      // Each client places its own character (and the solo bot); the referee also puts the others at their start
      // until their own position arrives, so nobody is caught at a stale spot the moment the round begins
      if (p.id !== myId() && !isBot(p.id) && !isReferee()) continue
      const spawn = spawnForSeat(match, p.id, spawns)
      Object.assign(p, { col: spawn.col, row: spawn.row, targetCol: spawn.col, targetRow: spawn.row, moving: false, hidden: -1 })
    }
    const me = myPlayer()
    myRole.value = me?.role ?? 'hider'
    stamina = freshStamina(me ? rulesOf(me) : settings)
    Object.assign(gadgets, me ? gadgetsOf(me) : gadgetsFor(myRole.value, settings))
    altarHumAt = []
    explored.fill(0)
    footprints = []
    lastPositions.clear()
    huntHint = null
    huntTimer = 0
    isHunting.value = false
    ripples = []
    isHidden.value = false
    releaseInput()
    visionFacing = me?.facing ?? 0

    // Bots start the round with a fresh mind (a new labyrinth), full breath and their gadgets
    for (const [id, bot] of bots) {
      const body = players.get(id)
      if (body) bots.set(id, newBot(body, bot.rank))
    }
    botNoises = []
    if (me && !isSolo()) sendMyState(me)
    applyHud()
  }

  function applyHud(): void {
    const clock = match.clock
    playPhaseTune()
    phase.value = clock.phase
    secondsLeft.value = Math.ceil(Math.max(0, clock.timeLeft))
    winner.value = clock.winner
    endReason.value = clock.reason
    champion.value = match.champion
    round.value = match.round + 1
    rounds.value = Math.max(1, match.rounds)
    const mySeat = seatOf(match, myId())
    const altars = altarProgress(match)
    altarsLit.value = altars.lit
    altarsNeeded.value = altars.needed
    myAltars.value = mySeat?.lit ?? 0
    applyChainHud()
    roundWins.value = { ...match.wins }
    matchWinner.value = match.matchWinner
    exitsOpen.value = match.exitsOpen
    seekerCatches.value = mySeat?.catches ?? 0
    myTrait.value = traitOf(myPlayer()?.model)
    isJailed.value = !!seatOf(match, myId())?.jailed
    scores.value = match.seats
      .map(seat => {
        const p = players.get(seat.id)
        return {
          id: seat.id,
          name: p?.name ?? '?',
          color: p?.color ?? '#94a3b8',
          score: Math.floor(seat.score),
          role: seat.role,
          jailed: seat.jailed,
          isMe: seat.id === myId(),
        }
      })
      .sort((a, b) => b.score - a.score)
  }

  /** Chain timers on the HUD (whole seconds), and whether I am frozen. */
  function applyChainHud(): void {
    const seat = seatOf(match, myId())
    const chain = chainOf(match, myId())
    const up = (v: number) => Math.ceil(Math.max(0, v))
    chainCooldown.value = up(seat?.chainCooldown ?? 0)
    chainHolding.value = chain?.hider === myId() ? up(chain.timeLeft) : 0
    chainHeld.value = chain?.seeker === myId() ? up(chain.timeLeft) : 0
    dazedLeft.value = up(seat?.dazed ?? 0)
    isFrozenMe.value = isFrozen(match, myId())
  }

  function newBot(body: HideSeekBody, rank: number): BotState {
    return {
      brain: createBotBrain(pathGrid(body), allSpawns(spawns), match.altars.length, match.spots.length),
      stamina: freshStamina(rulesOf(body)),
      gadgets: gadgetsOf(body),
      rank,
    }
  }

  /** A tune marks each phase once: round start, the hunt, round end. */
  function playPhaseTune(): void {
    const key = `${match.round}:${match.clock.phase}`
    if (key === lastTuneKey || needsSoloRole.value) return
    lastTuneKey = key
    const { phase: next, winner: roundWinner } = match.clock
    if (next === 'hiding') hideSeekAudio.playRoundStart()
    else if (next === 'seeking') hideSeekAudio.playSeekStart()
    else hideSeekAudio.playRoundEnd(roundWinner !== null && roundWinner === myRole.value)
  }

  function releaseInput(): void {
    clickPath = []
    pending = null
    pressedKeys.clear()
    joystick.x = 0
    joystick.y = 0
    sneakHeld = false
  }

  function reset(): void {
    isActive.value = false
    lastTuneKey = ''
    needsSoloRole.value = false
    players.clear()
    releaseInput()
    match = createMatch([])
    bots.clear()
    winner.value = null
    endReason.value = null
    champion.value = null
    altarsLit.value = 0
    altarsNeeded.value = 0
    myAltars.value = 0
    chainCooldown.value = 0
    chainHolding.value = 0
    chainHeld.value = 0
    dazedLeft.value = 0
    isFrozenMe.value = false
    roundWins.value = { seeker: 0, hider: 0 }
    matchWinner.value = null
    heardLevel.value = 0
    dangerLevel.value = 0
    isJailed.value = false
    isHidden.value = false
    scores.value = []
    isHunting.value = false
    viewContext = null
    renderView = null
  }

  // ==========================================
  // Input (keyboard from GameController, joystick / buttons from the touch UI)
  // ==========================================
  function setKey(code: string, pressed: boolean): boolean {
    if (code === 'ShiftLeft' || code === 'ShiftRight') {
      sneakHeld = pressed
      return true
    }
    if (MOVE_KEYS[code]) {
      if (pressed) {
        pressedKeys.add(code)
        if (myPlayer()?.hidden !== -1) leaveSpot()
      } else pressedKeys.delete(code)
      return true
    }
    if (!pressed) return false
    if (ACTION_KEYS.has(code)) useNearest()
    else if (code === 'KeyT') dropTrap()
    else if (code === 'KeyC') setCandle()
    else if (code === 'KeyR') useChain()
    else return false
    return true
  }

  function setJoystick(x: number, y: number): void {
    joystick.x = x
    joystick.y = y
  }

  /** Shift or the touch sneak button: slow and silent while held */
  function setSneakHeld(held: boolean): void {
    sneakHeld = held
  }

  const distTo = (a: GridCoord, b: GridCoord) => Math.hypot(a.col - b.col, a.row - b.row)

  interface Usable {
    use: PendingUse
    at: GridCoord
    reach: number
  }

  /** What this player can use: the seeker barrels and dark candles; hiders barrels and burning candles; everyone doors. */
  function usables(role: HideSeekRole): Usable[] {
    const list: Usable[] = []
    match.spots.forEach((at, index) => list.push({ use: { kind: role === 'seeker' ? 'search' : 'hide', index }, at, reach: HIDE_SPOT_REACH }))
    torchSpots(match, maze).forEach((at, index) => {
      if (match.torches[index] === (role === 'hider')) list.push({ use: { kind: 'torch', index }, at, reach: TORCH_REACH })
    })
    maze?.doors.forEach((door, index) => list.push({ use: { kind: 'door', index }, at: door.center, reach: DOOR_REACH }))
    return list
  }

  function usePosition(use: PendingUse): GridCoord | undefined {
    if (use.kind === 'door') return maze?.doors[use.index]?.center
    if (use.kind === 'torch') return torchSpots(match, maze)[use.index]
    return match.spots[use.index]
  }

  /** E / Space / touch button: uses the nearest thing in reach (a hider inside a barrel climbs out). */
  function useNearest(): void {
    const me = myPlayer()
    if (!me || !canMove.value) return
    if (me.hidden !== -1) return leaveSpot()
    const inReach = usables(me.role).filter(u => distTo(u.at, me) <= u.reach)
    inReach.sort((a, b) => distTo(a.at, me) - distTo(b.at, me))
    if (inReach[0]) applyUse(inReach[0].use)
  }

  /** Seeker: open a barrel; whoever hides inside is caught. */
  function openSpot(index: number): void {
    const me = myPlayer()
    if (me) me.facing = Math.atan2(match.spots[index].row - me.row, match.spots[index].col - me.col)
    hideSeekAudio.playFootstep(0.5, 0)
    performAction({ kind: 'search', spot: index })
  }

  function enterSpot(index: number): void {
    const me = myPlayer()
    if (!me) return
    const spot = match.spots[index]
    Object.assign(me, { hidden: index, col: spot.col, row: spot.row, moving: false })
    clickPath = []
    pending = null
    isHidden.value = true
    hideSeekAudio.playFootstep(0.3, 0)
    if (!isSolo()) sendMyState(me)
  }

  function leaveSpot(): void {
    const me = myPlayer()
    if (!me || me.hidden === -1) return
    me.hidden = -1
    isHidden.value = false
    if (!isSolo()) sendMyState(me)
  }

  /** Click / tap: open / search / hide (walking up first), or walk there. */
  function clickCell(col: number, row: number): void {
    const me = myPlayer()
    if (!me || !canMove.value) return
    const target = { col, row }
    const picked = usables(me.role)
      .filter(u => distTo(u.at, target) <= CLICK_PICK)
      .sort((a, b) => distTo(a.at, target) - distTo(b.at, target))[0]
    if (picked?.use.kind === 'hide' && me.hidden === picked.use.index) return leaveSpot()
    leaveSpot()
    if (picked) return useOrWalk(me, picked.at, picked.reach, picked.use)
    moveTo(col, row)
  }

  function useOrWalk(me: HideSeekBody, at: GridCoord, reach: number, use: PendingUse): void {
    if (distTo(at, me) <= reach) {
      clickPath = []
      pending = null
      return applyUse(use)
    }
    moveTo(at.col, at.row)
    pending = use
  }

  function applyUse(use: PendingUse): void {
    if (use.kind === 'search') openSpot(use.index)
    else if (use.kind === 'hide') enterSpot(use.index)
    else if (use.kind === 'door') performAction({ kind: 'door', index: use.index, open: !match.doors[use.index] })
    else performAction({ kind: 'torch', index: use.index })
  }

  /** Walk to the cell along a path around the walls. */
  function moveTo(col: number, row: number): void {
    const me = myPlayer()
    if (!me || !canMove.value) return
    clickPath = findWalkPath(pathGrid(me), me, { col, row })
    pending = null
  }

  function readInput(): { x: number; y: number } {
    let x = joystick.x
    let y = joystick.y
    for (const code of pressedKeys) {
      x += MOVE_KEYS[code][0]
      y += MOVE_KEYS[code][1]
    }
    const len = Math.hypot(x, y)
    return len > 1 ? { x: x / len, y: y / len } : { x, y }
  }

  // ==========================================
  // Gadgets
  // ==========================================
  function dropTrap(): void {
    const me = myPlayer()
    if (!me || !canMove.value || myRole.value !== 'seeker' || gadgets.traps <= 0) return
    gadgets.traps--
    hideSeekAudio.playFootstep(0.4, 0)
    performAction({ kind: 'trap', c: Math.round(me.col * 2) / 2, r: Math.round(me.row * 2) / 2 })
  }

  /** Seeker: set a burning candle down where they stand (a few per round). */
  function setCandle(): void {
    const me = myPlayer()
    if (!me || !canMove.value || myRole.value !== 'seeker' || gadgets.candles <= 0) return
    const at = { col: Math.round(me.col * 2) / 2, row: Math.round(me.row * 2) / 2 }
    if (!canPlaceCandle(match, at, maze)) return
    gadgets.candles--
    performAction({ kind: 'candle', c: at.col, r: at.row })
  }

  /** Hider who lit an altar: chain the nearest seeker in reach (the referee checks reach and cooldown). */
  function useChain(): void {
    const seat = seatOf(match, myId())
    if (!canMove.value || myRole.value !== 'hider' || !seat || seat.lit === 0 || seat.chainCooldown > 0) return
    performAction({ kind: 'chain' })
  }

  /** The referee applies an action right away; a guest sends it to the host. */
  function performAction(action: HideSeekActionPayload): void {
    if (isReferee()) applyAction(action, myId())
    else send('HS_ACTION', action)
  }

  /** Referee: applies a player's (or the bot's) action. */
  function applyAction(action: HideSeekActionPayload, by: string): void {
    if (action.kind === 'trap') stateDirty = placeTrap(match, { col: action.c, row: action.r }, seekersGadgets('traps')) || stateDirty
    else if (action.kind === 'chain') startChain(match, by, bodies(), grid ?? EMPTY_GRID, settings).forEach(emitEvent)
    else if (action.kind === 'candle') {
      if (players.get(by)?.role === 'seeker' && placeCandle(match, { col: action.c, row: action.r }, seekersGadgets('candles'), maze)) {
        emitEvent({ kind: 'candle', col: action.c, row: action.r })
      }
    }
    else if (action.kind === 'door') {
      if (setDoor(match, action.index, action.open)) emitEvent({ kind: 'door', index: action.index, open: action.open })
    } else if (action.kind === 'torch') {
      const role = seatOf(match, by)?.role
      if (role && useTorch(match, action.index, role)) emitEvent({ kind: 'torch', index: action.index, lit: match.torches[action.index] })
    } else searchSpot(match, action.spot, bodies(), settings, by).forEach(emitEvent)
  }

  // ==========================================
  // Events (sounds / effects everyone gets)
  // ==========================================
  function emitEvent(event: HideSeekEventPayload): void {
    handleEvent(event)
    if (!isSolo()) send('HS_EVENT', event)
    stateDirty = true
  }

  /**
   * Each client moves its own character (and the solo bot): a caught one into the jail, a freed one back to its start.
   * Without a jail (a map's own layout) the caught stay where they are.
   */
  function placeOwnCharacter(id: string, to: 'jail' | 'home'): void {
    if (id !== myId() && !(isBot(id) && isReferee())) return
    const p = players.get(id)
    const jailAt = maze?.jail
    if (!p || (to === 'jail' && !jailAt)) return
    const jailed = match.seats.filter(s => s.jailed)
    const at = to === 'jail' && jailAt ? jailSpot(jailAt, Math.max(0, jailed.findIndex(s => s.id === id))) : spawnForSeat(match, id, spawns)
    Object.assign(p, { col: at.col, row: at.row, targetCol: at.col, targetRow: at.row, moving: false, hidden: -1 })
    if (id === myId()) {
      clickPath = []
      pending = null
      if (!isSolo()) sendMyState(p)
    }
  }

  /** Volume / pan of a sound at `pos` for the local player. */
  function soundAt(pos: GridCoord, loudness: (distance: number) => number): [number, number] {
    const me = myPlayer()
    if (!me) return [0, 0]
    // Screen-space left/right: x grows with (col - row)
    const pan = Math.max(-1, Math.min(1, ((pos.col - pos.row) - (me.col - me.row)) / settings.hearingRange))
    return [loudness(distTo(pos, me)), pan]
  }

  const noiseAt = (pos: GridCoord) => soundAt(pos, d => noiseLoudness(d, settings))

  function handleEvent(event: HideSeekEventPayload): void {
    switch (event.kind) {
      case 'altarLit': {
        const altar = match.altars[event.altar]
        if (!altar) break
        if (!isReferee()) Object.assign(altar, { lit: true, progress: 1 })
        hideSeekAudio.playChime(...soundAt(altar, d => altarLoudness(d, settings)))
        botNoises.push({ col: altar.col, row: altar.row, range: Infinity })
        applyHud()
        break
      }
      case 'chain':
        // The referee already added it; a guest adds it now (the next state confirms it)
        if (!isReferee()) match.chains.push({ hider: event.hider, seeker: event.seeker, timeLeft: settings.chainTime })
        hideSeekAudio.playJail(0.6, false)
        if (event.hider === myId() || event.seeker === myId()) releaseInput()
        applyChainHud()
        break
      case 'chainEnd': {
        if (!isReferee()) {
          match.chains = match.chains.filter(c => !(c.hider === event.hider && c.seeker === event.seeker))
          const seeker = seatOf(match, event.seeker)
          if (seeker && event.dazed) seeker.dazed = settings.chainDaze
        }
        hideSeekAudio.playJail(0.5, true)
        applyChainHud()
        break
      }
      case 'caught':
        hideSeekAudio.playJail(0.7, false)
        if (event.id === myId()) leaveSpot()
        placeOwnCharacter(event.id, 'jail')
        break
      case 'freed':
        hideSeekAudio.playJail(0.6, true)
        placeOwnCharacter(event.id, 'home')
        break
      case 'bell':
        hideSeekAudio.playBell(...noiseAt(event))
        ripples.push({ col: event.col, row: event.row, age: 0 })
        botNoises.push({ col: event.col, row: event.row, range: settings.noiseRange })
        break
      case 'round':
        if (isReferee()) onRoundStarted()
        break
      case 'exitsOpen':
        match.exitsOpen = true
        hideSeekAudio.playGates()
        applyHud()
        break
      case 'door': {
        match.doors[event.index] = event.open
        rebuildGrids()
        const door = maze?.doors[event.index]
        if (door) {
          hideSeekAudio.playDoor(...noiseAt(door.center), event.open)
          botNoises.push({ ...door.center, range: settings.noiseRange })
        }
        break
      }
      case 'candle': {
        // The referee already added it; a guest adds it now (the next state confirms it)
        if (!isReferee()) {
          match.candles.push({ col: event.col, row: event.row })
          match.torches.push(true)
        }
        refreshTorchGlows()
        hideSeekAudio.playCandle(...noiseAt(event), true)
        break
      }
      case 'torch': {
        match.torches[event.index] = event.lit
        const torch = torchSpots(match, maze)[event.index]
        if (torch) hideSeekAudio.playCandle(...noiseAt(torch), event.lit)
        break
      }
    }
  }

  // ==========================================
  // Network
  // ==========================================
  function send(type: NetMessage['type'], payload: unknown): void {
    const msg: NetMessage = { type, payload, senderId: myId(), timestamp: Date.now() }
    if (multiplayerStore.isHost) networkService.broadcast(msg)
    else networkService.sendToHost(msg)
  }

  function sendMyState(me: HideSeekBody): void {
    const payload: HideSeekPlayerStatePayload = {
      id: me.id,
      c: Math.round(me.col * 100) / 100,
      r: Math.round(me.row * 100) / 100,
      f: Math.round(me.facing * 100) / 100,
      m: me.moving,
      s: me.sneaking,
      h: me.hidden,
    }
    send('HS_PLAYER_STATE', payload)
  }

  function broadcastState(): void {
    if (!multiplayerStore.isHost) return
    const payload: HideSeekMatchStatePayload = {
      round: match.round,
      rounds: match.rounds,
      phase: match.clock.phase,
      timeLeft: match.clock.timeLeft,
      winner: match.clock.winner,
      reason: match.clock.reason,
      champion: match.champion,
      altars: match.altars.map(a => ({ c: a.col, r: a.row, p: Math.round(a.progress * 1000) / 1000, l: a.lit })),
      altarsNeeded: match.altarsNeeded,
      chains: match.chains.map(c => ({ ...c })),
      spots: match.spots.map(s => ({ c: s.col, r: s.row, k: s.kind, f: s.facing })),
      traps: match.traps.map(t => ({ c: t.col, r: t.row, ring: t.ringing })),
      maze: match.mazeSeed,
      doors: [...match.doors],
      torches: [...match.torches],
      candles: match.candles.map(c => ({ c: c.col, r: c.row })),
      exits: match.exits.map(e => ({ c: e.col, r: e.row })),
      exitsOpen: match.exitsOpen,
      seats: match.seats.map(s => ({ ...s })),
      wins: { ...match.wins },
      matchWinner: match.matchWinner,
    }
    send('HS_MATCH_STATE', payload)
  }

  function applyPlayerState(state: HideSeekPlayerStatePayload): void {
    const p = players.get(state.id)
    if (!p || p.id === myId()) return
    p.targetCol = state.c
    p.targetRow = state.r
    p.facing = state.f
    p.moving = state.m
    p.sneaking = state.s
    p.hidden = state.h
    // The host relays player states so every guest sees everyone (3-4 players)
    if (multiplayerStore.isHost && players.size > 2) send('HS_PLAYER_STATE', state)
  }

  function applyMatchState(state: HideSeekMatchStatePayload): void {
    if (multiplayerStore.isHost) return
    match.round = state.round
    match.rounds = state.rounds
    match.clock = { phase: state.phase, timeLeft: state.timeLeft, winner: state.winner, reason: state.reason }
    match.champion = state.champion
    match.altars = state.altars.map(a => ({ col: a.c, row: a.r, progress: a.p, lit: a.l }))
    match.altarsNeeded = state.altarsNeeded
    match.chains = state.chains.map(c => ({ ...c }))
    match.spots = state.spots.map(s => ({ col: s.c, row: s.r, kind: s.k, facing: s.f }))
    match.traps = state.traps.map(t => ({ col: t.c, row: t.r, ringing: t.ring }))
    match.seats = state.seats.map(s => ({ ...s }))
    match.wins = { ...state.wins }
    match.matchWinner = state.matchWinner
    match.mazeSeed = state.maze
    match.doors = [...state.doors]
    match.torches = [...state.torches]
    match.candles = state.candles.map(c => ({ col: c.c, row: c.r }))
    match.exits = state.exits.map(e => ({ col: e.c, row: e.r }))
    match.exitsOpen = state.exitsOpen
    loadMaze(state.maze)
    rebuildGrids()
    if (state.round !== lastRound) onRoundStarted()
    applyHud()
  }

  /** Host: a guest used a gadget / opened a barrel. */
  function applyRemoteAction(action: HideSeekActionPayload, senderId: string): void {
    if (multiplayerStore.isHost) applyAction(action, senderId)
  }

  function applyRemoteEvent(event: HideSeekEventPayload): void {
    if (!multiplayerStore.isHost) handleEvent(event)
  }

  // ==========================================
  // Frame update
  // ==========================================
  function refereeTick(deltaSec: number): void {
    if (!grid) return
    if (!isSolo()) {
      // Players who left the room drop out of the match
      for (const id of players.keys()) {
        if (!multiplayerStore.players.some(p => p.id === id)) players.delete(id)
      }
    }
    const events: MatchEvent[] = tickMatch(match, bodies(), grid, settings, deltaSec, arenaOf(maze))
    for (const event of events) {
      if (event.kind !== 'roundDue') {
        emitEvent(event)
        continue
      }
      setupRound(match.round + 1)
      emitEvent({ kind: 'round' })
    }
    stateTimer += deltaSec
    if (stateDirty || stateTimer >= STATE_BROADCAST_SEC) {
      stateTimer = 0
      stateDirty = false
      broadcastState()
      applyHud()
    }
  }

  function updateMe(me: HideSeekBody, deltaSec: number): void {
    const sneaking = sneakHeld
    isSneaking.value = sneaking
    me.sneaking = sneaking
    const wasMoving = me.moving
    const input = canMove.value ? readInput() : { x: 0, y: 0 }
    const dir = screenInputToGrid(input.x, input.y)
    const steering = Math.hypot(dir.col, dir.row) > 0.05
    if (steering && me.hidden !== -1) leaveSpot()
    const rules = rulesOf(me)
    const distance = moveSpeed(me.role, sneaking, stamina, rules) * deltaSec

    if (!canMove.value || me.hidden !== -1 || !grid) {
      clickPath = []
      me.moving = false
    } else if (steering) {
      // Keyboard / joystick steering overrides a click-to-move path
      clickPath = []
      pending = null
      const next = moveWithCollision(moveGrid(me), me, dir.col * distance, dir.row * distance)
      me.col = next.col
      me.row = next.row
      me.facing = Math.atan2(dir.row, dir.col)
      me.moving = true
    } else if (clickPath.length > 0) {
      const step = stepAlongPath(me, clickPath, distance)
      me.col = step.pos.col
      me.row = step.pos.row
      clickPath = step.path
      if (step.facing !== null) me.facing = step.facing
      me.moving = step.facing !== null
    } else {
      me.moving = false
    }

    // Walking a route through a shut door: push it open (not the door walked to on purpose: that one is used on arrival)
    if (clickPath.length > 0) {
      openDoorsAhead(me, index => {
        if (pending?.kind !== 'door' || pending.index !== index) performAction({ kind: 'door', index, open: true })
      })
    }

    // Walked up to a barrel / door / candle clicked from afar: stop in front of it and use it
    if (pending && grid) {
      const at = usePosition(pending)
      // A door stands in the wall line itself: no line of sight to it, it is used from its reach
      const arrived = pending.kind === 'door' ? !!at && distTo(at, me) <= DOOR_REACH * 0.8 : !!at && distTo(at, me) <= STOP_DISTANCE && hasLineOfSight(grid, me, at)
      if (!at) pending = null
      else if (arrived) {
        const use = pending
        clickPath = []
        pending = null
        me.moving = false
        applyUse(use)
      } else if (clickPath.length === 0) pending = null
    }

    const gait = me.hidden !== -1 ? 'hidden' : !me.moving ? 'still' : sneaking ? 'sneak' : 'run'
    stamina = advanceStamina(stamina, gait, deltaSec, rules)
    const level = Math.round((Math.min(1, stamina.value / rules.staminaSeconds)) * 50) / 50
    if (level !== staminaLevel.value) staminaLevel.value = level
    if (stamina.exhausted !== isExhausted.value) isExhausted.value = stamina.exhausted

    visionFacing = turnTowards(visionFacing, me.facing, VISION_TURN_SPEED * deltaSec)

    sendTimer += deltaSec
    if (!isSolo() && (sendTimer >= SEND_INTERVAL_SEC || wasMoving !== me.moving)) {
      sendTimer = 0
      sendMyState(me)
    }
  }

  /** Shut doors right in front of a walker (once per door until it is open). */
  const doorRequests = new Map<number, number>()
  function openDoorsAhead(walker: GridCoord, open: (index: number) => void): void {
    const now = performance.now()
    maze?.doors.forEach((door, index) => {
      if (match.doors[index] || distTo(door.center, walker) > DOOR_AUTO_OPEN) return
      if (now - (doorRequests.get(index) ?? 0) < 500) return
      doorRequests.set(index, now)
      open(index)
    })
  }

  /** Solo bots: each thinks with its own eyes / ears, then walks its path and uses gadgets like a player. */
  function updateBots(deltaSec: number): void {
    if (!grid) return
    for (const [id, bot] of bots) {
      const body = players.get(id)
      if (body) updateBot(body, bot, deltaSec)
    }
    for (const role of ['seeker', 'hider'] as const) {
      shareAltarSightings([...bots].filter(([id]) => players.get(id)?.role === role).map(([, bot]) => bot.brain))
    }
    botNoises = []
  }

  function updateBot(body: HideSeekBody, bot: BotState, deltaSec: number): void {
    if (!grid) return
    const seat = seatOf(match, body.id)
    if (!seat || seat.jailed || isFrozen(match, body.id) || !canAct(body.role, match.clock.phase)) {
      body.moving = false
      return
    }
    const rules = rulesOf(body)
    const others = [...players.values()].filter(p => p !== body)
    const action = thinkBot(
      bot.brain,
      body.role,
      {
        self: body,
        facing: body.facing,
        opponents: others
          .filter(p => p.role !== body.role)
          .map(p => ({
            id: p.id,
            col: p.col,
            row: p.row,
            moving: p.moving,
            sneaking: p.sneaking,
            hidden: p.hidden !== -1,
            jailed: !!seatOf(match, p.id)?.jailed,
            spotted: spottedWithin(settings, traitOf(p.model)),
            quiet: stepLoudness(settings, traitOf(p.model)),
          })),
        teammates: others.filter(p => p.role === body.role).map(p => ({ id: p.id, col: p.col, row: p.row, jailed: !!seatOf(match, p.id)?.jailed })),
        altars: match.altars,
        spots: match.spots,
        noises: botNoises,
        exhausted: bot.stamina.exhausted,
        breath: bot.stamina.value / rules.staminaSeconds,
        hiddenIn: body.hidden,
        gadgets: bot.gadgets,
        exits: match.exitsOpen ? match.exits : [],
        jail: maze?.jail ?? null,
        home: maze ? { col: maze.hiderBase.col + maze.hiderBase.cols / 2 - 0.5, row: maze.hiderBase.row + maze.hiderBase.rows / 2 - 0.5 } : null,
        canChain: body.role === 'hider' && seat.lit > 0 && seat.chainCooldown <= 0,
        rank: bot.rank,
      },
      pathGrid(body),
      body.role === 'seeker' && isHunting.value ? huntSettings(rules) : rules,
      Math.random,
      deltaSec
    )
    if (action.hideIn !== body.hidden) {
      body.hidden = action.hideIn
      const spot = match.spots[action.hideIn]
      if (spot) Object.assign(body, { col: spot.col, row: spot.row, targetCol: spot.col, targetRow: spot.row })
    }
    if (action.trap && bot.gadgets.traps > 0) {
      bot.gadgets.traps--
      applyAction({ kind: 'trap', c: Math.round(body.col * 2) / 2, r: Math.round(body.row * 2) / 2 }, body.id)
    }
    if (action.search !== -1) applyAction({ kind: 'search', spot: action.search }, body.id)
    if (action.chain) {
      applyAction({ kind: 'chain' }, body.id)
      if (isFrozen(match, body.id)) {
        body.moving = false
        return
      }
    }

    body.sneaking = action.sneak
    if (body.hidden !== -1) {
      body.moving = false
      bot.stamina = advanceStamina(bot.stamina, 'hidden', deltaSec, rules)
      return
    }
    if (bot.brain.path.length > 0) openDoorsAhead(body, index => applyAction({ kind: 'door', index, open: true }, body.id))
    const step = stepAlongPath(body, bot.brain.path, moveSpeed(body.role, body.sneaking, bot.stamina, rules) * deltaSec)
    bot.brain.path = step.path
    body.col = body.targetCol = step.pos.col
    body.row = body.targetRow = step.pos.row
    if (step.facing !== null) body.facing = step.facing
    body.moving = step.facing !== null
    bot.stamina = advanceStamina(bot.stamina, !body.moving ? 'still' : body.sneaking ? 'sneak' : 'run', deltaSec, rules)
  }

  function animate(p: HideSeekBody, deltaSec: number): void {
    const rules = rulesOf(p)
    const speed = p.sneaking ? rules.sneakSpeed : rules.runSpeed
    const frameDuration = p.moving ? Math.max(0.04, RUN_FRAME_SEC / speed) : 0.16
    p.animTimer += deltaSec
    if (p.animTimer < frameDuration) return
    p.animTimer = 0
    p.frame = p.moving ? (p.frame + 1) % getModelActionFrameCount(p.model, 'Run') : 0
  }

  /** Remote characters ease towards their network position; footsteps and the heartbeat are heard. */
  function updateOthers(me: HideSeekBody | undefined, deltaSec: number): void {
    const playing = match.clock.phase === 'hiding' || match.clock.phase === 'seeking'
    const ears = me ? rulesOf(me) : settings
    let loudest = 0
    let nearestSeeker = Infinity
    for (const p of players.values()) {
      if (p !== me) {
        if (!isBot(p.id)) {
          const ease = Math.min(1, deltaSec * 12)
          p.col += (p.targetCol - p.col) * ease
          p.row += (p.targetRow - p.row) * ease
        }
        if (me && playing && p.moving && !p.sneaking && p.hidden === -1) {
          p.stepTimer += deltaSec
          if (p.stepTimer >= footstepInterval(rulesOf(p).runSpeed)) {
            p.stepTimer = 0
            const quiet = stepLoudness(settings, traitOf(p.model))
            const [volume, pan] = soundAt(p, d => footstepLoudness(d, ears) * quiet)
            hideSeekAudio.playFootstep(volume, pan)
            loudest = Math.max(loudest, volume)
          }
        }
        if (me && p.role === 'seeker') nearestSeeker = Math.min(nearestSeeker, distTo(p, me) / spottedWithin(settings, traitOf(p.model)))
        if (playing) leaveFootprints(p)
      }
      animate(p, deltaSec)
    }
    for (const print of footprints) print.age += settings.footprintSeconds > 0 ? deltaSec / settings.footprintSeconds : 1
    footprints = footprints.filter(f => f.age < 1)

    heardDecay = Math.max(loudest, heardDecay - deltaSec * 1.5)
    const heard = Math.round(heardDecay * 10) / 10
    if (heard !== heardLevel.value) heardLevel.value = heard

    // Heartbeat: a free hider feels the seeker coming
    const danger = me?.role === 'hider' && !isJailed.value && match.clock.phase === 'seeking' ? heartbeatDanger(nearestSeeker, ears) : 0
    heartbeatTimer -= deltaSec
    if (danger > 0.05 && heartbeatTimer <= 0) {
      hideSeekAudio.playHeartbeat(0.25 + 0.55 * danger)
      heartbeatTimer = heartbeatInterval(danger)
    }
    const shown = Math.round(danger * 10) / 10
    if (shown !== dangerLevel.value) dangerLevel.value = shown
  }

  /** Running (not sneaking) leaves footprints, left and right in turn. */
  function leaveFootprints(p: HideSeekBody): void {
    const last = lastPositions.get(p.id)
    if (!last) {
      lastPositions.set(p.id, { col: p.col, row: p.row, travel: 0, left: false })
      return
    }
    const moved = distTo(p, last)
    last.col = p.col
    last.row = p.row
    if (!p.moving || p.sneaking || p.hidden !== -1 || moved > 2) {
      last.travel = 0
      return
    }
    last.travel += moved
    if (last.travel < FOOTPRINT_SPACING) return
    last.travel = 0
    last.left = !last.left
    footprints.push({ col: p.col, row: p.row, facing: p.facing, left: last.left, age: 0 })
  }

  /** The hunt: the seeker sees further and now and then feels which way the nearest free hider is. */
  function updateHunt(me: HideSeekBody | undefined, deltaSec: number): void {
    const hunting = isHuntTime(match.clock.phase, match.clock.timeLeft, settings)
    if (hunting && !isHunting.value) hideSeekAudio.playHunt()
    if (hunting !== isHunting.value) isHunting.value = hunting
    if (huntHint) {
      huntHint.strength -= deltaSec / HUNT_HINT_SEC
      if (huntHint.strength <= 0) huntHint = null
    }
    if (!hunting || me?.role !== 'seeker') return
    huntTimer -= deltaSec
    if (huntTimer > 0) return
    huntTimer = settings.huntPingInterval
    const prey = [...players.values()]
      .filter(p => p.role === 'hider' && !seatOf(match, p.id)?.jailed)
      .sort((a, b) => distTo(a, me) - distTo(b, me))[0]
    if (prey) huntHint = { angle: Math.atan2(prey.row - me.row, prey.col - me.col), strength: 1 }
  }

  function updateEffects(me: HideSeekBody | undefined, vision: GridCoord[] | null, deltaSec: number): void {

    for (const ripple of ripples) ripple.age += deltaSec / RIPPLE_SEC
    ripples = ripples.filter(r => r.age < 1)

    // An altar being lit hums: only heard nearby (a seeker has to come close to notice it)
    altarHumTimer -= deltaSec
    if (altarHumTimer <= 0) {
      altarHumTimer = ALTAR_HUM_SEC
      match.altars.forEach((altar, i) => {
        if (!altar.lit && altar.progress > (altarHumAt[i] ?? 0)) {
          const [volume, pan] = soundAt(altar, d => altarHumLoudness(d, settings))
          if (volume > 0) hideSeekAudio.playChime(volume * 0.5, pan)
          botNoises.push({ col: altar.col, row: altar.row, range: settings.hearingRange })
        }
        altarHumAt[i] = altar.progress
      })
    }

    // Eyes closed (seeker while the hiders hide): nothing is discovered
    const blind = me?.role === 'seeker' && match.clock.phase === 'hiding'
    if (vision && !blind) markExplored(explored, mapStore.project.cols, mapStore.project.rows, vision)
  }

  /** Guest: chains, dazes and cooldowns run down between two host states (the host's next state corrects them). */
  function advanceGuestTimers(deltaSec: number): void {
    for (const chain of match.chains) chain.timeLeft = Math.max(0, chain.timeLeft - deltaSec)
    for (const seat of match.seats) {
      seat.chainCooldown = Math.max(0, seat.chainCooldown - deltaSec)
      seat.dazed = Math.max(0, seat.dazed - deltaSec)
    }
  }

  function tick(deltaSec: number, tileWidth: number, tileHeight: number): void {
    if (!isActive.value || !grid) return

    if (!needsSoloRole.value) {
      if (isReferee()) refereeTick(deltaSec)
      else if (match.clock.phase !== 'ended') match.clock.timeLeft = Math.max(0, match.clock.timeLeft - deltaSec)
    }
    if (Math.ceil(Math.max(0, match.clock.timeLeft)) !== secondsLeft.value || match.clock.phase !== phase.value) applyHud()

    const me = myPlayer()
    if (me) updateMe(me, deltaSec)
    if (!isReferee()) advanceGuestTimers(deltaSec)
    if (isFrozen(match, myId()) !== isFrozenMe.value) applyChainHud()
    if (isSolo() && !needsSoloRole.value) updateBots(deltaSec)
    updateOthers(me, deltaSec)

    updateHunt(me, deltaSec)
    const over = isRoundOver(match)
    // Own eyes (a keen eye sees further); the seeker sees further still during the hunt
    const own = me ? rulesOf(me) : settings
    const sight = isHunting.value && me?.role === 'seeker' ? huntSettings(own) : own
    const vision = over || !me ? null : castVision(grid, me, visionFacing, sight, sight.lanternRadius)
    updateEffects(me, vision, deltaSec)

    viewContext = {
      match,
      bodies: [...players.values()],
      me,
      settings: sight,
      grid,
      maze,
      torchGlows,
      footprints,
      huntHint: huntHint && me ? { from: { col: me.col, row: me.row }, ...huntHint } : null,
      tileWidth,
      tileHeight,
      visionFacing,
      vision,
      route: clickPath,
      ripples,
      explored,
      cols: mapStore.project.cols,
      rows: mapStore.project.rows,
    }
    renderView = buildRenderView(viewContext)
  }

  function getRenderView(): HideSeekRenderView | null {
    return renderView
  }

  function getMinimapView(): HideSeekMinimapView | null {
    return viewContext ? buildMinimapView(viewContext) : null
  }

  /** Camera target: own character. */
  function getMyPosition(): GridCoord | null {
    const me = myPlayer()
    return me ? { col: me.col, row: me.row } : null
  }

  return {
    isActive,
    phase,
    secondsLeft,
    round,
    rounds,
    winner,
    endReason,
    champion,
    altarsLit,
    altarsNeeded,
    myAltars,
    chainCooldown,
    chainHolding,
    chainHeld,
    dazedLeft,
    useChain,
    roundWins,
    matchWinner,
    myRole,
    isSneaking,
    heardLevel,
    dangerLevel,
    staminaLevel,
    isExhausted,
    gadgets,
    isJailed,
    isHidden,
    scores,
    canMove,
    didIWin,
    needsSoloRole,
    isHunting,
    exitsOpen,
    mazeRevision,
    myTrait,
    seekerCatches,
    setCandle,
    startSoloRound,
    chooseSoloRole,
    startMatch,
    saveSession,
    reset,
    setKey,
    setJoystick,
    setSneakHeld,
    clickCell,
    useNearest,
    dropTrap,
    releaseInput,
    applyPlayerState,
    applyMatchState,
    applyRemoteAction,
    applyRemoteEvent,
    tick,
    getRenderView,
    getMinimapView,
    getMyPosition,
  }
})
