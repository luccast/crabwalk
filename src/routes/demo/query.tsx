import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'

export const Route = createFileRoute('/demo/query')({
  component: QueryDemo,
})

function QueryDemo() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['demo-post'],
    queryFn: async () => {
      const res = await fetch('https://jsonplaceholder.typicode.com/posts/1')
      if (!res.ok) throw new Error('Failed to fetch')
      return res.json()
    },
  })

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">TanStack Query Demo</h1>

        {isLoading && (
          <div className="animate-pulse bg-gray-800 rounded-lg p-4">
            Loading...
          </div>
        )}

        {error && (
          <div className="bg-red-900/50 border border-red-500 rounded-lg p-4">
            Error: {error.message}
          </div>
        )}

        {data && (
          <div className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-xl font-semibold mb-2">{data.title}</h2>
            <p className="text-gray-400">{data.body}</p>
          </div>
        )}

        <div className="mt-8">
          <Link to="/" className="text-cyan-400 hover:text-cyan-300">
            &larr; Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
