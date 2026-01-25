import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Filter } from 'lucide-react'
import { StatusIndicator } from './StatusIndicator'
import type { MonitorSession } from '~/integrations/clawdbot'

interface SessionListProps {
  sessions: MonitorSession[]
  selectedKey: string | null
  onSelect: (key: string) => void
}

const platformEmoji: Record<string, string> = {
  whatsapp: '💬',
  telegram: '✈️',
  discord: '🎮',
  slack: '💼',
}

export function SessionList({ sessions, selectedKey, onSelect }: SessionListProps) {
  const [filter, setFilter] = useState('')
  const [platformFilter, setPlatformFilter] = useState<string | null>(null)

  const platforms = [...new Set(sessions.map((s) => s.platform))]

  const filteredSessions = sessions.filter((session) => {
    const matchesText =
      !filter ||
      session.recipient.toLowerCase().includes(filter.toLowerCase()) ||
      session.agentId.toLowerCase().includes(filter.toLowerCase())
    const matchesPlatform = !platformFilter || session.platform === platformFilter
    return matchesText && matchesPlatform
  })

  // Sort: active first, then by lastActivityAt
  const sortedSessions = [...filteredSessions].sort((a, b) => {
    if (a.status !== 'idle' && b.status === 'idle') return -1
    if (a.status === 'idle' && b.status !== 'idle') return 1
    return b.lastActivityAt - a.lastActivityAt
  })

  return (
    <div className="flex flex-col h-full bg-gray-900 border-r border-gray-700">
      <div className="p-3 border-b border-gray-700">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-2.5 text-gray-500" />
          <input
            type="text"
            placeholder="Filter sessions..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm bg-gray-800 border border-gray-700 rounded focus:outline-none focus:border-cyan-500"
          />
        </div>

        {platforms.length > 1 && (
          <div className="flex gap-1 mt-2 flex-wrap">
            <button
              onClick={() => setPlatformFilter(null)}
              className={`px-2 py-0.5 text-xs rounded ${
                !platformFilter ? 'bg-cyan-600' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              All
            </button>
            {platforms.map((p) => (
              <button
                key={p}
                onClick={() => setPlatformFilter(p)}
                className={`px-2 py-0.5 text-xs rounded ${
                  platformFilter === p ? 'bg-cyan-600' : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                {platformEmoji[p] || '📱'} {p}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {sortedSessions.map((session) => (
            <motion.button
              key={session.key}
              layout
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onClick={() => onSelect(session.key)}
              className={`w-full text-left p-3 border-b border-gray-800 hover:bg-gray-800 transition-colors ${
                selectedKey === session.key ? 'bg-gray-800 border-l-2 border-l-cyan-500' : ''
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span>{platformEmoji[session.platform] || '📱'}</span>
                <span className="text-sm font-medium truncate flex-1">
                  {session.recipient}
                </span>
                <StatusIndicator status={session.status} size="sm" />
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="truncate">{session.agentId}</span>
                {session.isGroup && (
                  <span className="px-1 py-0.5 bg-gray-700 rounded text-[10px]">
                    group
                  </span>
                )}
              </div>
            </motion.button>
          ))}
        </AnimatePresence>

        {sortedSessions.length === 0 && (
          <div className="p-4 text-center text-gray-500 text-sm">
            No sessions found
          </div>
        )}
      </div>

      <div className="p-2 border-t border-gray-700 text-xs text-gray-500 text-center">
        {sessions.length} session{sessions.length !== 1 ? 's' : ''}
      </div>
    </div>
  )
}
