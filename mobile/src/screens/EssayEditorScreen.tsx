import React, { useState, useEffect, useLayoutEffect } from 'react'
import {
  View, TextInput, Text, TouchableOpacity, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform, Dimensions,
} from 'react-native'
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native'
import { colors } from '../theme/colors'
import { AiPanel } from '../components/AiPanel'
import { PencilCanvas } from '../components/PencilCanvas'
import { RootStackParamList } from '../types'
import { useItem, useItems } from '../hooks/useItems'
import { usePencil } from '../hooks/usePencil'
import { uid } from '../services/database'
import { isPencilSupported, PencilTool } from '../services/pencil'

type Route = RouteProp<RootStackParamList, 'EssayEditor'>
type InputMode = 'keyboard' | 'pencil'

const { width } = Dimensions.get('window')
const isIPad = Platform.OS === 'ios' && (Platform as any).isPad

export function EssayEditorScreen() {
  const { params } = useRoute<Route>()
  const nav = useNavigation()
  const { save } = useItems('essay')
  const { item, update } = useItem(params.id ?? '')

  const [title,   setTitle]   = useState(params.title ?? 'Untitled Essay')
  const [content, setContent] = useState('')
  const [tags,    setTags]    = useState('')
  const [inputMode, setInputMode] = useState<InputMode>('keyboard')
  const [showAI, setShowAI] = useState(isIPad)
  const [savedId, setSavedId] = useState<string | null>(params.id ?? null)

  const pencil = usePencil()

  useEffect(() => {
    if (item) {
      setTitle(item.title)
      setContent(item.content)
      setTags((item.tags ?? []).join(', '))
    }
  }, [item?.id])

  // When handwriting is recognized, append to content
  useEffect(() => {
    if (pencil.recognizedText) {
      setContent(prev => prev ? prev + '\n' + pencil.recognizedText : pencil.recognizedText)
      pencil.setRecognizedText('')
    }
  }, [pencil.recognizedText])

  useLayoutEffect(() => {
    nav.setOptions({
      title: title || 'Essay',
      headerRight: () => (
        <View style={{ flexDirection: 'row', gap: 14 }}>
          {isPencilSupported && (
            <TouchableOpacity onPress={() => setInputMode(m => m === 'keyboard' ? 'pencil' : 'keyboard')}>
              <Text style={styles.headerBtn}>{inputMode === 'keyboard' ? '✏️' : '⌨️'}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => setShowAI(a => !a)}>
            <Text style={[styles.headerBtn, showAI && { color: colors.accentEssay }]}>✦</Text>
          </TouchableOpacity>
        </View>
      ),
    })
  }, [inputMode, showAI, title])

  function handleSave() {
    const id = savedId ?? uid()
    const tagArr = tags.split(',').map(t => t.trim()).filter(Boolean)
    if (savedId && item) {
      update({ title, content, tags: tagArr })
    } else {
      save({ id, type: 'essay', title, content, tags: tagArr, created_at: Date.now(), updated_at: Date.now() })
      setSavedId(id)
    }
    nav.goBack()
  }

  const editorPane = (
    <KeyboardAvoidingView
      style={styles.editorPane}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Title */}
      <TextInput
        style={styles.titleInput}
        value={title}
        onChangeText={setTitle}
        placeholder="Essay title"
        placeholderTextColor={colors.textMuted}
      />

      {/* Tags */}
      <TextInput
        style={styles.tagsInput}
        value={tags}
        onChangeText={setTags}
        placeholder="Tags (comma-separated)"
        placeholderTextColor={colors.textMuted}
      />

      {inputMode === 'keyboard' ? (
        <TextInput
          style={styles.essayInput}
          value={content}
          onChangeText={setContent}
          placeholder="Start writing your essay…"
          placeholderTextColor={colors.textMuted}
          multiline
          textAlignVertical="top"
          autoFocus={!params.id}
        />
      ) : (
        <View style={styles.pencilArea}>
          {/* Pencil toolbar */}
          <View style={styles.pencilToolbar}>
            {(['pen', 'pencil', 'marker', 'eraser'] as PencilTool[]).map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.toolBtn, pencil.tool === t && styles.toolBtnActive]}
                onPress={() => pencil.setTool(t)}
              >
                <Text style={styles.toolBtnLabel}>{t[0].toUpperCase()}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.toolBtn} onPress={pencil.undo}>
              <Text style={styles.toolBtnLabel}>↩</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.toolBtn} onPress={pencil.redo}>
              <Text style={styles.toolBtnLabel}>↪</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.toolBtn, styles.recognizeBtn]} onPress={pencil.recognize}>
              <Text style={styles.recognizeBtnLabel}>Convert →</Text>
            </TouchableOpacity>
          </View>

          <PencilCanvas
            ref={pencil.canvasRef}
            pencilOnly={false}
            onTextRecognized={pencil.appendText}
            style={styles.canvas}
          />
        </View>
      )}

      <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
        <Text style={styles.saveBtnLabel}>Save Essay</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  )

  if (isIPad && showAI) {
    return (
      <View style={styles.splitView}>
        <View style={styles.splitLeft}>{editorPane}</View>
        <View style={styles.splitRight}>
          <AiPanel context={content} draft={content} />
        </View>
      </View>
    )
  }

  return (
    <View style={styles.screen}>
      {editorPane}
      {showAI && !isIPad && (
        <View style={styles.aiBottomSheet}>
          <AiPanel context={content} draft={content} />
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgPrimary },

  titleInput: {
    fontSize: 22, fontWeight: '700', color: colors.textPrimary,
    paddingHorizontal: 18, paddingTop: 18, paddingBottom: 8,
    fontFamily: 'Georgia',
  },
  tagsInput: {
    fontSize: 12, color: colors.textSecondary,
    paddingHorizontal: 18, paddingVertical: 6,
    borderBottomWidth: 1, borderColor: colors.border,
  },
  editorPane: { flex: 1 },
  essayInput: {
    flex: 1, padding: 18,
    fontSize: 16, color: colors.textPrimary, lineHeight: 28,
    fontFamily: 'Georgia',
    textAlignVertical: 'top',
  },

  pencilArea: { flex: 1 },
  pencilToolbar: {
    flexDirection: 'row', gap: 6, padding: 10,
    borderBottomWidth: 1, borderColor: colors.border,
    backgroundColor: colors.bgSurface,
  },
  toolBtn: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 7,
    backgroundColor: colors.bgInput, borderWidth: 1, borderColor: colors.border,
  },
  toolBtnActive: {
    backgroundColor: 'rgba(245,158,66,0.15)', borderColor: 'rgba(245,158,66,0.3)',
  },
  toolBtnLabel: { fontSize: 12, color: colors.textSecondary },
  recognizeBtn: {
    backgroundColor: 'rgba(179,136,255,0.12)', borderColor: 'rgba(179,136,255,0.25)',
    marginLeft: 'auto',
  },
  recognizeBtnLabel: { fontSize: 12, color: colors.accentEssay, fontWeight: '600' },
  canvas: { flex: 1 },

  saveBtn: {
    margin: 16, padding: 14, borderRadius: 12,
    backgroundColor: 'rgba(179,136,255,0.12)',
    borderWidth: 1, borderColor: 'rgba(179,136,255,0.25)',
    alignItems: 'center',
  },
  saveBtnLabel: { color: colors.accentEssay, fontSize: 15, fontWeight: '700' },

  // iPad split view
  splitView: { flex: 1, flexDirection: 'row' },
  splitLeft:  { flex: 6 },
  splitRight: { flex: 4, borderLeftWidth: 1, borderColor: colors.border },

  // Phone AI bottom sheet
  aiBottomSheet: {
    height: 260, borderTopWidth: 1, borderColor: colors.border,
  },

  headerBtn: { fontSize: 18, color: colors.textSecondary },
})
