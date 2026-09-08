import { describe, expect, it } from 'vitest'
import { MARKER_BOX, resolveMarkerCollisions } from '../../src/features/map-engine/model/markerCollision.js'

const viewport = { lat: 36.8065, lng: 10.1815, zoom: 11 }
const size = { width: 390, height: 700 }

/* Two coordinates close enough that their 72x40 boxes overlap at zoom 11, and
   one far enough away that it never can. */
const near = [
  { id: 'alpha', lat: 36.8782, lng: 10.3247, price: '380 TND' },
  { id: 'bravo', lat: 36.8783, lng: 10.3248, price: '330 TND' },
]
const far = { id: 'charlie', lat: 36.5, lng: 9.5, price: '120 TND' }

describe('resolveMarkerCollisions', () => {
  it('keeps one of an overlapping pair and folds the other into its count', () => {
    const { visible, clusteredIds } = resolveMarkerCollisions({ markers: near, viewport, size })
    expect(visible).toHaveLength(1)
    expect(visible[0].absorbed).toHaveLength(1)
    expect(clusteredIds.size).toBe(1)
    // Every marker is accounted for: either drawn, or counted on one that is.
    expect(visible.length + clusteredIds.size).toBe(near.length)
  })

  it('leaves markers that do not overlap alone', () => {
    const { visible, clusteredIds } = resolveMarkerCollisions({ markers: [near[0], far], viewport, size })
    expect(visible.map(({ marker }) => marker.id).sort()).toEqual(['alpha', 'charlie'])
    expect(visible.every(({ absorbed }) => absorbed.length === 0)).toBe(true)
    expect(clusteredIds.size).toBe(0)
  })

  it('never folds away the selected marker', () => {
    /* Without the selection rule the geometric order decides, and the pin the
       user just chose in the sheet could be the one that disappears. */
    for (const selectedListingId of ['alpha', 'bravo']) {
      const { visible, clusteredIds } = resolveMarkerCollisions({ markers: near, viewport, size, selectedListingId })
      expect(visible.map(({ marker }) => marker.id)).toContain(selectedListingId)
      expect(clusteredIds.has(selectedListingId)).toBe(false)
    }
  })

  it('is deterministic, including under a reordered input', () => {
    // The visual gate runs at maxDiffPixels 0, so identical input must give
    // identical output, and array order must not be part of the input.
    const markers = [...near, far]
    const first = resolveMarkerCollisions({ markers, viewport, size })
    const again = resolveMarkerCollisions({ markers, viewport, size })
    const reversed = resolveMarkerCollisions({ markers: [...markers].reverse(), viewport, size })

    const shape = (result) => ({
      visible: result.visible.map(({ marker, absorbed }) => [marker.id, [...absorbed].sort()]),
      clustered: [...result.clusteredIds].sort(),
    })
    expect(shape(again)).toEqual(shape(first))
    expect(shape(reversed)).toEqual(shape(first))
  })

  it('separates markers once zoom pushes them far enough apart on screen', () => {
    // ~0.001 degrees apart: one pixel at zoom 11, about 93 at zoom 17.
    const pair = [
      { id: 'alpha', lat: 36.8782, lng: 10.3247 },
      { id: 'bravo', lat: 36.8792, lng: 10.3257 },
    ]
    expect(resolveMarkerCollisions({ markers: pair, viewport, size }).visible).toHaveLength(1)

    const zoomedIn = resolveMarkerCollisions({ markers: pair, viewport: { ...viewport, zoom: 17 }, size })
    expect(zoomedIn.visible).toHaveLength(2)
    expect(zoomedIn.clusteredIds.size).toBe(0)
  })

  it('keeps folding markers that no zoom can separate', () => {
    /* Two listings at the same coordinate never come apart at any zoom. The
       resolver must keep folding them rather than pretending otherwise --
       MapContainer handles the dead end by selecting at maximum zoom instead
       of zooming forever. */
    const identical = [
      { id: 'alpha', lat: 36.8782, lng: 10.3247 },
      { id: 'bravo', lat: 36.8782, lng: 10.3247 },
    ]
    for (const zoom of [11, 15, 18]) {
      const result = resolveMarkerCollisions({ markers: identical, viewport: { ...viewport, zoom }, size })
      expect(result.visible, `zoom ${zoom}`).toHaveLength(1)
      expect(result.visible[0].absorbed).toHaveLength(1)
    }
  })

  it('handles the empty and single cases without inventing work', () => {
    expect(resolveMarkerCollisions({ markers: [], viewport, size }).visible).toEqual([])
    const single = resolveMarkerCollisions({ markers: [far], viewport, size })
    expect(single.visible).toHaveLength(1)
    expect(single.visible[0].absorbed).toEqual([])
  })

  it('exposes the box it collides on so the rendered pill can stay in step', () => {
    expect(MARKER_BOX).toEqual({ width: 72, height: 40 })
  })
})
