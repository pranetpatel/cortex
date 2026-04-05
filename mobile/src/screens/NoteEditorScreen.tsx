import React, { useState, useEffect, useLayoutEffect } from 'react'
import {
  View, TextInput, Text, TouchableOpacity, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform, Alert,
} from 'react-native'
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native'
import { colors } from '../theme/colors'
import { TagPills } from '../components/TagPills'
import { WikiLinkText } from '../components/WikiLinkText'
import { RootStackParamList } from '../types'
import { getBacklinks, uid } from '../services/database'
import { useItem, useItems } from '../hooks/useItems'
import { Item } from '../types'

type Route = RouteProp<RootStackParamList, 'NoteEditor'>

type Mode = 'edit' | 'preview'

export function NoteEditorScreen() {
  const { params } = useRoute<Route>()
  const nav = useNavigation()
  const { save } = useItems('note')

  const isNew = !params.id
  const { item, update } = useItem(params.id ?? '')

  const [title,   setTitle]   = useState(params.title ?? 'Untitled')
  const [content, setContent] = useState('')
  const [tags,    setTags]    = useState('')
  const [mode,    setMode]    = useState<Mode>('edit')
  const [backlinks, setBacklinks] = useState<Item[]>([])
  const [savedId, setSavedId] = useState<string | null>(params.id ?? null)

  // Load existing item
  useEffect(() => {
    if (item) {
      setTitle(item.title)
      setContent(item.content)
      setTags((item.tags ?? []).join(', '))
    }
    if (params.id) {
      setBacklinks(getBacklinks(params.id))
    }
  }, [item?.id])

  useLayoutEffect(() => {
    nav.setOptions({
      title: isNew ? 'New Note' : 'Edit Note',
      headerRight: () => (
        <TouchableOpacity onPress={() => setMode(m => m === 'edit' ? 'preview' : 'edit')}>
          <Text style={styles.headerBtn}>{mode === 'edit' ? 'Preview' : 'Edit'}</Text>
        </TouchableOpacity>
      ),
    })
  }, [mode])

  function handleSave() {
    const id = savedId ?? uid()
    const tagArr = tags.split(',').map(t => t.trim()).filter(Boolean)
    if (savedId && item) {
      update({ title, content, tags: tagArr })
    } else {
      save({ id, type: 'note', title, content, tags: tagArr, created_at: Date.now(), updated_at: Date.now() })
      setSavedId(id)
    }
    nav.goBack()
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Title */}
      <TextInput
        style={styles.titleInput}
        value={title}
        onChangeText={setTitle}
        placeholder="Title"
        placeholderTextColor={colors.textMuted}
        returnKeyType="next"
      />

      {/* Tags */}
      <TextInput
        style={styles.tagsInput}
        value={tags}
        onChangeText={setTags}
        placeholder="Tags (comma-separated)"
        placeholderTextColor={colors.textMuted}
        returnKeyType="next"
      />

      {mode === 'edit' ? (
        <TextInput
          style={styles.editor}
          value={content}
          onChangeText={setContent}
          placeholder={"Write your note…\nUse [[Note Title]] to link to other notes."}
          placeholderTextColor={colors.textMuted}
          multiline
          textAlignVertical="top"
          autoFocus={isNew}
        />
      ) : (
        <ScrollView style={styles.preview} contentContainerStyle={styles.previewContent}>
          <WikiLinkText content={content} />

          {backlinks.length > 0 && (
            <View style={styles.backlinksSection}>
              <Text style={styles.backlinksLabel}>LINKED FROM</Text>
              {backlinks.map(bl => (
                <Text
                  key={bl.id}
                  style={styles.backlinkItem}
                  onPress={() => nav.push('NoteEditor' as never, { id: bl.id } as never)}
                >
                  ← {bl.title}
                </Text>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
        <Text style={styles.saveBtnLabel}>Save Note</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgPrimary },

  titleInput: {
    fontSize: 20, fontWeight: '700', color: colors.textPrimary,
    paddingHorizontal: 18, paddingTop: 18, paddingBottom: 8,
    borderBottomWidth: 1, borderColor: colors.border,
  },
  tagsInput: {
    fontSize: 12, color: colors.textSecondary,
    paddingHorizontal: 18, paddingVertical: 8,
    borderBottomWidth: 1, borderColor: colors.border,
  },

  editor: {
    flex: 1,
    padding: 18,
    fontSize: 15, color: colors.textPrimary, lineHeight: 24,
  },

  preview: { flex: 1 },
  previewContent: { padding: 18, paddingBottom: 40 },

  backlinksSection: {
    marginTop: 32, paddingTop: 16,
    borderTopWidth: 1, borderColor: colors.border,
  },
  backlinksLabel: {
    fontSize: 10, fontWeight: '700', letterSpacing: 0.1,
    color: colors.textMuted, marginBottom: 8,
  },
  backlinkItem: {
    fontSize: 14, color: colors.accentNote,
    paddingVertical: 4, textDecorationLine: 'underline',
  },

  saveBtn: {
    margin: 16, padding: 14, borderRadius: 12,
    backgroundColor: 'rgba(110,198,247,0.15)',
    borderWidth: 1, borderColor: 'rgba(110,198,247,0.3)',
    alignItems: 'center',
  },
  saveBtnLabel: { color: colors.accentNote, fontSize: 15, fontWeight: '700' },
  headerBtn: { color: colors.accentNote, fontSize: 14, fontWeight: '600', marginRight: 4 },
})
