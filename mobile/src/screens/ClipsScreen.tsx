import React, { useState } from 'react'
import {
  View, FlatList, TouchableOpacity, Text, Modal,
  TextInput, Alert, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useItems } from '../hooks/useItems'
import { ClipCard } from '../components/ClipCard'
import { SearchBar } from '../components/SearchBar'
import { colors } from '../theme/colors'
import { RootStackParamList } from '../types'
import { searchItems } from '../services/database'
import { uid } from '../services/database'

type Nav = NativeStackNavigationProp<RootStackParamList>

export function ClipsScreen() {
  const nav = useNavigation<Nav>()
  const { items, loading, reload, save, remove } = useItems('clip')
  const [query, setQuery]     = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [newTitle, setNewTitle]   = useState('')
  const [newContent, setNewContent] = useState('')
  const [newTags, setNewTags]     = useState('')

  const displayed = query.trim()
    ? searchItems(query).filter(i => i.type === 'clip')
    : items

  function handleAdd() {
    if (!newContent.trim()) return
    save({
      id: uid(),
      type: 'clip',
      title: newTitle.trim() || 'Web Clip',
      content: newContent.trim(),
      tags: newTags.split(',').map(t => t.trim()).filter(Boolean),
      created_at: Date.now(),
      updated_at: Date.now(),
    })
    setNewTitle(''); setNewContent(''); setNewTags('')
    setShowAdd(false)
  }

  function confirmDelete(id: string) {
    Alert.alert('Delete clip', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => remove(id) },
    ])
  }

  return (
    <View style={styles.screen}>
      <SearchBar
        value={query}
        onChangeText={setQuery}
        placeholder="Search clips…"
        style={styles.search}
      />

      <FlatList
        data={displayed}
        keyExtractor={i => i.id}
        renderItem={({ item }) => (
          <ClipCard
            item={item}
            onPress={() => nav.push('ClipDetail', { id: item.id })}
            onLongPress={() => confirmDelete(item.id)}
          />
        )}
        contentContainerStyle={styles.list}
        onRefresh={reload}
        refreshing={loading}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {query ? 'No results.' : 'No clips yet.\nUse the + button or the browser extension.'}
          </Text>
        }
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowAdd(true)}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>

      {/* Add modal */}
      <Modal visible={showAdd} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>New Clip</Text>

            <TextInput
              style={styles.field}
              placeholder="Title (optional)"
              placeholderTextColor={colors.textMuted}
              value={newTitle}
              onChangeText={setNewTitle}
            />
            <TextInput
              style={[styles.field, styles.fieldMulti]}
              placeholder="Paste text to clip…"
              placeholderTextColor={colors.textMuted}
              value={newContent}
              onChangeText={setNewContent}
              multiline
              autoFocus
            />
            <TextInput
              style={styles.field}
              placeholder="Tags (comma-separated)"
              placeholderTextColor={colors.textMuted}
              value={newTags}
              onChangeText={setNewTags}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.btnGhost} onPress={() => setShowAdd(false)}>
                <Text style={styles.btnGhostLabel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnAmber} onPress={handleAdd}>
                <Text style={styles.btnAmberLabel}>Save Clip</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    backgroundColor: colors.accentClip,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabIcon: { fontSize: 28, color: '#0e0e11', fontWeight: '600', lineHeight: 34 },

  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet: {
    backgroundColor: colors.bgSurface,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 22, paddingBottom: 36,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary, marginBottom: 16 },

  field: {
    backgroundColor: colors.bgInput, borderWidth: 1, borderColor: colors.borderStrong,
    borderRadius: 10, padding: 11, color: colors.textPrimary, fontSize: 14,
    marginBottom: 10,
  },
  fieldMulti: { height: 100, textAlignVertical: 'top' },

  modalButtons: { flexDirection: 'row', gap: 10, marginTop: 6 },
  btnGhost: {
    flex: 1, padding: 12, borderRadius: 10,
    borderWidth: 1, borderColor: colors.borderStrong,
    alignItems: 'center',
  },
  btnGhostLabel: { color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  btnAmber: {
    flex: 1, padding: 12, borderRadius: 10,
    backgroundColor: 'rgba(245,158,66,0.15)',
    borderWidth: 1, borderColor: 'rgba(245,158,66,0.3)',
    alignItems: 'center',
  },
  btnAmberLabel: { color: colors.accentClip, fontSize: 14, fontWeight: '600' },
})
