function ipc() {
  if (typeof window === 'undefined' || !window.cortex) {
    console.error('window.cortex is not available — preload script may have failed to load')
    return null
  }
  return window.cortex
}

export const db = {
  getItems:     ()      => ipc()?.db.getItems()     ?? Promise.resolve([]),
  saveItem:     (item)  => ipc()?.db.saveItem(item)  ?? Promise.resolve({}),
  deleteItem:   (id)    => ipc()?.db.deleteItem(id)  ?? Promise.resolve({}),
  search:       (query) => ipc()?.db.search(query)   ?? Promise.resolve([]),
  getBacklinks: (id)    => ipc()?.db.getBacklinks(id) ?? Promise.resolve([]),
}
