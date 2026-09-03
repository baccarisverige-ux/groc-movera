export const MAP_OFFER_SHEET_MOTION = Object.freeze({
  collapsedVisiblePx: 74,
  expandedThreshold: 0.985,
  fastSwipeVelocity: 820,
  freeDrag: true,
  snapRatios: Object.freeze([0, 0.5, 1]),
  spring: Object.freeze({
    stiffness: 185,
    damping: 30,
    mass: 1.02,
    restDelta: 0.18,
    restSpeed: 1.25,
  }),
  toggleThreshold: 0.72,
  velocityProjectionSeconds: 0.09,
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
