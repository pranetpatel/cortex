import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native'
import { colors } from '../theme/colors'
import { essayHelp } from '../services/ai'

interface Props {
  context: string   // current note/essay content as context
  draft?: string    // essay draft (essay editor only)
}

export function AiPanel({ context, draft = '' }: Props) {
  const [prompt, setPrompt] = useState('')
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)

  async function ask() {
    if (!prompt.trim() || loading) return
    setLoading(true)
    setResponse('')
    try {
      const result = await essayHelp(prompt.trim(), context, draft)
      setResponse(result)
    } finally {
      setLoading(false)
      setPrompt('')
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.wrap}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.heading}>✦ AI Assistant</Text>

      {response ? (
        <ScrollView style={styles.responseBox} showsVerticalScrollIndicator={false}>
          <Text style={styles.responseText}>{response}</Text>
        </ScrollView>
      ) : (
        <View style={styles.emptyHint}>
          <Text style={styles.emptyText}>
            Ask me to expand an argument, suggest structure, or find gaps in your reasoning.
          </Text>
        </View>
      )}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={prompt}
          onChangeText={setPrompt}
          placeholder="Ask the AI…"
          placeholderTextColor={colors.textMuted}
          multiline
          returnKeyType="send"
          onSubmitEditing={ask}
          blurOnSubmit
          editable={!loading}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!prompt.trim() || loading) && styles.sendDisabled]}
          onPress={ask}
          disabled={!prompt.trim() || loading}
        >
          {loading
            ? <ActivityIndicator size="small" color={colors.accentEssay} />
            : <Text style={styles.sendLabel}>↑</Text>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.bgSurface,
    borderLeftWidth: 1,
    borderColor: colors.border,
    padding: 16,
  },
  heading: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.accentEssay,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  responseBox: {
    flex: 1,
    marginBottom: 12,
  },
  responseText: {
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 20,
  },
  emptyHint: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
    textAlign: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: colors.bgInput,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 10,
    padding: 10,
    color: colors.textPrimary,
    fontSize: 13,
    maxHeight: 90,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(179,136,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(179,136,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: {
    opacity: 0.4,
  },
  sendLabel: {
    fontSize: 18,
    color: colors.accentEssay,
    fontWeight: '600',
  },
})
