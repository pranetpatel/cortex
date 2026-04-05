import React from 'react'
import { Text, StyleSheet } from 'react-native'
import { colors } from '../theme/colors'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RootStackParamList } from '../types'
import { searchItems } from '../services/database'

interface Props {
  content: string
  style?: object
}

type Nav = NativeStackNavigationProp<RootStackParamList>

// Splits content into plain text and [[wiki link]] segments
function parseSegments(text: string): { type: 'text' | 'link'; value: string }[] {
  const segments: { type: 'text' | 'link'; value: string }[] = []
  const re = /\[\[([^\]]+)\]\]/g
  let last = 0
  let m: RegExpExecArray | null

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) {
      segments.push({ type: 'text', value: text.slice(last, m.index) })
    }
    segments.push({ type: 'link', value: m[1] })
    last = re.lastIndex
  }
  if (last < text.length) {
    segments.push({ type: 'text', value: text.slice(last) })
  }
  return segments
}

export function WikiLinkText({ content, style }: Props) {
  const nav = useNavigation<Nav>()

  function handleLinkPress(title: string) {
    const results = searchItems(title)
    const match   = results.find(i => i.title.toLowerCase() === title.toLowerCase())
    if (match) {
      nav.push('NoteEditor', { id: match.id })
    } else {
      // Create a new note with this title
      nav.push('NoteEditor', { title })
    }
  }

  const segments = parseSegments(content)

  return (
    <Text style={[styles.base, style]}>
      {segments.map((seg, i) =>
        seg.type === 'link' ? (
          <Text
            key={i}
            style={styles.link}
            onPress={() => handleLinkPress(seg.value)}
          >
            {seg.value}
          </Text>
        ) : (
          <Text key={i}>{seg.value}</Text>
        )
      )}
    </Text>
  )
}

const styles = StyleSheet.create({
  base: {
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 22,
  },
  link: {
    color: colors.accentNote,
    textDecorationLine: 'underline',
  },
})
