import { createCollection, localOnlyCollectionOptions } from '@tanstack/db'
import { parseSessionKey, type MonitorSession, type MonitorAction } from './protocol'

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
    runSessionMap.set(action.runId, action.sessionKey)

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
}

// Hydrate collections from server persistence
export function hydrateFromServer(
  sessions: MonitorSession[],
  actions: MonitorAction[]
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
}
