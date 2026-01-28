# Exec Events Plan (Moltbot Gateway → Crabwalk Monitor)

## Files to modify
- `src/integrations/clawdbot/protocol.ts`
- `src/integrations/clawdbot/parser.ts`
- `src/integrations/clawdbot/collections.ts`
- `src/integrations/clawdbot/persistence.ts`
- `src/integrations/clawdbot/index.ts`
- `src/integrations/trpc/router.ts`
- `src/routes/monitor/index.tsx`
- `src/components/monitor/ActionGraph.tsx`
- `src/components/monitor/index.ts`
- New: `src/components/monitor/ExecNode.tsx`

## Data model changes (how to store exec events)

### Gateway payload types
Add explicit exec event payload types in `protocol.ts`:
- `ExecStartedEvent`: `pid`, `command`, `sessionId`, `runId`, `startedAt`
- `ExecOutputEvent`: `pid`, `runId`, optional `sessionId`, `stream`, `output`
- `ExecCompletedEvent`: `pid`, `runId`, optional `sessionId`, `exitCode`, `durationMs`, `status`

### Monitor-side exec types
Introduce two monitor types in `protocol.ts`:
- `MonitorExecEvent` (raw event for aggregation)
- `MonitorExecProcess` (aggregated, UI-friendly shape)

Proposed shapes:
- `MonitorExecEvent`
  - `id`: stable per gateway frame (for persistence)
  - `execId`: stable per process, e.g. `exec-${runId}-${pid}`
  - `runId`, `pid`, optional `sessionId`, optional `sessionKey`
  - `eventType`: `'started' | 'output' | 'completed'`
  - `command?`, `stream?`, `output?`
  - `startedAt?`, `durationMs?`, `exitCode?`, `status?`
  - `timestamp`: `Date.now()` when received
- `MonitorExecProcess`
  - `id`: `exec-${runId}-${pid}`
  - `runId`, `pid`, `command`
  - optional `sessionId`, optional `sessionKey`
  - `status`: `'running' | 'completed' | 'failed'`
  - `startedAt`, optional `completedAt`, optional `durationMs`, optional `exitCode`
  - `outputs`: array of `{ id, stream, text, timestamp }`
  - `outputTruncated?`: boolean (if caps are applied)
  - `timestamp`: equals `startedAt` for graph ordering

### Collection and aggregation strategy
Add an exec collection and aggregate raw events into processes:
- New collection in `collections.ts`: `execsCollection<MonitorExecProcess>`
- New entry point: `addExecEvent(event: MonitorExecEvent)`
- Aggregation rules:
  - `exec.started`: create process if missing; set `status='running'`, `command`, `startedAt`
  - `exec.output`: append chunk to `outputs`; update `lastActivity` fields; create a placeholder process if needed
  - `exec.completed`: update process with `exitCode`, `durationMs`, `completedAt`, `status`
- Session resolution:
  - Reuse the existing `runSessionMap` (runId → sessionKey)
  - Resolve `sessionKey` as: `event.sessionKey || runSessionMap.get(runId) || event.sessionId`
  - When `runSessionMap` learns a new mapping in `addAction`, backfill any exec processes for that `runId` that lack `sessionKey`

### Persistence (recommended for parity with actions)
Extend persistence to store exec events:
- Store raw exec events as JSONL (append-only), similar to actions
- New file: `data/exec-events.jsonl`
- Persistence service additions:
  - In-memory `execEvents: MonitorExecEvent[]`
  - `addExecEvent(event)` that updates by `id` when needed
  - Include `execEvents` in `hydrate()` response
  - Clear the exec events file in `clear()`
- Hydration order on the client:
  - Replay actions first (to populate `runSessionMap`)
  - Replay exec events second (for best sessionKey resolution)

## UI component changes

### New exec node
Add `ExecNode.tsx` to render exec processes:
- Header:
  - Terminal/command label (e.g., `Exec`)
  - Command badge showing the actual `command` string
  - Status icon on the right
- Status icon behavior:
  - Running: spinner (`Loader2`)
  - Completed success: checkmark (`CheckCircle`)
  - Failed/non-zero exit: error icon (`XCircle`)
- Metadata line:
  - PID
  - Exit code (when completed)
  - Duration (when completed)
- Output panel (expandable):
  - Collapsed: show a short tail preview (e.g., last 2–4 lines)
  - Expanded: show chunk list in a scrollable `<pre>`
  - Style stdout/stderr differently (stderr tinted red)
  - If capped, show a small “truncated” indicator

### Graph updates
Update `ActionGraph.tsx` to include exec processes:
- Props: add `execs: MonitorExecProcess[]`
- Node types: add `exec: ExecNode`
- Node building:
  - Add one node per exec process: `id = action-exec-${exec.id}` or `exec-${exec.id}`
- Edge building:
  - Connect each exec process to its parent session: `session-${sessionKey} -> exec-${exec.id}`
  - Use animated edges for running execs
  - Color edges based on exec status (running/success/failure)
- Filtering:
  - When `selectedSession` is set, filter execs by `sessionKey`

### Monitor page wiring
Update `src/routes/monitor/index.tsx`:
- Subscribe to `exec` events in the TRPC subscription handler
- Add `useLiveQuery(execsCollection)`
- Pass `execs` into `ActionGraph`
- Optional: update the stats pill to include exec count or fold into “Actions”

## Event subscription changes

### Parser
Extend `parseEventFrame` in `parser.ts`:
- Recognize:
  - `exec.started`
  - `exec.output`
  - `exec.completed`
- Convert each into a `MonitorExecEvent`
- Optionally emit session status hints:
  - On `exec.started`: session → `thinking`
  - On `exec.completed`: session → `active`
  - Only emit session updates when a session key can be resolved safely

### TRPC router
Extend the subscription output union in `router.ts`:
- Add `type: 'exec'`
- Include `execEvent?: MonitorExecEvent`

In the subscription handler:
- When a parsed exec event exists:
  - Persist it (if persistence is enabled)
  - Emit it to clients as `{ type: 'exec', execEvent }`

### Client collections
In `collections.ts`:
- Add `execsCollection`
- Add `addExecEvent`
- Update `hydrateFromServer` to accept and replay exec events
- Backfill exec session keys when `runSessionMap` learns new mappings

## Beads (discrete work units)
1. Add exec payload and monitor exec types to `protocol.ts`.
2. Extend `parseEventFrame` in `parser.ts` to produce `MonitorExecEvent`.
3. Add `execsCollection` and `addExecEvent` aggregation to `collections.ts`.
4. Extend persistence in `persistence.ts` to store and hydrate exec events.
5. Update `hydrateFromServer` and exports in `collections.ts` and `index.ts`.
6. Extend the TRPC subscription contract and handler in `router.ts`.
7. Wire exec events into the monitor route in `src/routes/monitor/index.tsx`.
8. Implement `ExecNode.tsx` with status, duration, and expandable output.
9. Update `ActionGraph.tsx` to render exec nodes under sessions with status-aware edges.
10. Validate with debug mode and/or collected logs; tune output caps and layout spacing.

## Notes and assumptions to validate during implementation
- `sessionId` may already match `MonitorSession.key`. If not, session resolution will depend on the `runId → sessionKey` mapping learned from chat events.
- Exec output volume can be large; implement caps early (per-process chunk and character limits) to protect the UI.
