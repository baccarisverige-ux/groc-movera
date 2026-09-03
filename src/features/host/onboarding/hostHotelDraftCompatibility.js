import { storageAdapter } from '../../../services/storage/storageAdapter.js'

const AUTH_KEY = 'movera:auth-session:v1'
const DRAFT_KEY = 'movera:host-onboarding-drafts:v1'

function foldType(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’‘`]/g, "'")
    .toLowerCase()
    .trim()
}

function normalizeHotelDrafts() {
  const drafts = storageAdapter.getJson(DRAFT_KEY, {})
  if (!drafts || typeof drafts !== 'object' || Array.isArray(drafts)) return false

  const session = storageAdapter.getJson(AUTH_KEY, null)
  const activeUserId = typeof session?.userId === 'string' ? session.userId : ''
  let changed = false
  let activeHotel = false

  for (const [userId, draft] of Object.entries(drafts)) {
    if (!draft || typeof draft !== 'object') continue
    const isHotel = foldType(draft.propertyType) === 'hotel'
    if (!isHotel) continue
    if (userId === activeUserId) activeHotel = true
    if (draft.propertyType !== 'Hôtel') {
      drafts[userId] = { ...draft, propertyType: 'Hôtel' }
      changed = true
    }
  }

  if (changed) {
    storageAdapter.setJson(DRAFT_KEY, drafts)
    window.dispatchEvent(new CustomEvent('movera:host-draft-normalized', { detail: { propertyType: 'Hôtel' } }))
  }

  if (document.documentElement) {
    document.documentElement.dataset.moveraActiveHotelDraft = activeHotel ? 'true' : 'false'
  }
  return activeHotel
}

function scheduleNormalize() {
  window.requestAnimationFrame(normalizeHotelDrafts)
}

if (typeof window !== 'undefined') {
  normalizeHotelDrafts()
  window.addEventListener('pageshow', scheduleNormalize)
  window.addEventListener('focus', scheduleNormalize)
  window.addEventListener('popstate', scheduleNormalize)
  window.addEventListener('movera:host-profile-change', scheduleNormalize)
}
