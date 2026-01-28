import { memo, useCallback, useEffect, useState } from 'react'
import { Handle, Position } from '@xyflow/react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, User, Clock, Copy, Check } from 'lucide-react'
import { StatusIndicator } from './StatusIndicator'
import type { MonitorSession } from '~/integrations/clawdbot'

interface SessionNodeProps {
  data: MonitorSession
  selected?: boolean
}

const platformIcons: Record<string, string> = {
  whatsapp: '💬',
  telegram: '✈️',
  discord: '🎮',
  slack: '💼',
  subagent: '🤖',
}

function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

export const SessionNode = memo(function SessionNode({
  data,
  selected,
}: SessionNodeProps) {
  const [copied, setCopied] = useState(false)
  const [, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  // Detect if this is a subagent session by checking if platform is "subagent" or if key contains "subagent"
  const isSubagent = data.platform === 'subagent' || data.key.includes('subagent') || Boolean(data.spawnedBy)
  const platformIcon = isSubagent ? platformIcons.subagent : (platformIcons[data.platform] ?? '📱')
  const displayPlatform = isSubagent ? 'subagent' : data.platform

  const relativeTime = (!data.lastActivityAt || data.lastActivityAt <= 0)
    ? null
    : formatRelativeTime(data.lastActivityAt)

  const handleCopyKey = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(data.key).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [data.key])

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`
        px-4 py-3 rounded-lg border-2 min-w-[180px]
        bg-shell-900 text-white
        ${data.status === 'thinking' ? 'border-crab-500 animate-pulse' : selected ? 'border-crab-500' : isSubagent ? 'border-neon-cyan border-opacity-50' : 'border-shell-600'}
        transition-all duration-150 hover:bg-shell-800
      `}
      style={{
        boxShadow: data.status === 'thinking'
          ? '0 0 24px rgba(239, 68, 68, 0.5), 0 0 8px rgba(239, 68, 68, 0.3), 0 4px 12px rgba(0, 0, 0, 0.3)'
          : selected
          ? '0 0 20px rgba(239, 68, 68, 0.4), 0 4px 12px rgba(0, 0, 0, 0.3)'
          : isSubagent
          ? '0 0 12px rgba(0, 255, 213, 0.2), 0 4px 12px rgba(0, 0, 0, 0.3)'
          : '0 4px 12px rgba(0, 0, 0, 0.3)',
      }}
    >
      <Handle type="target" position={Position.Top} className="bg-crab-500! w-3! h-3! border-2! border-shell-900!" />
      <Handle type="target" id="spawn-target" position={Position.Left} className="bg-neon-cyan! w-3! h-3! border-2! border-shell-900!" />

      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{platformIcon}</span>
        <span className="font-display text-xs font-semibold uppercase tracking-wide text-gray-200">
          {displayPlatform}
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <button
            onClick={handleCopyKey}
            className="p-1 rounded hover:bg-shell-700 transition-colors"
            title={`Copy key: ${data.key}`}
          >
            <AnimatePresence mode="wait">
              {copied ? (
                <motion.div
                  key="check"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Check size={12} className="text-neon-mint" />
                </motion.div>
              ) : (
                <motion.div
                  key="copy"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Copy size={12} className="text-shell-400 hover:text-shell-200" />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
          <StatusIndicator status={data.status} size="sm" />
        </div>
      </div>

      <div className="flex items-center gap-2 mb-2">
        {data.isGroup ? (
          <Users size={12} className="text-shell-500" />
        ) : (
          <User size={12} className="text-shell-500" />
        )}
        <span className="font-display text-[11px] text-gray-300 truncate max-w-[120px]">
          {data.recipient}
        </span>
      </div>

      <div className="font-console text-[11px] text-shell-500 truncate">
        <span className="text-crab-600">&gt;</span> {data.agentId}
      </div>

      {relativeTime && (
        <div className="flex items-center gap-1 mt-2 font-console text-[10px] text-shell-500">
          <Clock size={10} className="text-shell-600" />
          <span>{relativeTime}</span>
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="bg-crab-500! w-3! h-3! border-2! border-shell-900!" />
      <Handle type="source" id="spawn-source" position={Position.Right} className="bg-neon-cyan! w-3! h-3! border-2! border-shell-900!" />
    </motion.div>
  )
})
