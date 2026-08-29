import { listingCatalog } from '../../entities/listing/listingCatalog.js'
import { CollectionPage } from '../../shared/collection/CollectionPage.jsx'
import '../../shared/collection/portrait-collection.css'
import HERO_IMAGE from './assets/hero.webp'

const VILLA_OFFERS = listingCatalog.filter((item) => item.category.split(' ').includes('prestige'))

export function VillaPage({ onNavigate }) {
  return (
    <CollectionPage
      offers={VILLA_OFFERS}
      onNavigate={onNavigate}
      pageClassName="portrait-collection-page"
      hero={{
        src: HERO_IMAGE,
        alt: 'Collection Villa Movera',
        className: 'portrait-collection-hero__image',
        testId: 'page-villa',
      }}
      collectionLabel="Collection Villa"
      title={<>L’exception,<br/>en toute intimité.</>}
      description="Des villas sélectionnées pour leur architecture, leur confort et leurs prestations d’exception."
      allResultsLabel="Toutes les villas"
      emptyTitle="Pas encore de villa ici."
      badgeLabel="Villa"
    />
  )
}
