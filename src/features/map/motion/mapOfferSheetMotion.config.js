export const MAP_OFFER_SHEET_MOTION = Object.freeze({
  collapsedVisiblePx: 74,
  expandedThreshold: 0.985,
  fastSwipeVelocity: 680,
  snapRatios: Object.freeze([0, 0.5, 1]),
  spring: Object.freeze({
    stiffness: 420,
    damping: 44,
    mass: 0.82,
    restDelta: 0.3,
    restSpeed: 2,
  }),
  toggleThreshold: 0.72,
  velocityProjectionSeconds: 0.16,
})

export const MAP_OFFER_ITEM_MOTION = Object.freeze({
  activeScale: 1,
  enterScale: 0.992,
  enterY: 8,
  exitScale: 0.992,
  exitY: -4,
  inactiveScale: 1,
  initialOpacity: 0.9,
  layout: false,
  stagger: 0.015,
  tapScale: 0.995,
  spring: Object.freeze({ stiffness: 390, damping: 34, mass: 0.72 }),
})
