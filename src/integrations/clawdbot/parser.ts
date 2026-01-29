import type {
  EventFrame,
  ChatEvent,
  AgentEvent,
  ExecStartedEvent,
  ExecOutputEvent,
  ExecCompletedEvent,
  MonitorSession,
  MonitorAction,
  MonitorExecEvent,
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
    spawnedBy: info.spawnedBy,
  }
}

export function chatEventToAction(event: ChatEvent): MonitorAction {
  // Map chat state to new action types
  let type: MonitorAction['type'] = 'streaming'
  if (event.state === 'final') type = 'complete'
  else if (event.state === 'delta') type = 'streaming'
  else if (event.state === 'aborted') type = 'aborted'
  else if (event.state === 'error') type = 'error'

  const action: MonitorAction = {
    id: `${event.runId}-${event.seq}`,
    runId: event.runId,
    sessionKey: event.sessionKey,
    seq: event.seq,
    type,
    eventType: 'chat',
    timestamp: Date.now(),
  }

  // Extract usage/stopReason from final events
  if (event.state === 'final') {
    if (event.usage) {
      action.inputTokens = event.usage.inputTokens
      action.outputTokens = event.usage.outputTokens
    }
    if (event.stopReason) {
      action.stopReason = event.stopReason
    }
  }

  if (event.message) {
    if (typeof event.message === 'string') {
      action.content = event.message
    } else if (typeof event.message === 'object') {
      const msg = event.message as Record<string, unknown>

      // Extract text from content blocks: [{type: 'text', text: '...'}]
      if (Array.isArray(msg.content)) {
        const texts: string[] = []
        for (const block of msg.content) {
          if (typeof block === 'object' && block) {
            const b = block as Record<string, unknown>
            if (b.type === 'text' && typeof b.text === 'string') {
              texts.push(b.text)
            } else if (b.type === 'tool_use') {
              action.type = 'tool_call'
              action.toolName = String(b.name || 'unknown')
              action.toolArgs = b.input
            } else if (b.type === 'tool_result') {
              action.type = 'tool_result'
              if (typeof b.content === 'string') {
                texts.push(b.content)
              }
            }
          }
        }
        if (texts.length > 0) {
          action.content = texts.join('')
        }
      } else if (typeof msg.content === 'string') {
        action.content = msg.content
      } else if (typeof msg.text === 'string') {
        action.content = msg.text
      }
    }
  }

  if (event.errorMessage) {
    action.content = event.errorMessage
  }

  return action
}

export function agentEventToAction(event: AgentEvent): MonitorAction {
  const data = event.data

  let type: MonitorAction['type'] = 'streaming'
  let content: string | undefined
  let toolName: string | undefined
  let toolArgs: unknown | undefined
  let startedAt: number | undefined
  let endedAt: number | undefined

  // Handle lifecycle events
  if (event.stream === 'lifecycle') {
    if (data.phase === 'start') {
      type = 'start'
      // No placeholder content - will show "Run Started" label from UI
      startedAt = typeof data.startedAt === 'number' ? data.startedAt : event.ts
    } else if (data.phase === 'end') {
      type = 'complete'
      // No placeholder content - preserve streamed content from assistant events
      endedAt = typeof data.endedAt === 'number' ? data.endedAt : event.ts
    }
  } else if (data.type === 'tool_use') {
    type = 'tool_call'
    toolName = String(data.name || 'unknown')
    toolArgs = data.input
    content = `Tool: ${toolName}`
  } else if (data.type === 'tool_result') {
    type = 'tool_result'
    content = String(data.content || '')
  } else if (data.type === 'text' || typeof data.text === 'string') {
    // Handle both { type: 'text', text: '...' } and assistant stream { text: '...', delta: '...' }
    type = 'streaming'
    content = String(data.text || '')
  }

  return {
    id: `${event.runId}-${event.seq}`,
    runId: event.runId,
    // Use sessionKey from event if available, fallback to stream
    sessionKey: event.sessionKey || event.stream,
    seq: event.seq,
    type,
    eventType: 'agent' as const,
    timestamp: event.ts,
    content,
    toolName,
    toolArgs,
    startedAt,
    endedAt,
  }
}

export function parseEventFrame(
  frame: EventFrame
): {
  session?: Partial<MonitorSession>
  action?: MonitorAction
  execEvent?: MonitorExecEvent
} | null {
  // Skip system events
  if (frame.event === 'health' || frame.event === 'tick') {
    return null
  }

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

    // Process lifecycle events (start/end markers)
    if (agentEvent.stream === 'lifecycle') {
      return {
        action: agentEventToAction(agentEvent),
        session: agentEvent.sessionKey ? {
          key: agentEvent.sessionKey,
          status: agentEvent.data?.phase === 'start' ? 'thinking' : 'active',
          lastActivityAt: Date.now(),
        } : undefined,
      }
    }

    // Process assistant stream for streaming content
    // Assistant events have { text: "cumulative", delta: "incremental" } structure
    if (agentEvent.stream === 'assistant' && typeof agentEvent.data?.text === 'string') {
      return {
        action: agentEventToAction(agentEvent),
        session: agentEvent.sessionKey ? {
          key: agentEvent.sessionKey,
          status: 'thinking',
          lastActivityAt: Date.now(),
        } : undefined,
      }
    }

    // Process tool events (tool_use, tool_result)
    if (agentEvent.data?.type === 'tool_use' || agentEvent.data?.type === 'tool_result') {
      return {
        action: agentEventToAction(agentEvent),
        session: agentEvent.sessionKey ? {
          key: agentEvent.sessionKey,
          status: 'thinking',
          lastActivityAt: Date.now(),
        } : undefined,
      }
    }

    return null
  }

  if (frame.event === 'exec.started' && frame.payload) {
    const exec = frame.payload as ExecStartedEvent
    const execId = `exec-${exec.runId}-${exec.pid}`
    const timestamp = Date.now()
    const id = frame.seq != null
      ? `${execId}-started-${frame.seq}`
      : `${execId}-started-${timestamp}`

    return {
      execEvent: {
        id,
        execId,
        runId: exec.runId,
        pid: exec.pid,
        sessionId: exec.sessionId,
        eventType: 'started',
        command: exec.command,
        startedAt: exec.startedAt,
        timestamp,
      },
      session: exec.sessionId
        ? {
            key: exec.sessionId,
            status: 'thinking',
            lastActivityAt: timestamp,
          }
        : undefined,
    }
  }

  if (frame.event === 'exec.output' && frame.payload) {
    const exec = frame.payload as ExecOutputEvent
    const execId = `exec-${exec.runId}-${exec.pid}`
    const timestamp = Date.now()
    const id = frame.seq != null
      ? `${execId}-output-${frame.seq}`
      : `${execId}-output-${timestamp}`

    return {
      execEvent: {
        id,
        execId,
        runId: exec.runId,
        pid: exec.pid,
        sessionId: exec.sessionId,
        eventType: 'output',
        stream: exec.stream,
        output: exec.output,
        timestamp,
      },
      session: exec.sessionId
        ? {
            key: exec.sessionId,
            lastActivityAt: timestamp,
          }
        : undefined,
    }
  }

  if (frame.event === 'exec.completed' && frame.payload) {
    const exec = frame.payload as ExecCompletedEvent
    const execId = `exec-${exec.runId}-${exec.pid}`
    const timestamp = Date.now()
    const id = frame.seq != null
      ? `${execId}-completed-${frame.seq}`
      : `${execId}-completed-${timestamp}`

    return {
      execEvent: {
        id,
        execId,
        runId: exec.runId,
        pid: exec.pid,
        sessionId: exec.sessionId,
        eventType: 'completed',
        durationMs: exec.durationMs,
        exitCode: exec.exitCode,
        status: exec.status,
        timestamp,
      },
      session: exec.sessionId
        ? {
            key: exec.sessionId,
            status: 'active',
            lastActivityAt: timestamp,
          }
        : undefined,
    }
  }

  return null
}
