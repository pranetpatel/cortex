import { useState, useEffect, useCallback } from 'react'
import { getItems, saveItem, deleteItem, searchItems, getItem } from '../services/database'
import { Item, ItemType } from '../types'

export function useItems(type?: ItemType) {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    try {
      setItems(getItems(type))
    } finally {
      setLoading(false)
    }
  }, [type])

  useEffect(() => { load() }, [load])

  const save = useCallback((item: Partial<Item> & { type: ItemType }) => {
    const saved = saveItem(item)
    setItems(prev => {
      const idx = prev.findIndex(i => i.id === saved.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = saved
        return next
      }
      return [saved, ...prev]
    })
    return saved
  }, [])

  const remove = useCallback((id: string) => {
    deleteItem(id)
    setItems(prev => prev.filter(i => i.id !== id))
  }, [])

  return { items, loading, reload: load, save, remove }
}

export function useSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Item[]>([])

  useEffect(() => {
    if (!query.trim()) { setResults([]); return }
    setResults(searchItems(query))
  }, [query])

  return { query, setQuery, results }
}

export function useItem(id: string) {
  const [item, setItem] = useState<Item | null>(null)

  useEffect(() => {
    setItem(getItem(id))
  }, [id])

  const update = useCallback((updates: Partial<Item>) => {
    if (!item) return
    const saved = saveItem({ ...item, ...updates })
    setItem(saved)
    return saved
  }, [item])

  return { item, update }
}
