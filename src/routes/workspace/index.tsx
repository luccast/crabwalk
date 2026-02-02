import { useState, useEffect, useCallback } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { FolderOpen, FolderTree, RefreshCw } from 'lucide-react'
import { trpc } from '~/integrations/trpc/client'
import { CommandNav } from '~/components/navigation'
import {
  FloatingHUD,
  FloatingPanel,
  FloatingInputBar,
  HUDNavSpacer,
  HUDStatusPill,
  HUDIconButton,
} from '~/components/layout'
import {
  MarkdownViewer,
  MobileBottomToolbar,
  MobileFileDrawer,
  MobilePathSheet,
  WorkspaceSidebar,
} from '~/components/workspace'
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
          {/* Geometric loading indicator */}
          <div className="relative w-16 h-16">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 border-2 border-shell-700 border-t-crab-500 rounded-lg"
            />
            <div className="absolute inset-2 bg-shell-900 rounded flex items-center justify-center">
              <FolderTree size={20} className="text-crab-400" />
            </div>
          </div>
          <span className="font-console text-xs text-shell-500 tracking-widest uppercase">
            Loading Workspace
          </span>
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
    <div className="h-screen bg-shell-950 text-white overflow-hidden flex">
      {/* Sidebar - desktop only */}
      {!isMobile && (
        <WorkspaceSidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          entries={rootEntries}
          selectedPath={selectedPath}
          onSelect={handleSelect}
          onLoadDirectory={handleLoadDirectory}
          workspacePath={workspacePath}
          pathValid={pathValid}
          starredPaths={starredPaths}
          onStar={handleStar}
        />
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-shell-950 relative">
        {/* Header Area */}
        <div className="shrink-0 relative z-30">
          <FloatingHUD className="relative z-30 pointer-events-none w-full border-b border-shell-800/50 bg-shell-950/50">
            <div className="flex items-center gap-4 w-full pointer-events-auto">
              <CommandNav className="relative" />

              {/* Left panel - status */}
              <FloatingPanel delay={0.05} position="left">
                <HUDStatusPill
                  status={pathValid ? 'active' : 'inactive'}
                  label={pathValid ? 'WORKSPACE' : 'NO PATH'}
                />
              </FloatingPanel>
            </div>

            {/* Center - path input */}
            <FloatingInputBar
              value={workspacePathInput}
              onChange={setWorkspacePathInput}
              onSubmit={validateAndSetPath}
              placeholder="Enter workspace path..."
              icon={<FolderOpen size={14} />}
              submitDisabled={pathValid && workspacePathInput === workspacePath}
              error={pathError}
              delay={0.1}
            />

            {/* Right panel - actions */}
            <FloatingPanel delay={0.15} position="right">
              <HUDIconButton
                icon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}
                onClick={handleRefresh}
                disabled={!pathValid || loading}
                title="Refresh workspace"
              />
            </FloatingPanel>
          </FloatingHUD>
        </div>

        {/* Content */}
        <div className={`flex-1 relative overflow-hidden ${isMobile ? 'pb-20' : ''}`}>
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
