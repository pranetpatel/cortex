import React, { useState } from 'react'
import { View, FlatList, TouchableOpacity, Text, StyleSheet, Alert } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useItems } from '../hooks/useItems'
import { colors } from '../theme/colors'
import { RootStackParamList, Item } from '../types'
import { TagPills } from '../components/TagPills'
import { uid } from '../services/database'

type Nav = NativeStackNavigationProp<RootStackParamList>

function EssayCard({ item, onPress, onDelete }: { item: Item; onPress: () => void; onDelete: () => void }) {
  const preview = item.content.slice(0, 120)
  const wordCount = item.content.split(/\s+/).filter(Boolean).length

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} onLongPress={onDelete} activeOpacity={0.75}>
      <Text style={styles.cardTitle}>{item.title}</Text>
      {preview ? <Text style={styles.cardPreview} numberOfLines={2}>{preview}</Text> : null}
      <View style={styles.cardMeta}>
        <Text style={styles.metaText}>{wordCount} words</Text>
        <Text style={styles.metaText}>
          {new Date(item.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </Text>
      </View>
      {item.tags && item.tags.length > 0 && (
        <TagPills tags={item.tags} accent={colors.accentEssay} style={{ marginTop: 8 }} />
      )}
    </TouchableOpacity>
  )
}

export function EssayScreen() {
  const nav = useNavigation<Nav>()
  const { items, loading, reload, save, remove } = useItems('essay')

  function confirmDelete(id: string) {
    Alert.alert('Delete essay', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => remove(id) },
    ])
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        renderItem={({ item }) => (
          <EssayCard
            item={item}
            onPress={() => nav.push('EssayEditor', { id: item.id })}
            onDelete={() => confirmDelete(item.id)}
          />
        )}
        contentContainerStyle={styles.list}
        onRefresh={reload}
        refreshing={loading}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {'No essays yet.\nTap + to start writing.'}
          </Text>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => nav.push('EssayEditor', {})}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgPrimary },
  list:   { padding: 14, paddingBottom: 90 },
  empty:  { textAlign: 'center', color: colors.textMuted, marginTop: 60, lineHeight: 22, fontSize: 14 },

  card: {
    backgroundColor: colors.bgSurface,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: 12, padding: 16, marginBottom: 10,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 5 },
  cardPreview: { fontSize: 13, color: colors.textSecondary, lineHeight: 20, marginBottom: 8 },
  cardMeta: { flexDirection: 'row', gap: 14 },
  metaText: { fontSize: 11, color: colors.textMuted },

  fab: {
    position: 'absolute', bottom: 28, right: 24,
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: colors.accentEssay,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabIcon: { fontSize: 28, color: '#0e0e11', fontWeight: '600', lineHeight: 34 },
})
