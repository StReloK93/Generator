import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useMapStore } from './mapStore'
import { useMultiplayerStore } from './multiplayerStore'
import { networkService } from '../services/networkService'
import { hideSeekAudio } from '../services/hideSeekAudio'
import { getModelActionFrameCount } from '../utils/characterUtils'
import {
  HideSeekMatchClock,
  HideSeekRole,
  HideSeekEndReason,
  ChestState,
  CollisionGrid,
  normalizeHideSeekSettings,
  roleForSlot,
  startMatchClock,
  advanceMatchClock,
  endMatchClock,
  canAct,
  buildCollisionGrid,
  moveWithCollision,
  stepAlongPath,
  smoothPath,
  isSubCellWalkable,
  screenInputToGrid,
  directionForFacing,
  castVision,
  canSee,
  isCaught,
  footstepLoudness,
  footstepInterval,
  pickChestSpots,
  findReachableChest,
  chestChimeLoudness,
  turnTowards,
} from '../domain/hideseek'
import { AStarPathfinder } from '../domain/pathfinding/AStarPathfinder'
import type { GridCoord, HideSeekSettings } from '../types/map'
import type { NetMessage, HideSeekPlayerStatePayload, HideSeekMatchStatePayload } from '../types/multiplayer'
import type { HideSeekRenderView } from '../rendering/types'

export const DEFAULT_HERO_MODEL = 'male'

interface RuntimePlayer {
  id: string
  name: string
  color: string
  model: string
  role: HideSeekRole
  col: number
  row: number
  /** Last network position of a remote player (rendered position eases towards it) */
  targetCol: number
  targetRow: number
  facing: number
  moving: boolean
  sneaking: boolean
  frame: number
  animTimer: number
  stepTimer: number
}

const SEND_INTERVAL_SEC = 1 / 15
const CLOCK_BROADCAST_SEC = 1
/** How fast the sight cone swings to a new heading (radians per second) */
const VISION_TURN_SPEED = 9
const MOVE_KEYS: Record<string, [number, number]> = {
  KeyW: [0, -1], ArrowUp: [0, -1],
  KeyS: [0, 1], ArrowDown: [0, 1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0],
  KeyD: [1, 0], ArrowRight: [1, 0],
}

/**
 * Hide & seek match session: local input, own movement, remote players, the host's match clock
 * and the per-frame render view. Rules live in domain/hideseek; per-frame data stays non-reactive.
 */
export const useHideSeekStore = defineStore('hideSeek', () => {
  const mapStore = useMapStore()
  const multiplayerStore = useMultiplayerStore()

  // Reactive HUD state
  const isActive = ref(false)
  const phase = ref<HideSeekMatchClock['phase']>('hiding')
  const secondsLeft = ref(0)
  const winner = ref<HideSeekRole | null>(null)
  const endReason = ref<HideSeekEndReason | null>(null)
  const chestsOpened = ref(0)
  const chestsTotal = ref(0)
  const myRole = ref<HideSeekRole>('hider')
  const isSneaking = ref(false)
  const heardLevel = ref(0)

  const canMove = computed(() => canAct(myRole.value, phase.value))
  const didIWin = computed(() => winner.value !== null && winner.value === myRole.value)

  // Per-frame runtime (non-reactive)
  let settings: HideSeekSettings = normalizeHideSeekSettings(null)
  let grid: CollisionGrid | null = null
  let clock: HideSeekMatchClock = startMatchClock(settings)
  const players = new Map<string, RuntimePlayer>()
  let chests: ChestState[] = []
  const pressedKeys = new Set<string>()
  const joystick = { x: 0, y: 0 }
  let shiftHeld = false
  let sneakToggled = false
  let clickPath: GridCoord[] = []
  /** Own sight heading: follows the body facing smoothly so the cone never snaps */
  let visionFacing = 0
  let sendTimer = 0
  let clockBroadcastTimer = 0
  let heardDecay = 0
  let renderView: HideSeekRenderView = { avatars: [], chests: [], route: [], vision: null, visionRange: 0, blind: false }

  function myPlayer(): RuntimePlayer | undefined {
    return players.get(multiplayerStore.myPlayerId)
  }

  function addPlayer(id: string, name: string, color: string, model: string, slotIndex: number, spawn: { col: number; row: number }): void {
    players.set(id, {
      id,
      name,
      color,
      model,
      role: roleForSlot(slotIndex),
      col: spawn.col,
      row: spawn.row,
      targetCol: spawn.col,
      targetRow: spawn.row,
      facing: Math.PI / 4,
      moving: false,
      sneaking: false,
      frame: 0,
      animTimer: 0,
      stepTimer: 0,
    })
  }

  /** Editor playtest without a room: walk the maze alone, no match clock. */
  function isSolo(): boolean {
    return !multiplayerStore.roomId
  }

  function startMatch(): void {
    settings = normalizeHideSeekSettings(mapStore.project.hideSeekSettings)
    grid = buildCollisionGrid(mapStore.project)
    players.clear()

    if (isSolo()) {
      const spawn = mapStore.project.routes?.[0]?.routePoints?.[0] ?? { col: 0, row: 0 }
      addPlayer(multiplayerStore.myPlayerId, multiplayerStore.myPlayerName, multiplayerStore.myPlayerColor, DEFAULT_HERO_MODEL, 0, spawn)
      clock = { phase: 'seeking', timeLeft: settings.roundTime, winner: null, reason: null }
    } else {
      for (const p of multiplayerStore.players) {
        const slot = multiplayerStore.slots.find(s => s.slotIndex === p.slotIndex)
        const spawn = { col: slot?.spawnCol ?? 0, row: slot?.spawnRow ?? 0 }
        addPlayer(p.id, p.name, p.color, p.heroModel || DEFAULT_HERO_MODEL, p.slotIndex, spawn)
      }
      clock = startMatchClock(settings)
    }

    // The host (or a solo player) places the chests; guests receive them with the match state
    chests = multiplayerStore.isHost || isSolo()
      ? pickChestSpots(grid, [...players.values()], settings.chestCount, Math.random).map(p => ({ ...p, opened: false }))
      : []

    myRole.value = myPlayer()?.role ?? 'hider'
    visionFacing = myPlayer()?.facing ?? 0
    isActive.value = true
    applyClock(clock)
    broadcastClock()
  }

  /** Releases held keys / joystick (e.g. the window lost focus while a key was down). */
  function releaseInput(): void {
    clickPath = []
    pressedKeys.clear()
    joystick.x = 0
    joystick.y = 0
    shiftHeld = false
  }

  function reset(): void {
    isActive.value = false
    players.clear()
    releaseInput()
    sneakToggled = false
    winner.value = null
    endReason.value = null
    chests = []
    chestsOpened.value = 0
    chestsTotal.value = 0
    heardLevel.value = 0
    renderView = { avatars: [], chests: [], route: [], vision: null, visionRange: 0, blind: false }
  }

  // ==========================================
  // Input (keyboard from GameController, joystick / sneak button from touch UI)
  // ==========================================
  function setKey(code: string, pressed: boolean): boolean {
    if (code === 'ShiftLeft' || code === 'ShiftRight') {
      shiftHeld = pressed
      return true
    }
    if (!MOVE_KEYS[code]) return false
    if (pressed) pressedKeys.add(code)
    else pressedKeys.delete(code)
    return true
  }

  function setJoystick(x: number, y: number): void {
    joystick.x = x
    joystick.y = y
  }

  function toggleSneak(): void {
    sneakToggled = !sneakToggled
  }

  /** Click / tap to move: walk to the cell along a path around the walls. */
  function moveTo(col: number, row: number): void {
    const me = myPlayer()
    if (!me || !grid || !canMove.value) return
    const walkGrid = grid
    const path = AStarPathfinder.findPath(me, { col, row }, mapStore.project.cols, mapStore.project.rows, (sc, sr) =>
      isSubCellWalkable(walkGrid, sc, sr)
    )
    // The first waypoint is the sub-cell we are standing on; straighten the rest into smooth lines
    clickPath = smoothPath(walkGrid, me, path.slice(1))
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
  // Network
  // ==========================================
  function send(type: NetMessage['type'], payload: unknown): void {
    const msg: NetMessage = { type, payload, senderId: multiplayerStore.myPlayerId, timestamp: Date.now() }
    if (multiplayerStore.isHost) networkService.broadcast(msg)
    else networkService.sendToHost(msg)
  }

  function sendMyState(me: RuntimePlayer): void {
    const payload: HideSeekPlayerStatePayload = {
      id: me.id,
      c: Math.round(me.col * 100) / 100,
      r: Math.round(me.row * 100) / 100,
      f: Math.round(me.facing * 100) / 100,
      m: me.moving,
      s: me.sneaking,
    }
    send('HS_PLAYER_STATE', payload)
  }

  function broadcastClock(): void {
    if (!multiplayerStore.isHost) return
    const payload: HideSeekMatchStatePayload = {
      phase: clock.phase,
      timeLeft: clock.timeLeft,
      winner: clock.winner,
      reason: clock.reason,
      chests: chests.map(ch => ({ c: ch.col, r: ch.row, o: ch.opened })),
    }
    send('HS_MATCH_STATE', payload)
  }

  function applyPlayerState(state: HideSeekPlayerStatePayload): void {
    const p = players.get(state.id)
    if (!p || p.id === multiplayerStore.myPlayerId) return
    p.targetCol = state.c
    p.targetRow = state.r
    p.facing = state.f
    p.moving = state.m
    p.sneaking = state.s
  }

  function applyMatchState(state: HideSeekMatchStatePayload): void {
    if (multiplayerStore.isHost) return
    clock = { phase: state.phase, timeLeft: state.timeLeft, winner: state.winner, reason: state.reason }
    const next = state.chests.map(ch => ({ col: ch.c, row: ch.r, opened: ch.o }))
    next.forEach((ch, i) => {
      if (ch.opened && chests[i] && !chests[i].opened) playChimeAt(ch)
    })
    chests = next
    applyClock(clock)
  }

  function applyClock(next: HideSeekMatchClock): void {
    phase.value = next.phase
    secondsLeft.value = Math.ceil(next.timeLeft)
    winner.value = next.winner
    endReason.value = next.reason
    chestsOpened.value = chests.filter(ch => ch.opened).length
    chestsTotal.value = chests.length
  }

  /** Everyone hears a chest open: louder nearby, panned towards it. */
  function playChimeAt(pos: GridCoord): void {
    const me = myPlayer()
    if (!me) return
    const dist = Math.hypot(pos.col - me.col, pos.row - me.row)
    const pan = ((pos.col - pos.row) - (me.col - me.row)) / settings.hearingRange
    hideSeekAudio.playChime(chestChimeLoudness(dist, settings), pan)
  }

  /** Opens a chest the player stands at; returns true when that was the last one. */
  function openChestNear(player: RuntimePlayer): boolean {
    const index = findReachableChest(player, chests)
    if (index === -1) return false
    chests[index].opened = true
    playChimeAt(chests[index])
    applyClock(clock)
    return chests.every(ch => ch.opened)
  }

  // ==========================================
  // Frame update
  // ==========================================
  function updateHostClock(deltaSec: number): void {
    const previousPhase = clock.phase
    clock = advanceMatchClock(clock, deltaSec, settings)

    const seeker = [...players.values()].find(p => p.role === 'seeker')
    const hider = [...players.values()].find(p => p.role === 'hider')
    if (clock.phase !== 'ended') {
      // A player left the match: the one still here wins
      if (!seeker || !hider) clock = endMatchClock(seeker ? 'seeker' : 'hider', 'left')
      else if (clock.phase === 'seeking' && grid && isCaught(grid, seeker, hider, settings)) clock = endMatchClock('seeker', 'caught')
    }

    const openedBefore = chests.filter(ch => ch.opened).length
    if (clock.phase !== 'ended' && hider && openChestNear(hider)) clock = endMatchClock('hider', 'chests')
    const chestOpened = chests.filter(ch => ch.opened).length !== openedBefore

    clockBroadcastTimer += deltaSec
    if (clock.phase !== previousPhase || chestOpened || clockBroadcastTimer >= CLOCK_BROADCAST_SEC) {
      clockBroadcastTimer = 0
      broadcastClock()
    }
  }

  function animate(p: RuntimePlayer, deltaSec: number): void {
    const speed = p.sneaking ? settings.sneakSpeed : settings.runSpeed
    const frameDuration = p.moving ? Math.max(0.035, 0.16 / speed) : 0.16
    p.animTimer += deltaSec
    if (p.animTimer < frameDuration) return
    p.animTimer = 0
    p.frame = p.moving ? (p.frame + 1) % getModelActionFrameCount(p.model, 'Run') : 0
  }

  function tick(deltaSec: number, tileWidth: number, tileHeight: number): void {
    if (!isActive.value || !grid) return

    if (isSolo()) {
      // No opponent and no clock: chests can still be opened to try the map
      const me = myPlayer()
      if (me) openChestNear(me)
    } else if (multiplayerStore.isHost) {
      // Players who left the room drop out of the match
      for (const id of players.keys()) {
        if (!multiplayerStore.players.some(p => p.id === id)) players.delete(id)
      }
      updateHostClock(deltaSec)
    } else if (clock.phase !== 'ended') {
      clock = { ...clock, timeLeft: Math.max(0, clock.timeLeft - deltaSec) }
    }
    if (Math.ceil(clock.timeLeft) !== secondsLeft.value || clock.phase !== phase.value) applyClock(clock)

    // 1. Own character
    const me = myPlayer()
    if (me) {
      const sneaking = shiftHeld || sneakToggled
      isSneaking.value = sneaking
      const input = canMove.value ? readInput() : { x: 0, y: 0 }
      const dir = screenInputToGrid(input.x, input.y)
      const wasMoving = me.moving
      const distance = (sneaking ? settings.sneakSpeed : settings.runSpeed) * deltaSec
      me.sneaking = sneaking

      if (Math.hypot(dir.col, dir.row) > 0.05) {
        // Keyboard / joystick steering overrides a click-to-move path
        clickPath = []
        const next = moveWithCollision(grid, me, dir.col * distance, dir.row * distance)
        me.col = next.col
        me.row = next.row
        me.facing = Math.atan2(dir.row, dir.col)
        me.moving = true
      } else if (clickPath.length > 0 && canMove.value) {
        const step = stepAlongPath(grid, me, clickPath, distance)
        me.col = step.pos.col
        me.row = step.pos.row
        clickPath = step.path
        if (step.facing !== null) me.facing = step.facing
        me.moving = step.facing !== null
      } else {
        clickPath = []
        me.moving = false
      }

      visionFacing = turnTowards(visionFacing, me.facing, VISION_TURN_SPEED * deltaSec)

      sendTimer += deltaSec
      if (!isSolo() && (sendTimer >= SEND_INTERVAL_SEC || wasMoving !== me.moving)) {
        sendTimer = 0
        sendMyState(me)
      }
    }

    // 2. Remote characters ease towards their last network position; their footsteps are heard
    let loudest = 0
    for (const p of players.values()) {
      if (p !== me) {
        const ease = Math.min(1, deltaSec * 12)
        p.col += (p.targetCol - p.col) * ease
        p.row += (p.targetRow - p.row) * ease

        if (me && p.moving && !p.sneaking && clock.phase !== 'ended') {
          p.stepTimer += deltaSec
          const interval = footstepInterval(settings.runSpeed)
          if (p.stepTimer >= interval) {
            p.stepTimer = 0
            const loudness = footstepLoudness(Math.hypot(p.col - me.col, p.row - me.row), settings)
            // Screen-space left/right: x grows with (col - row)
            const pan = Math.max(-1, Math.min(1, ((p.col - p.row) - (me.col - me.row)) / settings.hearingRange))
            hideSeekAudio.playFootstep(loudness, pan)
            loudest = Math.max(loudest, loudness)
          }
        }
      }
      animate(p, deltaSec)
    }

    heardDecay = Math.max(loudest, heardDecay - deltaSec * 1.5)
    const level = Math.round(heardDecay * 10) / 10
    if (level !== heardLevel.value) heardLevel.value = level

    renderView = buildRenderView(me, tileWidth, tileHeight)
  }

  function buildRenderView(me: RuntimePlayer | undefined, tileWidth: number, tileHeight: number): HideSeekRenderView {
    const ended = clock.phase === 'ended'
    const blind = !ended && !!me && me.role === 'seeker' && clock.phase === 'hiding'

    return {
      blind,
      chests,
      route: me && clickPath.length > 0 ? [{ col: me.col, row: me.row }, ...clickPath] : [],
      vision: !ended && me && grid ? castVision(grid, me, visionFacing, settings) : null,
      visionRange: settings.visionRange,
      avatars: [...players.values()].map(p => ({
        id: p.id,
        col: p.col,
        row: p.row,
        direction: directionForFacing(p.facing, tileWidth, tileHeight),
        action: p.moving ? 'Run' : 'Idle',
        frame: p.frame,
        model: p.model,
        color: p.color,
        isMe: p === me,
        visible: p === me || ended || (!blind && !!me && !!grid && canSee(grid, me, visionFacing, p, settings)),
      })),
    }
  }

  function getRenderView(): HideSeekRenderView {
    return renderView
  }

  /** Camera target: own character. */
  function getMyPosition(): { col: number; row: number } | null {
    const me = myPlayer()
    return me ? { col: me.col, row: me.row } : null
  }

  return {
    isActive,
    phase,
    secondsLeft,
    winner,
    endReason,
    chestsOpened,
    chestsTotal,
    myRole,
    isSneaking,
    heardLevel,
    canMove,
    didIWin,
    startMatch,
    reset,
    setKey,
    setJoystick,
    toggleSneak,
    moveTo,
    releaseInput,
    applyPlayerState,
    applyMatchState,
    tick,
    getRenderView,
    getMyPosition,
  }
})
