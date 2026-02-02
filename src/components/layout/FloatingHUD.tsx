import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'
import { ReactNode } from 'react'

// ============================================================================
// Floating HUD Container
// ============================================================================

/**
 * FloatingHUD provides a container for floating panels that hover over content.
 * Content flows beneath these panels freely.
 */
interface FloatingHUDProps {
  children: ReactNode
}

export function FloatingHUD({ children }: FloatingHUDProps) {
  return (
    <div className="fixed inset-x-0 top-0 z-30 pointer-events-none">
      <div className="hidden sm:flex items-start justify-between p-4 gap-4">
        {children}
      </div>
    </div>
  )
}

// ============================================================================
// Floating Panel
// ============================================================================

interface FloatingPanelProps {
  children: ReactNode
  /** Animation delay for staggered entrance */
  delay?: number
  /** Position hint for flex alignment */
  position?: 'left' | 'center' | 'right'
}

export function FloatingPanel({ children, delay = 0, position = 'left' }: FloatingPanelProps) {
  const positionClass = {
    left: 'mr-auto',
    center: 'mx-auto',
    right: 'ml-auto',
  }[position]

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: [0.23, 1, 0.32, 1] }}
      className={`pointer-events-auto ${positionClass}`}
    >
      <div className="flex items-center gap-2 px-3 py-2 bg-shell-900/95 backdrop-blur-md border border-shell-700/80 rounded-lg shadow-lg shadow-black/20">
        {children}
      </div>
    </motion.div>
  )
}

// ============================================================================
// HUD Section (for grouping related controls)
// ============================================================================

interface HUDSectionProps {
  children: ReactNode
  /** Optional divider before this section */
  divider?: boolean
}

export function HUDSection({ children, divider }: HUDSectionProps) {
  return (
    <>
      {divider && <div className="w-px h-5 bg-shell-700/50" />}
      <div className="flex items-center gap-2">{children}</div>
    </>
  )
}

// ============================================================================
// HUD Spacer (accounts for CommandNav)
// ============================================================================

export function HUDNavSpacer() {
  return <div className="w-56 sm:w-64 shrink-0" />
}

// ============================================================================
// Floating Input Bar (for workspace path, search, etc.)
// ============================================================================

interface FloatingInputBarProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  placeholder?: string
  icon: ReactNode
  submitLabel?: string
  submitDisabled?: boolean
  error?: string | null
  delay?: number
}

export function FloatingInputBar({
  value,
  onChange,
  onSubmit,
  placeholder,
  icon,
  submitLabel = 'Open',
  submitDisabled,
  error,
  delay = 0.1,
}: FloatingInputBarProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onSubmit()
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: [0.23, 1, 0.32, 1] }}
      className="pointer-events-auto flex-1 max-w-2xl"
    >
      <div className="relative flex items-center gap-2 px-3 py-2 bg-shell-900/95 backdrop-blur-md border border-shell-700/80 rounded-lg shadow-lg shadow-black/20">
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
            className="w-full bg-shell-800/80 border border-shell-700/50 rounded-md pl-9 pr-3 py-1.5 text-sm font-console text-gray-200 placeholder-shell-500 focus:outline-none focus:border-crab-500 focus:ring-1 focus:ring-crab-500/20 transition-colors"
          />
        </div>
        <button
          onClick={onSubmit}
          disabled={submitDisabled}
          className={`px-3 py-1.5 text-xs font-console tracking-wider rounded-md transition-colors shrink-0 ${
            submitDisabled
              ? 'bg-shell-800/80 text-shell-500 cursor-default'
              : 'bg-crab-600 hover:bg-crab-500 text-white'
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
    </motion.div>
  )
}

// ============================================================================
// Status Pill (floating version)
// ============================================================================

interface StatusPillProps {
  status: 'connected' | 'connecting' | 'disconnected' | 'active' | 'inactive'
  label?: string
}

export function StatusPill({ status, label }: StatusPillProps) {
  const config = {
    connected: {
      bg: 'bg-neon-mint/15',
      border: 'border-neon-mint/40',
      dot: 'bg-neon-mint animate-pulse',
      text: 'text-neon-mint',
      defaultLabel: 'CONNECTED',
    },
    active: {
      bg: 'bg-neon-mint/15',
      border: 'border-neon-mint/40',
      dot: 'bg-neon-mint animate-pulse',
      text: 'text-neon-mint',
      defaultLabel: 'ACTIVE',
    },
    connecting: {
      bg: 'bg-neon-peach/15',
      border: 'border-neon-peach/40',
      dot: 'bg-neon-peach animate-pulse',
      text: 'text-neon-peach',
      defaultLabel: 'CONNECTING',
    },
    disconnected: {
      bg: 'bg-shell-800/50',
      border: 'border-shell-600/50',
      dot: 'bg-shell-500',
      text: 'text-shell-400',
      defaultLabel: 'OFFLINE',
    },
    inactive: {
      bg: 'bg-shell-800/50',
      border: 'border-shell-600/50',
      dot: 'bg-shell-500',
      text: 'text-shell-400',
      defaultLabel: 'INACTIVE',
    },
  }

  const c = config[status]

  return (
    <div className={`flex items-center gap-2 px-2.5 py-1 rounded-md border ${c.bg} ${c.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      <span className={`font-console text-[10px] tracking-widest ${c.text}`}>
        {label || c.defaultLabel}
      </span>
    </div>
  )
}

// ============================================================================
// Stat Display
// ============================================================================

interface StatDisplayProps {
  label: string
  value: string | number
  color?: 'mint' | 'peach' | 'coral' | 'default'
}

export function StatDisplay({ label, value, color = 'default' }: StatDisplayProps) {
  const colorClass = {
    mint: 'text-neon-mint',
    peach: 'text-neon-peach',
    coral: 'text-neon-coral',
    default: 'text-gray-300',
  }[color]

  return (
    <div className="flex items-center gap-1.5">
      <span className="font-console text-[9px] text-shell-500 uppercase tracking-wider">
        {label}
      </span>
      <span className={`font-console text-xs tabular-nums ${colorClass}`}>{value}</span>
    </div>
  )
}

// ============================================================================
// Icon Button
// ============================================================================

interface IconButtonProps {
  icon: ReactNode
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  title?: string
  active?: boolean
}

export function IconButton({
  icon,
  onClick,
  disabled,
  loading,
  title,
  active,
}: IconButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      title={title}
      className={`p-1.5 rounded-md transition-all group ${
        active
          ? 'bg-crab-500/20 text-crab-400'
          : 'hover:bg-shell-800/80 text-shell-400 hover:text-crab-400'
      } disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      {loading ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <div className="transition-colors">{icon}</div>
      )}
    </button>
  )
}

// ============================================================================
// Service Indicator
// ============================================================================

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
      title={title}
      className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-all ${
        active
          ? 'bg-neon-mint/15 text-neon-mint'
          : 'hover:bg-shell-800/80 text-shell-500 hover:text-shell-400'
      }`}
    >
      {icon}
      {active && <span className="w-1 h-1 rounded-full bg-neon-mint animate-pulse" />}
    </button>
  )
}

// ============================================================================
// Badge Counter
// ============================================================================

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
      title={title}
      className="flex items-center gap-1.5 px-2 py-1 rounded-md transition-all hover:bg-crab-500/15 text-shell-400 hover:text-crab-400 group"
    >
      {icon}
      <span className="font-console text-[10px] tabular-nums">{count}</span>
    </button>
  )
}

// ============================================================================
// Retry Indicator
// ============================================================================

interface RetryIndicatorProps {
  retryCount: number
  maxRetries: number
}

export function RetryIndicator({ retryCount, maxRetries }: RetryIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="flex items-center gap-1.5 px-2 py-1 bg-neon-peach/15 rounded-md"
    >
      <Loader2 size={12} className="animate-spin text-neon-peach" />
      <span className="font-console text-[9px] text-neon-peach tracking-wider">
        {retryCount}/{maxRetries}
      </span>
    </motion.div>
  )
}

// ============================================================================
// Divider
// ============================================================================

export function HUDDivider() {
  return <div className="w-px h-4 bg-shell-700/50" />
}
