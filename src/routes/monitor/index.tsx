import { useState, useEffect, useCallback, useMemo } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useLiveQuery } from '@tanstack/react-db'
import { motion, AnimatePresence } from 'framer-motion'
import { Activity, HardDrive, Trash2, Settings } from 'lucide-react'
import { trpc } from '~/integrations/trpc/client'
import { CommandNav } from '~/components/navigation'
import {
  AppHeader,
  StatusPill,
  StatBlock,
  StatsGroup,
  StatsDivider,
  BadgeCounter,
  ServiceIndicator,
  RetryIndicator,
} from '~/components/layout'
import {
  sessionsCollection,
  actionsCollection,
  execsCollection,
  upsertSession,
  addAction,
  addExecEvent,
  updateSessionStatus,
  clearCollections,
  hydrateFromServer,
  clearCompletedExecs,
} from '~/integrations/openclaw'
import {
  ActionGraph,
  SessionList,
  SettingsPanel,
} from '~/components/monitor'

export const Route = createFileRoute('/monitor/')({
  component: MonitorPageWrapper,
})

// Wrapper to ensure client-only rendering (useLiveQuery needs client)
function MonitorPageWrapper() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return (
      <div className="h-screen flex items-center justify-center bg-shell-950 text-white">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          {/* Geometric loading indicator */}
          <div className="relative w-16 h-16">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 border-2 border-shell-700 border-t-crab-500 rounded-lg"
            />
            <div className="absolute inset-2 bg-shell-900 rounded flex items-center justify-center">
              <Activity size={20} className="text-crab-400" />
            </div>
          </div>
          <span className="font-console text-xs text-shell-500 tracking-widest uppercase">
            Loading Monitor
          </span>
        </motion.div>
      </div>
    )
  }

  return <MonitorPage />
}

const RETRY_DELAY = 3000
const MAX_RETRIES = 10

function MonitorPage() {
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [historicalMode, setHistoricalMode] = useState(false)
  const [debugMode, setDebugMode] = useState(false)
  const [logCollection, setLogCollection] = useState(false)
  const [logCount, setLogCount] = useState(0)
  const [selectedSession, setSelectedSession] = useState<string | null>(null)

  // Persistence service state
  const [persistenceEnabled, setPersistenceEnabled] = useState(false)
  const [persistenceStartedAt, setPersistenceStartedAt] = useState<number | null>(null)
  const [persistenceSessionCount, setPersistenceSessionCount] = useState(0)
  const [persistenceActionCount, setPersistenceActionCount] = useState(0)

  // Sidebar collapse state - default to collapsed
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)

  // Settings panel state
  const [settingsOpen, setSettingsOpen] = useState(false)

  // Live queries from TanStack DB collections
  const sessionsQuery = useLiveQuery(sessionsCollection)
  const actionsQuery = useLiveQuery(actionsCollection)
  const execsQuery = useLiveQuery(execsCollection)

  const sessions = sessionsQuery.data ?? []
  const actions = actionsQuery.data ?? []
  const execs = execsQuery.data ?? []

  // Count clearable items (completed/failed execs)
  const completedCount = useMemo(() => {
    return execs.filter(e => e.status === 'completed' || e.status === 'failed').length
  }, [execs])

  // Handler for clearing completed execs
  const handleClearCompleted = useCallback(() => {
    const count = clearCompletedExecs()
    console.log(`[monitor] cleared ${count} completed execs`)
  }, [])


  // Check connection status and persistence on mount
  useEffect(() => {
    checkStatus()
    checkPersistenceStatus()
  }, [])

  const checkPersistenceStatus = async () => {
    try {
      const status = await trpc.openclaw.persistenceStatus.query()
      setPersistenceEnabled(status.enabled)
      setPersistenceStartedAt(status.startedAt)
      setPersistenceSessionCount(status.sessionCount)
      setPersistenceActionCount(status.actionCount)
    } catch {
      // ignore
    }
  }

  const checkStatus = async () => {
    try {
      const status = await trpc.openclaw.status.query()
      setConnected(status.connected)
    } catch {
      setConnected(false)
    }
  }

  const handleConnect = async (retry = 0) => {
    setConnecting(true)
    setRetryCount(retry)
    try {
      const result = await trpc.openclaw.connect.mutate()
      if (result.status === 'connected' || result.status === 'already_connected') {
        setConnected(true)
        setRetryCount(0)
        setConnecting(false)
        // Hydrate from persistence if enabled
        await hydrateFromPersistence()
        await loadSessions()
        return
      }
    } catch {
      // Will retry below
    }
    // Retry if under max
    if (retry < MAX_RETRIES) {
      setTimeout(() => handleConnect(retry + 1), RETRY_DELAY)
    } else {
      setConnecting(false)
    }
  }

  const hydrateFromPersistence = async () => {
    try {
      const status = await trpc.openclaw.persistenceStatus.query()
      if (status.sessionCount > 0 || status.actionCount > 0 || status.execEventCount > 0) {
        const data = await trpc.openclaw.persistenceHydrate.query()
        hydrateFromServer(data.sessions, data.actions, data.execEvents ?? [])
        console.log(
          `[monitor] hydrated ${data.sessions.length} sessions, ${data.actions.length} actions, ${(data.execEvents ?? []).length} exec events`
        )
      }
      setPersistenceEnabled(status.enabled)
      setPersistenceStartedAt(status.startedAt)
      setPersistenceSessionCount(status.sessionCount)
      setPersistenceActionCount(status.actionCount)
    } catch (e) {
      console.error('Failed to hydrate:', e)
    }
  }

  const handleDisconnect = async () => {
    try {
      await trpc.openclaw.disconnect.mutate()
      setConnected(false)
      clearCollections()
    } catch (e) {
      console.error('Disconnect error:', e)
    }
  }

  const loadSessions = async () => {
    try {
      const result = await trpc.openclaw.sessions.query(
        historicalMode ? { activeMinutes: 1440 } : { activeMinutes: 60 }
      )
      if (result.sessions) {
        for (const session of result.sessions) {
          upsertSession(session)
        }
      }
    } catch (e) {
      console.error('Failed to load sessions:', e)
    }
  }

  const handleRefresh = useCallback(async () => {
    await loadSessions()
  }, [historicalMode])

  const handleHistoricalModeChange = (enabled: boolean) => {
    setHistoricalMode(enabled)
    if (connected) {
      loadSessions()
    }
  }

  const handleDebugModeChange = async (enabled: boolean) => {
    setDebugMode(enabled)
    try {
      await trpc.openclaw.setDebugMode.mutate({ enabled })
    } catch (e) {
      console.error('Failed to set debug mode:', e)
    }
  }

  const handleLogCollectionChange = async (enabled: boolean) => {
    setLogCollection(enabled)
    try {
      const result = await trpc.openclaw.setLogCollection.mutate({ enabled })
      setLogCount(result.eventCount)
    } catch (e) {
      console.error('Failed to set log collection:', e)
    }
  }

  const handleDownloadLogs = async () => {
    try {
      const result = await trpc.openclaw.downloadLogs.query()
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `openclaw-events-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Failed to download logs:', e)
    }
  }

  const handleClearLogs = async () => {
    try {
      await trpc.openclaw.clearLogs.mutate()
      setLogCount(0)
    } catch (e) {
      console.error('Failed to clear logs:', e)
    }
  }

  const handlePersistenceStart = async () => {
    try {
      const result = await trpc.openclaw.persistenceStart.mutate()
      setPersistenceEnabled(result.enabled)
      setPersistenceStartedAt(result.startedAt)
    } catch (e) {
      console.error('Failed to start persistence:', e)
    }
  }

  const handlePersistenceStop = async () => {
    try {
      const result = await trpc.openclaw.persistenceStop.mutate()
      setPersistenceEnabled(result.enabled)
      setPersistenceStartedAt(null)
    } catch (e) {
      console.error('Failed to stop persistence:', e)
    }
  }

  const handlePersistenceClear = async () => {
    try {
      await trpc.openclaw.persistenceClear.mutate()
      setPersistenceSessionCount(0)
      setPersistenceActionCount(0)
      clearCollections()
    } catch (e) {
      console.error('Failed to clear persistence:', e)
    }
  }

  // Poll log count while collecting
  useEffect(() => {
    if (!logCollection) return
    const interval = setInterval(async () => {
      try {
        const result = await trpc.openclaw.getLogCollection.query()
        setLogCount(result.eventCount)
      } catch {
        // ignore
      }
    }, 2000)
    return () => clearInterval(interval)
  }, [logCollection])

  // Poll persistence status
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const status = await trpc.openclaw.persistenceStatus.query()
        setPersistenceEnabled(status.enabled)
        setPersistenceStartedAt(status.startedAt)
        setPersistenceSessionCount(status.sessionCount)
        setPersistenceActionCount(status.actionCount)
      } catch {
        // ignore
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleToggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev)
  }, [])

  // Auto-connect on mount
  useEffect(() => {
    if (!connected && !connecting) {
      handleConnect()
    }
  }, [])

  // Poll for sessions while connected
  useEffect(() => {
    if (!connected) return
    const interval = setInterval(() => {
      loadSessions()
    }, 5000) // Poll every 5 seconds
    return () => clearInterval(interval)
  }, [connected, historicalMode])

  // Subscribe to real-time events
  useEffect(() => {
    if (!connected) return

    const subscription = trpc.openclaw.events.subscribe(undefined, {
      onData: (data) => {
        if (data.type === 'session' && data.session?.key && data.session.status) {
          updateSessionStatus(data.session.key, data.session.status)
        }
        if (data.type === 'action' && data.action) {
          addAction(data.action)
        }
        if (data.type === 'exec' && data.execEvent) {
          addExecEvent(data.execEvent)
        }
      },
      onError: (err) => {
        console.error('[monitor] subscription error:', err)
      },
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [connected])

  return (
    <div className="h-screen flex flex-col bg-shell-950 text-white overflow-hidden">
      {/* Global navigation */}
      <CommandNav />

      {/* Header */}
      <AppHeader
        hiddenOnMobile={false}
        left={
          <>
            <StatusPill
              status={connected ? 'connected' : connecting ? 'connecting' : 'disconnected'}
            />
            <AnimatePresence>
              {connecting && retryCount > 0 && (
                <RetryIndicator retryCount={retryCount} maxRetries={MAX_RETRIES} />
              )}
            </AnimatePresence>
          </>
        }
        right={
          <>
            {/* Clear completed */}
            <BadgeCounter
              count={completedCount}
              icon={<Trash2 size={14} />}
              onClick={handleClearCompleted}
              title={`Clear ${completedCount} completed`}
            />

            {/* Persistence service */}
            <ServiceIndicator
              active={persistenceEnabled}
              icon={<HardDrive size={14} />}
              onClick={() => setSettingsOpen(true)}
              title={persistenceEnabled ? 'Background service running' : 'Service stopped'}
            />

            {/* Stats */}
            <StatsGroup>
              <StatBlock label="Sessions" value={sessions.length} color="mint" />
              <StatsDivider />
              <StatBlock label="Actions" value={actions.length} color="peach" />
            </StatsGroup>

            {/* Settings trigger */}
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-2 bg-shell-800/50 hover:bg-shell-700/50 border border-shell-700/50 hover:border-shell-600 rounded-lg transition-all group"
            >
              <Settings size={14} className="text-gray-400 group-hover:text-crab-400 transition-colors" />
            </button>
          </>
        }
      />

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <SessionList
          sessions={sessions}
          selectedKey={selectedSession}
          onSelect={setSelectedSession}
          collapsed={sidebarCollapsed}
          onToggleCollapse={handleToggleSidebar}
        />

        {/* Graph area */}
        <div className="flex-1 relative">
          <ActionGraph
            sessions={sessions}
            actions={actions}
            execs={execs}
            selectedSession={selectedSession}
            onSessionSelect={setSelectedSession}
          />
        </div>
      </div>

      {/* Settings panel - rendered at root level to avoid z-index clipping */}
      <SettingsPanel
        connected={connected}
        historicalMode={historicalMode}
        debugMode={debugMode}
        logCollection={logCollection}
        logCount={logCount}
        persistenceEnabled={persistenceEnabled}
        persistenceStartedAt={persistenceStartedAt}
        persistenceSessionCount={persistenceSessionCount}
        persistenceActionCount={persistenceActionCount}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onHistoricalModeChange={handleHistoricalModeChange}
        onDebugModeChange={handleDebugModeChange}
        onLogCollectionChange={handleLogCollectionChange}
        onDownloadLogs={handleDownloadLogs}
        onClearLogs={handleClearLogs}
        onConnect={handleConnect}
        onDisconnect={handleDisconnect}
        onRefresh={handleRefresh}
        onPersistenceStart={handlePersistenceStart}
        onPersistenceStop={handlePersistenceStop}
        onPersistenceClear={handlePersistenceClear}
        hideTrigger
      />
    </div>
  )
}
