import { describe, expect, it } from 'vitest'
import {
  SETTINGS_FIELDS,
  formatSettingValue,
  readSettingField,
  settingsField,
  unitSuffix,
  writeSettingField,
} from '../../src/features/host/listings/hostListingSettingsModel.js'

/* b225 splits every setting across two screens: a card that shows the value
   and a page that edits it. They only stay in agreement because one table
   says where each value lives in the draft. These tests hold that table to
   the draft shape the settings screen actually builds. */

const draft = () => ({
  basePrice: 680,
  pricing: { min: 480, max: 980, smart: true },
  fees: { cleaning: 80, pet: 50, extraGuest: 35, extraGuestAfter: 3 },
  stayRules: { minNights: 2, maxNights: 30, advanceNoticeDays: 1, preparationDays: 0 },
})

describe('settings field table', () => {
  it('points every field at a group the draft actually has', () => {
    const shape = draft()
    for (const [id, field] of Object.entries(SETTINGS_FIELDS)) {
      expect(shape, `${id} -> ${field.group}`).toHaveProperty(field.group)
      expect(shape[field.group], `${id}`).toHaveProperty(id)
      expect(field.label, id).toBeTruthy()
      expect(['tnd', 'days', 'count'], id).toContain(field.unit)
    }
  })

  it('returns null for a field that does not exist', () => {
    expect(settingsField('nope')).toBeNull()
  })
})

describe('reading and writing', () => {
  /* The bug this guards: the edit page had one switch per field, and a field
     in the wrong branch reads 0 and writes into a group nobody saves -- the
     host types a number, taps save, and the old value comes back. */
  it('reads each field out of its own group', () => {
    const shape = draft()
    expect(readSettingField(shape, 'min')).toBe(480)
    expect(readSettingField(shape, 'cleaning')).toBe(80)
    expect(readSettingField(shape, 'preparationDays')).toBe(0)
    expect(readSettingField(shape, 'minNights')).toBe(2)
  })

  it('writes each field back where it was read from', () => {
    let shape = draft()
    shape = writeSettingField(shape, 'max', 1200)
    shape = writeSettingField(shape, 'pet', 60)
    shape = writeSettingField(shape, 'advanceNoticeDays', 3)
    expect(shape.pricing.max).toBe(1200)
    expect(shape.fees.pet).toBe(60)
    expect(shape.stayRules.advanceNoticeDays).toBe(3)
    // the other groups are untouched
    expect(shape.pricing.min).toBe(480)
    expect(shape.fees.cleaning).toBe(80)
  })

  /* A maximum below its minimum is a window no stay can fall into. Clamping
     at write time rather than at save time is what stops the card showing a
     number the store will silently replace a moment later. */
  it('never leaves a maximum below its minimum', () => {
    const shape = writeSettingField(draft(), 'maxNights', 1)
    expect(shape.stayRules.maxNights).toBe(2)
    expect(shape.stayRules.minNights).toBe(2)

    const raised = writeSettingField(draft(), 'minNights', 45)
    expect(raised.stayRules.minNights).toBe(45)
    expect(raised.stayRules.maxNights).toBe(45)
  })

  it('refuses values that make no sense for the field', () => {
    expect(writeSettingField(draft(), 'min', 0).pricing.min).toBe(1)
    expect(writeSettingField(draft(), 'minNights', 0).stayRules.minNights).toBe(1)
    expect(writeSettingField(draft(), 'extraGuestAfter', 0).fees.extraGuestAfter).toBe(1)
    // a zero fee is meaningful: it means "do not charge this"
    expect(writeSettingField(draft(), 'cleaning', 0).fees.cleaning).toBe(0)
  })

  it('leaves the draft alone for an unknown field', () => {
    const shape = draft()
    expect(writeSettingField(shape, 'nope', 5)).toBe(shape)
  })
})

describe('formatting', () => {
  it('writes the unit the field is measured in', () => {
    expect(formatSettingValue(480, 'tnd', 'TND')).toBe('480 TND')
    expect(formatSettingValue(1, 'days')).toBe('1 jour')
    expect(formatSettingValue(3, 'days')).toBe('3 jours')
    expect(formatSettingValue(4, 'count')).toBe('4')
  })

  it('labels the edit page with the same unit', () => {
    expect(unitSuffix('tnd', 'TND')).toBe('TND')
    expect(unitSuffix('count')).toBe('')
  })
})
