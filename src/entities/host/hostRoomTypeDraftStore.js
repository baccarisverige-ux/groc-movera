import { storageAdapter } from '../../services/storage/storageAdapter.js'

export const HOST_ROOM_TYPE_DRAFT_KEY = 'movera:host-room-type-drafts:v1'

function readAllDrafts() {
  const value = storageAdapter.getJson(HOST_ROOM_TYPE_DRAFT_KEY, {})
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function normalizePhotos(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim()) : []
}

function normalizeRoom(room, index, fallback = {}) {
  const source = room && typeof room === 'object' ? room : {}
  const id = typeof source.id === 'string' && source.id.trim() ? source.id.trim() : `room-type-${index + 1}`
  return {
    id,
    name: typeof source.name === 'string' && source.name.trim() ? source.name.trim() : index === 0 ? 'Chambre Standard' : `Type de chambre ${index + 1}`,
    view: typeof source.view === 'string' ? source.view.trim() : '',
    description: typeof source.description === 'string' ? source.description.trim() : '',
    guests: Math.max(1, Math.min(20, Math.round(Number(source.guests) || Number(fallback.guests) || 2))),
    beds: Math.max(1, Math.min(20, Math.round(Number(source.beds) || Number(fallback.beds) || 1))),
    bathrooms: Math.max(0, Math.min(10, Math.round(Number(source.bathrooms) || Number(fallback.bathrooms) || 1))),
    basePrice: Math.max(1, Math.min(99999, Math.round(Number(source.basePrice) || Number(fallback.basePrice) || 180))),
    totalUnits: Math.max(1, Math.min(999, Math.round(Number(source.totalUnits) || 1))),
    photos: normalizePhotos(source.photos),
  }
}

function defaultRoom(fallback = {}) {
  return normalizeRoom({ id: 'room-standard', name: 'Chambre Standard' }, 0, fallback)
}

export function readHostRoomTypeDraft(userId, fallback = {}) {
  if (!userId) return [defaultRoom(fallback)]
  const value = readAllDrafts()[userId]
  const rooms = Array.isArray(value?.roomTypes) ? value.roomTypes : []
  return rooms.length ? rooms.slice(0, 12).map((room, index) => normalizeRoom(room, index, fallback)) : [defaultRoom(fallback)]
}

export function writeHostRoomTypeDraft(userId, roomTypes, fallback = {}) {
  if (!userId) return []
  const normalized = (Array.isArray(roomTypes) && roomTypes.length ? roomTypes : [defaultRoom(fallback)])
    .slice(0, 12)
    .map((room, index) => normalizeRoom(room, index, fallback))
  const drafts = readAllDrafts()
  drafts[userId] = { roomTypes: normalized, updatedAt: new Date().toISOString() }
  storageAdapter.setJson(HOST_ROOM_TYPE_DRAFT_KEY, drafts)
  return normalized
}

export function clearHostRoomTypeDraft(userId) {
  if (!userId) return
  const drafts = readAllDrafts()
  delete drafts[userId]
  storageAdapter.setJson(HOST_ROOM_TYPE_DRAFT_KEY, drafts)
}
