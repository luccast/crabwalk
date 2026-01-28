import { createCollection, localOnlyCollectionOptions } from '@tanstack/db'
import type { MonitorSession, MonitorAction } from './protocol'

// Track runId → sessionKey mapping (learned from chat events)
const runSessionMap = new Map<string, string>()

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
  const existing = sessionsCollection.state.get(session.key)
  if (existing) {
    sessionsCollection.update(session.key, (draft) => {
      Object.assign(draft, session)
    })
  } else {
    sessionsCollection.insert(session)
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
  const session = sessionsCollection.state.get(key)
  if (session) {
    sessionsCollection.update(key, (draft) => {
      draft.status = status
      draft.lastActivityAt = Date.now()
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

  // Insert all sessions
  for (const session of sessions) {
    sessionsCollection.insert(session)
  }

  // Replay actions through addAction to apply aggregation logic
  // Sort by timestamp to ensure correct order
  const sortedActions = [...actions].sort((a, b) => a.timestamp - b.timestamp)
  for (const action of sortedActions) {
    addAction(action)
  }
}
