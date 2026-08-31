import { storageAdapter } from '../../services/storage/storageAdapter.js'

export const HOST_PUBLIC_IDENTITIES_KEY = 'movera:host-public-identities:v1'
export const HOST_PUBLIC_IDENTITY_EVENT = 'movera:host-public-identity-change'

function readAll() {
  const value = storageAdapter.getJson(HOST_PUBLIC_IDENTITIES_KEY, {})
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function normalize(value) {
  const source = value && typeof value === 'object' ? value : {}
  return {
    displayName: typeof source.displayName === 'string' ? source.displayName.trim().slice(0, 80) : '',
    since: typeof source.since === 'string' ? source.since : '',
  }
}

export function readHostPublicIdentity(userId) {
  if (!userId) return normalize(null)
  return normalize(readAll()[userId])
}

export function writeHostPublicIdentity(userId, value) {
  if (!userId) throw new Error('A host user is required')
  const all = readAll()
  const current = normalize(all[userId])
  const next = normalize({
    ...current,
    ...value,
    since: current.since || value?.since || new Date().toISOString(),
  })
  all[userId] = next
  storageAdapter.setJson(HOST_PUBLIC_IDENTITIES_KEY, all)
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(HOST_PUBLIC_IDENTITY_EVENT, { detail: { userId, identity: next } }))
  return next
}
