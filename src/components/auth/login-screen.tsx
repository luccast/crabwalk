import { useState, useEffect, useRef, type FormEvent } from 'react'
import { motion } from 'framer-motion'
import { Lock, Key, Loader2 } from 'lucide-react'
import { useAuth } from '~/hooks/use-auth'
import { CrabIdleAnimation } from '~/components/ani'
import { version } from '../../../package.json'

export function LoginScreen() {
  const [mode, setMode] = useState<'password' | 'token'>('password')
  const [credential, setCredential] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { login, isAuthenticated } = useAuth()

  // Auto-focus input on mount and mode change
  useEffect(() => {
    inputRef.current?.focus()
  }, [mode])

  // Clear input when switching modes
  const handleModeChange = (newMode: 'password' | 'token') => {
    setMode(newMode)
    setCredential('')
    setError(null)
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    if (!credential.trim()) {
      setError('Please enter a credential')
      return
    }

    setLoading(true)
    setError(null)

    const result = await login(credential, mode)

    setLoading(false)

    if (!result.success) {
      setError(result.error || 'Authentication failed')
      setCredential('')
    }
  }

  if (isAuthenticated) return null

  return (
    <div className="fixed inset-0 z-[9999] bg-shell-950 texture-grid flex items-center justify-center">
      {/* Background decorations */}
      <div className="absolute inset-0 bg-linear-to-br from-crab-950/20 via-transparent to-shell-950" />
      <div className="absolute top-0 left-0 w-96 h-96 bg-crab-600/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-neon-coral/5 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />

      {/* Login panel */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="relative w-full max-w-md mx-4"
      >
        <div className="panel-retro p-8">
          {/* Scanline texture overlay */}
          <div className="absolute inset-0 texture-scanlines pointer-events-none opacity-20" />

          {/* Crab icon */}
          <div className="relative flex justify-center mb-6">
            <div className="crab-icon-glow">
              <CrabIdleAnimation className="w-20 h-20" />
            </div>
          </div>

          {/* Title */}
          <h1 className="font-arcade text-2xl text-center text-crab-400 glow-red mb-6 uppercase">
            Access Control
          </h1>

          {/* Mode toggle */}
          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => handleModeChange('password')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all font-display text-xs uppercase tracking-wide ${
                mode === 'password'
                  ? 'bg-crab-600 text-white'
                  : 'bg-shell-800 text-gray-400 hover:bg-shell-700'
              }`}
            >
              <Lock size={14} />
              Password
            </button>
            <button
              type="button"
              onClick={() => handleModeChange('token')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all font-display text-xs uppercase tracking-wide ${
                mode === 'token'
                  ? 'bg-crab-600 text-white'
                  : 'bg-shell-800 text-gray-400 hover:bg-shell-700'
              }`}
            >
              <Key size={14} />
              Token
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block font-console text-xs text-shell-400 mb-2 uppercase">
                {mode === 'password' ? 'Enter Password' : 'Enter API Token'}
              </label>
              <input
                ref={inputRef}
                type={mode === 'password' ? 'password' : 'text'}
                value={credential}
                onChange={(e) => setCredential(e.target.value)}
                className="w-full px-4 py-3 bg-shell-900 border border-shell-700 rounded-lg font-console text-sm text-gray-200 focus:outline-none focus:border-crab-500 focus:ring-1 focus:ring-crab-500 transition-all"
                placeholder={mode === 'password' ? '••••••••' : 'your-api-token'}
                disabled={loading}
              />
            </div>

            {/* Error message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="font-console text-xs text-crab-400 bg-crab-950/50 border border-crab-800 rounded px-3 py-2"
              >
                <span className="text-crab-600">&gt;</span> {error}
              </motion.div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-retro py-3 rounded-lg font-display text-sm uppercase tracking-wide disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Authenticating...
                </>
              ) : (
                'Unlock Monitor'
              )}
            </button>
          </form>

          {/* Help text */}
          <div className="mt-6 font-console text-[11px] text-shell-500 text-center space-y-1">
            <p>
              <span className="text-crab-600">&gt;</span> password from CLAWDBOT_PASSWORD env var
            </p>
            <p>
              <span className="text-crab-600">&gt;</span> or token from CLAWDBOT_API_TOKEN
            </p>
          </div>
        </div>

        {/* Version badge */}
        <div className="flex items-center justify-center gap-2 mt-4">
          <span className="w-2 h-2 rounded-full bg-crab-500 animate-pulse" />
          <span className="font-console text-[11px] text-shell-500">
            crabwalk v{version} • auth required
          </span>
        </div>
      </motion.div>
    </div>
  )
}
