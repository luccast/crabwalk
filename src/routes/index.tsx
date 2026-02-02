import { useState, useCallback, useEffect } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { Github, FolderOpen } from 'lucide-react'
import { version } from '../../package.json'
import { CrabIdleAnimation, CrabJumpAnimation, CrabAttackAnimation } from '~/components/ani'

function XIcon({ size = 14, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={className}
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

// All crab animation frames to preload
const ALL_CRAB_FRAMES = [
  ...Array.from({ length: 5 }, (_, i) => `/ani/crab-idle/Crab${i + 1}.png`),
  ...Array.from({ length: 4 }, (_, i) => `/ani/crab-jump/CrabMoving${i + 1}.png`),
  ...Array.from({ length: 4 }, (_, i) => `/ani/crab-attack/Crab_Attack${i + 1}.png`),
]

export const Route = createFileRoute('/')({
  component: Home,
})

type CrabState = 'idle' | 'jumping' | 'attacking'

function Home() {
  const [crabState, setCrabState] = useState<CrabState>('idle')
  const [isHovering, setIsHovering] = useState(false)

  // Preload all crab animation frames on mount
  useEffect(() => {
    for (const src of ALL_CRAB_FRAMES) {
      const img = new Image()
      img.src = src
    }
  }, [])

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
            Open-Source OpenClaw Companion
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
            <span className="text-crab-600">&gt;</span> Workspace file browser & markdown viewer
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link to="/monitor" className="btn-retro inline-block rounded-lg font-black!">
              Launch Monitor
            </Link>
            <Link
              to="/workspace"
              className="btn-retro btn-retro-secondary inline-flex items-center gap-2 rounded-lg font-black!"
            >
              <FolderOpen size={18} />
              Explore Workspace
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
            className="mt-6 inline-flex items-center gap-2 px-3 py-1.5 bg-shell-900/80 rounded-full"
          >
            <span className="w-2 h-2 rounded-full bg-neon-mint animate-pulse" />
            <span className="font-console font-bold text-[11px] uppercase text-shell-500">
              system online • v{version}
            </span>
          </motion.div>

          {/* Social links */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.9 }}
            className="mt-6 flex items-center justify-center gap-6 font-console text-sm"
          >
            <a
              href="https://github.com/luccast/crabwalk"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-shell-500 hover:text-crab-400 transition-colors"
            >
              <Github size={16} />
              <span>Contribute on Github</span>
            </a>
            <a
              href="https://x.com/luccasveg"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-shell-500 hover:text-crab-400 transition-colors"
            >
              <XIcon size={16} />
              <span>@luccasveg</span>
            </a>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
