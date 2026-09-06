import { describe, expect, it } from 'vitest'
import { buildListingDetailPath, listingRoomTypes, resolveListingRoom } from '../../src/entities/listing/listingRoomSelection.js'

const listing = {
  id: 'hotel-1',
  roomTypes: [
    { id: 'standard', name: 'Standard' },
    { id: 'suite', name: 'Suite' },
  ],
}

describe('listing room selection', () => {
  it('normalizes missing room arrays', () => {
    expect(listingRoomTypes({})).toEqual([])
  })

  it('falls back to the first room for an unknown selection', () => {
    expect(resolveListingRoom(listing, 'missing')?.id).toBe('standard')
  })

  it('builds one canonical listing path for room-aware offers', () => {
    expect(buildListingDetailPath(listing, 'suite')).toBe('/listing/hotel-1?roomType=suite')
    expect(buildListingDetailPath({ id: 'apartment-1' }, '')).toBe('/listing/apartment-1')
  })
})
