import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { colors } from '../theme/colors'
import { Item } from '../types'
import { TagPills } from './TagPills'

interface Props {
  item: Item
  onPress: () => void
}

function formatDate(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000) || 1}m ago`
  if (diff < 86_400_000)return `${Math.floor(diff / 3_600_000)}h ago`
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// Count [[wiki links]] in content
function countLinks(content: string): number {
  return (content.match(/\[\[([^\]]+)\]\]/g) || []).length
}

export function NoteCard({ item, onPress }: Props) {
  const preview = item.content.replace(/\[\[([^\]]+)\]\]/g, '$1').slice(0, 120)
  const linkCount = countLinks(item.content)

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
      {preview ? (
        <Text style={styles.preview} numberOfLines={2}>{preview}</Text>
      ) : null}

      <View style={styles.footer}>
        <Text style={styles.date}>{formatDate(item.updated_at)}</Text>
        {linkCount > 0 && (
          <Text style={styles.links}>
            {linkCount} link{linkCount !== 1 ? 's' : ''}
          </Text>
        )}
      </View>

      {item.tags && item.tags.length > 0 && (
        <TagPills tags={item.tags} accent={colors.accentNote} style={styles.tags} />
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
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 5,
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
  links: {
    fontSize: 11,
    color: colors.accentNote,
  },
  tags: {
    marginTop: 8,
  },
})
