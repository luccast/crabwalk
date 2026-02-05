import { initTRPC } from '@trpc/server'
import { observable } from '@trpc/server/observable'
import superjson from 'superjson'
import { z } from 'zod'
import { getClawdbotClient, getClawdbotEndpoint } from '~/integrations/openclaw/client'
import { getPersistenceService } from '~/integrations/openclaw/persistence'
import {
  parseEventFrame,
  sessionInfoToMonitor,
  type MonitorSession,
  type MonitorAction,
  type MonitorExecEvent,
} from '~/integrations/openclaw'
import {
  listDirectory,
  readFile,
  writeFile,
  deleteFile,
  createFile,
  pathExists,
  getDefaultWorkspacePath,
  expandTilde,
  type DirectoryEntry,
  type FileContent,
} from '~/lib/workspace-fs'

// Server-side debug mode state
let debugMode = false

// Server-side log collection
let collectLogs = false
const collectedEvents: Array<{ timestamp: number; event: unknown }> = []

const t = initTRPC.create({
  transformer: superjson,
})

export const router = t.router
export const publicProcedure = t.procedure

// Clawdbot router
const openclawRouter = router({
  connect: publicProcedure.mutation(async () => {
    const client = getClawdbotClient()
    if (client.connected) {
      return { status: 'already_connected' as const }
    }
    try {
      const hello = await client.connect()
      return {
        status: 'connected' as const,
        protocol: hello.protocol,
        features: hello.features,
        presenceCount: hello.snapshot?.presence?.length ?? 0,
      }
    } catch (error) {
      return {
        status: 'error' as const,
        message: error instanceof Error ? error.message : 'Connection failed',
      }
    }
  }),

  disconnect: publicProcedure.mutation(() => {
    const client = getClawdbotClient()
    client.disconnect()
    return { status: 'disconnected' as const }
  }),

  status: publicProcedure.query(() => {
    const client = getClawdbotClient()
    return { connected: client.connected }
  }),

  gatewayEndpoint: publicProcedure.query(() => {
    return { url: getClawdbotEndpoint() }
  }),

  setDebugMode: publicProcedure
    .input(z.object({ enabled: z.boolean() }))
    .mutation(({ input }) => {
      debugMode = input.enabled
      console.log(`[openclaw] debug mode ${debugMode ? 'enabled' : 'disabled'}`)
      return { debugMode }
    }),

  getDebugMode: publicProcedure.query(() => {
    return { debugMode }
  }),

  // Log collection
  setLogCollection: publicProcedure
    .input(z.object({ enabled: z.boolean() }))
    .mutation(({ input }) => {
      collectLogs = input.enabled
      if (input.enabled) {
        console.log(`[openclaw] log collection started`)
      } else {
        console.log(`[openclaw] log collection stopped, ${collectedEvents.length} events collected`)
      }
      return { collectLogs, eventCount: collectedEvents.length }
    }),

  getLogCollection: publicProcedure.query(() => {
    return { collectLogs, eventCount: collectedEvents.length }
  }),

  downloadLogs: publicProcedure.query(() => {
    return {
      events: collectedEvents,
      count: collectedEvents.length,
      collectedAt: new Date().toISOString(),
    }
  }),

  clearLogs: publicProcedure.mutation(() => {
    const count = collectedEvents.length
    collectedEvents.length = 0
    console.log(`[openclaw] cleared ${count} collected events`)
    return { cleared: count }
  }),

  sessions: publicProcedure
    .input(
      z
        .object({
          limit: z.number().optional(),
          activeMinutes: z.number().optional(),
          agentId: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const client = getClawdbotClient()
      const persistence = getPersistenceService()
      if (!client.connected) {
        return { sessions: [], error: 'Not connected' }
      }
      try {
        const sessions = await client.listSessions(input)
        const monitorSessions = sessions.map(sessionInfoToMonitor)
        // Persist sessions if service is enabled
        for (const session of monitorSessions) {
          persistence.upsertSession(session)
        }
        return { sessions: monitorSessions }
      } catch (error) {
        return {
          sessions: [],
          error: error instanceof Error ? error.message : 'Failed to list sessions',
        }
      }
    }),

  events: publicProcedure.subscription(() => {
    return observable<{
      type: 'session' | 'action' | 'exec'
      session?: Partial<MonitorSession>
      action?: MonitorAction
      execEvent?: MonitorExecEvent
    }>((emit) => {
      const client = getClawdbotClient()
      const persistence = getPersistenceService()

      const unsubscribe = client.onEvent((event) => {
        // Collect raw event when log collection is enabled
        if (collectLogs) {
          collectedEvents.push({
            timestamp: Date.now(),
            event,
          })
        }

        // Log raw event when debug mode is enabled
        if (debugMode) {
          console.log('\n[DEBUG] Raw event:', JSON.stringify(event, null, 2))
        }

        const parsed = parseEventFrame(event)
        if (parsed) {
          if (debugMode && parsed.action) {
            console.log('[DEBUG] Parsed action:', parsed.action.type, parsed.action.eventType, 'sessionKey:', parsed.action.sessionKey)
          }
          if (debugMode && parsed.execEvent) {
            console.log('[DEBUG] Parsed exec:', parsed.execEvent.eventType, 'runId:', parsed.execEvent.runId, 'pid:', parsed.execEvent.pid)
          }
          if (parsed.session) {
            emit.next({ type: 'session', session: parsed.session })
          }
          if (parsed.action) {
            // Persist action if service is enabled
            persistence.addAction(parsed.action)
            emit.next({ type: 'action', action: parsed.action })
          }
          if (parsed.execEvent) {
            persistence.addExecEvent(parsed.execEvent)
            emit.next({ type: 'exec', execEvent: parsed.execEvent })
          }
        }
      })

      return () => {
        unsubscribe()
      }
    })
  }),

  // Persistence service
  persistenceStatus: publicProcedure.query(() => {
    const persistence = getPersistenceService()
    return persistence.getStatus()
  }),

  persistenceStart: publicProcedure.mutation(() => {
    const persistence = getPersistenceService()
    return persistence.start()
  }),

  persistenceStop: publicProcedure.mutation(() => {
    const persistence = getPersistenceService()
    return persistence.stop()
  }),

  persistenceHydrate: publicProcedure.query(() => {
    const persistence = getPersistenceService()
    return persistence.hydrate()
  }),

  persistenceClear: publicProcedure.mutation(() => {
    const persistence = getPersistenceService()
    return persistence.clear()
  }),
})

// Workspace router for file system operations
const workspaceRouter = router({
  // Validate workspace path exists
  validatePath: publicProcedure
    .input(z.object({ path: z.string() }))
    .query(async ({ input }): Promise<{ valid: boolean; error?: string; expandedPath?: string }> => {
      try {
        const expandedPath = expandTilde(input.path)
        const exists = await pathExists(expandedPath)
        if (!exists) {
          return { valid: false, error: 'Path does not exist' }
        }
        return { valid: true, expandedPath }
      } catch (error) {
        return {
          valid: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      }
    }),

  // Get default workspace path
  getDefaultPath: publicProcedure.query((): { path: string } => {
    return { path: getDefaultWorkspacePath() }
  }),

  // List directory contents
  listDirectory: publicProcedure
    .input(z.object({ workspaceRoot: z.string(), path: z.string() }))
    .query(async ({ input }): Promise<{ entries: DirectoryEntry[]; error?: string }> => {
      try {
        const expandedRoot = expandTilde(input.workspaceRoot)
        const expandedPath = expandTilde(input.path)
        const entries = await listDirectory(expandedRoot, expandedPath)
        return { entries }
      } catch (error) {
        return {
          entries: [],
          error: error instanceof Error ? error.message : 'Failed to list directory',
        }
      }
    }),

  // Read file contents
  readFile: publicProcedure
    .input(z.object({ workspaceRoot: z.string(), path: z.string() }))
    .query(async ({ input }): Promise<FileContent & { error?: string }> => {
      try {
        const expandedRoot = expandTilde(input.workspaceRoot)
        const expandedPath = expandTilde(input.path)
        const result = await readFile(expandedRoot, expandedPath)
        return result
      } catch (error) {
        return {
          content: '',
          path: input.path,
          name: '',
          error: error instanceof Error ? error.message : 'Failed to read file',
        }
      }
    }),

  // Write file contents
  writeFile: publicProcedure
    .input(z.object({ workspaceRoot: z.string(), path: z.string(), content: z.string() }))
    .mutation(async ({ input }): Promise<{ success: boolean; error?: string }> => {
      try {
        const expandedRoot = expandTilde(input.workspaceRoot)
        const expandedPath = expandTilde(input.path)
        await writeFile(expandedRoot, expandedPath, input.content)
        return { success: true }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to write file',
        }
      }
    }),

  // Delete file
  deleteFile: publicProcedure
    .input(z.object({ workspaceRoot: z.string(), path: z.string() }))
    .mutation(async ({ input }): Promise<{ success: boolean; error?: string }> => {
      try {
        const expandedRoot = expandTilde(input.workspaceRoot)
        const expandedPath = expandTilde(input.path)
        await deleteFile(expandedRoot, expandedPath)
        return { success: true }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to delete file',
        }
      }
    }),

  // Create file
  createFile: publicProcedure
    .input(z.object({ workspaceRoot: z.string(), fileName: z.string(), content: z.string().optional() }))
    .mutation(async ({ input }): Promise<{ success: boolean; error?: string; filePath?: string }> => {
      try {
        const expandedRoot = expandTilde(input.workspaceRoot)
        // Construct path server-side using Node.js path.join
        const path = await import('path')
        const fullPath = path.join(expandedRoot, input.fileName)
        await createFile(expandedRoot, fullPath, input.content || '')
        return { success: true, filePath: fullPath }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create file',
        }
      }
    }),
})

export const appRouter = router({
  hello: publicProcedure
    .input(z.object({ name: z.string().optional() }))
    .query(({ input }) => {
      return { greeting: `Hello ${input.name ?? 'World'}!` }
    }),

  getItems: publicProcedure.query(() => {
    return [
      { id: 1, name: 'Item 1' },
      { id: 2, name: 'Item 2' },
      { id: 3, name: 'Item 3' },
    ]
  }),

  openclaw: openclawRouter,
  workspace: workspaceRouter,
})

export type AppRouter = typeof appRouter
