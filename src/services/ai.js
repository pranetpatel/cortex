// Renderer-side wrapper around the Electron IPC AI API.
// API calls are made in the main process — the API key never touches the renderer.

export const ai = {
  summarize:  (text)                 => window.cortex.ai.summarize(text),
  chat:       (query, context)       => window.cortex.ai.chat(query, context),
  essayHelp:  (prompt, notes, draft) => window.cortex.ai.essayHelp(prompt, notes, draft),
}
