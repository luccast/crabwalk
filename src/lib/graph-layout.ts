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
const COLUMN_GAP = 400        // Horizontal gap between root sessions (horizontal mode)
const ROW_GAP = 80            // Vertical gap between items
const CRAB_OFFSET = { x: -120, y: -100 }
const MIN_SESSION_GAP = 120   // Minimum gap between root sessions

interface SessionTree {
  session: MonitorSession
  items: Array<{
    nodeId: string
    type: 'session' | 'action' | 'exec'
    timestamp: number
    data: unknown
  }>
  children: SessionTree[]
}

/**
 * Layout algorithm:
 * - Horizontal (LR): Root sessions arranged left-to-right, content flows down
 * - Vertical (TB): Root sessions stacked top-to-bottom, content flows down
 * - Subagents and nodes always stack vertically under their parent session
 */
export function layoutGraph(
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions = {}
): { nodes: Node[]; edges: Edge[] } {
  const direction = options.direction ?? 'LR'
  const isHorizontal = direction === 'LR' || direction === 'RL'

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

  // Group actions by session
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

  // Build session tree
  const sessionMap = new Map(sessions.map((s) => [s.key, s]))
  const childrenMap = new Map<string, MonitorSession[]>()
  const rootSessions: MonitorSession[] = []

  for (const session of sessions) {
    if (session.spawnedBy && sessionMap.has(session.spawnedBy)) {
      const siblings = childrenMap.get(session.spawnedBy) ?? []
      siblings.push(session)
      childrenMap.set(session.spawnedBy, siblings)
    } else {
      rootSessions.push(session)
    }
  }

  // Sort roots by activity time
  rootSessions.sort((a, b) => (a.lastActivityAt ?? 0) - (b.lastActivityAt ?? 0))

  // Build tree recursively
  const buildTree = (session: MonitorSession): SessionTree => {
    const items: SessionTree['items'] = []

    // Session node first
    items.push({
      nodeId: `session-${session.key}`,
      type: 'session',
      timestamp: session.lastActivityAt ?? 0,
      data: session,
    })

    // Add actions
    for (const action of actionsBySession.get(session.key) ?? []) {
      items.push({
        nodeId: `action-${action.id}`,
        type: 'action',
        timestamp: action.data.timestamp,
        data: action.data,
      })
    }

    // Add execs
    for (const exec of execsBySession.get(session.key) ?? []) {
      items.push({
        nodeId: `exec-${exec.id}`,
        type: 'exec',
        timestamp: exec.data.startedAt,
        data: exec.data,
      })
    }

    // Sort by timestamp (session first)
    items.sort((a, b) => {
      if (a.type === 'session') return -1
      if (b.type === 'session') return 1
      return a.timestamp - b.timestamp
    })

    // Build children trees
    const children = (childrenMap.get(session.key) ?? [])
      .sort((a, b) => (a.lastActivityAt ?? 0) - (b.lastActivityAt ?? 0))
      .map(buildTree)

    return { session, items, children }
  }

  const trees = rootSessions.map(buildTree)

  // Position nodes
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

  // Layout a tree, returns the total height used
  const layoutTree = (tree: SessionTree, startX: number, startY: number): number => {
    let currentY = startY

    // Position all items in this session vertically
    for (const item of tree.items) {
      const dims = NODE_DIMENSIONS[item.type]
      positionedNodes.push({
        id: item.nodeId,
        type: item.type,
        position: { x: startX, y: currentY },
        data: nodeData(item.data),
      })
      positionedNodeIds.add(item.nodeId)
      currentY += dims.height + ROW_GAP
    }

    // Layout children (subagents) vertically below, indented
    for (const child of tree.children) {
      currentY = layoutTree(child, startX + 40, currentY)
    }

    return currentY
  }

  // Layout all root trees
  let currentX = 0
  let currentY = 0

  for (const tree of trees) {
    if (isHorizontal) {
      // Horizontal: each root gets its own column
      const treeHeight = layoutTree(tree, currentX, 0)
      currentX += COLUMN_GAP
      // Track max height for orphans
      currentY = Math.max(currentY, treeHeight)
    } else {
      // Vertical: roots stack vertically
      currentY = layoutTree(tree, 0, currentY)
      currentY += MIN_SESSION_GAP
    }
  }

  // Handle orphan nodes
  let orphanY = currentY + 100
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
