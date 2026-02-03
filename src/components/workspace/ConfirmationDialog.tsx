import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, X, Check } from 'lucide-react'

interface ConfirmationDialogProps {
  open: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  variant?: 'danger' | 'warning' | 'info'
}

export function ConfirmationDialog({
  open,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'danger',
}: ConfirmationDialogProps) {
  const iconColor = variant === 'danger' ? 'text-crab-400' : variant === 'warning' ? 'text-neon-peach' : 'text-neon-cyan'
  const iconBg = variant === 'danger' ? 'bg-crab-900/30' : variant === 'warning' ? 'bg-neon-peach/10' : 'bg-neon-cyan/10'
  const iconBorder = variant === 'danger' ? 'border-crab-700/50' : variant === 'warning' ? 'border-neon-peach/30' : 'border-neon-cyan/30'
  const confirmButtonClass = variant === 'danger'
    ? 'bg-crab-600 hover:bg-crab-500 text-white'
    : 'bg-neon-mint hover:bg-neon-mint/90 text-shell-950'

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    if (open) {
      document.addEventListener('keydown', handleEscape)
    }
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open, onCancel])

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
            onClick={onCancel}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className="relative w-full max-w-md bg-shell-900 rounded-xl border border-shell-700 shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className={`flex items-center gap-3 px-5 py-4 border-b border-shell-800 ${iconBg}`}>
              <div className={`p-2 rounded-lg ${iconBg} border ${iconBorder}`}>
                <AlertTriangle size={20} className={iconColor} />
              </div>
              <h3 className="font-display text-lg text-gray-200">{title}</h3>
            </div>

            {/* Content */}
            <div className="px-5 py-4">
              <p className="font-console text-sm text-shell-500 leading-relaxed">
                {message}
              </p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-shell-800 bg-shell-900/50">
              <button
                onClick={onCancel}
                className="flex items-center gap-2 px-4 py-2 bg-shell-800 hover:bg-shell-700 rounded-lg text-sm font-console text-gray-300 transition-colors border border-shell-700"
              >
                <X size={14} />
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-console transition-colors border ${confirmButtonClass}`}
              >
                <Check size={14} />
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export default ConfirmationDialog
