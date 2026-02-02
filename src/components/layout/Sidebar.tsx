import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Terminal,
} from 'lucide-react'
import { ReactNode, useState, createContext, useContext } from 'react'

// ============================================================================
// Context for sidebar state
// ============================================================================

interface SidebarContextValue {
  collapsed: boolean
  toggle: () => void
}

const SidebarContext = createContext<SidebarContextValue | null>(null)

export function useSidebar() {
  const ctx = useContext(SidebarContext)
  if (!ctx) throw new Error('useSidebar must be used within Sidebar')
  return ctx
}

// ============================================================================
// Sidebar Toggle Handle
// ============================================================================

interface SidebarToggleHandleProps {
  collapsed: boolean
  onToggle: () => void
}

function SidebarToggleHandle({ collapsed, onToggle }: SidebarToggleHandleProps) {
  return (
    <button
      onClick={onToggle}
      className="absolute -right-3 top-1/2 -translate-y-1/2 w-8 h-20 flex items-center justify-center group z-50 focus:outline-none"
      title={collapsed ? 'Expand panel' : 'Collapse panel'}
    >
      {/* Handle visual */}
      <div
        className={`w-1.5 h-12 rounded-full bg-shell-600 border border-shell-500/50 transition-all duration-200 group-hover:h-16 group-hover:bg-crab-500 group-hover:border-crab-400 group-active:scale-95 shadow-lg shadow-black/50 ${
          collapsed ? 'bg-crab-500/60 border-crab-400/60 h-16' : ''
        }`}
      />
      {/* Glow effect on hover */}
      <div className="absolute inset-0 bg-crab-500/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full" />
    </button>
  )
}

// ============================================================================
// Main Sidebar Container
// ============================================================================

interface SidebarProps {
  children: ReactNode
  collapsed: boolean
  onToggle: () => void
  /** Width when expanded (default: 288) */
  width?: number
  /** Width when collapsed (default: 52) */
  collapsedWidth?: number
}

export function Sidebar({
  children,
  collapsed,
  onToggle,
  width = 288,
  collapsedWidth = 52,
}: SidebarProps) {
  return (
    <SidebarContext.Provider value={{ collapsed, toggle: onToggle }}>
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? collapsedWidth : width }}
        transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
        className="relative h-full flex flex-col bg-shell-900/98 backdrop-blur-md border-r border-shell-700/80 group/sidebar"
      >
        {children}
        <SidebarToggleHandle collapsed={collapsed} onToggle={onToggle} />
      </motion.aside>
    </SidebarContext.Provider>
  )
}

// ============================================================================
// Sidebar Header
// ============================================================================

interface SidebarHeaderProps {
  title?: string
  icon?: ReactNode
  /** Optional badge/count */
  badge?: number
  /** Show search when expanded */
  searchable?: boolean
  searchValue?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
}

export function SidebarHeader({
  title,
  icon,
  badge,
  searchable,
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Filter...',
}: SidebarHeaderProps) {
  const { collapsed, toggle } = useSidebar()

  return (
    <div className="shrink-0">
      {/* Header bar */}
      <div
        className={`flex items-center gap-2 px-3 py-3 border-b border-shell-700/80 bg-shell-950/30 transition-all duration-200 ${
          collapsed ? 'justify-center' : ''
        }`}
      >
        {/* Icon (always visible) */}
        {icon && (
          <div
            className={`flex items-center justify-center rounded-md bg-shell-800 text-crab-400 shrink-0 transition-all duration-200 ${
              collapsed ? 'w-8 h-8' : 'w-7 h-7'
            }`}
          >
            {icon}
          </div>
        )}

        {/* Title + Badge (only when expanded) */}
        {!collapsed && (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {title && (
              <span className="font-console text-xs text-gray-300 tracking-wider truncate">
                {title.toUpperCase()}
              </span>
            )}
            {badge !== undefined && badge > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-crab-500/20 border border-crab-500/30 font-console text-[9px] text-crab-400 tabular-nums">
                {badge}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Search bar - only when expanded */}
      <AnimatePresence>
        {searchable && !collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="px-3 py-2 border-b border-shell-700/30">
              <div className="relative">
                <Search
                  size={12}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-shell-500"
                />
                <input
                  type="text"
                  value={searchValue}
                  onChange={(e) => onSearchChange?.(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full bg-shell-800/80 border border-shell-700/50 rounded-md pl-7 pr-3 py-1.5 text-xs font-console text-gray-200 placeholder-shell-500 focus:outline-none focus:border-crab-500/50 focus:ring-1 focus:ring-crab-500/20 transition-colors"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================================================
// Sidebar Section
// ============================================================================

interface SidebarSectionProps {
  children: ReactNode
  title?: string
  /** Collapsible section */
  collapsible?: boolean
  defaultCollapsed?: boolean
  /** Badge count */
  badge?: number
}

export function SidebarSection({
  children,
  title,
  collapsible,
  defaultCollapsed = false,
  badge,
}: SidebarSectionProps) {
  const { collapsed: sidebarCollapsed } = useSidebar()
  const [sectionCollapsed, setSectionCollapsed] = useState(defaultCollapsed)

  const isCollapsed = collapsible && sectionCollapsed

  return (
    <div className="relative">
      {/* Section header */}
      {title && !sidebarCollapsed && (
        <div
          onClick={collapsible ? () => setSectionCollapsed(!sectionCollapsed) : undefined}
          className={`flex items-center gap-2 px-3 py-2 ${
            collapsible ? 'cursor-pointer hover:bg-shell-800/30' : ''
          }`}
        >
          {collapsible && (
            <ChevronRight
              size={10}
              className={`text-shell-500 transition-transform ${
                !sectionCollapsed ? 'rotate-90' : ''
              }`}
            />
          )}
          <span className="font-console text-[9px] text-shell-500 uppercase tracking-widest flex-1">
            {title}
          </span>
          {badge !== undefined && badge > 0 && (
            <span className="px-1 rounded bg-shell-800 font-console text-[9px] text-shell-500 tabular-nums">
              {badge}
            </span>
          )}
        </div>
      )}

      {/* Section content */}
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={collapsible ? { height: 0, opacity: 0 } : false}
            animate={{ height: 'auto', opacity: 1 }}
            exit={collapsible ? { height: 0, opacity: 0 } : undefined}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================================================
// Sidebar Content (scrollable area)
// ============================================================================

interface SidebarContentProps {
  children: ReactNode
}

export function SidebarContent({ children }: SidebarContentProps) {
  return <div className="relative flex-1 overflow-y-auto overflow-x-hidden">{children}</div>
}

// ============================================================================
// Sidebar Item
// ============================================================================

interface SidebarItemProps {
  children: ReactNode
  icon?: ReactNode
  /** Secondary icon (right side) */
  endIcon?: ReactNode
  selected?: boolean
  onClick?: () => void
  /** Show in collapsed mode as icon-only */
  collapsedIcon?: ReactNode
  title?: string
  /** Status indicator color */
  status?: 'active' | 'warning' | 'error' | 'inactive'
  /** Indent level for nested items */
  indent?: number
}

export function SidebarItem({
  children,
  icon,
  endIcon,
  selected,
  onClick,
  collapsedIcon,
  title,
  status,
  indent = 0,
}: SidebarItemProps) {
  const { collapsed } = useSidebar()

  const statusColors = {
    active: 'bg-neon-mint',
    warning: 'bg-neon-peach',
    error: 'bg-crab-400',
    inactive: 'bg-shell-500',
  }

  if (collapsed) {
    return (
      <button
        onClick={onClick}
        title={title}
        className={`w-full flex items-center justify-center py-2.5 px-2 transition-all duration-150 group rounded-lg my-0.5 ${
          selected
            ? 'bg-crab-500/15 border border-crab-500/30'
            : 'hover:bg-shell-800/80 border border-transparent hover:border-shell-700/50'
        }`}
      >
        <div className="relative">
          <div
            className={`p-1.5 rounded-md transition-colors duration-150 ${
              selected ? 'bg-crab-500/20 text-crab-400' : 'bg-shell-800 text-shell-400 group-hover:text-gray-300'
            }`}
          >
            {collapsedIcon || icon || <Terminal size={14} />}
          </div>
          {status && (
            <span
              className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${statusColors[status]} ${
                status === 'active' ? 'animate-pulse' : ''
              }`}
            />
          )}
        </div>
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      title={title}
      style={{ paddingLeft: 12 + indent * 12 }}
      className={`w-full flex items-center gap-2.5 py-2 pr-3 text-left transition-all duration-150 group rounded-lg my-0.5 ${
        selected
          ? 'bg-crab-500/15 border border-crab-500/30'
          : 'hover:bg-shell-800/80 border border-transparent hover:border-shell-700/50'
      }`}
    >
      {/* Icon */}
      {icon && (
        <div className="relative shrink-0">
          <div
            className={`p-1.5 rounded-md transition-colors duration-150 ${
              selected ? 'bg-crab-500/20 text-crab-400' : 'bg-shell-800 text-shell-500 group-hover:text-gray-400'
            }`}
          >
            {icon}
          </div>
          {status && (
            <span
              className={`absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ${statusColors[status]} ${
                status === 'active' ? 'animate-pulse' : ''
              }`}
            />
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">{children}</div>

      {/* End icon */}
      {endIcon && (
        <div className="shrink-0 text-shell-500 group-hover:text-shell-400">{endIcon}</div>
      )}
    </button>
  )
}

// ============================================================================
// Sidebar Divider
// ============================================================================

export function SidebarDivider() {
  const { collapsed } = useSidebar()
  return (
    <div className={`border-t border-shell-700/60 ${collapsed ? 'mx-2 my-2' : 'mx-3 my-2'}`} />
  )
}

// ============================================================================
// Sidebar Footer
// ============================================================================

interface SidebarFooterProps {
  children: ReactNode
}

export function SidebarFooter({ children }: SidebarFooterProps) {
  const { collapsed } = useSidebar()
  return (
    <div
      className={`shrink-0 border-t border-shell-700/80 bg-shell-950/50 ${
        collapsed ? 'py-3 px-2' : 'px-3 py-2'
      }`}
    >
      {children}
    </div>
  )
}

// ============================================================================
// Sidebar Empty State
// ============================================================================

interface SidebarEmptyProps {
  icon?: ReactNode
  title: string
  description?: string
}

export function SidebarEmpty({ icon, title, description }: SidebarEmptyProps) {
  const { collapsed } = useSidebar()

  if (collapsed) {
    return (
      <div className="flex flex-col items-center justify-center py-6">
        <div className="p-2 rounded-md bg-shell-800 text-shell-500">
          {icon || <Terminal size={16} />}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
      <div className="p-2.5 rounded-md bg-shell-800 border border-shell-700/50 mb-3 text-shell-500">
        {icon || <Terminal size={18} />}
      </div>
      <p className="font-console text-xs text-shell-400">{title}</p>
      {description && (
        <p className="font-console text-[10px] text-shell-500 mt-1">{description}</p>
      )}
    </div>
  )
}

// ============================================================================
// Quick Filter Pills
// ============================================================================

interface SidebarFilterPillsProps {
  options: { value: string; label: string; icon?: ReactNode }[]
  selected: string | null
  onSelect: (value: string | null) => void
}

export function SidebarFilterPills({ options, selected, onSelect }: SidebarFilterPillsProps) {
  const { collapsed } = useSidebar()

  if (collapsed) return null

  return (
    <div className="flex flex-wrap gap-1.5 px-3 py-2 border-b border-shell-700/30">
      <button
        onClick={() => onSelect(null)}
        className={`px-2 py-1 rounded-md text-[10px] font-console uppercase tracking-wider transition-all ${
          selected === null
            ? 'bg-crab-500/20 border border-crab-500/40 text-crab-400'
            : 'bg-shell-800/50 border border-shell-700/50 text-shell-400 hover:text-shell-300 hover:border-shell-600'
        }`}
      >
        All
      </button>
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onSelect(opt.value)}
          className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-console uppercase tracking-wider transition-all ${
            selected === opt.value
              ? 'bg-crab-500/20 border border-crab-500/40 text-crab-400'
              : 'bg-shell-800/50 border border-shell-700/50 text-shell-400 hover:text-shell-300 hover:border-shell-600'
          }`}
        >
          {opt.icon}
          {opt.label}
        </button>
      ))}
    </div>
  )
}
