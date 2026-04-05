// ─── Domain types ─────────────────────────────────────────────────────────────
export type ItemType = 'clip' | 'note' | 'essay'

export interface Item {
  id: string
  type: ItemType
  title: string
  content: string
  url?: string | null
  summary?: string | null
  created_at: number
  updated_at: number
  tags?: string[]
}

export interface Tag {
  id: string
  name: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

// ─── Navigation types ──────────────────────────────────────────────────────────
export type RootTabParamList = {
  Clips: undefined
  Notes: undefined
  Write: undefined
  Graph: undefined
  AI: undefined
}

export type RootStackParamList = {
  Tabs: undefined
  ClipDetail: { id: string }
  NoteEditor: { id?: string; title?: string }
  EssayEditor: { id?: string; title?: string }
  Settings: undefined
}

// ─── Graph types ───────────────────────────────────────────────────────────────
export interface GraphNode {
  id: string
  title: string
  type: ItemType
  x: number
  y: number
  vx: number
  vy: number
}

export interface GraphEdge {
  source: string
  target: string
}

// ─── Sync types ────────────────────────────────────────────────────────────────
export interface ExportBundle {
  version: string
  exportedAt: number
  items: Item[]
}
