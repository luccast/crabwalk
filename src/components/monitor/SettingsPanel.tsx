import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Settings, X, History, Wifi, WifiOff, RefreshCw } from 'lucide-react'

interface SettingsPanelProps {
  connected: boolean
  historicalMode: boolean
  onHistoricalModeChange: (enabled: boolean) => void
  onConnect: () => void
  onDisconnect: () => void
  onRefresh: () => void
}

export function SettingsPanel({
  connected,
  historicalMode,
  onHistoricalModeChange,
  onConnect,
  onDisconnect,
  onRefresh,
}: SettingsPanelProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors"
      >
        <Settings size={18} className="text-gray-300" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 bg-black/50 z-40"
            />
            <motion.div
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300 }}
              className="fixed right-0 top-0 h-full w-80 bg-gray-900 border-l border-gray-700 z-50 p-4"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">Settings</h2>
                <button
                  onClick={() => setOpen(false)}
                  className="p-1 hover:bg-gray-800 rounded"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-6">
                {/* Connection status */}
                <div className="p-3 bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    {connected ? (
                      <Wifi size={16} className="text-green-400" />
                    ) : (
                      <WifiOff size={16} className="text-red-400" />
                    )}
                    <span className="text-sm font-medium">
                      {connected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    {connected ? (
                      <button
                        onClick={onDisconnect}
                        className="flex-1 px-3 py-1.5 text-sm bg-red-600 hover:bg-red-500 rounded"
                      >
                        Disconnect
                      </button>
                    ) : (
                      <button
                        onClick={onConnect}
                        className="flex-1 px-3 py-1.5 text-sm bg-green-600 hover:bg-green-500 rounded"
                      >
                        Connect
                      </button>
                    )}
                    <button
                      onClick={onRefresh}
                      disabled={!connected}
                      className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <RefreshCw size={14} />
                    </button>
                  </div>
                </div>

                {/* Historical mode toggle */}
                <div className="p-3 bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <History size={16} className="text-gray-400" />
                    <span className="text-sm font-medium">Historical Mode</span>
                  </div>
                  <p className="text-xs text-gray-400 mb-3">
                    Load past sessions on connect
                  </p>
                  <button
                    onClick={() => onHistoricalModeChange(!historicalMode)}
                    className={`w-full px-3 py-1.5 text-sm rounded transition-colors ${
                      historicalMode
                        ? 'bg-cyan-600 hover:bg-cyan-500'
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    {historicalMode ? 'Enabled' : 'Disabled'}
                  </button>
                </div>

                {/* Info */}
                <div className="text-xs text-gray-500 p-3 bg-gray-800/50 rounded-lg">
                  <p className="mb-2">
                    <strong>Gateway:</strong> ws://127.0.0.1:18789
                  </p>
                  <p>
                    <strong>Protocol:</strong> v3
                  </p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
