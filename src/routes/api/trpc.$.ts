import { createFileRoute } from '@tanstack/react-router'
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { appRouter } from '~/integrations/trpc/router'

async function handler({ request }: { request: Request }) {
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req: request,
    router: appRouter,
    createContext: () => ({}),
  })
}

export const Route = createFileRoute('/api/trpc/$')({
  // @ts-expect-error server property not in route types yet
  server: {
    handlers: {
      GET: handler,
      POST: handler,
    },
  },
})
