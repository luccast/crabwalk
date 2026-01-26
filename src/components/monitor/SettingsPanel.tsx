import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Settings, X, History, Wifi, WifiOff, RefreshCw, Terminal, Download, Trash2, Database } from 'lucide-react'

interface SettingsPanelProps {
  connected: boolean
  historicalMode: boolean
  debugMode: boolean
  logCollection: boolean
  logCount: number
  onHistoricalModeChange: (enabled: boolean) => void
  onDebugModeChange: (enabled: boolean) => void
  onLogCollectionChange: (enabled: boolean) => void
  onDownloadLogs: () => void
  onClearLogs: () => void
  onConnect: () => void
  onDisconnect: () => void
  onRefresh: () => void
}

export function SettingsPanel({
  connected,
  historicalMode,
  debugMode,
  logCollection,
  logCount,
  onHistoricalModeChange,
  onDebugModeChange,
  onLogCollectionChange,
  onDownloadLogs,
  onClearLogs,
  onConnect,
  onDisconnect,
  onRefresh,
}: SettingsPanelProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-2.5 bg-shell-800 hover:bg-shell-700 rounded-lg border-2 border-shell-700 hover:border-shell-600 transition-all group"
      >
        <Settings size={16} className="text-gray-400 group-hover:text-crab-400 transition-colors" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 h-full w-80 bg-shell-900 border-l-2 border-shell-700 z-50 p-5 overflow-y-auto"
            >
              {/* Texture overlay */}
              <div className="absolute inset-0 texture-scanlines pointer-events-none opacity-30" />

              {/* Header */}
              <div className="relative flex items-center justify-between mb-3">
                <h2 className="font-mono uppercase text-sm text-crab-400 glow-red tracking-wider">
                  SETTINGS
                </h2>
                <button
                  onClick={() => setOpen(false)}
                  className="p-2 hover:bg-shell-800 rounded-lg border border-transparent hover:border-shell-600 transition-all"
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
                        className="flex-1 px-4 py-2 font-display text-xs uppercase tracking-wide bg-crab-600 hover:bg-crab-500 border-2 border-crab-500 rounded-lg transition-all"
                        style={{ boxShadow: '0 2px 0 0 #991b1b' }}
                      >
                        Disconnect
                      </button>
                    ) : (
                      <button
                        onClick={onConnect}
                        className="flex-1 px-4 py-2 font-display text-xs uppercase tracking-wide bg-neon-mint/20 hover:bg-neon-mint/30 border-2 border-neon-mint/50 text-neon-mint rounded-lg transition-all"
                      >
                        Connect
                      </button>
                    )}
                    <button
                      onClick={onRefresh}
                      disabled={!connected}
                      className="px-3 py-2 bg-shell-800 hover:bg-shell-700 border-2 border-shell-700 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <RefreshCw size={14} className="text-gray-400" />
                    </button>
                  </div>
                </div>

                {/* Historical mode toggle */}
                <div className="panel-retro p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <History size={18} className="text-shell-500" />
                    <span className="font-display text-sm font-medium text-gray-200 uppercase tracking-wide">
                      Historical Mode
                    </span>
                  </div>

                  <p className="font-console text-[10px] text-shell-500 mb-4">
                    <span className="text-crab-600">&gt;</span> load past sessions on connect
                  </p>

                  <button
                    onClick={() => onHistoricalModeChange(!historicalMode)}
                    className={`w-full px-4 py-2 font-display text-xs uppercase tracking-wide rounded-lg border-2 transition-all ${
                      historicalMode
                        ? 'bg-crab-600 border-crab-500 text-white box-glow-red'
                        : 'bg-shell-800 border-shell-700 text-gray-400 hover:border-shell-600'
                    }`}
                  >
                    {historicalMode ? 'Enabled' : 'Disabled'}
                  </button>
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
                    className={`w-full px-4 py-2 font-display text-xs uppercase tracking-wide rounded-lg border-2 transition-all ${
                      debugMode
                        ? 'bg-neon-lavender/30 border-neon-lavender/50 text-neon-lavender'
                        : 'bg-shell-800 border-shell-700 text-gray-400 hover:border-shell-600'
                    }`}
                  >
                    {debugMode ? 'Enabled' : 'Disabled'}
                  </button>
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
                    className={`w-full px-4 py-2 font-display text-xs uppercase tracking-wide rounded-lg border-2 transition-all mb-2 ${
                      logCollection
                        ? 'bg-neon-mint/20 border-neon-mint/50 text-neon-mint'
                        : 'bg-shell-800 border-shell-700 text-gray-400 hover:border-shell-600'
                    }`}
                  >
                    {logCollection ? 'Recording...' : 'Start Recording'}
                  </button>

                  <div className="flex gap-2">
                    <button
                      onClick={onDownloadLogs}
                      disabled={logCount === 0}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 font-display text-xs uppercase tracking-wide bg-shell-800 hover:bg-shell-700 border-2 border-shell-700 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Download size={12} />
                      Save
                    </button>
                    <button
                      onClick={onClearLogs}
                      disabled={logCount === 0}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 font-display text-xs uppercase tracking-wide bg-shell-800 hover:bg-crab-900/50 border-2 border-shell-700 hover:border-crab-700 rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
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
                    crabwalk v1.0.1
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
