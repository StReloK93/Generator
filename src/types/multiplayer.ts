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
