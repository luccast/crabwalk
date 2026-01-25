import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { motion } from 'framer-motion'
import { MessageSquare, Users, User } from 'lucide-react'
import { StatusIndicator } from './StatusIndicator'
import type { MonitorSession } from '~/integrations/clawdbot'

type SessionNodeData = MonitorSession

const platformIcons: Record<string, string> = {
  whatsapp: '💬',
  telegram: '✈️',
  discord: '🎮',
  slack: '💼',
}

export const SessionNode = memo(function SessionNode({
  data,
  selected,
}: NodeProps<SessionNodeData>) {
  const platformIcon = platformIcons[data.platform] ?? '📱'

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`
        px-4 py-3 rounded-lg border-2 min-w-[180px]
        bg-gray-800 text-white shadow-lg
        ${selected ? 'border-cyan-400' : 'border-gray-600'}
        ${data.status === 'thinking' ? 'border-yellow-500' : ''}
      `}
    >
      <Handle type="target" position={Position.Top} className="!bg-gray-500" />

      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{platformIcon}</span>
        <span className="font-semibold text-sm capitalize">{data.platform}</span>
        <StatusIndicator status={data.status} size="sm" />
      </div>

      <div className="flex items-center gap-2 text-gray-300 text-xs">
        {data.isGroup ? (
          <Users size={12} className="text-gray-400" />
        ) : (
          <User size={12} className="text-gray-400" />
        )}
        <span className="truncate max-w-[120px]">{data.recipient}</span>
      </div>

      <div className="mt-2 text-[10px] text-gray-500 truncate">
        {data.agentId}
      </div>

      <Handle type="source" position={Position.Bottom} className="!bg-gray-500" />
    </motion.div>
  )
})
