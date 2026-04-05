# Cortex Web Clipper — Browser Extension

Clip selected text from any webpage straight into your Cortex knowledge base. Works with Chrome and Firefox (Manifest V3).

## Features

- **Right-click → Clip to Cortex** — context menu on any selected text
- **Alt+Shift+C** — keyboard shortcut for instant clipping
- **Toolbar popup** — full clip form with title, tags, AI summarisation, and recent clips list
- **Connected mode** — saves directly to the Cortex desktop app via `localhost:7777`
- **Offline mode** — stores up to 200 clips in `chrome.storage.local` when the desktop app isn't running

## Requirements

- Cortex desktop app running (`npm start` in the repo root)
- Node.js (to generate icons, one-time step)

## Install

### 1. Generate icons

```bash
node extension/generate-icons.js
```

### 2. Build

```bash
bash extension/build.sh
```

This copies all files into `extension/dist/chrome/` and `extension/dist/firefox/`.

### 3. Load in browser

**Chrome / Edge**

1. Navigate to `chrome://extensions`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** → select `extension/dist/chrome/`

**Firefox**

1. Navigate to `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Select `extension/dist/firefox/manifest.json`

## Usage

1. Start the Cortex desktop app — the extension connects automatically.
2. Select any text on a webpage.
3. Use **Alt+Shift+C**, the right-click menu, or the toolbar popup to clip it.
4. Optionally add a title, tags, or click **Save & Summarize** to generate an AI summary (requires OpenAI API key set in Cortex Settings).

## API endpoints (localhost:7777)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Liveness check |
| GET | `/api/clips?limit=&search=` | List recent clips |
| POST | `/api/clips` | Save a new clip |
| POST | `/api/summarize` | AI summarise text |
