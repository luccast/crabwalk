import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, X, Plus, AlertCircle } from 'lucide-react'

interface NewFileDialogProps {
  open: boolean
  onClose: () => void
  onCreate: (fileName: string, content: string) => void
}

export function NewFileDialog({ open, onClose, onCreate }: NewFileDialogProps) {
  const [fileName, setFileName] = useState('')
  const [content, setContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setFileName('')
      setContent('')
      setError(null)
      const timeoutId = setTimeout(() => inputRef.current?.focus(), 50)
      return () => clearTimeout(timeoutId)
    }
  }, [open])

  const handleSubmit = useCallback(async () => {
    setError(null)

    if (!fileName.trim()) {
      setError('Please enter a file name')
      return
    }

    // Validate file name - allow forward slash for subdirectory creation
    const invalidChars = /[<>:"\\|?*\x00-\x1f]/g
    if (invalidChars.test(fileName)) {
      setError('File name contains invalid characters')
      return
    }

    // Check for path traversal - only block parent directory traversal, not relative paths
    if (fileName.includes('..') || fileName.startsWith('/')) {
      setError('File name cannot contain path traversal sequences')
      return
    }

    // Create the file - wait for completion before closing
    try {
      await onCreate(fileName.trim(), content)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create file')
    }
  }, [fileName, content, onCreate, onClose])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Only submit on Enter if focus is on the filename input (not content textarea)
    if (e.key === 'Enter' && e.target === inputRef.current) {
      handleSubmit()
    }
    if (e.key === 'Escape') {
      onClose()
    }
  }

  const addExtension = (ext: string) => {
    if (!fileName.includes('.')) {
      setFileName(fileName + ext)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className="relative w-full max-w-lg bg-shell-900 rounded-xl border border-shell-700 shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-shell-800 bg-neon-mint/5">
              <div className="p-2 rounded-lg bg-neon-mint/10 border border-neon-mint/30">
                <Plus size={20} className="text-neon-mint" />
              </div>
              <h3 className="font-display text-lg text-gray-200">Create New File</h3>
            </div>

            {/* Content */}
            <div className="px-5 py-4 space-y-4">
              {/* File name input */}
              <div>
                <label className="block font-console text-xs text-shell-500 uppercase tracking-wider mb-2">
                  File Name
                </label>
                <div className="relative">
                  <FileText size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-shell-500" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="example.md"
                    className={`w-full bg-shell-800 border rounded-lg pl-10 pr-3 py-2.5 text-sm font-console text-gray-200 placeholder-shell-500 focus:outline-none focus:ring-1 ${
                      error
                        ? 'border-crab-500 focus:border-crab-500 focus:ring-crab-500/20'
                        : 'border-shell-700 focus:border-neon-mint focus:ring-neon-mint/20'
                    }`}
                  />
                </div>
                {error && (
                  <div className="flex items-center gap-1.5 mt-2 text-crab-400">
                    <AlertCircle size={12} />
                    <span className="font-console text-xs">{error}</span>
                  </div>
                )}
              </div>

              {/* Quick extension buttons */}
              <div>
                <label className="block font-console text-xs text-shell-500 uppercase tracking-wider mb-2">
                  Quick Extensions
                </label>
                <div className="flex gap-2">
                  {['.md', '.txt', '.json', '.html'].map((ext) => (
                    <button
                      key={ext}
                      onClick={() => addExtension(ext)}
                      className="px-3 py-1.5 bg-shell-800 hover:bg-shell-700 rounded-lg text-xs font-console text-gray-400 transition-colors border border-shell-700"
                    >
                      {ext}
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional content */}
              <div>
                <label className="block font-console text-xs text-shell-500 uppercase tracking-wider mb-2">
                  Initial Content (optional)
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter file content..."
                  className="w-full h-32 bg-shell-800 border border-shell-700 rounded-lg p-3 text-sm font-mono text-gray-300 placeholder-shell-600 resize-none focus:outline-none focus:border-neon-mint focus:ring-1 focus:ring-neon-mint/20"
                  spellCheck={false}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-shell-800 bg-shell-900/50">
              <button
                onClick={onClose}
                className="flex items-center gap-2 px-4 py-2 bg-shell-800 hover:bg-shell-700 rounded-lg text-sm font-console text-gray-300 transition-colors border border-shell-700"
              >
                <X size={14} />
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="flex items-center gap-2 px-4 py-2 bg-neon-mint hover:bg-neon-mint/90 rounded-lg text-sm font-console text-shell-950 transition-colors"
              >
                <Plus size={14} />
                Create File
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default NewFileDialog
