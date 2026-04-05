// Cortex Web Clipper — Background Service Worker
'use strict'

const API = 'http://localhost:7777'

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8)

async function fetchWithTimeout(url, options = {}, ms = 2500) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), ms)
  try {
    return await fetch(url, { ...options, signal: ctrl.signal })
  } finally {
    clearTimeout(timer)
  }
}

async function isConnected() {
  try {
    const res = await fetchWithTimeout(`${API}/api/health`)
    return res.ok
  } catch {
    return false
  }
}

// ─── BADGE ───────────────────────────────────────────────────────────────────
async function incrementBadge() {
  const { sessionClips = 0 } = await chrome.storage.local.get('sessionClips')
  const next = sessionClips + 1
  await chrome.storage.local.set({ sessionClips: next })
  chrome.action.setBadgeText({ text: next > 99 ? '99+' : String(next) })
  chrome.action.setBadgeBackgroundColor({ color: '#f59e42' })
}

// ─── SAVE CLIP ────────────────────────────────────────────────────────────────
async function saveClip({ title, content, url, tags = [], summary = null }) {
  const connected = await isConnected()

  if (connected) {
    try {
      await fetch(`${API}/api/clips`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, url, tags, summary }),
      })
      await incrementBadge()
      return { ok: true, mode: 'connected' }
    } catch (e) {
      // fall through to local
    }
  }

  // Offline fallback — chrome.storage.local
  const { offlineClips = [] } = await chrome.storage.local.get('offlineClips')
  offlineClips.unshift({
    id: uid(), type: 'clip',
    title: title || url || 'Web Clip',
    content, url, tags, summary,
    created_at: Date.now(),
  })
  await chrome.storage.local.set({ offlineClips: offlineClips.slice(0, 200) })
  await incrementBadge()
  return { ok: true, mode: 'offline' }
}

// ─── CONTEXT MENU ────────────────────────────────────────────────────────────
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'clip-selection',
    title: 'Clip to Cortex',
    contexts: ['selection'],
  })
  // Reset badge on install
  chrome.action.setBadgeText({ text: '' })
})

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== 'clip-selection') return
  // Pass selection to content script to show the inline clip dialog
  chrome.tabs.sendMessage(tab.id, {
    action: 'openClipDialog',
    text: info.selectionText || '',
    title: tab.title || '',
    url: tab.url || '',
  }).catch(() => {
    // Content script not ready — open popup via badge click instead
  })
})

// ─── KEYBOARD SHORTCUT ───────────────────────────────────────────────────────
chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'quick-clip') return

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab) return

  // Get selected text from the page
  let text = ''
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.getSelection()?.toString()?.trim() || '',
    })
    text = results[0]?.result || ''
  } catch {}

  if (!text) {
    chrome.tabs.sendMessage(tab.id, {
      action: 'showToast',
      text: '⚠ Select some text first',
      type: 'warn',
    }).catch(() => {})
    return
  }

  const result = await saveClip({
    title: tab.title || tab.url,
    content: text,
    url: tab.url,
    tags: [],
  })

  chrome.tabs.sendMessage(tab.id, {
    action: 'showToast',
    text: result.mode === 'connected' ? '✓ Clipped to Cortex' : '✓ Clipped (offline)',
    type: 'success',
  }).catch(() => {})
})

// ─── MESSAGES FROM POPUP / CONTENT ───────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === 'saveClip') {
    saveClip(msg.clip).then(sendResponse)
    return true // keep channel open for async
  }

  if (msg.action === 'checkConnection') {
    isConnected().then(ok => sendResponse({ connected: ok }))
    return true
  }

  if (msg.action === 'getRecentClips') {
    getRecentClips(msg.limit || 5, msg.search || '').then(sendResponse)
    return true
  }

  if (msg.action === 'summarize') {
    summarizeText(msg.text).then(summary => sendResponse({ summary }))
    return true
  }

  if (msg.action === 'resetBadge') {
    chrome.storage.local.set({ sessionClips: 0 })
    chrome.action.setBadgeText({ text: '' })
  }
})

// ─── RECENT CLIPS ─────────────────────────────────────────────────────────────
async function getRecentClips(limit = 5, search = '') {
  const connected = await isConnected()

  if (connected) {
    try {
      const params = new URLSearchParams({ limit, ...(search && { search }) })
      const res = await fetchWithTimeout(`${API}/api/clips?${params}`)
      if (res.ok) return await res.json()
    } catch {}
  }

  // Fallback: local storage
  const { offlineClips = [] } = await chrome.storage.local.get('offlineClips')
  let clips = offlineClips
  if (search) {
    const q = search.toLowerCase()
    clips = clips.filter(c =>
      c.title?.toLowerCase().includes(q) || c.content?.toLowerCase().includes(q)
    )
  }
  return clips.slice(0, limit)
}

// ─── AI SUMMARIZE ────────────────────────────────────────────────────────────
async function summarizeText(text) {
  const connected = await isConnected()
  if (!connected) return null
  try {
    const res = await fetchWithTimeout(`${API}/api/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    }, 15000)
    if (res.ok) {
      const data = await res.json()
      return data.summary || null
    }
  } catch {}
  return null
}
