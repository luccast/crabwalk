import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { Activity, FolderTree, ChevronDown, Terminal } from 'lucide-react'

interface NavTab {
  path: string
  label: string
  icon: React.ReactNode
}

const TABS: NavTab[] = [
  {
    path: '/monitor',
    label: 'MONITOR',
    icon: <Activity size={14} />,
  },
  {
    path: '/workspace',
    label: 'WORKSPACE',
    icon: <FolderTree size={14} />,
  },
]

export function NavTabs() {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const dropdownRef = useRef<HTMLDivElement>(null)
  const currentPath = location.pathname.replace(/\/$/, '') || '/'

  const activeTab = (TABS.find(
    (tab) => tab.path === currentPath || currentPath.startsWith(tab.path)
  ) ?? TABS[0])!

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  // Close on escape
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  const handleSelect = (path: string) => {
    setOpen(false)
    navigate({ to: path })
  }

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-shell-700/50 bg-shell-800/50 hover:bg-shell-800 hover:border-shell-600 transition-all group"
      >
        <span className="text-crab-400">{activeTab.icon}</span>
        <span className="font-console text-xs tracking-widest text-shell-200">
          {activeTab.label}
        </span>

        <ChevronDown
          size={14}
          className={`text-shell-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown menu */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
            />

            {/* Dropdown panel */}
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ type: 'spring', damping: 25, stiffness: 400 }}
              className="absolute top-full left-0 mt-2 z-50 min-w-[200px]"
            >
              {/* Terminal-style container */}
              <div className="bg-shell-900 border border-shell-700 rounded-lg overflow-hidden shadow-2xl shadow-black/50">
                {/* Terminal header */}
                <div className="flex items-center gap-2 px-3 py-2 bg-shell-950 border-b border-shell-800">
                  <Terminal size={12} className="text-shell-500" />
                  <span className="font-console text-[11px] text-shell-500 uppercase tracking-widest">
                    navigate
                  </span>
                </div>

                {/* Menu items */}
                <div className="p-1.5">
                  {TABS.map((tab, index) => {
                    const isActive =
                      tab.path === currentPath || currentPath.startsWith(tab.path)

                    return (
                      <motion.button
                        key={tab.path}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => handleSelect(tab.path)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-all group ${
                          isActive
                            ? 'bg-crab-500/10 text-crab-400'
                            : 'text-shell-400 hover:bg-shell-800 hover:text-shell-200'
                        }`}
                      >
                        {/* Icon */}
                        <span
                          className={`transition-colors ${
                            isActive ? 'text-crab-400' : 'text-shell-500 group-hover:text-shell-400'
                          }`}
                        >
                          {tab.icon}
                        </span>

                        {/* Label */}
                        <span className="font-console text-xs tracking-widest flex-1 text-left">
                          {tab.label}
                        </span>

                        {/* Active indicator */}
                        {isActive && (
                          <motion.div
                            layoutId="nav-dropdown-active"
                            className="w-1.5 h-1.5 rounded-full bg-crab-500"
                          />
                        )}
                      </motion.button>
                    )
                  })}
                </div>

                {/* Terminal footer with hint */}
                <div className="px-3 pb-2 pt-1 bg-shell-950/50 border-t border-shell-800/50">
                  <span className="font-console text-[11px] text-shell-600">
                    <span className="text-shell-500">esc</span> to close
                  </span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
