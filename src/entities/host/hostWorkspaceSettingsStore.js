import { storageAdapter } from '../../services/storage/storageAdapter.js'

export const HOST_WORKSPACE_SETTINGS_KEY = 'movera:host-workspace-settings:v1'
export const HOST_WORKSPACE_SETTINGS_EVENT = 'movera:host-workspace-settings-change'

function readAll() {
  const value = storageAdapter.getJson(HOST_WORKSPACE_SETTINGS_KEY, {})
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function normalize(value) {
  const source = value && typeof value === 'object' ? value : {}
  return {
    notifications: {
      reservations: source.notifications?.reservations !== false,
      messages: source.notifications?.messages !== false,
      calendar: source.notifications?.calendar !== false,
    },
    operations: {
      autoArchiveCancelled: Boolean(source.operations?.autoArchiveCancelled),
      compactCalendar: Boolean(source.operations?.compactCalendar),
    },
  }
}

export function readHostWorkspaceSettings(userId) {
  if (!userId) return normalize(null)
  return normalize(readAll()[userId])
}

export function writeHostWorkspaceSettings(userId, value) {
  if (!userId) throw new Error('A user is required to save host settings')
  const all = readAll()
  const next = normalize(value)
  all[userId] = next
  storageAdapter.setJson(HOST_WORKSPACE_SETTINGS_KEY, all)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(HOST_WORKSPACE_SETTINGS_EVENT, { detail: { userId, settings: next } }))
  }
  return next
}
