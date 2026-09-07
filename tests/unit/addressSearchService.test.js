import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/* The provider reads its key at module load, so each scenario stubs the
   environment and then imports a fresh module graph. */
async function loadService({ key } = {}) {
  vi.resetModules()
  if (key) vi.stubEnv('VITE_GOOGLE_PLACES_API_KEY', key)
  else vi.stubEnv('VITE_GOOGLE_PLACES_API_KEY', '')
  vi.stubEnv('VITE_GOOGLE_MAPS_API_KEY', '')
  return import('../../src/services/geocoding/addressSearchService.js')
}

const AUTOCOMPLETE_RESPONSE = {
  suggestions: [
    {
      placePrediction: {
        placeId: 'place-marsa-1',
        text: { text: '12 Rue Movera, La Marsa' },
        structuredFormat: {
          mainText: { text: '12 Rue Movera' },
          secondaryText: { text: 'La Marsa, Tunisie' },
        },
      },
    },
  ],
}

const DETAILS_RESPONSE = {
  id: 'place-marsa-1',
  location: { latitude: 36.8782, longitude: 10.3247 },
  displayName: { text: '12 Rue Movera' },
  formattedAddress: '12 Rue Movera, La Marsa, Tunisie',
  shortFormattedAddress: '12 Rue Movera, La Marsa',
}

function mockPlacesFetch() {
  const calls = []
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = typeof input === 'string' ? input : String(input)
    calls.push({ url, method: init?.method || 'GET', body: init?.body ? JSON.parse(init.body) : null, headers: init?.headers || {} })
    if (url.includes('places:autocomplete')) {
      return { ok: true, json: async () => AUTOCOMPLETE_RESPONSE }
    }
    if (url.includes('/v1/places/')) {
      return { ok: true, json: async () => DETAILS_RESPONSE }
    }
    throw new Error(`Unexpected address request: ${url}`)
  })
  return calls
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

describe('address search service', () => {
  describe('with the Movera Google key configured', () => {
    let service
    let calls

    beforeEach(async () => {
      service = await loadService({ key: 'movera-test-key' })
      calls = mockPlacesFetch()
    })

    it('reports remote search as available', () => {
      expect(service.isRemoteAddressSearchAvailable()).toBe(true)
    })

    it('never returns coordinates from the typing path', async () => {
      const session = service.createAddressSearchSession()
      const suggestions = await service.suggestAddresses('12 Rue Movera', { session })

      expect(suggestions).toHaveLength(1)
      expect(suggestions[0]).toMatchObject({
        placeId: 'place-marsa-1',
        label: '12 Rue Movera',
        subtitle: 'La Marsa, Tunisie',
        source: 'google-places',
      })
      // The whole point of Phase 4: typing costs one autocomplete call and no
      // geocoding whatsoever.
      expect(suggestions[0].viewport).toBeNull()
      expect(calls).toHaveLength(1)
      expect(calls[0].url).toContain('places:autocomplete')
    })

    it('carries one session token across typing and the resolving details call', async () => {
      const session = service.createAddressSearchSession()
      expect(session.token).toBeTruthy()

      await service.suggestAddresses('12 Rue Mov', { session })
      await service.suggestAddresses('12 Rue Movera', { session })
      const [suggestion] = await service.suggestAddresses('12 Rue Movera, La Marsa', { session })
      const resolved = await service.resolveAddressSuggestion(suggestion, { session })

      const autocompleteCalls = calls.filter((call) => call.url.includes('places:autocomplete'))
      const detailCalls = calls.filter((call) => call.url.includes('/v1/places/'))

      expect(autocompleteCalls).toHaveLength(3)
      expect(detailCalls).toHaveLength(1)
      for (const call of autocompleteCalls) expect(call.body.sessionToken).toBe(session.token)
      expect(detailCalls[0].url).toContain(`sessionToken=${session.token}`)

      expect(resolved.viewport).toEqual({ lat: 36.8782, lng: 10.3247, zoom: 16 })
      // The session is spent once details are fetched, so the next lookup opens a new one.
      expect(session.closed).toBe(true)
    })

    it('biases suggestions to Tunisia in French', async () => {
      const session = service.createAddressSearchSession()
      await service.suggestAddresses('Rue Movera', { session })

      expect(calls[0].body).toMatchObject({ languageCode: 'fr', includedRegionCodes: ['tn'] })
      expect(calls[0].headers['X-Goog-Api-Key']).toBe('movera-test-key')
    })

    it('resolves a local Movera suggestion without any network call', async () => {
      const session = service.createAddressSearchSession()
      const local = { id: 'marsa-plage', label: 'La Marsa Plage', subtitle: 'La Marsa', viewport: { lat: 36.8836, lng: 10.3326, zoom: 15 } }

      const resolved = await service.resolveAddressSuggestion(local, { session })

      expect(resolved).toEqual(local)
      expect(calls).toHaveLength(0)
    })

    it('ignores queries shorter than three characters', async () => {
      const session = service.createAddressSearchSession()
      expect(await service.suggestAddresses('ru', { session })).toEqual([])
      expect(calls).toHaveLength(0)
    })
  })

  describe('without a Google key', () => {
    let service
    let calls

    beforeEach(async () => {
      service = await loadService()
      calls = mockPlacesFetch()
    })

    it('reports remote search as unavailable', () => {
      expect(service.isRemoteAddressSearchAvailable()).toBe(false)
    })

    it('makes no request at all while typing, rather than falling back to a public geocoder', async () => {
      const session = service.createAddressSearchSession()
      const suggestions = await service.suggestAddresses('12 Rue Movera', { session })

      expect(suggestions).toEqual([])
      expect(calls).toHaveLength(0)
    })
  })
})
