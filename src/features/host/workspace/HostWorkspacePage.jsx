import { useEffect, useMemo, useState } from 'react'
import { readHostCalendarForListing } from '../../../entities/host/hostCalendarStore.js'
import { updateHostListing } from '../../../entities/host/hostProfileStore.js'
import {
  HOST_ROOM_INVENTORY_EVENT,
  listConfirmedRoomReservationsForListing,
} from '../../../entities/host/hostRoomInventoryStore.js'
import {
  readHostWorkspaceSettings,
  writeHostWorkspaceSettings,
} from '../../../entities/host/hostWorkspaceSettingsStore.js'
import { OptimizedListingImage } from '../../../shared/media/OptimizedListingImage.jsx'
import { HostRoomTypeManager } from '../rooms/HostRoomTypeManager.jsx'
import {
  estimateReservationGross,
  hostListingCompleteness,
  HOST_WORKSPACE_VIEWS,
  reservationStatus,
  roomForReservation,
} from './hostWorkspaceModel.js'
import './host-workspace.css'

function ArrowIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg>
}

function NavIcon({ id }) {
  const paths = {
    dashboard: <><path d="M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z" /></>,
    listings: <><path d="M4 8 12 3l8 5v12H4z" /><path d="M9 20v-6h6v6" /></>,
    reservations: <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4M16 3v4M4 10h16M8 14h3M8 17h6" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M8 3v4M16 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01" /></>,
    earnings: <><path d="M4 19V9M10 19V5M16 19v-7M3 19h18" /><path d="m4 7 6-4 6 5 4-3" /></>,
    messages: <><path d="M4 5h16v12H8l-4 4z" /><path d="M8 9h8M8 13h5" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" /></>,
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[id]}</svg>
}

function money(value, currency = 'TND') {
  return `${Math.round(Number(value) || 0).toLocaleString('fr-FR')} ${currency}`
}

function shortDate(value) {
  const date = new Date(`${value}T12:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(date)
}

function reservationLabel(status) {
  if (status === 'current') return 'En séjour'
  if (status === 'past') return 'Terminée'
  if (status === 'upcoming') return 'À venir'
  return 'Confirmée'
}

function listingCover(listing) {
  const direct = Array.isArray(listing?.photos) ? listing.photos.find(Boolean) : ''
  if (direct) return direct
  for (const room of listing?.roomTypes || []) {
    const photo = Array.isArray(room.photos) ? room.photos.find(Boolean) : ''
    if (photo) return photo
  }
  return ''
}

function reservationRows(listing, reservations) {
  return reservations.map((reservation) => {
    const room = roomForReservation(listing, reservation)
    const calendar = readHostCalendarForListing(listing.id, reservation.roomTypeId)
    return {
      ...reservation,
      room,
      status: reservationStatus(reservation),
      gross: estimateReservationGross(listing, reservation, calendar),
    }
  })
}

export function HostWorkspaceNav({ active, onNavigate }) {
  return (
    <nav className="host-workspace-nav" aria-label="Navigation Hôte">
      <div className="host-workspace-nav__rail">
        {HOST_WORKSPACE_VIEWS.map((item) => (
          <button
            type="button"
            key={item.id}
            data-active={item.id === active ? 'true' : 'false'}
            aria-current={item.id === active ? 'page' : undefined}
            onClick={() => onNavigate(item.path)}
          >
            <NavIcon id={item.id} />
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  )
}

function HostHeader({ listing, view, onNavigate }) {
  const title = HOST_WORKSPACE_VIEWS.find((item) => item.id === view)?.label || 'Espace Hôte'
  return (
    <header className="host-workspace__header">
      <div className="host-workspace__brand">
        <span>MH</span>
        <div><strong>Movera Host</strong><small>{listing.city} · Espace Hôte</small></div>
      </div>
      <div className="host-workspace__header-row">
        <div><small>{listing.name}</small><h1>{title}</h1></div>
        <button type="button" onClick={() => onNavigate('/')} className="host-workspace__traveler">Mode Voyageur</button>
      </div>
    </header>
  )
}

function EmptyState({ title, copy, action, onAction }) {
  return (
    <div className="host-workspace-empty">
      <span className="host-workspace-empty__mark">MH</span>
      <strong>{title}</strong>
      <p>{copy}</p>
      {action ? <button type="button" onClick={onAction}>{action}</button> : null}
    </div>
  )
}

function DashboardView({ listing, rows, onNavigate }) {
  const upcoming = rows.filter((item) => item.status === 'upcoming' || item.status === 'current')
  const revenue = rows.reduce((sum, item) => sum + item.gross, 0)
  const completeness = hostListingCompleteness(listing)
  const unitCount = Math.max(1, Number(listing.roomInventory?.totalUnits) || 1)
  const roomCount = Array.isArray(listing.roomTypes) ? listing.roomTypes.length : 0
  return (
    <div className="host-workspace-view" data-testid="host-dashboard">
      <section className="host-dashboard-hero">
        <div>
          <span>Votre activité</span>
          <h2>{listing.name}</h2>
          <p>{listing.type} · {listing.city}</p>
        </div>
        <button type="button" onClick={() => onNavigate(`/listing/${encodeURIComponent(listing.id)}`)}>Voir l’annonce <ArrowIcon /></button>
      </section>

      <section className="host-metrics" aria-label="Résumé de l’activité">
        <article><span>Réservations enregistrées</span><strong>{rows.length}</strong><small>{upcoming.length} active{upcoming.length > 1 ? 's' : ''} ou à venir</small></article>
        <article><span>Revenu brut estimé</span><strong>{money(revenue, listing.currency)}</strong><small>Sur réservations confirmées locales</small></article>
        <article><span>Inventaire</span><strong>{unitCount}</strong><small>{roomCount > 1 ? `${roomCount} catégories` : unitCount > 1 ? 'chambres identiques' : 'unité publiée'}</small></article>
      </section>

      <section className="host-workspace-section">
        <div className="host-workspace-section__head"><div><span>Accès rapides</span><h2>Piloter votre annonce</h2></div></div>
        <div className="host-quick-grid">
          <button type="button" onClick={() => onNavigate('/host/calendar')}><NavIcon id="calendar" /><span><strong>Calendrier</strong><small>Prix, blocages et stock</small></span><ArrowIcon /></button>
          <button type="button" onClick={() => onNavigate('/host/listings')}><NavIcon id="listings" /><span><strong>Annonce</strong><small>Contenu et chambres</small></span><ArrowIcon /></button>
          <button type="button" onClick={() => onNavigate('/host/reservations')}><NavIcon id="reservations" /><span><strong>Réservations</strong><small>Suivre les séjours confirmés</small></span><ArrowIcon /></button>
          <button type="button" onClick={() => onNavigate('/host/earnings')}><NavIcon id="earnings" /><span><strong>Revenus</strong><small>Montants issus du calendrier</small></span><ArrowIcon /></button>
        </div>
      </section>

      <section className="host-workspace-section">
        <div className="host-workspace-section__head"><div><span>Qualité de l’annonce</span><h2>{completeness}% complétée</h2></div><b>{completeness}%</b></div>
        <div className="host-completeness"><i style={{ width: `${completeness}%` }} /></div>
        <p className="host-workspace-note">Le score vérifie titre, localisation, description, équipements, photos et prix. Il n’invente pas de note voyageur.</p>
      </section>

      <section className="host-workspace-section">
        <div className="host-workspace-section__head"><div><span>À venir</span><h2>Prochains séjours</h2></div><button type="button" onClick={() => onNavigate('/host/reservations')}>Tout voir</button></div>
        {upcoming.length ? <div className="host-reservation-list host-reservation-list--compact">{upcoming.slice(0, 3).map((item) => <ReservationCard key={item.id} item={item} currency={listing.currency} />)}</div> : <EmptyState title="Aucun séjour à venir" copy="Les réservations confirmées apparaîtront ici dès qu’elles seront enregistrées dans le moteur de réservation." />}
      </section>
    </div>
  )
}

function ListingView({ profile, userId, onNavigate }) {
  const listing = profile.listing
  const pooled = Array.isArray(listing.roomTypes) && listing.roomTypes.length > 0
  const [editing, setEditing] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [form, setForm] = useState(() => ({ name: listing.name, description: listing.description, basePrice: listing.basePrice, bookingMode: listing.bookingMode }))
  useEffect(() => setForm({ name: listing.name, description: listing.description, basePrice: listing.basePrice, bookingMode: listing.bookingMode }), [listing])
  const cover = listingCover(listing)
  const save = () => {
    try {
      updateHostListing(userId, {
        name: form.name,
        description: form.description,
        basePrice: pooled ? listing.basePrice : Number(form.basePrice),
        bookingMode: form.bookingMode,
      })
      setEditing(false)
      setFeedback('Annonce mise à jour.')
    } catch (error) {
      setFeedback(error?.message || 'Impossible d’enregistrer l’annonce.')
    }
  }
  return (
    <div className="host-workspace-view" data-testid="host-listings">
      <section className="host-listing-card">
        <div className="host-listing-card__media">{cover ? <OptimizedListingImage src={cover} alt="" sizes="160px" /> : <span>MH</span>}<b>Publié</b></div>
        <div className="host-listing-card__body"><small>{listing.type} · {listing.city}</small><h2>{listing.name}</h2><p>{listing.address || 'Adresse enregistrée dans votre annonce'}</p><div><span>{pooled && listing.roomTypes.length > 1 ? `${listing.roomTypes.length} catégories` : `${listing.roomInventory?.totalUnits || 1} unité${(listing.roomInventory?.totalUnits || 1) > 1 ? 's' : ''}`}</span><strong>{pooled && listing.roomTypes.length > 1 ? `Dès ${Math.min(...listing.roomTypes.map((room) => room.basePrice))}` : listing.basePrice} {listing.currency}</strong></div></div>
        <div className="host-listing-card__actions"><button type="button" onClick={() => setEditing((value) => !value)}>{editing ? 'Fermer' : 'Modifier'}</button><button type="button" onClick={() => onNavigate(`/listing/${encodeURIComponent(listing.id)}`)}>Voir comme voyageur</button></div>
      </section>

      {editing ? <section className="host-editor" aria-label="Modifier l’annonce">
        <div className="host-workspace-section__head"><div><span>Informations publiques</span><h2>Modifier l’annonce</h2></div></div>
        <label><span>Titre</span><input value={form.name} maxLength={80} onChange={(event) => setForm((state) => ({ ...state, name: event.target.value }))} /></label>
        <label><span>Description</span><textarea rows="5" maxLength={1000} value={form.description} onChange={(event) => setForm((state) => ({ ...state, description: event.target.value }))} /></label>
        {!pooled ? <label><span>Prix de base / nuit</span><input type="number" min="1" max="99999" inputMode="numeric" value={form.basePrice} onChange={(event) => setForm((state) => ({ ...state, basePrice: event.target.value }))} /></label> : <p className="host-workspace-note">Pour un hôtel ou une maison d’hôte, les prix sont gérés par catégorie de chambre afin de ne pas écraser les tarifs individuels.</p>}
        <fieldset><legend>Mode de réservation</legend><button type="button" data-active={form.bookingMode === 'request-first' ? 'true' : 'false'} onClick={() => setForm((state) => ({ ...state, bookingMode: 'request-first' }))}>Demande d’abord</button><button type="button" data-active={form.bookingMode === 'instant' ? 'true' : 'false'} onClick={() => setForm((state) => ({ ...state, bookingMode: 'instant' }))}>Réservation instantanée</button></fieldset>
        <button type="button" className="host-primary-action" onClick={save}>Enregistrer les modifications</button>
      </section> : null}

      {feedback ? <p className="host-workspace-feedback" role="status">{feedback}</p> : null}
      {pooled ? <section className="host-workspace-section host-room-management"><div className="host-workspace-section__head"><div><span>Inventaire</span><h2>Chambres et catégories</h2></div></div><p className="host-workspace-note">La configuration actuelle reste la source de vérité pour les photos, capacités, prix et stocks par catégorie.</p><HostRoomTypeManager profile={profile} userId={userId} onNavigate={onNavigate} /></section> : null}
    </div>
  )
}

function ReservationCard({ item, currency }) {
  return (
    <article className="host-reservation-card" data-status={item.status}>
      <div className="host-reservation-card__top"><span>{reservationLabel(item.status)}</span><b>{money(item.gross, currency)}</b></div>
      <strong>{item.room?.name || 'Réservation confirmée'}</strong>
      <p>{shortDate(item.checkIn)} → {shortDate(item.checkOut)} · {item.units} chambre{item.units > 1 ? 's' : ''}</p>
      <small>Réf. {item.id}</small>
    </article>
  )
}

function ReservationsView({ listing, rows }) {
  const [filter, setFilter] = useState('active')
  const visible = rows.filter((item) => filter === 'all' || (filter === 'active' ? item.status !== 'past' : item.status === 'past'))
  return (
    <div className="host-workspace-view" data-testid="host-reservations">
      <section className="host-workspace-section host-workspace-section--flush">
        <div className="host-workspace-section__head"><div><span>Opérations</span><h2>Réservations confirmées</h2></div><b>{rows.length}</b></div>
        <div className="host-segmented"><button type="button" data-active={filter === 'active'} onClick={() => setFilter('active')}>À venir</button><button type="button" data-active={filter === 'past'} onClick={() => setFilter('past')}>Terminées</button><button type="button" data-active={filter === 'all'} onClick={() => setFilter('all')}>Toutes</button></div>
        {visible.length ? <div className="host-reservation-list">{visible.map((item) => <ReservationCard key={item.id} item={item} currency={listing.currency} />)}</div> : <EmptyState title="Aucune réservation dans cette vue" copy="Cette page ne fabrique pas de voyageurs de démonstration. Elle affiche uniquement les réservations réellement enregistrées dans le stock local de cette annonce." />}
      </section>
    </div>
  )
}

function EarningsView({ listing, rows }) {
  const total = rows.reduce((sum, item) => sum + item.gross, 0)
  const upcoming = rows.filter((item) => item.status !== 'past').reduce((sum, item) => sum + item.gross, 0)
  const completed = total - upcoming
  const monthly = useMemo(() => {
    const data = new Map()
    rows.forEach((item) => {
      const key = String(item.checkIn).slice(0, 7)
      data.set(key, (data.get(key) || 0) + item.gross)
    })
    return Array.from(data.entries()).sort(([a], [b]) => b.localeCompare(a))
  }, [rows])
  return (
    <div className="host-workspace-view" data-testid="host-earnings">
      <section className="host-earnings-hero"><span>Revenu brut calculé</span><strong>{money(total, listing.currency)}</strong><p>Calculé nuit par nuit depuis les tarifs du calendrier et les réservations confirmées enregistrées.</p></section>
      <section className="host-metrics host-metrics--two"><article><span>Séjours terminés</span><strong>{money(completed, listing.currency)}</strong><small>Estimation brute</small></article><article><span>À venir</span><strong>{money(upcoming, listing.currency)}</strong><small>Réservations actives</small></article></section>
      <section className="host-workspace-section"><div className="host-workspace-section__head"><div><span>Historique</span><h2>Par mois d’arrivée</h2></div></div>{monthly.length ? <div className="host-earnings-list">{monthly.map(([month, value]) => <div key={month}><span>{new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(new Date(`${month}-01T12:00:00`))}</span><strong>{money(value, listing.currency)}</strong></div>)}</div> : <EmptyState title="Pas encore de revenu calculable" copy="Les revenus apparaîtront après l’enregistrement de réservations confirmées." />}</section>
      <p className="host-workspace-note host-workspace-note--boxed">Les versements bancaires, commissions, remboursements et documents fiscaux nécessitent un backend de paiement. Aucun faux versement n’est affiché dans cette version.</p>
    </div>
  )
}

function MessagesView({ rows, onNavigate }) {
  return (
    <div className="host-workspace-view" data-testid="host-messages">
      <section className="host-workspace-section host-workspace-section--flush"><div className="host-workspace-section__head"><div><span>Boîte Hôte</span><h2>Messages voyageurs</h2></div></div><EmptyState title="Aucune conversation Hôte reliée" copy={rows.length ? 'Des réservations existent, mais aucune conversation voyageur n’est encore reliée à ces identifiants. Le workspace ne réutilise pas les conversations voyageur de démonstration comme si elles appartenaient à cet hôte.' : 'Les conversations apparaîtront ici lorsqu’un moteur de réservation et de messagerie relié au voyageur créera un fil pour cette annonce.'} action={rows.length ? 'Voir les réservations' : undefined} onAction={() => onNavigate('/host/reservations')} /></section>
    </div>
  )
}

function SettingsView({ listing, userId }) {
  const [feedback, setFeedback] = useState('')
  const [rules, setRules] = useState(() => ({ ...listing.stayRules }))
  const [workspaceSettings, setWorkspaceSettings] = useState(() => readHostWorkspaceSettings(userId))
  useEffect(() => setRules({ ...listing.stayRules }), [listing.stayRules])
  const save = () => {
    try {
      updateHostListing(userId, { stayRules: rules })
      writeHostWorkspaceSettings(userId, workspaceSettings)
      setFeedback('Réglages enregistrés.')
    } catch (error) {
      setFeedback(error?.message || 'Impossible d’enregistrer les réglages.')
    }
  }
  const toggleNotification = (key) => setWorkspaceSettings((state) => ({ ...state, notifications: { ...state.notifications, [key]: !state.notifications[key] } }))
  return (
    <div className="host-workspace-view" data-testid="host-settings">
      <section className="host-editor">
        <div className="host-workspace-section__head"><div><span>Séjours</span><h2>Règles de réservation</h2></div></div>
        <div className="host-settings-grid"><label><span>Nuits minimum</span><input type="number" min="1" max="365" value={rules.minNights} onChange={(event) => setRules((state) => ({ ...state, minNights: Math.max(1, Number(event.target.value) || 1) }))} /></label><label><span>Nuits maximum</span><input type="number" min={rules.minNights} max="365" value={rules.maxNights} onChange={(event) => setRules((state) => ({ ...state, maxNights: Math.max(rules.minNights, Number(event.target.value) || rules.minNights) }))} /></label><label><span>Préavis (jours)</span><input type="number" min="0" max="365" value={rules.advanceNoticeDays} onChange={(event) => setRules((state) => ({ ...state, advanceNoticeDays: Math.max(0, Number(event.target.value) || 0) }))} /></label><label><span>Préparation (jours)</span><input type="number" min="0" max="7" value={rules.preparationDays} onChange={(event) => setRules((state) => ({ ...state, preparationDays: Math.max(0, Number(event.target.value) || 0) }))} /></label><label><span>Arrivée à partir de</span><input type="time" value={rules.checkInFrom} onChange={(event) => setRules((state) => ({ ...state, checkInFrom: event.target.value }))} /></label><label><span>Départ avant</span><input type="time" value={rules.checkOutUntil} onChange={(event) => setRules((state) => ({ ...state, checkOutUntil: event.target.value }))} /></label></div>
        <div className="host-toggle-list"><button type="button" aria-pressed={rules.petsAllowed} onClick={() => setRules((state) => ({ ...state, petsAllowed: !state.petsAllowed }))}><span><strong>Animaux autorisés</strong><small>Règle visible dans vos réglages Hôte</small></span><i data-on={rules.petsAllowed} /></button><button type="button" aria-pressed={rules.smokingAllowed} onClick={() => setRules((state) => ({ ...state, smokingAllowed: !state.smokingAllowed }))}><span><strong>Fumeurs autorisés</strong><small>À confirmer dans les règles finales voyageur</small></span><i data-on={rules.smokingAllowed} /></button><button type="button" aria-pressed={rules.eventsAllowed} onClick={() => setRules((state) => ({ ...state, eventsAllowed: !state.eventsAllowed }))}><span><strong>Événements autorisés</strong><small>Préférence de l’annonce</small></span><i data-on={rules.eventsAllowed} /></button></div>
      </section>
      <section className="host-editor"><div className="host-workspace-section__head"><div><span>Alertes</span><h2>Notifications Hôte</h2></div></div><div className="host-toggle-list"><button type="button" aria-pressed={workspaceSettings.notifications.reservations} onClick={() => toggleNotification('reservations')}><span><strong>Nouvelles réservations</strong><small>Préférence locale de notification</small></span><i data-on={workspaceSettings.notifications.reservations} /></button><button type="button" aria-pressed={workspaceSettings.notifications.messages} onClick={() => toggleNotification('messages')}><span><strong>Nouveaux messages</strong><small>Préférence locale de notification</small></span><i data-on={workspaceSettings.notifications.messages} /></button><button type="button" aria-pressed={workspaceSettings.notifications.calendar} onClick={() => toggleNotification('calendar')}><span><strong>Alertes calendrier</strong><small>Stock et disponibilité</small></span><i data-on={workspaceSettings.notifications.calendar} /></button></div></section>
      {feedback ? <p className="host-workspace-feedback" role="status">{feedback}</p> : null}<button type="button" className="host-primary-action host-primary-action--sticky" onClick={save}>Enregistrer les réglages</button>
    </div>
  )
}

export function HostWorkspacePage({ view, profile, userId, onNavigate }) {
  const listing = profile.listing
  const [reservations, setReservations] = useState(() => listConfirmedRoomReservationsForListing(listing.id))
  useEffect(() => {
    const sync = () => setReservations(listConfirmedRoomReservationsForListing(listing.id))
    sync()
    window.addEventListener(HOST_ROOM_INVENTORY_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => { window.removeEventListener(HOST_ROOM_INVENTORY_EVENT, sync); window.removeEventListener('storage', sync) }
  }, [listing.id])
  const rows = useMemo(() => reservationRows(listing, reservations), [listing, reservations])
  return (
    <section className="host-workspace" data-testid="host-workspace" data-view={view}>
      <HostHeader listing={listing} view={view} onNavigate={onNavigate} />
      <HostWorkspaceNav active={view} onNavigate={onNavigate} />
      <main className="host-workspace__content">
        {view === 'dashboard' ? <DashboardView listing={listing} rows={rows} onNavigate={onNavigate} /> : null}
        {view === 'listings' ? <ListingView profile={profile} userId={userId} onNavigate={onNavigate} /> : null}
        {view === 'reservations' ? <ReservationsView listing={listing} rows={rows} /> : null}
        {view === 'earnings' ? <EarningsView listing={listing} rows={rows} /> : null}
        {view === 'messages' ? <MessagesView rows={rows} onNavigate={onNavigate} /> : null}
        {view === 'settings' ? <SettingsView listing={listing} userId={userId} /> : null}
      </main>
    </section>
  )
}
