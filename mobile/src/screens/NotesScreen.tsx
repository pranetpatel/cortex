import React, { useState } from 'react'
import {
  View, FlatList, TouchableOpacity, Text, StyleSheet, Alert,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useItems } from '../hooks/useItems'
import { NoteCard } from '../components/NoteCard'
import { SearchBar } from '../components/SearchBar'
import { colors } from '../theme/colors'
import { RootStackParamList } from '../types'
import { searchItems } from '../services/database'

type Nav = NativeStackNavigationProp<RootStackParamList>

export function NotesScreen() {
  const nav = useNavigation<Nav>()
  const { items, loading, reload, remove } = useItems('note')
  const [query, setQuery] = useState('')

  const displayed = query.trim()
    ? searchItems(query).filter(i => i.type === 'note')
    : items

  function confirmDelete(id: string) {
    Alert.alert('Delete note', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => remove(id) },
    ])
  }

  return (
    <View style={styles.screen}>
      <SearchBar
        value={query}
        onChangeText={setQuery}
        placeholder="Search notes…"
        style={styles.search}
      />
      <FlatList
        data={displayed}
        keyExtractor={i => i.id}
        renderItem={({ item }) => (
          <NoteCard
            item={item}
            onPress={() => nav.push('NoteEditor', { id: item.id })}
          />
        )}
        contentContainerStyle={styles.list}
        onRefresh={reload}
        refreshing={loading}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {query ? 'No results.' : 'No notes yet.\nTap + to create one.'}
          </Text>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => nav.push('NoteEditor', {})}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgPrimary },
  search: { margin: 14, marginBottom: 4 },
  list:   { paddingHorizontal: 14, paddingBottom: 90 },
  empty:  { textAlign: 'center', color: colors.textMuted, marginTop: 60, lineHeight: 22, fontSize: 14 },
  fab: {
    position: 'absolute', bottom: 28, right: 24,
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: colors.accentNote,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabIcon: { fontSize: 28, color: '#0e0e11', fontWeight: '600', lineHeight: 34 },
})
