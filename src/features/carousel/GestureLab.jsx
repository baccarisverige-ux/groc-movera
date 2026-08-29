import { useState } from 'react'
import { MapContainer } from '../map-engine/MapContainer.jsx'
import { CarouselShell } from './CarouselShell.jsx'
import { GESTURE } from './gestureArbitration.js'

export function GestureLab() {
  const [lock, setLock] = useState(GESTURE.NONE)
  return (
    <section className="route-page" data-testid="page-gesture-lab" data-global-gesture-lock={lock}>
      <p className="route-page__eyebrow">Phase 9 · Arbitration</p>
      <h1>Map + Carousel gestures</h1>
      <div data-testid="gesture-map-zone"><MapContainer /></div>
      <div data-testid="gesture-carousel-zone"><CarouselShell onGestureLock={setLock} /></div>
    </section>
  )
}
