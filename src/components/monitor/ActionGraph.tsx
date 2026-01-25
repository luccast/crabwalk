import { useCallback, useEffect, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeTypes,
  MarkerType,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { SessionNode } from './SessionNode'
import { ActionNode } from './ActionNode'
import { layoutGraph } from '~/lib/graph-layout'
import type { MonitorSession, MonitorAction } from '~/integrations/clawdbot'

interface ActionGraphProps {
  sessions: MonitorSession[]
  actions: MonitorAction[]
  selectedSession: string | null
  onSessionSelect: (key: string | null) => void
}

const nodeTypes: NodeTypes = {
  session: SessionNode,
  action: ActionNode,
}

export function ActionGraph({
  sessions,
  actions,
  selectedSession,
  onSessionSelect,
}: ActionGraphProps) {
  // Filter actions for selected session, or show all if none selected
  const visibleActions = useMemo(() => {
    if (!selectedSession) return actions.slice(-50) // Last 50 actions
    return actions.filter((a) => a.sessionKey === selectedSession)
  }, [actions, selectedSession])

  // Build nodes
  const rawNodes = useMemo(() => {
    const nodes: Node[] = []

    // Add session nodes
    const visibleSessions = selectedSession
      ? sessions.filter((s) => s.key === selectedSession)
      : sessions

    for (const session of visibleSessions) {
      nodes.push({
        id: `session-${session.key}`,
        type: 'session',
        position: { x: 0, y: 0 },
        data: session,
      })
    }

    // Add action nodes
    for (const action of visibleActions) {
      nodes.push({
        id: `action-${action.id}`,
        type: 'action',
        position: { x: 0, y: 0 },
        data: action,
      })
    }

    return nodes
  }, [sessions, visibleActions, selectedSession])

  // Build edges
  const rawEdges = useMemo(() => {
    const edges: Edge[] = []

    // Group actions by runId
    const runActions = new Map<string, MonitorAction[]>()
    for (const action of visibleActions) {
      const run = runActions.get(action.runId) ?? []
      run.push(action)
      runActions.set(action.runId, run)
    }

    // Connect session to first action of each run
    for (const [runId, runActs] of runActions) {
      const sorted = [...runActs].sort((a, b) => a.seq - b.seq)
      if (sorted.length > 0) {
        const first = sorted[0]
        const sessionId = `session-${first.sessionKey}`
        edges.push({
          id: `e-session-${runId}`,
          source: sessionId,
          target: `action-${first.id}`,
          animated: first.type === 'delta',
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { stroke: '#6b7280' },
        })
      }

      // Connect actions in sequence
      for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1]
        const curr = sorted[i]
        edges.push({
          id: `e-${prev.id}-${curr.id}`,
          source: `action-${prev.id}`,
          target: `action-${curr.id}`,
          animated: curr.type === 'delta',
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { stroke: '#6b7280' },
        })
      }
    }

    return edges
  }, [visibleActions])

  // Apply layout
  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(() => {
    if (rawNodes.length === 0) return { nodes: [], edges: [] }
    return layoutGraph(rawNodes, rawEdges, {
      direction: 'TB',
      nodeWidth: 200,
      nodeHeight: 80,
      rankSep: 60,
      nodeSep: 30,
    })
  }, [rawNodes, rawEdges])

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges)

  // Update nodes when layout changes
  useEffect(() => {
    setNodes(layoutedNodes)
    setEdges(layoutedEdges)
  }, [layoutedNodes, layoutedEdges, setNodes, setEdges])

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.type === 'session') {
        const sessionKey = (node.data as MonitorSession).key
        onSessionSelect(selectedSession === sessionKey ? null : sessionKey)
      }
    },
    [onSessionSelect, selectedSession]
  )

  return (
    <div className="w-full h-full bg-gray-950">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#374151" gap={20} />
        <Controls className="!bg-gray-800 !border-gray-700 !rounded-lg" />
        <MiniMap
          className="!bg-gray-800 !border-gray-700 !rounded-lg"
          nodeColor={(node) => {
            if (node.type === 'session') return '#06b6d4'
            return '#6b7280'
          }}
        />
      </ReactFlow>
    </div>
  )
}
