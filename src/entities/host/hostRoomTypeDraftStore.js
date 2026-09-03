import { storageAdapter } from '../../services/storage/storageAdapter.js'

export const HOST_ROOM_TYPE_DRAFT_KEY = 'movera:host-room-type-drafts:v1'

export const HOST_ROOM_SETUP_MODES = Object.freeze({
  SINGLE: 'single',
  MULTIPLE_UNSET: 'multiple-unset',
  IDENTICAL: 'identical',
  CATEGORIES: 'categories',
})

function readAllDrafts() {
  const value = storageAdapter.getJson(HOST_ROOM_TYPE_DRAFT_KEY, {})
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function clampInt(value, min, max, fallback) {
  const number = Math.round(Number(value))
  return Math.max(min, Math.min(max, Number.isFinite(number) ? number : fallback))
}

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizePhotos(value) {
  return Array.isArray(value)
    ? value.filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim()).slice(0, 20)
    : []
}

function normalizeFeatures(value) {
  return Array.isArray(value)
    ? value.filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim()).slice(0, 8)
    : []
}

function normalizeIds(value, max = 80) {
  return Array.isArray(value)
    ? [...new Set(value.filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim()))].slice(0, max)
    : []
}

function normalizeSafety(value, fallback = {}) {
  const source = value && typeof value === 'object' ? value : {}
  return {
    exteriorCamera: Boolean(source.exteriorCamera ?? fallback.exteriorCamera),
    noiseMonitor: Boolean(source.noiseMonitor ?? fallback.noiseMonitor),
    weapons: Boolean(source.weapons ?? fallback.weapons),
    smokeAlarm: Boolean(source.smokeAlarm ?? fallback.smokeAlarm),
    carbonMonoxideAlarm: Boolean(source.carbonMonoxideAlarm ?? fallback.carbonMonoxideAlarm),
  }
}

function normalizeRoom(room, index, fallback = {}) {
  const source = room && typeof room === 'object' ? room : {}
  const id = cleanString(source.id) || `room-type-${index + 1}`
  const fallbackName = index === 0 ? 'Chambre' : `Catégorie ${index + 1}`
  return {
    id,
    name: cleanString(source.name) || fallbackName,
    view: cleanString(source.view),
    description: cleanString(source.description),
    surface: clampInt(source.surface, 0, 1000, 0),
    guests: clampInt(source.guests, 1, 20, Number(fallback.guests) || 2),
    beds: clampInt(source.beds, 1, 20, Number(fallback.beds) || 1),
    bedType: cleanString(source.bedType),
    bathrooms: clampInt(source.bathrooms, 0, 10, Number(fallback.bathrooms) || 1),
    bathroomType: source.bathroomType === 'shared' ? 'shared' : 'private',
    basePrice: clampInt(source.basePrice, 1, 99999, Number(fallback.basePrice) || 180),
    totalUnits: clampInt(source.totalUnits, 1, 999, 1),
    features: normalizeFeatures(source.features),
    amenities: normalizeIds(Array.isArray(source.amenities) ? source.amenities : fallback.amenities),
    highlights: normalizeIds(Array.isArray(source.highlights) ? source.highlights : fallback.highlights, 30),
    promotions: normalizeIds(Array.isArray(source.promotions) ? source.promotions : fallback.promotions, 10),
    bookingMode: source.bookingMode === 'instant' ? 'instant' : (fallback.bookingMode === 'instant' ? 'instant' : 'request-first'),
    safety: normalizeSafety(source.safety, fallback.safety),
    photos: normalizePhotos(source.photos),
  }
}

function defaultRoom(fallback = {}, totalUnits = 1) {
  return normalizeRoom({
    id: 'room-standard',
    name: 'Chambre',
    totalUnits,
  }, 0, fallback)
}

function inferLegacyConfiguration(value, fallback = {}) {
  const sourceRooms = Array.isArray(value?.roomTypes) ? value.roomTypes : []
  const normalizedRooms = sourceRooms.slice(0, 12).map((room, index) => normalizeRoom(room, index, fallback))
  const summedUnits = normalizedRooms.reduce((sum, room) => sum + room.totalUnits, 0)
  const fallbackTotal = clampInt(fallback.totalRooms, 1, 999, 1)
  const totalRooms = clampInt(value?.totalRooms, 1, 999, summedUnits || fallbackTotal)

  let mode = value?.mode
  const validModes = Object.values(HOST_ROOM_SETUP_MODES)
  if (!validModes.includes(mode)) {
    if (normalizedRooms.length > 1) mode = HOST_ROOM_SETUP_MODES.CATEGORIES
    else if ((normalizedRooms[0]?.totalUnits || totalRooms) > 1) mode = HOST_ROOM_SETUP_MODES.IDENTICAL
    else mode = HOST_ROOM_SETUP_MODES.SINGLE
  }

  if (totalRooms <= 1) mode = HOST_ROOM_SETUP_MODES.SINGLE
  if (mode === HOST_ROOM_SETUP_MODES.SINGLE) {
    return {
      mode,
      totalRooms: 1,
      roomTypes: [{ ...(normalizedRooms[0] || defaultRoom(fallback)), totalUnits: 1 }],
    }
  }

  if (mode === HOST_ROOM_SETUP_MODES.MULTIPLE_UNSET) {
    return {
      mode,
      totalRooms,
      roomTypes: [{ ...(normalizedRooms[0] || defaultRoom(fallback, totalRooms)), totalUnits: totalRooms }],
    }
  }

  if (mode === HOST_ROOM_SETUP_MODES.IDENTICAL) {
    return {
      mode,
      totalRooms,
      roomTypes: [{ ...(normalizedRooms[0] || defaultRoom(fallback, totalRooms)), totalUnits: totalRooms }],
    }
  }

  let roomTypes = normalizedRooms
  if (roomTypes.length < 2) {
    const firstUnits = 1
    const secondUnits = Math.max(1, totalRooms - firstUnits)
    roomTypes = [
      normalizeRoom({ ...(roomTypes[0] || {}), id: roomTypes[0]?.id || 'room-category-1', name: roomTypes[0]?.name || 'Catégorie 1', totalUnits: firstUnits }, 0, fallback),
      normalizeRoom({ id: 'room-category-2', name: 'Catégorie 2', totalUnits: secondUnits }, 1, fallback),
    ]
  }

  return {
    mode: HOST_ROOM_SETUP_MODES.CATEGORIES,
    totalRooms,
    roomTypes: roomTypes.slice(0, 12),
  }
}

export function readHostRoomConfigurationDraft(userId, fallback = {}) {
  if (!userId) return inferLegacyConfiguration(null, fallback)
  return inferLegacyConfiguration(readAllDrafts()[userId], fallback)
}

export function writeHostRoomConfigurationDraft(userId, configuration, fallback = {}) {
  if (!userId) return inferLegacyConfiguration(configuration, fallback)
  const normalized = inferLegacyConfiguration(configuration, fallback)
  const drafts = readAllDrafts()
  drafts[userId] = {
    mode: normalized.mode,
    totalRooms: normalized.totalRooms,
    roomTypes: normalized.roomTypes,
    updatedAt: new Date().toISOString(),
  }
  storageAdapter.setJson(HOST_ROOM_TYPE_DRAFT_KEY, drafts)
  return normalized
}

export function roomConfigurationIsValid(configuration) {
  const setup = configuration && typeof configuration === 'object' ? configuration : {}
  const totalRooms = clampInt(setup.totalRooms, 1, 999, 1)
  const rooms = Array.isArray(setup.roomTypes) ? setup.roomTypes : []

  if (setup.mode === HOST_ROOM_SETUP_MODES.SINGLE) return totalRooms === 1 && rooms.length === 1
  if (setup.mode === HOST_ROOM_SETUP_MODES.MULTIPLE_UNSET) return false
  if (setup.mode === HOST_ROOM_SETUP_MODES.IDENTICAL) {
    return totalRooms > 1 && rooms.length === 1 && Number(rooms[0]?.totalUnits) === totalRooms
  }
  if (setup.mode !== HOST_ROOM_SETUP_MODES.CATEGORIES || totalRooms < 2 || rooms.length < 2) return false

  const assigned = rooms.reduce((sum, room) => sum + clampInt(room?.totalUnits, 1, 999, 1), 0)
  return assigned === totalRooms && rooms.every((room) => (
    cleanString(room?.name).length >= 2
    && Number(room?.basePrice) > 0
    && Number(room?.guests) >= 1
    && Number(room?.beds) >= 1
  ))
}

export function readHostRoomTypeDraft(userId, fallback = {}) {
  return readHostRoomConfigurationDraft(userId, fallback).roomTypes
}

export function writeHostRoomTypeDraft(userId, roomTypes, fallback = {}) {
  const normalizedRooms = (Array.isArray(roomTypes) && roomTypes.length ? roomTypes : [defaultRoom(fallback)])
    .slice(0, 12)
    .map((room, index) => normalizeRoom(room, index, fallback))
  const totalRooms = normalizedRooms.reduce((sum, room) => sum + room.totalUnits, 0) || 1
  const mode = normalizedRooms.length > 1
    ? HOST_ROOM_SETUP_MODES.CATEGORIES
    : totalRooms > 1
      ? HOST_ROOM_SETUP_MODES.IDENTICAL
      : HOST_ROOM_SETUP_MODES.SINGLE
  return writeHostRoomConfigurationDraft(userId, { mode, totalRooms, roomTypes: normalizedRooms }, fallback).roomTypes
}

export function clearHostRoomTypeDraft(userId) {
  if (!userId) return
  const drafts = readAllDrafts()
  delete drafts[userId]
  storageAdapter.setJson(HOST_ROOM_TYPE_DRAFT_KEY, drafts)
}
