import React from 'react'
import { View, Text, StyleSheet, ViewStyle } from 'react-native'
import { colors } from '../theme/colors'

interface Props {
  tags: string[]
  accent?: string
  style?: ViewStyle
  maxVisible?: number
}

export function TagPills({ tags, accent = colors.accentClip, style, maxVisible = 5 }: Props) {
  const visible = tags.slice(0, maxVisible)
  const extra   = tags.length - visible.length

  const pillBg     = accent + '18'
  const pillBorder = accent + '38'

  return (
    <View style={[styles.row, style]}>
      {visible.map(tag => (
        <View key={tag} style={[styles.pill, { backgroundColor: pillBg, borderColor: pillBorder }]}>
          <Text style={[styles.label, { color: accent }]}>{tag}</Text>
        </View>
      ))}
      {extra > 0 && (
        <View style={[styles.pill, styles.extra]}>
          <Text style={styles.extraLabel}>+{extra}</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
  },
  pill: {
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
  },
  extra: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: colors.border,
  },
  extraLabel: {
    fontSize: 11,
    color: colors.textMuted,
  },
})
