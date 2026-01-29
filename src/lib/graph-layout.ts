import type { Node, Edge } from '@xyflow/react'
import type {
  MonitorSession,
  MonitorAction,
  MonitorExecProcess,
} from '~/integrations/clawdbot'

/** Cast domain data to ReactFlow's Node data type */
function nodeData<T>(data: T): Record<string, unknown> {
  return data as Record<string, unknown>
}

export interface LayoutOptions {
  direction?: 'TB' | 'LR' | 'BT' | 'RL'
  nodeWidth?: number
  nodeHeight?: number
  rankSep?: number
  nodeSep?: number
}

// Node sizing configuration - sized generously for layout calculations
const NODE_DIMENSIONS = {
  session: { width: 280, height: 140 },  // Wider for session cards
  exec: { width: 300, height: 120 },     // Exec processes need room
  action: { width: 220, height: 100 },   // Chat events with padding
  crab: { width: 64, height: 64 },
}

// Layout constants - generous spacing for clarity
const COLUMN_GAP = 400        // Horizontal gap between session columns
const ROW_GAP = 80            // Vertical gap between items in a column
const SPAWN_OFFSET = 60       // Extra Y offset when spawning to right
const CRAB_OFFSET = { x: -120, y: -100 }
const ROOT_START_Y = 200      // Vertical offset from crab to first root session
const MIN_SESSION_GAP = 120   // Minimum vertical gap between sessions in same column
const ROOT_HORIZONTAL_GAP = 0 // Gap between root sessions in horizontal mode

interface SessionColumn {
  sessionKey: string
  columnIndex: number
  rootIndex: number  // Which root tree this session belongs to (for horizontal mode)
  spawnY: number  // Y position where this session was spawned from parent
  items: Array<{
    nodeId: string
    type: 'session' | 'action' | 'exec'
    timestamp: number
    data: unknown
  }>
}

/**
 * Layout algorithm:
 * - Vertical (TB): All roots in column 0, subagents spawn to the right based on depth
 * - Horizontal (LR): Each root gets its own column group, subagents spawn further right
 * - Subagents positioned at the Y-level where they were spawned (timeline style)
 */
export function layoutGraph(
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions = {}
): { nodes: Node[]; edges: Edge[] } {
  const direction = options.direction ?? 'LR'
  const isHorizontal = direction === 'LR' || direction === 'RL'

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

  // Find root sessions and build root index map
  const rootSessions: MonitorSession[] = []
  const sessionToRoot = new Map<string, number>() // sessionKey -> rootIndex

  // First identify all roots
  for (const session of sessions) {
    if (!session.spawnedBy || !sessions.find(s => s.key === session.spawnedBy)) {
      rootSessions.push(session)
    }
  }
  // Sort by session key for stable ordering - lastActivityAt changes during streaming
  // which would cause nodes to swap positions
  rootSessions.sort((a, b) => a.key.localeCompare(b.key))

  // Assign root index to each root
  rootSessions.forEach((root, idx) => sessionToRoot.set(root.key, idx))

  // Find root for any session by walking up the spawn chain
  const findRootIndex = (sessionKey: string, visited = new Set<string>()): number => {
    if (visited.has(sessionKey)) return 0
    visited.add(sessionKey)

    if (sessionToRoot.has(sessionKey)) {
      return sessionToRoot.get(sessionKey)!
    }

    const session = sessions.find((s) => s.key === sessionKey)
    if (!session || !session.spawnedBy) return 0

    const rootIdx = findRootIndex(session.spawnedBy, visited)
    sessionToRoot.set(sessionKey, rootIdx)
    return rootIdx
  }

  // Determine column for each session based on spawn hierarchy
  const getSessionDepth = (sessionKey: string, visited = new Set<string>()): number => {
    if (visited.has(sessionKey)) return 0
    visited.add(sessionKey)

    const session = sessions.find((s) => s.key === sessionKey)
    if (!session) return 0

    if (session.spawnedBy) {
      return getSessionDepth(session.spawnedBy, visited) + 1
    }
    return 0
  }

  // Assign columns to all sessions
  for (const session of sessions) {
    const depth = getSessionDepth(session.key)
    const rootIndex = findRootIndex(session.key)
    sessionColumns.set(session.key, {
      sessionKey: session.key,
      columnIndex: depth,
      rootIndex,
      spawnY: depth === 0 ? ROOT_START_Y : 0,  // Root sessions start below crab
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

  // Track column usage for collision avoidance
  // In horizontal mode, we track per (rootIndex, columnIndex)
  // In vertical mode, we track per columnIndex only
  const columnRanges = new Map<string, Array<{ startY: number; endY: number }>>()

  const getColumnKey = (rootIndex: number, columnIndex: number): string => {
    return isHorizontal ? `${rootIndex}-${columnIndex}` : `${columnIndex}`
  }

  // Get X position for a session
  const getColumnX = (rootIndex: number, columnIndex: number): number => {
    if (isHorizontal) {
      // Each root tree gets its own horizontal space
      // Root at rootIndex * (maxDepth * COLUMN_GAP + ROOT_HORIZONTAL_GAP)
      // Plus columnIndex * COLUMN_GAP for depth within tree
      const maxDepth = Math.max(...Array.from(sessionColumns.values()).map(c => c.columnIndex)) + 1
      const treeWidth = maxDepth * COLUMN_GAP
      return rootIndex * (treeWidth + ROOT_HORIZONTAL_GAP) + columnIndex * COLUMN_GAP
    } else {
      // Vertical: all sessions at same depth share X
      return columnIndex * COLUMN_GAP
    }
  }

  // Adjust spawn Y to avoid collisions with existing sessions in same column
  const adjustSpawnY = (rootIndex: number, columnIndex: number, desiredY: number, itemCount: number): number => {
    const key = getColumnKey(rootIndex, columnIndex)
    const ranges = columnRanges.get(key) ?? []
    const estimatedHeight = itemCount * (NODE_DIMENSIONS.action.height + ROW_GAP) + MIN_SESSION_GAP

    let adjustedY = desiredY

    // Check for overlaps and shift down if needed
    for (const range of ranges) {
      if (adjustedY < range.endY && (adjustedY + estimatedHeight) > range.startY) {
        adjustedY = range.endY + MIN_SESSION_GAP
      }
    }

    // Record our range
    ranges.push({ startY: adjustedY, endY: adjustedY + estimatedHeight })
    columnRanges.set(key, ranges)

    return adjustedY
  }

  // Sort sessions by column index (process column 0 first, then 1, etc.)
  // This ensures parent sessions are positioned before children
  const sortedSessionKeys = Array.from(sessionColumns.keys()).sort((a, b) => {
    const colA = sessionColumns.get(a)!
    const colB = sessionColumns.get(b)!
    // First by root index (in horizontal mode)
    if (isHorizontal && colA.rootIndex !== colB.rootIndex) {
      return colA.rootIndex - colB.rootIndex
    }
    // Then by column index (depth)
    if (colA.columnIndex !== colB.columnIndex) {
      return colA.columnIndex - colB.columnIndex
    }
    // Within same column, sort by spawn Y (earlier spawns first)
    return colA.spawnY - colB.spawnY
  })

  // Position each session's column
  for (const sessionKey of sortedSessionKeys) {
    const col = sessionColumns.get(sessionKey)!
    const columnX = getColumnX(col.rootIndex, col.columnIndex)

    // Adjust Y position to avoid collisions with other sessions in same column
    const adjustedY = adjustSpawnY(col.rootIndex, col.columnIndex, col.spawnY, col.items.length)
    let currentY = adjustedY

    for (const item of col.items) {
      const dims = NODE_DIMENSIONS[item.type]

      positionedNodes.push({
        id: item.nodeId,
        type: item.type,
        position: { x: columnX, y: currentY },
        data: nodeData(item.data),
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
