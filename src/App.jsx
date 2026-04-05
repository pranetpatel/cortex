import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import Icon from './components/Icons'
import GraphView from './components/GraphView'
import Sidebar from './components/Sidebar'
import { db } from './services/db'
import { ai } from './services/ai'

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

function parseWikiLinks(text) {
  const links = []
  const regex = /\[\[([^\]]+)\]\]/g
  let m
  while ((m = regex.exec(text)) !== null) links.push(m[1])
  return links
}

function renderMarkdown(text, onLinkClick) {
  if (!text) return null
  return text.split(/(\[\[[^\]]+\]\])/g).map((part, i) => {
    const m = part.match(/^\[\[([^\]]+)\]\]$/)
    if (m) {
      return (
        <span key={i} className="wiki-link" onClick={() => onLinkClick?.(m[1])}>
          {m[1]}
        </span>
      )
    }
    return <span key={i}>{part}</span>
  })
}

const BOOKMARKLET_CODE = `javascript:void(function(){var s=window.getSelection().toString().trim();var t=document.title;var u=window.location.href;if(!s){s=document.querySelector('meta[name="description"]')?.content||'';if(!s){var p=document.querySelector('article p,.post-content p,main p,p');s=p?p.textContent.substring(0,500):''}}var d=JSON.stringify({text:s,title:t,url:u,ts:Date.now()});localStorage.setItem('cortex_clip',d);var n=document.createElement('div');n.innerHTML='<div style="position:fixed;top:20px;right:20px;z-index:999999;background:%23161619;color:%23e8e4df;padding:14px 20px;border-radius:10px;font:14px/1.4 system-ui;box-shadow:0 8px 32px rgba(0,0,0,.4);border:1px solid rgba(255,255,255,.08)">✓ Clipped to Cortex</div>';document.body.appendChild(n);setTimeout(function(){n.remove()},2500)})()`;

// ─── STYLES ───────────────────────────────────────────────────────────────────
const S = {
  app: {
    display: 'flex', height: '100vh',
    background: '#0e0e11', color: '#e8e4df',
    fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif",
    overflow: 'hidden',
  },
  mobileHeader: {
    display: 'none', position: 'fixed', top: 0, left: 0, right: 0,
    height: 52, background: '#161619',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    zIndex: 100, alignItems: 'center', padding: '0 16px', gap: 12,
  },
  menuBtn: { background: 'none', border: 'none', color: '#e8e4df', cursor: 'pointer', padding: 4 },
  mobileLogo: { fontWeight: 600, fontSize: 16, letterSpacing: '-0.02em' },
  main: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 },
  topBar: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '14px 24px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    flexShrink: 0,
  },
  searchBox: {
    display: 'flex', alignItems: 'center', gap: 8, flex: 1,
    background: 'rgba(255,255,255,0.04)', borderRadius: 10,
    padding: '8px 14px', border: '1px solid rgba(255,255,255,0.06)',
  },
  searchInput: {
    flex: 1, background: 'none', border: 'none',
    color: '#e8e4df', fontSize: 13, fontFamily: 'inherit', outline: 'none',
  },
  topActions: { display: 'flex', gap: 8, flexShrink: 0 },
  actionBtn: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '8px 14px',
    background: 'rgba(245,158,66,0.12)',
    border: '1px solid rgba(245,158,66,0.25)',
    color: '#f59e42', fontSize: 12, fontFamily: 'inherit',
    fontWeight: 600, cursor: 'pointer', borderRadius: 8, whiteSpace: 'nowrap',
    transition: 'all 0.15s',
  },
  itemGrid: {
    flex: 1, overflow: 'auto', padding: 24,
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: 16, alignContent: 'start',
  },
  card: {
    background: '#18181d', border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 12, padding: 18, cursor: 'pointer',
    transition: 'all 0.15s', display: 'flex', flexDirection: 'column', gap: 8,
  },
  cardType: {
    fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
    color: '#f59e42', display: 'flex', alignItems: 'center', gap: 6,
  },
  cardTitle: { fontSize: 15, fontWeight: 600, color: '#e8e4df', lineHeight: 1.3 },
  cardExcerpt: { fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 },
  cardSummary: {
    fontSize: 11, color: 'rgba(179,136,255,0.8)',
    display: 'flex', alignItems: 'flex-start', gap: 6,
    padding: '8px 10px', background: 'rgba(179,136,255,0.06)', borderRadius: 8,
  },
  cardMeta: {
    display: 'flex', flexWrap: 'wrap', gap: 6,
    alignItems: 'center', marginTop: 'auto', paddingTop: 4,
  },
  cardDate: { fontSize: 10, color: 'rgba(255,255,255,0.2)', marginLeft: 'auto' },
  tagPill: {
    fontSize: 10, padding: '2px 8px',
    background: 'rgba(255,255,255,0.06)',
    borderRadius: 20, color: 'rgba(255,255,255,0.4)',
  },
  emptyState: {
    gridColumn: '1 / -1', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', gap: 14,
    padding: 60, color: 'rgba(255,255,255,0.2)', fontSize: 14, textAlign: 'center',
  },
  // Modal
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 200, padding: 20,
  },
  modal: {
    background: '#1c1c21', borderRadius: 16, padding: 28,
    maxWidth: 460, width: '100%',
    border: '1px solid rgba(255,255,255,0.08)',
    display: 'flex', flexDirection: 'column', gap: 12,
  },
  modalTitle: { fontSize: 17, fontWeight: 600, color: '#e8e4df', marginBottom: 4 },
  modalText: { fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 },
  modalActions: { display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 },
  input: {
    width: '100%', padding: '10px 14px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 8, color: '#e8e4df', fontSize: 13,
    fontFamily: 'inherit', outline: 'none',
  },
  textarea: { minHeight: 140, resize: 'vertical' },
  closeBtn: {
    padding: '8px 16px', background: 'rgba(255,255,255,0.06)',
    border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: 12,
    fontFamily: 'inherit', cursor: 'pointer', borderRadius: 8,
  },
  bookmarkletLink: {
    display: 'inline-block', padding: '10px 20px',
    background: 'linear-gradient(135deg, #f59e42, #e67e22)',
    borderRadius: 8, color: '#fff', fontWeight: 600,
    fontSize: 13, textDecoration: 'none', cursor: 'grab',
    alignSelf: 'flex-start',
  },
  // Edit panel
  editPanel: { flex: 1, overflow: 'auto', padding: '20px 28px', maxWidth: 760 },
  editHeader: {
    display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 20,
  },
  editActions: { display: 'flex', gap: 8 },
  backBtn: {
    display: 'flex', alignItems: 'center', gap: 6,
    background: 'none', border: 'none',
    color: 'rgba(255,255,255,0.45)', fontSize: 12,
    fontFamily: 'inherit', cursor: 'pointer', padding: 0,
  },
  deleteBtn: {
    padding: '8px 10px',
    background: 'rgba(255,60,60,0.1)',
    border: '1px solid rgba(255,60,60,0.2)',
    color: '#ff5555', borderRadius: 8, cursor: 'pointer',
    display: 'flex', alignItems: 'center',
  },
  editTitleInput: {
    width: '100%', padding: '4px 0',
    background: 'none', border: 'none',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    color: '#e8e4df', fontSize: 22, fontWeight: 600,
    fontFamily: 'inherit', outline: 'none', marginBottom: 16,
    boxSizing: 'border-box',
  },
  editTextarea: {
    width: '100%', minHeight: 320, padding: 16,
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 10, color: '#e8e4df', fontSize: 14,
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    lineHeight: 1.75, outline: 'none', resize: 'vertical',
    boxSizing: 'border-box',
  },
  editTagsRow: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 },
  editTagsInput: {
    flex: 1, background: 'none', border: 'none',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    color: '#e8e4df', fontSize: 12, fontFamily: 'inherit',
    outline: 'none', padding: '6px 0',
  },
  summaryBox: {
    marginTop: 20, padding: 16,
    background: 'rgba(179,136,255,0.05)',
    border: '1px solid rgba(179,136,255,0.12)', borderRadius: 10,
  },
  summaryLabel: {
    fontSize: 11, fontWeight: 600, color: '#b388ff',
    display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8,
  },
  summaryText: { fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 },
  sourceUrl: {
    marginTop: 12, fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
    display: 'flex', alignItems: 'center', gap: 6,
  },
  urlLink: { color: 'rgba(245,158,66,0.6)', textDecoration: 'none' },
  backlinksSection: { marginTop: 24 },
  backlinksTitle: {
    fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
    color: 'rgba(255,255,255,0.3)', marginBottom: 8,
  },
  backlinkPill: {
    display: 'inline-block', padding: '4px 10px', margin: '0 6px 6px 0',
    background: 'rgba(110,198,247,0.08)',
    border: '1px solid rgba(110,198,247,0.15)',
    borderRadius: 6, color: '#6ec6f7', fontSize: 12, cursor: 'pointer',
  },
  // Graph
  graphContainer: {
    flex: 1, overflow: 'hidden', padding: 24,
    display: 'flex', flexDirection: 'column',
  },
  graphLegend: {
    display: 'flex', alignItems: 'center', gap: 16,
    marginBottom: 16, fontSize: 12, color: 'rgba(255,255,255,0.4)',
    flexWrap: 'wrap',
  },
  legendDot: (color) => ({
    display: 'inline-block', width: 8, height: 8,
    borderRadius: '50%', background: color, marginRight: 5,
  }),
  legendInfo: { marginLeft: 'auto', fontSize: 10, color: 'rgba(255,255,255,0.2)' },
  // Chat
  chatContainer: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  chatHeader: {
    padding: '16px 24px', fontSize: 14, fontWeight: 600,
    display: 'flex', alignItems: 'center', gap: 8,
    borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0,
  },
  chatSubtitle: {
    fontSize: 11, fontWeight: 400,
    color: 'rgba(255,255,255,0.3)', marginLeft: 'auto',
  },
  chatMessages: { flex: 1, overflow: 'auto', padding: 24 },
  chatEmpty: {
    textAlign: 'center', color: 'rgba(255,255,255,0.25)',
    padding: '60px 20px', fontSize: 14,
  },
  chatSuggestions: {
    display: 'flex', flexDirection: 'column', gap: 8,
    marginTop: 20, alignItems: 'center',
  },
  chatSuggestion: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 20, padding: '8px 18px',
    color: 'rgba(255,255,255,0.5)', fontSize: 12,
    fontFamily: 'inherit', cursor: 'pointer',
    transition: 'all 0.15s',
  },
  chatUser: { display: 'flex', justifyContent: 'flex-end', marginBottom: 14 },
  chatAi: { display: 'flex', gap: 10, marginBottom: 14, alignItems: 'flex-start' },
  chatUserBubble: {
    maxWidth: '75%', padding: '10px 16px',
    background: 'rgba(245,158,66,0.12)',
    border: '1px solid rgba(245,158,66,0.15)',
    borderRadius: '12px 12px 2px 12px',
    fontSize: 13, lineHeight: 1.6, color: '#e8e4df',
  },
  chatAiBubble: {
    maxWidth: '80%', padding: '10px 16px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '2px 12px 12px 12px',
    fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap',
  },
  chatInputBar: {
    display: 'flex', gap: 10, padding: '14px 24px',
    borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0,
  },
  chatInputField: {
    flex: 1, padding: '10px 14px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 10, color: '#e8e4df', fontSize: 13,
    fontFamily: 'inherit', outline: 'none',
  },
  sendBtn: {
    padding: '10px 14px',
    background: 'rgba(245,158,66,0.12)',
    border: '1px solid rgba(245,158,66,0.2)',
    color: '#f59e42', borderRadius: 10, cursor: 'pointer',
    display: 'flex', alignItems: 'center',
  },
  // Essay
  essayLayout: { flex: 1, display: 'flex', overflow: 'hidden' },
  essayEditorPane: {
    flex: 1, display: 'flex', flexDirection: 'column',
    padding: '20px 28px', overflow: 'auto',
  },
  essayTitleInput: {
    width: '100%', padding: '4px 0', background: 'none', border: 'none',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    color: '#e8e4df', fontSize: 26, fontWeight: 700,
    fontFamily: 'inherit', outline: 'none', marginBottom: 20,
    boxSizing: 'border-box',
  },
  essayTextarea: {
    flex: 1, minHeight: 400, padding: 0, background: 'none',
    border: 'none', color: '#e8e4df', fontSize: 16,
    fontFamily: "'Georgia', 'Lora', serif",
    lineHeight: 1.9, outline: 'none', resize: 'none', boxSizing: 'border-box',
  },
  aiPanel: {
    width: 320, borderLeft: '1px solid rgba(255,255,255,0.06)',
    display: 'flex', flexDirection: 'column',
    background: 'rgba(255,255,255,0.01)', flexShrink: 0,
  },
  aiPanelTitle: {
    padding: '16px 20px', fontSize: 13, fontWeight: 600,
    display: 'flex', alignItems: 'center', gap: 8,
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    color: '#b388ff', flexShrink: 0,
  },
  aiPanelResponse: {
    flex: 1, padding: 20, fontSize: 13, color: 'rgba(255,255,255,0.55)',
    lineHeight: 1.7, overflow: 'auto', whiteSpace: 'pre-wrap',
  },
  aiPanelInput: {
    display: 'flex', gap: 8, padding: '12px 16px',
    borderTop: '1px solid rgba(255,255,255,0.06)', flexShrink: 0,
  },
  // Loading
  loadingScreen: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', height: '100vh', width: '100%',
    background: '#0e0e11',
  },
  loadingLogo: {
    fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em',
    color: '#e8e4df', marginBottom: 12,
  },
  loadingText: { fontSize: 13, color: 'rgba(255,255,255,0.3)' },
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState('clips')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Search
  const [searchQuery, setSearchQuery] = useState('')
  const searchRef = useRef(null)
  const searchTimerRef = useRef(null)

  // Clip add modal
  const [showAddClip, setShowAddClip] = useState(false)
  const [newClipUrl, setNewClipUrl] = useState('')
  const [newClipText, setNewClipText] = useState('')
  const [addingClip, setAddingClip] = useState(false)

  // Bookmarklet modal
  const [showBookmarklet, setShowBookmarklet] = useState(false)

  // Settings modal
  const [showSettings, setShowSettings] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [apiKeyStatus, setApiKeyStatus] = useState('') // 'saved' | ''

  // Edit panel (clips & notes)
  const [editingId, setEditingId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editTags, setEditTags] = useState('')
  const [backlinks, setBacklinks] = useState([])

  // Essay editor
  const [essayDraft, setEssayDraft] = useState('')
  const [essayPrompt, setEssayPrompt] = useState('')
  const [essayAiResponse, setEssayAiResponse] = useState('')
  const [essayLoading, setEssayLoading] = useState(false)

  // Chat
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef(null)

  // ── Load on mount ────────────────────────────────────────────────────────
  useEffect(() => {
    db.getItems().then(data => {
      setItems(data || [])
      setLoading(false)
    })
  }, [])

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  // ── Keyboard shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      const mod = e.ctrlKey || e.metaKey
      if (!mod) return
      if (e.key === 'k') { e.preventDefault(); searchRef.current?.focus() }
      if (e.key === 'g') { e.preventDefault(); navigate('graph') }
      if (e.key === 'n') { e.preventDefault(); handleNewNote() }
      if (e.key === 's') {
        e.preventDefault()
        if (editingId) handleSaveEdit()
        if (view === 'essays' && selected) handleSaveEssay()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [editingId, view, selected, editTitle, editContent, editTags, essayDraft])

  // ── Navigation ───────────────────────────────────────────────────────────
  const navigate = (id) => {
    setView(id)
    setSelected(null)
    setEditingId(null)
    if (window.innerWidth < 768) setSidebarOpen(false)
  }

  // ── Filtered items ───────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return items
    const q = searchQuery.toLowerCase()
    return items.filter(i =>
      (i.title || '').toLowerCase().includes(q) ||
      (i.content || '').toLowerCase().includes(q) ||
      (i.tags || []).some(t => t.toLowerCase().includes(q))
    )
  }, [items, searchQuery])

  const clips  = filtered.filter(i => i.type === 'clip')
  const notes  = filtered.filter(i => i.type === 'note')
  const essays = filtered.filter(i => i.type === 'essay')
  const selectedItem = items.find(i => i.id === selected)

  // ── Save helpers ─────────────────────────────────────────────────────────
  const upsertLocal = useCallback((item) => {
    setItems(prev => {
      const idx = prev.findIndex(i => i.id === item.id)
      if (idx === -1) return [item, ...prev]
      const next = [...prev]; next[idx] = item; return next
    })
  }, [])

  const removeLocal = useCallback((id) => {
    setItems(prev => prev.filter(i => i.id !== id))
  }, [])

  // ── Add clip ─────────────────────────────────────────────────────────────
  const handleAddClip = async () => {
    if (!newClipText.trim()) return
    setAddingClip(true)
    const now = Date.now()
    const item = {
      id: uid(), type: 'clip',
      title: newClipUrl || 'Web Clip',
      content: newClipText,
      url: newClipUrl || null,
      summary: null, tags: [],
      created_at: now, updated_at: now,
    }
    await db.saveItem(item)
    upsertLocal(item)
    setNewClipText(''); setNewClipUrl(''); setShowAddClip(false)
    setAddingClip(false)

    // Auto-summarize in background
    if (newClipText.length > 80) {
      ai.summarize(newClipText).then(summary => {
        if (!summary) return
        const updated = { ...item, summary }
        db.saveItem(updated)
        upsertLocal(updated)
      })
    }
  }

  // ── Add note ─────────────────────────────────────────────────────────────
  const handleNewNote = async () => {
    if (view !== 'notes') { setView('notes'); setSelected(null) }
    const now = Date.now()
    const item = {
      id: uid(), type: 'note', title: 'Untitled Note',
      content: '', tags: [], summary: null,
      created_at: now, updated_at: now,
    }
    await db.saveItem(item)
    upsertLocal(item)
    openEdit(item)
  }

  // ── Add essay ────────────────────────────────────────────────────────────
  const handleNewEssay = async () => {
    const now = Date.now()
    const item = {
      id: uid(), type: 'essay', title: 'Untitled Essay',
      content: '', tags: [], summary: null,
      created_at: now, updated_at: now,
    }
    await db.saveItem(item)
    upsertLocal(item)
    setSelected(item.id)
    setEssayDraft('')
    setEssayAiResponse('')
  }

  // ── Open edit panel ──────────────────────────────────────────────────────
  const openEdit = (item) => {
    setSelected(item.id)
    setEditingId(item.id)
    setEditTitle(item.title || '')
    setEditContent(item.content || '')
    setEditTags((item.tags || []).join(', '))
    // Load backlinks
    db.getBacklinks(item.id).then(bl => setBacklinks(bl || []))
  }

  // ── Save edit ────────────────────────────────────────────────────────────
  const handleSaveEdit = async () => {
    if (!editingId) return
    const existing = items.find(i => i.id === editingId)
    if (!existing) return
    const tags = editTags.split(',').map(t => t.trim()).filter(Boolean)
    const updated = { ...existing, title: editTitle, content: editContent, tags }
    await db.saveItem(updated)
    upsertLocal(updated)
  }

  // ── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    await db.deleteItem(id)
    removeLocal(id)
    if (selected === id) { setSelected(null); setEditingId(null) }
  }

  // ── Save essay ───────────────────────────────────────────────────────────
  const handleSaveEssay = async () => {
    if (!selected || !selectedItem) return
    const updated = { ...selectedItem, content: essayDraft }
    await db.saveItem(updated)
    upsertLocal(updated)
  }

  // ── Essay AI ─────────────────────────────────────────────────────────────
  const handleEssayAI = async () => {
    if (!essayPrompt.trim()) return
    setEssayLoading(true)
    const notes = items.filter(i => i.type !== 'essay')
      .map(i => `"${i.title}": ${(i.content || '').substring(0, 400)}`).join('\n')
    const resp = await ai.essayHelp(essayPrompt, notes, essayDraft)
    setEssayAiResponse(resp)
    setEssayLoading(false)
    setEssayPrompt('')
  }

  // ── Chat ─────────────────────────────────────────────────────────────────
  const handleChat = async () => {
    if (!chatInput.trim()) return
    const userMsg = chatInput
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }])
    setChatInput('')
    setChatLoading(true)
    const context = items
      .map(i => `[${i.type}] "${i.title}": ${(i.content || '').substring(0, 500)}`)
      .join('\n\n')
    const response = await ai.chat(userMsg, context)
    setChatMessages(prev => [...prev, { role: 'ai', text: response }])
    setChatLoading(false)
  }

  // ── Settings save ────────────────────────────────────────────────────────
  const handleSaveApiKey = async () => {
    await window.cortex.settings.set('apiKey', apiKeyInput.trim())
    setApiKeyStatus('saved')
    setTimeout(() => setApiKeyStatus(''), 2000)
  }

  // ── Wiki link navigation ─────────────────────────────────────────────────
  const handleWikiLinkClick = (linkTitle) => {
    const target = items.find(i => i.title?.toLowerCase() === linkTitle.toLowerCase())
    if (target) {
      if (target.type === 'essay') {
        setView('essays'); setSelected(target.id); setEssayDraft(target.content || '')
      } else {
        setView(target.type === 'clip' ? 'clips' : 'notes')
        openEdit(target)
      }
    }
  }

  // ── Open settings modal ──────────────────────────────────────────────────
  const openSettings = async () => {
    const key = await window.cortex.settings.get('apiKey')
    setApiKeyInput(key || '')
    setApiKeyStatus('')
    setShowSettings(true)
  }

  // ─────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={S.loadingScreen}>
        <div style={S.loadingLogo}>◈ cortex</div>
        <div style={S.loadingText}>Loading your knowledge base…</div>
      </div>
    )
  }

  return (
    <div style={S.app}>

      {/* ── Mobile header ── */}
      <div className="mobile-header" style={S.mobileHeader}>
        <button style={S.menuBtn} onClick={() => setSidebarOpen(!sidebarOpen)}>
          <Icon name={sidebarOpen ? 'x' : 'menu'} size={20}/>
        </button>
        <span style={S.mobileLogo}>◈ cortex</span>
      </div>

      {/* ── Sidebar ── */}
      <Sidebar
        view={view}
        counts={{ clips: clips.length, notes: notes.length, essays: essays.length }}
        open={sidebarOpen}
        onNavigate={navigate}
        onBookmarklet={() => setShowBookmarklet(true)}
        onSettings={openSettings}
      />

      {/* ── Main content ── */}
      <div style={S.main}>

        {/* Top bar */}
        <div style={S.topBar}>
          <div style={S.searchBox}>
            <Icon name="search" size={16} color="rgba(255,255,255,0.3)"/>
            <input
              ref={searchRef}
              style={S.searchInput}
              placeholder="Search everything…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <div style={S.topActions}>
            {view === 'clips' && !editingId && (
              <button style={S.actionBtn} onClick={() => setShowAddClip(true)}>
                <Icon name="plus" size={16}/> Clip
              </button>
            )}
            {view === 'notes' && !editingId && (
              <button style={S.actionBtn} onClick={handleNewNote}>
                <Icon name="plus" size={16}/> Note
              </button>
            )}
            {view === 'essays' && !selected && (
              <button style={S.actionBtn} onClick={handleNewEssay}>
                <Icon name="plus" size={16}/> Essay
              </button>
            )}
          </div>
        </div>

        {/* ── Modals ── */}

        {/* Add Clip */}
        {showAddClip && (
          <div style={S.overlay} onClick={() => setShowAddClip(false)}>
            <div style={S.modal} onClick={e => e.stopPropagation()}>
              <h3 style={S.modalTitle}>Add Web Clip</h3>
              <input
                style={S.input} placeholder="Source URL (optional)"
                value={newClipUrl} onChange={e => setNewClipUrl(e.target.value)}
              />
              <textarea
                style={{ ...S.input, ...S.textarea }}
                placeholder="Paste your clipped text here…"
                value={newClipText} onChange={e => setNewClipText(e.target.value)}
                autoFocus
              />
              <div style={S.modalActions}>
                <button style={S.closeBtn} onClick={() => setShowAddClip(false)}>Cancel</button>
                <button
                  style={{ ...S.actionBtn, opacity: (!newClipText.trim() || addingClip) ? 0.5 : 1 }}
                  onClick={handleAddClip}
                  disabled={!newClipText.trim() || addingClip}
                >
                  <Icon name="save" size={14}/>
                  {addingClip ? 'Saving…' : 'Save Clip'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bookmarklet */}
        {showBookmarklet && (
          <div style={S.overlay} onClick={() => setShowBookmarklet(false)}>
            <div style={S.modal} onClick={e => e.stopPropagation()}>
              <h3 style={S.modalTitle}>Web Clipper Setup</h3>
              <p style={S.modalText}>
                Drag this button to your bookmarks bar. Click it on any webpage to clip the selected text.
              </p>
              <a
                href={BOOKMARKLET_CODE}
                style={S.bookmarkletLink}
                onClick={e => e.preventDefault()}
                draggable
              >
                📎 Clip to Cortex
              </a>
              <p style={{ ...S.modalText, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                After clipping a page, use "Add Clip" in the app and paste the content. The bookmarklet copies text to your clipboard for easy pasting.
              </p>
              <div style={S.modalActions}>
                <button style={S.closeBtn} onClick={() => setShowBookmarklet(false)}>Got it</button>
              </div>
            </div>
          </div>
        )}

        {/* Settings */}
        {showSettings && (
          <div style={S.overlay} onClick={() => setShowSettings(false)}>
            <div style={S.modal} onClick={e => e.stopPropagation()}>
              <h3 style={S.modalTitle}>Settings</h3>
              <p style={S.modalText}>
                Your OpenAI API key is stored locally and used only for AI features (summaries, chat, essay assistant).
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Icon name="key" size={14} color="rgba(255,255,255,0.3)"/>
                <input
                  style={{ ...S.input, flex: 1 }}
                  type="password"
                  placeholder="sk-..."
                  value={apiKeyInput}
                  onChange={e => setApiKeyInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveApiKey()}
                  autoFocus
                />
              </div>
              <div style={S.modalActions}>
                <span style={{ fontSize: 12, color: '#6ec6f7', marginRight: 'auto', opacity: apiKeyStatus === 'saved' ? 1 : 0, transition: 'opacity 0.3s' }}>
                  ✓ Saved
                </span>
                <button style={S.closeBtn} onClick={() => setShowSettings(false)}>Close</button>
                <button style={S.actionBtn} onClick={handleSaveApiKey}>Save</button>
              </div>
            </div>
          </div>
        )}

        {/* ── CLIPS VIEW ── */}
        {view === 'clips' && !editingId && (
          <div style={S.itemGrid}>
            {clips.length === 0 && (
              <div style={S.emptyState}>
                <Icon name="clip" size={40} color="rgba(255,255,255,0.1)"/>
                <p>No clips yet.</p>
                <p style={{ fontSize: 12 }}>Highlight text on the web and clip it here.</p>
              </div>
            )}
            {clips.map(item => (
              <div
                key={item.id} className="card" style={S.card}
                onClick={() => openEdit(item)}
              >
                <div style={S.cardType}><Icon name="clip" size={12}/> CLIP</div>
                <div style={S.cardTitle}>{item.title}</div>
                <div style={S.cardExcerpt}>{(item.content || '').substring(0, 130)}{item.content?.length > 130 ? '…' : ''}</div>
                {item.summary && (
                  <div style={S.cardSummary}>
                    <Icon name="sparkle" size={12}/>
                    <span>{item.summary.substring(0, 100)}{item.summary.length > 100 ? '…' : ''}</span>
                  </div>
                )}
                <div style={S.cardMeta}>
                  {(item.tags || []).map(t => <span key={t} style={S.tagPill}>{t}</span>)}
                  <span style={S.cardDate}>{new Date(item.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── NOTES VIEW ── */}
        {view === 'notes' && !editingId && (
          <div style={S.itemGrid}>
            {notes.length === 0 && (
              <div style={S.emptyState}>
                <Icon name="note" size={40} color="rgba(255,255,255,0.1)"/>
                <p>No notes yet.</p>
                <p style={{ fontSize: 12 }}>Create one and use [[links]] to connect ideas.</p>
              </div>
            )}
            {notes.map(item => (
              <div
                key={item.id} className="card" style={S.card}
                onClick={() => openEdit(item)}
              >
                <div style={{ ...S.cardType, color: '#6ec6f7' }}><Icon name="note" size={12}/> NOTE</div>
                <div style={S.cardTitle}>{item.title}</div>
                <div style={S.cardExcerpt}>
                  {renderMarkdown((item.content || '').substring(0, 120), handleWikiLinkClick)}
                  {(item.content || '').length > 120 ? '…' : ''}
                </div>
                <div style={S.cardMeta}>
                  {(item.tags || []).map(t => <span key={t} style={S.tagPill}>{t}</span>)}
                  <span style={S.cardDate}>{new Date(item.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── ESSAYS LIST ── */}
        {view === 'essays' && !selected && (
          <div style={S.itemGrid}>
            {essays.length === 0 && (
              <div style={S.emptyState}>
                <Icon name="essay" size={40} color="rgba(255,255,255,0.1)"/>
                <p>No essays yet.</p>
                <p style={{ fontSize: 12 }}>Start writing and pull from your research.</p>
              </div>
            )}
            {essays.map(item => (
              <div
                key={item.id} className="card" style={S.card}
                onClick={() => { setSelected(item.id); setEssayDraft(item.content || ''); setEssayAiResponse('') }}
              >
                <div style={{ ...S.cardType, color: '#b388ff' }}><Icon name="essay" size={12}/> ESSAY</div>
                <div style={S.cardTitle}>{item.title}</div>
                <div style={S.cardExcerpt}>
                  {(item.content || 'No content yet').substring(0, 130)}
                  {(item.content || '').length > 130 ? '…' : ''}
                </div>
                <div style={S.cardMeta}>
                  <span style={S.cardDate}>{new Date(item.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── ESSAY EDITOR ── */}
        {view === 'essays' && selected && selectedItem?.type === 'essay' && (
          <div style={S.essayLayout}>
            <div style={S.essayEditorPane}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <button style={S.backBtn} onClick={() => { setSelected(null); handleSaveEssay() }}>
                  <Icon name="back" size={16}/> All Essays
                </button>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={S.actionBtn} onClick={handleSaveEssay}>
                    <Icon name="save" size={14}/> Save
                  </button>
                  <button style={S.deleteBtn} onClick={() => handleDelete(selected)}>
                    <Icon name="trash" size={14}/>
                  </button>
                </div>
              </div>
              <input
                style={S.essayTitleInput}
                value={selectedItem.title}
                onChange={async e => {
                  const updated = { ...selectedItem, title: e.target.value }
                  upsertLocal(updated)
                  await db.saveItem(updated)
                }}
                placeholder="Essay Title"
              />
              <textarea
                style={S.essayTextarea}
                value={essayDraft}
                onChange={e => setEssayDraft(e.target.value)}
                onBlur={handleSaveEssay}
                placeholder="Start writing… Use [[Note Title]] to reference your notes."
              />
            </div>

            <div style={S.aiPanel}>
              <div style={S.aiPanelTitle}><Icon name="sparkle" size={16}/> Writing Assistant</div>
              <div style={S.aiPanelResponse}>
                {essayAiResponse || (
                  <span style={{ color: 'rgba(255,255,255,0.25)' }}>
                    Ask for help with outlines, arguments, research connections, or rewrites…
                  </span>
                )}
              </div>
              <div style={S.aiPanelInput}>
                <input
                  style={{ ...S.chatInputField, flex: 1 }}
                  placeholder="e.g. Help me outline this essay…"
                  value={essayPrompt}
                  onChange={e => setEssayPrompt(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleEssayAI()}
                  disabled={essayLoading}
                />
                <button style={S.sendBtn} onClick={handleEssayAI} disabled={essayLoading}>
                  {essayLoading
                    ? <span style={{ fontSize: 11 }}>…</span>
                    : <Icon name="sparkle" size={16}/>
                  }
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── EDIT PANEL (clips & notes) ── */}
        {editingId && view !== 'essays' && (
          <div style={S.editPanel}>
            <div style={S.editHeader}>
              <button style={S.backBtn} onClick={() => { setEditingId(null); setSelected(null) }}>
                <Icon name="back" size={16}/> Back
              </button>
              <div style={S.editActions}>
                <button style={S.actionBtn} onClick={handleSaveEdit}>
                  <Icon name="save" size={14}/> Save
                </button>
                <button style={S.deleteBtn} onClick={() => handleDelete(editingId)}>
                  <Icon name="trash" size={14}/>
                </button>
              </div>
            </div>

            <input
              style={S.editTitleInput}
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              placeholder="Title"
            />
            <textarea
              style={S.editTextarea}
              value={editContent}
              onChange={e => setEditContent(e.target.value)}
              placeholder="Content… Use [[Note Title]] to link to other notes."
            />
            <div style={S.editTagsRow}>
              <Icon name="tag" size={14} color="rgba(255,255,255,0.3)"/>
              <input
                style={S.editTagsInput}
                value={editTags}
                onChange={e => setEditTags(e.target.value)}
                placeholder="Tags (comma-separated)"
              />
            </div>

            {selectedItem?.summary && (
              <div style={S.summaryBox}>
                <div style={S.summaryLabel}><Icon name="sparkle" size={14}/> AI Summary</div>
                <div style={S.summaryText}>{selectedItem.summary}</div>
              </div>
            )}

            {selectedItem?.url && (
              <div style={S.sourceUrl}>
                <Icon name="ext" size={12}/>
                <a
                  href={selectedItem.url}
                  style={S.urlLink}
                  onClick={e => { e.preventDefault(); window.cortex.shell.openExternal(selectedItem.url) }}
                >
                  {selectedItem.url}
                </a>
              </div>
            )}

            {backlinks.length > 0 && (
              <div style={S.backlinksSection}>
                <div style={S.backlinksTitle}>REFERENCED BY</div>
                {backlinks.map(bl => (
                  <span
                    key={bl.id} style={S.backlinkPill}
                    onClick={() => openEdit(bl)}
                  >
                    {bl.title}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── GRAPH VIEW ── */}
        {view === 'graph' && (
          <div style={S.graphContainer}>
            <div style={S.graphLegend}>
              <span><span style={S.legendDot('#f59e42')}/> Clips</span>
              <span><span style={S.legendDot('#6ec6f7')}/> Notes</span>
              <span><span style={S.legendDot('#b388ff')}/> Essays</span>
              <span style={S.legendInfo}>Connected by [[links]] and shared tags</span>
            </div>
            {items.length === 0 ? (
              <div style={S.emptyState}>
                <Icon name="graph" size={40} color="rgba(255,255,255,0.1)"/>
                <p>Add notes with [[links]] and shared tags to see your knowledge graph.</p>
              </div>
            ) : (
              <GraphView
                items={items}
                onSelect={id => {
                  const item = items.find(i => i.id === id)
                  if (!item) return
                  if (item.type === 'essay') {
                    setView('essays'); setSelected(id); setEssayDraft(item.content || '')
                  } else {
                    setView(item.type === 'clip' ? 'clips' : 'notes')
                    openEdit(item)
                  }
                }}
              />
            )}
          </div>
        )}

        {/* ── CHAT VIEW ── */}
        {view === 'chat' && (
          <div style={S.chatContainer}>
            <div style={S.chatHeader}>
              <Icon name="sparkle" size={18}/>
              Ask your knowledge base
              <span style={S.chatSubtitle}>{items.length} items indexed</span>
            </div>

            <div style={S.chatMessages}>
              {chatMessages.length === 0 && (
                <div style={S.chatEmpty}>
                  <p>Ask anything about your saved clips, notes, and essays.</p>
                  <div style={S.chatSuggestions}>
                    {[
                      'What are my main research themes?',
                      'Summarize everything about…',
                      'Find connections between…',
                    ].map(s => (
                      <button
                        key={s} style={S.chatSuggestion}
                        onClick={() => setChatInput(s)}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                msg.role === 'user'
                  ? <div key={i} style={S.chatUser}><div style={S.chatUserBubble}>{msg.text}</div></div>
                  : <div key={i} style={S.chatAi}>
                      <Icon name="sparkle" size={14} color="#b388ff"/>
                      <div style={S.chatAiBubble}>{msg.text}</div>
                    </div>
              ))}
              {chatLoading && (
                <div style={S.chatAi}>
                  <Icon name="sparkle" size={14} color="#b388ff"/>
                  <div style={{ ...S.chatAiBubble, color: 'rgba(255,255,255,0.3)' }}>Thinking…</div>
                </div>
              )}
              <div ref={chatEndRef}/>
            </div>

            <div style={S.chatInputBar}>
              <input
                style={S.chatInputField}
                placeholder="Ask about your notes and clips…"
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !chatLoading && handleChat()}
                disabled={chatLoading}
              />
              <button style={S.sendBtn} onClick={handleChat} disabled={chatLoading}>
                <Icon name="sparkle" size={16}/>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
