export const COMMON_LISTING_HIGHLIGHTS = Object.freeze([
  { id: 'peaceful', label: 'Calme', tone: 'sage', group: 'experience' },
  { id: 'unique', label: 'Unique', tone: 'violet', group: 'experience' },
  { id: 'family', label: 'Familial', tone: 'green', group: 'audience' },
  { id: 'stylish', label: 'Élégant', tone: 'rose', group: 'experience' },
  { id: 'central', label: 'Central', tone: 'green', group: 'setting' },
  { id: 'spacious', label: 'Spacieux', tone: 'teal', group: 'experience' },
])

export const HOTEL_HIGHLIGHT_GROUPS = Object.freeze([
  { id: 'board', title: 'Restauration & formules', text: 'Indiquez les formules et services de restauration réellement proposés.' },
  { id: 'setting', title: 'Vue & emplacement', text: 'Les atouts de situation qui différencient vraiment l’établissement.' },
  { id: 'experience', title: 'Style & expérience', text: 'L’ambiance et le positionnement de votre hôtel ou hostel.' },
  { id: 'wellness', title: 'Bien-être & loisirs', text: 'Les expériences qui peuvent devenir un motif de réservation.' },
  { id: 'audience', title: 'Clientèle & séjour', text: 'À qui l’établissement convient particulièrement.' },
])

export const HOTEL_LISTING_HIGHLIGHTS = Object.freeze([
  { id: 'breakfast', label: 'Petit-déjeuner', detail: 'Petit-déjeuner disponible', tone: 'amber', group: 'board' },
  { id: 'half-board', label: 'Demi-pension', detail: 'Petit-déjeuner + 1 repas', tone: 'orange', group: 'board' },
  { id: 'full-board', label: 'Pension complète', detail: 'Petit-déjeuner + déjeuner + dîner', tone: 'terracotta', group: 'board' },
  { id: 'all-inclusive', label: 'All inclusive', detail: 'Formule tout compris', tone: 'rose', group: 'board' },
  { id: 'restaurant', label: 'Restaurant', detail: 'Restaurant dans l’établissement', tone: 'gold', group: 'board' },
  { id: 'bar', label: 'Bar', detail: 'Bar ou lounge', tone: 'berry', group: 'board' },
  { id: 'room-service', label: 'Room service', detail: 'Service en chambre', tone: 'plum', group: 'board' },

  { id: 'sea-view', label: 'Vue mer', tone: 'sky', group: 'setting' },
  { id: 'beachfront', label: 'Bord de mer', tone: 'cyan', group: 'setting' },
  { id: 'panoramic', label: 'Vue panoramique', tone: 'blue', group: 'setting' },
  { id: 'rooftop', label: 'Rooftop', tone: 'violet', group: 'setting' },
  { id: 'central', label: 'Central', tone: 'green', group: 'setting' },
  { id: 'airport', label: 'Proche aéroport', tone: 'indigo', group: 'setting' },
  { id: 'nightlife', label: 'Vie nocturne', tone: 'purple', group: 'setting' },
  { id: 'historic', label: 'Quartier historique', tone: 'sand', group: 'setting' },

  { id: 'luxury', label: 'Luxe', tone: 'gold', group: 'experience' },
  { id: 'stylish', label: 'Élégant', tone: 'rose', group: 'experience' },
  { id: 'design', label: 'Design', tone: 'coral', group: 'experience' },
  { id: 'unique', label: 'Unique', tone: 'violet', group: 'experience' },
  { id: 'romantic', label: 'Romantique', tone: 'pink', group: 'experience' },
  { id: 'peaceful', label: 'Calme', tone: 'sage', group: 'experience' },
  { id: 'spacious', label: 'Spacieux', tone: 'teal', group: 'experience' },
  { id: 'eco', label: 'Éco-responsable', tone: 'green', group: 'experience' },

  { id: 'spa', label: 'Spa', tone: 'lavender', group: 'wellness' },
  { id: 'wellness', label: 'Bien-être', tone: 'mint', group: 'wellness' },
  { id: 'pool-highlight', label: 'Piscine', tone: 'cyan', group: 'wellness' },
  { id: 'fitness', label: 'Fitness', tone: 'lime', group: 'wellness' },
  { id: 'hammam', label: 'Hammam', tone: 'aqua', group: 'wellness' },
  { id: 'private-beach', label: 'Plage privée', tone: 'sky', group: 'wellness' },

  { id: 'family', label: 'Familial', tone: 'green', group: 'audience' },
  { id: 'adults-only', label: 'Adults only', tone: 'charcoal', group: 'audience' },
  { id: 'business', label: 'Business', tone: 'navy', group: 'audience' },
  { id: 'couples', label: 'Idéal couples', tone: 'pink', group: 'audience' },
  { id: 'long-stay', label: 'Long séjour', tone: 'olive', group: 'audience' },
  { id: 'accessible', label: 'Accessible PMR', tone: 'blue', group: 'audience' },
])

const BY_ID = new Map([...COMMON_LISTING_HIGHLIGHTS, ...HOTEL_LISTING_HIGHLIGHTS].map((item) => [item.id, item]))

export function listingHighlightBadges(ids) {
  if (!Array.isArray(ids)) return []
  const seen = new Set()
  return ids.flatMap((id) => {
    if (typeof id !== 'string' || seen.has(id)) return []
    const item = BY_ID.get(id)
    if (!item) return []
    seen.add(id)
    return [{ id: item.id, label: item.label, tone: item.tone || 'sage' }]
  })
}
