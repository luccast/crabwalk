import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  type NodeChange,
  MarkerType,
  ReactFlowProvider,
} from '@xyflow/react'
import { LayoutGrid, ArrowRightLeft, ArrowUpDown } from 'lucide-react'
import '@xyflow/react/dist/style.css'
import { SessionNode } from './SessionNode'
import { ActionNode } from './ActionNode'
import { ExecNode } from './ExecNode'
import { CrabNode } from './CrabNode'
import { ChaserCrabNode, type ChaserCrabState } from './ChaserCrabNode'
import { layoutGraph } from '~/lib/graph-layout'
import type {
  MonitorSession,
  MonitorAction,
  MonitorExecProcess,
} from '~/integrations/clawdbot'

interface ActionGraphProps {
  sessions: MonitorSession[]
  actions: MonitorAction[]
  execs: MonitorExecProcess[]
  selectedSession: string | null
  onSessionSelect: (key: string | null) => void
}

/** Cast domain data to ReactFlow's Node data type */
function nodeData<T>(data: T): Record<string, unknown> {
  return data as Record<string, unknown>
}

const CRAB_NODE_ID = 'crab-origin'
const CHASER_CRAB_ID = 'chaser-crab'

// Crab behavior constants - tuned for 10fps crab-like movement
const STEP_INTERVAL = 100 // ms between steps (matches 10fps animation)
const STEP_SIZE = 8 // pixels per step
const WANDER_STEP_SIZE = 5
const ATTACK_DISTANCE = 30
const ATTACK_CHANCE = 0.5
const WANDER_RADIUS = 50
const IDLE_PAUSE_MIN = 800 // min ms to pause when idle
const IDLE_PAUSE_MAX = 3000 // max ms to pause when idle
const WANDER_CHANCE = 0.3 // 30% chance to wander after idle pause
const SIDEWAYS_DRIFT = 0.4 // crabs scuttle sideways

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nodeTypes: NodeTypes = {
  session: SessionNode as any,
  action: ActionNode as any,
  exec: ExecNode as any,
  crab: CrabNode as any,
  chaserCrab: ChaserCrabNode as any,
}

interface CrabAI {
  position: { x: number; y: number }
  target: { x: number; y: number; nodeId?: string } | null
  state: ChaserCrabState
  facingLeft: boolean
  lastStepTime: number
  idleUntil: number // timestamp when idle pause ends
}

// Inner component that uses ReactFlow hooks
function ActionGraphInner({
  sessions,
  actions,
  execs,
  selectedSession,
  onSessionSelect,
}: ActionGraphProps) {
  // Crab AI state
  const crabRef = useRef<CrabAI>({
    position: { x: 50, y: 50 },
    target: null,
    state: 'idle',
    facingLeft: false,
    lastStepTime: 0,
    idleUntil: 0,
  })

  const prevNodeIdsRef = useRef<Set<string>>(new Set())
  const nodePositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map())
  const pinnedPositions = useRef<Map<string, { x: number; y: number }>>(new Map())
  const animationFrameRef = useRef<number>(undefined)
  const timeoutRef = useRef<NodeJS.Timeout>(undefined)

  // Layout direction: LR = horizontal (sessions spawn right), TB = vertical (sessions stack down)
  const [layoutDirection, setLayoutDirection] = useState<'LR' | 'TB'>('LR')

  // Filter actions for selected session, or show all if none selected
  const visibleActions = useMemo(() => {
    if (!selectedSession) return actions.slice(-50)
    return actions.filter((a) => a.sessionKey === selectedSession)
  }, [actions, selectedSession])

  const visibleExecs = useMemo(() => {
    if (!selectedSession) return execs.slice(-50)
    return execs.filter((exec) => exec.sessionKey === selectedSession)
  }, [execs, selectedSession])

  // Build nodes
  const rawNodes = useMemo(() => {
    const nodes: Node[] = []

    const hasActivity =
      sessions.length > 0 || visibleActions.length > 0 || visibleExecs.length > 0
    nodes.push({
      id: CRAB_NODE_ID,
      type: 'crab',
      position: { x: 0, y: 0 },
      data: { active: hasActivity },
    })

    const visibleSessions = selectedSession
      ? sessions.filter((s) => s.key === selectedSession)
      : sessions

    for (const session of visibleSessions) {
      nodes.push({
        id: `session-${session.key}`,
        type: 'session',
        position: { x: 0, y: 0 },
        data: nodeData(session),
      })
    }

    for (const action of visibleActions) {
      nodes.push({
        id: `action-${action.id}`,
        type: 'action',
        position: { x: 0, y: 0 },
        data: nodeData(action),
      })
    }

    for (const exec of visibleExecs) {
      nodes.push({
        id: `exec-${exec.id}`,
        type: 'exec',
        position: { x: 0, y: 0 },
        data: nodeData(exec),
      })
    }

    return nodes
  }, [sessions, visibleActions, visibleExecs, selectedSession])

  // Build edges
  const rawEdges = useMemo(() => {
    const edges: Edge[] = []

    const visibleSessions = selectedSession
      ? sessions.filter((s) => s.key === selectedSession)
      : sessions

    // Build a set of visible session keys for parent lookup
    const visibleSessionKeys = new Set(visibleSessions.map((s) => s.key))

    // Edge styles
    const spawnEdgeStyle = {
      animated: true,
      style: { stroke: '#00ffd5', strokeWidth: 2, strokeDasharray: '8 4' },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#00ffd5' },
    }

    const crabEdgeStyle = {
      animated: false,
      style: { stroke: '#ef4444', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444' },
    }

    // Group actions by session for spawn point lookup
    const sessionActions = new Map<string, MonitorAction[]>()
    for (const action of visibleActions) {
      const key = action.sessionKey
      if (!key || key === 'lifecycle') continue
      const list = sessionActions.get(key) ?? []
      list.push(action)
      sessionActions.set(key, list)
    }
    // Sort each session's actions by timestamp
    for (const [key, actions] of sessionActions) {
      sessionActions.set(key, [...actions].sort((a, b) => a.timestamp - b.timestamp))
    }

    // Connect sessions to their spawn sources
    for (const session of visibleSessions) {
      const parentSessionKey = session.spawnedBy

      if (parentSessionKey && visibleSessionKeys.has(parentSessionKey)) {
        // This session was spawned by another session
        // Connect from parent's right handle to child's left handle (horizontal spawn)
        edges.push({
          id: `e-spawn-${session.key}`,
          source: `session-${parentSessionKey}`,
          target: `session-${session.key}`,
          sourceHandle: 'spawn-source',
          targetHandle: 'spawn-target',
          type: 'smoothstep',
          ...spawnEdgeStyle,
        })
      } else {
        // Root session - connect from crab
        edges.push({
          id: `e-crab-${session.key}`,
          source: CRAB_NODE_ID,
          target: `session-${session.key}`,
          ...crabEdgeStyle,
        })
      }
    }

    const sessionNodeIds = new Set(visibleSessions.map((s) => `session-${s.key}`))

    const getEdgeStyle = (action: MonitorAction) => {
      switch (action.type) {
        case 'start':
          return {
            animated: true,
            style: { stroke: '#98ffc8', strokeDasharray: '5 5' },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#98ffc8' },
          }
        case 'streaming':
          return {
            animated: true,
            style: { stroke: '#00ffd5' },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#00ffd5' },
          }
        case 'complete':
          return {
            animated: false,
            style: { stroke: '#98ffc8' },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#98ffc8' },
          }
        case 'error':
          return {
            animated: false,
            style: { stroke: '#ef4444' },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444' },
          }
        case 'aborted':
          return {
            animated: false,
            style: { stroke: '#ffb399' },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#ffb399' },
          }
        default:
          return {
            animated: false,
            style: { stroke: '#52526e' },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#52526e' },
          }
      }
    }

    // Connect actions within each session (vertical flow)
    for (const [sessionKey, actions] of sessionActions) {
      const sorted = actions // Already sorted above
      const sessionId = `session-${sessionKey}`

      for (let i = 0; i < sorted.length; i++) {
        const action = sorted[i]!
        const edgeStyle = getEdgeStyle(action)

        if (i === 0) {
          // First action connects from session node
          if (sessionNodeIds.has(sessionId)) {
            edges.push({
              id: `e-session-${action.id}`,
              source: sessionId,
              target: `action-${action.id}`,
              ...edgeStyle,
            })
          }
        } else {
          // Subsequent actions connect from previous action
          const prev = sorted[i - 1]!
          edges.push({
            id: `e-${prev.id}-${action.id}`,
            source: `action-${prev.id}`,
            target: `action-${action.id}`,
            ...edgeStyle,
          })
        }
      }
    }

    const getExecEdgeStyle = (exec: MonitorExecProcess) => {
      switch (exec.status) {
        case 'running':
          return {
            animated: true,
            style: { stroke: '#00ffd5', strokeDasharray: '4 4' },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#00ffd5' },
          }
        case 'failed':
          return {
            animated: false,
            style: { stroke: '#ef4444' },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#ef4444' },
          }
        case 'completed':
        default:
          return {
            animated: false,
            style: { stroke: '#98ffc8' },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#98ffc8' },
          }
      }
    }

    // Connect execs to their session
    for (const exec of visibleExecs) {
      const key = exec.sessionKey
      if (!key) continue
      const sessionId = `session-${key}`
      if (!sessionNodeIds.has(sessionId)) continue
      const edgeStyle = getExecEdgeStyle(exec)
      edges.push({
        id: `e-session-exec-${exec.id}`,
        source: sessionId,
        target: `exec-${exec.id}`,
        ...edgeStyle,
      })
    }

    return edges
  }, [sessions, visibleActions, visibleExecs, selectedSession])

  // Apply layout
  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(() => {
    if (rawNodes.length === 1) {
      return {
        nodes: [{ ...rawNodes[0]!, position: { x: 0, y: 0 } }],
        edges: [],
      }
    }
    return layoutGraph(rawNodes, rawEdges, {
      direction: layoutDirection,
      nodeWidth: 200,
      nodeHeight: 80,
      rankSep: 60,
      nodeSep: 30,
    })
  }, [rawNodes, rawEdges, layoutDirection])

  // Initial nodes with chaser (click handler added later)
  const initialNodes = useMemo(() => {
    const crab = crabRef.current
    const chaserNode: Node = {
      id: CHASER_CRAB_ID,
      type: 'chaserCrab',
      position: crab.position,
      data: {
        state: crab.state,
        facingLeft: crab.facingLeft,
        onClick: () => {}, // Placeholder, updated after setNodes is available
      },
      draggable: false,
      selectable: false,
      zIndex: 1000,
    }
    return [...layoutedNodes, chaserNode]
  }, [])

  const [nodes, setNodes, rawOnNodesChange] = useNodesState(initialNodes)

  // Intercept node changes to detect drag-end and pin positions
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      for (const change of changes) {
        if (
          change.type === 'position' &&
          'dragging' in change &&
          change.dragging === false &&
          change.position
        ) {
          pinnedPositions.current.set(change.id, { ...change.position })
        }
      }
      rawOnNodesChange(changes)
    },
    [rawOnNodesChange]
  )

  // Handle crab click - jump animation (defined after setNodes)
  const handleCrabClick = useCallback(() => {
    const crab = crabRef.current
    if (crab.state === 'attacking' || crab.state === 'jumping') return

    // Remember what state to return to
    const previousState = crab.state
    const hadTarget = crab.target !== null

    crab.state = 'jumping'

    // Immediately update the node to show jump animation
    setNodes((nds) =>
      nds.map((n) =>
        n.id === CHASER_CRAB_ID
          ? {
              ...n,
              data: {
                ...n.data,
                state: 'jumping',
              },
            }
          : n
      )
    )

    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      // Resume previous behavior
      if (hadTarget && crab.target) {
        // Still has target, go back to chasing/wandering
        crab.state = previousState === 'wandering' ? 'wandering' : 'chasing'
      } else {
        crab.state = 'idle'
        crab.idleUntil = Date.now() + IDLE_PAUSE_MIN
      }

      setNodes((nds) =>
        nds.map((n) =>
          n.id === CHASER_CRAB_ID
            ? {
                ...n,
                data: {
                  ...n.data,
                  state: crab.state,
                },
              }
            : n
        )
      )
    }, 400)
  }, [setNodes])
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges)

  // Detect new nodes and moved nodes
  useEffect(() => {
    const currentIds = new Set(layoutedNodes.map((n) => n.id))
    const prevIds = prevNodeIdsRef.current
    const prevPositions = nodePositionsRef.current
    const crab = crabRef.current

    // Check for new nodes
    for (const node of layoutedNodes) {
      if (!node.id.includes('crab')) {
        const nodeCenter = {
          x: node.position.x + 100,
          y: node.position.y + 40,
        }

        // New node - chase it
        if (!prevIds.has(node.id)) {
          crab.target = { ...nodeCenter, nodeId: node.id }
          crab.state = 'chasing'
          if (timeoutRef.current) clearTimeout(timeoutRef.current)
          break
        }

        // Existing node moved - if we were tracking it or idle, chase it
        const prevPos = prevPositions.get(node.id)
        if (prevPos) {
          const moved = Math.abs(prevPos.x - node.position.x) > 5 ||
                       Math.abs(prevPos.y - node.position.y) > 5
          if (moved && (crab.state === 'idle' || crab.target?.nodeId === node.id)) {
            crab.target = { ...nodeCenter, nodeId: node.id }
            crab.state = 'chasing'
            if (timeoutRef.current) clearTimeout(timeoutRef.current)
          }
        }

        prevPositions.set(node.id, { x: node.position.x, y: node.position.y })
      }
    }

    prevNodeIdsRef.current = currentIds
  }, [layoutedNodes])

  // Main animation loop - step-based crab movement at 10fps timing
  useEffect(() => {
    const animate = (timestamp: number) => {
      const crab = crabRef.current
      let needsUpdate = false

      // State machine
      switch (crab.state) {
        case 'idle': {
          // Wait for idle pause to end
          if (timestamp < crab.idleUntil) break

          // Randomly decide to wander
          if (Math.random() < WANDER_CHANCE) {
            const angle = Math.random() * Math.PI * 2
            const distance = Math.random() * WANDER_RADIUS + 20
            crab.target = {
              x: crab.position.x + Math.cos(angle) * distance,
              y: crab.position.y + Math.sin(angle) * distance,
            }
            crab.state = 'wandering'
            crab.lastStepTime = timestamp
            needsUpdate = true
          } else {
            // Set another idle pause
            crab.idleUntil = timestamp + IDLE_PAUSE_MIN + Math.random() * (IDLE_PAUSE_MAX - IDLE_PAUSE_MIN)
          }
          break
        }

        case 'wandering': {
          if (!crab.target) {
            crab.state = 'idle'
            crab.idleUntil = timestamp + IDLE_PAUSE_MIN + Math.random() * (IDLE_PAUSE_MAX - IDLE_PAUSE_MIN)
            needsUpdate = true
            break
          }

          // Only move on step intervals (10fps = 100ms)
          if (timestamp - crab.lastStepTime < STEP_INTERVAL) break
          crab.lastStepTime = timestamp

          const dx = crab.target.x - crab.position.x
          const dy = crab.target.y - crab.position.y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < WANDER_STEP_SIZE) {
            crab.state = 'idle'
            crab.target = null
            crab.idleUntil = timestamp + IDLE_PAUSE_MIN + Math.random() * (IDLE_PAUSE_MAX - IDLE_PAUSE_MIN)
            needsUpdate = true
            break
          }

          // Crab scuttles - mostly sideways with forward bias
          const dirX = dx / distance
          const dirY = dy / distance
          // Add sideways drift perpendicular to movement direction
          const perpX = -dirY * SIDEWAYS_DRIFT * (Math.random() > 0.5 ? 1 : -1)
          const perpY = dirX * SIDEWAYS_DRIFT * (Math.random() > 0.5 ? 1 : -1)

          const stepX = (dirX + perpX) * WANDER_STEP_SIZE
          const stepY = (dirY + perpY) * WANDER_STEP_SIZE

          if (Math.abs(stepX) > 0.5) {
            crab.facingLeft = stepX < 0
          }

          crab.position.x += stepX
          crab.position.y += stepY
          needsUpdate = true
          break
        }

        case 'chasing': {
          if (!crab.target) {
            crab.state = 'idle'
            crab.idleUntil = timestamp + IDLE_PAUSE_MIN
            needsUpdate = true
            break
          }

          // Only move on step intervals
          if (timestamp - crab.lastStepTime < STEP_INTERVAL) break
          crab.lastStepTime = timestamp

          // If tracking a node, update target position
          if (crab.target.nodeId) {
            const trackedNode = layoutedNodes.find((n) => n.id === crab.target!.nodeId)
            if (trackedNode) {
              crab.target.x = trackedNode.position.x + 100
              crab.target.y = trackedNode.position.y + 40
            }
          }

          const dx = crab.target.x - crab.position.x
          const dy = crab.target.y - crab.position.y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance < ATTACK_DISTANCE) {
            // Reached target - attack or idle
            if (Math.random() < ATTACK_CHANCE) {
              crab.state = 'attacking'
              if (timeoutRef.current) clearTimeout(timeoutRef.current)
              timeoutRef.current = setTimeout(() => {
                crab.state = 'idle'
                crab.target = null
                crab.idleUntil = Date.now() + IDLE_PAUSE_MIN
              }, 400)
            } else {
              crab.state = 'idle'
              crab.target = null
              crab.idleUntil = timestamp + IDLE_PAUSE_MIN
            }
            needsUpdate = true
            break
          }

          // Crab scuttles toward target with sideways drift
          const dirX = dx / distance
          const dirY = dy / distance
          const perpX = -dirY * SIDEWAYS_DRIFT * (Math.random() > 0.5 ? 1 : -1)
          const perpY = dirX * SIDEWAYS_DRIFT * (Math.random() > 0.5 ? 1 : -1)

          const stepX = (dirX + perpX) * STEP_SIZE
          const stepY = (dirY + perpY) * STEP_SIZE

          if (Math.abs(stepX) > 0.5) {
            crab.facingLeft = stepX < 0
          }

          crab.position.x += stepX
          crab.position.y += stepY
          needsUpdate = true
          break
        }

        case 'attacking':
        case 'jumping':
          // Time-limited states handled by timeouts
          break
      }

      // Update the node if needed
      if (needsUpdate) {
        setNodes((nds) =>
          nds.map((n) =>
            n.id === CHASER_CRAB_ID
              ? {
                  ...n,
                  position: { ...crab.position },
                  data: {
                    state: crab.state,
                    facingLeft: crab.facingLeft,
                    onClick: handleCrabClick,
                  },
                }
              : n
          )
        )
      }

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [layoutedNodes, setNodes, handleCrabClick])

  // Update layout nodes when they change (preserve chaser + pinned positions)
  useEffect(() => {
    setNodes((nds) => {
      const pinned = pinnedPositions.current
      const mergedNodes = layoutedNodes.map((n) => {
        const pin = pinned.get(n.id)
        return pin ? { ...n, position: pin } : n
      })

      const chaserNode = nds.find((n) => n.id === CHASER_CRAB_ID)
      if (chaserNode) {
        return [...mergedNodes, chaserNode]
      }
      const crab = crabRef.current
      return [
        ...mergedNodes,
        {
          id: CHASER_CRAB_ID,
          type: 'chaserCrab',
          position: crab.position,
          data: {
            state: crab.state,
            facingLeft: crab.facingLeft,
            onClick: handleCrabClick,
          },
          draggable: false,
          selectable: false,
          zIndex: 1000,
        },
      ]
    })
    setEdges(layoutedEdges)
  }, [layoutedNodes, layoutedEdges, setNodes, setEdges, handleCrabClick])

  // Re-organize: clear pinned positions and re-apply layout
  const handleReorganize = useCallback(() => {
    pinnedPositions.current.clear()
    setNodes((nds) => {
      const chaserNode = nds.find((n) => n.id === CHASER_CRAB_ID)
      if (chaserNode) {
        return [...layoutedNodes, chaserNode]
      }
      return [...layoutedNodes]
    })
  }, [layoutedNodes, setNodes])

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.type === 'session') {
        const sessionKey = (node.data as unknown as MonitorSession).key
        onSessionSelect(selectedSession === sessionKey ? null : sessionKey)
      }
    },
    [onSessionSelect, selectedSession]
  )

  return (
    <div className="w-full h-full bg-shell-950 texture-grid relative">
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
        <Background color="#252535" gap={24} size={1} />
        <Controls
          className="bg-shell-900! border-shell-700! shadow-lg! [&>button]:bg-shell-800! [&>button]:border-shell-700! [&>button]:text-gray-300! [&>button:hover]:bg-shell-700! [&>button>svg]:fill-gray-300!"
        />
        <div className="absolute top-2 right-2 z-10 flex gap-1.5">
          <button
            onClick={() => {
              setLayoutDirection((d) => (d === 'LR' ? 'TB' : 'LR'))
              pinnedPositions.current.clear()
            }}
            title={layoutDirection === 'LR' ? 'Stack sessions vertically' : 'Spread sessions horizontally'}
            className="p-1.5 rounded bg-shell-800 border border-shell-700 text-gray-300 hover:bg-shell-700 shadow-lg cursor-pointer"
          >
            {layoutDirection === 'LR' ? (
              <ArrowRightLeft className="w-4 h-4" />
            ) : (
              <ArrowUpDown className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={handleReorganize}
            title="Re-organize layout"
            className="p-1.5 rounded bg-shell-800 border border-shell-700 text-gray-300 hover:bg-shell-700 shadow-lg cursor-pointer"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
        <MiniMap
          nodeColor={(node) => {
            if (node.type === 'crab') return '#ef4444'
            if (node.type === 'chaserCrab') return '#ef4444'
            if (node.type === 'session') return '#98ffc8'
            if (node.type === 'exec') {
              const status = (node.data as unknown as MonitorExecProcess).status
              if (status === 'running') return '#00ffd5'
              if (status === 'failed') return '#ef4444'
              return '#98ffc8'
            }
            return '#52526e'
          }}
          maskColor="rgba(10, 10, 15, 0.8)"
          className="bg-shell-900! border-shell-700!"
          style={{ backgroundColor: '#0a0a0f', width: 100, height: 75 }}
        />
      </ReactFlow>
    </div>
  )
}

// Wrapper that provides ReactFlowProvider
export function ActionGraph(props: ActionGraphProps) {
  return (
    <ReactFlowProvider>
      <ActionGraphInner {...props} />
    </ReactFlowProvider>
  )
}
