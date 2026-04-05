import React from 'react'
import { View, TextInput, StyleSheet, ViewStyle } from 'react-native'
import { colors } from '../theme/colors'

interface Props {
  value: string
  onChangeText: (text: string) => void
  placeholder?: string
  style?: ViewStyle
  autoFocus?: boolean
}

export function SearchBar({ value, onChangeText, placeholder = 'Search…', style, autoFocus }: Props) {
  return (
    <View style={[styles.wrap, style]}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        autoFocus={autoFocus}
        clearButtonMode="while-editing"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.bgInput,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 10,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  input: {
    color: colors.textPrimary,
    fontSize: 14,
    padding: 0,
  },
})
