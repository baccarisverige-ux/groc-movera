import { describe, expect, it } from 'vitest'
import { normalizeHostGuestAccess } from '../../src/entities/host/hostProfileStore.js'

describe('host guest access by property type', () => {
  it('never allows whole-establishment reservations for hotels', () => {
    expect(normalizeHostGuestAccess('Hôtel', 'entire')).toBe('private')
    expect(normalizeHostGuestAccess('Hotel', 'private')).toBe('private')
    expect(normalizeHostGuestAccess('Hôtel', 'shared')).toBe('shared')
    expect(normalizeHostGuestAccess('Hôtel', '')).toBe('private')
  })

  it('allows a guest house to offer rooms or the complete establishment', () => {
    expect(normalizeHostGuestAccess('Maison d’hôte', 'private')).toBe('private')
    expect(normalizeHostGuestAccess("Maison d'hote", 'shared')).toBe('shared')
    expect(normalizeHostGuestAccess('Maison d’hôte', 'entire')).toBe('entire')
    expect(normalizeHostGuestAccess('Maison d’hôte', '')).toBe('private')
  })

  it('preserves normal whole-property semantics for non-hospitality listings', () => {
    expect(normalizeHostGuestAccess('Appartement', 'entire')).toBe('entire')
    expect(normalizeHostGuestAccess('Villa', 'private')).toBe('private')
    expect(normalizeHostGuestAccess('Villa', '')).toBe('entire')
  })
})
