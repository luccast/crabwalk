import { useState, useEffect, useCallback } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  FolderOpen,
  RefreshCw,
  AlertCircle,
  PanelLeft,
  PanelLeftClose,
  Star,
  FileText,
} from 'lucide-react'
import { trpc } from '~/integrations/trpc/client'
import {
  FileTree,
  MarkdownViewer,
  MobileBottomToolbar,
  MobileFileDrawer,
  MobilePathSheet,
} from '~/components/workspace'
import { NavTabs } from '~/components/navigation'
import { CrabIdleAnimation } from '~/components/ani'
import { useIsMobile } from '~/hooks/useIsMobile'
import type { DirectoryEntry } from '~/lib/workspace-fs'

// Get parent directory path using path separator logic
// Works cross-platform for both / and \ separators
function getParentDirPath(filePath: string): string {
  // Normalize to forward slashes for consistent processing
  const normalized = filePath.replace(/\\/g, '/')
  const lastSlashIndex = normalized.lastIndexOf('/')
  if (lastSlashIndex <= 0) {
    return filePath
  }
  // Return the original path up to the last separator
  return filePath.substring(0, lastSlashIndex)
}

export const Route = createFileRoute('/workspace/')({
  component: WorkspacePageWrapper,
})

// Wrapper to ensure client-only rendering
function WorkspacePageWrapper() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return (
      <div className="h-screen flex items-center justify-center bg-shell-950 text-white">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="crab-icon-glow">
            <CrabIdleAnimation className="w-16 h-16" />
          </div>
          <div className="flex items-center gap-3">
            <span className="font-display text-sm text-gray-400 tracking-wide uppercase">
              Loading Workspace...
            </span>
          </div>
        </motion.div>
      </div>
    )
  }

  return <WorkspacePage />
}

function WorkspacePage() {
  // Workspace path state
  const [workspacePath, setWorkspacePath] = useState('')
  const [workspacePathInput, setWorkspacePathInput] = useState('')
  const [pathError, setPathError] = useState<string | null>(null)
  const [pathValid, setPathValid] = useState(false)

  // File tree state
  const [loading, setLoading] = useState(false)
  const [pathCache, setPathCache] = useState<Map<string, DirectoryEntry[]>>(new Map())

  // Selected file state
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [selectedFileContent, setSelectedFileContent] = useState('')
  const [selectedFileName, setSelectedFileName] = useState('')
  const [selectedFileSize, setSelectedFileSize] = useState<number | undefined>()
  const [selectedFileModified, setSelectedFileModified] = useState<Date | undefined>()
  const [fileError, setFileError] = useState<string | undefined>()

  // Sidebar collapse state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  // Starred files state
  const [starredPaths, setStarredPaths] = useState<Set<string>>(new Set())

  // Mobile state
  const isMobile = useIsMobile()
  const [fileDrawerOpen, setFileDrawerOpen] = useState(false)
  const [pathSheetOpen, setPathSheetOpen] = useState(false)

  // Root entries for FileTree
  const rootEntries = workspacePath && pathValid ? (pathCache.get(workspacePath) || []) : []

  // Load saved path and starred files on mount
  useEffect(() => {
    const savedPath = localStorage.getItem('crabcrawl:workspacePath')
    if (savedPath) {
      setWorkspacePathInput(savedPath)
      // Auto-validate saved path
      validatePathAndSet(savedPath)
    } else {
      loadDefaultPath()
    }

    // Load starred files
    const savedStarred = localStorage.getItem('crabcrawl:starredFiles')
    if (savedStarred) {
      try {
        const parsed = JSON.parse(savedStarred)
        setStarredPaths(new Set(parsed))
      } catch {
        // ignore invalid JSON
      }
    }
  }, [])

  // Load entries when workspace path changes and is valid
  useEffect(() => {
    if (workspacePath && pathValid) {
      loadDirectory(workspacePath)
    }
  }, [workspacePath, pathValid])

  const loadDefaultPath = async () => {
    try {
      const result = await trpc.workspace.getDefaultPath.query()
      setWorkspacePathInput(result.path)
      // Don't auto-set workspace path - let user confirm
    } catch (error) {
      console.error('Failed to get default path:', error)
    }
  }

  const validatePathAndSet = async (pathToValidate: string) => {
    setPathError(null)
    setPathValid(false)

    if (!pathToValidate.trim()) {
      setPathError('Please enter a path')
      return
    }

    try {
      const result = await trpc.workspace.validatePath.query({
        path: pathToValidate,
      })

      if (result.valid && result.expandedPath) {
        // Use the expanded path (e.g., ~/Documents -> /home/user/Documents)
        setWorkspacePath(result.expandedPath)
        setWorkspacePathInput(result.expandedPath)
        setPathValid(true)
        // Persist to localStorage
        localStorage.setItem('crabcrawl:workspacePath', result.expandedPath)
        // Clear cache when path changes
        setPathCache(new Map())
        setSelectedPath(null)
        setSelectedFileContent('')
        setSelectedFileName('')
      } else {
        setPathError(result.error || 'Invalid path')
      }
    } catch (error) {
      setPathError(error instanceof Error ? error.message : 'Failed to validate path')
    }
  }

  const validateAndSetPath = async () => {
    await validatePathAndSet(workspacePathInput)
  }

  const loadDirectory = async (dirPath: string): Promise<DirectoryEntry[]> => {
    // Check cache first
    if (pathCache.has(dirPath)) {
      return pathCache.get(dirPath)!
    }

    setLoading(true)
    try {
      const result = await trpc.workspace.listDirectory.query({
        workspaceRoot: workspacePath,
        path: dirPath,
      })

      if (result.error) {
        throw new Error(result.error)
      }

      // Update cache
      setPathCache((prev) => new Map(prev).set(dirPath, result.entries))
      return result.entries
    } catch (error) {
      console.error('Failed to load directory:', error)
      return []
    } finally {
      setLoading(false)
    }
  }

  const loadFile = useCallback(
    async (filePath: string) => {
      setFileError(undefined)
      try {
        const result = await trpc.workspace.readFile.query({
          workspaceRoot: workspacePath,
          path: filePath,
        })

        if (result.error) {
          setFileError(result.error)
          setSelectedFileContent('')
          setSelectedFileName('')
          setSelectedFileSize(undefined)
          setSelectedFileModified(undefined)
        } else {
          setSelectedFileContent(result.content)
          setSelectedFileName(result.name)
          // Get file metadata from the parent directory entry if available
          const parentDir = pathCache.get(getParentDirPath(filePath) || workspacePath)
          const fileEntry = parentDir?.find(e => e.path === filePath)
          setSelectedFileSize(fileEntry?.size)
          setSelectedFileModified(fileEntry?.modifiedAt)
        }
      } catch (error) {
        setFileError(error instanceof Error ? error.message : 'Failed to read file')
        setSelectedFileContent('')
        setSelectedFileName('')
        setSelectedFileSize(undefined)
        setSelectedFileModified(undefined)
      }
    },
    [workspacePath, pathCache, selectedPath]
  )

  const handleSelect = useCallback(
    async (path: string, type: 'file' | 'directory') => {
      if (type === 'file') {
        setSelectedPath(path)
        await loadFile(path)
      }
      // Note: directory expansion is handled by FileTree component internally
    },
    [loadFile]
  )

  // Handle directory loading for FileTree
  const handleLoadDirectory = useCallback(
    async (dirPath: string): Promise<DirectoryEntry[]> => {
      return loadDirectory(dirPath)
    },
    [workspacePath]
  )

  const handleRefresh = useCallback(async () => {
    if (!workspacePath || !pathValid) return

    // Store current selection before clearing cache
    const currentSelectedPath = selectedPath

    // Clear cache first, then reload
    // Use a callback to ensure cache is cleared before loading
    setPathCache(new Map())

    // Small delay to ensure React has processed the state update
    // before we try to load the directory
    await new Promise(resolve => setTimeout(resolve, 0))

    // Reload root directory - this will repopulate the file tree
    // Force reload by bypassing cache check
    setLoading(true)
    try {
      const result = await trpc.workspace.listDirectory.query({
        workspaceRoot: workspacePath,
        path: workspacePath,
      })

      if (result.error) {
        throw new Error(result.error)
      }

      // Update cache with fresh data
      setPathCache(new Map([[workspacePath, result.entries]]))
    } catch (error) {
      console.error('Failed to load directory:', error)
    } finally {
      setLoading(false)
    }

    // Reload selected file if any (with error handling for deleted files)
    if (currentSelectedPath) {
      try {
        const result = await trpc.workspace.readFile.query({
          workspaceRoot: workspacePath,
          path: currentSelectedPath,
        })

        if (result.error) {
          // File no longer exists - clear selection gracefully
          setSelectedPath(null)
          setSelectedFileContent('')
          setSelectedFileName('')
          setSelectedFileSize(undefined)
          setSelectedFileModified(undefined)
          setFileError(result.error)
        } else {
          setSelectedFileContent(result.content)
          setSelectedFileName(result.name)
          // Get file metadata from the parent directory entry if available
          const parentDir = pathCache.get(getParentDirPath(currentSelectedPath) || workspacePath)
          const fileEntry = parentDir?.find(e => e.path === currentSelectedPath)
          setSelectedFileSize(fileEntry?.size)
          setSelectedFileModified(fileEntry?.modifiedAt)
        }
      } catch (error) {
        // File no longer exists - clear selection gracefully
        setSelectedPath(null)
        setSelectedFileContent('')
        setSelectedFileName('')
        setSelectedFileSize(undefined)
        setSelectedFileModified(undefined)
        setFileError(error instanceof Error ? error.message : 'Failed to read file')
      }
    }
  }, [workspacePath, pathValid, selectedPath, loadFile])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      validateAndSetPath()
    }
  }

  // Handle starring/unstarring files
  const handleStar = useCallback((filePath: string) => {
    setStarredPaths((prev) => {
      const next = new Set(prev)
      if (next.has(filePath)) {
        next.delete(filePath)
      } else {
        next.add(filePath)
      }
      // Persist to localStorage
      localStorage.setItem('crabcrawl:starredFiles', JSON.stringify([...next]))
      return next
    })
  }, [])



  return (
    <div className="h-screen flex flex-col bg-shell-950 text-white overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-shell-900 relative">
        {/* Gradient accent */}
        <div className="absolute inset-0 bg-linear-to-r from-crab-950/20 via-transparent to-transparent pointer-events-none" />

        <div className="relative flex items-center gap-4">
          <Link
            to="/"
            className="p-2 hover:bg-shell-800 rounded-lg transition-all border border-transparent hover:border-shell-600 group"
          >
            <ArrowLeft size={18} className="text-gray-400 group-hover:text-crab-400" />
          </Link>

          {/* Navigation tabs */}
          <NavTabs />
        </div>

        {/* Path input - desktop only */}
        <div className="hidden sm:flex relative items-center gap-2 flex-1 max-w-2xl mx-4">
          <div className="flex-1 relative">
            <FolderOpen size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-shell-500 pointer-events-none" />
            <input
              type="text"
              value={workspacePathInput}
              onChange={(e) => setWorkspacePathInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter workspace path..."
              className="w-full bg-shell-800 border border-shell-700 rounded-lg pl-9 pr-3 py-1.5 text-sm font-console text-gray-200 placeholder-shell-500 focus:outline-none focus:border-crab-500 focus:ring-1 focus:ring-crab-500/20"
            />
          </div>
          <button
            onClick={validateAndSetPath}
            disabled={pathValid && workspacePathInput === workspacePath}
            className={`px-3 py-1.5 text-sm font-display rounded-lg transition-colors shrink-0 ${
              pathValid && workspacePathInput === workspacePath
                ? 'bg-shell-800 text-shell-500 cursor-default'
                : 'bg-crab-600 hover:bg-crab-500 text-white'
            }`}
          >
            Open
          </button>

          {pathError && (
            <div className="absolute top-full left-0 right-0 mt-2 px-3 py-2 bg-crab-900/90 border border-crab-700 rounded-lg flex items-center gap-2 z-50">
              <AlertCircle size={14} className="text-crab-400" />
              <span className="text-xs text-crab-200 font-console">{pathError}</span>
            </div>
          )}
        </div>

        {/* Refresh button - desktop only */}
        <div className="hidden sm:flex relative items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={!pathValid || loading}
            className="p-2 hover:bg-shell-800 rounded-lg transition-all border border-transparent hover:border-shell-600 disabled:opacity-50 disabled:cursor-not-allowed group"
            title="Refresh"
          >
            <RefreshCw
              size={18}
              className={`text-gray-400 group-hover:text-crab-400 ${loading ? 'animate-spin' : ''}`}
            />
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - desktop only */}
        {!isMobile && (
          <motion.div
            initial={false}
            animate={{ width: sidebarCollapsed ? 56 : 320 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="border-r border-shell-800 bg-shell-900/50 flex flex-col overflow-hidden"
          >
          {/* Sidebar header */}
          <div className={`flex items-center justify-between px-3 py-3 border-b border-shell-800 ${sidebarCollapsed ? 'justify-center' : ''}`}>
            {!sidebarCollapsed && (
              <span className="font-display text-xs text-shell-500 uppercase tracking-wider">
                Files
              </span>
            )}
            <div className={`flex items-center gap-2 ${sidebarCollapsed ? 'mx-auto' : ''}`}>
              {loading && !sidebarCollapsed && (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <RefreshCw size={14} className="text-shell-500" />
                </motion.div>
              )}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-1.5 hover:bg-shell-800 rounded transition-colors"
                title={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
              >
                {sidebarCollapsed ? (
                  <PanelLeft size={16} className="text-gray-400 hover:text-crab-400" />
                ) : (
                  <PanelLeftClose size={16} className="text-shell-500 hover:text-crab-400" />
                )}
              </button>
            </div>
          </div>

          {/* Starred files section */}
          {starredPaths.size > 0 && (
            <>
              {sidebarCollapsed ? (
                // Collapsed: stacked file icons
                <div className="flex flex-col items-center gap-1 py-2 border-b border-shell-800">
                  {[...starredPaths].slice(0, 5).map((filePath) => {
                    const fileName = filePath.split('/').pop() || filePath
                    const isSelected = selectedPath === filePath
                    return (
                      <button
                        key={filePath}
                        onClick={() => handleSelect(filePath, 'file')}
                        className={`relative p-1.5 rounded transition-colors ${
                          isSelected ? 'bg-crab-500/20' : 'hover:bg-shell-800'
                        }`}
                        title={fileName}
                      >
                        <FileText
                          size={16}
                          className={isSelected ? 'text-crab-400' : 'text-shell-500'}
                        />
                        <Star
                          size={8}
                          fill="currentColor"
                          className="absolute -top-0.5 -right-0.5 text-yellow-400"
                        />
                      </button>
                    )
                  })}
                  {starredPaths.size > 5 && (
                    <span className="text-[10px] text-shell-500">+{starredPaths.size - 5}</span>
                  )}
                </div>
              ) : (
                // Expanded: starred files list
                <div className="border-b border-shell-800 py-2">
                  {[...starredPaths].map((filePath) => {
                    const fileName = filePath.split('/').pop() || filePath
                    const ext = fileName.includes('.') ? '.' + fileName.split('.').pop() : ''
                    const isSelected = selectedPath === filePath
                    return (
                      <div
                        key={filePath}
                        className={`group flex items-center gap-2 px-4 py-1.5 cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-crab-500/20 text-crab-400'
                            : 'text-gray-300 hover:bg-shell-800 hover:text-gray-100'
                        }`}
                        onClick={() => handleSelect(filePath, 'file')}
                      >
                        <FileText
                          size={14}
                          className={`flex-shrink-0 ${
                            ext === '.md' ? 'text-crab-400' : 'text-shell-500'
                          }`}
                        />
                        <span className="font-console text-sm truncate flex-1">
                          {fileName}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleStar(filePath)
                          }}
                          className="text-yellow-400 hover:text-yellow-300 flex-shrink-0"
                          title="Unstar file"
                        >
                          <Star size={14} fill="currentColor" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {/* File tree */}
          {!sidebarCollapsed && (
            <div className="flex-1 overflow-y-auto overflow-x-hidden py-2">
              {pathValid ? (
                <FileTree
                  entries={rootEntries}
                  selectedPath={selectedPath}
                  onSelect={handleSelect}
                  onLoadDirectory={handleLoadDirectory}
                />
              ) : (
                <div className="p-4 text-center">
                  <p className="font-console text-xs text-shell-500">
                    Enter a workspace path to browse files
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Sidebar footer */}
          {pathValid && !sidebarCollapsed && (
            <div className="px-4 py-2 border-t border-shell-800">
              <p className="font-console text-[10px] text-shell-600 truncate">
                {workspacePath}
              </p>
            </div>
          )}
        </motion.div>
        )}

        {/* Main content area */}
        <div className={`flex-1 relative bg-shell-950 ${isMobile ? 'pb-20' : ''}`}>
          <MarkdownViewer
            content={selectedFileContent}
            fileName={selectedFileName}
            filePath={selectedPath ?? undefined}
            fileSize={selectedFileSize}
            fileModified={selectedFileModified}
            error={fileError}
            isStarred={selectedPath ? starredPaths.has(selectedPath) : false}
            onStar={handleStar}
          />
        </div>
      </div>

      {/* Mobile components */}
      {isMobile && (
        <>
          <MobileBottomToolbar
            onOpenDrawer={() => setFileDrawerOpen(true)}
            onOpenPathSheet={() => setPathSheetOpen(true)}
            onRefresh={handleRefresh}
            loading={loading}
            pathValid={pathValid}
            currentPath={workspacePathInput}
          />
          <MobileFileDrawer
            open={fileDrawerOpen}
            onClose={() => setFileDrawerOpen(false)}
            entries={rootEntries}
            selectedPath={selectedPath}
            starredPaths={starredPaths}
            workspacePath={workspacePath}
            pathValid={pathValid}
            onSelect={handleSelect}
            onLoadDirectory={handleLoadDirectory}
            onStar={handleStar}
          />
          <MobilePathSheet
            open={pathSheetOpen}
            onClose={() => setPathSheetOpen(false)}
            initialPath={workspacePathInput}
            validatedPath={workspacePath}
            pathValid={pathValid}
            pathError={pathError}
            onValidate={async (path) => {
              await validatePathAndSet(path)
              return pathValid
            }}
          />
        </>
      )}
    </div>
  )
}
