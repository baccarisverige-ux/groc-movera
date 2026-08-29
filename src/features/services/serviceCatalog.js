import DRIVER_SERVICE_ICON from '../home/assets/service-chauffeur.webp'
import CLEANING_SERVICE_ICON from '../home/assets/service-menage.webp'
import CAR_RENTAL_SERVICE_ICON from '../home/assets/service-car-rental.webp'

export const SERVICE_CATALOG = Object.freeze({
  chauffeur: Object.freeze({
    slug: 'chauffeur',
    title: 'Chauffeur',
    subtitle: 'À la demande',
    image: DRIVER_SERVICE_ICON,
    pitch: 'Un chauffeur Movera vous attend. Transferts aéroport, déplacements en ville ou excursions, à l’heure que vous choisissez.',
    placeLabel: 'Lieu de prise en charge',
    placePlaceholder: 'Aéroport, hôtel, adresse…',
    dateLabel: 'Date et heure',
  }),
  menage: Object.freeze({
    slug: 'menage',
    title: 'Ménage',
    subtitle: 'Pour votre séjour',
    image: CLEANING_SERVICE_ICON,
    pitch: 'Un ménage soigné avant, pendant ou après votre séjour. L’équipe Movera intervient à l’adresse de votre choix.',
    placeLabel: 'Adresse du logement',
    placePlaceholder: 'Ville, quartier ou adresse…',
    dateLabel: 'Date souhaitée',
  }),
  'location-voiture': Object.freeze({
    slug: 'location-voiture',
    title: 'Location voiture',
    subtitle: 'Simple & rapide',
    image: CAR_RENTAL_SERVICE_ICON,
    pitch: 'Une voiture simple à récupérer, pour explorer la Tunisie à votre rythme. Choisissez vos dates et le lieu de remise.',
    placeLabel: 'Lieu de remise',
    placePlaceholder: 'Aéroport, ville, adresse…',
    dateLabel: 'Date de prise',
  }),
})

export function getServiceBySlug(slug) {
  return SERVICE_CATALOG[slug] || null
}
