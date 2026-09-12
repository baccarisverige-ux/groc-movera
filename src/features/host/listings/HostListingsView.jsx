import { useMemo, useState } from 'react'
import { OptimizedListingImage } from '../../../shared/media/OptimizedListingImage.jsx'
import {
  listingCoverPhoto,
  listingStatus,
  listingStatusLabel,
  listingSubtitle,
} from './hostListingEditorModel.js'
import './host-listings.css'

/* "Vos annonces".

   The screen renders a list, and today that list has one element, because a
   Movera host profile carries one listing. Writing it against an array rather
   than against profile.listing is the point: adding real multi-listing later
   is a change to the store, not a rewrite of this screen, and the search,
   layout toggle and empty state already behave correctly for n listings. */

function SearchIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
}

function LayoutIcon({ compact }) {
  return compact
    ? <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="7" rx="2" /><rect x="3" y="13" width="18" height="7" rx="2" /></svg>
    : <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="8" height="8" rx="2" /><rect x="13" y="3" width="8" height="8" rx="2" /><rect x="3" y="13" width="8" height="8" rx="2" /><rect x="13" y="13" width="8" height="8" rx="2" /></svg>
}

function PlusIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
}

function CloseIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
}

function NewListingIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10.5 12 4l8 6.5" /><path d="M6.5 9.5V20h11V9.5" /><path d="M12 12v5M9.5 14.5h5" /></svg>
}

function DuplicateIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="3" width="12" height="15" rx="2.5" /><path d="M16 21H6a2 2 0 0 1-2-2V7" /></svg>
}

function ChevronIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
}

function ListingCard({ listing, compact, onOpen }) {
  const cover = listingCoverPhoto(listing)
  return (
    <button
      type="button"
      className="host-listing-tile"
      data-compact={compact ? 'true' : 'false'}
      data-testid={`host-listing-tile-${listing.id}`}
      onClick={() => onOpen(listing)}
    >
      <span className="host-listing-tile__media">
        {cover
          ? <OptimizedListingImage src={cover} alt="" sizes={compact ? '120px' : '(max-width:430px) 100vw, 400px'} />
          : <span className="host-listing-tile__placeholder" aria-hidden="true">MH</span>}
        <span className="host-listing-tile__status" data-status={listingStatus(listing)}>
          <i aria-hidden="true" />{listingStatusLabel(listing)}
        </span>
      </span>
      <span className="host-listing-tile__body">
        <strong>{listing.name}</strong>
        <small>{listingSubtitle(listing)}</small>
      </span>
    </button>
  )
}

function NewListingSheet({ hasExisting, onClose, onCreate, onDuplicate }) {
  return (
    <div className="host-sheet" role="dialog" aria-modal="true" aria-label="Nouvelle annonce" data-testid="host-new-listing-sheet">
      <button type="button" className="host-sheet__scrim" aria-label="Fermer" onClick={onClose} />
      <div className="host-sheet__panel host-sheet__panel--full">
        <button type="button" className="host-sheet__close" aria-label="Fermer" onClick={onClose}><CloseIcon /></button>
        <h2 className="host-sheet__title">Créer une annonce</h2>
        <p className="host-sheet__lede">Démarrez la procédure Movera, ou repartez de ce que vous avez déjà publié.</p>
        <div className="host-sheet__rows">
          <button type="button" onClick={onCreate} data-testid="host-create-listing">
            <NewListingIcon />
            <span><strong>Créer une nouvelle annonce</strong><small>Dix-huit étapes, de la catégorie à la publication.</small></span>
            <ChevronIcon />
          </button>
          <button type="button" onClick={onDuplicate} disabled={!hasExisting} data-testid="host-duplicate-listing">
            <DuplicateIcon />
            <span>
              <strong>Créer à partir d’une annonce existante</strong>
              <small>{hasExisting
                ? 'Reprend équipements, règles et tarifs. Adresse, titre et photos restent à saisir.'
                : 'Disponible dès que vous avez publié une première annonce.'}</small>
            </span>
            <ChevronIcon />
          </button>
        </div>
      </div>
    </div>
  )
}

export function HostListingsView({ listings, onOpenListing, onCreateListing, onDuplicateListing }) {
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [compact, setCompact] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return listings
    return listings.filter((item) => `${item.name} ${item.city} ${item.type}`.toLowerCase().includes(term))
  }, [listings, query])

  return (
    <div className="host-workspace-view host-listings" data-testid="host-listings">
      <div className="host-listings__actions">
        <button
          type="button"
          aria-label="Rechercher une annonce"
          aria-pressed={searching}
          onClick={() => { setSearching((value) => !value); if (searching) setQuery('') }}
        ><SearchIcon /></button>
        <button
          type="button"
          aria-label={compact ? 'Affichage en grandes cartes' : 'Affichage en liste compacte'}
          aria-pressed={compact}
          onClick={() => setCompact((value) => !value)}
        ><LayoutIcon compact={compact} /></button>
        <button type="button" aria-label="Créer une annonce" onClick={() => setSheetOpen(true)} data-testid="host-listings-add"><PlusIcon /></button>
      </div>

      <h1 className="host-listings__title">Vos annonces</h1>

      {searching ? (
        <label className="host-listings__search">
          <span className="host-listings__search-icon" aria-hidden="true"><SearchIcon /></span>
          <input
            type="search"
            value={query}
            autoFocus
            placeholder="Titre, ville ou type"
            aria-label="Rechercher parmi vos annonces"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      ) : null}

      {visible.length ? (
        <div className="host-listings__grid" data-compact={compact ? 'true' : 'false'}>
          {visible.map((listing) => (
            <ListingCard key={listing.id} listing={listing} compact={compact} onOpen={onOpenListing} />
          ))}
        </div>
      ) : (
        <div className="host-workspace-empty">
          <span className="host-workspace-empty__mark">MH</span>
          <strong>{query ? 'Aucune annonce ne correspond' : 'Aucune annonce publiée'}</strong>
          <p>{query
            ? 'Essayez un autre titre, une autre ville ou un autre type de logement.'
            : 'Créez votre première annonce pour ouvrir votre espace Hôte.'}</p>
          {query ? null : <button type="button" onClick={() => setSheetOpen(true)}>Créer une annonce</button>}
        </div>
      )}

      {sheetOpen ? (
        <NewListingSheet
          hasExisting={listings.length > 0}
          onClose={() => setSheetOpen(false)}
          onCreate={() => { setSheetOpen(false); onCreateListing() }}
          onDuplicate={() => { setSheetOpen(false); onDuplicateListing(listings[0]) }}
        />
      ) : null}
    </div>
  )
}
