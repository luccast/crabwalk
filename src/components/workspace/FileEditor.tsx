import { useState, useCallback, useEffect, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText,
  Edit2,
  AlertCircle,
  Check,
  Copy,
  Layout,
  Star,
} from 'lucide-react'
import Editor from 'react-simple-code-editor'
import Prism from 'prismjs'

// Import Prism components
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-markdown'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-yaml'
import 'prismjs/components/prism-sql'
import 'prismjs/components/prism-rust'

// Import Prism theme - we'll use a modified dark theme
import 'prismjs/themes/prism-tomorrow.css'

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

const formatFileSize = (bytes: number | undefined): string => {
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

const getLanguage = (filename: string): string => {
  if (!filename) return 'text'
  const ext = filename.split('.').pop()?.toLowerCase() || ''
  const langMap: Record<string, string> = {
    'js': 'javascript',
    'ts': 'typescript',
    'jsx': 'javascript',
    'tsx': 'typescript',
    'py': 'python',
    'md': 'markdown',
    'json': 'json',
    'sh': 'bash',
    'bash': 'bash',
    'yaml': 'yaml',
    'yml': 'yaml',
    'sql': 'sql',
    'rs': 'rust',
  }
  return langMap[ext] || 'text'
}

export const FileEditor = memo(function FileEditor({
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

  const language = getLanguage(fileName)
  const isMarkdown = language === 'markdown'
  const isJSON = language === 'json'

  // Sync state when props change
  useEffect(() => {
    if (!isEditing) {
      setEditContent(content)
      setLastSavedContent(content)
    }
  }, [content, isEditing])

  // Reset editing mode when file changes
  useEffect(() => {
    setIsEditing(false)
  }, [filePath])

  const handleFormat = useCallback(() => {
    if (isJSON) {
      try {
        const formatted = JSON.stringify(JSON.parse(editContent), null, 2)
        setEditContent(formatted)
      } catch (e) {
        console.error('[workspace] JSON format error:', e)
      }
    }
  }, [editContent, isJSON])

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(editContent).catch(err => {
      console.error('[workspace] Clipboard error:', err)
    })
  }, [editContent])

  const handleSave = useCallback(() => {
    if (!onSave || editContent === lastSavedContent) return
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
  }, [editContent, lastSavedContent, onSave])

  const handleCancel = useCallback(() => {
    setEditContent(lastSavedContent)
    setIsEditing(false)
    setSaveStatus('idle')
  }, [lastSavedContent])

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4">
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
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-4">
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

  const highlight = (code: string) => {
    const lang = Prism.languages[language] || Prism.languages.plain
    return Prism.highlight(code, lang, language)
  }

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-shell-800 bg-shell-900/50 min-w-0 shrink-0">
        <div className="flex items-center gap-2 shrink-0">
          {filePath && onStar && (
            <button
              onClick={() => onStar(filePath)}
              className={`p-1.5 rounded transition-colors ${isStarred ? 'text-yellow-400 hover:text-yellow-300' : 'text-shell-600 hover:text-yellow-400'}`}
              title={isStarred ? 'Unstar file' : 'Star file'}
            >
              <Star size={16} fill={isStarred ? 'currentColor' : 'none'} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
          <FileText size={18} className={`shrink-0 ${isMarkdown ? 'text-crab-400' : 'text-shell-500'}`} />
          <h2 className="font-display text-sm text-gray-200 truncate min-w-0">{fileName}</h2>
          {isEditing && editContent !== lastSavedContent && (
            <span className="hidden sm:inline px-2 py-0.5 bg-neon-peach/10 text-neon-peach text-[11px] font-console uppercase rounded border border-neon-peach/30 animate-pulse shrink-0">
              Unsaved
            </span>
          )}
          <AnimatePresence>
            {isEditing && saveStatus !== 'idle' && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="hidden sm:flex items-center gap-1.5 shrink-0">
                {saveStatus === 'saving' && <div className="w-2.5 h-2.5 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin" />}
                {saveStatus === 'saved' && <Check size={12} className="text-neon-mint" />}
                {saveStatus === 'error' && <AlertCircle size={12} className="text-neon-peach" />}
                <span className={`font-console text-[11px] ${saveStatus === 'error' ? 'text-neon-peach' : 'text-neon-cyan'}`}>
                  {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : 'Save failed'}
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden min-[480px]:flex items-center gap-3">
            {fileSize !== undefined && <span className="font-console text-[11px] text-shell-500">{formatFileSize(fileSize)}</span>}
            {fileModified && <span className="font-console text-[11px] text-shell-500">{formatModifiedDate(fileModified)}</span>}
          </div>

          <div className="flex items-center gap-2">
            {!isEditing && (
              <button onClick={handleCopy} className="p-1.5 bg-shell-800 hover:bg-shell-700 rounded-lg border border-shell-700 text-gray-300 transition-colors" title="Copy contents">
                <Copy size={14} />
              </button>
            )}
            {isEditing && isJSON && (
              <button onClick={handleFormat} className="px-2.5 py-1.5 bg-shell-800 hover:bg-shell-700 rounded-lg text-sm font-console text-gray-300 border border-shell-700 flex items-center gap-1.5" title="Format JSON">
                <Layout size={14} />
                <span className="hidden lg:inline">Format</span>
              </button>
            )}
            {onSave && (
              <>
                {!isEditing ? (
                  <button onClick={() => setIsEditing(true)} className="px-2.5 py-1.5 bg-shell-800 hover:bg-shell-700 rounded-lg text-sm font-console text-gray-300 border border-shell-700 flex items-center gap-1.5" title="Edit (E)">
                    <Edit2 size={14} />
                    <span className="hidden lg:inline">Edit</span>
                  </button>
                ) : (
                  <>
                    <button onClick={handleCancel} className="px-2.5 py-1.5 bg-shell-800 hover:bg-shell-700 rounded-lg text-sm font-console text-gray-300 border border-shell-700" title="Cancel (Esc)">
                      Cancel
                    </button>
                    <button onClick={handleSave} disabled={isSaving || editContent === lastSavedContent} className="px-2.5 py-1.5 bg-neon-mint/10 hover:bg-neon-mint/20 rounded-lg text-sm font-console text-neon-mint border border-neon-mint/30 disabled:opacity-50" title="Save (Ctrl+S)">
                      Save
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 bg-shell-950 overflow-auto">
        <div className="min-h-full relative p-6">
          <div className="max-w-[1200px] mx-auto min-h-full">
            <div className="bg-shell-900 border border-shell-800 rounded-lg overflow-hidden p-4 min-h-full">
              <AnimatePresence mode="wait">
                {isEditing ? (
                  <motion.div key="editor" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="min-h-full">
                    <Editor
                      value={editContent}
                      onValueChange={code => setEditContent(code)}
                      highlight={highlight}
                      padding={10}
                      className="font-mono text-sm editor-lightweight"
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: 14,
                        minHeight: '100%',
                        width: '100%',
                        backgroundColor: 'transparent',
                        color: '#e1e1e6',
                      }}
                    />
                  </motion.div>
                ) : (
                  <motion.div key="viewer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="min-h-full">
                    {isMarkdown ? (
                      <div className="prose prose-invert prose-sm max-w-none break-words text-gray-300">
                        <ReactMarkdown
                          components={{
                            h1: ({ children }) => <h1 className="text-2xl font-display text-crab-400 mb-4 pb-2 border-b border-shell-800">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-xl font-display text-neon-mint mt-6 mb-3">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-lg font-display text-gray-200 mt-4 mb-2">{children}</h3>,
                            code: ({ children, className }) => {
                              const match = /language-(\w+)/.exec(className || '')
                              const lang = match ? match[1] : 'plain'
                              const codeStr = String(children).replace(/\n$/, '')
                              
                              return !className ? (
                                <code className="bg-shell-800 text-neon-peach px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>
                              ) : (
                                <div className="bg-shell-950 border border-shell-800 rounded-lg mb-4 overflow-hidden p-4">
                                  <pre className="font-mono text-sm overflow-auto">
                                    <code 
                                      dangerouslySetInnerHTML={{ 
                                        __html: Prism.highlight(codeStr, Prism.languages[lang] || Prism.languages.plain, lang) 
                                      }} 
                                    />
                                  </pre>
                                </div>
                              )
                            },
                          }}
                        >
                          {content}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <pre className="font-mono text-sm overflow-auto">
                        <code 
                          dangerouslySetInnerHTML={{ 
                            __html: highlight(content) 
                          }} 
                        />
                      </pre>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})

export default FileEditor
