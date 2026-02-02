import { motion } from 'framer-motion'
import { PanelLeft, FolderOpen, RefreshCw } from 'lucide-react'

interface MobileBottomToolbarProps {
  onOpenDrawer: () => void
  onOpenPathSheet: () => void
  onRefresh: () => void
  loading: boolean
  pathValid: boolean
  currentPath: string
}

export function MobileBottomToolbar({
  onOpenDrawer,
  onOpenPathSheet,
  onRefresh,
  loading,
  pathValid,
  currentPath,
}: MobileBottomToolbarProps) {
  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="fixed bottom-0 left-0 right-0 z-40 sm:hidden"
    >
      <div className="bg-shell-900 border-t border-shell-800 px-3 pt-3 pb-3.5">
        <div className="flex items-center gap-2">
          {/* Files button */}
          <button
            onClick={onOpenDrawer}
            className="shrink-0 p-3 min-w-[48px] min-h-[48px] rounded-lg active:bg-shell-800 text-gray-400 active:text-crab-400 transition-colors"
          >
            <PanelLeft size={22} />
          </button>

          {/* Path input field */}
          <button
            onClick={onOpenPathSheet}
            className="flex-1 min-w-0 flex items-center gap-2 px-3 py-2.5 bg-shell-800 border border-shell-700 rounded-lg active:border-crab-500 transition-colors min-h-[44px] overflow-hidden"
          >
            <FolderOpen size={16} className={pathValid ? 'text-crab-400 shrink-0' : 'text-shell-500 shrink-0'} />
            <span className={`font-console text-sm truncate text-left ${currentPath ? 'text-gray-200' : 'text-shell-500'}`}>
              {currentPath || 'Set workspace path...'}
            </span>
          </button>

          {/* Refresh button */}
          <button
            onClick={onRefresh}
            disabled={!pathValid || loading}
            className="shrink-0 p-3 min-w-[48px] min-h-[48px] rounded-lg active:bg-shell-800 text-gray-400 active:text-crab-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <RefreshCw size={22} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>
    </motion.div>
  )
}
