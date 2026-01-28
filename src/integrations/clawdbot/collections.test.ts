import { describe, it, expect, beforeEach } from 'vitest'
import {
  execsCollection,
  sessionsCollection,
  clearCollections,
  addExecEvent,
  clearCompletedExecs,
  getCompletedExecCount,
  clearInactiveSessions,
  upsertSession,
} from './collections'
import type { MonitorExecEvent, MonitorSession } from './protocol'

describe('clearCompletedExecs', () => {
  beforeEach(() => {
    clearCollections()
  })

  it('removes completed execs from state', () => {
    // Add a completed exec
    const completedEvent: MonitorExecEvent = {
      id: 'evt-1',
      execId: 'exec-completed',
      runId: 'run-1',
      pid: 1234,
      sessionId: 'session-1',
      eventType: 'completed',
      command: 'echo hello',
      exitCode: 0,
      timestamp: Date.now(),
    }
    addExecEvent(completedEvent)

    // Verify it exists
    expect(execsCollection.state.get('exec-completed')).toBeDefined()
    expect(execsCollection.state.get('exec-completed')?.status).toBe('completed')

    // Clear completed
    const cleared = clearCompletedExecs()
    
    // Verify it's gone
    expect(execsCollection.state.get('exec-completed')).toBeUndefined()
    expect(cleared).toBe(1)
  })

  it('removes failed execs from state', () => {
    // Add a failed exec
    const failedEvent: MonitorExecEvent = {
      id: 'evt-2',
      execId: 'exec-failed',
      runId: 'run-2',
      pid: 1235,
      sessionId: 'session-1',
      eventType: 'completed',
      command: 'exit 1',
      exitCode: 1,
      timestamp: Date.now(),
    }
    addExecEvent(failedEvent)

    // Verify it exists and is failed
    expect(execsCollection.state.get('exec-failed')).toBeDefined()
    expect(execsCollection.state.get('exec-failed')?.status).toBe('failed')

    // Clear completed (includes failed)
    const cleared = clearCompletedExecs()
    
    // Verify it's gone
    expect(execsCollection.state.get('exec-failed')).toBeUndefined()
    expect(cleared).toBe(1)
  })

  it('does NOT remove running execs', () => {
    // Add a running exec
    const startedEvent: MonitorExecEvent = {
      id: 'evt-3',
      execId: 'exec-running',
      runId: 'run-3',
      pid: 1236,
      sessionId: 'session-1',
      eventType: 'started',
      command: 'sleep 3600',
      startedAt: Date.now(),
      timestamp: Date.now(),
    }
    addExecEvent(startedEvent)

    // Verify it exists and is running
    expect(execsCollection.state.get('exec-running')).toBeDefined()
    expect(execsCollection.state.get('exec-running')?.status).toBe('running')

    // Clear completed
    const cleared = clearCompletedExecs()
    
    // Verify running exec is still there
    expect(execsCollection.state.get('exec-running')).toBeDefined()
    expect(cleared).toBe(0)
  })

  it('clears mix of completed/failed but keeps running', () => {
    // Add various execs
    addExecEvent({
      id: 'evt-1', execId: 'exec-1', runId: 'run-1', pid: 1,
      eventType: 'completed', exitCode: 0, timestamp: Date.now(),
    })
    addExecEvent({
      id: 'evt-2', execId: 'exec-2', runId: 'run-2', pid: 2,
      eventType: 'completed', exitCode: 1, timestamp: Date.now(),
    })
    addExecEvent({
      id: 'evt-3', execId: 'exec-3', runId: 'run-3', pid: 3,
      eventType: 'started', timestamp: Date.now(),
    })

    expect(execsCollection.state.size).toBe(3)
    
    const cleared = clearCompletedExecs()
    
    expect(cleared).toBe(2)
    expect(execsCollection.state.size).toBe(1)
    expect(execsCollection.state.get('exec-3')).toBeDefined()
    expect(execsCollection.state.get('exec-3')?.status).toBe('running')
  })
})

describe('getCompletedExecCount', () => {
  beforeEach(() => {
    clearCollections()
  })

  it('returns count of clearable items (completed + failed)', () => {
    // Add mix of execs
    addExecEvent({
      id: 'evt-1', execId: 'exec-1', runId: 'run-1', pid: 1,
      eventType: 'completed', exitCode: 0, timestamp: Date.now(),
    })
    addExecEvent({
      id: 'evt-2', execId: 'exec-2', runId: 'run-2', pid: 2,
      eventType: 'completed', exitCode: 1, timestamp: Date.now(),
    })
    addExecEvent({
      id: 'evt-3', execId: 'exec-3', runId: 'run-3', pid: 3,
      eventType: 'started', timestamp: Date.now(),
    })

    const count = getCompletedExecCount()
    expect(count).toBe(2)
  })

  it('returns 0 when no completed execs', () => {
    addExecEvent({
      id: 'evt-1', execId: 'exec-1', runId: 'run-1', pid: 1,
      eventType: 'started', timestamp: Date.now(),
    })

    expect(getCompletedExecCount()).toBe(0)
  })
})

describe('clearInactiveSessions', () => {
  beforeEach(() => {
    clearCollections()
  })

  it('removes sessions with no activity for specified time', () => {
    const now = Date.now()
    const tenMinutesAgo = now - 10 * 60 * 1000
    const fiveMinutesAgo = now - 5 * 60 * 1000

    // Old session (inactive)
    const oldSession: MonitorSession = {
      key: 'session-old',
      agentId: 'main',
      platform: 'test',
      recipient: 'test-user',
      isGroup: false,
      lastActivityAt: tenMinutesAgo,
      status: 'idle',
    }
    upsertSession(oldSession)

    // Recent session (active)
    const recentSession: MonitorSession = {
      key: 'session-recent',
      agentId: 'main',
      platform: 'test',
      recipient: 'test-user-2',
      isGroup: false,
      lastActivityAt: fiveMinutesAgo,
      status: 'idle',
    }
    upsertSession(recentSession)

    expect(sessionsCollection.state.size).toBe(2)

    // Clear sessions inactive for 7 minutes
    const cleared = clearInactiveSessions(7 * 60 * 1000)

    expect(cleared).toBe(1)
    expect(sessionsCollection.state.size).toBe(1)
    expect(sessionsCollection.state.get('session-old')).toBeUndefined()
    expect(sessionsCollection.state.get('session-recent')).toBeDefined()
  })

  it('does not remove sessions with thinking/active status regardless of time', () => {
    const now = Date.now()
    const tenMinutesAgo = now - 10 * 60 * 1000

    // Old but thinking session
    const thinkingSession: MonitorSession = {
      key: 'session-thinking',
      agentId: 'main',
      platform: 'test',
      recipient: 'test-user',
      isGroup: false,
      lastActivityAt: tenMinutesAgo,
      status: 'thinking',
    }
    upsertSession(thinkingSession)

    const cleared = clearInactiveSessions(5 * 60 * 1000)

    expect(cleared).toBe(0)
    expect(sessionsCollection.state.get('session-thinking')).toBeDefined()
  })
})
