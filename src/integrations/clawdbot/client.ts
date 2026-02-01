import WebSocket from 'ws'
import {
  type GatewayFrame,
  type RequestFrame,
  type ResponseFrame,
  type EventFrame,
  type HelloOk,
  type ChatEvent,
  type AgentEvent,
  type SessionInfo,
  type SessionsListParams,
  createConnectParams,
} from './protocol'

interface ChallengePayload {
  nonce: string
  ts: number
}

type EventCallback = (event: EventFrame) => void

export class ClawdbotClient {
  private ws: WebSocket | null = null
  private requestId = 0
  private pendingRequests = new Map<
    string,
    { resolve: (v: unknown) => void; reject: (e: Error) => void }
  >()
  private eventListeners: EventCallback[] = []
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private _connected = false
  private _connecting = false

  constructor(
    private _url: string = 'ws://127.0.0.1:18789',
    private token?: string
  ) {}

  get url(): string {
    return this._url
  }

  setUrl(url: string): void {
    // Disconnect if connected before changing URL
    if (this._connected || this._connecting) {
      this.disconnect()
      this._connecting = false
    }
    this._url = url
  }

  get connected() {
    return this._connected
  }

  async connect(): Promise<HelloOk> {
    if (this._connecting || this._connected) {
      return { type: 'hello-ok', protocol: 3 } as HelloOk
    }
    this._connecting = true
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this._connecting = false
        this.ws?.close()
        reject(new Error('Connection timeout - is clawdbot gateway running?'))
      }, 10000)

      try {
        this.ws = new WebSocket(this.url)
      } catch (e) {
        clearTimeout(timeout)
        reject(new Error(`Failed to create WebSocket: ${e}`))
        return
      }

      this.ws.once('open', () => {
        // WebSocket connected, waiting for challenge
      })

      this.ws.on('message', (data) => {
        try {
          const raw = data.toString()
          const msg = JSON.parse(raw)

          // Handle challenge-response auth
          if (msg.type === 'event' && msg.event === 'connect.challenge') {
            this.handleChallenge(msg.payload as ChallengePayload)
            return
          }

          this.handleMessage(msg, resolve, reject, timeout)
        } catch (e) {
          console.error('[clawdbot] Failed to parse message:', e)
        }
      })

      this.ws.on('error', (err) => {
        clearTimeout(timeout)
        this._connecting = false
        reject(err)
      })

      this.ws.on('close', (code, _reason) => {
        clearTimeout(timeout)
        const wasConnected = this._connected
        this._connected = false
        this._connecting = false
        // Only reconnect if we were previously connected and it wasn't a clean close
        if (wasConnected && code !== 1000) {
          this.scheduleReconnect()
        }
      })
    })
  }

  private handleChallenge(_challenge: ChallengePayload) {
    if (!this.token || this.ws?.readyState !== WebSocket.OPEN) {
      return
    }

    const params = createConnectParams(this.token)
    const response: RequestFrame = {
      type: 'req',
      id: `connect-${Date.now()}`,
      method: 'connect',
      params,
    }

    this.ws.send(JSON.stringify(response))
  }

  private handleMessage(
    msg: GatewayFrame | HelloOk,
    connectResolve?: (v: HelloOk) => void,
    _connectReject?: (e: Error) => void,
    connectTimeout?: ReturnType<typeof setTimeout>
  ) {
    if ('type' in msg) {
      switch (msg.type) {
        case 'hello-ok':
          if (connectTimeout) clearTimeout(connectTimeout)
          this._connected = true
          connectResolve?.(msg)
          break

        case 'res':
          // Check if this is the hello-ok response to our connect request
          if (msg.ok && (msg.payload as HelloOk)?.type === 'hello-ok') {
            if (connectTimeout) clearTimeout(connectTimeout)
            this._connected = true
            this._connecting = false
            connectResolve?.(msg.payload as HelloOk)
          } else {
            this.handleResponse(msg)
          }
          break

        case 'event':
          this.handleEvent(msg)
          break

        case 'req':
          // Server shouldn't send requests to us
          break
      }
    }
  }

  private handleResponse(res: ResponseFrame) {
    const pending = this.pendingRequests.get(res.id)
    if (pending) {
      this.pendingRequests.delete(res.id)
      if (res.ok) {
        pending.resolve(res.payload)
      } else {
        pending.reject(new Error(res.error?.message || 'Request failed'))
      }
    }
  }

  private handleEvent(event: EventFrame) {
    for (const listener of this.eventListeners) {
      try {
        listener(event)
      } catch (e) {
        console.error('Event listener error:', e)
      }
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect().catch(console.error)
    }, 5000)
  }

  async request<T>(method: string, params?: unknown): Promise<T> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('Not connected')
    }

    const id = `req-${++this.requestId}`
    const req: RequestFrame = { type: 'req', id, method, params }

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, {
        resolve: resolve as (v: unknown) => void,
        reject,
      })
      this.ws!.send(JSON.stringify(req))

      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id)
          reject(new Error('Request timeout'))
        }
      }, 30000)
    })
  }

  onEvent(callback: EventCallback): () => void {
    this.eventListeners.push(callback)
    return () => {
      const idx = this.eventListeners.indexOf(callback)
      if (idx >= 0) this.eventListeners.splice(idx, 1)
    }
  }

  async listSessions(params?: SessionsListParams): Promise<SessionInfo[]> {
    const result = await this.request<{ sessions: SessionInfo[] }>(
      'sessions.list',
      params
    )
    return result.sessions ?? []
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    this._connected = false
  }
}

// Default gateway URL (openclaw default)
const DEFAULT_GATEWAY_URL = 'ws://127.0.0.1:18789'

// Singleton instance for server use
let clientInstance: ClawdbotClient | null = null

export function getDefaultGatewayUrl(): string {
  return process.env.CLAWDBOT_URL || DEFAULT_GATEWAY_URL
}

export function getClawdbotClient(): ClawdbotClient {
  if (!clientInstance) {
    const url = getDefaultGatewayUrl()
    const token = process.env.CLAWDBOT_API_TOKEN
    clientInstance = new ClawdbotClient(url, token)
  }
  return clientInstance
}

export function resetClawdbotClient(): void {
  if (clientInstance) {
    clientInstance.disconnect()
    clientInstance = null
  }
}

export function setClawdbotClientUrl(url: string): void {
  // If client exists and is connected, disconnect and reset to ensure clean state
  if (clientInstance) {
    if (clientInstance.connected) {
      clientInstance.disconnect()
    }
    // Reset the singleton so a new client is created with the new URL
    // This ensures no stale state from previous connections
    clientInstance = null
  }
  // Create new client with the new URL
  const token = process.env.CLAWDBOT_API_TOKEN
  clientInstance = new ClawdbotClient(url, token)
}

export function getClawdbotClientUrl(): string {
  return getClawdbotClient().url
}

// Parsed event helpers
export function isChatEvent(
  event: EventFrame
): event is EventFrame & { payload: ChatEvent } {
  return event.event === 'chat' && event.payload != null
}

export function isAgentEvent(
  event: EventFrame
): event is EventFrame & { payload: AgentEvent } {
  return event.event === 'agent' && event.payload != null
}
