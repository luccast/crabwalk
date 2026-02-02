import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { ReactNode } from 'react'

interface AppHeaderProps {
  /** Left side content - appears after nav spacer */
  left?: ReactNode
  /** Center content - typically page-specific controls */
  center?: ReactNode
  /** Right side content - stats, actions, settings */
  right?: ReactNode
  /** Whether header is visible (hidden on mobile) */
  hiddenOnMobile?: boolean
}

export function AppHeader({ left, center, right, hiddenOnMobile = true }: AppHeaderProps) {
  return (
    <header
      className={`${
        hiddenOnMobile ? 'hidden sm:flex' : 'flex'
      } items-center justify-between px-4 py-3 bg-shell-900/95 backdrop-blur-md border-b border-shell-700/80 relative z-30 shadow-sm shadow-black/20`}
    >
      {/* Bottom accent line (subtle) */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-linear-to-r from-transparent via-shell-700/30 to-transparent opacity-50" />

      {/* Left section */}
      <div className="relative flex items-center gap-4">
        {/* Spacer for nav button (accounts for fixed position nav at top-4 left-4) */}
        <div className="w-56 sm:w-64" />
        {left}
      </div>

      {/* Center section */}
      {center && <div className="flex-1 flex justify-center max-w-2xl mx-4">{center}</div>}

      {/* Right section */}
      {right && <div className="relative flex items-center gap-3">{right}</div>}
    </header>
  )
}

// ============================================================================
// Header Building Blocks
// ============================================================================

/** Status pill showing connection or active state */
interface StatusPillProps {
  status: 'connected' | 'connecting' | 'disconnected' | 'active' | 'inactive'
  label?: string
}

export function StatusPill({ status, label }: StatusPillProps) {
  const config = {
    connected: {
      bg: 'bg-neon-mint/10 border-neon-mint/30',
      dot: 'bg-neon-mint animate-pulse',
      text: 'text-neon-mint',
      defaultLabel: 'CONNECTED',
    },
    active: {
      bg: 'bg-neon-mint/10 border-neon-mint/30',
      dot: 'bg-neon-mint animate-pulse',
      text: 'text-neon-mint',
      defaultLabel: 'ACTIVE',
    },
    connecting: {
      bg: 'bg-neon-peach/10 border-neon-peach/30',
      dot: 'bg-neon-peach animate-pulse',
      text: 'text-neon-peach',
      defaultLabel: 'CONNECTING',
    },
    disconnected: {
      bg: 'bg-shell-800/50 border-shell-700',
      dot: 'bg-shell-600',
      text: 'text-shell-500',
      defaultLabel: 'DISCONNECTED',
    },
    inactive: {
      bg: 'bg-shell-800/50 border-shell-700',
      dot: 'bg-shell-600',
      text: 'text-shell-500',
      defaultLabel: 'INACTIVE',
    },
  }

  const c = config[status]

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${c.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      <span className={`font-console text-[10px] tracking-wider ${c.text}`}>
        {label || c.defaultLabel}
      </span>
    </div>
  )
}

/** Stat block showing a label and value */
interface StatBlockProps {
  label: string
  value: string | number
  color?: 'mint' | 'peach' | 'coral' | 'default'
}

export function StatBlock({ label, value, color = 'default' }: StatBlockProps) {
  const colorClass = {
    mint: 'text-neon-mint',
    peach: 'text-neon-peach',
    coral: 'text-neon-coral',
    default: 'text-gray-300',
  }[color]

  return (
    <div className="flex items-center gap-2">
      <span className="font-console text-[10px] text-shell-500 uppercase tracking-wider">
        {label}
      </span>
      <span className={`font-console text-sm ${colorClass}`}>{value}</span>
    </div>
  )
}

/** Stats container with dividers */
export function StatsGroup({ children }: { children: ReactNode }) {
  return (
    <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 bg-shell-800/30 border border-shell-700/50 rounded-lg backdrop-blur-sm">
      {children}
    </div>
  )
}

/** Vertical divider for stats */
export function StatsDivider() {
  return <div className="w-px h-4 bg-shell-700" />
}

/** Icon button with hover states */
interface IconButtonProps {
  icon: ReactNode
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  title?: string
  active?: boolean
  variant?: 'ghost' | 'subtle'
}

export function IconButton({
  icon,
  onClick,
  disabled,
  loading,
  title,
  active,
  variant = 'ghost',
}: IconButtonProps) {
  const baseStyles = 'p-2 rounded-lg transition-all group'
  const variantStyles = {
    ghost: `hover:bg-shell-800 border border-transparent hover:border-shell-600 ${
      active ? 'bg-shell-800 border-shell-600' : ''
    }`,
    subtle: `bg-shell-800/50 hover:bg-shell-700/50 border border-shell-700/50 hover:border-shell-600 ${
      active ? 'bg-crab-500/10 border-crab-500/30' : ''
    }`,
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      title={title}
      className={`${baseStyles} ${variantStyles[variant]} disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {loading ? (
        <Loader2 size={16} className="animate-spin text-shell-400" />
      ) : (
        <div
          className={`text-shell-400 group-hover:text-crab-400 transition-colors ${
            active ? 'text-crab-400' : ''
          }`}
        >
          {icon}
        </div>
      )}
    </button>
  )
}

/** Badge counter for notifications/counts */
interface BadgeCounterProps {
  count: number
  onClick?: () => void
  icon: ReactNode
  title?: string
}

export function BadgeCounter({ count, onClick, icon, title }: BadgeCounterProps) {
  if (count === 0) return null

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all bg-shell-800/50 hover:bg-crab-900/50 hover:border-crab-700/50 border border-shell-700/50 group"
      title={title}
    >
      <div className="text-shell-400 group-hover:text-crab-400 transition-colors">{icon}</div>
      <span className="font-console text-xs text-shell-400 group-hover:text-crab-400 transition-colors">
        {count}
      </span>
    </button>
  )
}

/** Service indicator (like persistence) */
interface ServiceIndicatorProps {
  active: boolean
  icon: ReactNode
  onClick?: () => void
  title?: string
}

export function ServiceIndicator({ active, icon, onClick, title }: ServiceIndicatorProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all border ${
        active
          ? 'bg-neon-mint/10 border-neon-mint/30 hover:bg-neon-mint/20'
          : 'bg-shell-800/50 border-shell-700/50 hover:bg-shell-700/50'
      }`}
      title={title}
    >
      <div className={active ? 'text-neon-mint' : 'text-shell-500'}>{icon}</div>
      {active && <span className="w-1.5 h-1.5 rounded-full bg-neon-mint animate-pulse" />}
    </button>
  )
}

/** Retry indicator for connection attempts */
interface RetryIndicatorProps {
  retryCount: number
  maxRetries: number
}

export function RetryIndicator({ retryCount, maxRetries }: RetryIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10 }}
      className="flex items-center gap-2"
    >
      <Loader2 size={14} className="animate-spin text-neon-peach" />
      <span className="font-console text-[10px] text-shell-400 tracking-wider">
        RETRY {retryCount}/{maxRetries}
      </span>
    </motion.div>
  )
}

/** Path input field styled for the header */
interface PathInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  placeholder?: string
  icon: ReactNode
  submitLabel?: string
  submitDisabled?: boolean
  error?: string | null
}

export function PathInput({
  value,
  onChange,
  onSubmit,
  placeholder,
  icon,
  submitLabel = 'Open',
  submitDisabled,
  error,
}: PathInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSubmit()
    }
  }

  return (
    <div className="flex items-center gap-2 flex-1 relative">
      <div className="flex-1 relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-shell-500 pointer-events-none">
          {icon}
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full bg-shell-800 border border-shell-700 rounded-lg pl-9 pr-3 py-2 text-sm font-console text-gray-200 placeholder-shell-500 focus:outline-none focus:border-crab-500 focus:ring-1 focus:ring-crab-500/20 transition-colors"
        />
      </div>
      <button
        onClick={onSubmit}
        disabled={submitDisabled}
        className={`px-4 py-2 text-sm font-console tracking-wider rounded-lg transition-colors shrink-0 ${
          submitDisabled
            ? 'bg-shell-800 text-shell-500 cursor-default border border-shell-700'
            : 'bg-crab-600 hover:bg-crab-500 text-white border border-crab-500'
        }`}
      >
        {submitLabel}
      </button>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-full left-0 right-0 mt-2 px-3 py-2 bg-crab-900/95 border border-crab-700 rounded-lg flex items-center gap-2 z-50 backdrop-blur-sm"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-crab-400" />
          <span className="text-xs text-crab-200 font-console">{error}</span>
        </motion.div>
      )}
    </div>
  )
}
