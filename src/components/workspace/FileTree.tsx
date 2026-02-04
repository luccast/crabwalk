import { useState, useCallback, useEffect } from 'react'
import { ChevronRight, ChevronDown, Folder, FolderOpen, FileText, Plus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { DirectoryEntry } from '~/lib/workspace-fs'

// Format file size to human-readable format
function formatFileSize(bytes: number | undefined): string {
  if (bytes === undefined) return ''
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

interface FileTreeProps {
  entries: DirectoryEntry[]
  selectedPath: string | null
  onSelect: (path: string, type: 'file' | 'directory') => void
  onLoadDirectory?: (path: string) => Promise<DirectoryEntry[]>
  onContextMenu?: (e: React.MouseEvent, path: string) => void
  onCreateFile?: (folderPath: string) => void
  level?: number
}

interface FileTreeItemProps {
  entry: DirectoryEntry
  selectedPath: string | null
  onSelect: (path: string, type: 'file' | 'directory') => void
  onLoadDirectory?: (path: string) => Promise<DirectoryEntry[]>
  onContextMenu?: (e: React.MouseEvent, path: string) => void
  onCreateFile?: (folderPath: string) => void
  level: number
}

function FileTreeItem({ entry, selectedPath, onSelect, onLoadDirectory, onContextMenu, onCreateFile, level }: FileTreeItemProps) {
  const [expanded, setExpanded] = useState(false)
  const [children, setChildren] = useState<DirectoryEntry[]>([])
  const [loading, setLoading] = useState(false)

  // Reset children when entry path changes (e.g., on refresh)
  useEffect(() => {
    setChildren([])
    setExpanded(false)
  }, [entry.path])
  const isSelected = selectedPath === entry.path
  const isDirectory = entry.type === 'directory'
  const paddingLeft = level * 16 + 8

  const loadChildren = useCallback(async () => {
    if (!isDirectory || !onLoadDirectory) return
    setLoading(true)
    try {
      const entries = await onLoadDirectory(entry.path)
      setChildren(entries)
    } catch (error) {
      console.error('Failed to load directory:', error)
    } finally {
      setLoading(false)
    }
  }, [entry.path, isDirectory, onLoadDirectory])

  const handleToggle = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation()
      if (isDirectory) {
        if (!expanded) {
          await loadChildren()
          setExpanded(true)
        } else {
          setExpanded(false)
        }
      }
    },
    [expanded, loadChildren, isDirectory]
  )

  const handleClick = useCallback(async () => {
    if (isDirectory) {
      if (!expanded) {
        await loadChildren()
        setExpanded(true)
      } else {
        setExpanded(false)
      }
      onSelect(entry.path, 'directory')
    } else {
      onSelect(entry.path, 'file')
    }
  }, [entry.path, entry.type, expanded, loadChildren, onSelect, isDirectory])

  const handleContextMenuFn = useCallback(
    (e: React.MouseEvent) => {
      if (onContextMenu && entry.type === 'file') {
        onContextMenu(e, entry.path)
      }
    },
    [entry.path, entry.type, onContextMenu]
  )

  return (
    <div>
      <motion.div
        onClick={handleClick}
        onContextMenu={handleContextMenuFn}
        style={{ paddingLeft }}
        className={`group flex items-center gap-2 py-1.5 pr-2 text-left transition-all duration-150 rounded-md mr-1 cursor-pointer ${
          isSelected
            ? 'bg-crab-500/20 text-crab-400 border-l-2 border-crab-400'
            : 'text-gray-300 hover:bg-shell-800 hover:text-gray-100 border-l-2 border-transparent'
        }`}
        whileHover={{ x: 2 }}
        transition={{ duration: 0.1 }}
      >
        {/* Expand/collapse chevron for directories */}
        {isDirectory ? (
          <div
            onClick={handleToggle}
            className="p-0.5 hover:bg-shell-700 rounded transition-colors cursor-pointer"
          >
            {loading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <ChevronRight size={14} className="text-shell-500" />
              </motion.div>
            ) : expanded ? (
              <ChevronDown size={14} className="text-shell-500" />
            ) : (
              <ChevronRight size={14} className="text-shell-500" />
            )}
          </div>
        ) : (
          <span className="w-5" /> // Spacer for alignment
        )}

        {/* Icon */}
        {isDirectory ? (
          expanded ? (
            <FolderOpen size={16} className="text-neon-mint shrink-0" />
          ) : (
            <Folder size={16} className="text-neon-mint shrink-0" />
          )
        ) : (
          <FileText
            size={16}
            className={`shrink-0 ${
              entry.extension === '.md' ? 'text-crab-400' : 'text-shell-500'
            }`}
          />
        )}

        {/* Name */}
        <span
          className={`font-console text-sm truncate flex-1 ${
            isSelected ? 'text-crab-400' : ''
          }`}
        >
          {entry.name}
        </span>

        {/* Metadata for files */}
        {!isDirectory && (
          <span className={`font-console text-[11px] shrink-0 ${isSelected ? 'text-crab-400/70' : 'text-shell-600'}`}>
            {entry.size !== undefined && formatFileSize(entry.size)}
          </span>
        )}

        {/* Add file button for directories */}
        {isDirectory && onCreateFile && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onCreateFile(entry.path)
            }}
            className="p-1 opacity-0 group-hover:opacity-100 hover:bg-shell-700 rounded transition-all shrink-0"
            title="New file in this folder"
          >
            <Plus size={14} className="text-shell-500 hover:text-neon-mint" />
          </button>
        )}
      </motion.div>

      {/* Children */}
      <AnimatePresence>
        {expanded && isDirectory && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {children.length > 0 ? (
              children.map((childEntry) => (
                <FileTreeItem
                  key={childEntry.path}
                  entry={childEntry}
                  selectedPath={selectedPath}
                  onSelect={onSelect}
                  onLoadDirectory={onLoadDirectory}
                  onContextMenu={onContextMenu}
                  onCreateFile={onCreateFile}
                  level={level + 1}
                />
              ))
            ) : (
              <div className="py-1 px-4">
                <span className="font-console text-xs text-shell-500 italic">Empty folder</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function FileTree({ entries, selectedPath, onSelect, onLoadDirectory, onContextMenu, onCreateFile, level = 0 }: FileTreeProps) {
  return (
    <div className="py-1">
      {entries.map((entry) => (
        <FileTreeItem
          key={entry.path}
          entry={entry}
          selectedPath={selectedPath}
          onSelect={onSelect}
          onLoadDirectory={onLoadDirectory}
          onContextMenu={onContextMenu}
          onCreateFile={onCreateFile}
          level={level}
        />
      ))}
    </div>
  )
}

export default FileTree
