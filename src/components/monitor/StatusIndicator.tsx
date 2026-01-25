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

const statusColors = {
  idle: 'bg-gray-500',
  active: 'bg-green-500',
  thinking: 'bg-yellow-500',
}

export function StatusIndicator({ status, size = 'md' }: StatusIndicatorProps) {
  const isPulsing = status === 'active' || status === 'thinking'

  return (
    <div className="relative flex items-center justify-center">
      <div
        className={`rounded-full ${sizeClasses[size]} ${statusColors[status]}`}
      />
      {isPulsing && (
        <motion.div
          className={`absolute rounded-full ${sizeClasses[size]} ${statusColors[status]}`}
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
