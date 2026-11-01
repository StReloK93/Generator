import Peer, { DataConnection, PeerOptions } from 'peerjs'
import { NetMessage, ActiveRoomSummary } from '../types/multiplayer'
import { networkSyncBuffer } from './networkSync'

/**
 * Multiplayer backend (server/multiplayer.js): PeerJS signaling on /peer and the public room list on /api.
 * Same origin as the app by default (dev server and `npm start` both host it); VITE_SERVER_URL points elsewhere.
 */
const SERVER_URL = new URL(import.meta.env.VITE_SERVER_URL || globalThis.location?.origin || 'http://localhost')
const API_URL = `${SERVER_URL.origin}/api`
const isSecure = SERVER_URL.protocol === 'https:'
const CLOUD_PEER_OPTIONS: PeerOptions = {
  debug: 1,
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' }
    ]
  },
}
const OWN_SERVER_PEER_OPTIONS: PeerOptions = {
  ...CLOUD_PEER_OPTIONS,
  host: SERVER_URL.hostname,
  port: Number(SERVER_URL.port) || (isSecure ? 443 : 80),
  path: '/peer',
  secure: isSecure,
}

/**
 * Own server's signaling when it answers, otherwise the public PeerJS cloud: static hosting
 * (GitHub Pages) has no backend, but joining by room code still works through the cloud.
 */
let peerOptionsPromise: Promise<PeerOptions> | null = null
function resolvePeerOptions(): Promise<PeerOptions> {
  peerOptionsPromise ??= fetch(`${API_URL}/rooms`)
    .then(res => (res.ok ? OWN_SERVER_PEER_OPTIONS : CLOUD_PEER_OPTIONS))
    .catch(() => CLOUD_PEER_OPTIONS)
  return peerOptionsPromise
}

/** How often a host re-announces its room to the public list (server drops it after 10s of silence). */
const ROOM_HEARTBEAT_MS = 2000

/** Transient signaling failures worth retrying (connection reset, server hiccup). */
const RETRYABLE_PEER_ERRORS = new Set(['network', 'server-error', 'socket-error', 'socket-closed'])
const MAX_PEER_RETRIES = 3

class NetworkService {
  private peer: Peer | null = null
  private hostConnection: DataConnection | null = null
  private clientConnections: Map<string, DataConnection> = new Map()
  private broadcastChannel: BroadcastChannel | null = null
  private discoveryInterval: ReturnType<typeof setInterval> | null = null
  private processedMessageIds: Set<string> = new Set()
  private isHost = false
  private roomId = ''
  private myPeerId = ''

  private onMessageCallback: ((msg: NetMessage) => void) | null = null
  private onPeerConnectCallback: ((peerId: string) => void) | null = null
  private onPeerDisconnectCallback: ((peerId: string) => void) | null = null
  private onHostConnectCallback: (() => void) | null = null
  private onHostDisconnectCallback: (() => void) | null = null

  /**
   * Initializes host P2P server node
   */
  public async initHost(
    roomId: string,
    onMessage: (msg: NetMessage) => void,
    onPeerConnect: (peerId: string) => void,
    onPeerDisconnect: (peerId: string) => void
  ): Promise<boolean> {
    this.disconnect()
    this.isHost = true
    this.roomId = roomId
    this.onMessageCallback = onMessage
    this.onPeerConnectCallback = onPeerConnect
    this.onPeerDisconnectCallback = onPeerDisconnect

    // BroadcastChannel for instant local tab testing
    this.initBroadcastChannel(roomId)

    const formattedHostPeerId = `isocraft-host-${roomId.toLowerCase()}`
    this.myPeerId = formattedHostPeerId
    const peerOptions = await resolvePeerOptions()

    // Resolves true once registered on the signaling server; false means only same-browser tabs can join.
    return new Promise((resolve) => {
      const attempt = (retry: number) => {
        let peer: Peer
        try {
          peer = new Peer(formattedHostPeerId, peerOptions)
        } catch (e) {
          console.warn('[P2P Host Init Fallback]:', e)
          resolve(false)
          return
        }
        this.peer = peer
        let abandoned = false
        let wasOpen = false

        peer.on('open', (id) => {
          console.log(`[P2P Host] Registered with ID: ${id}`)
          wasOpen = true
          resolve(true)
        })

        peer.on('connection', (conn) => {
          this.handleIncomingClientConnection(conn)
        })

        // Signaling socket dropped mid-session: re-register (after a pause, so an offline device doesn't spin)
        peer.on('disconnected', () => {
          if (!wasOpen || abandoned || this.peer !== peer) return
          setTimeout(() => {
            if (!abandoned && this.peer === peer && peer.disconnected && !peer.destroyed) peer.reconnect()
          }, 2000)
        })

        peer.on('error', (err) => {
          console.warn('[P2P Host Error]:', err)
          // Errors after the first registration are handled by the 'disconnected' reconnect above
          if (wasOpen || abandoned || this.peer !== peer) return
          abandoned = true
          peer.destroy()
          if (RETRYABLE_PEER_ERRORS.has(err.type) && retry < MAX_PEER_RETRIES) {
            setTimeout(() => {
              if (this.peer === peer) attempt(retry + 1)
            }, 1000 * 2 ** retry)
          } else {
            resolve(false)
          }
        })
      }
      attempt(0)
    })
  }

  /**
   * Announces this room on the server room list until stopDiscoveryBeacon() (host only).
   */
  public startDiscoveryBeacon(summaryProvider: () => ActiveRoomSummary) {
    this.stopDiscoveryBeacon()

    const announce = () => {
      fetch(`${API_URL}/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(summaryProvider()),
      }).catch(() => {})
    }

    announce()
    this.discoveryInterval = setInterval(announce, ROOM_HEARTBEAT_MS)
  }

  public stopDiscoveryBeacon() {
    if (!this.discoveryInterval) return
    clearInterval(this.discoveryInterval)
    this.discoveryInterval = null
    // keepalive lets the removal go through even while the page is closing
    fetch(`${API_URL}/rooms/${this.roomId}`, { method: 'DELETE', keepalive: true }).catch(() => {})
  }

  /** Public rooms from the server, or null when the server is unreachable. */
  public async fetchRooms(): Promise<ActiveRoomSummary[] | null> {
    try {
      const res = await fetch(`${API_URL}/rooms`)
      return res.ok ? await res.json() : null
    } catch {
      return null
    }
  }

  /**
   * Connects as a client to host P2P node
   */
  public async connectToHost(
    roomId: string,
    myId: string,
    onMessage: (msg: NetMessage) => void,
    onConnect: () => void,
    onDisconnect: () => void
  ): Promise<boolean> {
    this.disconnect()
    this.isHost = false
    this.roomId = roomId
    this.myPeerId = myId
    this.onMessageCallback = onMessage
    this.onHostConnectCallback = onConnect
    this.onHostDisconnectCallback = onDisconnect

    this.initBroadcastChannel(roomId)
    const peerOptions = await resolvePeerOptions()

    return new Promise((resolve) => {
      const hostPeerId = `isocraft-host-${roomId.toLowerCase()}`
      let connected = false

      try {
        this.peer = new Peer(peerOptions)

        this.peer.on('open', () => {
          if (!this.peer) return
          const conn = this.peer.connect(hostPeerId, { reliable: true })
          this.hostConnection = conn

          conn.on('open', () => {
            console.log('[P2P Client] Connected to host via WebRTC!')
            connected = true
            if (this.onHostConnectCallback) this.onHostConnectCallback()
            resolve(true)
          })

          conn.on('data', (data) => {
            this.receiveMessage(data as NetMessage)
          })

          conn.on('close', () => {
            console.log('[P2P Client] Host connection closed')
            if (this.onHostDisconnectCallback) this.onHostDisconnectCallback()
          })

          conn.on('error', (err) => {
            console.warn('[P2P Client Connection Error]:', err)
          })
        })

        this.peer.on('error', (err) => {
          console.warn('[P2P Client Peer Error]:', err)
          setTimeout(() => {
            if (!connected) {
              if (this.onHostConnectCallback) this.onHostConnectCallback()
              resolve(true)
            }
          }, 600)
        })

        // Fast fallback for local testing & LAN
        setTimeout(() => {
          if (!connected) {
            console.log('[P2P Client] Connecting via local bridge fallback')
            if (this.onHostConnectCallback) this.onHostConnectCallback()
            resolve(true)
          }
        }, 800)
      } catch (e) {
        console.warn('[P2P Connect Fallback]:', e)
        if (this.onHostConnectCallback) this.onHostConnectCallback()
        resolve(true)
      }
    })
  }

  private handleIncomingClientConnection(conn: DataConnection) {
    conn.on('open', () => {
      console.log(`[P2P Host] Client connected: ${conn.peer}`)
      this.clientConnections.set(conn.peer, conn)
      if (this.onPeerConnectCallback) {
        this.onPeerConnectCallback(conn.peer)
      }
    })

    conn.on('data', (data) => {
      this.receiveMessage(data as NetMessage)
    })

    conn.on('close', () => {
      console.log(`[P2P Host] Client disconnected: ${conn.peer}`)
      this.clientConnections.delete(conn.peer)
      if (this.onPeerDisconnectCallback) {
        this.onPeerDisconnectCallback(conn.peer)
      }
    })

    conn.on('error', (err) => {
      console.warn(`[P2P Host Connection Error with ${conn.peer}]:`, err)
    })
  }

  private initBroadcastChannel(roomId: string) {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.broadcastChannel = new BroadcastChannel(`isocraft_room_${roomId.toLowerCase()}`)
        this.broadcastChannel.onmessage = (event) => {
          const msg = event.data as NetMessage
          if (!msg || !msg.type) return
          if (msg.senderId !== this.myPeerId) {
            this.receiveMessage(msg)
          }
        }
      } catch (e) {
        console.warn('[BroadcastChannel Init Error]:', e)
      }
    }
  }

  private outgoingSeq = 0

  /**
   * Internal deduplicated message dispatcher
   */
  public receiveMessage(msg: NetMessage) {
    if (!msg || !msg.type) return
    const key = `${msg.senderId}_${msg.seq || msg.timestamp}_${msg.type}`
    if (this.processedMessageIds.has(key)) return

    this.processedMessageIds.add(key)
    if (this.processedMessageIds.size > 500) {
      const iter = this.processedMessageIds.values()
      for (let i = 0; i < 100; i++) {
        const item = iter.next().value
        if (item) this.processedMessageIds.delete(item)
      }
    }

    networkSyncBuffer.recordPacketIn(100)

    if (this.onMessageCallback) {
      this.onMessageCallback(msg)
    }
  }

  /**
   * Deeply sanitizes messages to Plain Old JavaScript Objects (POJO)
   * eliminating Vue reactive Proxies, non-cloneable objects and circular references.
   */
  private sanitizeMessage<T>(data: T): T {
    try {
      return JSON.parse(JSON.stringify(data))
    } catch {
      return data
    }
  }

  /**
   * Broadcasts message to all clients (Host) or sends to all tabs
   */
  public broadcast(rawMsg: NetMessage) {
    const msg = this.sanitizeMessage(rawMsg)
    if (!msg.senderId) msg.senderId = this.myPeerId
    if (!msg.timestamp) msg.timestamp = Date.now()
    if (msg.seq === undefined) msg.seq = ++this.outgoingSeq

    // 1. Send via WebRTC to all connected peer clients
    for (const [_, conn] of this.clientConnections.entries()) {
      if (conn && conn.open) {
        try {
          conn.send(msg)
        } catch (e) {
          console.warn('[P2P Broadcast Send Error]:', e)
        }
      }
    }

    // 2. Send via BroadcastChannel for multi-tab
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(msg)
      } catch (e) {
        console.warn('[BroadcastChannel Send Error]:', e)
      }
    }

    networkSyncBuffer.recordPacketOut(100)
  }

  /**
   * Sends message from client to host
   */
  public sendToHost(rawMsg: NetMessage) {
    const msg = this.sanitizeMessage(rawMsg)
    if (!msg.senderId) msg.senderId = this.myPeerId
    if (!msg.timestamp) msg.timestamp = Date.now()
    if (msg.seq === undefined) msg.seq = ++this.outgoingSeq

    // 1. Send via WebRTC
    if (this.hostConnection && this.hostConnection.open) {
      try {
        this.hostConnection.send(msg)
      } catch (e) {
        console.warn('[P2P Send to Host Error]:', e)
      }
    }

    // 2. Also send via BroadcastChannel
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage(msg)
      } catch (e) {
        console.warn('[BroadcastChannel Send to Host Error]:', e)
      }
    }

    networkSyncBuffer.recordPacketOut(100)
  }

  public disconnect() {
    this.stopDiscoveryBeacon()
    this.processedMessageIds.clear()

    for (const conn of this.clientConnections.values()) {
      try {
        conn.close()
      } catch {}
    }
    this.clientConnections.clear()

    if (this.hostConnection) {
      try {
        this.hostConnection.close()
      } catch {}
      this.hostConnection = null
    }

    if (this.peer) {
      // Drop the reference first: destroy() emits 'disconnected', which must not trigger a reconnect
      const peer = this.peer
      this.peer = null
      try {
        peer.destroy()
      } catch {}
    }

    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.close()
      } catch {}
      this.broadcastChannel = null
    }

    this.isHost = false
    this.roomId = ''
    this.myPeerId = ''
  }

  public getIsHost(): boolean {
    return this.isHost
  }
}

export const networkService = new NetworkService()
