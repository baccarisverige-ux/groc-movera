import { afterEach, describe, expect, it, vi } from 'vitest'
import { scanTunisia, searchAddress } from '../../src/services/geocoding/index.js'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('geocoding service', () => {
  it('keeps Tunisia-only search semantics and preserves mapped places', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [
        {
          place_id: 101,
          lat: '36.8782',
          lon: '10.3247',
          name: 'Résidence Test',
          display_name: 'Résidence Test, La Marsa, Tunisie',
          type: 'residential',
          address: {
            road: 'Rue Test',
            city: 'La Marsa',
            country: 'Tunisie',
            country_code: 'tn',
          },
        },
        {
          place_id: 202,
          lat: '48.8566',
          lon: '2.3522',
          display_name: 'Paris, France',
          address: { city: 'Paris', country: 'France', country_code: 'fr' },
        },
      ],
    })

    const results = await searchAddress('Résidence Test')

    expect(results).toHaveLength(1)
    expect(results[0].label).toBe('Résidence Test')
    expect(results[0].viewport).toMatchObject({ lat: 36.8782, lng: 10.3247 })

    const url = new URL(fetchMock.mock.calls[0][0])
    expect(url.pathname).toBe('/search')
    expect(url.searchParams.get('countrycodes')).toBe('tn')
    expect(url.searchParams.get('addressdetails')).toBe('1')
    expect(url.searchParams.get('namedetails')).toBe('1')
    expect(url.searchParams.get('q')).toBe('Résidence Test')
  })

  it('scans candidate coordinates with a zoom-18 reverse lookup', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [{
          place_id: 301,
          lat: '36.8065',
          lon: '10.1815',
          display_name: 'Avenue Habib Bourguiba, Tunis, Tunisie',
          address: {
            road: 'Avenue Habib Bourguiba',
            city: 'Tunis',
            country: 'Tunisie',
            country_code: 'tn',
          },
        }],
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          place_id: 302,
          lat: '36.80655',
          lon: '10.18161',
          display_name: '10 Avenue Habib Bourguiba, Tunis, Tunisie',
          address: {
            house_number: '10',
            road: 'Avenue Habib Bourguiba',
            city: 'Tunis',
            country: 'Tunisie',
            country_code: 'tn',
          },
        }),
      })

    const candidateSpy = vi.fn()
    const result = await scanTunisia('Avenue Habib Bourguiba', { onCandidate: candidateSpy })

    expect(candidateSpy).toHaveBeenCalledTimes(1)
    expect(result.detected.label).toBe('10 Avenue Habib Bourguiba')
    expect(result.detected.source).toBe('tunisia-pin-scan')
    expect(result.detected.viewport).toEqual({ lat: 36.80655, lng: 10.18161, zoom: 18 })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    const reverseUrl = new URL(fetchMock.mock.calls[1][0])
    expect(reverseUrl.pathname).toBe('/reverse')
    expect(reverseUrl.searchParams.get('zoom')).toBe('18')
    expect(reverseUrl.searchParams.get('lat')).toBe('36.8065')
    expect(reverseUrl.searchParams.get('lon')).toBe('10.1815')
  })

  it('does not call the provider for an incomplete query', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    await expect(scanTunisia('ab')).resolves.toEqual({ detected: null, suggestions: [] })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
