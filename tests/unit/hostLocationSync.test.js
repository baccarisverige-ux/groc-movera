import { describe, expect, it } from 'vitest'
import { normalizeHostMapLocation } from '../../src/features/host/onboarding/hostLocationSync.js'

describe('host map location sync', () => {
  it('turns a detected map point into a draft patch', () => {
    expect(normalizeHostMapLocation({
      lat: 36.80655,
      lng: 10.18161,
      address: '10 Avenue Habib Bourguiba',
      city: 'Tunis',
    }, {
      address: 'Ancienne adresse',
      city: 'La Marsa',
      pinConfirmed: true,
    })).toEqual({
      address: '10 Avenue Habib Bourguiba',
      city: 'Tunis',
      latitude: 36.80655,
      longitude: 10.18161,
      pinConfirmed: false,
    })
  })

  it('keeps known address fields when reverse geocoding has no label', () => {
    expect(normalizeHostMapLocation({ lat: 36.8, lng: 10.18 }, {
      address: 'Rue existante',
      city: 'Tunis',
    })).toMatchObject({
      address: 'Rue existante',
      city: 'Tunis',
      latitude: 36.8,
      longitude: 10.18,
      pinConfirmed: false,
    })
  })

  it('rejects invalid coordinates', () => {
    expect(normalizeHostMapLocation({ lat: 'x', lng: 10.18 }, {})).toBeNull()
  })
})
