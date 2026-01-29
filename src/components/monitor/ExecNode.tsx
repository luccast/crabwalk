import { memo, useCallback, useMemo, useState } from 'react'
import { Handle, Position } from '@xyflow/react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, Copy, Check, Loader2, Terminal, XCircle } from 'lucide-react'
import type { MonitorExecProcess, MonitorExecOutputChunk } from '~/integrations/clawdbot'

interface ExecNodeProps {
  data: MonitorExecProcess
  selected?: boolean
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  const secs = ms / 1000
  if (secs < 60) return `${secs.toFixed(1)}s`
  const mins = Math.floor(secs / 60)
  const remainSecs = Math.floor(secs % 60)
  return `${mins}m ${remainSecs}s`
}

function tailLinesFromChunks(chunks: MonitorExecOutputChunk[], maxLines: number): string {
  if (chunks.length === 0) return ''
  const merged = chunks.map((c) => c.text).join('')
  const lines = merged.split(/\r?\n/)
  return lines.slice(-maxLines).join('\n').trim()
}

const statusConfig: Record<
  MonitorExecProcess['status'],
  {
    icon: typeof Loader2
    borderColor: string
    badgeColor: string
    iconColor: string
    animate: boolean
    label: string
  }
> = {
  running: {
    icon: Loader2,
    borderColor: 'border-neon-cyan',
    badgeColor: 'bg-neon-cyan/15 text-neon-cyan',
    iconColor: 'text-neon-cyan',
    animate: true,
    label: 'Running',
  },
  completed: {
    icon: CheckCircle,
    borderColor: 'border-neon-mint',
    badgeColor: 'bg-neon-mint/15 text-neon-mint',
    iconColor: 'text-neon-mint',
    animate: false,
    label: 'Completed',
  },
  failed: {
    icon: XCircle,
    borderColor: 'border-crab-500',
    badgeColor: 'bg-crab-500/15 text-crab-300',
    iconColor: 'text-crab-400',
    animate: false,
    label: 'Failed',
  },
}

function streamStyle(stream: MonitorExecOutputChunk['stream']): string {
  if (stream === 'stderr') {
    return 'text-crab-200 bg-crab-950/30 border-crab-900/60'
  }
  return 'text-neon-cyan/90 bg-shell-950 border-shell-800'
}

export const ExecNode = memo(function ExecNode({ data, selected }: ExecNodeProps) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)
  const status = statusConfig[data.status]
  const StatusIcon = status.icon

  const preview = useMemo(() => tailLinesFromChunks(data.outputs, 3), [data.outputs])
  const hasOutput = data.outputs.length > 0

  const handleCopyPid = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(String(data.pid)).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [data.pid])

  const displayDuration =
    data.durationMs != null
      ? formatDuration(data.durationMs)
      : data.completedAt != null
        ? formatDuration(Math.max(0, data.completedAt - data.startedAt))
        : null

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      onClick={() => setExpanded((prev) => !prev)}
      className={`
        px-3 py-2.5 rounded-lg border-2 min-w-[220px] cursor-pointer
        bg-shell-900 ${status.borderColor}
        ${selected ? 'ring-2 ring-white/30' : ''}
        ${expanded ? 'max-w-[680px]' : 'max-w-[360px]'}
        transition-all duration-150 hover:bg-shell-800
      `}
      style={{
        boxShadow: selected
          ? '0 0 15px rgba(239, 68, 68, 0.3)'
          : '0 4px 12px rgba(0, 0, 0, 0.35)',
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="bg-shell-600! w-2! h-2! border-shell-800!"
      />

      <div className="flex items-center gap-2 mb-1.5">
        <Terminal size={13} className="text-shell-400" />
        <span className="font-display text-xs font-medium text-gray-300 uppercase tracking-wide">
          Exec
        </span>
        <span
          className={`
            ml-1 px-2 py-0.5 rounded-md border text-[10px] font-console truncate max-w-[220px]
            border-shell-700 ${status.badgeColor}
          `}
          title={data.command}
        >
          {data.command}
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <button
            onClick={handleCopyPid}
            className="p-1 rounded hover:bg-shell-700 transition-colors"
            title={`Copy PID: ${data.pid}`}
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
          <StatusIcon
            size={14}
            className={`${status.iconColor} ${status.animate ? 'animate-spin' : ''}`}
          />
        </div>
      </div>

      <div className="font-console text-xs text-shell-500 mb-1.5">
        <span className="text-crab-600">&gt;</span> {formatTime(data.lastActivityAt)}
      </div>

      <div className="font-console text-xs text-shell-400 mb-1.5 flex gap-2 flex-wrap">
        <span>
          <span className="text-shell-500">pid:</span> {data.pid}
        </span>
        {data.exitCode != null && (
          <span>
            <span className="text-shell-500">exit:</span>{' '}
            <span className={data.exitCode === 0 ? 'text-neon-mint' : 'text-crab-300'}>
              {data.exitCode}
            </span>
          </span>
        )}
        {displayDuration && (
          <span className="text-neon-cyan">{displayDuration}</span>
        )}
        {data.status === 'running' && (
          <span className="text-neon-peach">live</span>
        )}
      </div>

      {data.outputTruncated && (
        <div className="mb-1.5 text-[10px] font-console text-neon-peach">
          output truncated
        </div>
      )}

      {hasOutput && !expanded && (
        <pre className="font-console text-[11px] text-shell-300 bg-shell-950 border border-shell-800 rounded p-2 overflow-hidden line-clamp-4 whitespace-pre-wrap">
          {preview || '(no output)'}
        </pre>
      )}

      {hasOutput && expanded && (
        <div className="mt-1.5 border border-shell-800 rounded bg-shell-950/60 max-h-[320px] overflow-auto">
          <div className="sticky top-0 z-10 flex items-center justify-between px-2 py-1 text-[10px] font-console text-shell-500 bg-shell-950/90 border-b border-shell-800">
            <span>{status.label}</span>
            <span>{data.outputs.length} chunks</span>
          </div>
          <div className="p-2 flex flex-col gap-1.5">
            {data.outputs.map((chunk) => (
              <div
                key={chunk.id}
                className={`border rounded px-2 py-1 ${streamStyle(chunk.stream)}`}
              >
                <div className="flex items-center gap-2 mb-1 text-[10px] font-console text-shell-500">
                  <span className={chunk.stream === 'stderr' ? 'text-crab-300' : 'text-neon-cyan'}>
                    {chunk.stream}
                  </span>
                  <span>{formatTime(chunk.timestamp)}</span>
                </div>
                <pre className="font-console text-[11px] whitespace-pre-wrap wrap-break-workds">
                  {chunk.text}
                </pre>
              </div>
            ))}
          </div>
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="bg-shell-600! w-2! h-2! border-shell-800!"
      />
    </motion.div>
  )
})

