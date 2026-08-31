import { storageAdapter } from '../../../services/storage/storageAdapter.js'
import { DEFAULT_HOST_DRAFT } from './hostOnboardingModel.js'

const HOST_ONBOARDING_DRAFT_KEY = 'movera:host-onboarding-drafts:v1'

function readAllDrafts() {
  const value = storageAdapter.getJson(HOST_ONBOARDING_DRAFT_KEY, {})
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function cloneRoomTypes(roomTypes) {
  return (Array.isArray(roomTypes) ? roomTypes : []).map((room) => ({
    ...room,
    photos: Array.isArray(room?.photos) ? [...room.photos] : [],
  }))
}

function cloneDefaultDraft() {
  return {
    ...DEFAULT_HOST_DRAFT,
    roomTypes: cloneRoomTypes(DEFAULT_HOST_DRAFT.roomTypes),
    amenities: [...DEFAULT_HOST_DRAFT.amenities],
    highlights: [...DEFAULT_HOST_DRAFT.highlights],
    promotions: [...DEFAULT_HOST_DRAFT.promotions],
    safety: { ...DEFAULT_HOST_DRAFT.safety },
  }
}

export function readHostOnboardingDraft(userId) {
  const fallback = cloneDefaultDraft()
  if (!userId) return fallback
  const draft = readAllDrafts()[userId]
  if (!draft || typeof draft !== 'object') return fallback
  return {
    ...fallback,
    ...draft,
    roomTypes: Array.isArray(draft.roomTypes) && draft.roomTypes.length ? cloneRoomTypes(draft.roomTypes) : fallback.roomTypes,
    amenities: Array.isArray(draft.amenities) ? draft.amenities : fallback.amenities,
    highlights: Array.isArray(draft.highlights) ? draft.highlights : fallback.highlights,
    promotions: Array.isArray(draft.promotions) ? draft.promotions : fallback.promotions,
    safety: { ...fallback.safety, ...(draft.safety && typeof draft.safety === 'object' ? draft.safety : {}) },
  }
}

export function writeHostOnboardingDraft(userId, draft) {
  if (!userId) return
  const drafts = readAllDrafts()
  drafts[userId] = draft
  storageAdapter.setJson(HOST_ONBOARDING_DRAFT_KEY, drafts)
}

export function clearHostOnboardingDraft(userId) {
  if (!userId) return
  const drafts = readAllDrafts()
  delete drafts[userId]
  storageAdapter.setJson(HOST_ONBOARDING_DRAFT_KEY, drafts)
}
