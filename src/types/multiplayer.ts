import { MapProject, UnitVariantType, MapGameMode } from './map'
import type { HideSeekPhase, HideSeekRole, HideSeekEndReason } from '../domain/hideseek/HideSeekRules'
import type { MatchEvent, HideSeekSeat, ChainState } from '../domain/hideseek/HideSeekMatch'
import type { HideSpotKind, SpriteFacing } from '../domain/hideseek/HideSeekMaze'
import type { AbilityMark } from '../domain/hideseek/HideSeekAbilities'

export interface PlayerInfo {
  id: string
  name: string
  color: string
  slotIndex: number
  isHost: boolean
  isReady: boolean
  ping?: number
  gold: number
  totalGoldEarned?: number
  score: number
  towersBuilt: number
  killsCount: number
  livesContributed?: number
  /** Character model picked in the lobby (hide & seek) */
  heroModel?: string
}

export interface PlayerSlot {
  slotIndex: number
  routeIndex: number
  routeId: string
  routeName: string
  spawnCol: number
  spawnRow: number
  playerCol?: number
  playerRow?: number
  quadrantName?: string
  player: PlayerInfo | null
}

export interface ChatMessage {
  id: string
  senderId: string
  senderName: string
  senderColor: string
  text: string
  timestamp: number
  isSystem?: boolean
}

export interface ActiveRoomSummary {
  roomId: string
  roomName: string
  hostName: string
  hostColor: string
  mapName: string
  gameMode: MapGameMode
  playersCount: number
  maxPlayers: number
  createdAt: number
  lastHeartbeat: number
  gameState: 'lobby' | 'countdown' | 'in_game' | 'ended'
  /** Joining needs the host's password */
  hasPassword: boolean
}

export interface TeammateHover {
  playerId: string
  playerName: string
  playerColor: string
  col: number
  row: number
  lastUpdated: number
}

export type NetMessageType =
  | 'LOBBY_STATE'
  | 'JOIN_REQUEST'
  | 'JOIN_ACCEPTED'
  | 'JOIN_REJECTED'
  | 'PLAYER_LEAVE'
  | 'KICK'
  | 'ROOM_CLOSED'
  | 'SLOT_CHANGE'
  | 'TOGGLE_READY'
  | 'READY_CHECK'
  | 'START_GAME'
  | 'RETURN_TO_LOBBY'
  | 'MAP_DATA'
  | 'BUILD_TOWER'
  | 'UPGRADE_TOWER'
  | 'SELL_TOWER'
  | 'WORLD_SNAPSHOT'
  | 'GAME_STATE_SYNC'
  | 'COMBAT_EVENT'
  | 'WAVE_TICK'
  | 'WAVE_START'
  | 'GAME_EVENT'
  | 'CHAT'
  | 'PING_CELL'
  | 'PLAYER_HOVER'
  | 'GAME_OVER'
  | 'SET_HERO_MODEL'
  | 'HS_PLAYER_STATE'
  | 'HS_MATCH_STATE'
  | 'HS_ACTION'
  | 'HS_EVENT'

export interface NetMessage {
  type: NetMessageType
  payload: any
  senderId: string
  timestamp: number
  seq?: number
}

export interface RoomState {
  roomId: string
  roomName: string
  hostId: string
  mapName: string
  mapProject?: MapProject | null
  maxPlayers: number
  slots: PlayerSlot[]
  players: PlayerInfo[]
  gameState: 'lobby' | 'countdown' | 'in_game' | 'ended'
  countdownTimer: number
  createdAt: number
}

/**
 * Compact unit snapshot for high-frequency low-overhead 20-30Hz P2P transmission
 */
export interface CompactUnitSnapshot {
  id: string
  x: number
  y: number
  col: number
  row: number
  d: number // direction (0-7)
  a: string // action ('Run' | 'Idle' | 'Pickup')
  f: number // frameIndex
  hp: number
  mhp?: number
  m?: string // characterModel ('male' | 'female' | 'warrior' | 'demon')
  oy?: number // vertical elevation offsetY
  as?: number // animation speed multiplier
  us?: number // unit scale multiplier
  fl: number // bitflags: 1: isSpawned, 2: hasReachedEnd, 4: isDead
  df?: number // deathFade (0..1)
  uv?: UnitVariantType // elemental unit variant
  vt?: number | string // variant tint override
}

export interface WorldSnapshotPayload {
  seq: number
  time: number
  units: CompactUnitSnapshot[]
}

export interface GameStateSyncPayload {
  gameState: 'ready' | 'build_prep' | 'wave_running' | 'wave_completed' | 'game_over' | 'victory'
  prepCountdown: number
  currentWaveIndex: number
  playerLives: number
  score: number
  playerStats?: Array<{
    id: string
    killsCount: number
    score: number
    gold: number
  }>
}

export type CombatEventType = 'TOWER_FIRE' | 'COMBAT_HIT' | 'UNIT_DIED'

export interface CompactCombatEvent {
  id: string
  type: CombatEventType
  towerId?: string
  unitId?: string
  projType?: string
  startX?: number
  startY?: number
  targetX?: number
  targetY?: number
  currentX?: number
  currentY?: number
  color?: number
  speed?: number
  damage?: number
  isCrit?: boolean
  currentHp?: number
  isSplash?: boolean
  splashRadius?: number
  splashType?: string
  offsetPerp?: number
  phaseOffset?: number
  killerId?: string
  goldReward?: number
}

export const PLAYER_COLORS = [
  '#ef4444', // Slot 1 - Qizil (Red)
  '#3b82f6', // Slot 2 - Ko'k (Blue)
  '#10b981', // Slot 3 - Yashil (Green)
  '#f59e0b', // Slot 4 - Sariq (Amber / Yellow)
  '#a855f7', // Slot 5 - Binafsha (Purple)
  '#ec4899', // Slot 6 - Pushti (Pink)
  '#06b6d4', // Slot 7 - Moviy (Cyan)
  '#f97316', // Slot 8 - To'q sariq (Orange)
]

export function getSlotColor(slotIndex: number): string {
  return PLAYER_COLORS[slotIndex % PLAYER_COLORS.length] || '#ef4444'
}

export interface NetworkSyncConfig {
  /** Jitter buffer delay in ms to ensure continuous interpolation (default: 100ms) */
  interpolationDelay: number
  /** Maximum number of snapshots kept in the ring buffer (default: 20) */
  maxBufferSnapshots: number
  /** Maximum forward extrapolation time in ms when packets are temporarily delayed (default: 100ms) */
  maxExtrapolationMs: number
  /** Spatial distance squared threshold (px^2) to trigger an immediate snap instead of lerp (default: 10000 = 100px) */
  teleportThresholdSq: number
}


/** Hide & seek: one player's own movement (each client is authoritative over its character). */
export interface HideSeekPlayerStatePayload {
  id: string
  c: number // col
  r: number // row
  f: number // facing angle (grid space, radians)
  m: boolean // moving
  s: boolean // sneaking (silent)
  h: number // hiding spot the player sits in (-1 = none)
}

/** Hide & seek: host-owned match (round, roles, altars, chains, hiding spots, traps, jail and scores). */
export interface HideSeekMatchStatePayload {
  round: number
  rounds: number
  phase: HideSeekPhase
  timeLeft: number
  winner: HideSeekRole | null
  reason: HideSeekEndReason | null
  champion: string | null
  altars: { c: number; r: number; p: number; l: boolean }[] // col, row, progress 0..1, lit
  altarsNeeded: number
  chains: ChainState[] // a hider holding a seeker
  spots: { c: number; r: number; k: HideSpotKind; f: SpriteFacing }[] // col, row, kind, sprite facing
  traps: { c: number; r: number; ring: number }[] // ring = seconds the bell still rings
  /** Random labyrinth of this round (0 = the map's own layout): guests build it from the seed */
  maze: number
  doors: boolean[] // open?
  torches: boolean[] // burning? (labyrinth stands, then the seeker's candles)
  candles: { c: number; r: number }[] // candles the seeker set down
  exits: { c: number; r: number }[] // spot inside each exit gate
  exitsOpen: boolean
  marks: AbilityMark[] // scout birds, fire walls, decoys, snares
  seats: HideSeekSeat[] // team, role, jail, score, altars lit, chain cooldown, daze and catches this round
  wins: Record<HideSeekRole, number> // rounds each side won
  matchWinner: HideSeekRole | null
}

/** Hide & seek: a player uses a gadget / opens a barrel (sent to the host, who applies it). */
export type HideSeekActionPayload =
  | { kind: 'trap'; c: number; r: number }
  | { kind: 'search'; spot: number }
  | { kind: 'door'; index: number; open: boolean }
  | { kind: 'torch'; index: number }
  | { kind: 'candle'; c: number; r: number }
  | { kind: 'chain' }
  | { kind: 'ability'; slot: number }

/** Hide & seek: something everyone should hear / see (host to all). */
export type HideSeekEventPayload =
  | MatchEvent
  | { kind: 'door'; index: number; open: boolean }
  | { kind: 'torch'; index: number; lit: boolean }
  | { kind: 'candle'; col: number; row: number }
