import crypto from 'node:crypto'
import { WebSocketServer } from 'ws'

/** Messages a newcomer sees (older ones are dropped; nothing is kept when the server restarts) */
const HISTORY = 100
const MAX_TEXT = 200
const MAX_NAME = 16
/** One message per player at most this often */
const MESSAGE_GAP_MS = 1000
/** Longest ban the admin can give, in minutes (a week) */
const MAX_BAN_MINUTES = 7 * 24 * 60
/** Sockets that stop answering pings are closed */
const PING_MS = 30_000
/** Player list changes are sent out together, at most this often */
const PLAYERS_PUSH_MS = 300

const PLACES = new Set(['home', 'lobby', 'game', 'solo', 'editor'])
const COLORS = ['#f59e0b', '#10b981', '#38bdf8', '#a78bfa', '#f472b6', '#fb7185', '#facc15', '#2dd4bf']

const clean = (text, max) => String(text ?? '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max)

/**
 * Everyone who has the game open, and one big chat for all of them (WebSocket on /online).
 * A player is known by a secret key their browser keeps; others only ever see a public id made from it, so nobody can
 * pass for someone else. Each player tells where they are (home, a room's lobby, a game) so friends can follow them
 * into a room. The admin (server/admin.js) deletes messages and bans a player for a while: a banned player cannot
 * write in any chat or talk in voice chat (the clients enforce the voice part: everyone stops hearing them).
 *
 * Client -> server: hello { key, name }, status { place, roomId?, roomName?, mapName?, hasPassword?, isHost?, playerId? },
 *   chat { text }, admin { token }, delete { id }, ban { id, minutes }, unban { id }
 * Server -> client: welcome { you, admin, players, messages, bans }, players { players }, message { message },
 *   deleted { id }, bans { bans }, admin { admin }, error { code, until? }
 */
export function createOnline(httpServer, { auth }) {
  const wss = new WebSocketServer({ noServer: true, path: '/online' })
  httpServer.on('upgrade', (req, socket, head) => {
    if (wss.shouldHandle(req)) wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req))
  })

  /** ws -> { id, name, color, status, admin, alive, lastMessageAt } (id is null until hello) */
  const clients = new Map()
  const messages = []
  /**
   * Public id -> banned until (ms). Only the player: many players share one address (mobile carriers, home and school
   * networks), so banning an address would silence people who did nothing.
   */
  const bans = new Map()
  let playersTimer = null

  const send = (ws, data) => {
    if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(data))
  }
  const broadcast = (data) => {
    const text = JSON.stringify(data)
    for (const [ws, client] of clients) if (client.id && ws.readyState === ws.OPEN) ws.send(text)
  }

  function activeBans() {
    const now = Date.now()
    for (const [id, until] of bans) if (until <= now) bans.delete(id)
    return Object.fromEntries(bans)
  }

  /** One entry per player (a player with two tabs shows once, where they last went) */
  function playerList() {
    const players = new Map()
    for (const client of clients.values()) {
      if (!client.id) continue
      const known = players.get(client.id)
      if (!known || client.statusAt > known.statusAt) {
        players.set(client.id, { id: client.id, name: client.name, color: client.color, admin: client.admin, ...client.status, statusAt: client.statusAt })
      }
    }
    return [...players.values()].map(({ statusAt, ...player }) => player).sort((a, b) => a.name.localeCompare(b.name))
  }

  function pushPlayers() {
    if (playersTimer) return
    playersTimer = setTimeout(() => {
      playersTimer = null
      broadcast({ t: 'players', players: playerList() })
    }, PLAYERS_PUSH_MS)
  }


  function onHello(ws, client, data) {
    const key = clean(data.key, 128)
    if (key.length < 16) return ws.close(4000, 'key')
    client.id = crypto.createHash('sha256').update(key).digest('hex').slice(0, 12)
    client.name = clean(data.name, MAX_NAME) || 'Player'
    client.color = COLORS[parseInt(client.id.slice(0, 6), 16) % COLORS.length]
    send(ws, { t: 'welcome', you: client.id, admin: client.admin, players: playerList(), messages, bans: activeBans() })
    pushPlayers()
  }

  function onStatus(client, data) {
    const place = PLACES.has(data.place) ? data.place : 'home'
    const inRoom = place === 'lobby' || place === 'game'
    client.status = {
      place,
      roomId: inRoom && /^\d{6}$/.test(String(data.roomId ?? '')) ? String(data.roomId) : null,
      roomName: inRoom ? clean(data.roomName, 40) : '',
      mapName: clean(data.mapName, 40),
      hasPassword: inRoom && data.hasPassword === true,
      isHost: inRoom && data.isHost === true,
      // The player's id inside the room (its voice chat): a ban mutes that voice
      playerId: inRoom ? clean(data.playerId, 64) : '',
    }
    if (typeof data.name === 'string') client.name = clean(data.name, MAX_NAME) || client.name
    client.statusAt = Date.now()
    pushPlayers()
  }

  function onChat(ws, client, data) {
    const text = clean(data.text, MAX_TEXT)
    if (!text) return
    const until = bans.get(client.id) ?? 0
    if (until > Date.now()) return send(ws, { t: 'error', code: 'banned', until })
    if (Date.now() - client.lastMessageAt < MESSAGE_GAP_MS) return send(ws, { t: 'error', code: 'too-fast' })
    client.lastMessageAt = Date.now()
    const message = { id: crypto.randomBytes(6).toString('hex'), at: Date.now(), from: client.id, name: client.name, color: client.color, admin: client.admin, text }
    messages.push(message)
    if (messages.length > HISTORY) messages.splice(0, messages.length - HISTORY)
    broadcast({ t: 'message', message })
  }

  function onAdminAction(client, data) {
    if (!client.admin) return
    if (data.t === 'delete') {
      const index = messages.findIndex((m) => m.id === data.id)
      if (index >= 0) messages.splice(index, 1)
      broadcast({ t: 'deleted', id: String(data.id) })
      return
    }
    const target = String(data.id ?? '')
    if (data.t === 'ban') {
      const minutes = Math.min(MAX_BAN_MINUTES, Math.max(1, Math.round(Number(data.minutes) || 0)))
      bans.set(target, Date.now() + minutes * 60_000)
    } else bans.delete(target)
    broadcast({ t: 'bans', bans: activeBans() })
  }

  wss.on('connection', (ws) => {
    const client = {
      id: null,
      name: 'Player',
      color: COLORS[0],
      status: { place: 'home' },
      statusAt: 0,
      admin: false,
      alive: true,
      lastMessageAt: 0,
    }
    clients.set(ws, client)
    ws.on('pong', () => (client.alive = true))
    ws.on('close', () => {
      clients.delete(ws)
      pushPlayers()
    })
    ws.on('message', (raw) => {
      let data
      try {
        data = JSON.parse(String(raw))
      } catch {
        return
      }
      if (data.t === 'hello') return onHello(ws, client, data)
      if (!client.id) return
      if (data.t === 'status') return onStatus(client, data)
      if (data.t === 'chat') return onChat(ws, client, data)
      if (data.t === 'admin') {
        client.admin = auth.enabled && auth.isAdminToken(String(data.token ?? ''))
        send(ws, { t: 'admin', admin: client.admin })
        return pushPlayers()
      }
      if (data.t === 'delete' || data.t === 'ban' || data.t === 'unban') onAdminAction(client, data)
    })
  })

  const pinger = setInterval(() => {
    for (const [ws, client] of clients) {
      if (!client.alive) {
        ws.terminate()
        continue
      }
      client.alive = false
      ws.ping()
    }
  }, PING_MS)
  wss.on('close', () => clearInterval(pinger))
}
