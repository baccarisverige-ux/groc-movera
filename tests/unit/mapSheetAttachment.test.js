import { describe, expect, it } from 'vitest'
import { MAP_SHEET_EXPANDED_PROGRESS_THRESHOLD } from '../../src/features/map-sheet/core/MapSheetState.js'
import { MAP_SHEET_ATTACHED_EXIT_PROGRESS, nextMapSheetAttached } from '../../src/features/map-sheet/application/useMapSheetAttachment.js'

describe('map sheet attachment state', () => {
  it('enters attachment at the shared expanded threshold', () => {
    expect(nextMapSheetAttached(false, MAP_SHEET_EXPANDED_PROGRESS_THRESHOLD - 0.001)).toBe(false)
    expect(nextMapSheetAttached(false, MAP_SHEET_EXPANDED_PROGRESS_THRESHOLD)).toBe(true)
  })

  it('keeps attachment sticky until the shared exit hysteresis is crossed', () => {
    expect(nextMapSheetAttached(true, MAP_SHEET_ATTACHED_EXIT_PROGRESS + 0.001)).toBe(true)
    expect(nextMapSheetAttached(true, MAP_SHEET_ATTACHED_EXIT_PROGRESS)).toBe(false)
  })
})
