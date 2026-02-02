import { motion, AnimatePresence } from 'framer-motion'
import { X, FileText, Star } from 'lucide-react'
import { FileTree } from './FileTree'
import type { DirectoryEntry } from '~/lib/workspace-fs'

interface MobileFileDrawerProps {
  open: boolean
  onClose: () => void
  entries: DirectoryEntry[]
  selectedPath: string | null
  starredPaths: Set<string>
  workspacePath: string
  pathValid: boolean
  onSelect: (path: string, type: 'file' | 'directory') => void
  onLoadDirectory: (path: string) => Promise<DirectoryEntry[]>
  onStar: (path: string) => void
}

export function MobileFileDrawer({
  open,
  onClose,
  entries,
  selectedPath,
  starredPaths,
  workspacePath,
  pathValid,
  onSelect,
  onLoadDirectory,
  onStar,
}: MobileFileDrawerProps) {
  // Handle file select with auto-close
  const handleSelect = (path: string, type: 'file' | 'directory') => {
    onSelect(path, type)
    if (type === 'file') {
      onClose()
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-y-0 left-0 w-full max-w-[85vw] bg-shell-900 z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-shell-800">
              <span className="font-display text-sm text-crab-400 uppercase tracking-wider">
                Files
              </span>
              <button
                onClick={onClose}
                className="p-2 -mr-2 hover:bg-shell-800 rounded-lg transition-colors"
              >
                <X size={24} className="text-gray-400" />
              </button>
            </div>

            {/* Starred files section */}
            {starredPaths.size > 0 && (
              <div className="border-b border-shell-800 py-2">
                {[...starredPaths].map((filePath) => {
                  const fileName = filePath.split('/').pop() || filePath
                  const ext = fileName.includes('.') ? '.' + fileName.split('.').pop() : ''
                  const isSelected = selectedPath === filePath
                  return (
                    <div
                      key={filePath}
                      className={`group flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-crab-500/20 text-crab-400'
                          : 'text-gray-300 active:bg-shell-800'
                      }`}
                      onClick={() => handleSelect(filePath, 'file')}
                    >
                      <FileText
                        size={18}
                        className={`shrink-0 ${
                          ext === '.md' ? 'text-crab-400' : 'text-shell-500'
                        }`}
                      />
                      <span className="font-console text-sm truncate flex-1">
                        {fileName}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onStar(filePath)
                        }}
                        className="text-yellow-400 active:text-yellow-300 shrink-0 p-1"
                      >
                        <Star size={16} fill="currentColor" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* File tree */}
            <div className="flex-1 overflow-auto py-2">
              {pathValid ? (
                <FileTree
                  entries={entries}
                  selectedPath={selectedPath}
                  onSelect={handleSelect}
                  onLoadDirectory={onLoadDirectory}
                />
              ) : (
                <div className="p-4 text-center">
                  <p className="font-console text-xs text-shell-500">
                    Set a workspace path to browse files
                  </p>
                </div>
              )}
            </div>

            {/* Footer with path */}
            {pathValid && (
              <div className="px-4 py-3 border-t border-shell-800 bg-shell-950/50">
                <p className="font-console text-[10px] text-shell-600 truncate">
                  {workspacePath}
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
