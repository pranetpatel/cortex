import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import * as DocumentPicker from 'expo-document-picker'
import { getItems, bulkUpsert } from './database'
import { ExportBundle, Item } from '../types'

// ─── Export ───────────────────────────────────────────────────────────────────
export async function exportData(): Promise<void> {
  const items = getItems()
  const bundle: ExportBundle = {
    version: '1.0.0',
    exportedAt: Date.now(),
    items,
  }

  const json = JSON.stringify(bundle, null, 2)
  const filename = `cortex-export-${new Date().toISOString().slice(0, 10)}.json`
  const uri = FileSystem.documentDirectory + filename

  await FileSystem.writeAsStringAsync(uri, json, {
    encoding: FileSystem.EncodingType.UTF8,
  })

  const canShare = await Sharing.isAvailableAsync()
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/json',
      dialogTitle: 'Export Cortex data',
    })
  }
}

// ─── Import ───────────────────────────────────────────────────────────────────
export async function importData(): Promise<{ count: number } | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  })

  if (result.canceled) return null

  const uri = result.assets[0].uri
  const json = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.UTF8,
  })

  const bundle: ExportBundle = JSON.parse(json)

  if (!Array.isArray(bundle.items)) {
    throw new Error('Invalid export file — missing items array')
  }

  bulkUpsert(bundle.items)
  return { count: bundle.items.length }
}

// ─── Desktop sync (local network — Option A, manual IP) ───────────────────────
export async function syncWithDesktop(host: string): Promise<{ pulled: number; pushed: number }> {
  const base = `http://${host}:7777`

  // Pull from desktop
  const res = await fetch(`${base}/api/clips?limit=500`)
  if (!res.ok) throw new Error(`Desktop returned ${res.status}`)
  const remote: Item[] = await res.json()
  bulkUpsert(remote)

  // Push local items to desktop
  const local = getItems()
  let pushed = 0
  for (const item of local) {
    try {
      await fetch(`${base}/api/clips`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      })
      pushed++
    } catch {}
  }

  return { pulled: remote.length, pushed }
}
