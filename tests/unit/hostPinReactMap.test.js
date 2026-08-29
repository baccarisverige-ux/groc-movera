import { describe, expect, it } from 'vitest'
import { hostLocationFromResult, hostPinViewportFromDraft } from '../../src/features/host/onboarding/HostPinMap.jsx'
import { shouldUseReactHostPinMap } from '../../src/features/host/onboarding/hostPinReactEngineEnhancer.jsx'

describe('React host pin map migration boundary', () => {
  it('keeps the React engine opt-in only during the safe migration phase', () => {
    expect(shouldUseReactHostPinMap('')).toBe(false)
    expect(shouldUseReactHostPinMap('?hostMap=legacy')).toBe(false)
    expect(shouldUseReactHostPinMap('?hostMap=react')).toBe(true)
  })

  it('restores a saved host coordinate as the initial viewport', () => {
    expect(hostPinViewportFromDraft({ latitude: 36.8782, longitude: 10.3247 })).toEqual({
      lat: 36.8782,
      lng: 10.3247,
      zoom: 17,
    })
  })

  it('normalizes reverse-geocoded pin output to the existing draft event contract', () => {
    const result = {
      label: '12 Rue Test',
      location: { city: 'La Marsa' },
    }

    expect(hostLocationFromResult(result, { lat: 36.87821, lng: 10.32472 }, {})).toEqual({
      lat: 36.87821,
      lng: 10.32472,
      address: '12 Rue Test',
      city: 'La Marsa',
    })
  })
})
