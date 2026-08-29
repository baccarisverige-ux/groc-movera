import { listingCatalog } from '../../entities/listing/listingCatalog.js'
import { CollectionPage } from '../../shared/collection/CollectionPage.jsx'
import '../../shared/collection/portrait-collection.css'
import HERO_IMAGE from './assets/hero.webp'

const GUESTHOUSE_OFFERS = listingCatalog.filter((item) => item.category.split(' ').includes('guesthouse'))

export function GuestHousePage({ onNavigate }) {
  return (
    <CollectionPage
      offers={GUESTHOUSE_OFFERS}
      onNavigate={onNavigate}
      pageClassName="portrait-collection-page"
      hero={{
        src: HERO_IMAGE,
        alt: 'Maison d’hôte Movera',
        className: 'portrait-collection-hero__image',
        testId: 'page-guesthouse',
      }}
      collectionLabel="Collection Maison d’hôte"
      title={<>L’accueil tunisien,<br/>autrement.</>}
      description="Des maisons de caractère choisies pour leur charme et leur hospitalité."
      allResultsLabel="Toutes les maisons d’hôte"
      emptyTitle="Pas encore de maison d’hôte ici."
      badgeLabel="Maison d’hôte"
    />
  )
}
