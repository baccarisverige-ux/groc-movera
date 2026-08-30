import { listHomeOffersByCategory } from '../listing/guestListings.js'
import { CollectionPage } from '../../shared/collection/CollectionPage.jsx'
import '../../shared/collection/portrait-collection.css'
import HERO_IMAGE from './assets/hero.webp'

const OFFERS = listHomeOffersByCategory('beach')

export function BeachPage({ onNavigate }) {
  return (
    <CollectionPage
      offers={OFFERS}
      onNavigate={onNavigate}
      pageClassName="portrait-collection-page"
      hero={{
        src: HERO_IMAGE,
        alt: 'Collection Plage Movera',
        className: 'portrait-collection-hero__image',
        testId: 'page-beach',
      }}
      collectionLabel="Collection Plage"
      title={<>La Tunisie<br/>côté mer.</>}
      description="Des adresses choisies pour vivre la côte autrement."
      allResultsLabel="Tous les séjours Plage"
      emptyTitle="Pas encore d’adresse Plage ici."
      badgeLabel="Plage"
    />
  )
}
