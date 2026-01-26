import { useState, useCallback } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { CrabIdleAnimation, CrabJumpAnimation, CrabAttackAnimation } from '~/components/ani'

export const Route = createFileRoute('/')({
  component: Home,
})

// Crab silhouette SVG for background decorations
function CrabSilhouette({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 60"
      className={className}
      fill="currentColor"
    >
      <ellipse cx="50" cy="35" rx="25" ry="18" />
      <path d="M15 30 Q5 25 8 18 Q12 12 20 15 Q25 18 25 25 Q22 30 15 30Z" />
      <circle cx="8" cy="15" r="5" />
      <path d="M85 30 Q95 25 92 18 Q88 12 80 15 Q75 18 75 25 Q78 30 85 30Z" />
      <circle cx="92" cy="15" r="5" />
      <path d="M28 40 Q15 45 10 52" strokeWidth="3" stroke="currentColor" fill="none" />
      <path d="M26 45 Q12 52 8 58" strokeWidth="3" stroke="currentColor" fill="none" />
      <path d="M72 40 Q85 45 90 52" strokeWidth="3" stroke="currentColor" fill="none" />
      <path d="M74 45 Q88 52 92 58" strokeWidth="3" stroke="currentColor" fill="none" />
      <circle cx="42" cy="25" r="4" fill="#0a0a0f" />
      <circle cx="58" cy="25" r="4" fill="#0a0a0f" />
    </svg>
  )
}

type CrabState = 'idle' | 'jumping' | 'attacking'

function Home() {
  const [crabState, setCrabState] = useState<CrabState>('idle')
  const [isHovering, setIsHovering] = useState(false)

  const handleMouseEnter = useCallback(() => {
    setIsHovering(true)
    if (crabState !== 'attacking') {
      setCrabState('jumping')
    }
  }, [crabState])

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false)
    if (crabState !== 'attacking') {
      setCrabState('idle')
    }
  }, [crabState])

  const handleClick = useCallback(() => {
    setCrabState('attacking')
    // Attack animation: 4 frames at 10fps = 400ms
    setTimeout(() => {
      setCrabState(isHovering ? 'jumping' : 'idle')
    }, 400)
  }, [isHovering])

  return (
    <div className="min-h-screen bg-shell-950 texture-grid relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 bg-linear-to-br from-crab-950/20 via-transparent to-shell-950" />
      <div className="absolute top-0 left-0 w-96 h-96 bg-crab-600/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-neon-coral/5 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />

      {/* Subtle crab silhouettes in background */}
      <CrabSilhouette className="absolute top-20 right-20 w-24 h-24 text-crab-900/10 rotate-12" />
      <CrabSilhouette className="absolute bottom-32 left-16 w-16 h-16 text-crab-900/8 -rotate-6" />

      {/* Main content */}
      <div className="relative flex items-center justify-center min-h-screen px-4">
        <div className="text-center max-w-2xl">
          {/* Interactive animated crab with glow */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="mb-8"
          >
            <div
              className="relative inline-block cursor-pointer select-none"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              onClick={handleClick}
            >
              <div className="crab-icon-glow">
                {crabState === 'idle' && <CrabIdleAnimation className="w-32 h-32" />}
                {crabState === 'jumping' && <CrabJumpAnimation className="w-32 h-32" />}
                {crabState === 'attacking' && <CrabAttackAnimation className="w-32 h-32" />}
              </div>
              <motion.div
                className="absolute inset-0 flex items-center justify-center -z-10"
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              >
                <div className="w-24 h-24 rounded-full bg-crab-500/20 blur-xl" />
              </motion.div>
            </div>
          </motion.div>

          {/* Arcade-style headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="font-arcade text-4xl md:text-5xl text-crab-400 glow-red mb-6 leading-tight"
          >
            CRABWALK
          </motion.h1>

          {/* Subtitle with display font */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="font-console font-bold text-lg text-gray-400 mb-4 tracking-wide uppercase"
          >
            Clawdbot Companion Monitor
          </motion.p>

          {/* Console-style description */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="font-console text-sm text-shell-500 mb-10 max-w-md mx-auto"
          >
            <span className="text-crab-600">&gt;</span> Real-time AI agent activity monitoring<br />
            <span className="text-crab-600">&gt;</span> Session tracking & action visualization<br />
            <span className="text-crab-600">&gt;</span> Multi-platform gateway interface
          </motion.div>

          {/* CTA Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <Link to="/monitor" className="btn-retro inline-block rounded-lg">
              Launch Monitor
            </Link>
          </motion.div>

          {/* Decorative line */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="mt-16 h-px bg-linear-to-r from-transparent via-crab-700/50 to-transparent max-w-xs mx-auto"
          />

          {/* Version/status badge */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="mt-6 inline-flex items-center gap-2 px-3 py-1.5 bg-shell-900/80 border border-shell-700 rounded-full"
          >
            <span className="w-2 h-2 rounded-full bg-neon-mint animate-pulse" />
            <span className="font-console font-bold text-[11px] uppercase text-shell-500">
              system online • v1.0.1
            </span>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
