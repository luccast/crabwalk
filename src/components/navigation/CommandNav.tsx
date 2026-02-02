import { useState, useEffect } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { Activity, FolderTree, Home, Terminal, ChevronRight, Zap } from 'lucide-react'

interface NavItem {
  path: string
  label: string
  shortcut: string
  icon: React.ReactNode
  description: string
}

const NAV_ITEMS: NavItem[] = [
  {
    path: '/',
    label: 'HOME',
    shortcut: 'H',
    icon: <Home size={16} />,
    description: 'system root',
  },
  {
    path: '/monitor',
    label: 'MONITOR',
    shortcut: 'M',
    icon: <Activity size={16} />,
    description: 'agent tracker',
  },
  {
    path: '/workspace',
    label: 'WORKSPACE',
    shortcut: 'W',
    icon: <FolderTree size={16} />,
    description: 'file explorer',
  },
]

export function CommandNav({ className }: { className?: string }) {
  const location = useLocation()
  const [expanded, setExpanded] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ESC to close
      if (e.key === 'Escape' && expanded) {
        e.preventDefault()
        setExpanded(false)
        return
      }

      // Only trigger navigation with Alt/Option key
      if (!e.altKey) return

      const key = e.key.toUpperCase()
      const item = NAV_ITEMS.find((i) => i.shortcut === key)
      if (item) {
        e.preventDefault()
        window.location.href = item.path
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [expanded])

  // Close expanded state on route change
  useEffect(() => {
    setExpanded(false)
  }, [location.pathname])

  const currentPath = location.pathname.replace(/\/$/, '') || '/'
  const currentItem = NAV_ITEMS.find(
    (item) => item.path === currentPath || (item.path !== '/' && currentPath.startsWith(item.path))
  )

  if (!mounted) return null

  return (
    <>
      {/* Main nav trigger */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className={className || "fixed top-4 left-4 z-50"}
      >
        <button
          onClick={() => setExpanded(!expanded)}
          className="group relative flex items-center gap-3 px-4 py-2.5 bg-shell-900/95 backdrop-blur-sm border border-shell-700/80 rounded-lg transition-all duration-200 hover:border-shell-600 hover:bg-shell-850"
        >
          {/* Pulse indicator */}
          <div className="relative">
            <Zap
              size={14}
              className={`transition-colors duration-200 ${
                expanded ? 'text-crab-400' : 'text-shell-500 group-hover:text-crab-400'
              }`}
            />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-neon-mint animate-pulse" />
          </div>

          {/* Current location */}
          <div className="flex items-center gap-2">
            <span className="text-shell-500 font-console text-[10px]">/</span>
            <span className="font-console text-xs text-gray-300 tracking-wider">
              {currentItem?.label || 'UNKNOWN'}
            </span>
          </div>

          {/* Expand indicator */}
          <ChevronRight
            size={12}
            className={`text-shell-500 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
          />

          {/* Keyboard hint */}
          <div className="hidden sm:flex items-center gap-1 ml-2 pl-3 border-l border-shell-700">
            <kbd className="px-1.5 py-0.5 bg-shell-800 rounded text-[9px] font-console text-shell-500">
              ALT
            </kbd>
            <span className="text-shell-600 text-[9px]">+</span>
            <kbd className="px-1.5 py-0.5 bg-shell-800 rounded text-[9px] font-console text-shell-500">
              {currentItem?.shortcut || '?'}
            </kbd>
          </div>
        </button>
      </motion.div>

      {/* Expanded navigation panel */}
      <AnimatePresence>
        {expanded && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setExpanded(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            />

            {/* Nav panel */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              className="fixed top-4 left-4 z-50 w-72"
            >
              <div className="bg-shell-900/98 backdrop-blur-md border border-shell-700/80 rounded-xl overflow-hidden shadow-2xl shadow-black/40">
                {/* Header */}
                <div className="px-4 py-3 border-b border-shell-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Terminal size={14} className="text-crab-500" />
                    <span className="font-console text-[10px] text-shell-500 uppercase tracking-widest">
                      Navigation
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-crab-500/80" />
                    <div className="w-2 h-2 rounded-full bg-neon-peach/80" />
                    <div className="w-2 h-2 rounded-full bg-neon-mint/80" />
                  </div>
                </div>

                {/* Nav items */}
                <div className="p-2">
                  {NAV_ITEMS.map((item, index) => {
                    const isActive =
                      item.path === currentPath ||
                      (item.path !== '/' && currentPath.startsWith(item.path))

                    return (
                      <motion.div
                        key={item.path}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: index * 0.05 }}
                      >
                        <Link
                          to={item.path}
                          onClick={() => setExpanded(false)}
                          className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 ${
                            isActive
                              ? 'bg-crab-500/15 border border-crab-500/30'
                              : 'border border-transparent hover:bg-shell-800/80 hover:border-shell-700/50'
                          }`}
                        >
                          {/* Icon */}
                          <div
                            className={`p-1.5 rounded-md transition-colors duration-150 ${
                              isActive
                                ? 'bg-crab-500/20 text-crab-400'
                                : 'bg-shell-800 text-shell-500 group-hover:text-gray-400'
                            }`}
                          >
                            {item.icon}
                          </div>

                          {/* Label + description */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-console text-sm tracking-wide ${
                                  isActive ? 'text-crab-400' : 'text-gray-300'
                                }`}
                              >
                                {item.label}
                              </span>
                              {isActive && (
                                <span className="px-1.5 py-0.5 bg-crab-500/20 rounded text-[9px] font-console text-crab-400 uppercase">
                                  active
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-shell-500 font-console">
                              {item.description}
                            </span>
                          </div>

                          {/* Keyboard shortcut */}
                          <kbd
                            className={`px-2 py-1 rounded text-[10px] font-console transition-colors duration-150 ${
                              isActive
                                ? 'bg-crab-500/20 text-crab-400 border border-crab-500/30'
                                : 'bg-shell-800 text-shell-500 border border-shell-700 group-hover:border-shell-600'
                            }`}
                          >
                            {item.shortcut}
                          </kbd>
                        </Link>
                      </motion.div>
                    )
                  })}
                </div>

                {/* Footer */}
                <div className="px-4 py-2.5 border-t border-shell-800 bg-shell-950/50">
                  <div className="flex items-center justify-between">
                    <span className="font-console text-[9px] text-shell-600">
                      ALT + KEY to navigate
                    </span>
                    <span className="font-console text-[9px] text-shell-600">ESC to close</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
