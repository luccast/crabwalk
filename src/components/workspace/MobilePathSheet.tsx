import { useRef, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FolderOpen, AlertCircle } from 'lucide-react'

interface MobilePathSheetProps {
  open: boolean
  onClose: () => void
  initialPath: string
  validatedPath: string
  pathValid: boolean
  pathError: string | null
  onValidate: (path: string) => Promise<boolean>
}

export function MobilePathSheet({
  open,
  onClose,
  initialPath,
  validatedPath,
  pathValid,
  pathError,
  onValidate,
}: MobilePathSheetProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [pathInput, setPathInput] = useState(initialPath)
  const [loading, setLoading] = useState(false)

  // Sync initial path when it changes
  useEffect(() => {
    setPathInput(initialPath)
  }, [initialPath])

  // Auto-focus input after animation
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [open])

  const handleSubmit = async () => {
    if (!pathInput.trim() || loading) return
    setLoading(true)
    try {
      const success = await onValidate(pathInput)
      if (success) {
        onClose()
      }
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit()
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

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-shell-900 rounded-t-2xl"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-shell-700 rounded-full" />
            </div>

            {/* Content */}
            <div className="px-4 pb-safe">
              <h3 className="font-display text-sm text-crab-400 uppercase tracking-wider mb-4">
                Workspace Path
              </h3>

              <div className="flex items-center gap-2 mb-4">
                <FolderOpen size={18} className="text-shell-500 shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={pathInput}
                  onChange={(e) => setPathInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter workspace path..."
                  className="flex-1 bg-shell-800 border border-shell-700 rounded-lg px-4 py-3 text-base font-console text-gray-200 placeholder-shell-500 focus:outline-none focus:border-crab-500"
                />
              </div>

              {pathError && (
                <div className="mb-4 px-3 py-2 bg-crab-900/50 border border-crab-700 rounded-lg flex items-center gap-2">
                  <AlertCircle size={16} className="text-crab-400 shrink-0" />
                  <span className="text-xs text-crab-200 font-console">{pathError}</span>
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={loading || !pathInput.trim() || (pathValid && pathInput === validatedPath)}
                className={`w-full py-4 font-display text-sm uppercase tracking-wider rounded-lg transition-colors mb-4 ${
                  pathValid && pathInput === validatedPath
                    ? 'bg-shell-800 text-shell-500 cursor-default'
                    : 'bg-crab-600 hover:bg-crab-500 active:bg-crab-700 text-white disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
              >
                {loading ? 'Opening...' : 'Open'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
