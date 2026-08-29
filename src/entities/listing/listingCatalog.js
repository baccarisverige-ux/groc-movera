import VILLA_EMERAUDE_IMAGE from './assets/villa-emeraude.webp'

/**
 * Canonical listing catalogue.
 *
 * Detailed records and public offer-card projections live together here so
 * every screen reads the same titles, prices, ratings and identifiers.
 */
export const LISTING_DETAILS = {
  'marsa-sea': {
    id: 'marsa-sea', title: 'La Marsa · Vue mer', subtitle: 'Appartement lumineux près de la plage', location: 'La Marsa, Tunis', rating: 4.92, reviews: 48,
    nightlyRate: 180, currency: 'TND', fees: 25,
    amenities: ['Wi‑Fi', 'Climatisation', 'Cuisine équipée', 'Balcon', 'Parking'],
    host: { name: 'Imen', since: 'Hôte depuis 2024', response: 'Répond rapidement' },
    availability: 'Disponible cette semaine',
    images: [
      { id: 'marsa-1', alt: 'Salon lumineux avec vue mer', tone: 'sea' },
      { id: 'marsa-2', alt: 'Terrasse de l’appartement', tone: 'sand' },
      { id: 'marsa-3', alt: 'Chambre principale', tone: 'stone' },
    ],
  },
  'carthage-suite': {
    id: 'carthage-suite', title: 'Carthage · Suite', subtitle: 'Suite calme avec patio', location: 'Carthage, Tunis', rating: 4.88, reviews: 31,
    nightlyRate: 240, currency: 'TND', fees: 30,
    amenities: ['Wi‑Fi', 'Piscine', 'Patio', 'Climatisation', 'Petit-déjeuner'],
    host: { name: 'Seif', since: 'Hôte depuis 2023', response: 'Répond en moins d’une heure' },
    availability: 'Quelques dates restantes',
    images: [
      { id: 'carthage-1', alt: 'Suite principale', tone: 'olive' },
      { id: 'carthage-2', alt: 'Piscine', tone: 'water' },
      { id: 'carthage-3', alt: 'Patio', tone: 'clay' },
    ],
  },
  'gammarth-house': {
    id: 'gammarth-house', title: 'Gammarth · Maison', subtitle: 'Maison avec jardin', location: 'Gammarth, Tunis', rating: 4.95, reviews: 62,
    nightlyRate: 320, currency: 'TND', fees: 40,
    amenities: ['Wi‑Fi', 'Jardin', 'Parking', 'Cuisine équipée', 'Lave-linge'],
    host: { name: 'Movera Host', since: 'Hôte professionnel', response: 'Assistance dédiée' },
    availability: 'Disponible sur demande',
    images: [
      { id: 'gammarth-1', alt: 'Façade de la maison', tone: 'pearl' },
      { id: 'gammarth-2', alt: 'Séjour', tone: 'smoke' },
      { id: 'gammarth-3', alt: 'Jardin', tone: 'sage' },
    ],
  },
  'villa-perle': {
    id: 'villa-perle', title: 'Villa Saphir — Front de mer', subtitle: 'Villa premium en bord de mer', location: 'Gammarth, Tunis', rating: 4.98, reviews: 74,
    nightlyRate: 580, currency: 'TND', fees: 45,
    amenities: ['Wi‑Fi', 'Vue mer', 'Climatisation', 'Cuisine équipée', 'Parking', 'Télévision'],
    host: { name: 'Movera Host', since: 'Hôte professionnel', response: 'Assistance dédiée' },
    availability: 'Disponible sur demande',
    images: [
      { id: 'villa-perle-1', alt: 'Villa Saphir vue mer', tone: 'sea' },
      { id: 'villa-perle-2', alt: 'Séjour de la villa', tone: 'sand' },
      { id: 'villa-perle-3', alt: 'Terrasse de la villa', tone: 'stone' },
    ],
  },
  'maison-bleue': {
    id: 'maison-bleue', title: 'Suite Panorama Sidi Bou Saïd', subtitle: 'Suite de charme avec panorama', location: 'Sidi Bou Saïd, Tunis', rating: 4.95, reviews: 52,
    nightlyRate: 480, currency: 'TND', fees: 35,
    amenities: ['Wi‑Fi', 'Terrasse', 'Climatisation', 'Petit-déjeuner', 'Vue panoramique', 'Télévision'],
    host: { name: 'Movera Host', since: 'Hôte professionnel', response: 'Assistance dédiée' },
    availability: 'Quelques dates restantes',
    images: [
      { id: 'maison-bleue-1', alt: 'Suite Panorama', tone: 'pearl' },
      { id: 'maison-bleue-2', alt: 'Terrasse panoramique', tone: 'water' },
      { id: 'maison-bleue-3', alt: 'Chambre de la suite', tone: 'clay' },
    ],
  },
  'res-carthage': {
    id: 'res-carthage', title: 'Dar Carthage Résidence', subtitle: 'Résidence familiale confortable', location: 'Carthage, Tunis', rating: 4.88, reviews: 39,
    nightlyRate: 340, currency: 'TND', fees: 30,
    amenities: ['Wi‑Fi', 'Cuisine équipée', 'Climatisation', 'Parking', 'Espace famille', 'Télévision'],
    host: { name: 'Movera Host', since: 'Hôte professionnel', response: 'Assistance dédiée' },
    availability: 'Disponible cette semaine',
    images: [
      { id: 'res-carthage-1', alt: 'Dar Carthage Résidence', tone: 'olive' },
      { id: 'res-carthage-2', alt: 'Salon familial', tone: 'stone' },
      { id: 'res-carthage-3', alt: 'Chambre familiale', tone: 'sand' },
    ],
  },
  'villa-emeraude': {
    id: 'villa-emeraude', title: 'Villa Émeraude — Domaine privé', subtitle: 'Villa de prestige dans un domaine privé', location: 'Gammarth, Tunis', rating: 4.99, reviews: 83,
    nightlyRate: 1200, currency: 'TND', fees: 80,
    amenities: ['Wi‑Fi', 'Piscine', 'Jardin', 'Parking', 'Service premium', 'Télévision'],
    host: { name: 'Movera Host', since: 'Hôte professionnel', response: 'Assistance dédiée' },
    availability: 'Disponible sur demande',
    images: [
      { id: 'villa-emeraude-1', alt: 'Villa Émeraude', tone: 'sage' },
      { id: 'villa-emeraude-2', alt: 'Piscine privée', tone: 'water' },
      { id: 'villa-emeraude-3', alt: 'Séjour premium', tone: 'pearl' },
    ],
  },
  'loft-cote': {
    id: 'loft-cote', title: 'Loft Côte Bleue Design', subtitle: 'Loft design proche de la côte', location: 'La Marsa, Tunis', rating: 4.82, reviews: 27,
    nightlyRate: 420, currency: 'TND', fees: 30,
    amenities: ['Wi‑Fi', 'Climatisation', 'Cuisine équipée', 'Balcon', 'Design contemporain', 'Télévision'],
    host: { name: 'Movera Host', since: 'Hôte professionnel', response: 'Assistance dédiée' },
    availability: 'Disponible cette semaine',
    images: [
      { id: 'loft-cote-1', alt: 'Loft Côte Bleue', tone: 'smoke' },
      { id: 'loft-cote-2', alt: 'Espace de vie', tone: 'stone' },
      { id: 'loft-cote-3', alt: 'Coin nuit', tone: 'pearl' },
    ],
  },
  'villa-jasmin': {
    id: 'villa-jasmin', title: 'Villa Jasmin — Jardin secret', subtitle: 'Villa calme avec jardin privé', location: 'Carthage, Tunis', rating: 4.96, reviews: 61,
    nightlyRate: 680, currency: 'TND', fees: 45,
    amenities: ['Wi‑Fi', 'Jardin', 'Climatisation', 'Cuisine équipée', 'Parking'],
    host: { name: 'Movera Host', since: 'Hôte professionnel', response: 'Assistance dédiée' },
    availability: 'Quelques dates restantes',
    images: [
      { id: 'villa-jasmin-1', alt: 'Villa Jasmin', tone: 'sage' },
      { id: 'villa-jasmin-2', alt: 'Jardin secret', tone: 'olive' },
      { id: 'villa-jasmin-3', alt: 'Salon de la villa', tone: 'sand' },
    ],
  },
  'dar-sidi': {
    id: 'dar-sidi', title: 'Dar Sidi — Maison d’hôtes d’exception', subtitle: 'Maison d’hôtes de caractère', location: 'Sidi Bou Saïd, Tunis', rating: 4.93, reviews: 46,
    nightlyRate: 380, currency: 'TND', fees: 30,
    amenities: ['Wi‑Fi', 'Petit-déjeuner', 'Patio', 'Climatisation', 'Terrasse'],
    host: { name: 'Movera Host', since: 'Hôte professionnel', response: 'Assistance dédiée' },
    availability: 'Disponible cette semaine',
    images: [
      { id: 'dar-sidi-1', alt: 'Dar Sidi', tone: 'pearl' },
      { id: 'dar-sidi-2', alt: 'Patio de la maison d’hôtes', tone: 'clay' },
      { id: 'dar-sidi-3', alt: 'Terrasse', tone: 'sea' },
    ],
  },
  'riad-marsa': {
    id: 'riad-marsa', title: 'Riad La Marsa — Patio Andalou', subtitle: 'Riad de charme avec patio', location: 'La Marsa, Tunis', rating: 4.89, reviews: 35,
    nightlyRate: 410, currency: 'TND', fees: 30,
    amenities: ['Wi‑Fi', 'Patio', 'Petit-déjeuner', 'Climatisation', 'Cuisine équipée', 'Télévision'],
    host: { name: 'Movera Host', since: 'Hôte professionnel', response: 'Assistance dédiée' },
    availability: 'Disponible sur demande',
    images: [
      { id: 'riad-marsa-1', alt: 'Riad La Marsa', tone: 'clay' },
      { id: 'riad-marsa-2', alt: 'Patio Andalou', tone: 'olive' },
      { id: 'riad-marsa-3', alt: 'Suite du riad', tone: 'pearl' },
    ],
  },
}

const PUBLIC_LISTING_META = Object.freeze({
  'villa-perle': { locationLabel:'Gammarth', category:'beach prestige', image:'https://images.unsplash.com/photo-1600607688969-a5bfcd646154?auto=format&fit=crop&w=900&q=90&fm=webp', badge:'Collection' },
  'maison-bleue': { locationLabel:'Sidi Bou Saïd', category:'prestige guesthouse', image:'https://images.unsplash.com/photo-1600573472550-8090b5e0745e?auto=format&fit=crop&w=900&q=90&fm=webp', badge:'Signature' },
  'res-carthage': { locationLabel:'Carthage', category:'family guesthouse experience', image:'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=900&q=90&fm=webp', badge:'Nouveau' },
  'villa-emeraude': { locationLabel:'Gammarth', category:'prestige beach', image:VILLA_EMERAUDE_IMAGE, badge:'Prestige' },
  'loft-cote': { locationLabel:'La Marsa', category:'beach', image:'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=900&q=90&fm=webp', badge:'Design' },
  'villa-jasmin': { locationLabel:'Carthage', category:'prestige', image:'https://images.unsplash.com/photo-1600607687644-c7171b42498f?auto=format&fit=crop&w=900&q=90&fm=webp', badge:'Signature' },
  'dar-sidi': { locationLabel:'Sidi Bou Saïd', category:'guesthouse', image:'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=90&fm=webp', badge:'Maison d’hôtes' },
  'riad-marsa': { locationLabel:'La Marsa', category:'guesthouse beach', image:'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=900&q=90&fm=webp', badge:'Maison d’hôtes' },
})

export const listingCatalog = Object.freeze(
  Object.entries(PUBLIC_LISTING_META).map(([id, meta]) => {
    const detail = LISTING_DETAILS[id]
    if (!detail) throw new Error(`Missing listing details for ${id}`)
    return Object.freeze({
      id,
      title: detail.title,
      location: meta.locationLabel,
      price: detail.nightlyRate,
      currency: detail.currency,
      category: meta.category,
      image: meta.image,
      badge: meta.badge,
      rating: detail.rating.toFixed(2),
    })
  }),
)

export function getListingSummary(id) {
  return listingCatalog.find((listing) => listing.id === id) || null
}

export function getListingDetail(id) {
  return LISTING_DETAILS[id] || null
}
