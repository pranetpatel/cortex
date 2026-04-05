import React, { useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, Dimensions } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { GraphView } from '../components/GraphView'
import { colors } from '../theme/colors'
import { RootStackParamList, Item, GraphEdge } from '../types'
import { getGraphData } from '../services/database'

type Nav = NativeStackNavigationProp<RootStackParamList>

export function GraphScreen() {
  const nav = useNavigation<Nav>()
  const [items, setItems] = useState<Item[]>([])
  const [edges, setEdges] = useState<GraphEdge[]>([])

  useEffect(() => {
    const { nodes, edges: e } = getGraphData()
    setItems(nodes as Item[])
    setEdges(e.map(edge => ({ source: edge.source_id, target: edge.target_id })))
  }, [])

  function handleNodePress(id: string) {
    const item = items.find(i => i.id === id)
    if (!item) return
    if (item.type === 'clip')  nav.push('ClipDetail',  { id })
    if (item.type === 'note')  nav.push('NoteEditor',  { id })
    if (item.type === 'essay') nav.push('EssayEditor', { id })
  }

  return (
    <View style={styles.screen}>
      <GraphView
        items={items}
        edges={edges}
        onNodePress={handleNodePress}
      />

      {/* Legend */}
      <View style={styles.legend}>
        {[
          { label: 'Clips',  color: colors.accentClip  },
          { label: 'Notes',  color: colors.accentNote  },
          { label: 'Essays', color: colors.accentEssay },
        ].map(({ label, color }) => (
          <View key={label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: color }]} />
            <Text style={styles.legendLabel}>{label}</Text>
          </View>
        ))}
        <Text style={styles.count}>{items.length} nodes</Text>
      </View>

      {items.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Add notes and clips to see your knowledge graph.</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgPrimary },

  legend: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    padding: 14, borderTopWidth: 1, borderColor: colors.border,
    backgroundColor: colors.bgSurface,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot:  { width: 8, height: 8, borderRadius: 4 },
  legendLabel:{ fontSize: 12, color: colors.textSecondary },
  count:      { marginLeft: 'auto', fontSize: 12, color: colors.textMuted },

  empty: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center', alignItems: 'center', pointerEvents: 'none',
  },
  emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center', padding: 32 },
})
