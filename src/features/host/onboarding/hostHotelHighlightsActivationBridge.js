import { storageAdapter } from '../../../services/storage/storageAdapter.js'

const DRAFT_KEY = 'movera:host-onboarding-drafts:v1'
const ROOM_DRAFT_KEY = 'movera:host-room-type-drafts:v1'
const HIGHLIGHT_EVENT = 'movera:hotel-highlights-change'

function foldType(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’‘`]/g, "'")
    .toLowerCase()
    .trim()
}

function readObject(key) {
  const value = storageAdapter.getJson(key, {})
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function hasProfessionalRoomDraft(userId) {
  const roomDrafts = readObject(ROOM_DRAFT_KEY)
  const roomDraft = userId ? roomDrafts[userId] : null
  if (!roomDraft || typeof roomDraft !== 'object') return false
  const roomTypes = Array.isArray(roomDraft.roomTypes) ? roomDraft.roomTypes : []
  return roomDraft.mode === 'categories' || Number(roomDraft.totalRooms) > 1 || roomTypes.length > 1
}

function canonicalizeHotelDrafts() {
  const drafts = readObject(DRAFT_KEY)
  let changed = false
  let hotelFound = false

  for (const [userId, draft] of Object.entries(drafts)) {
    if (!draft || typeof draft !== 'object') continue
    const type = foldType(draft.propertyType)

    if (type === 'hotel') {
      hotelFound = true
      if (draft.propertyType !== 'Hôtel') {
        drafts[userId] = { ...draft, propertyType: 'Hôtel' }
        changed = true
      }
      continue
    }

    if (!type && hasProfessionalRoomDraft(userId)) {
      drafts[userId] = { ...draft, propertyType: 'Hôtel' }
      hotelFound = true
      changed = true
    }
  }

  if (changed) storageAdapter.setJson(DRAFT_KEY, drafts)
  return hotelFound
}

let scheduled = false
function verifyHighlightsActivation() {
  scheduled = false
  const page = document.querySelector('.host-onboarding[data-screen="highlights"]')
  if (!page) return

  const hotelContext = canonicalizeHotelDrafts()
  if (!hotelContext) return

  if (!page.querySelector('.host-hotel-highlights')) {
    window.dispatchEvent(new CustomEvent(HIGHLIGHT_EVENT, { detail: { reason: 'activation-bridge' } }))
    window.requestAnimationFrame(() => {
      if (!page.querySelector('.host-hotel-highlights')) {
        window.dispatchEvent(new CustomEvent(HIGHLIGHT_EVENT, { detail: { reason: 'activation-retry' } }))
      }
    })
  }
}

function scheduleVerification() {
  if (scheduled) return
  scheduled = true
  window.requestAnimationFrame(verifyHighlightsActivation)
}

if (typeof window !== 'undefined') {
  const start = () => {
    if (!document.body) return
    const observer = new MutationObserver(scheduleVerification)
    observer.observe(document.body, { childList: true, subtree: true })
    scheduleVerification()
    window.addEventListener('pageshow', scheduleVerification)
    window.addEventListener('popstate', scheduleVerification)
    window.addEventListener('focus', scheduleVerification)
    document.addEventListener('visibilitychange', scheduleVerification)
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true })
  else start()
}
