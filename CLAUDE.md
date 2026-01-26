# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # start dev server on port 3000
npm run build    # production build
npm start        # run production server (dist/server/server.js)
```

## Architecture

Full-stack React app using TanStack Start (file-based routing, SSR).

**Stack:**
- TanStack Start + Router (file-based routing)
- tRPC (API layer w/ superjson transformer)
- TanStack Query (data fetching)
- TanStack DB (client-side reactive collections)
- Tailwind CSS v4
- React 19

**Key paths:**
- `src/routes/` - file-based routes, auto-generates `routeTree.gen`
- `src/routes/api/trpc.$.ts` - tRPC catch-all API handler
- `src/integrations/trpc/router.ts` - tRPC router definition (`appRouter`)
- `src/integrations/trpc/client.ts` - tRPC client
- `src/integrations/query/provider.tsx` - React Query provider
- `src/router.tsx` - TanStack Router config

**Path alias:** `~/` maps to `src/`

**tRPC pattern:** Add procedures to `appRouter` in `router.ts`, import `trpc` from `client.ts` to call.

**TanStack DB pattern:** Create collections, use `useLiveQuery()` for reactive reads, `createTransaction()` for writes.

## Clawdbot Monitor

Real-time agent activity monitor at `/monitor`.

**Key paths:**
- `src/integrations/clawdbot/` - gateway client, protocol types, parser, collections
- `src/components/monitor/` - ReactFlow graph, session list, custom nodes
- `src/routes/monitor/index.tsx` - main monitor page

**Data flow:** clawdbot gateway (ws://127.0.0.1:18789) -> TanStack Start server (WS client) -> tRPC -> browser (TanStack DB collections -> ReactFlow)

**Config:** Set `CLAWDBOT_API_TOKEN` env var for gateway auth.
