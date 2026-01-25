import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { trpc } from '~/integrations/trpc/client'

export const Route = createFileRoute('/demo/trpc')({
  component: TrpcDemo,
})

function TrpcDemo() {
  const helloQuery = useQuery({
    queryKey: ['trpc', 'hello'],
    queryFn: () => trpc.hello.query({ name: 'TanStack' }),
  })

  const itemsQuery = useQuery({
    queryKey: ['trpc', 'items'],
    queryFn: () => trpc.getItems.query(),
  })

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">tRPC Demo</h1>

        <div className="space-y-6">
          <div className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-2">Hello Query</h2>
            {helloQuery.isLoading && (
              <p className="text-gray-400">Loading...</p>
            )}
            {helloQuery.data && (
              <p className="text-cyan-400">{helloQuery.data.greeting}</p>
            )}
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-2">Items Query</h2>
            {itemsQuery.isLoading && (
              <p className="text-gray-400">Loading...</p>
            )}
            {itemsQuery.data && (
              <ul className="space-y-1">
                {itemsQuery.data.map((item) => (
                  <li key={item.id} className="text-gray-300">
                    {item.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="mt-8">
          <Link to="/" className="text-cyan-400 hover:text-cyan-300">
            &larr; Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
