import { motion } from 'framer-motion'
import { PanelLeft, FolderOpen, RefreshCw } from 'lucide-react'

interface MobileBottomToolbarProps {
  onOpenDrawer: () => void
  onOpenPathSheet: () => void
  onRefresh: () => void
  loading: boolean
  pathValid: boolean
}

export function MobileBottomToolbar({
  onOpenDrawer,
  onOpenPathSheet,
  onRefresh,
  loading,
  pathValid,
}: MobileBottomToolbarProps) {
  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="fixed bottom-0 left-0 right-0 z-40 sm:hidden"
    >
      <div className="bg-shell-900 border-t border-shell-800 px-4 py-3 pb-safe">
        <div className="flex items-center justify-around">
          {/* Files button */}
          <button
            onClick={onOpenDrawer}
            className="flex flex-col items-center gap-1 p-3 min-w-[64px] min-h-[48px] rounded-lg active:bg-shell-800 text-gray-400 active:text-crab-400 transition-colors"
          >
            <PanelLeft size={24} />
            <span className="font-console text-[10px]">Files</span>
          </button>

          {/* Path button */}
          <button
            onClick={onOpenPathSheet}
            className={`flex flex-col items-center gap-1 p-3 min-w-[64px] min-h-[48px] rounded-lg active:bg-shell-800 transition-colors ${
              pathValid ? 'text-crab-400' : 'text-gray-400 active:text-crab-400'
            }`}
          >
            <FolderOpen size={24} />
            <span className="font-console text-[10px]">Path</span>
          </button>

          {/* Refresh button */}
          <button
            onClick={onRefresh}
            disabled={!pathValid || loading}
            className="flex flex-col items-center gap-1 p-3 min-w-[64px] min-h-[48px] rounded-lg active:bg-shell-800 text-gray-400 active:text-crab-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <RefreshCw size={24} className={loading ? 'animate-spin' : ''} />
            <span className="font-console text-[10px]">Refresh</span>
          </button>
        </div>
      </div>
    </motion.div>
  )
}
