import React, { useState, useRef, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native'
import { colors } from '../theme/colors'
import { ChatMessage } from '../types'
import { chat } from '../services/ai'
import { getItems } from '../services/database'
import { uid } from '../services/database'

export function ChatScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const listRef = useRef<FlatList>(null)

  function getContext(): string {
    const items = getItems()
    return items
      .slice(0, 40)
      .map(i => `[${i.type}] ${i.title}\n${i.content.slice(0, 400)}`)
      .join('\n\n---\n\n')
  }

  async function send() {
    const q = input.trim()
    if (!q || loading) return

    const userMsg: ChatMessage = { id: uid(), role: 'user', content: q, timestamp: Date.now() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    const assistantId = uid()
    let full = ''

    setMessages(prev => [
      ...prev,
      { id: assistantId, role: 'assistant', content: '', timestamp: Date.now() },
    ])

    try {
      await chat(q, getContext(), (delta) => {
        full += delta
        setMessages(prev =>
          prev.map(m => m.id === assistantId ? { ...m, content: full } : m)
        )
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100)
    }
  }, [messages.length])

  function renderMessage({ item }: { item: ChatMessage }) {
    const isUser = item.role === 'user'
    return (
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.aiBubble]}>
        {!isUser && <Text style={styles.aiLabel}>✦ Cortex AI</Text>}
        <Text style={[styles.bubbleText, isUser && styles.userText]}>
          {item.content || (loading ? '…' : '')}
        </Text>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={m => m.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>✦</Text>
            <Text style={styles.emptyTitle}>Ask your knowledge base</Text>
            <Text style={styles.emptyText}>
              I have access to all your clips, notes, and essays.
            </Text>
          </View>
        }
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Ask anything about your notes…"
          placeholderTextColor={colors.textMuted}
          multiline
          returnKeyType="send"
          onSubmitEditing={send}
          blurOnSubmit
          editable={!loading}
          maxLength={2000}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || loading) && styles.sendDisabled]}
          onPress={send}
          disabled={!input.trim() || loading}
        >
          {loading
            ? <ActivityIndicator size="small" color={colors.accentEssay} />
            : <Text style={styles.sendIcon}>↑</Text>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bgPrimary },
  list:   { padding: 14, paddingBottom: 10, flexGrow: 1 },

  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyIcon:  { fontSize: 32, color: colors.accentEssay },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  emptyText:  { fontSize: 13, color: colors.textMuted, textAlign: 'center', paddingHorizontal: 32 },

  bubble: {
    maxWidth: '82%', borderRadius: 14, padding: 12, marginBottom: 10,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(245,158,66,0.12)',
    borderWidth: 1, borderColor: 'rgba(245,158,66,0.22)',
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.bgSurface,
    borderWidth: 1, borderColor: colors.border,
  },
  aiLabel: { fontSize: 10, fontWeight: '700', color: colors.accentEssay, marginBottom: 4 },
  bubbleText: { fontSize: 14, color: colors.textPrimary, lineHeight: 21 },
  userText:   { color: colors.textPrimary },

  inputRow: {
    flexDirection: 'row', gap: 10, padding: 12,
    borderTopWidth: 1, borderColor: colors.border,
    backgroundColor: colors.bgSurface,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1, backgroundColor: colors.bgInput,
    borderWidth: 1, borderColor: colors.borderStrong,
    borderRadius: 10, padding: 10,
    color: colors.textPrimary, fontSize: 14, maxHeight: 100,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: 11,
    backgroundColor: 'rgba(179,136,255,0.14)',
    borderWidth: 1, borderColor: 'rgba(179,136,255,0.28)',
    alignItems: 'center', justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.4 },
  sendIcon: { fontSize: 20, color: colors.accentEssay, fontWeight: '700' },
})
