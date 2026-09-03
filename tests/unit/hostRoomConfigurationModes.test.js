import { afterEach, describe, expect, it } from 'vitest'
import { listingCategoryFromType, supportsPooledRoomInventory, usesPooledRoomInventory } from '../../src/entities/host/hostProfileStore.js'
import { HOST_ROOM_SETUP_MODES, readHostRoomConfigurationDraft, roomConfigurationIsValid, writeHostRoomConfigurationDraft } from '../../src/entities/host/hostRoomTypeDraftStore.js'

const originalWindow = globalThis.window

afterEach(() => {
  if (originalWindow === undefined) delete globalThis.window
  else globalThis.window = originalWindow
})

function installMemoryStorage() {
  const values = new Map()
  globalThis.window = {
    localStorage: {
      getItem: (key) => values.has(key) ? values.get(key) : null,
      setItem: (key, value) => values.set(key, String(value)),
      removeItem: (key) => values.delete(key),
    },
  }
}

function room(overrides = {}) {
  return {
    id: 'room-a',
    name: 'Standard',
    guests: 2,
    beds: 1,
    bathrooms: 1,
    basePrice: 180,
    totalUnits: 1,
    photos: [],
    features: [],
    ...overrides,
  }
}

describe('host hotel and guesthouse room configuration', () => {
  it('accepts one room as a normal single listing', () => {
    expect(roomConfigurationIsValid({
      mode: HOST_ROOM_SETUP_MODES.SINGLE,
      totalRooms: 1,
      roomTypes: [room()],
    })).toBe(true)
  })

  it('accepts multiple identical rooms as one pooled room type', () => {
    expect(roomConfigurationIsValid({
      mode: HOST_ROOM_SETUP_MODES.IDENTICAL,
      totalRooms: 5,
      roomTypes: [room({ totalUnits: 5 })],
    })).toBe(true)
  })

  it('accepts categories where a category may contain one room', () => {
    expect(roomConfigurationIsValid({
      mode: HOST_ROOM_SETUP_MODES.CATEGORIES,
      totalRooms: 6,
      roomTypes: [
        room({ id: 'standard', name: 'Standard', totalUnits: 4 }),
        room({ id: 'deluxe', name: 'Deluxe', totalUnits: 1, basePrice: 240 }),
        room({ id: 'suite', name: 'Suite', totalUnits: 1, basePrice: 320 }),
      ],
    })).toBe(true)
  })

  it('rejects category allocations that do not equal the declared room total', () => {
    expect(roomConfigurationIsValid({
      mode: HOST_ROOM_SETUP_MODES.CATEGORIES,
      totalRooms: 6,
      roomTypes: [
        room({ id: 'standard', totalUnits: 4 }),
        room({ id: 'deluxe', name: 'Deluxe', totalUnits: 1 }),
      ],
    })).toBe(false)
  })

  it('keeps each category booking mode independent when the first category changes', () => {
    installMemoryStorage()
    writeHostRoomConfigurationDraft('hotel-user', {
      mode: HOST_ROOM_SETUP_MODES.CATEGORIES,
      totalRooms: 2,
      roomTypes: [
        room({ id: 'standard', bookingMode: 'instant' }),
        room({ id: 'deluxe', name: 'Deluxe', bookingMode: 'request-first' }),
      ],
    }, { bookingMode: 'instant' })

    const stored = readHostRoomConfigurationDraft('hotel-user', { bookingMode: 'instant' })
    expect(stored.roomTypes.map((item) => item.bookingMode)).toEqual(['instant', 'request-first'])
  })
})

describe('hotel and guesthouse listing categories', () => {
  it('treats hotel and maison d’hôte as room-inventory-capable property types', () => {
    expect(supportsPooledRoomInventory('Hôtel')).toBe(true)
    expect(supportsPooledRoomInventory("Maison d’hôte")).toBe(true)
    expect(supportsPooledRoomInventory("Maison d'hôte")).toBe(true)
    expect(supportsPooledRoomInventory('Villa')).toBe(false)
    expect(supportsPooledRoomInventory('Appartement')).toBe(false)
  })

  it('uses room inventory only when the hospitality offer is sold by room', () => {
    expect(usesPooledRoomInventory('Hôtel', 'private')).toBe(true)
    expect(usesPooledRoomInventory('Hôtel', 'shared')).toBe(true)
    expect(usesPooledRoomInventory("Maison d’hôte", 'private')).toBe(true)
    expect(usesPooledRoomInventory("Maison d’hôte", 'shared')).toBe(true)
    expect(usesPooledRoomInventory("Maison d’hôte", 'entire')).toBe(false)
    expect(usesPooledRoomInventory('Villa', 'entire')).toBe(false)
  })

  it('maps published types onto guest offer categories', () => {
    expect(listingCategoryFromType('Hôtel')).toBe('hotel')
    expect(listingCategoryFromType("Maison d’hôte")).toBe('guesthouse')
    expect(listingCategoryFromType("Maison d'hôte")).toBe('guesthouse')
    expect(listingCategoryFromType('Appartement')).toBe('family')
    expect(listingCategoryFromType('Villa')).toBe('prestige')
  })
})
