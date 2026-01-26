import type {
  EventFrame,
  ChatEvent,
  AgentEvent,
  MonitorSession,
  MonitorAction,
  SessionInfo,
} from './protocol'
import { parseSessionKey } from './protocol'

export function sessionInfoToMonitor(info: SessionInfo): MonitorSession {
  const parsed = parseSessionKey(info.key)
  return {
    key: info.key,
    agentId: parsed.agentId,
    platform: parsed.platform,
    recipient: parsed.recipient,
    isGroup: parsed.isGroup,
    lastActivityAt: info.lastActivityAt,
    status: 'idle',
  }
}

export function chatEventToAction(event: ChatEvent): MonitorAction {
  // Debug: log event structure
  console.log('[parser] chat event:', JSON.stringify(event, null, 2))

  const action: MonitorAction = {
    id: `${event.runId}-${event.seq}`,
    runId: event.runId,
    sessionKey: event.sessionKey,
    seq: event.seq,
    type: event.state,
    timestamp: Date.now(),
  }

  if (event.message) {
    if (typeof event.message === 'string') {
      action.content = event.message
    } else if (typeof event.message === 'object') {
      const msg = event.message as Record<string, unknown>

      // Try to extract text content from various message formats
      if (typeof msg.content === 'string') {
        action.content = msg.content
      } else if (Array.isArray(msg.content)) {
        // Content blocks format: [{type: 'text', text: '...'}]
        const textBlocks = msg.content
          .filter((b: unknown) => typeof b === 'object' && b && (b as Record<string, unknown>).type === 'text')
          .map((b: unknown) => (b as Record<string, unknown>).text)
          .join('')
        action.content = textBlocks || undefined
      } else if (typeof msg.text === 'string') {
        action.content = msg.text
      }

      // Check for tool calls
      if (msg.tool_calls && Array.isArray(msg.tool_calls)) {
        const tc = msg.tool_calls[0] as Record<string, unknown>
        if (tc) {
          action.type = 'tool_call'
          action.toolName = String(tc.name || 'unknown')
          action.toolArgs = tc.arguments
        }
      }

      // Check for tool_use in content blocks
      if (Array.isArray(msg.content)) {
        const toolUse = msg.content.find(
          (b: unknown) => typeof b === 'object' && b && (b as Record<string, unknown>).type === 'tool_use'
        ) as Record<string, unknown> | undefined
        if (toolUse) {
          action.type = 'tool_call'
          action.toolName = String(toolUse.name || 'unknown')
          action.toolArgs = toolUse.input
          action.content = `Tool: ${action.toolName}`
        }
      }
    }
  }

  if (event.errorMessage) {
    action.content = event.errorMessage
  }

  // Parent is previous seq in same run
  if (event.seq > 0) {
    action.parentId = `${event.runId}-${event.seq - 1}`
  }

  return action
}

export function agentEventToAction(event: AgentEvent): MonitorAction {
  const data = event.data

  let type: MonitorAction['type'] = 'delta'
  let content: string | undefined
  let toolName: string | undefined
  let toolArgs: unknown | undefined

  if (data.type === 'tool_use') {
    type = 'tool_call'
    toolName = String(data.name || 'unknown')
    toolArgs = data.input
    content = `Tool: ${toolName}`
  } else if (data.type === 'tool_result') {
    type = 'tool_result'
    content = String(data.content || '')
  } else if (data.type === 'text') {
    type = 'delta'
    content = String(data.text || '')
  }

  return {
    id: `${event.runId}-${event.seq}`,
    runId: event.runId,
    sessionKey: event.stream,
    seq: event.seq,
    type,
    timestamp: event.ts,
    content,
    toolName,
    toolArgs,
    parentId: event.seq > 0 ? `${event.runId}-${event.seq - 1}` : undefined,
  }
}

export function parseEventFrame(
  frame: EventFrame
): { session?: Partial<MonitorSession>; action?: MonitorAction } | null {
  if (frame.event === 'chat' && frame.payload) {
    const chatEvent = frame.payload as ChatEvent
    return {
      action: chatEventToAction(chatEvent),
      session: {
        key: chatEvent.sessionKey,
        status: chatEvent.state === 'delta' ? 'thinking' : 'active',
        lastActivityAt: Date.now(),
      },
    }
  }

  if (frame.event === 'agent' && frame.payload) {
    const agentEvent = frame.payload as AgentEvent
    return {
      action: agentEventToAction(agentEvent),
    }
  }

  return null
}
