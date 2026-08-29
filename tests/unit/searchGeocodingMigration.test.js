import { afterEach, describe, expect, it, vi } from 'vitest'
import { scanTunisia } from '../../src/services/geocoding/index.js'
import { scanTunisiaByVirtualPinLegacy } from '../../src/features/search/tunisiaPinScannerLegacy.js'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('popup geocoding migration parity', () => {
  it('keeps the centralized scanner output identical to the previous popup scanner', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = new URL(input)
      if (url.pathname.endsWith('/search')) {
        return {
          ok: true,
          json: async () => [{
            place_id: 901,
            lat: '36.8782',
            lon: '10.3247',
            name: 'Résidence Movera Test',
            display_name: 'Résidence Movera Test, Rue Test, La Marsa, Tunisie',
            type: 'residential',
            address: {
              road: 'Rue Test',
              city: 'La Marsa',
              postcode: '2070',
              country: 'Tunisie',
              country_code: 'tn',
            },
          }],
        }
      }

      if (url.pathname.endsWith('/reverse')) {
        return {
          ok: true,
          json: async () => ({
            place_id: 902,
            lat: '36.87821',
            lon: '10.32472',
            display_name: '12 Rue Test, La Marsa, Tunisie',
            address: {
              house_number: '12',
              road: 'Rue Test',
              city: 'La Marsa',
              postcode: '2070',
              country: 'Tunisie',
              country_code: 'tn',
            },
          }),
        }
      }

      throw new Error(`Unexpected geocoding URL: ${url}`)
    })

    const modern = await scanTunisia('Résidence Movera Test')
    const legacy = await scanTunisiaByVirtualPinLegacy('Résidence Movera Test')

    expect(modern).toEqual(legacy)
    expect(modern.detected).toMatchObject({
      label: '12 Rue Test',
      source: 'tunisia-pin-scan',
      viewport: { lat: 36.87821, lng: 10.32472, zoom: 18 },
    })
  })
})
