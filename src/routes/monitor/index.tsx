import { useState, useEffect, useCallback } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useLiveQuery, createTransaction } from '@tanstack/react-db'
import { Activity, ArrowLeft, Loader2 } from 'lucide-react'
import { trpc } from '~/integrations/trpc/client'
import {
  sessionsCollection,
  actionsCollection,
  upsertSession,
  addAction,
  clearCollections,
  type MonitorSession,
  type MonitorAction,
} from '~/integrations/clawdbot'
import {
  ActionGraph,
  SessionList,
  SettingsPanel,
  StatusIndicator,
} from '~/components/monitor'

export const Route = createFileRoute('/monitor/')({
  component: MonitorPage,
})

function MonitorPage() {
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [historicalMode, setHistoricalMode] = useState(false)
  const [selectedSession, setSelectedSession] = useState<string | null>(null)

  // Live queries from TanStack DB collections
  const sessions = useLiveQuery(sessionsCollection)
  const actions = useLiveQuery(actionsCollection)

  // Check connection status on mount
  useEffect(() => {
    checkStatus()
  }, [])

  const checkStatus = async () => {
    try {
      const status = await trpc.clawdbot.status.query()
      setConnected(status.connected)
    } catch {
      setConnected(false)
    }
  }

  const handleConnect = async () => {
    setConnecting(true)
    setError(null)
    try {
      const result = await trpc.clawdbot.connect.mutate()
      if (result.status === 'connected' || result.status === 'already_connected') {
        setConnected(true)
        await loadSessions()
      } else if (result.status === 'error') {
        setError(result.message || 'Failed to connect')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connection error')
    } finally {
      setConnecting(false)
    }
  }

  const handleDisconnect = async () => {
    try {
      await trpc.clawdbot.disconnect.mutate()
      setConnected(false)
      clearCollections()
    } catch (e) {
      console.error('Disconnect error:', e)
    }
  }

  const loadSessions = async () => {
    try {
      const result = await trpc.clawdbot.sessions.query(
        historicalMode ? { activeMinutes: 60 } : { activeMinutes: 5 }
      )
      if (result.sessions) {
        const tx = createTransaction({ mutationFn: async () => {} })
        tx.mutate(() => {
          for (const session of result.sessions) {
            upsertSession(session)
          }
        })
        await tx.commit()
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

  // Auto-connect on mount if not connected
  useEffect(() => {
    if (!connected && !connecting) {
      handleConnect()
    }
  }, [])

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-gray-900 border-b border-gray-800">
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="flex items-center gap-2">
            <Activity size={20} className="text-cyan-400" />
            <h1 className="text-lg font-semibold">Clawdbot Monitor</h1>
          </div>
          <StatusIndicator status={connected ? 'active' : 'idle'} />
        </div>

        <div className="flex items-center gap-3">
          {connecting && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Loader2 size={14} className="animate-spin" />
              Connecting...
            </div>
          )}
          {error && (
            <div className="text-sm text-red-400 max-w-xs truncate">
              {error}
            </div>
          )}
          <div className="text-sm text-gray-500">
            {sessions.length} sessions | {actions.length} actions
          </div>
          <SettingsPanel
            connected={connected}
            historicalMode={historicalMode}
            onHistoricalModeChange={handleHistoricalModeChange}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
            onRefresh={handleRefresh}
          />
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 flex-shrink-0">
          <SessionList
            sessions={sessions}
            selectedKey={selectedSession}
            onSelect={setSelectedSession}
          />
        </div>

        {/* Graph area */}
        <div className="flex-1">
          {sessions.length === 0 && !connecting ? (
            <div className="h-full flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Activity size={48} className="mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">No active sessions</p>
                <p className="text-sm">
                  {connected
                    ? 'Waiting for agent activity...'
                    : 'Connect to clawdbot gateway to start monitoring'}
                </p>
                {!connected && (
                  <button
                    onClick={handleConnect}
                    disabled={connecting}
                    className="mt-4 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm font-medium disabled:opacity-50"
                  >
                    Connect
                  </button>
                )}
              </div>
            </div>
          ) : (
            <ActionGraph
              sessions={sessions}
              actions={actions}
              selectedSession={selectedSession}
              onSessionSelect={setSelectedSession}
            />
          )}
        </div>
      </div>
    </div>
  )
}
