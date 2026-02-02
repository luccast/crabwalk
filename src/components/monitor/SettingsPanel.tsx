import { motion, AnimatePresence } from 'framer-motion'
import { Settings, X, Wifi, WifiOff, RefreshCw, Terminal, Download, Trash2, Database, HardDrive, Play, Square, CloudDownload } from 'lucide-react'
import { version } from '../../../package.json'

interface SettingsPanelProps {
  connected: boolean
  historicalMode: boolean
  debugMode: boolean
  logCollection: boolean
  logCount: number
  persistenceEnabled: boolean
  persistenceStartedAt: number | null
  persistenceSessionCount: number
  persistenceActionCount: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onHistoricalModeChange: (enabled: boolean) => void
  onDebugModeChange: (enabled: boolean) => void
  onLogCollectionChange: (enabled: boolean) => void
  onDownloadLogs: () => void
  onClearLogs: () => void
  onConnect: () => void
  onDisconnect: () => void
  onRefresh: () => void
  onPersistenceStart: () => void
  onPersistenceStop: () => void
  onPersistenceClear: () => void
}

export function SettingsPanel({
  connected,
  historicalMode,
  debugMode,
  logCollection,
  logCount,
  persistenceEnabled,
  persistenceStartedAt,
  persistenceSessionCount,
  persistenceActionCount,
  open,
  onOpenChange,
  onHistoricalModeChange,
  onDebugModeChange,
  onLogCollectionChange,
  onDownloadLogs,
  onClearLogs,
  onConnect,
  onDisconnect,
  onRefresh,
  onPersistenceStart,
  onPersistenceStop,
  onPersistenceClear,
}: SettingsPanelProps) {

  return (
    <>
      {/* Trigger button - hidden on mobile, settings available in bottom bar */}
      <button
        onClick={() => onOpenChange(true)}
        className="hidden sm:block p-2 bg-shell-800 hover:bg-shell-700 rounded-lg transition-all group"
      >
        <Settings size={14} className="text-gray-400 group-hover:text-crab-400 transition-colors" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => onOpenChange(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 h-full w-80 bg-shell-900 z-50 p-5 overflow-y-auto"
            >
              {/* Texture overlay */}
              <div className="absolute inset-0 texture-scanlines pointer-events-none opacity-30" />

              {/* Header */}
              <div className="relative flex items-center justify-between mb-3">
                <h2 className="font-mono uppercase text-sm text-crab-400 glow-red tracking-wider">
                  SETTINGS
                </h2>
                <button
                  onClick={() => onOpenChange(false)}
                  className="p-2 hover:bg-shell-800 rounded-lg transition-all"
                >
                  <X size={18} className="text-gray-400" />
                </button>
              </div>

              <div className="relative space-y-6">
                {/* Connection status */}
                <div className="panel-retro p-4">
                  <div className="flex items-center gap-3 mb-4">
                    {connected ? (
                      <Wifi size={18} className="text-neon-mint" />
                    ) : (
                      <WifiOff size={18} className="text-crab-400" />
                    )}
                    <span className="font-display text-sm font-medium text-gray-200 uppercase tracking-wide">
                      {connected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    {connected ? (
                      <button
                        onClick={onDisconnect}
                        className="flex-1 px-4 py-2 font-display text-xs uppercase tracking-wide bg-crab-600 hover:bg-crab-500 rounded-lg transition-all"
                        style={{ boxShadow: '0 2px 0 0 #991b1b' }}
                      >
                        Disconnect
                      </button>
                    ) : (
                      <button
                        onClick={onConnect}
                        className="flex-1 px-4 py-2 font-display text-xs uppercase tracking-wide bg-neon-mint/20 hover:bg-neon-mint/30 text-neon-mint rounded-lg transition-all"
                      >
                        Connect
                      </button>
                    )}
                    <button
                      onClick={onRefresh}
                      disabled={!connected}
                      className="px-3 py-2 bg-shell-800 hover:bg-shell-700 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <RefreshCw size={14} className="text-gray-400" />
                    </button>
                  </div>
                </div>

                {/* Debug mode toggle */}
                <div className="panel-retro p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Terminal size={18} className="text-shell-500" />
                    <span className="font-display text-sm font-medium text-gray-200 uppercase tracking-wide">
                      Debug Logging
                    </span>
                  </div>

                  <p className="font-console text-[10px] text-shell-500 mb-4">
                    <span className="text-crab-600">&gt;</span> log raw events to terminal
                  </p>

                  <button
                    onClick={() => onDebugModeChange(!debugMode)}
                    className={`w-full px-4 py-2 font-display text-xs uppercase tracking-wide rounded-lg transition-all ${
                      debugMode
                        ? 'bg-neon-lavender/30 text-neon-lavender'
                        : 'bg-shell-800 text-gray-400 hover:bg-shell-700'
                    }`}
                  >
                    {debugMode ? 'Enabled' : 'Disabled'}
                  </button>
                </div>

                {/* Background Service */}
                <div className="panel-retro p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <HardDrive size={18} className={persistenceEnabled ? 'text-neon-mint' : 'text-shell-500'} />
                    <span className="font-display text-sm font-medium text-gray-200 uppercase tracking-wide">
                      Background Service
                    </span>
                  </div>

                  <p className="font-console text-[10px] text-shell-500 mb-3">
                    <span className="text-crab-600">&gt;</span> persist data across refreshes
                  </p>

                  {persistenceEnabled && persistenceStartedAt && (
                    <div className="font-console text-[10px] text-neon-mint mb-2">
                      <span className="text-crab-600">&gt;</span> running since {new Date(persistenceStartedAt).toLocaleTimeString()}
                    </div>
                  )}

                  <div className="font-console text-[10px] text-shell-400 mb-3 space-y-1">
                    <div>
                      <span className="text-crab-600">&gt;</span> {persistenceSessionCount} sessions
                    </div>
                    <div>
                      <span className="text-crab-600">&gt;</span> {persistenceActionCount} actions
                    </div>
                  </div>

                  <div className="flex gap-2 mb-2">
                    {persistenceEnabled ? (
                      <button
                        onClick={onPersistenceStop}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 font-display text-xs uppercase tracking-wide bg-crab-600 hover:bg-crab-500 text-white rounded-lg transition-all"
                      >
                        <Square size={12} />
                        Stop
                      </button>
                    ) : (
                      <button
                        onClick={onPersistenceStart}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 font-display text-xs uppercase tracking-wide bg-neon-mint/20 hover:bg-neon-mint/30 text-neon-mint rounded-lg transition-all"
                      >
                        <Play size={12} />
                        Start
                      </button>
                    )}
                  </div>

                  <button
                    onClick={onPersistenceClear}
                    disabled={persistenceSessionCount === 0 && persistenceActionCount === 0}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 font-display text-xs uppercase tracking-wide bg-shell-800 hover:bg-crab-900/50 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Trash2 size={12} />
                    Clear Stored Data
                  </button>

                  {/* Gateway sync sub-option */}
                  <div className="mt-4 pt-4 border-t border-shell-700">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <CloudDownload size={14} className="text-shell-500" />
                        <span className="font-display text-xs text-gray-300 uppercase tracking-wide">
                          Sync Gateway (24h)
                        </span>
                      </div>
                      <button
                        onClick={() => onHistoricalModeChange(!historicalMode)}
                        className={`px-3 py-1 font-display text-[10px] uppercase tracking-wide rounded transition-all ${
                          historicalMode
                            ? 'bg-neon-cyan/20 text-neon-cyan'
                            : 'bg-shell-800 text-gray-500 hover:bg-shell-700'
                        }`}
                      >
                        {historicalMode ? 'On' : 'Off'}
                      </button>
                    </div>
                    <p className="font-console text-[10px] text-shell-500">
                      <span className="text-crab-600">&gt;</span> fetch 24h of sessions from gateway on refresh
                    </p>
                  </div>
                </div>

                {/* Log collection */}
                <div className="panel-retro p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Database size={18} className="text-shell-500" />
                    <span className="font-display text-sm font-medium text-gray-200 uppercase tracking-wide">
                      Log Collection
                    </span>
                  </div>

                  <p className="font-console text-[10px] text-shell-500 mb-3">
                    <span className="text-crab-600">&gt;</span> collect raw events for export
                  </p>

                  {logCount > 0 && (
                    <div className="font-console text-[10px] text-neon-mint mb-3">
                      <span className="text-crab-600">&gt;</span> {logCount} events collected
                    </div>
                  )}

                  <button
                    onClick={() => onLogCollectionChange(!logCollection)}
                    className={`w-full px-4 py-2 font-display text-xs uppercase tracking-wide rounded-lg transition-all mb-2 ${
                      logCollection
                        ? 'bg-neon-mint/20 text-neon-mint'
                        : 'bg-shell-800 text-gray-400 hover:bg-shell-700'
                    }`}
                  >
                    {logCollection ? 'Recording...' : 'Start Recording'}
                  </button>

                  <div className="flex gap-2">
                    <button
                      onClick={onDownloadLogs}
                      disabled={logCount === 0}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 font-display text-xs uppercase tracking-wide bg-shell-800 hover:bg-shell-700 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Download size={12} />
                      Save
                    </button>
                    <button
                      onClick={onClearLogs}
                      disabled={logCount === 0}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 font-display text-xs uppercase tracking-wide bg-shell-800 hover:bg-crab-900/50 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Trash2 size={12} />
                      Clear
                    </button>
                  </div>
                </div>

                {/* Info panel */}
                <div className="panel-retro p-4 bg-shell-950/50">
                  <h3 className="font-display text-xs text-gray-400 uppercase tracking-wide mb-3">
                    <span className="text-crab-600">❮</span> Gateway Info <span className="text-crab-600">❯</span>
                  </h3>

                  <div className="font-console text-[10px] text-shell-500 space-y-1.5">
                    <div>
                      <span className="text-crab-600">&gt;</span> endpoint: ws://127.0.0.1:18789
                    </div>
                    <div>
                      <span className="text-crab-600">&gt;</span> protocol: v3
                    </div>
                    <div>
                      <span className="text-crab-600">&gt;</span> status: {connected ? (
                        <span className="text-neon-mint">online</span>
                      ) : (
                        <span className="text-crab-400">offline</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Version badge */}
                <div className="flex items-center justify-center gap-2 pt-4">
                  <span className="w-2 h-2 rounded-full bg-neon-mint animate-pulse" />
                  <span className="font-console text-[10px] text-shell-500">
                    crabwalk v{version}
                  </span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
