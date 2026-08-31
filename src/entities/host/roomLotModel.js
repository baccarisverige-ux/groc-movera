const MAX_UNITS = 999
export const MIN_ROOM_LOTS = 2
export const MAX_ROOM_LOTS = 12
export const DEFAULT_PUBLISHED_ROOMS = 4

function clampInteger(value, min, max, fallback) {
  const number = Math.round(Number(value))
  if (!Number.isFinite(number)) return fallback
  return Math.max(min, Math.min(max, number))
}

function cleanString(value, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback
}

function cleanStringArray(value) {
  if (!Array.isArray(value)) return []
  return value
    .filter((item) => typeof item === 'string' && item.trim())
    .map((item) => item.trim())
    .slice(0, 16)
}

function foldType(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’‘`]/g, "'")
    .toLowerCase()
    .trim()
}

export function supportsRoomLots(type) {
  const normalized = foldType(type)
  return normalized === 'hotel' || normalized === "maison d'hote"
}

export function makeRoomLot(index = 0, fallback = {}, units = 1) {
  const number = index + 1
  return normalizeRoomLot({
    id: `room-lot-${number}`,
    name: number === 1 ? 'Chambre Standard' : `Lot ${number}`,
    totalUnits: units,
  }, index, fallback)
}

export function normalizeRoomLot(value, index = 0, fallback = {}) {
  const source = value && typeof value === 'object' ? value : {}
  const fallbackPrice = clampInteger(fallback.basePrice, 1, 99999, 180)
  const fallbackGuests = clampInteger(fallback.guests, 1, 20, 2)
  const fallbackBeds = clampInteger(fallback.beds, 1, 20, 1)
  const fallbackBathrooms = clampInteger(fallback.bathrooms, 0, 10, 1)
  const id = cleanString(source.id, `room-lot-${index + 1}`) || `room-lot-${index + 1}`

  return {
    id,
    name: cleanString(source.name, index === 0 ? 'Chambre Standard' : `Lot ${index + 1}`) || `Lot ${index + 1}`,
    totalUnits: clampInteger(source.totalUnits ?? source.units, 1, MAX_UNITS, 1),
    view: cleanString(source.view),
    description: cleanString(source.description),
    sizeM2: clampInteger(source.sizeM2, 0, 500, 0),
    guests: clampInteger(source.guests, 1, 20, fallbackGuests),
    beds: clampInteger(source.beds, 1, 20, fallbackBeds),
    bathrooms: clampInteger(source.bathrooms, 0, 10, fallbackBathrooms),
    bedType: cleanString(source.bedType),
    bathroomType: source.bathroomType === 'shared' ? 'shared' : 'private',
    features: cleanStringArray(source.features),
    basePrice: clampInteger(source.basePrice, 1, 99999, fallbackPrice),
    photos: cleanStringArray(source.photos).slice(0, 8),
  }
}

export function normalizeRoomLots(value, fallback = {}) {
  const source = Array.isArray(value) ? value : []
  const seen = new Set()
  return source.slice(0, MAX_ROOM_LOTS).map((item, index) => {
    let lot = normalizeRoomLot(item, index, fallback)
    if (seen.has(lot.id)) lot = { ...lot, id: `${lot.id}-${index + 1}` }
    seen.add(lot.id)
    return lot
  })
}

export function buildInitialRoomLotPlan(fallback = {}, totalRooms = DEFAULT_PUBLISHED_ROOMS) {
  const total = Math.max(MIN_ROOM_LOTS, clampInteger(totalRooms, MIN_ROOM_LOTS, MAX_UNITS, DEFAULT_PUBLISHED_ROOMS))
  const firstUnits = Math.max(1, Math.ceil(total / 2))
  const secondUnits = Math.max(1, total - firstUnits)
  return {
    totalRooms: firstUnits + secondUnits,
    roomLots: [
      normalizeRoomLot({ id: 'room-lot-standard', name: 'Chambre Standard', totalUnits: firstUnits }, 0, fallback),
      normalizeRoomLot({ id: 'room-lot-2', name: 'Deuxième catégorie', totalUnits: secondUnits }, 1, fallback),
    ],
  }
}

export function roomLotTotalUnits(roomLots) {
  return normalizeRoomLots(roomLots).reduce((sum, lot) => sum + lot.totalUnits, 0)
}

export function validateRoomLotPlan({ totalRooms, roomLots }, options = {}) {
  const requireMultiple = options.requireMultiple !== false
  const lots = normalizeRoomLots(roomLots)
  const total = clampInteger(totalRooms, 1, MAX_UNITS, roomLotTotalUnits(lots) || 1)
  const issues = []

  if (requireMultiple && lots.length < MIN_ROOM_LOTS) issues.push(`Ajoutez au moins ${MIN_ROOM_LOTS} lots de chambres.`)
  if (lots.length > MAX_ROOM_LOTS) issues.push(`Maximum ${MAX_ROOM_LOTS} lots.`)

  lots.forEach((lot, index) => {
    if (!lot.name) issues.push(`Le lot ${index + 1} doit avoir un nom.`)
    if (lot.totalUnits < 1) issues.push(`Le lot ${index + 1} doit contenir au moins une chambre.`)
    if (lot.basePrice < 1) issues.push(`Le lot ${index + 1} doit avoir un prix.`)
    if (!lot.description) issues.push(`Ajoutez une description au lot ${index + 1}.`)
    if (!lot.view) issues.push(`Précisez la vue ou particularité du lot ${index + 1}.`)
  })

  const distributed = lots.reduce((sum, lot) => sum + lot.totalUnits, 0)
  if (distributed !== total) issues.push(`Répartissez exactement les ${total} chambres entre les lots.`)

  return {
    ok: issues.length === 0,
    issues,
    totalRooms: total,
    distributedRooms: distributed,
    roomLots: lots,
  }
}
