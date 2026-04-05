// Cortex Web Clipper — Popup Script
'use strict'

const API = 'http://localhost:7777'

// ─── DOM refs ────────────────────────────────────────────────────────────────
const connDot    = document.getElementById('conn-dot')
const connLabel  = document.getElementById('conn-label')
const viewClip   = document.getElementById('view-clip')
const viewDash   = document.getElementById('view-dash')
const previewEl  = document.getElementById('preview-text')
const titleInput = document.getElementById('clip-title')
const tagsInput  = document.getElementById('clip-tags')
const btnSave    = document.getElementById('btn-save')
const btnSaveAI  = document.getElementById('btn-save-ai')
const clipStatus = document.getElementById('clip-status')
const searchInput= document.getElementById('search-input')
const clipsList  = document.getElementById('clips-list')
const btnOpenApp = document.getElementById('btn-open-app')

// ─── State ───────────────────────────────────────────────────────────────────
let connected = false
let selectedText = ''
let currentTab = null

// ─── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  currentTab = tab

  // Check connection + get selected text in parallel
  const [conn, sel] = await Promise.all([
    checkConnection(),
    getSelectedText(tab),
  ])

  connected = conn
  selectedText = sel

  updateConnectionUI()

  if (selectedText) {
    showClipView()
  } else {
    showDashView()
    loadRecentClips()
  }
}

// ─── Connection ───────────────────────────────────────────────────────────────
async function checkConnection() {
  try {
    const res = await fetchTimeout(`${API}/api/health`, {}, 1800)
    return res.ok
  } catch {
    return false
  }
}

function fetchTimeout(url, opts = {}, ms = 2500) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), ms)
  return fetch(url, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(timer))
}

function updateConnectionUI() {
  if (connected) {
    connDot.className = 'conn-dot connected'
    connLabel.textContent = 'Connected'
  } else {
    connDot.className = 'conn-dot disconnected'
    connLabel.textContent = 'Offline'
  }
}

// ─── Selected text ────────────────────────────────────────────────────────────
async function getSelectedText(tab) {
  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.getSelection()?.toString()?.trim() || '',
    })
    return results[0]?.result || ''
  } catch {
    return ''
  }
}

// ─── Clip view ────────────────────────────────────────────────────────────────
function showClipView() {
  viewClip.classList.remove('hidden')
  viewDash.classList.add('hidden')

  // Truncate preview to ~300 chars
  previewEl.textContent = selectedText.length > 300
    ? selectedText.slice(0, 300) + '…'
    : selectedText

  // Default title = page title
  titleInput.value = currentTab?.title || ''
  titleInput.select()
}

async function saveClip(summarize = false) {
  const title = titleInput.value.trim() || currentTab?.url || 'Web Clip'
  const tags  = tagsInput.value.split(',').map(t => t.trim()).filter(Boolean)

  setClipStatus(summarize ? 'Summarizing…' : 'Saving…')
  btnSave.disabled = true
  btnSaveAI.disabled = true

  chrome.runtime.sendMessage({
    action: 'saveClip',
    clip: {
      title,
      content: selectedText,
      url: currentTab?.url || '',
      tags,
      summarize,
    },
  }, (res) => {
    btnSave.disabled = false
    btnSaveAI.disabled = false
    if (res?.ok) {
      setClipStatus(
        res.mode === 'connected' ? '✓ Saved to Cortex' : '✓ Saved (offline)',
        '#6ec6f7'
      )
      setTimeout(() => window.close(), 1000)
    } else {
      setClipStatus('Error saving clip', '#ff5555')
    }
  })
}

function setClipStatus(msg, color = 'rgba(255,255,255,0.3)') {
  clipStatus.style.color = color
  clipStatus.textContent = msg
}

btnSave.addEventListener('click',   () => saveClip(false))
btnSaveAI.addEventListener('click', () => saveClip(true))

// ─── Dashboard view ───────────────────────────────────────────────────────────
function showDashView() {
  viewDash.classList.remove('hidden')
  viewClip.classList.add('hidden')
}

async function loadRecentClips(search = '') {
  chrome.runtime.sendMessage(
    { action: 'getRecentClips', limit: 8, search },
    (clips) => renderClips(Array.isArray(clips) ? clips : [])
  )
}

function renderClips(clips) {
  if (!clips.length) {
    clipsList.innerHTML = `<div class="empty-hint">No clips yet — select text on any page and press <kbd>Alt+Shift+C</kbd></div>`
    return
  }

  clipsList.innerHTML = clips.map(c => {
    const title = escHtml(c.title || 'Untitled')
    const date  = formatDate(c.created_at)
    const tags  = (c.tags || []).slice(0, 3).map(t =>
      `<span class="clip-tag">${escHtml(t)}</span>`
    ).join('')
    const offline = c.mode === 'offline' || !connected
      ? '<span class="offline-badge">local</span>'
      : ''

    return `
      <div class="clip-item" data-url="${escHtml(c.url || '')}">
        <div class="clip-item-title">${title}</div>
        <div class="clip-item-meta">
          <span>${date}</span>
          ${tags}
          ${offline}
        </div>
      </div>
    `
  }).join('')

  // Click → open source URL
  clipsList.querySelectorAll('.clip-item').forEach(el => {
    const url = el.dataset.url
    if (url) el.addEventListener('click', () => chrome.tabs.create({ url }))
  })
}

function formatDate(ts) {
  if (!ts) return ''
  const d = new Date(typeof ts === 'number' ? ts : Date.parse(ts))
  const now = Date.now()
  const diff = now - d.getTime()
  if (diff < 60_000)   return 'just now'
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86400_000)return `${Math.floor(diff / 3600_000)}h ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Search
let searchTimer
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => loadRecentClips(searchInput.value.trim()), 220)
})

// Open app
btnOpenApp.addEventListener('click', () => {
  chrome.tabs.create({ url: 'http://localhost:5173' })
})

// ─── Start ────────────────────────────────────────────────────────────────────
init()
