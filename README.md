# ◈ Cortex

> Your personal second brain — clip, note, connect, write.

Cortex is a local-first desktop app for personal knowledge management. Clip content from the web, take linked notes, visualize how ideas connect, and write essays with an AI assistant that has full access to your research.

All data lives in a local SQLite database. Nothing leaves your machine except API calls to Anthropic for AI features.

---

## Features

- **Web Clipping** — Paste URLs and highlighted text; Claude auto-summarizes each clip
- **Linked Notes** — Markdown-style notes with `[[Wiki Link]]` bidirectional linking
- **Knowledge Graph** — Force-directed graph showing clips, notes, and essays connected by links and shared tags
- **Essay Workspace** — Distraction-free editor with an AI writing assistant that has access to all your research
- **AI Chat** — Ask questions across your entire knowledge base
- **Full-text Search** — Search across titles, content, and tags

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | Electron 33 |
| UI | React 18 + Vite |
| Database | SQLite via sql.js (WebAssembly) |
| AI | Anthropic Claude (claude-sonnet-4-20250514) |
| Packaging | electron-builder |

---

## Prerequisites

Node.js 18+ and npm. No native compilation required — the database layer uses sql.js (pure WebAssembly SQLite).

---

## Installation

```bash
# 1. Clone the repo
git clone https://github.com/pranetpatel/cortex.git
cd cortex

# 2. Install dependencies
npm install

# 3. Add your Anthropic API key
cp .env.example .env
# Edit .env and add: ANTHROPIC_API_KEY=sk-ant-...
# (You can also set it in the app via Settings)

# 4. Start the app
npm run dev
```

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite + Electron in development mode |
| `npm run build` | Build the renderer (Vite) |
| `npm run package` | Build + package the app with electron-builder |

---

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl/Cmd + N` | New note |
| `Ctrl/Cmd + K` | Focus search |
| `Ctrl/Cmd + G` | Toggle graph view |
| `Ctrl/Cmd + S` | Save current item |

---

## Project Structure

```
cortex/
├── electron/
│   ├── main.js        # Main process: SQLite, IPC, Anthropic API
│   └── preload.js     # contextBridge API exposure
├── src/
│   ├── App.jsx        # Main app component
│   ├── main.jsx       # React entry point
│   ├── components/
│   │   ├── GraphView.jsx
│   │   ├── Icons.jsx
│   │   └── Sidebar.jsx
│   ├── services/
│   │   ├── db.js      # IPC wrapper for database
│   │   └── ai.js      # IPC wrapper for AI calls
│   └── styles/
│       └── global.css
└── vite.config.js
```

---

## Roadmap

- [ ] Chrome / Firefox browser extension for one-click clipping
- [ ] Mobile companion app (React Native)
- [ ] Telegram bot to clip and query from anywhere
- [ ] PDF import and annotation
- [ ] Export to Markdown / Obsidian vault

---

## License

MIT
