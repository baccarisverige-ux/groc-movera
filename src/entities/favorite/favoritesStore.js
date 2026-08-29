import { useCallback, useEffect, useState } from 'react'
import { storageAdapter } from '../../services/storage/storageAdapter.js'

const FAVORITES_KEY = 'movera:favorites:v1'
const FAVORITES_EVENT = 'movera:favorites-change'

function sanitizeFavoriteIds(value) {
  if (!Array.isArray(value)) return []
  return [...new Set(value.filter((id) => typeof id === 'string' && id.trim()))]
}

export function readFavoriteIds() {
  return sanitizeFavoriteIds(storageAdapter.getJson(FAVORITES_KEY, []))
}

function writeFavoriteIds(ids) {
  const next = sanitizeFavoriteIds(ids)
  storageAdapter.setJson(FAVORITES_KEY, next)
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(FAVORITES_EVENT, { detail: next }))
  return next
}

export function toggleFavoriteId(id) {
  const current = readFavoriteIds()
  return current.includes(id)
    ? writeFavoriteIds(current.filter((favoriteId) => favoriteId !== id))
    : writeFavoriteIds([...current, id])
}

export function useFavorites() {
  const [favoriteIds, setFavoriteIds] = useState(readFavoriteIds)

  useEffect(() => {
    const sync = () => setFavoriteIds(readFavoriteIds())
    window.addEventListener(FAVORITES_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(FAVORITES_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const toggleFavorite = useCallback((id) => {
    const next = toggleFavoriteId(id)
    setFavoriteIds(next)
    return next.includes(id)
  }, [])

  return { favoriteIds, toggleFavorite }
}
