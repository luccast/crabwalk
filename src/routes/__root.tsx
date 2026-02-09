import { HeadContent, Scripts, createRootRoute, Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import appCss from '../styles.css?url'
import { QueryProvider } from '../integrations/query/provider'
import { AuthProvider } from '../hooks/use-auth'
import { CrabIdleAnimation } from '../components/ani'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Crabwalk' },
      { name: 'theme-color', content: '#0a0a0f' },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
    ],
  }),
  shellComponent: RootDocument,
  notFoundComponent: NotFound,
})

function NotFound() {
  return (
    <div className="min-h-screen bg-shell-950 texture-grid flex items-center justify-center relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-96 h-96 bg-crab-600/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative text-center px-4"
      >
        {/* Animated crab */}
        <div className="crab-icon-glow mx-auto mb-6">
          <CrabIdleAnimation className="w-24 h-24" />
        </div>

        {/* Arcade 404 */}
        <h1 className="font-arcade text-5xl text-crab-400 glow-red mb-4">
          404
        </h1>

        <p className="font-display text-lg text-gray-400 mb-2 tracking-wide uppercase">
          Page Not Found
        </p>

        <p className="font-console text-shell-500 text-xs mb-8">
          <span className="text-crab-600">&gt;</span> error: the crab wandered off...
        </p>

        <Link to="/" className="btn-retro inline-block rounded-lg text-sm">
          Return Home
        </Link>
      </motion.div>
    </div>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="bg-shell-950 text-gray-100">
        <QueryProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </QueryProvider>
        <Scripts />
      </body>
    </html>
  )
}
