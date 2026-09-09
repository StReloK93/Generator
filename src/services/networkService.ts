import Peer, { DataConnection } from 'peerjs'
import { NetMessage, ActiveRoomSummary } from '../types/multiplayer'
import { networkSyncBuffer } from './networkSync'

class NetworkService {
  private peer: Peer | null = null
  private hostConnection: DataConnection | null = null
  private clientConnections: Map<string, DataConnection> = new Map()
  private broadcastChannel: BroadcastChannel | null = null
  private discoveryChannel: BroadcastChannel | null = null
  private discoveryInterval: any = null
  private processedMessageIds: Set<string> = new Set()
  private isHost = false
  private roomId = ''
  private myPeerId = ''

  private onMessageCallback: ((msg: NetMessage) => void) | null = null
  private onPeerConnectCallback: ((peerId: string) => void) | null = null
  private onPeerDisconnectCallback: ((peerId: string) => void) | null = null
  private onHostConnectCallback: (() => void) | null = null
  private onHostDisconnectCallback: (() => void) | null = null

  // Active rooms discovery cache
  private discoveredRooms: Map<string, ActiveRoomSummary> = new Map()
  private onDiscoveryUpdateCallback: ((rooms: ActiveRoomSummary[]) => void) | null = null

  constructor() {
    this.initGlobalDiscoveryListener()
  }

  /**
   * Initializes host P2P server node
   */
  public async initHost(
    roomId: string,
    onMessage: (msg: NetMessage) => void,
    onPeerConnect: (peerId: string) => void,
    onPeerDisconnect: (peerId: string) => void
  ): Promise<string> {
    this.disconnect()
    this.isHost = true
    this.roomId = roomId
    this.onMessageCallback = onMessage
    this.onPeerConnectCallback = onPeerConnect
    this.onPeerDisconnectCallback = onPeerDisconnect

    // BroadcastChannel for instant local tab testing
    this.initBroadcastChannel(roomId)

    return new Promise((resolve) => {
      const formattedHostPeerId = `isocraft-host-${roomId.toLowerCase()}`
      this.myPeerId = formattedHostPeerId

      try {
        this.peer = new Peer(formattedHostPeerId, {
          debug: 1,
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:global.stun.twilio.com:3478' }
            ]
          }
        })

        this.peer.on('open', (id) => {
          console.log(`[P2P Host] Registered with ID: ${id}`)
          resolve(id)
        })

        this.peer.on('connection', (conn) => {
          this.handleIncomingClientConnection(conn)
        })

        this.peer.on('error', (err: any) => {
          console.warn('[P2P Host Error]:', err)
          resolve(formattedHostPeerId)
        })
      } catch (e) {
        console.warn('[P2P Host Init Fallback]:', e)
        resolve(formattedHostPeerId)
      }
    })
  }

  /**
   * Starts periodic discovery beacon advertising this room to other tabs/browsers/LAN
   */
  public startDiscoveryBeacon(summaryProvider: () => ActiveRoomSummary) {
    this.stopDiscoveryBeacon()

    const broadcastBeacon = () => {
      try {
        const summary = summaryProvider()
        summary.lastHeartbeat = Date.now()

        // 1. Broadcast via Discovery Channel (Same browser multi-tab)
        if (this.discoveryChannel) {
          try {
            this.discoveryChannel.postMessage({
              type: 'ROOM_HEARTBEAT',
              payload: summary,
            })
          } catch {}
        }

        // 2. Write to LocalStorage (Instant cross-tab discovery)
        let activeMap: Record<string, ActiveRoomSummary> = {}
        try {
          activeMap = JSON.parse(localStorage.getItem('isocraft_active_rooms') || '{}')
        } catch {}
        
        activeMap[summary.roomId] = summary

        // Prune stale rooms (> 12 seconds without heartbeat)
        const now = Date.now()
        for (const [rId, room] of Object.entries(activeMap)) {
          if (!room || now - (room.lastHeartbeat || 0) > 12000) {
            delete activeMap[rId]
          }
        }
        localStorage.setItem('isocraft_active_rooms', JSON.stringify(activeMap))
      } catch (e) {
        console.warn('[Discovery Beacon Error]:', e)
      }
    }

    broadcastBeacon()
    this.discoveryInterval = setInterval(broadcastBeacon, 1000)
  }

  public stopDiscoveryBeacon() {
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval)
      this.discoveryInterval = null
    }
    if (this.roomId) {
      try {
        const activeMap: Record<string, ActiveRoomSummary> = JSON.parse(
          localStorage.getItem('isocraft_active_rooms') || '{}'
        )
        delete activeMap[this.roomId]
        localStorage.setItem('isocraft_active_rooms', JSON.stringify(activeMap))
      } catch {}
    }
  }

  /**
   * Global discovery listener for available games
   */
  private initGlobalDiscoveryListener() {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.discoveryChannel = new BroadcastChannel('isocraft_discovery_channel')
        this.discoveryChannel.onmessage = (event) => {
          if (event.data && event.data.type === 'ROOM_HEARTBEAT') {
            const summary = event.data.payload as ActiveRoomSummary
            if (summary && summary.roomId) {
              summary.lastHeartbeat = Date.now()
              this.discoveredRooms.set(summary.roomId, summary)
              this.notifyDiscoveryUpdate()
            }
          }
        }
      } catch (e) {
        console.warn('[Discovery Channel Init Error]:', e)
      }
    }

    // Cross-tab window storage event listener (instant 0ms cross-tab sync)
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key === 'isocraft_active_rooms') {
          this.syncFromLocalStorage()
        }
      })
    }

    // Periodic fast check to prune expired rooms
    setInterval(() => {
      this.syncFromLocalStorage()
    }, 1000)
  }

  public async syncAllDiscoverySources(): Promise<ActiveRoomSummary[]> {
    return this.syncFromLocalStorage()
  }

  public syncFromLocalStorage(): ActiveRoomSummary[] {
    const now = Date.now()
    try {
      const activeMap: Record<string, ActiveRoomSummary> = JSON.parse(
        localStorage.getItem('isocraft_active_rooms') || '{}'
      )
      for (const [rId, room] of Object.entries(activeMap)) {
        if (room && now - (room.lastHeartbeat || 0) <= 12000) {
          this.discoveredRooms.set(rId, room)
        } else {
          this.discoveredRooms.delete(rId)
        }
      }
    } catch {}

    for (const [rId, room] of this.discoveredRooms.entries()) {
      if (!room || now - (room.lastHeartbeat || 0) > 12000) {
        this.discoveredRooms.delete(rId)
      }
    }

    const list = Array.from(this.discoveredRooms.values())
    this.notifyDiscoveryUpdate()
    return list
  }

  public listenToDiscovery(callback: (rooms: ActiveRoomSummary[]) => void): () => void {
    this.onDiscoveryUpdateCallback = callback
    this.syncAllDiscoverySources().then((list) => {
      callback(list)
    })

    return () => {
      if (this.onDiscoveryUpdateCallback === callback) {
        this.onDiscoveryUpdateCallback = null
      }
    }
  }

  private notifyDiscoveryUpdate() {
    if (this.onDiscoveryUpdateCallback) {
      this.onDiscoveryUpdateCallback(Array.from(this.discoveredRooms.values()))
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

    return new Promise((resolve) => {
      const hostPeerId = `isocraft-host-${roomId.toLowerCase()}`
      let connected = false

      try {
        this.peer = new Peer({
          debug: 1,
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:global.stun.twilio.com:3478' }
            ]
          }
        })

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
      try {
        this.peer.destroy()
      } catch {}
      this.peer = null
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
