import { listHomeOffersByCategory } from '../listing/guestListings.js'
import { CollectionPage } from '../../shared/collection/CollectionPage.jsx'
import '../../shared/collection/portrait-collection.css'
import HERO_IMAGE from './assets/hero.jpg'

const OFFERS = listHomeOffersByCategory('family')

export function ApartmentPage({ onNavigate }) {
  return (
    <CollectionPage
      offers={OFFERS}
      onNavigate={onNavigate}
      pageClassName="portrait-collection-page"
      hero={{
        src: HERO_IMAGE,
        alt: 'Collection Appartement Movera',
        className: 'portrait-collection-hero__image',
        testId: 'page-apartment',
      }}
      collectionLabel="Collection Appartement"
      title={<>Votre séjour,<br/>comme chez vous.</>}
      description="Des appartements sélectionnés pour leur confort, leur emplacement et leur qualité d’accueil."
      allResultsLabel="Tous les appartements"
      emptyTitle="Pas encore d’appartement ici."
      badgeLabel="Appartement"
    />
  )
}
