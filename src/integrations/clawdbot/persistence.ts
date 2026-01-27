import fs from 'fs'
import path from 'path'
import type { MonitorSession, MonitorAction, MonitorExecEvent } from './protocol'

const DATA_DIR = path.join(process.cwd(), 'data')
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json')
const ACTIONS_FILE = path.join(DATA_DIR, 'actions.jsonl')
const EXEC_EVENTS_FILE = path.join(DATA_DIR, 'exec-events.jsonl')
const STATE_FILE = path.join(DATA_DIR, 'state.json')
const MAX_ACTIONS = 10000
const MAX_EXEC_EVENTS = 20000

interface PersistenceState {
  enabled: boolean
  startedAt: number | null
}

class PersistenceService {
  private sessions: Map<string, MonitorSession> = new Map()
  private actions: MonitorAction[] = []
  private execEvents: MonitorExecEvent[] = []
  private enabled = false
  private startedAt: number | null = null

  constructor() {
    this.ensureDataDir()
    this.loadState()
    this.loadData()
    // Auto-start by default if no state file exists
    if (!this.enabled && !fs.existsSync(STATE_FILE)) {
      this.start()
    }
  }

  private ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true })
    }
  }

  private loadState() {
    try {
      if (fs.existsSync(STATE_FILE)) {
        const data = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')) as PersistenceState
        this.enabled = data.enabled
        this.startedAt = data.startedAt
      }
    } catch {
      // ignore
    }
  }

  private saveState() {
    const state: PersistenceState = {
      enabled: this.enabled,
      startedAt: this.startedAt,
    }
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2))
  }

  private loadData() {
    // Load sessions
    try {
      if (fs.existsSync(SESSIONS_FILE)) {
        const data = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8')) as MonitorSession[]
        for (const session of data) {
          this.sessions.set(session.key, session)
        }
      }
    } catch {
      // ignore
    }

    // Load actions (JSONL)
    try {
      if (fs.existsSync(ACTIONS_FILE)) {
        const content = fs.readFileSync(ACTIONS_FILE, 'utf-8')
        const lines = content.trim().split('\n').filter(Boolean)
        for (const line of lines) {
          try {
            const action = JSON.parse(line) as MonitorAction
            this.actions.push(action)
          } catch {
            // skip bad lines
          }
        }
        // Trim to max if needed
        if (this.actions.length > MAX_ACTIONS) {
          this.actions = this.actions.slice(-MAX_ACTIONS)
          this.saveActions()
        }
      }
    } catch {
      // ignore
    }

    // Load exec events (JSONL)
    try {
      if (fs.existsSync(EXEC_EVENTS_FILE)) {
        const content = fs.readFileSync(EXEC_EVENTS_FILE, 'utf-8')
        const lines = content.trim().split('\n').filter(Boolean)
        for (const line of lines) {
          try {
            const event = JSON.parse(line) as MonitorExecEvent
            this.execEvents.push(event)
          } catch {
            // skip bad lines
          }
        }
        if (this.execEvents.length > MAX_EXEC_EVENTS) {
          this.execEvents = this.execEvents.slice(-MAX_EXEC_EVENTS)
          this.saveExecEvents()
        }
      }
    } catch {
      // ignore
    }
  }

  private saveSessions() {
    const data = Array.from(this.sessions.values())
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(data, null, 2))
  }

  private saveActions() {
    const content = this.actions.map((a) => JSON.stringify(a)).join('\n')
    fs.writeFileSync(ACTIONS_FILE, content)
  }

  private saveExecEvents() {
    const content = this.execEvents.map((e) => JSON.stringify(e)).join('\n')
    fs.writeFileSync(EXEC_EVENTS_FILE, content)
  }

  private appendAction(action: MonitorAction) {
    fs.appendFileSync(ACTIONS_FILE, JSON.stringify(action) + '\n')
  }

  private appendExecEvent(event: MonitorExecEvent) {
    fs.appendFileSync(EXEC_EVENTS_FILE, JSON.stringify(event) + '\n')
  }

  get isEnabled() {
    return this.enabled
  }

  start(): { enabled: boolean; startedAt: number } {
    this.enabled = true
    this.startedAt = Date.now()
    this.saveState()
    console.log('[persistence] started')
    return { enabled: true, startedAt: this.startedAt }
  }

  stop(): { enabled: boolean } {
    this.enabled = false
    this.startedAt = null
    this.saveState()
    console.log('[persistence] stopped')
    return { enabled: false }
  }

  getStatus(): {
    enabled: boolean
    startedAt: number | null
    sessionCount: number
    actionCount: number
    execEventCount: number
  } {
    return {
      enabled: this.enabled,
      startedAt: this.startedAt,
      sessionCount: this.sessions.size,
      actionCount: this.actions.length,
      execEventCount: this.execEvents.length,
    }
  }

  upsertSession(session: MonitorSession) {
    if (!this.enabled) return
    this.sessions.set(session.key, session)
    this.saveSessions()
  }

  addAction(action: MonitorAction) {
    if (!this.enabled) return

    // Check if action already exists (by id)
    const existingIdx = this.actions.findIndex((a) => a.id === action.id)
    if (existingIdx >= 0) {
      // Update existing action
      this.actions[existingIdx] = action
      this.saveActions()
    } else {
      // Add new action
      this.actions.push(action)
      this.appendAction(action)

      // Rotate if over limit
      if (this.actions.length > MAX_ACTIONS) {
        this.actions = this.actions.slice(-MAX_ACTIONS)
        this.saveActions()
      }
    }
  }

  addExecEvent(event: MonitorExecEvent) {
    if (!this.enabled) return

    const existingIdx = this.execEvents.findIndex((e) => e.id === event.id)
    if (existingIdx >= 0) {
      this.execEvents[existingIdx] = event
      this.saveExecEvents()
    } else {
      this.execEvents.push(event)
      this.appendExecEvent(event)

      if (this.execEvents.length > MAX_EXEC_EVENTS) {
        this.execEvents = this.execEvents.slice(-MAX_EXEC_EVENTS)
        this.saveExecEvents()
      }
    }
  }

  hydrate(): {
    sessions: MonitorSession[]
    actions: MonitorAction[]
    execEvents: MonitorExecEvent[]
  } {
    return {
      sessions: Array.from(this.sessions.values()),
      actions: [...this.actions],
      execEvents: [...this.execEvents],
    }
  }

  clear(): { cleared: boolean } {
    this.sessions.clear()
    this.actions = []
    this.execEvents = []
    try {
      if (fs.existsSync(SESSIONS_FILE)) fs.unlinkSync(SESSIONS_FILE)
      if (fs.existsSync(ACTIONS_FILE)) fs.unlinkSync(ACTIONS_FILE)
      if (fs.existsSync(EXEC_EVENTS_FILE)) fs.unlinkSync(EXEC_EVENTS_FILE)
    } catch {
      // ignore
    }
    console.log('[persistence] cleared all data')
    return { cleared: true }
  }
}

// Singleton instance
let instance: PersistenceService | null = null

export function getPersistenceService(): PersistenceService {
  if (!instance) {
    instance = new PersistenceService()
  }
  return instance
}
