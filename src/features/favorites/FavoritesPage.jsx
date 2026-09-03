import { useEffect, useMemo, useState } from 'react'
import { HOST_PROFILE_EVENT } from '../../entities/host/hostProfileStore.js'
import { OptimizedListingImage } from '../../shared/media/OptimizedListingImage.jsx'
import { ListingHighlightBadges } from '../../shared/listing/ListingHighlightBadges.jsx'
import { MotionList, MotionListItem } from '../../shared/motion/MotionList.jsx'
import { listGuestListingsByIds } from '../listing/guestListings.js'
import { useFavorites } from './favoritesStore.js'
import './favorites-page.css'

const FAVORITES_ITEM_MOTION = Object.freeze({
  enterScale: 0.99,
  enterY: 10,
  exitScale: 0.985,
  exitY: -8,
  initialOpacity: 0.72,
  layout: true,
  stagger: 0.024,
  tapScale: 1,
  spring: Object.freeze({ stiffness: 370, damping: 32, mass: 0.78 }),
})

function HeartIcon({ filled = false }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" data-filled={filled ? 'true' : 'false'}><path d="M20.8 4.8a5.3 5.3 0 0 0-7.5 0L12 6.1l-1.3-1.3a5.3 5.3 0 0 0-7.5 7.5L12 21l8.8-8.7a5.3 5.3 0 0 0 0-7.5Z"/></svg>
}

export function FavoritesPage({ onNavigate }) {
  const { favoriteIds, toggleFavorite } = useFavorites()
  const [listingVersion, setListingVersion] = useState(0)

  useEffect(() => {
    const sync = () => setListingVersion((value) => value + 1)
    window.addEventListener(HOST_PROFILE_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(HOST_PROFILE_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const favorites = useMemo(() => {
    void listingVersion
    return listGuestListingsByIds(favoriteIds)
  }, [favoriteIds, listingVersion])

  return (
    <div className="favorites-page" data-testid="page-favorites">
      <section className="favorites-hero">
        <div className="favorites-hero__eyebrow">Votre sélection</div>
        <div className="favorites-hero__heading">
          <div>
            <h1>Favoris</h1>
            <p>Gardez ici les adresses qui vous donnent envie de partir.</p>
          </div>
          <span className="favorites-count" aria-label={`${favorites.length} favoris`}>{favorites.length}</span>
        </div>
      </section>

      {favorites.length ? (
        <section className="favorites-content" aria-label="Adresses favorites">
          <div className="favorites-section-title">
            <span>Enregistrés</span>
            <strong>{favorites.length} adresse{favorites.length > 1 ? 's' : ''}</strong>
          </div>
          <MotionList className="favorites-grid" data-motion-list="favorites">
            {favorites.map((item, index) => (
              <MotionListItem
                as="article"
                className="favorite-card"
                key={item.id}
                index={index}
                config={FAVORITES_ITEM_MOTION}
                data-favorite-id={item.id}
                data-origin={item.origin}
                role="link"
                tabIndex={0}
                onClick={() => onNavigate(`/listing/${item.id}`)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onNavigate(`/listing/${item.id}`)
                  }
                }}
              >
                <div className="favorite-card__media">
                  {item.image ? <OptimizedListingImage src={item.image} alt={item.title} loading="lazy" sizes="(max-width:430px) 100vw, 520px" /> : <span aria-hidden="true">MH</span>}
                  {item.badge && !item.highlightBadges?.length ? <span className="favorite-card__badge">{item.badge}</span> : null}
                  <button
                    type="button"
                    className="favorite-card__heart"
                    aria-label={`Retirer ${item.title} des favoris`}
                    onClick={(event) => {
                      event.stopPropagation()
                      toggleFavorite(item.id)
                    }}
                  >
                    <HeartIcon filled />
                  </button>
                </div>
                <div className="favorite-card__body">
                  <span className="favorite-card__location">{item.location}{item.location ? ', Tunisie' : ''}</span>
                  <h2>{item.title}</h2>
                  <ListingHighlightBadges badges={item.highlightBadges} variant="favorite" />
                  <div className="favorite-card__meta">
                    <strong>{item.priceLabel}</strong>
                    <span>{item.rating ? `★ ${item.rating}` : 'Nouveau'}</span>
                  </div>
                </div>
              </MotionListItem>
            ))}
          </MotionList>
        </section>
      ) : (
        <section className="favorites-empty" aria-live="polite">
          <div className="favorites-empty__icon"><HeartIcon /></div>
          <span>Votre collection commence ici</span>
          <h2>Aucun favori pour le moment</h2>
          <p>Appuyez sur le cœur d’une adresse pour la retrouver ici en un instant.</p>
          <button type="button" onClick={() => onNavigate('/')}>Découvrir les séjours</button>
        </section>
      )}
    </div>
  )
}
