import { MapProject } from './map'

export interface PlayerInfo {
  id: string
  name: string
  color: string
  slotIndex: number
  isHost: boolean
  isReady: boolean
  ping?: number
  gold: number
  score: number
  towersBuilt: number
  killsCount: number
  livesContributed?: number
}

export interface PlayerSlot {
  slotIndex: number
  doorIndex: number
  doorId: string
  doorName: string
  spawnCol: number
  spawnRow: number
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
  playersCount: number
  maxPlayers: number
  createdAt: number
  lastHeartbeat: number
  gameState: 'lobby' | 'countdown' | 'in_game' | 'ended'
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
  fl: number // bitflags: 1: isSpawned, 2: hasReachedEnd, 4: isDead
  df?: number // deathFade (0..1)
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
  killerId?: string
  goldReward?: number
}

export const PLAYER_COLORS = [
  '#38bdf8', // Sky Blue
  '#f43f5e', // Rose Red
  '#10b981', // Emerald Green
  '#fbbf24', // Amber Yellow
  '#a855f7', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f97316', // Orange
]
