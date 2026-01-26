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
    private url: string = 'ws://127.0.0.1:18789',
    private token?: string
  ) {}

  get connected() {
    return this._connected
  }

  async connect(): Promise<HelloOk> {
    if (this._connecting) {
      throw new Error('Connection already in progress')
    }
    if (this._connected) {
      throw new Error('Already connected')
    }
    this._connecting = true
    console.log('[clawdbot] Connecting to', this.url)
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.log('[clawdbot] Connection timeout')
        this._connecting = false
        this.ws?.close()
        reject(new Error('Connection timeout - is clawdbot gateway running?'))
      }, 10000)

      try {
        this.ws = new WebSocket(this.url)
      } catch (e) {
        console.log('[clawdbot] Failed to create WebSocket:', e)
        clearTimeout(timeout)
        reject(new Error(`Failed to create WebSocket: ${e}`))
        return
      }

      this.ws.once('open', () => {
        console.log('[clawdbot] WebSocket open, waiting for challenge...')
      })

      this.ws.on('message', (data) => {
        try {
          const raw = data.toString()
          const msg = JSON.parse(raw)
          // Only log non-tick events to reduce noise
          if (msg.event !== 'tick' && msg.event !== 'health') {
            console.log('[clawdbot] Received:', msg.type || 'unknown', msg.event || '')
          }

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
        console.error('[clawdbot] WebSocket error:', err)
        reject(err)
      })

      this.ws.on('close', (code, reason) => {
        clearTimeout(timeout)
        console.log('[clawdbot] WebSocket closed:', code, reason?.toString())
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
    if (!this.token) {
      console.error('[clawdbot] No token for challenge response')
      return
    }

    if (this.ws?.readyState !== WebSocket.OPEN) {
      console.error('[clawdbot] WebSocket not open for challenge response')
      return
    }

    // Local connection - try without device, just auth token
    const params = createConnectParams(this.token)
    const response: RequestFrame = {
      type: 'req',
      id: `connect-${Date.now()}`,
      method: 'connect',
      params,
    }

    console.log('[clawdbot] Sending challenge response:', JSON.stringify(response).slice(0, 400))
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
            console.log('[clawdbot] Connected successfully!')
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
    return result.sessions
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

// Singleton instance for server use
let clientInstance: ClawdbotClient | null = null

export function getClawdbotClient(): ClawdbotClient {
  if (!clientInstance) {
    const token = process.env.CLAWDBOT_API_TOKEN
    console.log('[clawdbot] Creating client, token:', token ? `${token.slice(0, 8)}...` : 'NOT SET')
    clientInstance = new ClawdbotClient('ws://127.0.0.1:18789', token)
  }
  return clientInstance
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
