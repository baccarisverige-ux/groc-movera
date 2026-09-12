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

    // Each category owns its own variant, so the shell can style them apart —
    // but none of them borrows hotel's.
    expect(apartment.presentation.variant).toBe('apartment')
    expect(villa.presentation.variant).toBe('villa')
    expect(getOfferFlow('Maison d’hôte').presentation.variant).toBe('guesthouse')
  })

  /* This used to assert the opposite — that Appartement had no HighlightIcon —
     which recorded a gap rather than a rule: with no icon renderer and no
     highlight groups, three of the four categories fell back to plain text
     chips while Hotel showed grouped cards with colour icons. Same catalogue,
     two different products depending on the property type picked. */
  it('gives every category grouped highlights with icons', () => {
    for (const flow of HOST_OFFER_FLOWS) {
      expect(typeof flow.presentation.AmenityIcon).toBe('function')
      expect(typeof flow.presentation.HighlightIcon).toBe('function')
      expect(flow.highlightGroups.length).toBeGreaterThan(0)
      expect(flow.highlights.length).toBeGreaterThan(0)

      // every declared highlight belongs to a declared group, or it renders
      // into a section that never appears
      const groupIds = new Set(flow.highlightGroups.map((group) => group.id))
      for (const highlight of flow.highlights) {
        expect(groupIds.has(highlight.group)).toBe(true)
      }
    }
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

  /* The guesthouse carried scope 'room-category-when-pooled', a value no
     consumer matched: roomCategoryPhotoRules compares against 'room-category'
     exactly. So it was the one room-inventory category whose photo minimum
     never fired, however its rooms were configured. Both room-inventory flows
     must now name the same scope, or the enforcement silently splits again. */
  it('enforces the same photo scope for every room-inventory category', () => {
    for (const flow of HOST_OFFER_FLOWS) {
      expect(flow.photoPolicy.scope).toBe(flow.supportsRoomInventory ? 'room-category' : 'listing')
    }
  })

  /* The flow owns every sentence that names the property. Before this, only
     the amenities and highlights screens read from copy: a hotel host was
     asked for "les points forts de votre hôtel" and then, one screen later,
     to "donner un titre mémorable à votre logement". French also makes this a
     per-category decision rather than a substitution -- a villa is "spéciale",
     an hôtel is "spécial" -- so each flow writes its own strings. */
  it('names the property in its own words on every screen that mentions it', () => {
    const nouns = {
      Appartement: 'appartement',
      Villa: 'villa',
      'Maison d’hôte': 'maison d’hôte',
      Hôtel: 'hôtel',
    }
    const keys = ['presentationTitle', 'photosTitle', 'titleTitle', 'descriptionTitle', 'amenitiesTitle', 'highlightsTitle']
    for (const [type, noun] of Object.entries(nouns)) {
      const { copy } = getOfferFlow(type)
      for (const key of keys) {
        expect(copy[key]).toBeTruthy()
        expect(copy[key]).not.toContain('votre logement')
      }
      // the four screens that address the property by name use this category's
      for (const key of ['presentationTitle', 'photosTitle', 'titleTitle', 'descriptionTitle']) {
        expect(copy[key].toLowerCase()).toContain(noun)
      }
    }
  })

  it('agrees the adjective with the gender of each category', () => {
    expect(getOfferFlow('Appartement').copy.descriptionTitle).toMatch(/spécial$/)
    expect(getOfferFlow('Hôtel').copy.descriptionTitle).toMatch(/spécial$/)
    expect(getOfferFlow('Villa').copy.descriptionTitle).toMatch(/spéciale$/)
    expect(getOfferFlow('Maison d’hôte').copy.descriptionTitle).toMatch(/spéciale$/)
  })
})
