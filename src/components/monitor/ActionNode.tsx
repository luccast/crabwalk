import { memo, useState } from 'react'
import { Handle, Position } from '@xyflow/react'
import { motion } from 'framer-motion'
import { Loader2, CheckCircle, XCircle, Wrench, MessageSquare } from 'lucide-react'
import type { MonitorAction } from '~/integrations/clawdbot'

interface ActionNodeProps {
  data: MonitorAction
  selected?: boolean
}

const typeConfig: Record<
  MonitorAction['type'],
  {
    icon: typeof Loader2
    color: string
    iconColor: string
    animate: boolean
  }
> = {
  delta: {
    icon: Loader2,
    color: 'border-blue-500 bg-blue-500/10',
    iconColor: 'text-blue-400',
    animate: true,
  },
  final: {
    icon: CheckCircle,
    color: 'border-green-500 bg-green-500/10',
    iconColor: 'text-green-400',
    animate: false,
  },
  aborted: {
    icon: XCircle,
    color: 'border-orange-500 bg-orange-500/10',
    iconColor: 'text-orange-400',
    animate: false,
  },
  error: {
    icon: XCircle,
    color: 'border-red-500 bg-red-500/10',
    iconColor: 'text-red-400',
    animate: false,
  },
  tool_call: {
    icon: Wrench,
    color: 'border-purple-500 bg-purple-500/10',
    iconColor: 'text-purple-400',
    animate: false,
  },
  tool_result: {
    icon: MessageSquare,
    color: 'border-cyan-500 bg-cyan-500/10',
    iconColor: 'text-cyan-400',
    animate: false,
  },
}

export const ActionNode = memo(function ActionNode({
  data,
  selected,
}: ActionNodeProps) {
  const [expanded, setExpanded] = useState(false)
  const config = typeConfig[data.type]
  const Icon = config.icon

  // Safely get content as string
  const contentStr = typeof data.content === 'string'
    ? data.content
    : data.content != null
      ? JSON.stringify(data.content)
      : null

  const truncatedContent = contentStr
    ? contentStr.length > 80
      ? contentStr.slice(0, 80) + '...'
      : contentStr
    : null

  const fullContent = contentStr

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      onClick={() => setExpanded(!expanded)}
      className={`
        px-3 py-2 rounded-md border min-w-[160px] max-w-[280px] cursor-pointer
        ${config.color}
        ${selected ? 'ring-2 ring-white/50' : ''}
      `}
    >
      <Handle type="target" position={Position.Top} className="bg-gray-500! w-2! h-2!" />

      <div className="flex items-center gap-2 mb-1">
        <Icon
          size={14}
          className={`${config.iconColor} ${config.animate ? 'animate-spin' : ''}`}
        />
        <span className="text-xs font-medium text-gray-200 capitalize">
          {data.type.replace('_', ' ')}
        </span>
        <span className="text-[10px] text-gray-500 ml-auto">
          #{data.seq}
        </span>
      </div>

      {data.toolName && (
        <div className="text-xs text-purple-300 mb-1 font-mono">
          {data.toolName}
        </div>
      )}

      {truncatedContent && (
        <div className="text-[11px] text-gray-300 leading-tight">
          {expanded ? fullContent : truncatedContent}
        </div>
      )}

      {expanded && data.toolArgs != null && (
        <pre className="mt-2 text-[10px] text-gray-400 bg-black/30 p-1 rounded overflow-auto max-h-32">
          {JSON.stringify(data.toolArgs, null, 2) as string}
        </pre>
      )}

      <Handle type="source" position={Position.Bottom} className="bg-gray-500! w-2! h-2!" />
    </motion.div>
  )
})
