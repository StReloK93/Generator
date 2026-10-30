import express from 'express'
import { ExpressPeerServer } from 'peer'
import { WebSocketServer } from 'ws'

/** A room disappears from the public list when its host stops heartbeating for this long. */
const ROOM_TTL_MS = 10_000

/**
 * Multiplayer backend shared by `npm run dev` (mounted into Vite) and `npm start` (production):
 *  - /peer        PeerJS signaling server (WebRTC handshake between host and players)
 *  - /api/rooms   public room registry: hosts heartbeat their room, everyone lists it
 */
export function createMultiplayerApp(httpServer) {
  const app = express()
  const rooms = new Map()

  const pruneStaleRooms = () => {
    const now = Date.now()
    for (const [id, room] of rooms) {
      if (now - room.lastHeartbeat > ROOM_TTL_MS) rooms.delete(id)
    }
  }

  // Allows a frontend hosted elsewhere (VITE_SERVER_URL) to use this API
  app.use('/api', (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    if (req.method === 'OPTIONS') return res.sendStatus(204)
    next()
  })

  app.get('/api/rooms', (_req, res) => {
    pruneStaleRooms()
    res.json([...rooms.values()].sort((a, b) => b.createdAt - a.createdAt))
  })

  app.post('/api/rooms', express.json({ limit: '8kb' }), (req, res) => {
    const room = req.body
    if (!room || typeof room.roomId !== 'string' || !/^[A-Z0-9]{4,12}$/.test(room.roomId)) {
      return res.status(400).json({ error: 'Invalid room' })
    }
    rooms.set(room.roomId, {
      roomId: room.roomId,
      roomName: String(room.roomName || '').slice(0, 40),
      hostName: String(room.hostName || '').slice(0, 20),
      hostColor: String(room.hostColor || ''),
      mapName: String(room.mapName || '').slice(0, 40),
      gameMode: room.gameMode === 'hero' ? 'hero' : 'td',
      playersCount: Number(room.playersCount) || 1,
      maxPlayers: Number(room.maxPlayers) || 2,
      gameState: String(room.gameState || 'lobby'),
      createdAt: rooms.get(room.roomId)?.createdAt ?? Date.now(),
      lastHeartbeat: Date.now(),
    })
    res.json({ ok: true })
  })

  app.delete('/api/rooms/:roomId', (req, res) => {
    rooms.delete(req.params.roomId)
    res.json({ ok: true })
  })

  // Own upgrade routing (noServer) so the PeerJS socket coexists with other WebSockets on the
  // same HTTP server (Vite HMR) — a path-bound ws server would reject their handshakes.
  const peerServer = ExpressPeerServer(httpServer, {
    path: '/',
    allow_discovery: false,
    createWebSocketServer: ({ path, server }) => {
      const wss = new WebSocketServer({ noServer: true, path })
      server.on('upgrade', (req, socket, head) => {
        if (wss.shouldHandle(req)) wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req))
      })
      return wss
    },
  })
  app.use('/peer', peerServer)

  return app
}
