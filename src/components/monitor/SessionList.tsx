import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, ChevronDown, Github, Activity, Zap, Bot } from 'lucide-react'
import {
  Sidebar,
  SidebarHeader,
  SidebarSection,
  SidebarContent,
  SidebarItem,
  SidebarFooter,
  SidebarEmpty,
  SidebarFilterPills,
} from '~/components/layout'
import { StatusIndicator } from './StatusIndicator'
import type { MonitorSession } from '~/integrations/openclaw'

function isSubagent(session: MonitorSession): boolean {
  return (
    Boolean(session.spawnedBy) ||
    session.platform === 'subagent' ||
    session.key.includes('subagent')
  )
}

function XIcon({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={['footer-icon-x', className].filter(Boolean).join(' ')}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.601.75Zm-.86 13.028h1.36L4.323 2.145H2.865z" />
    </svg>
  )
}

interface SessionListProps {
  sessions: MonitorSession[]
  selectedKey: string | null
  onSelect: (key: string) => void
  collapsed: boolean
  onToggleCollapse: () => void
}

const platformEmoji: Record<string, string> = {
  whatsapp: '💬',
  telegram: '✈️',
  discord: '🎮',
  slack: '💼',
}

const platformIcon: Record<string, React.ReactNode> = {
  whatsapp: <span className="text-sm">💬</span>,
  telegram: <span className="text-sm">✈️</span>,
  discord: <span className="text-sm">🎮</span>,
  slack: <span className="text-sm">💼</span>,
}

function SessionItemContent({
  session,
  collapsed,
}: {
  session: MonitorSession
  collapsed: boolean
}) {
  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-1">
        <span className="text-base">{platformEmoji[session.platform] || '📱'}</span>
        <StatusIndicator status={session.status} size="sm" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <div className="flex items-center gap-2">
        <span className="font-console text-xs text-gray-200 truncate group-hover:text-white">
          {session.recipient}
        </span>
        {session.isGroup && (
          <span className="flex items-center gap-0.5 px-1 py-0.5 bg-shell-800/80 border border-shell-700/50 rounded text-[9px] text-shell-400 shrink-0">
            <Users size={9} />
          </span>
        )}
      </div>
      <span className="font-console text-[10px] text-shell-500 truncate">{session.agentId}</span>
    </div>
  )
}

function SubagentGroupHeader({
  count,
  collapsed: groupCollapsed,
  onToggle,
  sidebarCollapsed,
}: {
  count: number
  collapsed: boolean
  onToggle: () => void
  sidebarCollapsed: boolean
}) {
  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center gap-1.5 border-b border-shell-700/30 transition-all hover:bg-shell-800/30 ${
        sidebarCollapsed ? 'p-2 justify-center' : 'px-3 py-1.5'
      }`}
    >
      <ChevronDown
        size={12}
        className={`text-shell-500 transition-transform ${groupCollapsed ? '-rotate-90' : ''}`}
      />
      {!sidebarCollapsed && (
        <span className="font-console text-[9px] text-shell-500 uppercase tracking-wider">
          {count} subagent{count > 1 ? 's' : ''}
        </span>
      )}
    </button>
  )
}

export function SessionList({
  sessions,
  selectedKey,
  onSelect,
  collapsed,
  onToggleCollapse,
}: SessionListProps) {
  const [filter, setFilter] = useState('')
  const [platformFilter, setPlatformFilter] = useState<string | null>(null)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  const parentSessions = sessions.filter((s) => !isSubagent(s))
  const platforms = [...new Set(parentSessions.map((s) => s.platform))]

  const activeCount = parentSessions.filter((s) => s.status !== 'idle').length

  const filteredParents = parentSessions.filter((session) => {
    const matchesText =
      !filter ||
      session.recipient.toLowerCase().includes(filter.toLowerCase()) ||
      session.agentId.toLowerCase().includes(filter.toLowerCase())
    const matchesPlatform = !platformFilter || session.platform === platformFilter
    return matchesText && matchesPlatform
  })

  // Sort: active first, then by lastActivityAt
  const sortedParents = [...filteredParents].sort((a, b) => {
    if (a.status !== 'idle' && b.status === 'idle') return -1
    if (a.status === 'idle' && b.status !== 'idle') return 1
    return b.lastActivityAt - a.lastActivityAt
  })

  // Group subagents by parent key
  const { subagentsByParent, orphanSubagents } = useMemo(() => {
    const byParent = new Map<string, MonitorSession[]>()
    const orphans: MonitorSession[] = []
    const parentKeys = new Set(parentSessions.map((s) => s.key))

    for (const session of sessions) {
      if (!isSubagent(session)) continue
      const matchesFilter =
        !filter ||
        session.agentId.toLowerCase().includes(filter.toLowerCase()) ||
        'subagent'.includes(filter.toLowerCase())
      if (!matchesFilter) continue

      if (session.spawnedBy && parentKeys.has(session.spawnedBy)) {
        const list = byParent.get(session.spawnedBy) ?? []
        list.push(session)
        byParent.set(session.spawnedBy, list)
      } else {
        orphans.push(session)
      }
    }

    // Sort subagents within each group by activity
    for (const [key, list] of byParent) {
      list.sort((a, b) => b.lastActivityAt - a.lastActivityAt)
      byParent.set(key, list)
    }
    orphans.sort((a, b) => b.lastActivityAt - a.lastActivityAt)

    return { subagentsByParent: byParent, orphanSubagents: orphans }
  }, [sessions, parentSessions, filter])

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <Sidebar collapsed={collapsed} onToggle={onToggleCollapse}>
      <SidebarHeader
        title="Sessions"
        icon={<Activity size={16} />}
        badge={activeCount > 0 ? activeCount : undefined}
        searchable
        searchValue={filter}
        onSearchChange={setFilter}
        searchPlaceholder="Filter sessions..."
      />

      {/* Platform filters */}
      {platforms.length > 1 && (
        <SidebarFilterPills
          options={platforms.map((p) => ({
            value: p,
            label: p,
            icon: platformIcon[p],
          }))}
          selected={platformFilter}
          onSelect={setPlatformFilter}
        />
      )}

      <SidebarContent>
        <AnimatePresence mode="popLayout">
          {sortedParents.map((session) => {
            const subs = subagentsByParent.get(session.key)
            const hasSubs = subs && subs.length > 0
            const isGroupCollapsed = collapsedGroups.has(session.key)

            return (
              <div key={session.key}>
                <SidebarItem
                  icon={
                    <span className="text-base">
                      {platformEmoji[session.platform] || '📱'}
                    </span>
                  }
                  collapsedIcon={
                    <span className="text-base">
                      {platformEmoji[session.platform] || '📱'}
                    </span>
                  }
                  selected={selectedKey === session.key}
                  onClick={() => onSelect(session.key)}
                  title={collapsed ? `${session.recipient} (${session.platform})` : undefined}
                  status={session.status === 'idle' ? 'inactive' : 'active'}
                  endIcon={<StatusIndicator status={session.status} size="sm" />}
                >
                  <SessionItemContent session={session} collapsed={collapsed} />
                </SidebarItem>

                {/* Nested subagents */}
                {hasSubs && (
                  <>
                    <SubagentGroupHeader
                      count={subs.length}
                      collapsed={isGroupCollapsed}
                      onToggle={() => toggleGroup(session.key)}
                      sidebarCollapsed={collapsed}
                    />
                    <motion.div
                      initial={false}
                      animate={{
                        height: isGroupCollapsed ? 0 : 'auto',
                        opacity: isGroupCollapsed ? 0 : 1,
                      }}
                      transition={{ duration: 0.15, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      {subs.map((sub) => (
                        <SidebarItem
                          key={sub.key}
                          icon={<Bot size={14} className="text-neon-cyan" />}
                          collapsedIcon={<Bot size={14} className="text-neon-cyan" />}
                          selected={selectedKey === sub.key}
                          onClick={() => onSelect(sub.key)}
                          title={collapsed ? 'subagent' : undefined}
                          status={sub.status === 'idle' ? 'inactive' : 'active'}
                          indent={1}
                          endIcon={<StatusIndicator status={sub.status} size="sm" />}
                        >
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <span className="font-console text-[10px] text-neon-cyan/70 uppercase tracking-wider">
                              subagent
                            </span>
                            <span className="font-console text-[10px] text-shell-400 truncate">
                              {sub.recipient}
                            </span>
                          </div>
                        </SidebarItem>
                      ))}
                    </motion.div>
                  </>
                )}
              </div>
            )
          })}

          {/* Orphan subagents */}
          {orphanSubagents.length > 0 && (
            <SidebarSection title="Orphan Subagents" collapsible badge={orphanSubagents.length}>
              {orphanSubagents.map((sub) => (
                <SidebarItem
                  key={sub.key}
                  icon={<Bot size={14} className="text-neon-cyan" />}
                  collapsedIcon={<Bot size={14} className="text-neon-cyan" />}
                  selected={selectedKey === sub.key}
                  onClick={() => onSelect(sub.key)}
                  title={collapsed ? 'subagent' : undefined}
                  status={sub.status === 'idle' ? 'inactive' : 'active'}
                  endIcon={<StatusIndicator status={sub.status} size="sm" />}
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="font-console text-[10px] text-neon-cyan/70 uppercase tracking-wider">
                      subagent
                    </span>
                    <span className="font-console text-[10px] text-shell-400 truncate">
                      {sub.recipient}
                    </span>
                  </div>
                </SidebarItem>
              ))}
            </SidebarSection>
          )}
        </AnimatePresence>

        {/* Empty state */}
        {sortedParents.length === 0 && orphanSubagents.length === 0 && (
          <SidebarEmpty
            icon={<Zap size={18} />}
            title="No sessions found"
            description={filter ? 'Try adjusting your filter' : undefined}
          />
        )}
      </SidebarContent>

      <SidebarFooter>
        <div
          className={`font-console text-[10px] text-shell-500 flex items-center justify-center ${
            collapsed ? 'flex-col gap-2' : 'gap-4'
          }`}
        >
          <a
            href="https://github.com/luccast/crabwalk"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 hover:text-crab-400 transition-colors"
            title="Github"
          >
            <Github size={12} />
            {!collapsed && <span>Github</span>}
          </a>
          <a
            href="https://x.com/luccasveg"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 hover:text-crab-400 transition-colors"
            aria-label="X"
            title="X"
          >
            <XIcon size={12} />
            {!collapsed && <span>@luccasveg</span>}
          </a>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
