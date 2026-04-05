import * as SQLite from 'expo-sqlite'
import { Item, Tag } from '../types'

// ─── Singleton ────────────────────────────────────────────────────────────────
let _db: SQLite.SQLiteDatabase | null = null

export function getDB(): SQLite.SQLiteDatabase {
  if (!_db) throw new Error('Database not initialized — call initDatabase() first')
  return _db
}

// ─── Init ─────────────────────────────────────────────────────────────────────
export function initDatabase(): void {
  _db = SQLite.openDatabaseSync('cortex.db')
  _db.execSync(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS items (
      id         TEXT PRIMARY KEY,
      type       TEXT NOT NULL CHECK(type IN ('clip', 'note', 'essay')),
      title      TEXT NOT NULL DEFAULT 'Untitled',
      content    TEXT DEFAULT '',
      url        TEXT,
      summary    TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tags (
      id   TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS item_tags (
      item_id TEXT REFERENCES items(id) ON DELETE CASCADE,
      tag_id  TEXT REFERENCES tags(id)  ON DELETE CASCADE,
      PRIMARY KEY (item_id, tag_id)
    );

    CREATE TABLE IF NOT EXISTS links (
      source_id TEXT REFERENCES items(id) ON DELETE CASCADE,
      target_id TEXT REFERENCES items(id) ON DELETE CASCADE,
      PRIMARY KEY (source_id, target_id)
    );
  `)
}

// ─── UID ──────────────────────────────────────────────────────────────────────
export const uid = (): string =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

// ─── Helpers ──────────────────────────────────────────────────────────────────
function attachTags(db: SQLite.SQLiteDatabase, items: Omit<Item, 'tags'>[]): Item[] {
  return items.map(item => ({
    ...item,
    tags: db
      .getAllSync<{ name: string }>(
        `SELECT t.name FROM tags t
         JOIN item_tags it ON t.id = it.tag_id
         WHERE it.item_id = ?`,
        [item.id]
      )
      .map(r => r.name),
  }))
}

// ─── CRUD ──────────────────────────────────────────────────────────────────────
export function getItems(type?: string): Item[] {
  const db = getDB()
  const rows = type
    ? db.getAllSync<Omit<Item, 'tags'>>(
        'SELECT * FROM items WHERE type = ? ORDER BY created_at DESC',
        [type]
      )
    : db.getAllSync<Omit<Item, 'tags'>>(
        'SELECT * FROM items ORDER BY created_at DESC'
      )
  return attachTags(db, rows)
}

export function getItem(id: string): Item | null {
  const db = getDB()
  const row = db.getFirstSync<Omit<Item, 'tags'>>(
    'SELECT * FROM items WHERE id = ?', [id]
  )
  if (!row) return null
  return attachTags(db, [row])[0]
}

export function saveItem(item: Partial<Item> & { type: string }): Item {
  const db = getDB()
  const now = Date.now()
  const id = item.id || uid()
  const exists = db.getFirstSync<{ id: string }>('SELECT id FROM items WHERE id = ?', [id])

  if (exists) {
    db.runSync(
      `UPDATE items SET title=?, content=?, url=?, summary=?, updated_at=? WHERE id=?`,
      [item.title ?? 'Untitled', item.content ?? '', item.url ?? null, item.summary ?? null, now, id]
    )
  } else {
    db.runSync(
      `INSERT INTO items (id, type, title, content, url, summary, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, item.type, item.title ?? 'Untitled', item.content ?? '',
       item.url ?? null, item.summary ?? null, item.created_at ?? now, now]
    )
  }

  // Sync tags
  db.runSync('DELETE FROM item_tags WHERE item_id = ?', [id])
  for (const tagName of (item.tags ?? [])) {
    const name = String(tagName).trim()
    if (!name) continue
    const tagId = name.toLowerCase().replace(/\s+/g, '-')
    db.runSync('INSERT OR IGNORE INTO tags (id, name) VALUES (?, ?)', [tagId, name])
    db.runSync('INSERT OR IGNORE INTO item_tags (item_id, tag_id) VALUES (?, ?)', [id, tagId])
  }

  // Sync wiki links
  db.runSync('DELETE FROM links WHERE source_id = ?', [id])
  const wikiLinks = [...(item.content ?? '').matchAll(/\[\[([^\]]+)\]\]/g)].map(m => m[1])
  for (const linkTitle of wikiLinks) {
    const target = db.getFirstSync<{ id: string }>(
      'SELECT id FROM items WHERE LOWER(title) = LOWER(?)', [linkTitle]
    )
    if (target) {
      db.runSync(
        'INSERT OR IGNORE INTO links (source_id, target_id) VALUES (?, ?)',
        [id, target.id]
      )
    }
  }

  return getItem(id)!
}

export function deleteItem(id: string): void {
  const db = getDB()
  db.runSync('DELETE FROM links WHERE source_id = ? OR target_id = ?', [id, id])
  db.runSync('DELETE FROM item_tags WHERE item_id = ?', [id])
  db.runSync('DELETE FROM items WHERE id = ?', [id])
}

export function searchItems(query: string): Item[] {
  if (!query.trim()) return []
  const db = getDB()
  const q = `%${query}%`
  const rows = db.getAllSync<Omit<Item, 'tags'>>(
    `SELECT * FROM items WHERE title LIKE ? OR content LIKE ?
     ORDER BY created_at DESC LIMIT 50`,
    [q, q]
  )
  return attachTags(db, rows)
}

export function getBacklinks(id: string): Item[] {
  const db = getDB()
  const rows = db.getAllSync<Omit<Item, 'tags'>>(
    `SELECT items.* FROM items
     JOIN links ON links.source_id = items.id
     WHERE links.target_id = ?`,
    [id]
  )
  return attachTags(db, rows)
}

export function getAllTags(): Tag[] {
  return getDB().getAllSync<Tag>('SELECT * FROM tags ORDER BY name')
}

// ─── Graph data ───────────────────────────────────────────────────────────────
export function getGraphData(): { nodes: Omit<Item, 'tags'>[]; edges: { source_id: string; target_id: string }[] } {
  const db = getDB()
  const nodes = db.getAllSync<Omit<Item, 'tags'>>('SELECT id, type, title, created_at, updated_at, content, url, summary FROM items')
  const edges = db.getAllSync<{ source_id: string; target_id: string }>('SELECT * FROM links')
  return { nodes, edges }
}

// ─── Bulk upsert (for import) ──────────────────────────────────────────────────
export function bulkUpsert(items: Item[]): void {
  for (const item of items) {
    saveItem(item)
  }
}
