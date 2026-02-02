import { motion } from 'framer-motion'
import { PanelLeft, Settings, Trash2 } from 'lucide-react'
import { StatusIndicator } from './StatusIndicator'

interface MobileMonitorToolbarProps {
  onOpenDrawer: () => void
  onOpenSettings: () => void
  connected: boolean
  connecting: boolean
  sessionCount: number
  actionCount: number
  completedCount: number
  onClearCompleted: () => void
}

export function MobileMonitorToolbar({
  onOpenDrawer,
  onOpenSettings,
  connected,
  connecting,
  sessionCount,
  actionCount,
  completedCount,
  onClearCompleted,
}: MobileMonitorToolbarProps) {
  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="fixed bottom-0 left-0 right-0 z-40 sm:hidden"
    >
      <div className="bg-shell-900 border-t border-shell-800 px-3 pt-3 pb-3.5">
        <div className="flex items-center gap-2">
          {/* Sessions button */}
          <button
            onClick={onOpenDrawer}
            className="relative p-3 min-w-[48px] min-h-[48px] rounded-lg active:bg-shell-800 text-gray-400 active:text-crab-400 transition-colors"
          >
            <PanelLeft size={22} />
            {sessionCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-crab-600 text-white text-[10px] font-display rounded-full">
                {sessionCount > 99 ? '99+' : sessionCount}
              </span>
            )}
          </button>

          {/* Stats display */}
          <div className="flex-1 flex items-center justify-center gap-4 px-3 py-2 bg-shell-800/50 rounded-lg min-h-[44px]">
            <div className="flex items-center gap-2">
              <StatusIndicator status={connecting ? 'thinking' : connected ? 'active' : 'idle'} size="sm" />
              <span className="font-console text-xs text-shell-400">
                {connecting ? 'connecting' : connected ? 'connected' : 'offline'}
              </span>
            </div>
            <div className="w-px h-4 bg-shell-700" />
            <div className="flex items-center gap-1.5">
              <span className="font-display text-sm text-neon-peach">{actionCount}</span>
              <span className="font-console text-[10px] text-shell-500 uppercase">acts</span>
            </div>
          </div>

          {/* Clear completed button */}
          {completedCount > 0 && (
            <button
              onClick={onClearCompleted}
              className="relative p-3 min-w-[48px] min-h-[48px] rounded-lg active:bg-shell-800 text-gray-400 active:text-crab-400 transition-colors"
            >
              <Trash2 size={22} />
              <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-shell-700 text-shell-300 text-[10px] font-display rounded-full">
                {completedCount > 99 ? '99+' : completedCount}
              </span>
            </button>
          )}

          {/* Settings button */}
          <button
            onClick={onOpenSettings}
            className="p-3 min-w-[48px] min-h-[48px] rounded-lg active:bg-shell-800 text-gray-400 active:text-crab-400 transition-colors"
          >
            <Settings size={22} />
          </button>
        </div>
      </div>
    </motion.div>
  )
}
