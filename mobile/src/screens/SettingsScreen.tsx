import React, { useState, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, Switch, ActivityIndicator,
} from 'react-native'
import { colors } from '../theme/colors'
import { getApiKey, saveApiKey, hasApiKey } from '../services/ai'
import { useSync } from '../hooks/useSync'

export function SettingsScreen() {
  const [apiKey,      setApiKey]      = useState('')
  const [keyMasked,   setKeyMasked]   = useState(true)
  const [keyStatus,   setKeyStatus]   = useState<'none' | 'saved'>('none')
  const [pencilOnly,  setPencilOnly]  = useState(false)
  const [desktopHost, setDesktopHost] = useState('192.168.1.100')

  const { syncing, lastMessage, doExport, doImport, doDesktopSync } = useSync()

  useEffect(() => {
    hasApiKey().then(has => setKeyStatus(has ? 'saved' : 'none'))
  }, [])

  async function handleSaveKey() {
    if (!apiKey.trim()) return
    await saveApiKey(apiKey.trim())
    setKeyStatus('saved')
    setApiKey('')
    Alert.alert('Saved', 'API key saved securely.')
  }

  function handleDesktopSync() {
    if (!desktopHost.trim()) {
      Alert.alert('Enter IP', 'Enter your desktop computer\'s local IP address.')
      return
    }
    doDesktopSync(desktopHost.trim())
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>

      {/* ── API Key ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>OpenAI API Key</Text>
        <Text style={styles.sectionDesc}>
          Required for AI summarization and chat.{'\n'}
          Stored securely on your device.
        </Text>

        {keyStatus === 'saved' && (
          <View style={styles.keyStatus}>
            <Text style={styles.keyStatusDot}>●</Text>
            <Text style={styles.keyStatusText}>API key saved</Text>
          </View>
        )}

        <TextInput
          style={styles.field}
          value={apiKey}
          onChangeText={setApiKey}
          placeholder="sk-..."
          placeholderTextColor={colors.textMuted}
          secureTextEntry={keyMasked}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <View style={styles.keyActions}>
          <TouchableOpacity onPress={() => setKeyMasked(m => !m)}>
            <Text style={styles.smallLink}>{keyMasked ? 'Show' : 'Hide'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnSmall} onPress={handleSaveKey}>
            <Text style={styles.btnSmallLabel}>Save Key</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Sync ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sync</Text>

        <TouchableOpacity style={styles.row} onPress={doExport} disabled={syncing}>
          <View>
            <Text style={styles.rowTitle}>Export All Data</Text>
            <Text style={styles.rowDesc}>Share a .json file with all your items</Text>
          </View>
          {syncing ? <ActivityIndicator size="small" color={colors.accentClip} /> : <Text style={styles.arrow}>→</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={styles.row} onPress={doImport} disabled={syncing}>
          <View>
            <Text style={styles.rowTitle}>Import Data</Text>
            <Text style={styles.rowDesc}>Pick a Cortex .json export file</Text>
          </View>
          {syncing ? <ActivityIndicator size="small" color={colors.accentClip} /> : <Text style={styles.arrow}>→</Text>}
        </TouchableOpacity>

        {lastMessage ? (
          <Text style={styles.syncMessage}>{lastMessage}</Text>
        ) : null}
      </View>

      {/* ── Desktop sync ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Desktop Sync (Local Wi-Fi)</Text>
        <Text style={styles.sectionDesc}>
          Enter your desktop's local IP address while on the same network.
          Cortex desktop app must be running.
        </Text>
        <TextInput
          style={styles.field}
          value={desktopHost}
          onChangeText={setDesktopHost}
          placeholder="192.168.x.x"
          placeholderTextColor={colors.textMuted}
          keyboardType="numbers-and-punctuation"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity style={styles.btnFull} onPress={handleDesktopSync} disabled={syncing}>
          {syncing
            ? <ActivityIndicator size="small" color={colors.accentNote} />
            : <Text style={styles.btnFullLabel}>Sync with Desktop</Text>
          }
        </TouchableOpacity>
      </View>

      {/* ── Apple Pencil ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Apple Pencil (iPad)</Text>
        <View style={styles.switchRow}>
          <View>
            <Text style={styles.rowTitle}>Pencil-only mode</Text>
            <Text style={styles.rowDesc}>Reject finger input on the canvas</Text>
          </View>
          <Switch
            value={pencilOnly}
            onValueChange={setPencilOnly}
            trackColor={{ false: colors.border, true: colors.accentEssay + '80' }}
            thumbColor={pencilOnly ? colors.accentEssay : colors.textMuted}
          />
        </View>
      </View>

      {/* ── About ── */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.about}>Cortex v1.0.0</Text>
        <Text style={styles.about}>github.com/pranetpatel/cortex</Text>
        <Text style={[styles.about, { marginTop: 6, color: colors.textMuted }]}>
          Local-first personal knowledge management.{'\n'}
          Your data never leaves your device.
        </Text>
      </View>

    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: colors.bgPrimary },
  content: { padding: 18, paddingBottom: 48 },

  section: {
    marginBottom: 28,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: 14, padding: 16,
    backgroundColor: colors.bgSurface,
  },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  sectionDesc:  { fontSize: 12, color: colors.textMuted, lineHeight: 18, marginBottom: 12 },

  field: {
    backgroundColor: colors.bgInput, borderWidth: 1, borderColor: colors.borderStrong,
    borderRadius: 10, padding: 11, color: colors.textPrimary, fontSize: 14, marginBottom: 8,
  },
  keyStatus: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  keyStatusDot: { color: colors.success, fontSize: 10 },
  keyStatusText: { fontSize: 12, color: colors.success },
  keyActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  smallLink: { fontSize: 12, color: colors.accentNote, textDecorationLine: 'underline' },
  btnSmall: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8,
    backgroundColor: 'rgba(245,158,66,0.12)',
    borderWidth: 1, borderColor: 'rgba(245,158,66,0.25)',
  },
  btnSmallLabel: { fontSize: 13, color: colors.accentClip, fontWeight: '600' },

  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.border,
  },
  switchRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 6,
  },
  rowTitle: { fontSize: 14, color: colors.textPrimary, fontWeight: '500' },
  rowDesc:  { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  arrow:    { fontSize: 16, color: colors.textMuted },
  syncMessage: { fontSize: 12, color: colors.accentNote, marginTop: 10, textAlign: 'center' },

  btnFull: {
    padding: 12, borderRadius: 10, marginTop: 10,
    backgroundColor: 'rgba(110,198,247,0.10)',
    borderWidth: 1, borderColor: 'rgba(110,198,247,0.25)',
    alignItems: 'center',
  },
  btnFullLabel: { color: colors.accentNote, fontSize: 14, fontWeight: '600' },

  about: { fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
})
