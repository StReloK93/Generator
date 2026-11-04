/**
 * Shareable, refresh-safe URLs: the address bar always says which map is open and which room the player is in.
 * - single player:   /game/<mapId>
 * - room lobby:      /lobby/<roomId>/<mapId>
 * - room game:       /game/<mapId>/room/<roomId>
 */
export function gamePath(mapId: string, roomId?: string): string {
  return roomId ? `/game/${mapId}/room/${roomId}` : `/game/${mapId}`
}

export function lobbyPath(roomId: string, mapId?: string): string {
  return mapId ? `/lobby/${roomId}/${mapId}` : `/lobby/${roomId}`
}
