import { useEffect, useState } from 'react'
import { storageAdapter } from '../../services/storage/storageAdapter.js'

export const AUTH_SESSION_KEY = 'movera:auth-session:v1'
const AUTH_SESSION_EVENT = 'movera:auth-session-change'

function normalizeSession(value) {
  if (!value || typeof value !== 'object') return null
  if (value.authenticated !== true) return null
  if (typeof value.userId !== 'string' || !value.userId.trim()) return null
  return {
    authenticated: true,
    userId: value.userId.trim(),
    displayName: typeof value.displayName === 'string' ? value.displayName.trim() : '',
    provider: typeof value.provider === 'string' ? value.provider.trim() : '',
    email: typeof value.email === 'string' ? value.email.trim() : '',
    phone: typeof value.phone === 'string' ? value.phone.trim() : '',
  }
}

export function readAuthSession() {
  return normalizeSession(storageAdapter.getJson(AUTH_SESSION_KEY, null))
}

export function writeAuthSession(session) {
  const next = normalizeSession(session)
  if (!next) throw new Error('Invalid Movera auth session')
  storageAdapter.setJson(AUTH_SESSION_KEY, next)
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(AUTH_SESSION_EVENT, { detail: next }))
  return next
}

export function clearAuthSession() {
  storageAdapter.remove(AUTH_SESSION_KEY)
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(AUTH_SESSION_EVENT, { detail: null }))
}

export function useAuthSession() {
  const [session, setSession] = useState(readAuthSession)

  useEffect(() => {
    const sync = () => setSession(readAuthSession())
    window.addEventListener(AUTH_SESSION_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(AUTH_SESSION_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  return { session, isAuthenticated: Boolean(session) }
}
