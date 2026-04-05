import { useState, useEffect, useRef } from 'react'

function parseWikiLinks(text) {
  const links = []
  const regex = /\[\[([^\]]+)\]\]/g
  let m
  while ((m = regex.exec(text)) !== null) links.push(m[1])
  return links
}

const TYPE_COLORS = { clip: '#f59e42', note: '#6ec6f7', essay: '#b388ff' }

export default function GraphView({ items, onSelect }) {
  const svgRef = useRef(null)
  const nodesRef = useRef([])
  const [nodes, setNodes] = useState([])
  const [edges, setEdges] = useState([])
  const [dragging, setDragging] = useState(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [hoveredNode, setHoveredNode] = useState(null)
  const animRef = useRef(null)

  const W = 700, H = 500

  // Build graph from items
  useEffect(() => {
    const nodeMap = {}
    const edgeList = []

    items.forEach((item, i) => {
      const angle = (i / items.length) * Math.PI * 2
      const r = Math.min(W, H) * 0.32
      nodeMap[item.id] = {
        id: item.id,
        label: (item.title || 'Untitled').substring(0, 24),
        x: W / 2 + Math.cos(angle) * r + (Math.random() - 0.5) * 60,
        y: H / 2 + Math.sin(angle) * r + (Math.random() - 0.5) * 60,
        type: item.type,
        vx: 0, vy: 0,
        connections: 0,
      }
    })

    items.forEach(item => {
      const links = parseWikiLinks(item.content || '')
      links.forEach(linkTitle => {
        const target = items.find(n => n.title?.toLowerCase() === linkTitle.toLowerCase())
        if (target && nodeMap[target.id]) {
          edgeList.push({ from: item.id, to: target.id, weak: false })
          nodeMap[item.id].connections++
          nodeMap[target.id].connections++
        }
      })
      ;(item.tags || []).forEach(tag => {
        items.forEach(other => {
          if (other.id === item.id) return
          if (!(other.tags || []).includes(tag)) return
          const key = [item.id, other.id].sort().join('|')
          if (!edgeList.find(e => [e.from, e.to].sort().join('|') === key)) {
            edgeList.push({ from: item.id, to: other.id, weak: true })
          }
        })
      })
    })

    const nodeList = Object.values(nodeMap)
    nodesRef.current = nodeList
    setNodes(nodeList)
    setEdges(edgeList)
  }, [items])

  // Force-directed simulation
  useEffect(() => {
    let frame = 0
    const simulate = () => {
      const ns = nodesRef.current
      if (!ns.length) return

      // Damping
      ns.forEach(n => { n.vx *= 0.88; n.vy *= 0.88 })

      // Repulsion
      for (let i = 0; i < ns.length; i++) {
        for (let j = i + 1; j < ns.length; j++) {
          const dx = ns[j].x - ns[i].x
          const dy = ns[j].y - ns[i].y
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          const force = 900 / (dist * dist)
          ns[i].vx -= (dx / dist) * force
          ns[i].vy -= (dy / dist) * force
          ns[j].vx += (dx / dist) * force
          ns[j].vy += (dy / dist) * force
        }
      }

      // Spring attraction along edges
      edges.forEach(e => {
        const a = ns.find(n => n.id === e.from)
        const b = ns.find(n => n.id === e.to)
        if (!a || !b) return
        const dx = b.x - a.x
        const dy = b.y - a.y
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        const restLen = e.weak ? 180 : 120
        const force = (dist - restLen) * 0.018
        a.vx += (dx / dist) * force
        a.vy += (dy / dist) * force
        b.vx -= (dx / dist) * force
        b.vy -= (dy / dist) * force
      })

      // Center gravity
      ns.forEach(n => {
        n.vx += (W / 2 - n.x) * 0.001
        n.vy += (H / 2 - n.y) * 0.001
      })

      // Integrate (skip dragged node)
      ns.forEach(n => {
        if (n.id !== dragging) {
          n.x = Math.max(24, Math.min(W - 24, n.x + n.vx))
          n.y = Math.max(24, Math.min(H - 24, n.y + n.vy))
        }
      })

      setNodes([...ns])
      frame++
      if (frame < 300) animRef.current = requestAnimationFrame(simulate)
    }

    animRef.current = requestAnimationFrame(simulate)
    return () => cancelAnimationFrame(animRef.current)
  }, [edges, dragging])

  const getSVGCoords = (e) => {
    const rect = svgRef.current.getBoundingClientRect()
    const scaleX = W / rect.width
    const scaleY = H / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  const handleMouseDown = (e, nodeId) => {
    e.stopPropagation()
    const node = nodesRef.current.find(n => n.id === nodeId)
    if (!node) return
    const { x, y } = getSVGCoords(e)
    setDragging(nodeId)
    setDragOffset({ x: x - node.x, y: y - node.y })
    // restart simulation
    cancelAnimationFrame(animRef.current)
  }

  const handleMouseMove = (e) => {
    const { x: mx, y: my } = getSVGCoords(e)
    if (dragging) {
      const node = nodesRef.current.find(n => n.id === dragging)
      if (node) {
        node.x = Math.max(24, Math.min(W - 24, mx - dragOffset.x))
        node.y = Math.max(24, Math.min(H - 24, my - dragOffset.y))
        setNodes([...nodesRef.current])
      }
      return
    }
    const hovered = nodesRef.current.find(n =>
      Math.sqrt((n.x - mx) ** 2 + (n.y - my) ** 2) < 20
    )
    setHoveredNode(hovered?.id || null)
  }

  const handleMouseUp = () => setDragging(null)

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', height: '100%', cursor: dragging ? 'grabbing' : 'default' }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <defs>
        <filter id="node-glow">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* Edges */}
      {edges.map((e, i) => {
        const a = nodes.find(n => n.id === e.from)
        const b = nodes.find(n => n.id === e.to)
        if (!a || !b) return null
        return (
          <line key={i}
            x1={a.x} y1={a.y} x2={b.x} y2={b.y}
            stroke={e.weak ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.18)'}
            strokeWidth={e.weak ? 1 : 1.5}
            strokeDasharray={e.weak ? '4 4' : 'none'}
          />
        )
      })}

      {/* Nodes */}
      {nodes.map(n => {
        const isHovered = hoveredNode === n.id
        const r = 10 + n.connections * 3
        return (
          <g key={n.id}
            transform={`translate(${n.x},${n.y})`}
            onMouseDown={e => handleMouseDown(e, n.id)}
            onClick={() => onSelect?.(n.id)}
            style={{ cursor: 'pointer' }}
          >
            <circle
              r={r}
              fill={TYPE_COLORS[n.type] || '#888'}
              opacity={isHovered ? 1 : 0.72}
              filter={isHovered ? 'url(#node-glow)' : 'none'}
              style={{ transition: 'opacity 0.15s' }}
            />
            <text
              y={r + 14}
              textAnchor="middle"
              fill="rgba(255,255,255,0.65)"
              fontSize="10"
              fontFamily="DM Sans, system-ui"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {n.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
