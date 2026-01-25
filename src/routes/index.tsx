import { createFileRoute, Link } from '@tanstack/react-router'
import { Activity } from 'lucide-react'

export const Route = createFileRoute('/')({
  component: Home,
})

function Home() {
  return (
    <div className="min-h-[calc(100vh-72px)] bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
      <div className="text-center px-4">
        <Activity size={64} className="mx-auto mb-6 text-cyan-400" />
        <h1 className="text-5xl font-bold text-white mb-4">Crabwalk</h1>
        <p className="text-xl text-gray-300 mb-8">
          Clawdbot Companion Monitor
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link
            to="/monitor"
            className="px-6 py-3 bg-cyan-500 text-white rounded-lg font-medium hover:bg-cyan-600 transition-colors"
          >
            Open Monitor
          </Link>
        </div>
      </div>
    </div>
  )
}
