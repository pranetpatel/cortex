const { app, BrowserWindow, ipcMain, shell, nativeTheme, dialog } = require('electron')
const path = require('path')
const fs = require('fs')

// ─── ENV LOADER ───────────────────────────────────────────────────────────────
const envPath = path.join(__dirname, '..', '.env')
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) return
    const key = trimmed.slice(0, eqIdx).trim()
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '')
    if (key && !process.env[key]) process.env[key] = val
  })
}

// ─── SETTINGS ────────────────────────────────────────────────────────────────
let settingsCache = null

function getSettingsPath() {
  return path.join(app.getPath('userData'), 'settings.json')
}

function loadSettings() {
  if (settingsCache) return settingsCache
  try { settingsCache = JSON.parse(fs.readFileSync(getSettingsPath(), 'utf8')) }
  catch { settingsCache = {} }
  return settingsCache
}

function persistSettings(data) {
  settingsCache = data
  fs.writeFileSync(getSettingsPath(), JSON.stringify(data, null, 2))
}

function getApiKey() {
  return process.env.OPENAI_API_KEY || loadSettings().apiKey || ''
}

// ─── WIKI LINK PARSER ────────────────────────────────────────────────────────
function parseWikiLinks(text) {
  const links = []
  const regex = /\[\[([^\]]+)\]\]/g
  let m
  while ((m = regex.exec(text)) !== null) links.push(m[1])
  return links
}

// ─── DATABASE (sql.js — pure WASM, no native compilation) ────────────────────
let db
let DB_PATH

// sql.js returns column-based results; convert to row objects
function resultToRows(results) {
  if (!results || results.length === 0) return []
  const { columns, values } = results[0]
  return values.map(vals => {
    const row = {}
    columns.forEach((col, i) => { row[col] = vals[i] })
    return row
  })
}

function queryAll(sql, params) {
  try {
    return resultToRows(db.exec(sql, params))
  } catch (e) {
    console.error('queryAll error:', e.message, sql)
    return []
  }
}

function queryGet(sql, params) {
  return queryAll(sql, params)[0] || null
}

function run(sql, params) {
  db.run(sql, params || [])
}

function saveDB() {
  const data = db.export()
  fs.writeFileSync(DB_PATH, Buffer.from(data))
}

async function initDB() {
  let initSqlJs
  try {
    initSqlJs = require('sql.js')
  } catch (e) {
    dialog.showErrorBox('Missing Dependency', 'sql.js not found. Run "npm install" first.\n\n' + e.message)
    app.quit()
    return
  }

  // Locate the WASM binary — works in both dev and packaged builds
  const sqlJsRoot = path.dirname(require.resolve('sql.js/package.json'))
  const wasmPath = path.join(sqlJsRoot, 'dist', 'sql-wasm.wasm')
  const wasmBinary = fs.readFileSync(wasmPath)

  const SQL = await initSqlJs({ wasmBinary })

  DB_PATH = path.join(app.getPath('userData'), 'cortex.db')

  db = fs.existsSync(DB_PATH)
    ? new SQL.Database(fs.readFileSync(DB_PATH))
    : new SQL.Database()

  createSchema()
}

function createSchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT 'Untitled',
      content TEXT DEFAULT '',
      url TEXT,
      summary TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL
    )
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS item_tags (
      item_id TEXT,
      tag_id TEXT,
      PRIMARY KEY (item_id, tag_id),
      FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    )
  `)
  db.run(`
    CREATE TABLE IF NOT EXISTS links (
      source_id TEXT,
      target_id TEXT,
      PRIMARY KEY (source_id, target_id),
      FOREIGN KEY (source_id) REFERENCES items(id) ON DELETE CASCADE,
      FOREIGN KEY (target_id) REFERENCES items(id) ON DELETE CASCADE
    )
  `)
  // FTS5 full-text search (content table mirrors items)
  db.run(`
    CREATE VIRTUAL TABLE IF NOT EXISTS items_fts USING fts5(
      title, content, content=items, content_rowid=rowid
    )
  `)
  db.run(`
    CREATE TRIGGER IF NOT EXISTS items_ai AFTER INSERT ON items BEGIN
      INSERT INTO items_fts(rowid, title, content)
      VALUES (new.rowid, new.title, new.content);
    END
  `)
  db.run(`
    CREATE TRIGGER IF NOT EXISTS items_ad AFTER DELETE ON items BEGIN
      INSERT INTO items_fts(items_fts, rowid, title, content)
      VALUES('delete', old.rowid, old.title, old.content);
    END
  `)
  db.run(`
    CREATE TRIGGER IF NOT EXISTS items_au AFTER UPDATE ON items BEGIN
      INSERT INTO items_fts(items_fts, rowid, title, content)
      VALUES('delete', old.rowid, old.title, old.content);
      INSERT INTO items_fts(rowid, title, content)
      VALUES (new.rowid, new.title, new.content);
    END
  `)
  db.run(`PRAGMA foreign_keys = ON`)
  saveDB()
}

// Helper: attach tags array to each item row
function withTags(rows) {
  return rows.map(item => ({
    ...item,
    tags: queryAll(
      `SELECT t.name FROM tags t
       JOIN item_tags it ON t.id = it.tag_id
       WHERE it.item_id = ?`,
      [item.id]
    ).map(r => r.name),
  }))
}

// ─── IPC HANDLERS ────────────────────────────────────────────────────────────
function setupIPC() {

  // ── DB: get all items ──────────────────────────────────────────────────────
  ipcMain.handle('db:getItems', () => {
    const rows = queryAll('SELECT * FROM items ORDER BY created_at DESC')
    return withTags(rows)
  })

  // ── DB: save (upsert) ──────────────────────────────────────────────────────
  ipcMain.handle('db:saveItem', (_, item) => {
    const now = Date.now()
    const exists = queryGet('SELECT id FROM items WHERE id = ?', [item.id])

    if (exists) {
      run(
        `UPDATE items SET title=?, content=?, url=?, summary=?, updated_at=? WHERE id=?`,
        [item.title || 'Untitled', item.content || '', item.url || null, item.summary || null, now, item.id]
      )
    } else {
      run(
        `INSERT INTO items (id, type, title, content, url, summary, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [item.id, item.type, item.title || 'Untitled', item.content || '',
         item.url || null, item.summary || null, item.created_at || now, now]
      )
    }

    // Sync tags
    run(`DELETE FROM item_tags WHERE item_id = ?`, [item.id])
    for (const tagName of (item.tags || [])) {
      const name = tagName.trim()
      if (!name) continue
      const tagId = name.toLowerCase().replace(/\s+/g, '-')
      run(`INSERT OR IGNORE INTO tags (id, name) VALUES (?, ?)`, [tagId, name])
      run(`INSERT OR IGNORE INTO item_tags (item_id, tag_id) VALUES (?, ?)`, [item.id, tagId])
    }

    // Sync wiki links
    run(`DELETE FROM links WHERE source_id = ?`, [item.id])
    const wikiLinks = parseWikiLinks(item.content || '')
    for (const linkTitle of wikiLinks) {
      const target = queryGet(
        `SELECT id FROM items WHERE LOWER(title) = LOWER(?)`,
        [linkTitle]
      )
      if (target) {
        run(`INSERT OR IGNORE INTO links (source_id, target_id) VALUES (?, ?)`,
          [item.id, target.id])
      }
    }

    saveDB()
    return { success: true, updatedAt: now }
  })

  // ── DB: delete ─────────────────────────────────────────────────────────────
  ipcMain.handle('db:deleteItem', (_, id) => {
    run(`DELETE FROM links WHERE source_id = ? OR target_id = ?`, [id, id])
    run(`DELETE FROM item_tags WHERE item_id = ?`, [id])
    run(`DELETE FROM items WHERE id = ?`, [id])
    saveDB()
    return { success: true }
  })

  // ── DB: full-text search ───────────────────────────────────────────────────
  ipcMain.handle('db:search', (_, query) => {
    if (!query.trim()) return []
    try {
      const ftsQuery = query.replace(/[^a-zA-Z0-9\s\-_]/g, '').trim()
      if (!ftsQuery) throw new Error('empty')
      const rows = queryAll(
        `SELECT items.* FROM items
         JOIN items_fts ON items.rowid = items_fts.rowid
         WHERE items_fts MATCH ?
         ORDER BY rank LIMIT 50`,
        [ftsQuery + '*']
      )
      return withTags(rows)
    } catch {
      const q = `%${query}%`
      const rows = queryAll(
        `SELECT * FROM items WHERE title LIKE ? OR content LIKE ?
         ORDER BY created_at DESC LIMIT 50`,
        [q, q]
      )
      return withTags(rows)
    }
  })

  // ── DB: backlinks ──────────────────────────────────────────────────────────
  ipcMain.handle('db:getBacklinks', (_, id) => {
    const rows = queryAll(
      `SELECT items.* FROM items
       JOIN links ON links.source_id = items.id
       WHERE links.target_id = ?`,
      [id]
    )
    return withTags(rows)
  })

  // ── Settings ───────────────────────────────────────────────────────────────
  ipcMain.handle('settings:get', (_, key) => {
    const s = loadSettings()
    return key ? s[key] : s
  })

  ipcMain.handle('settings:set', (_, key, value) => {
    const s = loadSettings()
    s[key] = value
    persistSettings(s)
    return { success: true }
  })

  ipcMain.handle('settings:hasApiKey', () => Boolean(getApiKey()))

  // ── AI: summarize ──────────────────────────────────────────────────────────
  ipcMain.handle('ai:summarize', async (_, text) => {
    const apiKey = getApiKey()
    if (!apiKey) return null
    try {
      const OpenAI = require('openai')
      const client = new OpenAI({ apiKey })
      const res = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 300,
        messages: [{
          role: 'user',
          content: `Summarize the following content in 2-3 concise sentences. Focus on the key ideas:\n\n${text.substring(0, 4000)}`,
        }],
      })
      return res.choices[0].message.content
    } catch (e) {
      console.error('ai:summarize', e.message)
      return null
    }
  })

  // ── AI: chat ───────────────────────────────────────────────────────────────
  ipcMain.handle('ai:chat', async (_, query, context) => {
    const apiKey = getApiKey()
    if (!apiKey) return '⚠️ No API key configured. Add your OpenAI API key in Settings.'
    try {
      const OpenAI = require('openai')
      const client = new OpenAI({ apiKey })
      const res = await client.chat.completions.create({
        model: 'gpt-4o',
        max_tokens: 1500,
        messages: [
          {
            role: 'system',
            content: `You are a research assistant with access to the user's knowledge base.\n\nKnowledge base:\n${context.substring(0, 8000)}`,
          },
          {
            role: 'user',
            content: `${query}\n\nAnswer based on the knowledge base. Cite specific items by title when relevant.`,
          },
        ],
      })
      return res.choices[0].message.content
    } catch (e) {
      return `Error: ${e.message}`
    }
  })

  // ── AI: essay help ─────────────────────────────────────────────────────────
  ipcMain.handle('ai:essayHelp', async (_, prompt, notes, draft) => {
    const apiKey = getApiKey()
    if (!apiKey) return '⚠️ No API key configured. Add your OpenAI API key in Settings.'
    try {
      const OpenAI = require('openai')
      const client = new OpenAI({ apiKey })
      const res = await client.chat.completions.create({
        model: 'gpt-4o',
        max_tokens: 1500,
        messages: [
          {
            role: 'system',
            content: `You are a writing assistant helping the user develop an essay.\n\nResearch notes:\n${notes.substring(0, 4000)}\n\nCurrent draft:\n${draft.substring(0, 3000)}`,
          },
          {
            role: 'user',
            content: `${prompt}\n\nBe specific and actionable.`,
          },
        ],
      })
      return res.choices[0].message.content
    } catch (e) {
      return `Error: ${e.message}`
    }
  })

  // ── Shell ──────────────────────────────────────────────────────────────────
  ipcMain.handle('shell:openExternal', (_, url) => {
    shell.openExternal(url)
  })
}

// ─── WINDOW ───────────────────────────────────────────────────────────────────
let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0e0e11',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false,
    icon: path.join(__dirname, '../public/logo512.png'),
  })

  const isDev = !app.isPackaged

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    if (isDev) mainWindow.webContents.openDevTools({ mode: 'detach' })
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

// ─── APP LIFECYCLE ────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  nativeTheme.themeSource = 'dark'
  await initDB()
  if (!db) return
  setupIPC()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('quit', () => {
  if (db) {
    try { saveDB() } catch {}
    db.close()
  }
})
