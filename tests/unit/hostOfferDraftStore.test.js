import { afterEach, describe, expect, it } from 'vitest'
import {
  clearHostOfferDraft,
  HOST_ROOM_SETUP_MODES,
  readHostOfferDraft,
  writeHostOnboardingDraft,
  writeHostRoomConfigurationDraft,
} from '../../src/features/host/onboarding/hostOfferDraftStore.js'

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

describe('host offer draft boundary', () => {
  it('hydrates room defaults from the onboarding draft', () => {
    installMemoryStorage()
    writeHostOnboardingDraft('hotel-user', {
      propertyType: 'Hôtel',
      guests: 4,
      beds: 2,
      bathrooms: 2,
      basePrice: '245',
      amenities: ['wifi'],
      highlights: ['breakfast'],
      promotions: ['new-listing'],
      bookingMode: 'request-first',
      safety: { smokeAlarm: true },
    })

    const offer = readHostOfferDraft('hotel-user')
    expect(offer.draft.propertyType).toBe('Hôtel')
    expect(offer.roomConfiguration.roomTypes[0]).toMatchObject({
      guests: 4,
      beds: 2,
      bathrooms: 2,
      basePrice: 245,
      amenities: ['wifi'],
      bookingMode: 'request-first',
    })
  })

  it('clears onboarding and category drafts together after publication', () => {
    installMemoryStorage()
    writeHostOnboardingDraft('hotel-user', { propertyType: 'Hôtel', title: 'Hôtel test' })
    writeHostRoomConfigurationDraft('hotel-user', {
      mode: HOST_ROOM_SETUP_MODES.IDENTICAL,
      totalRooms: 2,
      roomTypes: [{ id: 'standard', name: 'Standard', totalUnits: 2, basePrice: 180 }],
    })

    clearHostOfferDraft('hotel-user')
    const offer = readHostOfferDraft('hotel-user')
    expect(offer.draft.title).toBe('')
    expect(offer.roomConfiguration.mode).toBe(HOST_ROOM_SETUP_MODES.SINGLE)
    expect(offer.roomConfiguration.totalRooms).toBe(1)
  })
})
