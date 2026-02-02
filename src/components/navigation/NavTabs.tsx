import { Link, useLocation } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { Activity, FolderTree } from 'lucide-react'

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
  const location = useLocation()
  const currentPath = location.pathname.replace(/\/$/, '') || '/'

  return (
    <div className="flex items-center">
      {TABS.map((tab) => {
        const isActive =
          tab.path === currentPath ||
          (tab.path !== '/' && currentPath.startsWith(tab.path))

        return (
          <Link
            key={tab.path}
            to={tab.path}
            className="relative group"
          >
            {/* Background glow for active state */}
            {isActive && (
              <motion.div
                layoutId="nav-tab-glow"
                className="absolute inset-0 -z-10"
                transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
              >
                <div className="absolute inset-x-0 bottom-0 h-8 bg-linear-to-t from-crab-500/15 to-transparent" />
                <div className="absolute inset-x-2 bottom-0 h-6 bg-linear-to-t from-crab-500/10 to-transparent blur-sm" />
              </motion.div>
            )}

            <div
              className={`flex items-center gap-2 px-4 py-2.5 transition-all duration-200 ${
                isActive
                  ? 'text-crab-400'
                  : 'text-shell-500 hover:text-shell-300'
              }`}
            >
              <span
                className={`transition-colors duration-200 ${
                  isActive ? 'text-crab-400' : 'text-shell-600 group-hover:text-shell-400'
                }`}
              >
                {tab.icon}
              </span>
              <span className="font-console text-xs tracking-widest">
                {tab.label}
              </span>
            </div>

            {/* Subtle underline */}
            {isActive && (
              <motion.div
                layoutId="nav-tab-indicator"
                className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-crab-500"
                transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
              />
            )}

            {/* Hover indicator for inactive tabs */}
            {!isActive && (
              <div className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-shell-600/0 group-hover:bg-shell-600/40 transition-colors duration-200" />
            )}
          </Link>
        )
      })}
    </div>
  )
}
