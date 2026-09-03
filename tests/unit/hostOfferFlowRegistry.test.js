import { describe, expect, it } from 'vitest'
import { HOST_PROPERTY_TYPES } from '../../src/features/host/onboarding/hostOnboardingModel.js'
import { HOST_OFFER_FLOWS, getOfferFlow } from '../../src/features/host/onboarding/offer-flows/offerFlowRegistry.js'

describe('host offer flow registry', () => {
  it('gives every offer category its own flow', () => {
    expect(HOST_OFFER_FLOWS.map((flow) => flow.propertyType)).toEqual(HOST_PROPERTY_TYPES)
    expect(new Set(HOST_OFFER_FLOWS.map((flow) => flow.id)).size).toBe(HOST_OFFER_FLOWS.length)
    for (const type of HOST_PROPERTY_TYPES) expect(getOfferFlow(type).propertyType).toBe(type)
  })

  it('isolates hotel-only business rules', () => {
    const hotel = getOfferFlow('Hôtel')
    const apartment = getOfferFlow('Appartement')
    const villa = getOfferFlow('Villa')
    expect(hotel.supportsRoomInventory).toBe(true)
    expect(hotel.maxHighlights).toBe(Infinity)
    expect(hotel.amenityGroups.some((group) => group.id.startsWith('hotel-'))).toBe(true)
    expect(apartment.amenityGroups.some((group) => group.id.startsWith('hotel-'))).toBe(false)
    expect(villa.amenityGroups.some((group) => group.id.startsWith('hotel-'))).toBe(false)
    expect(hotel.presentation.variant).toBe('hotel')
    expect(typeof hotel.presentation.HighlightIcon).toBe('function')
    expect(apartment.presentation.variant).toBe('default')
    expect(apartment.presentation.HighlightIcon).toBeNull()
  })

  it('keeps hospitality room inventory separate from single-property offers', () => {
    expect(getOfferFlow('Maison d’hôte').supportsRoomInventory).toBe(true)
    expect(getOfferFlow('Hôtel').supportsRoomInventory).toBe(true)
    expect(getOfferFlow('Appartement').supportsRoomInventory).toBe(false)
    expect(getOfferFlow('Villa').supportsRoomInventory).toBe(false)
  })

  it('keeps room-access policy inside hospitality category flows', () => {
    const hotel = getOfferFlow('Hôtel')
    const guesthouse = getOfferFlow('Maison d’hôte')
    expect(hotel.guestAccess.map((item) => item.id)).toEqual(['private', 'shared'])
    expect(hotel.roomAccessPresentation.options.map((item) => item.id)).toEqual(['private', 'shared'])
    expect(guesthouse.roomAccessPresentation.options.map((item) => item.id)).toEqual(['private', 'shared', 'entire'])
    expect(getOfferFlow('Appartement').roomAccessPresentation).toBeNull()
    expect(getOfferFlow('Villa').roomAccessPresentation).toBeNull()
  })

  it('keeps property selector presentation category-owned', () => {
    expect(getOfferFlow('Appartement').presentation.propertyIcon).toBe('building')
    expect(getOfferFlow('Hôtel').presentation.propertyIcon).toBe('building')
    expect(getOfferFlow('Villa').presentation.propertyIcon).toBe('house')
    expect(getOfferFlow('Maison d’hôte').presentation.propertyIcon).toBe('house')
  })

  it('keeps the hotel photo contract at 5 to 20 photos per room category', () => {
    expect(getOfferFlow('Hôtel').photoPolicy).toEqual({ min: 5, max: 20, scope: 'room-category' })
  })
})
