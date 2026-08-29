import { afterEach, describe, expect, it, vi } from 'vitest'
import { GEOCODING_BROWSER_BRIDGE_KEY, installGeocodingBrowserBridge } from '../../src/services/geocoding/browserBridge.js'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('geocoding browser bridge', () => {
  it('installs one stable bridge for legacy map consumers', () => {
    const target = {}
    const bridge = installGeocodingBrowserBridge(target)

    expect(target[GEOCODING_BROWSER_BRIDGE_KEY]).toBe(bridge)
    expect(bridge.version).toBe(1)
    expect(typeof bridge.searchAddress).toBe('function')
    expect(typeof bridge.reverseGeocode).toBe('function')
    expect(installGeocodingBrowserBridge(target)).toBe(bridge)
  })

  it('keeps legacy-compatible address fields while using the shared service', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [{
        place_id: 77,
        lat: '36.8065',
        lon: '10.1815',
        display_name: '10 Avenue Test, Tunis, Tunisie',
        address: {
          house_number: '10',
          road: 'Avenue Test',
          city: 'Tunis',
          country: 'Tunisie',
          country_code: 'tn',
        },
      }],
    })

    const bridge = installGeocodingBrowserBridge({})
    const [result] = await bridge.searchAddress('Avenue Test', { limit: 1 })

    expect(result.display_name).toBe('10 Avenue Test, Tunis, Tunisie')
    expect(result.address).toMatchObject({ house_number: '10', road: 'Avenue Test', city: 'Tunis' })
    expect(result.viewport).toMatchObject({ lat: 36.8065, lng: 10.1815 })
  })
})
