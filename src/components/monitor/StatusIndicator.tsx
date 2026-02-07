import { motion } from 'framer-motion'

interface StatusIndicatorProps {
  status: 'idle' | 'active' | 'thinking'
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'w-2 h-2',
  md: 'w-3 h-3',
  lg: 'w-4 h-4',
}

const statusConfig = {
  idle: {
    color: 'bg-shell-600',
    glow: 'none',
  },
  active: {
    color: 'bg-neon-mint',
    glow: '0 0 8px rgba(152, 255, 200, 0.6)',
  },
  thinking: {
    color: 'bg-neon-peach',
    glow: '0 0 8px rgba(255, 176, 136, 0.6)',
  },
}

export function StatusIndicator({ status, size = 'md' }: StatusIndicatorProps) {
  const normalizedStatus = status || 'idle'
  const isPulsing = normalizedStatus === 'active' || normalizedStatus === 'thinking'
  const config = statusConfig[normalizedStatus] || statusConfig.idle

  return (
    <div className="relative flex items-center justify-center">
      <div
        className={`rounded-full ${sizeClasses[size]} ${config.color}`}
        style={{ boxShadow: config.glow }}
      />
      {isPulsing && (
        <motion.div
          className={`absolute rounded-full ${sizeClasses[size]} ${config.color}`}
          initial={{ opacity: 0.6, scale: 1 }}
          animate={{ opacity: 0, scale: 2.5 }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeOut',
          }}
        />
      )}
    </div>
  )
}
