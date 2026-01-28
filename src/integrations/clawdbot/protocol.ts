// Clawdbot Gateway Protocol v3 types

// Frame types
export interface RequestFrame {
  type: 'req'
  id: string
  method: string
  params?: unknown
}

export interface ResponseFrame {
  type: 'res'
  id: string
  ok: boolean
  payload?: unknown
  error?: { code: string; message: string }
}

export interface EventFrame {
  type: 'event'
  event: string
  payload?: unknown
  seq?: number
  stateVersion?: { presence: number; health: number }
}

export type GatewayFrame = RequestFrame | ResponseFrame | EventFrame

// Connection
export interface ClientInfo {
  id: string
  displayName: string
  version: string
  platform: string
  mode: 'ui' | 'cli' | 'bot'
}

export interface ConnectParams {
  minProtocol: 3
  maxProtocol: 3
  client: ClientInfo
  auth?: { token?: string }
}

export interface HelloOk {
  type: 'hello-ok'
  protocol: number
  snapshot: {
    presence: PresenceEntry[]
    health: unknown
    stateVersion: { presence: number; health: number }
  }
  features: { methods: string[]; events: string[] }
}

export interface PresenceEntry {
  key: string
  client: ClientInfo
  connectedAt: number
}

// Chat events
// Note: gateway sends cumulative message content with each delta, not incremental chars
export interface ChatEvent {
  runId: string
  sessionKey: string
  seq: number
  state: 'delta' | 'final' | 'aborted' | 'error'
  message?: unknown
  errorMessage?: string
  usage?: {
    inputTokens?: number
    outputTokens?: number
  }
  stopReason?: string
}

// Agent events
export interface AgentEvent {
  runId: string
  seq: number
  stream: string
  ts: number
  data: Record<string, unknown>
  sessionKey?: string
}

// Sessions
export interface SessionsListParams {
  limit?: number
  activeMinutes?: number
  includeLastMessage?: boolean
  agentId?: string
}

export interface SessionInfo {
  key: string
  agentId: string
  createdAt: number
  lastActivityAt: number
  messageCount: number
  lastMessage?: unknown
}

// App-level types
export interface MonitorSession {
  key: string
  agentId: string
  platform: string
  recipient: string
  isGroup: boolean
  lastActivityAt: number
  status: 'idle' | 'active' | 'thinking'
}

export interface MonitorAction {
  id: string
  runId: string
  sessionKey: string
  seq: number
  type: 'start' | 'streaming' | 'complete' | 'aborted' | 'error' | 'tool_call' | 'tool_result'
  eventType: 'chat' | 'agent' | 'system'
  timestamp: number
  content?: string
  toolName?: string
  toolArgs?: unknown
  // Metadata from lifecycle/chat events
  startedAt?: number
  endedAt?: number
  duration?: number
  inputTokens?: number
  outputTokens?: number
  stopReason?: string
}

// Utility functions
export function parseSessionKey(key: string): {
  agentId: string
  platform: string
  recipient: string
  isGroup: boolean
} {
  // Format: "agent:main:discord:channel:1234567890"
  // Or: "agent:main:telegram:group:12345"
  // Or: "agent:main:whatsapp:+1234567890"
  const parts = key.split(':')
  const agentId = parts[1] || 'unknown'
  const platform = parts[2] || 'unknown'
  // Check if 4th part indicates a type (channel, group, dm, etc)
  const hasType = ['channel', 'group', 'dm', 'thread'].includes(parts[3] || '')
  const isGroup = parts[3] === 'group' || parts[3] === 'channel'
  const recipient = hasType ? parts.slice(3).join(':') : parts.slice(3).join(':')

  return { agentId, platform, recipient, isGroup }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createConnectParams(token?: string): any {
  return {
    minProtocol: 3,
    maxProtocol: 3,
    client: {
      id: 'cli',
      version: '0.1.0',
      platform: 'linux',
      mode: 'cli',
    },
    role: 'operator',
    scopes: ['operator.read'],
    caps: [],
    commands: [],
    permissions: {},
    locale: 'en-US',
    userAgent: 'crabwalk-monitor/0.1.0',
    auth: token ? { token } : undefined,
  }
}
