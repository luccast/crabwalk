import type { Node, Edge } from '@xyflow/react'
import type {
  MonitorSession,
  MonitorAction,
  MonitorExecProcess,
} from '~/integrations/clawdbot'

export interface LayoutOptions {
  direction?: 'TB' | 'LR' | 'BT' | 'RL'
  nodeWidth?: number
  nodeHeight?: number
  rankSep?: number
  nodeSep?: number
}

// Node sizing configuration
const NODE_DIMENSIONS = {
  session: { width: 200, height: 120 },
  exec: { width: 260, height: 100 },
  action: { width: 180, height: 80 }, // Compact chat events
  crab: { width: 64, height: 64 },
}

// Layout constants
const COLUMN_GAP = 300        // Horizontal gap between session columns
const ROW_GAP = 40           // Vertical gap between items in a column
const SPAWN_OFFSET = 50       // Extra Y offset when spawning to right
const CRAB_OFFSET = { x: -100, y: -80 }

interface SessionColumn {
  sessionKey: string
  columnIndex: number
  spawnY: number  // Y position where this session was spawned from parent
  items: Array<{
    nodeId: string
    type: 'session' | 'action' | 'exec'
    timestamp: number
    data: unknown
  }>
}

/**
 * Horizontal spawn layout algorithm:
 * - Sessions arranged in columns (X = spawn depth)
 * - Events within a session flow DOWN (Y = time progression)
 * - Child sessions appear to the RIGHT at the Y-level where they were spawned
 */
export function layoutGraph(
  nodes: Node[],
  edges: Edge[],
  _options: LayoutOptions = {}
): { nodes: Node[]; edges: Edge[] } {
  // Build session hierarchy and columns
  const sessions = nodes
    .filter((n) => n.type === 'session')
    .map((n) => n.data as unknown as MonitorSession)

  const actions = nodes
    .filter((n) => n.type === 'action')
    .map((n) => ({ id: n.id.replace('action-', ''), data: n.data as unknown as MonitorAction }))

  const execs = nodes
    .filter((n) => n.type === 'exec')
    .map((n) => ({ id: n.id.replace('exec-', ''), data: n.data as unknown as MonitorExecProcess }))

  const crabNode = nodes.find((n) => n.type === 'crab')

  // Build session column map - which column is each session in?
  const sessionColumns = new Map<string, SessionColumn>()
  const columnOccupancy = new Map<number, number>() // columnIndex -> maxY used

  // First pass: determine column for each session based on spawn hierarchy
  const getSessionColumn = (sessionKey: string, visited = new Set<string>()): number => {
    if (visited.has(sessionKey)) return 0
    visited.add(sessionKey)

    const session = sessions.find((s) => s.key === sessionKey)
    if (!session) return 0

    if (session.spawnedBy) {
      return getSessionColumn(session.spawnedBy, visited) + 1
    }
    return 0
  }

  // Assign columns to all sessions
  for (const session of sessions) {
    const columnIndex = getSessionColumn(session.key)
    sessionColumns.set(session.key, {
      sessionKey: session.key,
      columnIndex,
      spawnY: 0,
      items: [],
    })
  }

  // Group actions by session and sort by timestamp
  const actionsBySession = new Map<string, typeof actions>()
  for (const action of actions) {
    const sessionKey = action.data.sessionKey
    if (!sessionKey) continue
    const list = actionsBySession.get(sessionKey) ?? []
    list.push(action)
    actionsBySession.set(sessionKey, list)
  }
  for (const [key, list] of actionsBySession) {
    list.sort((a, b) => a.data.timestamp - b.data.timestamp)
    actionsBySession.set(key, list)
  }

  // Group execs by session
  const execsBySession = new Map<string, typeof execs>()
  for (const exec of execs) {
    const sessionKey = exec.data.sessionKey
    if (!sessionKey) continue
    const list = execsBySession.get(sessionKey) ?? []
    list.push(exec)
    execsBySession.set(sessionKey, list)
  }
  for (const [key, list] of execsBySession) {
    list.sort((a, b) => a.data.startedAt - b.data.startedAt)
    execsBySession.set(key, list)
  }

  // Build items list for each session (session node + actions + execs)
  for (const session of sessions) {
    const col = sessionColumns.get(session.key)
    if (!col) continue

    // Add session node itself
    col.items.push({
      nodeId: `session-${session.key}`,
      type: 'session',
      timestamp: session.lastActivityAt ?? 0,
      data: session,
    })

    // Add actions
    const sessionActions = actionsBySession.get(session.key) ?? []
    for (const action of sessionActions) {
      col.items.push({
        nodeId: `action-${action.id}`,
        type: 'action',
        timestamp: action.data.timestamp,
        data: action.data,
      })
    }

    // Add execs
    const sessionExecs = execsBySession.get(session.key) ?? []
    for (const exec of sessionExecs) {
      col.items.push({
        nodeId: `exec-${exec.id}`,
        type: 'exec',
        timestamp: exec.data.startedAt,
        data: exec.data,
      })
    }

    // Sort all items by timestamp (session node first since it's the start)
    col.items.sort((a, b) => {
      if (a.type === 'session') return -1
      if (b.type === 'session') return 1
      return a.timestamp - b.timestamp
    })
  }

  // Calculate spawn Y positions for child sessions
  // When a session is spawned, find the Y position of the parent at that time
  for (const session of sessions) {
    if (!session.spawnedBy) continue

    const parentCol = sessionColumns.get(session.spawnedBy)
    const childCol = sessionColumns.get(session.key)
    if (!parentCol || !childCol) continue

    // Find the approximate position in parent where spawn happened
    // Use the child's creation time (approximated by first action time or session activity)
    const childActions = actionsBySession.get(session.key) ?? []
    const childCreationTime = childActions[0]?.data.timestamp ?? session.lastActivityAt ?? Date.now()

    // Count how many items in parent were before this spawn
    let parentItemsBeforeSpawn = 0
    for (const item of parentCol.items) {
      if (item.type === 'session') {
        parentItemsBeforeSpawn++
        continue
      }
      if (item.timestamp <= childCreationTime) {
        parentItemsBeforeSpawn++
      }
    }

    // Calculate Y based on parent's item count
    childCol.spawnY = parentItemsBeforeSpawn * (NODE_DIMENSIONS.action.height + ROW_GAP) + SPAWN_OFFSET
  }

  // Position all nodes
  const positionedNodes: Node[] = []
  const positionedNodeIds = new Set<string>()

  // Position crab node
  if (crabNode) {
    positionedNodes.push({
      ...crabNode,
      position: { x: CRAB_OFFSET.x, y: CRAB_OFFSET.y },
    })
    positionedNodeIds.add(crabNode.id)
  }

  // Track column slots for collision avoidance
  const usedColumnSlots = new Map<number, number[]>() // columnIndex -> list of Y positions used

  // Get X position for a column, avoiding collisions
  const getColumnX = (columnIndex: number, spawnY: number): number => {
    const baseX = columnIndex * COLUMN_GAP
    
    // Check if this column slot is already used at similar Y
    const usedSlots = usedColumnSlots.get(columnIndex) ?? []
    const conflicts = usedSlots.filter((usedY) => Math.abs(usedY - spawnY) < 200)
    
    if (conflicts.length === 0) {
      usedSlots.push(spawnY)
      usedColumnSlots.set(columnIndex, usedSlots)
      return baseX
    }
    
    // Shift right if there's a collision
    return baseX + conflicts.length * 100
  }

  // Position each session's column
  for (const [, col] of sessionColumns) {
    const columnX = getColumnX(col.columnIndex, col.spawnY)
    let currentY = col.spawnY

    for (const item of col.items) {
      const dims = NODE_DIMENSIONS[item.type]
      
      positionedNodes.push({
        id: item.nodeId,
        type: item.type,
        position: { x: columnX, y: currentY },
        data: item.data as Record<string, unknown>,
      })
      positionedNodeIds.add(item.nodeId)

      currentY += dims.height + ROW_GAP
    }

    // Track max Y for this column
    columnOccupancy.set(col.columnIndex, Math.max(
      columnOccupancy.get(col.columnIndex) ?? 0,
      currentY
    ))
  }

  // Handle orphan nodes (actions/execs without a session)
  let orphanY = Math.max(...Array.from(columnOccupancy.values()), 0) + 100
  for (const node of nodes) {
    if (!positionedNodeIds.has(node.id)) {
      const dims = NODE_DIMENSIONS[node.type as keyof typeof NODE_DIMENSIONS] ?? { width: 180, height: 80 }
      positionedNodes.push({
        ...node,
        position: { x: -200, y: orphanY },
      })
      orphanY += dims.height + ROW_GAP
    }
  }

  return { nodes: positionedNodes, edges }
}

// Group nodes by session for better visual organization
export function groupNodesBySession(nodes: Node[]): Map<string, Node[]> {
  const groups = new Map<string, Node[]>()

  for (const node of nodes) {
    const sessionKey = node.data?.sessionKey as string | undefined
    if (sessionKey) {
      const group = groups.get(sessionKey) ?? []
      group.push(node)
      groups.set(sessionKey, group)
    }
  }

  return groups
}
