import React, { useEffect, useRef, useState } from 'react'
import { View, StyleSheet, Dimensions } from 'react-native'
import Svg, { Line, Circle, Text as SvgText, G } from 'react-native-svg'
import { colors } from '../theme/colors'
import { Item, GraphNode, GraphEdge } from '../types'

interface Props {
  items: Item[]
  edges: GraphEdge[]
  onNodePress?: (id: string) => void
}

const NODE_COLORS = {
  clip:  colors.accentClip,
  note:  colors.accentNote,
  essay: colors.accentEssay,
}

// ─── Physics simulation ────────────────────────────────────────────────────────
function initNodes(items: Item[], w: number, h: number): GraphNode[] {
  return items.map((item, i) => ({
    id:    item.id,
    title: item.title,
    type:  item.type,
    x: w / 2 + (Math.random() - 0.5) * w * 0.6,
    y: h / 2 + (Math.random() - 0.5) * h * 0.6,
    vx: 0,
    vy: 0,
  }))
}

function simulateStep(nodes: GraphNode[], edges: GraphEdge[], w: number, h: number): GraphNode[] {
  const k = 180      // repulsion
  const spring = 0.04
  const damping = 0.8
  const next = nodes.map(n => ({ ...n, vx: n.vx, vy: n.vy }))
  const idx = Object.fromEntries(next.map((n, i) => [n.id, i]))

  // Repulsion between all pairs
  for (let i = 0; i < next.length; i++) {
    for (let j = i + 1; j < next.length; j++) {
      const dx = next[i].x - next[j].x
      const dy = next[i].y - next[j].y
      const dist = Math.sqrt(dx * dx + dy * dy) || 1
      const force = k * k / dist
      const fx = (dx / dist) * force * 0.1
      const fy = (dy / dist) * force * 0.1
      next[i].vx += fx; next[i].vy += fy
      next[j].vx -= fx; next[j].vy -= fy
    }
  }

  // Spring force along edges
  for (const e of edges) {
    const si = idx[e.source], ti = idx[e.target]
    if (si == null || ti == null) continue
    const dx = next[ti].x - next[si].x
    const dy = next[ti].y - next[si].y
    const dist = Math.sqrt(dx * dx + dy * dy) || 1
    const ideal = 120
    const f = (dist - ideal) * spring
    const fx = (dx / dist) * f
    const fy = (dy / dist) * f
    next[si].vx += fx; next[si].vy += fy
    next[ti].vx -= fx; next[ti].vy -= fy
  }

  // Gravity toward center
  const cx = w / 2, cy = h / 2
  for (const n of next) {
    n.vx += (cx - n.x) * 0.003
    n.vy += (cy - n.y) * 0.003
  }

  // Apply velocity + damp + clamp
  for (const n of next) {
    n.vx *= damping; n.vy *= damping
    n.x = Math.max(20, Math.min(w - 20, n.x + n.vx))
    n.y = Math.max(20, Math.min(h - 20, n.y + n.vy))
  }

  return next
}

// ─── Component ────────────────────────────────────────────────────────────────
export function GraphView({ items, edges, onNodePress }: Props) {
  const { width } = Dimensions.get('window')
  const height = 400
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const frameRef = useRef(0)

  useEffect(() => {
    if (items.length === 0) { setNodes([]); return }
    const initial = initNodes(items, width, height)
    setNodes(initial)
    let n = initial
    let frame = 0

    const id = setInterval(() => {
      n = simulateStep(n, edges, width, height)
      setNodes([...n])
      if (++frame >= 200) clearInterval(id)
    }, 16)

    return () => clearInterval(id)
  }, [items.map(i => i.id).join(',')])

  if (nodes.length === 0) {
    return (
      <View style={[styles.empty, { width, height }]}>
        <SvgText style={{ color: colors.textMuted }}>No items yet</SvgText>
      </View>
    )
  }

  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]))

  return (
    <Svg width={width} height={height} style={styles.svg}>
      {/* Edges */}
      {edges.map((e, i) => {
        const s = nodeMap[e.source], t = nodeMap[e.target]
        if (!s || !t) return null
        return (
          <Line
            key={i}
            x1={s.x} y1={s.y} x2={t.x} y2={t.y}
            stroke="rgba(255,255,255,0.12)"
            strokeWidth={1}
          />
        )
      })}

      {/* Nodes */}
      {nodes.map(n => (
        <G key={n.id} onPress={() => onNodePress?.(n.id)}>
          <Circle
            cx={n.x} cy={n.y} r={8}
            fill={NODE_COLORS[n.type]}
            fillOpacity={0.85}
          />
          <SvgText
            x={n.x} y={n.y + 20}
            textAnchor="middle"
            fontSize={9}
            fill="rgba(255,255,255,0.55)"
          >
            {n.title.length > 14 ? n.title.slice(0, 13) + '…' : n.title}
          </SvgText>
        </G>
      ))}
    </Svg>
  )
}

const styles = StyleSheet.create({
  svg: {
    backgroundColor: colors.bgPrimary,
  },
  empty: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bgPrimary,
  },
})
