import { describe, expect, it } from 'vitest'
import { HOST_ROOM_SETUP_MODES, roomConfigurationIsValid } from '../../src/entities/host/hostRoomTypeDraftStore.js'

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
})
