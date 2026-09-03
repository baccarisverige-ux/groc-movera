import './hotel-amenities.css'
import './hotel-highlights.css'

export const HOTEL_AMENITY_SYMBOLS = Object.freeze({
  essentials: '✦',
  features: 'P',
  'hotel-room': '🛏️',
  'hotel-reception': '🛎️',
  'hotel-housekeeping': '🧺',
  'hotel-food': '🍽️',
  'hotel-wellness': '🏊',
  'hotel-transport': '✈️',
  'hotel-accessibility': '♿',
  'hotel-security': '🛡️',
})

export function HotelHighlightIcon({ id }) {
  const icons = {
    breakfast: <><path d="M5 11h14a7 7 0 0 1-14 0Z"/><path d="M8 7c0-2 2-2 2-4M13 7c0-2 2-2 2-4M4 19h16"/></>,
    'half-board': <><path d="M4 4v7M7 4v7M4 8h3M18 4v16M15 4c0 4 3 5 3 5"/><path d="M10 16h4"/></>,
    'full-board': <><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="3"/><path d="M3 5v14M21 5v14"/></>,
    'all-inclusive': <><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/></>,
    'sea-view': <><path d="M3 16c2-2 4-2 6 0s4 2 6 0 4-2 6 0M3 20c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/><path d="M12 4v7M8.5 7.5 12 4l3.5 3.5"/></>,
    beachfront: <><circle cx="17" cy="6" r="3"/><path d="M3 17c3-3 6-3 9 0s6 3 9 0M5 13c3-3 6-3 9 0"/></>,
    central: <><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></>,
    airport: <><path d="m3 11 18-7-7 18-3-8-8-3Z"/><path d="m11 14 4-4"/></>,
    luxury: <><path d="m3 8 4-4 5 4 5-4 4 4-3 11H6L3 8Z"/><path d="M8 14h8"/></>,
    stylish: <><path d="M12 3 9 9l-6 3 6 3 3 6 3-6 6-3-6-3-3-6Z"/></>,
    peaceful: <><path d="M12 20c-5-2-7-5-6-10 4 0 6 2 6 6 0-4 2-6 6-6 1 5-1 8-6 10Z"/><path d="M12 16V5"/></>,
    eco: <><path d="M20 4C11 4 5 8 5 15c0 3 2 5 5 5 7 0 10-7 10-16Z"/><path d="M4 21c3-6 7-9 12-12"/></>,
    spa: <><path d="M12 20c-5-2-7-5-6-9 3 0 5 1 6 4 1-3 3-4 6-4 1 4-1 7-6 9Z"/><path d="M12 15V5"/></>,
    'pool-highlight': <><path d="M3 16c2-2 4-2 6 0s4 2 6 0 4-2 6 0M3 20c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/><path d="M7 13V5h6M7 9h6"/></>,
    fitness: <><path d="M6 9v6M18 9v6M3 10v4M21 10v4M6 12h12"/></>,
    'private-beach': <><path d="M4 20 10 6M10 6c4 0 7 2 9 5-4-1-7 0-10 2M10 6C7 6 5 7 3 9c3 0 5 1 6 4"/></>,
    family: <><circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M2.5 20c.5-5 2-8 5.5-8s5 3 5.5 8M13 14c3-1 6 1 7 6"/></>,
    'adults-only': <><circle cx="12" cy="7" r="3"/><path d="M5 20c.5-5 2.8-8 7-8s6.5 3 7 8M18 4l3 3M21 4l-3 3"/></>,
    business: <><rect x="4" y="7" width="16" height="13" rx="2"/><path d="M9 7V4h6v3M4 12h16M10 12v2h4v-2"/></>,
    accessible: <><circle cx="11" cy="4" r="2"/><path d="M10 7v6h5l3 6M8 10a6 6 0 1 0 7 9M10 10h5"/></>,
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true">{icons[id] || <path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z"/>}</svg>
}

export const HOTEL_OFFER_PRESENTATION = Object.freeze({
  variant: 'hotel',
  amenitySymbols: HOTEL_AMENITY_SYMBOLS,
  HighlightIcon: HotelHighlightIcon,
})
