import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { colors, accentBg, accentBorder } from '../theme/colors'
import { Item } from '../types'
import { TagPills } from './TagPills'

interface Props {
  item: Item
  onPress: () => void
  onLongPress?: () => void
}

function formatDate(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60_000)    return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000)return `${Math.floor(diff / 3_600_000)}h ago`
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function ClipCard({ item, onPress, onLongPress }: Props) {
  const preview = item.summary || item.content.slice(0, 140)

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.typeDot} />
        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
      </View>

      {preview ? (
        <Text style={styles.preview} numberOfLines={2}>{preview}</Text>
      ) : null}

      <View style={styles.footer}>
        <Text style={styles.date}>{formatDate(item.created_at)}</Text>
        {item.url ? <Text style={styles.url} numberOfLines={1}>{new URL(item.url).hostname}</Text> : null}
      </View>

      {item.tags && item.tags.length > 0 && (
        <TagPills tags={item.tags} style={styles.tags} />
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  typeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.accentClip,
    flexShrink: 0,
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  preview: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  date: {
    fontSize: 11,
    color: colors.textMuted,
  },
  url: {
    fontSize: 11,
    color: colors.textMuted,
    flex: 1,
  },
  tags: {
    marginTop: 8,
  },
})
