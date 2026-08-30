import { listHomeOffersByCategory } from '../listing/guestListings.js'
import { CollectionPage } from '../../shared/collection/CollectionPage.jsx'
import '../../shared/collection/portrait-collection.css'
import HERO_IMAGE from './assets/hero.webp'

const OFFERS = listHomeOffersByCategory('hotel')

export function HotelPage({ onNavigate }) {
  return (
    <CollectionPage
      offers={OFFERS}
      onNavigate={onNavigate}
      pageClassName="portrait-collection-page"
      hero={{
        src: HERO_IMAGE,
        alt: 'Collection Hôtel Movera',
        className: 'portrait-collection-hero__image',
        testId: 'page-hotel',
      }}
      collectionLabel="Collection Hôtel"
      title={<>L’hôtel,<br/>autrement.</>}
      description="Des hôtels sélectionnés pour leur service, leur confort et leur caractère."
      allResultsLabel="Tous les hôtels"
      emptyTitle="Pas encore d’hôtel ici."
      badgeLabel="Hôtel"
    />
  )
}
