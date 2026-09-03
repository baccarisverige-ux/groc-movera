import './hotel-amenities.css'
import './hotel-highlights.css'

const HOTEL_ICON_BASE = `${import.meta.env.BASE_URL}assets/hotel-icons/`

const HOTEL_AMENITY_IMAGE_CODES = Object.freeze({
  ac: '2744',
  essentials: '1F6CF',
  heating: '1F525',
  'hot-water': '1F4A7',
  tv: '1F4FA',
  wifi: '1F4F6',
  parking: '1F17F',
  'hotel-minibar': '1F964',
  'hotel-room-safe': '1F512',
  'hotel-soundproofing': '1F508',
  'hotel-reception-24h': '1F6CE',
  'hotel-luggage-storage': '1F9F3',
  'hotel-multilingual-staff': '1F30D',
  'hotel-daily-housekeeping': '1F9F9',
  'hotel-laundry-service': '1F9FA',
  'hotel-restaurant': '1F37D',
  'hotel-bar': '1F378',
  'hotel-food-room-service': '1F961',
  'hotel-outdoor-pool': '1F3CA',
  'hotel-spa': '1FAB7',
  'hotel-fitness-24h': '1F3CB',
  'hotel-airport-shuttle': '1F690',
  'hotel-elevator': '1F6D7',
  'hotel-accessible-rooms': '267F',
  'hotel-security-24h': '1F6E1',
  'hotel-smoke-detectors': '1F9EF',
})

const HOTEL_HIGHLIGHT_IMAGE_CODES = Object.freeze({
  breakfast: '1F95E',
  'half-board': '1F35B',
  'full-board': '1F374',
  'all-inclusive': '1F3AB',
  'sea-view': '1F30A',
  beachfront: '1F3D6',
  central: '1F3AF',
  airport: '2708',
  luxury: '1F451',
  stylish: '2728',
  peaceful: '1F54A',
  eco: '1F33F',
  spa: '1FAB7',
  'pool-highlight': '1F3CA',
  fitness: '1F3CB',
  'private-beach': '1F3DD',
  family: '1F46A',
  'adults-only': '1F51E',
  business: '1F4BC',
  accessible: '267F',
})

function HotelColorImage({ code, className }) {
  return <img className={className} src={`${HOTEL_ICON_BASE}${code}.svg`} alt="" aria-hidden="true" draggable="false" />
}

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

export function HotelAmenityIcon({ id, fallback = null }) {
  const imageCode = HOTEL_AMENITY_IMAGE_CODES[id]
  if (imageCode) return <HotelColorImage code={imageCode} className="host-hotel-amenity-image" />
  if (!id.startsWith('hotel-')) return fallback
  const icons = {
    'hotel-minibar': <><rect x="7" y="3" width="10" height="18" rx="2"/><path d="M7 11h10M10 7h.01M10 15h.01"/></>,
    'hotel-room-safe': <><rect x="4" y="5" width="16" height="15" rx="2"/><circle cx="13" cy="12" r="3"/><path d="M13 9v3l2 1M7 8h2"/></>,
    'hotel-soundproofing': <><path d="M5 10v4h3l4 4V6L8 10H5ZM16 9c2 2 2 4 0 6M19 6c4 4 4 8 0 12"/></>,
    'hotel-reception-24h': <><path d="M4 18h16M6 18a6 6 0 0 1 12 0M12 9V6M9 6h6"/><circle cx="12" cy="4" r="1"/></>,
    'hotel-luggage-storage': <><rect x="6" y="7" width="12" height="14" rx="2"/><path d="M9 7V4h6v3M10 11v6M14 11v6"/></>,
    'hotel-multilingual-staff': <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></>,
    'hotel-daily-housekeeping': <><path d="M5 20 9 8h6l4 12M8 14h8M10 8V4h4v4"/></>,
    'hotel-laundry-service': <><rect x="5" y="3" width="14" height="18" rx="2"/><circle cx="12" cy="13" r="5"/><path d="M8 7h.01M12 7h4"/></>,
    'hotel-restaurant': <><path d="M5 3v8M8 3v8M5 7h3M7 11v10M17 3v18M14 3c0 5 3 6 3 6"/></>,
    'hotel-bar': <><path d="M5 4h14l-7 8-7-8ZM12 12v7M8 20h8"/></>,
    'hotel-food-room-service': <><path d="M4 18h16M6 18a6 6 0 0 1 12 0M12 10V7M9 7h6"/></>,
    'hotel-outdoor-pool': <><path d="M3 16c2-2 4-2 6 0s4 2 6 0 4-2 6 0M3 20c2-2 4-2 6 0s4 2 6 0 4-2 6 0M7 13V5h6M7 9h6"/></>,
    'hotel-spa': <><path d="M12 20c-5-2-7-5-6-9 3 0 5 1 6 4 1-3 3-4 6-4 1 4-1 7-6 9ZM12 15V5"/></>,
    'hotel-fitness-24h': <><path d="M6 9v6M18 9v6M3 10v4M21 10v4M6 12h12"/></>,
    'hotel-airport-shuttle': <><path d="M3 16V8h13l4 4v4M7 16h7M16 8v4h4"/><circle cx="6" cy="18" r="2"/><circle cx="16" cy="18" r="2"/></>,
    'hotel-elevator': <><rect x="5" y="3" width="14" height="18" rx="1"/><path d="m9 9 3-3 3 3M9 15l3 3 3-3"/></>,
    'hotel-accessible-rooms': <><circle cx="11" cy="4" r="2"/><path d="M10 7v6h5l3 6M8 10a6 6 0 1 0 7 9M10 10h5"/></>,
    'hotel-security-24h': <><path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-5"/></>,
    'hotel-smoke-detectors': <><circle cx="12" cy="12" r="8"/><path d="M8 12h8M9 8c2 1 4 1 6 0M9 16c2-1 4-1 6 0"/></>,
  }
  return <svg className="host-hotel-amenity-icon" viewBox="0 0 24 24" aria-hidden="true">{icons[id] || <path d="M6 6h12v12H6z"/>}</svg>
}

export function HotelHighlightIcon({ id }) {
  const imageCode = HOTEL_HIGHLIGHT_IMAGE_CODES[id]
  if (imageCode) return <HotelColorImage code={imageCode} className="host-hotel-highlight-image" />
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
  AmenityIcon: HotelAmenityIcon,
  HighlightIcon: HotelHighlightIcon,
})
