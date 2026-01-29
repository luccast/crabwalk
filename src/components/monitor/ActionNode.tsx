import { memo, useState } from 'react'
import { Handle, Position } from '@xyflow/react'
import { motion } from 'framer-motion'
import Markdown from 'react-markdown'
import {
  Loader2,
  CheckCircle,
  XCircle,
  Wrench,
  MessageSquare,
  MessageCircle,
  Bot,
} from 'lucide-react'
import type { MonitorAction } from '~/integrations/clawdbot'

interface ActionNodeProps {
  data: MonitorAction
  selected?: boolean
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

const stateConfig: Record<
  MonitorAction['type'],
  {
    icon: typeof Loader2
    borderColor: string
    bgColor: string
    iconColor: string
    animate: boolean
    label?: string
  }
> = {
  start: {
    icon: Loader2,
    borderColor: 'border-neon-cyan',
    bgColor: 'bg-neon-cyan/10',
    iconColor: 'text-neon-cyan',
    animate: true,
  },
  streaming: {
    icon: Loader2,
    borderColor: 'border-neon-cyan',
    bgColor: 'bg-neon-cyan/10',
    iconColor: 'text-neon-cyan',
    animate: true,
  },
  complete: {
    icon: CheckCircle,
    borderColor: 'border-neon-mint',
    bgColor: 'bg-neon-mint/10',
    iconColor: 'text-neon-mint',
    animate: false,
  },
  aborted: {
    icon: XCircle,
    borderColor: 'border-neon-peach',
    bgColor: 'bg-neon-peach/10',
    iconColor: 'text-neon-peach',
    animate: false,
    label: 'Aborted',
  },
  error: {
    icon: XCircle,
    borderColor: 'border-crab-500',
    bgColor: 'bg-crab-500/10',
    iconColor: 'text-crab-400',
    animate: false,
  },
  tool_call: {
    icon: Wrench,
    borderColor: 'border-neon-lavender',
    bgColor: 'bg-neon-lavender/10',
    iconColor: 'text-neon-lavender',
    animate: false,
  },
  tool_result: {
    icon: MessageSquare,
    borderColor: 'border-pastel-sky',
    bgColor: 'bg-pastel-sky/10',
    iconColor: 'text-pastel-sky',
    animate: false,
  },
}

const eventTypeLabels: Record<MonitorAction['eventType'], { label: string; icon: typeof MessageCircle }> = {
  chat: { label: 'Chat', icon: MessageCircle },
  agent: { label: 'Agent', icon: Bot },
  system: { label: 'System', icon: MessageSquare },
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  const secs = ms / 1000
  if (secs < 60) return `${secs.toFixed(1)}s`
  const mins = Math.floor(secs / 60)
  const remainSecs = Math.floor(secs % 60)
  return `${mins}m ${remainSecs}s`
}

export const ActionNode = memo(function ActionNode({
  data,
  selected,
}: ActionNodeProps) {
  const [expanded, setExpanded] = useState(false)
  const state = stateConfig[data.type]
  const eventInfo = eventTypeLabels[data.eventType || 'chat']
  const StateIcon = state.icon
  const EventIcon = eventInfo.icon

  // Safely get content as string
  const contentStr = typeof data.content === 'string'
    ? data.content
    : data.content != null
      ? JSON.stringify(data.content)
      : null

  // Use state label for start/aborted, otherwise content
  const displayContent = state.label || contentStr

  const truncatedContent = displayContent
    ? displayContent.length > 100
      ? displayContent.slice(0, 100) + '...'
      : displayContent
    : null

  const fullContent = displayContent

  // Metadata for complete nodes
  const hasMetadata = data.type === 'complete' && (data.duration || data.inputTokens || data.outputTokens)

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      onClick={() => setExpanded(!expanded)}
      className={`
        px-3 py-2.5 rounded-lg border-2 min-w-[180px] cursor-pointer
        bg-shell-900 ${state.borderColor}
        ${selected ? 'ring-2 ring-white/30' : ''}
        ${expanded ? 'max-w-[600px]' : 'max-w-[300px]'}
        transition-all duration-150 hover:bg-shell-800
      `}
      style={{
        boxShadow: selected ? '0 0 15px rgba(239, 68, 68, 0.3)' : '0 4px 12px rgba(0, 0, 0, 0.3)',
      }}
    >
      <Handle type="target" position={Position.Top} className="bg-shell-600! w-2! h-2! border-shell-800!" />

      {/* Header: Event type + state */}
      <div className="flex items-center gap-2 mb-1.5">
        <EventIcon size={12} className="text-shell-500" />
        <span className="font-display text-xs font-medium text-gray-300 uppercase tracking-wide">
          {eventInfo.label}
        </span>
        <StateIcon
          size={12}
          className={`${state.iconColor} ${state.animate ? 'animate-spin' : ''} ml-auto`}
        />
      </div>

      {/* Timestamp */}
      <div className="font-console text-xs text-shell-500 mb-1.5">
        <span className="text-crab-600">&gt;</span> {formatTime(data.timestamp)}
      </div>

      {/* Metadata for complete nodes */}
      {hasMetadata && (
        <div className="font-console text-xs text-shell-400 mb-1.5 flex gap-2 flex-wrap">
          {data.duration && (
            <span className="text-neon-cyan">{formatDuration(data.duration)}</span>
          )}
          {data.inputTokens && (
            <span><span className="text-shell-500">in:</span> {data.inputTokens}</span>
          )}
          {data.outputTokens && (
            <span><span className="text-shell-500">out:</span> {data.outputTokens}</span>
          )}
          {data.stopReason && (
            <span className="text-neon-peach">{data.stopReason}</span>
          )}
        </div>
      )}

      {data.toolName && (
        <div className="font-console text-[10px] text-neon-lavender mb-1.5">
          <span className="text-shell-500">tool:</span> {data.toolName}
        </div>
      )}

      {/* Content - markdown for both preview and expanded */}
      {(expanded ? fullContent : truncatedContent) && (
        <div className={`
          prose prose-invert prose-xs max-w-none text-gray-300 text-xs
          prose-headings:text-gray-200 prose-headings:font-display prose-headings:text-xs prose-headings:my-1
          prose-p:text-xs prose-p:leading-relaxed prose-p:my-1
          prose-code:text-neon-cyan prose-code:bg-shell-950 prose-code:px-1 prose-code:rounded prose-code:text-xs
          prose-pre:bg-shell-950 prose-pre:border prose-pre:border-shell-800 prose-pre:text-xs prose-pre:my-1
          prose-a:text-neon-lavender prose-a:no-underline hover:prose-a:underline
          prose-li:text-xs prose-li:my-0.5
          prose-strong:text-gray-200
          ${expanded ? 'overflow-auto max-h-[400px]' : 'line-clamp-3'}
        `}>
          <Markdown>{expanded ? fullContent! : truncatedContent!}</Markdown>
        </div>
      )}

      {expanded && data.toolArgs != null && (
        <pre className="mt-2 font-console text-[11px] text-shell-500 bg-shell-950 p-2 rounded border border-shell-800 overflow-auto max-h-32">
          {JSON.stringify(data.toolArgs, null, 2) as string}
        </pre>
      )}

      <Handle type="source" position={Position.Bottom} className="bg-shell-600! w-2! h-2! border-shell-800!" />
    </motion.div>
  )
})
