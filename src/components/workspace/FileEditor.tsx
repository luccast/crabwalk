import { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText,
  Edit2,
  Save,
  X,
  AlertCircle,
  Check,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'

interface FileEditorProps {
  content: string
  fileName: string
  filePath?: string
  fileSize?: number
  fileModified?: Date
  error?: string
  isStarred?: boolean
  onStar?: (path: string) => void
  onSave?: (content: string, callback: (success: boolean) => void) => void
}

function formatFileSize(bytes: number | undefined): string {
  if (bytes === undefined) return ''
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function formatModifiedDate(date: Date | undefined): string {
  if (!date) return ''
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 30) {
    return d.toLocaleDateString()
  } else if (days > 0) {
    return `${days}d ago`
  } else if (hours > 0) {
    return `${hours}h ago`
  } else if (minutes > 0) {
    return `${minutes}m ago`
  } else {
    return 'just now'
  }
}

function Star({ size = 16, fill = 'none', className = '' }: { size?: number; fill?: string; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

export function FileEditor({
  content,
  fileName,
  filePath,
  fileSize,
  fileModified,
  error,
  isStarred,
  onStar,
  onSave,
}: FileEditorProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(content)
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [lastSavedContent, setLastSavedContent] = useState(content)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const isMarkdown = fileName.toLowerCase().endsWith('.md') || fileName.toLowerCase().endsWith('.markdown')

  // Track previous file path to detect file changes
  const prevFilePathRef = useRef<string | undefined>(filePath)

  // Reset edit state when file changes to prevent saving stale content
  useEffect(() => {
    if (filePath !== prevFilePathRef.current) {
      // File changed - exit edit mode and reset buffer
      setIsEditing(false)
      setEditContent(content)
      setLastSavedContent(content)
      setSaveStatus('idle')
      prevFilePathRef.current = filePath
    } else if (!isEditing && content !== lastSavedContent) {
      // Sync content when not editing and it changed externally
      setEditContent(content)
      setLastSavedContent(content)
    }
  }, [content, isEditing, lastSavedContent, filePath])

  // Track if content has unsaved changes
  const hasUnsavedChanges = editContent !== lastSavedContent

  const handleSave = useCallback(() => {
    if (!onSave || !hasUnsavedChanges) return
    setIsSaving(true)
    setSaveStatus('saving')
    onSave(editContent, (success) => {
      setIsSaving(false)
      if (success) {
        setLastSavedContent(editContent)
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
      } else {
        setSaveStatus('error')
        setTimeout(() => setSaveStatus('idle'), 2000)
      }
    })
  }, [editContent, hasUnsavedChanges, onSave])

  const handleCancel = useCallback(() => {
    setEditContent(lastSavedContent)
    setIsEditing(false)
    setSaveStatus('idle')
  }, [lastSavedContent])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ctrl/Cmd + S to save
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault()
      handleSave()
    }
    // Escape to cancel
    if (e.key === 'Escape') {
      handleCancel()
    }
  }

  // Focus textarea when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [isEditing])

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-16 h-16 rounded-full bg-crab-900/30 flex items-center justify-center border border-crab-700/50">
            <AlertCircle size={32} className="text-crab-400" />
          </div>
          <div>
            <h3 className="font-display text-lg text-crab-400 mb-2">Error Loading File</h3>
            <p className="font-console text-sm text-shell-500 max-w-md">{error}</p>
          </div>
        </motion.div>
      </div>
    )
  }

  if (!content && !fileName) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-16 h-16 rounded-full bg-shell-800/50 flex items-center justify-center border border-shell-700">
            <FileText size={32} className="text-shell-500" />
          </div>
          <div>
            <h3 className="font-display text-lg text-gray-400 mb-2">No File Selected</h3>
            <p className="font-console text-sm text-shell-500 max-w-md">
              Select a file from the sidebar to view its contents
            </p>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* File header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-shell-800 bg-shell-900/50 flex-wrap">
        {/* Star button */}
        {filePath && onStar && (
          <button
            onClick={() => onStar(filePath)}
            className={`p-1 rounded transition-colors ${
              isStarred
                ? 'text-yellow-400 hover:text-yellow-300'
                : 'text-shell-600 hover:text-yellow-400'
            }`}
            title={isStarred ? 'Unstar file' : 'Star file'}
          >
            <Star size={16} fill={isStarred ? 'currentColor' : 'none'} />
          </button>
        )}
        <FileText size={18} className={isMarkdown ? 'text-crab-400' : 'text-shell-500'} />
        <h2 className="font-display text-sm text-gray-200">{fileName}</h2>
        {isMarkdown && (
          <span className="px-2 py-0.5 bg-crab-900/30 text-crab-400 text-[10px] font-console uppercase rounded border border-crab-700/30">
            Markdown
          </span>
        )}
        
        {/* Edit mode indicator */}
        {isEditing && (
          <span className="px-2 py-0.5 bg-neon-mint/10 text-neon-mint text-[10px] font-console uppercase rounded border border-neon-mint/30">
            Editing
          </span>
        )}
        
        {/* Unsaved changes indicator */}
        {isEditing && hasUnsavedChanges && (
          <span className="px-2 py-0.5 bg-neon-peach/10 text-neon-peach text-[10px] font-console uppercase rounded border border-neon-peach/30 animate-pulse">
            Unsaved
          </span>
        )}

        {/* Save status */}
        <AnimatePresence>
          {isEditing && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-1.5"
            >
              {saveStatus === 'saving' && (
                <>
                  <div className="w-2.5 h-2.5 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin" />
                  <span className="font-console text-[10px] text-neon-cyan">Saving...</span>
                </>
              )}
              {saveStatus === 'saved' && (
                <>
                  <Check size={12} className="text-neon-mint" />
                  <span className="font-console text-[10px] text-neon-mint">Saved</span>
                </>
              )}
              {saveStatus === 'error' && (
                <>
                  <AlertCircle size={12} className="text-neon-peach" />
                  <span className="font-console text-[10px] text-neon-peach">Save failed</span>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* File metadata */}
        <div className="flex items-center gap-3 ml-auto">
          {fileSize !== undefined && (
            <span className="font-console text-[10px] text-shell-500">
              {formatFileSize(fileSize)}
            </span>
          )}
          {fileModified && (
            <span className="font-console text-[10px] text-shell-500">
              {formatModifiedDate(fileModified)}
            </span>
          )}
        </div>

        {/* Action buttons */}
        {onSave && (
          <div className="flex items-center gap-1 w-full sm:w-auto mt-2 sm:mt-0">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-shell-800 hover:bg-shell-700 rounded-lg text-sm font-console text-gray-300 transition-colors border border-shell-700"
                title="Edit file (or press E)"
              >
                <Edit2 size={14} />
                <span className="hidden sm:inline">Edit</span>
              </button>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  disabled={isSaving || !hasUnsavedChanges}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-neon-mint/10 hover:bg-neon-mint/20 rounded-lg text-sm font-console text-neon-mint transition-colors border border-neon-mint/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Save (Ctrl+S)"
                >
                  <Save size={14} />
                  <span className="hidden sm:inline">Save</span>
                </button>
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-shell-800 hover:bg-shell-700 rounded-lg text-sm font-console text-gray-300 transition-colors border border-shell-700"
                  title="Cancel (Esc)"
                >
                  <X size={14} />
                  <span className="hidden sm:inline">Cancel</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-[1200px] mx-auto">
          <AnimatePresence mode="wait">
            {isEditing ? (
              <motion.div
                key="editor"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full"
              >
                <textarea
                  ref={textareaRef}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full h-full min-h-[400px] bg-shell-900 border border-shell-700 rounded-lg p-4 font-mono text-sm text-gray-300 placeholder-shell-600 resize-none focus:outline-none focus:border-crab-500 focus:ring-1 focus:ring-crab-500/20 break-words"
                  spellCheck={false}
                  autoCapitalize="off"
                  autoCorrect="off"
                  autoComplete="off"
                />
              </motion.div>
            ) : (
              <motion.div
                key="viewer"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {isMarkdown ? (
                  <div className="prose prose-invert prose-sm max-w-none break-words">
                    <ReactMarkdown
                      components={{
                        h1: ({ children }) => (
                          <h1 className="text-2xl font-display text-crab-400 mb-4 pb-2 border-b border-shell-800">
                            {children}
                          </h1>
                        ),
                        h2: ({ children }) => (
                          <h2 className="text-xl font-display text-neon-mint mt-6 mb-3">{children}</h2>
                        ),
                        h3: ({ children }) => (
                          <h3 className="text-lg font-display text-gray-200 mt-4 mb-2">{children}</h3>
                        ),
                        p: ({ children }) => (
                          <p className="text-gray-300 leading-relaxed mb-4">{children}</p>
                        ),
                        code: ({ children, className }) => {
                          const isInline = !className
                          return isInline ? (
                            <code className="bg-shell-800 text-neon-peach px-1.5 py-0.5 rounded text-sm font-mono">
                              {children}
                            </code>
                          ) : (
                            <pre className="bg-shell-900 border border-shell-800 rounded-lg p-4 overflow-x-auto mb-4">
                              <code className="text-sm font-mono text-gray-300">{children}</code>
                            </pre>
                          )
                        },
                        ul: ({ children }) => (
                          <ul className="list-disc list-inside text-gray-300 mb-4 space-y-1">{children}</ul>
                        ),
                        ol: ({ children }) => (
                          <ol className="list-decimal list-inside text-gray-300 mb-4 space-y-1">{children}</ol>
                        ),
                        li: ({ children }) => <li className="text-gray-300">{children}</li>,
                        a: ({ children, href }) => (
                          <a
                            href={href}
                            className="text-neon-cyan hover:text-neon-mint transition-colors underline"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {children}
                          </a>
                        ),
                        blockquote: ({ children }) => (
                          <blockquote className="border-l-4 border-crab-500 pl-4 italic text-shell-400 mb-4">
                            {children}
                          </blockquote>
                        ),
                        hr: () => <hr className="border-shell-700 my-6" />,
                        table: ({ children }) => (
                          <table className="w-full border-collapse mb-4">{children}</table>
                        ),
                        thead: ({ children }) => (
                          <thead className="bg-shell-800">{children}</thead>
                        ),
                        th: ({ children }) => (
                          <th className="border border-shell-700 px-4 py-2 text-left font-display text-sm text-gray-200">
                            {children}
                          </th>
                        ),
                        td: ({ children }) => (
                          <td className="border border-shell-700 px-4 py-2 text-sm text-gray-300">
                            {children}
                          </td>
                        ),
                      }}
                    >
                      {content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <pre className="font-mono text-sm text-gray-300 whitespace-pre-wrap break-words">{content}</pre>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}

export default FileEditor
