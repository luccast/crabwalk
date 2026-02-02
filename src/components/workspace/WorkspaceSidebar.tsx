import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FolderTree,
  FolderOpen,
  Folder,
  FileText,
  Star,
  ChevronRight,
  ChevronDown,
  Files,
} from 'lucide-react'
import {
  Sidebar,
  SidebarHeader,
  SidebarSection,
  SidebarContent,
  SidebarItem,
  SidebarFooter,
  SidebarEmpty,
  useSidebar,
} from '~/components/layout'
import type { DirectoryEntry } from '~/lib/workspace-fs'

// ============================================================================
// File size formatter
// ============================================================================

function formatFileSize(bytes: number | undefined): string {
  if (bytes === undefined) return ''
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

// ============================================================================
// File Tree Item (recursive)
// ============================================================================

interface FileTreeItemProps {
  entry: DirectoryEntry
  selectedPath: string | null
  onSelect: (path: string, type: 'file' | 'directory') => void
  onLoadDirectory?: (path: string) => Promise<DirectoryEntry[]>
  level: number
}

function FileTreeItem({
  entry,
  selectedPath,
  onSelect,
  onLoadDirectory,
  level,
}: FileTreeItemProps) {
  const { collapsed: sidebarCollapsed } = useSidebar()
  const [expanded, setExpanded] = useState(false)
  const [children, setChildren] = useState<DirectoryEntry[]>([])
  const [loading, setLoading] = useState(false)

  // Reset children when entry path changes
  useEffect(() => {
    setChildren([])
    setExpanded(false)
  }, [entry.path])

  const isSelected = selectedPath === entry.path
  const isDirectory = entry.type === 'directory'

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
  }, [entry.path, expanded, loadChildren, onSelect, isDirectory])

  // Collapsed mode - show nothing for nested items
  if (sidebarCollapsed && level > 0) return null

  // Collapsed mode - show icon only for root items
  if (sidebarCollapsed) {
    return (
      <SidebarItem
        icon={
          isDirectory ? (
            <Folder size={16} className="text-neon-mint" />
          ) : (
            <FileText
              size={16}
              className={entry.extension === '.md' ? 'text-crab-400' : 'text-shell-500'}
            />
          )
        }
        selected={isSelected}
        onClick={handleClick}
        title={entry.name}
      >
        {null}
      </SidebarItem>
    )
  }

  // Expanded mode
  return (
    <div>
      <button
        onClick={handleClick}
        style={{ paddingLeft: 12 + level * 14 }}
        className={`w-full flex items-center gap-2 py-1.5 pr-3 text-left transition-all duration-150 group rounded-lg my-0.5 ${
          isSelected
            ? 'bg-crab-500/15 border border-crab-500/30'
            : 'hover:bg-shell-800/80 border border-transparent hover:border-shell-700/50'
        }`}
      >
        {/* Chevron for directories */}
        {isDirectory ? (
          <div className="shrink-0 w-4 flex items-center justify-center">
            {loading ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <ChevronRight size={12} className="text-shell-500" />
              </motion.div>
            ) : expanded ? (
              <ChevronDown size={12} className="text-shell-500" />
            ) : (
              <ChevronRight size={12} className="text-shell-500" />
            )}
          </div>
        ) : (
          <span className="w-4" />
        )}

        {/* Icon */}
        {isDirectory ? (
          expanded ? (
            <FolderOpen size={14} className="text-neon-mint shrink-0" />
          ) : (
            <Folder size={14} className="text-neon-mint shrink-0" />
          )
        ) : (
          <FileText
            size={14}
            className={`shrink-0 ${
              entry.extension === '.md' ? 'text-crab-400' : 'text-shell-500'
            }`}
          />
        )}

        {/* Name */}
        <span
          className={`font-console text-xs truncate flex-1 ${
            isSelected ? 'text-crab-400' : 'text-gray-300 group-hover:text-white'
          }`}
        >
          {entry.name}
        </span>

        {/* File size */}
        {!isDirectory && entry.size !== undefined && (
          <span className="font-console text-[9px] text-shell-600 shrink-0">
            {formatFileSize(entry.size)}
          </span>
        )}
      </button>

      {/* Children */}
      <AnimatePresence>
        {expanded && isDirectory && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            {children.length > 0 ? (
              children.map((child) => (
                <FileTreeItem
                  key={child.path}
                  entry={child}
                  selectedPath={selectedPath}
                  onSelect={onSelect}
                  onLoadDirectory={onLoadDirectory}
                  level={level + 1}
                />
              ))
            ) : (
              <div className="py-1" style={{ paddingLeft: 12 + (level + 1) * 14 }}>
                <span className="font-console text-[10px] text-shell-500 italic">Empty</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================================================
// Starred Files Section
// ============================================================================

interface StarredFilesSectionProps {
  starredPaths: Set<string>
  selectedPath: string | null
  onSelect: (path: string, type: 'file' | 'directory') => void
  onUnstar: (path: string) => void
}

function StarredFilesSection({
  starredPaths,
  selectedPath,
  onSelect,
  onUnstar,
}: StarredFilesSectionProps) {
  const { collapsed } = useSidebar()

  if (starredPaths.size === 0) return null

  const starredArray = [...starredPaths]

  if (collapsed) {
    // Show stacked icons in collapsed mode
    return (
      <SidebarSection>
        <div className="flex flex-col items-center gap-1 py-2">
          {starredArray.slice(0, 4).map((filePath) => {
            const fileName = filePath.split('/').pop() || filePath
            const isSelected = selectedPath === filePath
            return (
              <button
                key={filePath}
                onClick={() => onSelect(filePath, 'file')}
                className={`relative p-1.5 rounded-md transition-all ${
                  isSelected ? 'bg-crab-500/20' : 'hover:bg-shell-800/50'
                }`}
                title={fileName}
              >
                <FileText
                  size={14}
                  className={isSelected ? 'text-crab-400' : 'text-shell-500'}
                />
                <Star
                  size={7}
                  fill="currentColor"
                  className="absolute -top-0.5 -right-0.5 text-yellow-400"
                />
              </button>
            )
          })}
          {starredArray.length > 4 && (
            <span className="font-console text-[9px] text-shell-500">
              +{starredArray.length - 4}
            </span>
          )}
        </div>
      </SidebarSection>
    )
  }

  return (
    <SidebarSection title="Starred" badge={starredArray.length}>
      {starredArray.map((filePath) => {
        const fileName = filePath.split('/').pop() || filePath
        const ext = fileName.includes('.') ? '.' + fileName.split('.').pop() : ''
        const isSelected = selectedPath === filePath

        return (
          <div
            key={filePath}
            className={`group flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-all duration-150 rounded-lg my-0.5 ${
              isSelected
                ? 'bg-crab-500/15 border border-crab-500/30'
                : 'hover:bg-shell-800/80 border border-transparent hover:border-shell-700/50'
            }`}
            onClick={() => onSelect(filePath, 'file')}
          >
            <FileText
              size={14}
              className={`shrink-0 ${ext === '.md' ? 'text-crab-400' : 'text-shell-500'}`}
            />
            <span
              className={`font-console text-xs truncate flex-1 ${
                isSelected ? 'text-crab-400' : 'text-gray-300'
              }`}
            >
              {fileName}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onUnstar(filePath)
              }}
              className="text-yellow-400 hover:text-yellow-300 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              title="Unstar"
            >
              <Star size={12} fill="currentColor" />
            </button>
          </div>
        )
      })}
    </SidebarSection>
  )
}

// ============================================================================
// Main Workspace Sidebar
// ============================================================================

interface WorkspaceSidebarProps {
  collapsed: boolean
  onToggle: () => void
  entries: DirectoryEntry[]
  selectedPath: string | null
  onSelect: (path: string, type: 'file' | 'directory') => void
  onLoadDirectory: (path: string) => Promise<DirectoryEntry[]>
  workspacePath: string
  pathValid: boolean
  starredPaths: Set<string>
  onStar: (path: string) => void
}

export function WorkspaceSidebar({
  collapsed,
  onToggle,
  entries,
  selectedPath,
  onSelect,
  onLoadDirectory,
  workspacePath,
  pathValid,
  starredPaths,
  onStar,
}: WorkspaceSidebarProps) {
  const fileCount = entries.filter((e) => e.type === 'file').length
  const folderCount = entries.filter((e) => e.type === 'directory').length

  return (
    <Sidebar collapsed={collapsed} onToggle={onToggle} width={320}>
      <SidebarHeader title="Files" icon={<FolderTree size={16} />} />

      <SidebarContent>
        {/* Starred files */}
        <StarredFilesSection
          starredPaths={starredPaths}
          selectedPath={selectedPath}
          onSelect={onSelect}
          onUnstar={onStar}
        />

        {/* File tree */}
        {pathValid ? (
          <SidebarSection title="Explorer">
            {entries.length > 0 ? (
              entries.map((entry) => (
                <FileTreeItem
                  key={entry.path}
                  entry={entry}
                  selectedPath={selectedPath}
                  onSelect={onSelect}
                  onLoadDirectory={onLoadDirectory}
                  level={0}
                />
              ))
            ) : (
              <SidebarEmpty
                icon={<Files size={18} />}
                title="Empty directory"
                description="This folder has no files"
              />
            )}
          </SidebarSection>
        ) : (
          <SidebarEmpty
            icon={<FolderTree size={18} />}
            title="No workspace"
            description="Enter a path to browse files"
          />
        )}
      </SidebarContent>

      {/* Footer with path info */}
      {pathValid && (
        <SidebarFooter>
          {collapsed ? (
            <div className="flex flex-col items-center gap-1 text-shell-500">
              <span className="font-console text-[10px] tabular-nums">{fileCount}f</span>
              <span className="font-console text-[10px] tabular-nums">{folderCount}d</span>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <p className="font-console text-[10px] text-shell-600 truncate">{workspacePath}</p>
              <div className="flex items-center gap-3 font-console text-[9px] text-shell-500">
                <span>{fileCount} files</span>
                <span>{folderCount} folders</span>
              </div>
            </div>
          )}
        </SidebarFooter>
      )}
    </Sidebar>
  )
}
