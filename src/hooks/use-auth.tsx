import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import { trpc } from '~/integrations/trpc/client'

const SESSION_KEY = 'crabwalk_session_id'
const TIMEOUT_KEY = 'crabwalk_timeout_duration'
const DEFAULT_TIMEOUT = 15 * 60 * 1000 // 15 minutes

interface AuthContextValue {
  isAuthenticated: boolean
  isLocked: boolean
  isChecking: boolean
  timeoutDuration: number
  login: (credential: string, type: 'password' | 'token') => Promise<{ success: boolean; error?: string }>
  logout: () => void
  lock: () => void
  setTimeoutDuration: (ms: number) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [isLocked, setIsLocked] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const [timeoutDuration, setTimeoutDurationState] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_TIMEOUT
    const saved = localStorage.getItem(TIMEOUT_KEY)
    if (saved) {
      const ms = parseInt(saved, 10)
      if (ms >= 300000 && ms <= 3600000) return ms
    }
    return DEFAULT_TIMEOUT
  })
  const lastActivityRef = useRef(Date.now())
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Initialize: check localStorage for existing session
  useEffect(() => {
    const stored = localStorage.getItem(SESSION_KEY)
    if (stored) {
      trpc.auth.check.query({ sessionId: stored })
        .then(result => {
          if (result.valid) {
            setSessionId(stored)
            lastActivityRef.current = Date.now()
          } else {
            localStorage.removeItem(SESSION_KEY)
          }
        })
        .catch(() => {
          localStorage.removeItem(SESSION_KEY)
        })
        .finally(() => setIsChecking(false))
    } else {
      setIsChecking(false)
    }
  }, [])

  // Multi-tab sync: logout when another tab clears session
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === SESSION_KEY && e.newValue === null && sessionId) {
        setSessionId(null)
        setIsLocked(true)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [sessionId])

  // Activity tracker
  const handleActivity = useCallback(() => {
    lastActivityRef.current = Date.now()
  }, [])

  // Setup activity listeners when authenticated
  useEffect(() => {
    if (!sessionId) return

    const events = ['mousemove', 'keydown', 'touchstart', 'click']
    let debounceTimer: ReturnType<typeof setTimeout> | null = null

    const debouncedHandler = () => {
      if (debounceTimer) return
      debounceTimer = setTimeout(() => {
        handleActivity()
        debounceTimer = null
      }, 1000)
    }

    events.forEach(event => {
      window.addEventListener(event, debouncedHandler, { passive: true })
    })

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, debouncedHandler)
      })
      if (debounceTimer) clearTimeout(debounceTimer)
    }
  }, [sessionId, handleActivity])

  // Inactivity check every 10s
  useEffect(() => {
    if (!sessionId) return

    timerRef.current = setInterval(() => {
      const inactive = Date.now() - lastActivityRef.current
      if (inactive > timeoutDuration) {
        console.log('[auth] auto-lock triggered after', inactive, 'ms')
        localStorage.removeItem(SESSION_KEY)
        setSessionId(null)
        setIsLocked(true)
      }
    }, 10000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [sessionId, timeoutDuration])

  const login = useCallback(async (credential: string, type: 'password' | 'token') => {
    try {
      const result = await trpc.auth.verify.mutate({ credential, type })
      if (result.success) {
        localStorage.setItem(SESSION_KEY, result.sessionId)
        setSessionId(result.sessionId)
        setIsLocked(false)
        lastActivityRef.current = Date.now()
        return { success: true }
      }
      return { success: false, error: result.error }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Login failed' }
    }
  }, [])

  const logout = useCallback(() => {
    const stored = localStorage.getItem(SESSION_KEY)
    if (stored) {
      trpc.auth.logout.mutate({ sessionId: stored }).catch(() => {})
    }
    localStorage.removeItem(SESSION_KEY)
    setSessionId(null)
    setIsLocked(false)
  }, [])

  const lock = useCallback(() => {
    const stored = localStorage.getItem(SESSION_KEY)
    if (stored) {
      trpc.auth.logout.mutate({ sessionId: stored }).catch(() => {})
    }
    localStorage.removeItem(SESSION_KEY)
    setSessionId(null)
    setIsLocked(true)
  }, [])

  const setTimeoutDuration = useCallback((ms: number) => {
    setTimeoutDurationState(ms)
    localStorage.setItem(TIMEOUT_KEY, ms.toString())
  }, [])

  return (
    <AuthContext.Provider value={{
      isAuthenticated: !!sessionId,
      isLocked,
      isChecking,
      timeoutDuration,
      login,
      logout,
      lock,
      setTimeoutDuration,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
