import { createCollection, localOnlyCollectionOptions } from '@tanstack/db'
import {
  parseSessionKey,
  type MonitorSession,
  type MonitorAction,
  type MonitorExecEvent,
  type MonitorExecProcess,
  type MonitorExecOutputChunk,
  type MonitorExecProcessStatus,
} from './protocol'

// Track runId → sessionKey mapping (learned from chat events)
const runSessionMap = new Map<string, string>()

// Track recent activity on parent (non-subagent) sessions for spawn inference
// Maps sessionKey → lastActivityTimestamp
const parentSessionActivity = new Map<string, number>()

// Time window for spawn inference - parent must have been active within this window
const SPAWN_INFERENCE_WINDOW_MS = 5000

function isSubagentSession(key: string): boolean {
  return key.includes('subagent')
}

function isParentSession(key: string): boolean {
  return !isSubagentSession(key) && !key.includes('lifecycle')
}

// Infer which parent session spawned this subagent based on recent activity
function inferSpawnedBy(subagentKey: string, timestamp?: number): string | undefined {
  if (!isSubagentSession(subagentKey)) return undefined

  const now = timestamp ?? Date.now()
  let bestParent: string | undefined
  let bestTime = 0

  for (const [parentKey, activityTime] of parentSessionActivity) {
    // Must be within inference window
    if (now - activityTime > SPAWN_INFERENCE_WINDOW_MS) continue
    // Pick most recently active parent
    if (activityTime > bestTime) {
      bestTime = activityTime
      bestParent = parentKey
    }
  }

  return bestParent
}

// Track activity on a parent session
function trackParentActivity(sessionKey: string, timestamp?: number) {
  if (!isParentSession(sessionKey)) return
  parentSessionActivity.set(sessionKey, timestamp ?? Date.now())
}

export const sessionsCollection = createCollection(
  localOnlyCollectionOptions<MonitorSession>({
    id: 'clawdbot-sessions',
    getKey: (item) => item.key,
  })
)

export const actionsCollection = createCollection(
  localOnlyCollectionOptions<MonitorAction>({
    id: 'clawdbot-actions',
    getKey: (item) => item.id,
  })
)

export const execsCollection = createCollection(
  localOnlyCollectionOptions<MonitorExecProcess>({
    id: 'clawdbot-execs',
    getKey: (item) => item.id,
  })
)

const EXEC_PLACEHOLDER_COMMAND = 'Exec'
const MAX_EXEC_OUTPUT_CHUNKS = 200
const MAX_EXEC_OUTPUT_CHARS = 50000
const MAX_EXEC_CHUNK_CHARS = 4000

function resolveSessionKey(event: MonitorExecEvent): string | undefined {
  return event.sessionKey || runSessionMap.get(event.runId) || event.sessionId
}

function backfillExecSessionKey(runId: string, sessionKey: string) {
  for (const exec of execsCollection.state.values()) {
    if (exec.runId !== runId) continue
    if (exec.sessionKey && exec.sessionKey !== exec.sessionId) continue
    execsCollection.update(exec.id, (draft) => {
      draft.sessionKey = sessionKey
    })
  }
}

function mapExecStatus(exitCode?: number, status?: string): MonitorExecProcessStatus {
  if (typeof exitCode === 'number' && exitCode !== 0) return 'failed'
  if (typeof status === 'string') {
    const normalized = status.toLowerCase()
    if (normalized.includes('fail') || normalized.includes('error')) {
      return 'failed'
    }
  }
  return 'completed'
}

function capExecOutputs(outputs: MonitorExecOutputChunk[]): {
  outputs: MonitorExecOutputChunk[]
  truncated: boolean
} {
  let truncated = false
  const normalized: MonitorExecOutputChunk[] = outputs.map((chunk) => {
    if (chunk.text.length <= MAX_EXEC_CHUNK_CHARS) {
      return chunk
    }
    truncated = true
    return {
      ...chunk,
      text: chunk.text.slice(0, MAX_EXEC_CHUNK_CHARS) + '\n...[truncated]',
    }
  })

  let capped = normalized
  if (capped.length > MAX_EXEC_OUTPUT_CHUNKS) {
    truncated = true
    capped = capped.slice(-MAX_EXEC_OUTPUT_CHUNKS)
  }

  let totalChars = capped.reduce((sum, chunk) => sum + chunk.text.length, 0)
  if (totalChars > MAX_EXEC_OUTPUT_CHARS) {
    truncated = true
    const trimmed: MonitorExecOutputChunk[] = []
    for (let i = capped.length - 1; i >= 0; i--) {
      const chunk = capped[i]!
      trimmed.push(chunk)
      totalChars -= chunk.text.length
      if (totalChars <= MAX_EXEC_OUTPUT_CHARS) break
    }
    capped = trimmed.reverse()
  }

  return { outputs: capped, truncated }
}

function createPlaceholderExec(event: MonitorExecEvent, sessionKey?: string): MonitorExecProcess {
  const startedAt = event.startedAt ?? event.timestamp
  return {
    id: event.execId,
    runId: event.runId,
    pid: event.pid,
    command: event.command || EXEC_PLACEHOLDER_COMMAND,
    sessionId: event.sessionId,
    sessionKey,
    status: event.eventType === 'completed'
      ? mapExecStatus(event.exitCode, event.status)
      : 'running',
    startedAt,
    timestamp: startedAt,
    outputs: [],
    lastActivityAt: event.timestamp,
  }
}

// Helper to update or insert session
export function upsertSession(session: MonitorSession) {
  // Track activity on parent sessions
  if (isParentSession(session.key)) {
    trackParentActivity(session.key, session.lastActivityAt)
  }

  const existing = sessionsCollection.state.get(session.key)

  if (existing) {
    // Preserve existing spawnedBy - never overwrite once set
    const preservedSpawnedBy = existing.spawnedBy
    sessionsCollection.update(session.key, (draft) => {
      Object.assign(draft, session)
      if (preservedSpawnedBy) {
        draft.spawnedBy = preservedSpawnedBy
      }
    })
  } else {
    // New session - infer spawnedBy for subagents if not provided
    let spawnedBy = session.spawnedBy
    if (!spawnedBy && isSubagentSession(session.key)) {
      spawnedBy = inferSpawnedBy(session.key, session.lastActivityAt)
    }
    sessionsCollection.insert({
      ...session,
      spawnedBy,
    })
  }
}

// Helper to add or update action
// Aggregation strategy per run:
// - start: one node per runId (appears immediately)
// - streaming: aggregate all deltas into one node (content updates)
// - complete: updates streaming node with final state & metadata
// - tool_call/tool_result: separate nodes
export function addAction(action: MonitorAction) {
  // Learn runId → sessionKey mapping from actions with real session keys
  if (action.sessionKey && !action.sessionKey.includes('lifecycle')) {
    const previous = runSessionMap.get(action.runId)
    runSessionMap.set(action.runId, action.sessionKey)
    if (previous !== action.sessionKey) {
      backfillExecSessionKey(action.runId, action.sessionKey)
    }

    // Track activity on parent sessions for spawn inference
    if (isParentSession(action.sessionKey)) {
      trackParentActivity(action.sessionKey, action.timestamp)
    }
  }

  // Resolve sessionKey: use mapped value if action has lifecycle/invalid key
  let sessionKey = action.sessionKey
  if (!sessionKey || sessionKey === 'lifecycle') {
    sessionKey = runSessionMap.get(action.runId) || sessionKey
  }

  // Handle 'start' type - create dedicated start node
  if (action.type === 'start') {
    const startId = `${action.runId}-start`
    const existing = actionsCollection.state.get(startId)
    if (!existing) {
      actionsCollection.insert({
        ...action,
        id: startId,
        sessionKey,
      })
    }
    return
  }

  // For streaming, aggregate into single node per runId
  if (action.type === 'streaming') {
    const streamingId = `${action.runId}-stream`
    const existing = actionsCollection.state.get(streamingId)
    if (existing) {
      // Replace content (gateway sends cumulative text, not incremental deltas)
      actionsCollection.update(streamingId, (draft) => {
        if (action.content) {
          draft.content = action.content
        }
        draft.seq = action.seq
        draft.timestamp = action.timestamp
        if (sessionKey && sessionKey !== 'lifecycle') {
          draft.sessionKey = sessionKey
        }
      })
    } else {
      // Create new streaming action
      actionsCollection.insert({
        ...action,
        id: streamingId,
        sessionKey,
      })
    }
    return
  }

  // For complete/error/aborted, update the streaming action
  if (action.type === 'complete' || action.type === 'error' || action.type === 'aborted') {
    const streamingId = `${action.runId}-stream`
    const streaming = actionsCollection.state.get(streamingId)
    if (streaming) {
      actionsCollection.update(streamingId, (draft) => {
        draft.type = action.type
        draft.seq = action.seq
        draft.timestamp = action.timestamp
        if (sessionKey && sessionKey !== 'lifecycle') {
          draft.sessionKey = sessionKey
        }
        // Copy metadata from complete event
        if (action.inputTokens !== undefined) draft.inputTokens = action.inputTokens
        if (action.outputTokens !== undefined) draft.outputTokens = action.outputTokens
        if (action.stopReason) draft.stopReason = action.stopReason
        if (action.endedAt) draft.endedAt = action.endedAt
        // Calculate duration if we have both timestamps
        if (draft.startedAt && action.endedAt) {
          draft.duration = action.endedAt - draft.startedAt
        }
      })
      return
    }
    // No streaming action found, create as-is with complete state
    actionsCollection.insert({ ...action, sessionKey, id: `${action.runId}-complete` })
    return
  }

  // For tool_call/tool_result, add as separate nodes
  const existing = actionsCollection.state.get(action.id)
  if (!existing) {
    actionsCollection.insert({ ...action, sessionKey })
  }
}

export function addExecEvent(event: MonitorExecEvent) {
  const sessionKey = resolveSessionKey(event)
  const existing = execsCollection.state.get(event.execId)

  if (event.eventType === 'started') {
    if (existing) {
      execsCollection.update(event.execId, (draft) => {
        draft.command = event.command || draft.command || EXEC_PLACEHOLDER_COMMAND
        draft.sessionId = event.sessionId || draft.sessionId
        draft.sessionKey = sessionKey || draft.sessionKey
        draft.status = 'running'
        draft.startedAt = event.startedAt ?? draft.startedAt ?? event.timestamp
        draft.timestamp = draft.startedAt
        draft.lastActivityAt = event.timestamp
      })
      return
    }

    execsCollection.insert({
      ...createPlaceholderExec(event, sessionKey),
      command: event.command || EXEC_PLACEHOLDER_COMMAND,
      startedAt: event.startedAt ?? event.timestamp,
      timestamp: event.startedAt ?? event.timestamp,
    })
    return
  }

  if (event.eventType === 'output') {
    const stream = event.stream || 'stdout'
    const text = event.output ?? ''
    const chunk: MonitorExecOutputChunk = {
      id: event.id,
      stream,
      text,
      timestamp: event.timestamp,
    }

    if (existing) {
      execsCollection.update(event.execId, (draft) => {
        draft.sessionId = event.sessionId || draft.sessionId
        draft.sessionKey = sessionKey || draft.sessionKey
        draft.lastActivityAt = event.timestamp
        if (text) {
          const capped = capExecOutputs([...draft.outputs, chunk])
          draft.outputs = capped.outputs
          draft.outputTruncated = draft.outputTruncated || capped.truncated
        }
      })
      return
    }

    const placeholder = createPlaceholderExec(event, sessionKey)
    if (text) {
      const capped = capExecOutputs([chunk])
      placeholder.outputs = capped.outputs
      placeholder.outputTruncated = capped.truncated
    }
    execsCollection.insert(placeholder)
    return
  }

  if (event.eventType === 'completed') {
    const completedStatus = mapExecStatus(event.exitCode, event.status)
    if (existing) {
      execsCollection.update(event.execId, (draft) => {
        draft.sessionId = event.sessionId || draft.sessionId
        draft.sessionKey = sessionKey || draft.sessionKey
        draft.command = event.command || draft.command || EXEC_PLACEHOLDER_COMMAND
        draft.exitCode = event.exitCode ?? draft.exitCode
        draft.durationMs = event.durationMs ?? draft.durationMs
        const completedAt = draft.durationMs != null
          ? draft.startedAt + draft.durationMs
          : event.timestamp
        draft.completedAt = completedAt
        draft.status = completedStatus
        draft.lastActivityAt = event.timestamp
      })
      return
    }

    const placeholder = createPlaceholderExec(event, sessionKey)
    placeholder.command = event.command || placeholder.command
    placeholder.exitCode = event.exitCode
    placeholder.durationMs = event.durationMs
    placeholder.completedAt = placeholder.durationMs != null
      ? placeholder.startedAt + placeholder.durationMs
      : event.timestamp
    placeholder.status = completedStatus
    execsCollection.insert(placeholder)
  }
}

// Helper to update session status
export function updateSessionStatus(
  key: string,
  status: MonitorSession['status']
) {
  const now = Date.now()

  // Track activity on parent sessions
  if (isParentSession(key)) {
    trackParentActivity(key, now)
  }

  const session = sessionsCollection.state.get(key)
  if (session) {
    sessionsCollection.update(key, (draft) => {
      draft.status = status
      draft.lastActivityAt = now
    })
  } else if (isSubagentSession(key)) {
    // New subagent session via status update - create with inferred parent
    const spawnedBy = inferSpawnedBy(key, now)
    const parsed = parseSessionKey(key)
    sessionsCollection.insert({
      key,
      agentId: parsed.agentId,
      platform: parsed.platform,
      recipient: parsed.recipient,
      isGroup: parsed.isGroup,
      lastActivityAt: now,
      status,
      spawnedBy,
    })
  }
}

// Helper to update partial session data
export function updateSession(key: string, update: Partial<MonitorSession>) {
  const session = sessionsCollection.state.get(key)
  if (session) {
    sessionsCollection.update(key, (draft) => {
      Object.assign(draft, update)
    })
  }
}

// Clear all data
export function clearCollections() {
  runSessionMap.clear()
  parentSessionActivity.clear()
  for (const session of sessionsCollection.state.values()) {
    sessionsCollection.delete(session.key)
  }
  for (const action of actionsCollection.state.values()) {
    actionsCollection.delete(action.id)
  }
  for (const exec of execsCollection.state.values()) {
    execsCollection.delete(exec.id)
  }
}

// Get count of completed/failed execs (for UI badge)
export function getCompletedExecCount(): number {
  let count = 0
  for (const exec of execsCollection.state.values()) {
    if (exec.status === 'completed' || exec.status === 'failed') {
      count++
    }
  }
  return count
}

// Clear completed and failed execs from state
// Returns number of items cleared
export function clearCompletedExecs(): number {
  const toDelete: string[] = []
  for (const exec of execsCollection.state.values()) {
    if (exec.status === 'completed' || exec.status === 'failed') {
      toDelete.push(exec.id)
    }
  }
  for (const id of toDelete) {
    execsCollection.delete(id)
  }
  return toDelete.length
}

// Clear inactive sessions (idle sessions with no activity for thresholdMs)
// Returns number of sessions cleared
export function clearInactiveSessions(thresholdMs: number): number {
  const now = Date.now()
  const toDelete: string[] = []
  for (const session of sessionsCollection.state.values()) {
    // Only clear idle sessions - preserve thinking/active ones
    if (session.status !== 'idle') continue
    const inactiveTime = now - session.lastActivityAt
    if (inactiveTime >= thresholdMs) {
      toDelete.push(session.key)
    }
  }
  for (const key of toDelete) {
    sessionsCollection.delete(key)
  }
  return toDelete.length
}

// Hydrate collections from server persistence
export function hydrateFromServer(
  sessions: MonitorSession[],
  actions: MonitorAction[],
  execEvents: MonitorExecEvent[] = []
) {
  // First clear existing data
  clearCollections()

  // Replay actions first to build parent activity history
  const sortedActions = [...actions].sort((a, b) => a.timestamp - b.timestamp)
  for (const action of sortedActions) {
    // Track parent activity without inserting actions yet
    if (action.sessionKey && isParentSession(action.sessionKey)) {
      trackParentActivity(action.sessionKey, action.timestamp)
    }
  }

  // Also track parent sessions by their lastActivityAt
  for (const session of sessions) {
    if (isParentSession(session.key)) {
      trackParentActivity(session.key, session.lastActivityAt)
    }
  }

  // Now insert all sessions - subagents will get inferred spawnedBy
  for (const session of sessions) {
    if (isSubagentSession(session.key)) {
      const spawnedBy = session.spawnedBy || inferSpawnedBy(session.key, session.lastActivityAt)
      sessionsCollection.insert({ ...session, spawnedBy })
    } else {
      sessionsCollection.insert(session)
    }
  }

  // Replay actions through addAction for aggregation
  for (const action of sortedActions) {
    addAction(action)
  }

  // Replay exec events after actions to maximize sessionKey resolution
  const sortedExecEvents = [...execEvents].sort((a, b) => a.timestamp - b.timestamp)
  for (const event of sortedExecEvents) {
    addExecEvent(event)
  }
}
