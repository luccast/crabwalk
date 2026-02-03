import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface ContextMenuItem {
  icon: React.ReactNode
  label: string
  onClick: () => void
  danger?: boolean
}

interface FileContextMenuProps {
  open: boolean
  position: { x: number; y: number } | null
  items: ContextMenuItem[]
  onClose: () => void
}

export function FileContextMenu({ open, position, items, onClose }: FileContextMenuProps) {
  // Calculate position that stays within viewport
  const adjustedPosition = React.useMemo(() => {
    if (!position) return null
    const menuWidth = 192 // w-48 = 12rem = 192px
    const menuHeight = items.length * 42 // approximate height based on item count
    const padding = 8
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    let x = position.x
    let y = position.y

    // Adjust if menu would go off right edge
    if (x + menuWidth + padding > viewportWidth) {
      x = Math.max(padding, viewportWidth - menuWidth - padding)
    }

    // Adjust if menu would go off bottom edge
    if (y + menuHeight + padding > viewportHeight) {
      y = Math.max(padding, viewportHeight - menuHeight - padding)
    }

    return { x, y }
  }, [position, items.length])

  // Close menu when clicking outside or pressing Escape
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    const handleClick = () => onClose()
    
    if (open) {
      document.addEventListener('click', handleClick)
      document.addEventListener('keydown', handleEscape)
    }
    
    return () => {
      document.removeEventListener('click', handleClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open, onClose])

  // Prevent clicks inside menu from closing it
  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  return (
    <AnimatePresence>
      {open && adjustedPosition && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', duration: 0.15 }}
          className="fixed z-50 bg-shell-900 rounded-lg border border-shell-700 shadow-xl overflow-hidden"
          style={{
            left: adjustedPosition.x,
            top: adjustedPosition.y,
          }}
          onClick={handleMenuClick}
        >
          {/* Menu items */}
          <div className="py-1">
            {items.map((item, index) => (
              <button
                key={index}
                onClick={() => {
                  item.onClick()
                  onClose()
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left font-console text-sm transition-colors ${
                  item.danger
                    ? 'text-crab-400 hover:bg-crab-900/30'
                    : 'text-gray-300 hover:bg-shell-800 hover:text-gray-100'
                }`}
              >
                <span className={item.danger ? 'text-crab-500' : 'text-shell-500'}>
                  {item.icon}
                </span>
                {item.label}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// Icon components
export const FileIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
)

export const TrashIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
)

export const CopyIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
)

export const EditIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
)

export const NewFileIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="12" y1="18" x2="12" y2="12" />
    <line x1="9" y1="15" x2="15" y2="15" />
  </svg>
)

export default FileContextMenu
