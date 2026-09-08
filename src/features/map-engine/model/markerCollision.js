import { screenPoint } from '../geometry/geometry.js'

/* Which price pins can actually be tapped.

   Pins are absolutely positioned at their coordinate with no awareness of each
   other. At the default Grand Tunis view that put 16 pills whose boxes are
   72x40 at centres 7-10px apart, so they buried one another: 13 of the 16 did
   not receive a tap at their own centre, and several were covered completely.
   Tapping a listing selected a different listing.

   markerModel already described the answer -- MarkerState.CLUSTERED, and a
   clusteredIds set threaded through getMarkerState -- but nothing ever
   produced that set. This is the missing producer.

   The rule is a greedy sweep: walk the pins in a fixed order, keep one, and
   fold any later pin whose box would overlap a kept pin into that pin's count.
   Nothing is invented and nothing is moved; a pin is either the one you can
   tap or it is counted on the one you can.

   Determinism is a hard requirement, not a nicety: the visual gate runs at
   maxDiffPixels 0, so identical input must give byte-identical output. The
   order is therefore fully specified -- selection first, then top-to-bottom,
   then left-to-right, then by id -- and never depends on array order or on
   anything the caller happens to hand over. */

export const MARKER_BOX = Object.freeze({ width: 72, height: 40 })

/* Fold only what would actually be buried.

   The defect is not "these pills touch" -- pills have always overlapped a
   little and stayed perfectly usable. It is "my tap went to a different
   listing", which happens when a pin's own centre lands inside another pin's
   box. Testing centre containment rather than box intersection keeps the rule
   tied to the thing that was broken, and leaves partly overlapping but
   individually tappable pins exactly as they were. */
function buries(kept, candidate, box) {
  return Math.abs(kept.x - candidate.x) < box.width / 2
    && Math.abs(kept.y - candidate.y) < box.height / 2
}

/* Selected first so a listing chosen from the sheet is never the one folded
   away, then a stable geometric order with id as the final tie-break. */
function placementOrder(a, b, selectedListingId) {
  if (a.marker.id === selectedListingId) return -1
  if (b.marker.id === selectedListingId) return 1
  if (a.point.y !== b.point.y) return a.point.y - b.point.y
  if (a.point.x !== b.point.x) return a.point.x - b.point.x
  return a.marker.id < b.marker.id ? -1 : 1
}

export function resolveMarkerCollisions({
  markers = [],
  viewport,
  size,
  selectedListingId = null,
  box = MARKER_BOX,
} = {}) {
  const empty = { visible: [], clusteredIds: new Set(), absorbedBy: new Map() }
  if (!viewport || !size || markers.length === 0) {
    return markers.length ? { ...empty, visible: markers.map((marker) => ({ marker, absorbed: [] })) } : empty
  }

  const projected = markers
    .map((marker) => ({ marker, point: screenPoint(marker.lat, marker.lng, viewport, size) }))
    .filter(({ point }) => Number.isFinite(point.x) && Number.isFinite(point.y))
    .sort((a, b) => placementOrder(a, b, selectedListingId))

  const kept = []
  const clusteredIds = new Set()
  const absorbedBy = new Map()

  for (const candidate of projected) {
    const host = kept.find((placed) => buries(placed.point, candidate.point, box))
    if (!host) {
      kept.push({ ...candidate, absorbed: [] })
      continue
    }
    host.absorbed.push(candidate.marker.id)
    clusteredIds.add(candidate.marker.id)
    absorbedBy.set(candidate.marker.id, host.marker.id)
  }

  return {
    visible: kept.map(({ marker, absorbed }) => ({ marker, absorbed })),
    clusteredIds,
    absorbedBy,
  }
}
