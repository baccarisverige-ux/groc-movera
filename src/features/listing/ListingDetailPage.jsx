import { ArrowLeftIcon } from '../../shared/icons/AppIcons.jsx'
import { useFavorites } from '../favorites/favoritesStore.js'
import { getGuestListingById } from './guestListings.js'
import './listing-detail-page.css'

function goBack(onNavigate) {
  if (window.history.length > 1) {
    window.history.back()
    return
  }
  onNavigate('/')
}

export function ListingDetailPage({ params, onNavigate }) {
  const listing = getGuestListingById(params?.id)
  const { favoriteIds, toggleFavorite } = useFavorites()
  const favorite = listing ? favoriteIds.includes(listing.id) : false

  if (!listing) {
    return (
      <div className="listing-detail-page" data-testid="page-listing-missing">
        <header className="listing-detail-top">
          <button type="button" className="listing-detail-back" onClick={() => goBack(onNavigate)} aria-label="Retour">
            <ArrowLeftIcon />
          </button>
          <strong>Movera</strong>
        </header>
        <section className="listing-detail-empty">
          <h1>Logement introuvable</h1>
          <p>Cette adresse n’est plus disponible dans Movera.</p>
          <button type="button" onClick={() => onNavigate('/')}>Retour à l’accueil</button>
        </section>
      </div>
    )
  }

  return (
    <div className="listing-detail-page" data-testid="page-listing" data-listing-id={listing.id}>
      <header className="listing-detail-top">
        <button type="button" className="listing-detail-back" onClick={() => goBack(onNavigate)} aria-label="Retour">
          <ArrowLeftIcon />
        </button>
        <strong>Movera</strong>
      </header>

      <div className="listing-detail-photo">
        <img src={listing.image} alt={listing.title} />
        {listing.badge ? <span className="listing-detail-badge">{listing.badge}</span> : null}
        <button
          type="button"
          className="listing-detail-heart"
          data-active={favorite ? 'true' : 'false'}
          aria-pressed={favorite}
          aria-label={`${favorite ? 'Retirer' : 'Ajouter'} ${listing.title} ${favorite ? 'des' : 'aux'} favoris`}
          onClick={() => toggleFavorite(listing.id)}
        >
          {favorite ? '♥' : '♡'}
        </button>
      </div>

      <section className="listing-detail-body">
        <h1>{listing.title}</h1>
        <p className="listing-detail-location">{listing.location}, Tunisie</p>
        <p className="listing-detail-dates">{listing.dates}</p>
        <p className="listing-detail-meta">
          <strong>{listing.priceLabel}</strong>
          <span className="listing-detail-dot">·</span>
          <span>★ {listing.rating}</span>
        </p>
      </section>

      <div className="listing-detail-cta">
        <button type="button" className="listing-detail-reserve">Réserver</button>
      </div>
    </div>
  )
}
