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

// Track recent parent session actions with precise timestamps
// Stores the last few action timestamps per parent session
const parentActionHistory = new Map<string, number[]>()
const MAX_ACTION_HISTORY = 10

// Time window for spawn inference
const SPAWN_INFERENCE_WINDOW_MS = 10000

function isSubagentSession(key: string): boolean {
  return key.includes('subagent')
}

function isParentSession(key: string): boolean {
  return !isSubagentSession(key) && !key.includes('lifecycle')
}

// Track an action on a parent session with its timestamp
function trackParentAction(sessionKey: string, timestamp?: number) {
  if (!isParentSession(sessionKey)) return
  const ts = timestamp ?? Date.now()

  let history = parentActionHistory.get(sessionKey)
  if (!history) {
    history = []
    parentActionHistory.set(sessionKey, history)
  }

  history.push(ts)

  // Keep only recent entries
  if (history.length > MAX_ACTION_HISTORY) {
    history.shift()
  }
}

// Infer which parent session spawned this subagent
// Finds the parent with the most recent action before the subagent's timestamp
function inferSpawnedBy(subagentKey: string, timestamp?: number): string | undefined {
  if (!isSubagentSession(subagentKey)) return undefined

  const subagentTime = timestamp ?? Date.now()
  const cutoff = subagentTime - SPAWN_INFERENCE_WINDOW_MS

  let bestParent: string | undefined
  let bestTime = 0

  for (const [parentKey, history] of parentActionHistory) {
    // Find the most recent action from this parent that's before the subagent time
    for (let i = history.length - 1; i >= 0; i--) {
      const actionTime = history[i]!
      // Must be before subagent appeared and within window
      if (actionTime <= subagentTime && actionTime >= cutoff) {
        if (actionTime > bestTime) {
          bestTime = actionTime
          bestParent = parentKey
        }
        break // Found the most recent valid action for this parent
      }
    }
  }

  if (bestParent) {
    console.log(`[spawn] linked ${subagentKey} to ${bestParent} (action ${subagentTime - bestTime}ms before)`)
  } else {
    console.log(`[spawn] could not infer parent for ${subagentKey}`)
  }

  return bestParent
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

  const totalChars = capped.reduce((sum, chunk) => sum + chunk.text.length, 0)
  if (totalChars > MAX_EXEC_OUTPUT_CHARS) {
    truncated = true
    let dropped = 0
    let startIdx = 0
    for (let i = 0; i < capped.length; i++) {
      if (totalChars - dropped <= MAX_EXEC_OUTPUT_CHARS) break
      dropped += capped[i]!.text.length
      startIdx = i + 1
    }
    capped = capped.slice(startIdx)
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
// Unified node lifecycle per runId:
// - start/streaming/complete/error/aborted all update the same node
// - Node type reflects current state in the lifecycle
// - tool_call/tool_result: separate nodes
export function addAction(action: MonitorAction) {
  // Learn runId → sessionKey mapping from actions with real session keys
  if (action.sessionKey && !action.sessionKey.includes('lifecycle')) {
    const previous = runSessionMap.get(action.runId)
    runSessionMap.set(action.runId, action.sessionKey)
    if (previous !== action.sessionKey) {
      backfillExecSessionKey(action.runId, action.sessionKey)
    }

    // Track parent session actions for spawn inference
    if (isParentSession(action.sessionKey)) {
      trackParentAction(action.sessionKey, action.timestamp)
    }
  }

  // Resolve sessionKey: use mapped value if action has lifecycle/invalid key
  let sessionKey = action.sessionKey
  if (!sessionKey || sessionKey === 'lifecycle') {
    sessionKey = runSessionMap.get(action.runId) || sessionKey
  }

  // Unified node lifecycle: start → streaming → complete/error/aborted
  // All states for the same runId share one node ID
  const actionNodeId = `${action.runId}-action`

  // Handle start, streaming, complete, error, aborted - all update the same node
  if (['start', 'streaming', 'complete', 'error', 'aborted'].includes(action.type)) {
    const existing = actionsCollection.state.get(actionNodeId)

    if (existing) {
      actionsCollection.update(actionNodeId, (draft) => {
        // Always update type to reflect current state
        draft.type = action.type
        draft.seq = action.seq
        draft.timestamp = action.timestamp

        if (sessionKey && sessionKey !== 'lifecycle') {
          draft.sessionKey = sessionKey
        }

        // Update content if present
        if (action.content) {
          draft.content = action.content
        }

        // Copy metadata from complete/error events
        if (action.inputTokens !== undefined) draft.inputTokens = action.inputTokens
        if (action.outputTokens !== undefined) draft.outputTokens = action.outputTokens
        if (action.stopReason) draft.stopReason = action.stopReason
        if (action.endedAt) draft.endedAt = action.endedAt

        // Calculate duration if we have both timestamps
        if (draft.startedAt && action.endedAt) {
          draft.duration = action.endedAt - draft.startedAt
        }
      })
    } else {
      // Create new action node
      actionsCollection.insert({
        ...action,
        id: actionNodeId,
        sessionKey,
      })
    }
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
  parentActionHistory.clear()
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

  // Sort actions by timestamp for replay
  const sortedActions = [...actions].sort((a, b) => a.timestamp - b.timestamp)

  // First pass: build parent action history for spawn inference
  for (const action of sortedActions) {
    if (action.sessionKey && isParentSession(action.sessionKey)) {
      trackParentAction(action.sessionKey, action.timestamp)
    }
  }

  // Also track parent sessions by their lastActivityAt
  for (const session of sessions) {
    if (isParentSession(session.key)) {
      trackParentAction(session.key, session.lastActivityAt)
    }
  }

  // Insert all sessions - subagents will get inferred spawnedBy from Task tool calls
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
