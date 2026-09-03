export const HOTEL_AMENITY_SYMBOLS = Object.freeze({
  'hotel-room': '◇',
  'hotel-bath': '◡',
  'hotel-reception': '✦',
  'hotel-housekeeping': '✧',
  'hotel-food': '○',
  'hotel-wellness': '≈',
  'hotel-business': '□',
  'hotel-family': '◎',
  'hotel-transport': '→',
  'hotel-accessibility': '＋',
  'hotel-security': '◆',
  'hotel-hostel': '▤',
  'hotel-outdoor': '☼',
  'hotel-sustainability': '⌁',
})

export function HotelHighlightIcon({ id }) {
  const board = ['breakfast', 'half-board', 'full-board', 'all-inclusive', 'restaurant', 'bar', 'room-service'].includes(id)
  const setting = ['sea-view', 'beachfront', 'panoramic', 'rooftop', 'central', 'airport', 'nightlife', 'historic'].includes(id)
  const wellness = ['spa', 'wellness', 'pool-highlight', 'fitness', 'hammam', 'private-beach'].includes(id)
  const audience = ['family', 'adults-only', 'business', 'couples', 'long-stay', 'accessible'].includes(id)
  if (board) return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="5"/><path d="M4 4v7M6 4v7M4 8h2M19 4v16M17 4c0 4 2 5 2 5"/></svg>
  if (setting) return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-8 10-8 10S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2"/></svg>
  if (wellness) return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19c-5-2-7-5-6-9 3 0 5 1 6 4 1-3 3-4 6-4 1 4-1 7-6 9ZM12 14V5"/></svg>
  if (audience) return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="7" r="3"/><path d="M5 20c.5-5 2.8-8 7-8s6.5 3 7 8"/></svg>
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z"/></svg>
}
