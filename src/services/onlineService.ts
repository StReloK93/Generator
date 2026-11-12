import { SERVER_URL } from './serverUrl'

/** Waits before reconnecting grow up to this (seconds) */
const MAX_RETRY_SEC = 30

/**
 * The socket to the server's online room (server/online.js): who is online and the chat for all of them.
 * Keeps itself connected (reconnects with a growing wait) and says hello again after every reconnect.
 */
class OnlineService {
  private socket: WebSocket | null = null
  private retry = 0
  private hello: (() => Record<string, unknown>) | null = null
  private onMessage: ((data: any) => void) | null = null
  private onConnection: ((connected: boolean) => void) | null = null

  /** Starts the connection. `hello`: what is sent first on every (re)connect. */
  start(options: { hello: () => Record<string, unknown>; onMessage: (data: any) => void; onConnection: (connected: boolean) => void }): void {
    if (typeof WebSocket === 'undefined' || this.hello) return
    this.hello = options.hello
    this.onMessage = options.onMessage
    this.onConnection = options.onConnection
    this.connect()
  }

  send(data: Record<string, unknown>): void {
    if (this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(data))
  }

  private connect(): void {
    const url = `${SERVER_URL.protocol === 'https:' ? 'wss' : 'ws'}://${SERVER_URL.host}/online`
    const socket = new WebSocket(url)
    this.socket = socket
    socket.onopen = () => {
      this.retry = 0
      if (this.hello) socket.send(JSON.stringify(this.hello()))
      this.onConnection?.(true)
    }
    socket.onmessage = event => {
      try {
        this.onMessage?.(JSON.parse(String(event.data)))
      } catch {
        // Not ours
      }
    }
    socket.onclose = () => {
      if (this.socket !== socket) return
      this.socket = null
      this.onConnection?.(false)
      const wait = Math.min(MAX_RETRY_SEC, 2 ** this.retry++)
      window.setTimeout(() => this.connect(), wait * 1000)
    }
  }
}

export const onlineService = new OnlineService()
