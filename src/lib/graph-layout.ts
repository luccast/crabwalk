import dagre from 'dagre'
import type { Node, Edge } from '@xyflow/react'

export interface LayoutOptions {
  direction?: 'TB' | 'LR' | 'BT' | 'RL'
  nodeWidth?: number
  nodeHeight?: number
  rankSep?: number
  nodeSep?: number
}

export function layoutGraph(
  nodes: Node[],
  edges: Edge[],
  options: LayoutOptions = {}
): { nodes: Node[]; edges: Edge[] } {
  const {
    direction = 'TB',
    nodeWidth = 200,
    nodeHeight = 80,
    rankSep = 80,
    nodeSep = 40,
  } = options

  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: direction, ranksep: rankSep, nodesep: nodeSep })

  // Add nodes
  for (const node of nodes) {
    const width = node.measured?.width ?? nodeWidth
    const height = node.measured?.height ?? nodeHeight
    g.setNode(node.id, { width, height })
  }

  // Add edges
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target)
  }

  // Run layout
  dagre.layout(g)

  // Apply positions
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = g.node(node.id)
    const width = node.measured?.width ?? nodeWidth
    const height = node.measured?.height ?? nodeHeight

    return {
      ...node,
      position: {
        x: nodeWithPosition.x - width / 2,
        y: nodeWithPosition.y - height / 2,
      },
    }
  })

  return { nodes: layoutedNodes, edges }
}

// Group nodes by session for better visual organization
export function groupNodesBySession(
  nodes: Node[]
): Map<string, Node[]> {
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
