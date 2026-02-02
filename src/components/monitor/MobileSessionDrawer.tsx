import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Users, ChevronDown, Github, Search } from 'lucide-react'
import { StatusIndicator } from './StatusIndicator'
import type { MonitorSession } from '~/integrations/openclaw'

function isSubagent(session: MonitorSession): boolean {
  return Boolean(session.spawnedBy) || session.platform === 'subagent' || session.key.includes('subagent')
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

const platformEmoji: Record<string, string> = {
  whatsapp: '💬',
  telegram: '✈️',
  discord: '🎮',
  slack: '💼',
}

interface MobileSessionDrawerProps {
  open: boolean
  onClose: () => void
  sessions: MonitorSession[]
  selectedKey: string | null
  onSelect: (key: string) => void
}

function SubagentItem({
  session,
  selected,
  onSelect,
}: {
  session: MonitorSession
  selected: boolean
  onSelect: (key: string) => void
}) {
  return (
    <button
      onClick={() => onSelect(session.key)}
      className={`w-full text-left py-3 pr-4 pl-8 border-b border-shell-800/50 transition-all duration-150 ${
        selected
          ? 'bg-neon-cyan/5 border-l-2 border-l-neon-cyan'
          : 'active:bg-shell-800/30 border-l-2 border-l-transparent'
      }`}
    >
      <div className="font-display text-[9px] font-medium text-neon-cyan/60 uppercase tracking-widest mb-1">
        subagent
      </div>
      <div className="flex items-center gap-3">
        <span className="text-base">🤖</span>
        <span className="font-console text-sm text-shell-400 truncate flex-1">
          {session.recipient}
        </span>
        <StatusIndicator status={session.status} size="sm" />
      </div>
    </button>
  )
}

export function MobileSessionDrawer({
  open,
  onClose,
  sessions,
  selectedKey,
  onSelect,
}: MobileSessionDrawerProps) {
  const [filter, setFilter] = useState('')
  const [platformFilter, setPlatformFilter] = useState<string | null>(null)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  const parentSessions = sessions.filter((s) => !isSubagent(s))
  const platforms = [...new Set(parentSessions.map((s) => s.platform))]

  const filteredParents = parentSessions.filter((session) => {
    const matchesText =
      !filter ||
      session.recipient.toLowerCase().includes(filter.toLowerCase()) ||
      session.agentId.toLowerCase().includes(filter.toLowerCase())
    const matchesPlatform = !platformFilter || session.platform === platformFilter
    return matchesText && matchesPlatform
  })

  const sortedParents = [...filteredParents].sort((a, b) => {
    if (a.status !== 'idle' && b.status === 'idle') return -1
    if (a.status === 'idle' && b.status !== 'idle') return 1
    return b.lastActivityAt - a.lastActivityAt
  })

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

    for (const [key, list] of byParent) {
      list.sort((a, b) => b.lastActivityAt - a.lastActivityAt)
      byParent.set(key, list)
    }
    orphans.sort((a, b) => b.lastActivityAt - a.lastActivityAt)

    return { subagentsByParent: byParent, orphanSubagents: orphans }
  }, [sessions, parentSessions, filter])

  const handleSelect = (key: string) => {
    onSelect(key)
    onClose()
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
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
          />

          {/* Sheet - slides up from bottom */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed inset-x-0 bottom-0 z-50 flex flex-col bg-shell-900 rounded-t-2xl max-h-[85vh]"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-shell-600" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-3 border-b border-shell-800">
              <h2 className="font-mono uppercase text-sm text-crab-400 tracking-wider">
                Sessions
              </h2>
              <button
                onClick={onClose}
                className="p-2 -mr-2 active:bg-shell-800 rounded-lg transition-colors"
              >
                <X size={24} className="text-gray-400" />
              </button>
            </div>

            {/* Search */}
            <div className="px-4 py-3 border-b border-shell-800">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-shell-500" />
                <input
                  type="text"
                  placeholder="Filter sessions..."
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="w-full bg-shell-800 border border-shell-700 rounded-lg pl-9 pr-3 py-2.5 text-sm font-console text-gray-200 placeholder-shell-500 focus:outline-none focus:border-crab-500"
                />
              </div>

              {/* Platform filters */}
              {platforms.length > 1 && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  <button
                    onClick={() => setPlatformFilter(null)}
                    className={`px-3 py-1.5 text-xs font-display uppercase tracking-wide rounded-lg border transition-all ${
                      !platformFilter
                        ? 'bg-crab-600 border-crab-500 text-white'
                        : 'bg-shell-800 border-shell-700 text-gray-400 active:border-shell-600'
                    }`}
                  >
                    All
                  </button>
                  {platforms.map((p) => (
                    <button
                      key={p}
                      onClick={() => setPlatformFilter(p)}
                      className={`px-3 py-1.5 text-xs font-display uppercase tracking-wide rounded-lg border transition-all ${
                        platformFilter === p
                          ? 'bg-crab-600 border-crab-500 text-white'
                          : 'bg-shell-800 border-shell-700 text-gray-400 active:border-shell-600'
                      }`}
                    >
                      {platformEmoji[p] || '📱'} {p}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Session list */}
            <div className="flex-1 overflow-y-auto overscroll-contain">
              <AnimatePresence mode="sync">
                {sortedParents.map((session) => (
                  <motion.div
                    key={session.key}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <button
                      onClick={() => handleSelect(session.key)}
                      className={`w-full text-left p-4 border-b border-shell-800 transition-all duration-150 ${
                        selectedKey === session.key
                          ? 'bg-crab-900/20 border-l-2 border-l-crab-500'
                          : 'active:bg-shell-800/50 border-l-2 border-l-transparent'
                      }`}
                    >
                      <div className="font-display text-[9px] font-medium text-shell-500 uppercase tracking-widest mb-1">
                        main
                      </div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xl">
                          {platformEmoji[session.platform] || '📱'}
                        </span>
                        <span className="font-display text-sm font-medium text-gray-200 truncate flex-1 uppercase tracking-wide">
                          {session.recipient}
                        </span>
                        <StatusIndicator status={session.status} size="sm" />
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-console text-xs text-shell-500 truncate flex-1">
                          {session.agentId}
                        </span>
                        {session.isGroup && (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-shell-800 border border-shell-700 rounded text-xs text-shell-400">
                            <Users size={12} />
                            group
                          </span>
                        )}
                      </div>
                    </button>

                    {/* Nested subagents */}
                    {(() => {
                      const subs = subagentsByParent.get(session.key)
                      if (!subs?.length) return null
                      const isGroupCollapsed = collapsedGroups.has(session.key)
                      return (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setCollapsedGroups((prev) => {
                                const next = new Set(prev)
                                if (next.has(session.key)) next.delete(session.key)
                                else next.add(session.key)
                                return next
                              })
                            }}
                            className="w-full px-4 py-2 text-left flex items-center gap-2 text-xs font-display uppercase tracking-widest text-shell-500 active:text-shell-300 active:bg-shell-800/30 border-b border-shell-800/50"
                          >
                            <ChevronDown
                              size={16}
                              className={`transition-transform ${isGroupCollapsed ? '-rotate-90' : ''}`}
                            />
                            <span>
                              {subs.length} subagent{subs.length > 1 ? 's' : ''}
                            </span>
                          </button>
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
                              <SubagentItem
                                key={sub.key}
                                session={sub}
                                selected={selectedKey === sub.key}
                                onSelect={handleSelect}
                              />
                            ))}
                          </motion.div>
                        </>
                      )
                    })()}
                  </motion.div>
                ))}

                {/* Orphan subagents */}
                {orphanSubagents.map((sub) => (
                  <motion.div
                    key={sub.key}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <SubagentItem
                      session={sub}
                      selected={selectedKey === sub.key}
                      onSelect={handleSelect}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>

              {sortedParents.length === 0 && orphanSubagents.length === 0 && (
                <div className="p-8 text-center">
                  <div className="font-console text-sm text-shell-500">
                    <span className="text-crab-600">&gt;</span> no sessions found
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-shell-800 bg-shell-950/50">
              <div className="font-console text-xs text-shell-500 text-center flex items-center justify-center gap-6">
                <a
                  href="https://github.com/luccast/crabwalk"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-shell-500 active:text-crab-500 transition-colors"
                >
                  <Github size={14} />
                  <span>Github</span>
                </a>
                <a
                  href="https://x.com/luccasveg"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-shell-500 active:text-crab-500 transition-colors"
                >
                  <XIcon size={14} />
                  <span>@luccasveg</span>
                </a>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
