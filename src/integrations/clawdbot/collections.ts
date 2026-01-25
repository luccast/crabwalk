import { createCollection } from '@tanstack/db'
import type { MonitorSession, MonitorAction } from './protocol'

export const sessionsCollection = createCollection<MonitorSession>({
  id: 'clawdbot-sessions',
  primaryKey: 'key',
})

export const actionsCollection = createCollection<MonitorAction>({
  id: 'clawdbot-actions',
  primaryKey: 'id',
})

// Helper to update or insert session
export function upsertSession(session: MonitorSession) {
  const existing = sessionsCollection.state.get(session.key)
  if (existing) {
    sessionsCollection.update(session.key, session)
  } else {
    sessionsCollection.insert(session)
  }
}

// Helper to add action
export function addAction(action: MonitorAction) {
  const existing = actionsCollection.state.get(action.id)
  if (!existing) {
    actionsCollection.insert(action)
  }
}

// Helper to update session status
export function updateSessionStatus(
  key: string,
  status: MonitorSession['status']
) {
  const session = sessionsCollection.state.get(key)
  if (session) {
    sessionsCollection.update(key, {
      status,
      lastActivityAt: Date.now(),
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
