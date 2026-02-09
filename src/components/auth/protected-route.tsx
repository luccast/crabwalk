import { useState, useEffect, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { useAuth } from '~/hooks/use-auth'
import { LoginScreen } from './login-screen'

interface ProtectedRouteProps {
  children: ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isChecking } = useAuth()
  const [ready, setReady] = useState(false)

  // Wait for initial auth check to complete
  useEffect(() => {
    if (!isChecking) setReady(true)
  }, [isChecking])

  if (!ready) {
    return (
      <div className="h-screen flex items-center justify-center bg-shell-950">
        <Loader2 className="w-6 h-6 animate-spin text-crab-400" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LoginScreen />
  }

  return <>{children}</>
}
