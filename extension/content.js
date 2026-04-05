// Cortex Web Clipper — Content Script
// Handles: toast notifications, inline clip dialog trigger
'use strict'

// ─── TOAST ────────────────────────────────────────────────────────────────────
function showToast(text, type = 'success') {
  // Remove any existing toast
  document.getElementById('cortex-toast')?.remove()

  const toast = document.createElement('div')
  toast.id = 'cortex-toast'

  const color = type === 'warn' ? '#f59e42' : '#6ec6f7'
  const bg = type === 'warn' ? 'rgba(245,158,66,0.12)' : 'rgba(110,198,247,0.1)'

  Object.assign(toast.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    zIndex: '2147483647',
    background: '#18181d',
    color: color,
    border: `1px solid ${bg}`,
    padding: '10px 18px',
    borderRadius: '10px',
    fontSize: '13px',
    fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif",
    fontWeight: '500',
    lineHeight: '1.4',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    pointerEvents: 'none',
    transition: 'opacity 0.2s, transform 0.2s',
    opacity: '0',
    transform: 'translateY(-8px)',
    maxWidth: '280px',
  })

  toast.textContent = text
  document.documentElement.appendChild(toast)

  // Slide in
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.style.opacity = '1'
      toast.style.transform = 'translateY(0)'
    })
  })

  // Slide out and remove
  setTimeout(() => {
    toast.style.opacity = '0'
    toast.style.transform = 'translateY(-8px)'
    setTimeout(() => toast.remove(), 220)
  }, 2200)
}

// ─── INLINE CLIP DIALOG ───────────────────────────────────────────────────────
// Shown when user right-clicks → "Clip to Cortex" (context menu)
function openClipDialog({ text, title, url }) {
  document.getElementById('cortex-dialog')?.remove()
  document.getElementById('cortex-dialog-overlay')?.remove()

  // Overlay
  const overlay = document.createElement('div')
  overlay.id = 'cortex-dialog-overlay'
  Object.assign(overlay.style, {
    position: 'fixed', inset: '0',
    background: 'rgba(0,0,0,0.5)',
    zIndex: '2147483646',
    backdropFilter: 'blur(2px)',
  })

  // Dialog
  const dialog = document.createElement('div')
  dialog.id = 'cortex-dialog'
  Object.assign(dialog.style, {
    position: 'fixed',
    top: '50%', left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: '2147483647',
    background: '#18181d',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '14px',
    padding: '22px',
    width: '380px',
    maxWidth: 'calc(100vw - 40px)',
    fontFamily: "'DM Sans', system-ui, -apple-system, sans-serif",
    color: '#e8e4df',
    boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
  })

  dialog.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
      <span style="font-weight:700;font-size:15px;letter-spacing:-0.02em">◈ Clip to Cortex</span>
      <button id="cortex-close" style="background:none;border:none;color:rgba(255,255,255,0.4);cursor:pointer;font-size:18px;padding:0;line-height:1">×</button>
    </div>
    <div id="cortex-preview" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:10px 12px;font-size:12px;color:rgba(255,255,255,0.55);line-height:1.6;max-height:80px;overflow-y:auto;margin-bottom:12px;white-space:pre-wrap;word-break:break-word"></div>
    <input id="cortex-title" type="text" placeholder="Title" style="width:100%;padding:9px 12px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;color:#e8e4df;font-size:13px;font-family:inherit;outline:none;margin-bottom:8px;box-sizing:border-box" />
    <input id="cortex-tags" type="text" placeholder="Tags (comma-separated)" style="width:100%;padding:9px 12px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;color:#e8e4df;font-size:13px;font-family:inherit;outline:none;margin-bottom:14px;box-sizing:border-box" />
    <div style="display:flex;gap:8px">
      <button id="cortex-save" style="flex:1;padding:9px;background:rgba(245,158,66,0.15);border:1px solid rgba(245,158,66,0.25);border-radius:8px;color:#f59e42;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer">Save Clip</button>
      <button id="cortex-save-ai" style="flex:1;padding:9px;background:rgba(179,136,255,0.1);border:1px solid rgba(179,136,255,0.2);border-radius:8px;color:#b388ff;font-size:13px;font-weight:600;font-family:inherit;cursor:pointer">Save & Summarize</button>
    </div>
    <div id="cortex-status" style="margin-top:10px;font-size:11px;color:rgba(255,255,255,0.3);text-align:center;min-height:16px"></div>
  `

  document.documentElement.appendChild(overlay)
  document.documentElement.appendChild(dialog)

  // Fill fields
  dialog.querySelector('#cortex-preview').textContent = text
  dialog.querySelector('#cortex-title').value = title || ''

  const close = () => {
    overlay.remove(); dialog.remove()
  }

  overlay.addEventListener('click', close)
  dialog.querySelector('#cortex-close').addEventListener('click', close)

  const setStatus = (msg, color = 'rgba(255,255,255,0.3)') => {
    dialog.querySelector('#cortex-status').style.color = color
    dialog.querySelector('#cortex-status').textContent = msg
  }

  async function doSave(summarize = false) {
    const clipTitle = dialog.querySelector('#cortex-title').value.trim() || url
    const tags = dialog.querySelector('#cortex-tags').value
      .split(',').map(t => t.trim()).filter(Boolean)

    setStatus(summarize ? 'Summarizing…' : 'Saving…')

    chrome.runtime.sendMessage({
      action: 'saveClip',
      clip: { title: clipTitle, content: text, url, tags, summarize },
    }, (res) => {
      if (res?.ok) {
        setStatus(
          res.mode === 'connected' ? '✓ Saved to Cortex' : '✓ Saved (offline)',
          '#6ec6f7'
        )
        setTimeout(close, 1200)
      } else {
        setStatus('Error saving clip', '#ff5555')
      }
    })
  }

  dialog.querySelector('#cortex-save').addEventListener('click', () => doSave(false))
  dialog.querySelector('#cortex-save-ai').addEventListener('click', () => doSave(true))
}

// ─── MESSAGE LISTENER ────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action === 'showToast') {
    showToast(msg.text, msg.type)
  }
  if (msg.action === 'openClipDialog') {
    openClipDialog({ text: msg.text, title: msg.title, url: msg.url })
  }
  if (msg.action === 'getSelectedText') {
    sendResponse({ text: window.getSelection()?.toString()?.trim() || '' })
  }
})
