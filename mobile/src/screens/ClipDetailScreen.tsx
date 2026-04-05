import React, { useEffect } from 'react'
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking } from 'react-native'
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native'
import { colors } from '../theme/colors'
import { TagPills } from '../components/TagPills'
import { RootStackParamList } from '../types'
import { useItem } from '../hooks/useItems'
import { summarize } from '../services/ai'

type Route = RouteProp<RootStackParamList, 'ClipDetail'>

export function ClipDetailScreen() {
  const { params } = useRoute<Route>()
  const nav = useNavigation()
  const { item, update } = useItem(params.id)

  useEffect(() => {
    if (item) nav.setOptions({ title: item.title })
  }, [item?.title])

  async function handleSummarize() {
    if (!item) return
    const result = await summarize(item.content)
    if (result) update({ summary: result })
  }

  if (!item) return <View style={styles.screen} />

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Source URL */}
      {item.url ? (
        <TouchableOpacity onPress={() => Linking.openURL(item.url!)}>
          <Text style={styles.url} numberOfLines={1}>{item.url}</Text>
        </TouchableOpacity>
      ) : null}

      {/* Tags */}
      {item.tags && item.tags.length > 0 && (
        <TagPills tags={item.tags} style={styles.tags} />
      )}

      {/* AI summary */}
      {item.summary ? (
        <View style={styles.summaryBox}>
          <Text style={styles.summaryLabel}>✦ AI Summary</Text>
          <Text style={styles.summaryText}>{item.summary}</Text>
        </View>
      ) : (
        <TouchableOpacity style={styles.summarizeBtn} onPress={handleSummarize}>
          <Text style={styles.summarizeBtnLabel}>✦ Generate AI summary</Text>
        </TouchableOpacity>
      )}

      {/* Full content */}
      <Text style={styles.sectionLabel}>CLIP</Text>
      <Text style={styles.content_text}>{item.content}</Text>

      {/* Timestamp */}
      <Text style={styles.timestamp}>
        Saved {new Date(item.created_at).toLocaleString()}
      </Text>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: colors.bgPrimary },
  content: { padding: 18, paddingBottom: 48 },

  url: {
    fontSize: 12, color: colors.accentNote,
    marginBottom: 12, textDecorationLine: 'underline',
  },
  tags: { marginBottom: 14 },

  summaryBox: {
    backgroundColor: 'rgba(179,136,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(179,136,255,0.2)',
    borderRadius: 10, padding: 14, marginBottom: 18,
  },
  summaryLabel: { fontSize: 11, fontWeight: '700', color: colors.accentEssay, marginBottom: 6 },
  summaryText:  { fontSize: 13, color: colors.textPrimary, lineHeight: 20 },

  summarizeBtn: {
    padding: 12, borderRadius: 10,
    borderWidth: 1, borderColor: 'rgba(179,136,255,0.25)',
    backgroundColor: 'rgba(179,136,255,0.06)',
    alignItems: 'center', marginBottom: 18,
  },
  summarizeBtnLabel: { color: colors.accentEssay, fontSize: 13, fontWeight: '600' },

  sectionLabel: {
    fontSize: 10, fontWeight: '700', letterSpacing: 0.1,
    color: colors.textMuted, marginBottom: 8,
  },
  content_text: { fontSize: 14, color: colors.textPrimary, lineHeight: 22 },
  timestamp:    { fontSize: 11, color: colors.textMuted, marginTop: 24, textAlign: 'center' },
})
