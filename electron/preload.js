const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('cortex', {
  db: {
    getItems:     ()           => ipcRenderer.invoke('db:getItems'),
    saveItem:     (item)       => ipcRenderer.invoke('db:saveItem', item),
    deleteItem:   (id)         => ipcRenderer.invoke('db:deleteItem', id),
    search:       (query)      => ipcRenderer.invoke('db:search', query),
    getBacklinks: (id)         => ipcRenderer.invoke('db:getBacklinks', id),
  },
  ai: {
    summarize:  (text)                    => ipcRenderer.invoke('ai:summarize', text),
    chat:       (query, context)          => ipcRenderer.invoke('ai:chat', query, context),
    essayHelp:  (prompt, notes, draft)    => ipcRenderer.invoke('ai:essayHelp', prompt, notes, draft),
  },
  settings: {
    get:       (key)        => ipcRenderer.invoke('settings:get', key),
    set:       (key, value) => ipcRenderer.invoke('settings:set', key, value),
    hasApiKey: ()           => ipcRenderer.invoke('settings:hasApiKey'),
  },
  shell: {
    openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
  },
})
