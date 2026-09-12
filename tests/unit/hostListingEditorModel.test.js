import { describe, expect, it } from 'vitest'
import {
  clampNightlyPrice,
  listingArrivalCards,
  listingEditorProgress,
  listingSpaceCards,
  listingSubtitle,
  normalizePricingBounds,
} from '../../src/features/host/listings/hostListingEditorModel.js'

const listing = (overrides = {}) => ({
  id: 'host-1',
  name: 'Villa Saphir',
  type: 'Villa',
  city: 'Gammarth',
  address: '5 rue des Oliviers',
  guestAccess: 'entire',
  guests: 6,
  bedrooms: 3,
  beds: 4,
  bathrooms: 2,
  amenities: ['wifi', 'pool'],
  highlights: ['sea-view'],
  description: 'Une villa lumineuse à deux pas de la plage, pensée pour les familles nombreuses.',
  photos: ['a.jpg', 'b.jpg'],
  roomTypes: [],
  stayRules: { checkInFrom: '15:00', checkOutUntil: '11:00', petsAllowed: false, smokingAllowed: false, eventsAllowed: false },
  arrivalGuide: { instructions: '', wifiName: '', wifiPassword: '', directions: '' },
  ...overrides,
})

const cardById = (cards, id) => cards.find((card) => card.id === id)

describe('listing editor cards', () => {
  it('reads a filled listing as filled', () => {
    const cards = listingSpaceCards(listing())
    expect(cardById(cards, 'photos').value).toBe('2 photos')
    expect(cardById(cards, 'photos').hint).toBe('3 chambres · 4 lits · 2 salles de bain')
    expect(cardById(cards, 'title').value).toBe('Villa Saphir')
    expect(cardById(cards, 'type').value).toBe('Logement entier · Villa')
    expect(cards.every((card) => card.done)).toBe(true)
  })

  it('marks an empty field "À ajouter" rather than showing a blank row', () => {
    const cards = listingSpaceCards(listing({ name: '', photos: [], highlights: [], address: '', city: '' }))
    expect(cardById(cards, 'title').value).toBe('À ajouter')
    expect(cardById(cards, 'title').done).toBe(false)
    expect(cardById(cards, 'photos').done).toBe(false)
    expect(cardById(cards, 'location').done).toBe(false)
  })

  /* The bug this guards: "is there text in the field?" and "would a traveller
     learn anything from it?" are different questions, and answering the first
     lets a twelve-character description count as a written listing. */
  it('does not count a description too short to publish', () => {
    const short = listingSpaceCards(listing({ description: 'Jolie villa.' }))
    expect(cardById(short, 'description').done).toBe(false)
    const long = listingSpaceCards(listing())
    expect(cardById(long, 'description').done).toBe(true)
  })

  it('offers room categories only to a listing that has an inventory', () => {
    expect(cardById(listingSpaceCards(listing()), 'rooms')).toBeUndefined()
    const hotel = listing({
      type: 'Hôtel',
      roomTypes: [{ id: 'r1', name: 'Deluxe', totalUnits: 4 }, { id: 'r2', name: 'Standard', totalUnits: 6 }],
    })
    expect(cardById(listingSpaceCards(hotel), 'rooms').value).toBe('2 catégories · 10 chambres')
  })

  it('keeps the arrival guide on its own tab', () => {
    const cards = listingArrivalCards(listing())
    expect(cards.map((card) => card.id)).toEqual(['checkin', 'instructions', 'wifi', 'rules'])
    expect(cardById(cards, 'checkin').value).toBe('15:00 → 11:00')
    expect(cardById(cards, 'instructions').done).toBe(false)
    expect(cardById(cards, 'rules').value).toBe('Animaux non acceptés · Non-fumeur · Pas d’événement')
  })

  /* The meter counts every card on both tabs. Scoring a hand-picked subset is
     how a screen ends up reading 100% with "À ajouter" rows still visible. */
  it('scores the progress meter over exactly the cards on screen', () => {
    const full = listing()
    const cards = [...listingSpaceCards(full), ...listingArrivalCards(full)]
    const progress = listingEditorProgress(full)
    expect(progress.total).toBe(cards.length)
    expect(progress.done).toBe(cards.filter((card) => card.done).length)
    expect(progress.percent).toBeLessThan(100)

    const complete = listing({ arrivalGuide: { instructions: 'Le code du portail est 4821, la clé est dans la boîte.', wifiName: 'Saphir', wifiPassword: 'x', directions: '' } })
    expect(listingEditorProgress(complete).percent).toBe(100)
  })

  it('writes the subtitle the way a traveller reads the listing', () => {
    expect(listingSubtitle(listing())).toBe('Logement entier · Villa à Gammarth, Tunisie')
    expect(listingSubtitle(listing({ guestAccess: 'private', type: 'Hôtel', city: 'Tunis' })))
      .toBe('Chambre privée · Hôtel à Tunis, Tunisie')
  })
})

describe('pricing bounds', () => {
  it('derives a sane range from the base price when none is set', () => {
    expect(normalizePricingBounds({ base: 200 })).toEqual({ min: 140, max: 320 })
  })

  /* A maximum below the minimum is not a preference, it is a window no price
     can fall into -- so it is corrected rather than stored. */
  it('never returns a range that cannot be satisfied', () => {
    expect(normalizePricingBounds({ min: 300, max: 100, base: 200 })).toEqual({ min: 300, max: 300 })
  })

  it('clamps a nightly price into the range', () => {
    const bounds = { min: 140, max: 320 }
    expect(clampNightlyPrice(90, bounds)).toBe(140)
    expect(clampNightlyPrice(500, bounds)).toBe(320)
    expect(clampNightlyPrice(210, bounds)).toBe(210)
    expect(clampNightlyPrice(210, null)).toBe(210)
  })
})
