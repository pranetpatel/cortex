import { useState } from 'react'
import { exportData, importData, syncWithDesktop } from '../services/sync'

export function useSync() {
  const [syncing, setSyncing] = useState(false)
  const [lastMessage, setLastMessage] = useState<string | null>(null)

  async function doExport() {
    setSyncing(true)
    setLastMessage(null)
    try {
      await exportData()
      setLastMessage('Export shared successfully')
    } catch (e: any) {
      setLastMessage(`Export failed: ${e.message}`)
    } finally {
      setSyncing(false)
    }
  }

  async function doImport(): Promise<number> {
    setSyncing(true)
    setLastMessage(null)
    try {
      const result = await importData()
      if (!result) { setLastMessage('Import cancelled'); return 0 }
      setLastMessage(`Imported ${result.count} items`)
      return result.count
    } catch (e: any) {
      setLastMessage(`Import failed: ${e.message}`)
      return 0
    } finally {
      setSyncing(false)
    }
  }

  async function doDesktopSync(host: string) {
    setSyncing(true)
    setLastMessage(null)
    try {
      const { pulled, pushed } = await syncWithDesktop(host)
      setLastMessage(`Synced — pulled ${pulled}, pushed ${pushed}`)
    } catch (e: any) {
      setLastMessage(`Sync failed: ${e.message}`)
    } finally {
      setSyncing(false)
    }
  }

  return { syncing, lastMessage, doExport, doImport, doDesktopSync }
}
