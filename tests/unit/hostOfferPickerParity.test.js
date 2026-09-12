import { describe, expect, it } from 'vitest'
import { guestAccessOptions } from '../../src/features/host/onboarding/offer-flows/shared/offerPickers.jsx'
import { HOST_OFFER_FLOWS, getOfferFlow } from '../../src/features/host/onboarding/offer-flows/offerFlowRegistry.js'

/* A host meets these screens twice: once in the procedure, and again in the
   editor when they come back to change something. They were written twice,
   and the second copy had drifted -- no icons, no detail lines, no group
   symbols, and a generic heading where the first had the category's own
   words. One component renders both now; these tests hold the inputs it
   reads to a single source so the two cannot separate again. */

describe('picker parity', () => {
  it('gives both screens the same catalogue, groups and copy per category', () => {
    for (const flow of HOST_OFFER_FLOWS) {
      const viaRegistry = getOfferFlow(flow.propertyType)
      // the editor looks the flow up by the listing's type string; the
      // procedure holds the flow object. They must be the same object.
      expect(viaRegistry).toBe(flow)

      expect(flow.amenities.length).toBeGreaterThan(0)
      expect(flow.amenityGroups.length).toBeGreaterThan(0)
      expect(flow.highlights.length).toBeGreaterThan(0)
      expect(flow.highlightGroups.length).toBeGreaterThan(0)
      expect(typeof flow.presentation.AmenityIcon).toBe('function')
      expect(typeof flow.presentation.HighlightIcon).toBe('function')
    }
  })

  /* Every sentence the editor puts on a sheet has to exist on the flow, or
     the sheet silently falls back to a generic heading and the two screens
     say different things about the same listing. */
  it('has the copy both screens title themselves with', () => {
    const keys = ['amenitiesTitle', 'amenitiesText', 'highlightsTitle', 'highlightsText', 'photosTitle', 'titleTitle', 'descriptionTitle']
    for (const flow of HOST_OFFER_FLOWS) {
      for (const key of keys) {
        expect(flow.copy[key], `${flow.id}.${key}`).toBeTruthy()
      }
    }
  })

  /* A hôtel and a maison d'hôte describe who is booked in their own words,
     with a recommended badge; a villa and an appartement use the plain
     three-way choice. The editor was showing the plain list to all four. */
  it('describes guest access the way the category does', () => {
    const hotel = getOfferFlow('Hôtel')
    expect(guestAccessOptions(hotel).map((item) => item.label)).toEqual(
      hotel.roomAccessPresentation.options.map((item) => item.label),
    )
    expect(guestAccessOptions(hotel).some((item) => item.badge)).toBe(true)

    const guesthouse = getOfferFlow('Maison d’hôte')
    expect(guestAccessOptions(guesthouse)).toHaveLength(3)
    expect(guestAccessOptions(guesthouse).map((item) => item.id)).toEqual(['private', 'shared', 'entire'])

    const villa = getOfferFlow('Villa')
    expect(villa.roomAccessPresentation).toBeNull()
    expect(guestAccessOptions(villa).map((item) => item.id)).toEqual(villa.guestAccess.map((item) => item.id))
    expect(guestAccessOptions(villa).every((item) => item.description)).toBe(true)
  })

  it('carries a description on every access option, in both places', () => {
    for (const flow of HOST_OFFER_FLOWS) {
      for (const option of guestAccessOptions(flow)) {
        expect(option.label, `${flow.id} label`).toBeTruthy()
        expect(option.description, `${flow.id} ${option.id} description`).toBeTruthy()
      }
    }
  })
})
