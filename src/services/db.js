// Renderer-side wrapper around the Electron IPC database API.
// All calls go to electron/main.js via contextBridge (window.cortex.db).

export const db = {
  getItems:     ()      => window.cortex.db.getItems(),
  saveItem:     (item)  => window.cortex.db.saveItem(item),
  deleteItem:   (id)    => window.cortex.db.deleteItem(id),
  search:       (query) => window.cortex.db.search(query),
  getBacklinks: (id)    => window.cortex.db.getBacklinks(id),
}
