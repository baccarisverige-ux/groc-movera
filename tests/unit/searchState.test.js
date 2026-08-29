import { describe, expect, it } from 'vitest'
import { buildMapSearchPath, createSearchState, isDateRangeValid, totalTravellers } from '../../src/features/search/searchState.js'

describe('search state', () => {
  it('creates safe defaults', () => {
    expect(createSearchState()).toEqual({
      destination: null,
      checkin: '',
      checkout: '',
      adults: 1,
      children: 0,
      infants: 0,
      pets: 0,
    })
  })

  it('accepts only chronological date ranges', () => {
    expect(isDateRangeValid('2026-09-10', '2026-09-14')).toBe(true)
    expect(isDateRangeValid('2026-09-14', '2026-09-10')).toBe(false)
    expect(isDateRangeValid('', '2026-09-10')).toBe(false)
  })

  it('counts adults and children as travellers', () => {
    expect(totalTravellers({ adults: 2, children: 1 })).toBe(3)
    expect(totalTravellers({ adults: 0, children: 0 })).toBe(1)
  })

  it('builds stable map search parameters', () => {
    const path = buildMapSearchPath({
      destination: { id: 'la-marsa' },
      checkin: '2026-09-10',
      checkout: '2026-09-14',
      adults: 2,
      children: 1,
      infants: 1,
      pets: 1,
    })
    const url = new URL(path, 'https://movera.local')
    expect(url.pathname).toBe('/map')
    expect(url.searchParams.get('destination')).toBe('la-marsa')
    expect(url.searchParams.get('guests')).toBe('3')
    expect(url.searchParams.get('infants')).toBe('1')
    expect(url.searchParams.get('pets')).toBe('1')
    expect(url.searchParams.get('search')).toBe('1')
  })
})
