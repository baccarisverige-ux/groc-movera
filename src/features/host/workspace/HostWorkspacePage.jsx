import { useEffect, useMemo, useState } from 'react'
import { readHostCalendarForListing } from '../../../entities/host/hostCalendarStore.js'
import {
  HOST_ROOM_INVENTORY_EVENT,
  listConfirmedRoomReservationsForListing,
} from '../../../entities/host/hostRoomInventoryStore.js'
import { OptimizedListingImage } from '../../../shared/media/OptimizedListingImage.jsx'
import { HostListingEditor } from '../listings/HostListingEditor.jsx'
import { HostListingSettings } from '../listings/HostListingSettings.jsx'
import { listingCoverPhoto, listingSubtitle } from '../listings/hostListingEditorModel.js'
import { HostMessagesView } from './HostMessagesView.jsx'
import {
  BackIcon,
  BellIcon,
  BookIcon,
  CalendarIcon,
  ChartIcon,
  ChevronIcon,
  GearIcon,
  HelpIcon,
  ListingsIcon,
  MenuIcon,
  MessagesIcon,
  MoneyIcon,
  PlusIcon,
  ShieldIcon,
  TodayIcon,
  UserIcon,
} from './hostB225Icons.jsx'
import {
  HOST_MENU_ROWS,
  HOST_NAV_ITEMS,
  formatMoney,
  formatMonth,
  formatShortDate,
  hostFollowUps,
  hostRevenueBreakdown,
  hostRevenueByPeriod,
  hostRevenueSpark,
  hostReviewSummary,
  hostTodayRows,
  initialsFor,
  reservationCountLabel,
  todayCardTime,
  todayCardTitle,
} from './hostB225Model.js'
import {
  estimateReservationGross,
  hostNavViewFor,
  reservationStatus,
  roomForReservation,
} from './hostWorkspaceModel.js'
import './host-b225.css'

const MENU_ICONS = {
  gear: GearIcon,
  user: UserIcon,
  plus: PlusIcon,
  shield: ShieldIcon,
  book: BookIcon,
  money: MoneyIcon,
  chart: ChartIcon,
  help: HelpIcon,
}

const NAV_ICONS = {
  dashboard: TodayIcon,
  calendar: CalendarIcon,
  listings: ListingsIcon,
  messages: MessagesIcon,
  menu: MenuIcon,
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

/* b225's floating dock: five tabs on a dark ink slab lifted off the bottom
   edge, mint for the active one. `top: auto` is load-bearing -- the element
   this replaced inherited a `top: 0` from a retired sticky rule and pinned
   itself to the top of the screen over the add button. */
export function HostWorkspaceNav({ active, onNavigate }) {
  return (
    <nav className="host-b225-nav" aria-label="Navigation Hôte">
      {HOST_NAV_ITEMS.map((item) => {
        const Icon = NAV_ICONS[item.id]
        const current = item.id === active
        return (
          <button
            type="button"
            key={item.id}
            data-active={current ? 'true' : 'false'}
            aria-current={current ? 'page' : undefined}
            onClick={() => onNavigate(item.path)}
          >
            <Icon />
            <span>{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

function EmptyBlock({ title, copy }) {
  return (
    <div className="hb-empty">
      <strong>{title}</strong>
      <p>{copy}</p>
    </div>
  )
}

function Avatar({ initials, className = 'avatar' }) {
  return <span className={className} aria-hidden="true">{initials}</span>
}

/* ---- Today ----------------------------------------------------------- */

/* b225's cal-prop-bar: the active listing, with its cover, as a row the host
   can tap to reach it. The reference puts it above the calendar only; it is
   here too because a Today screen with no arrivals otherwise never names the
   listing it is reporting on, and a host with a quiet week would be reading
   an empty screen with nothing to identify it. */
function PropertyBar({ listing, onNavigate }) {
  const cover = listingCoverPhoto(listing)
  return (
    <button type="button" className="cal-prop-bar" onClick={() => onNavigate('/host/listings/editor')} data-testid="host-property-bar">
      {cover
        ? <OptimizedListingImage className="cal-prop-thumb" src={cover} alt="" sizes="48px" />
        : <span className="cal-prop-thumb-empty" aria-hidden="true">🏡</span>}
      <span className="cal-prop-meta">
        <span className="cal-prop-label">Logement actif</span>
        <strong>{listing.name}</strong>
      </span>
      <span className="cal-prop-chev" aria-hidden="true">›</span>
    </button>
  )
}

function TodayScreen({ listing, rows, onNavigate, onOpenVerify }) {
  const [tab, setTab] = useState('today')
  const { today, upcoming } = useMemo(() => hostTodayRows(rows), [rows])
  const follows = useMemo(() => hostFollowUps(rows), [rows])
  const visible = tab === 'today' ? today : upcoming

  return (
    <div className="host-scroll" data-testid="host-dashboard">
      <div className="host-top">
        <h1>Aujourd’hui</h1>
        <div className="acts">
          <button type="button" aria-label="Notifications" onClick={() => onNavigate('/host/messages')}><BellIcon /></button>
        </div>
      </div>

      <PropertyBar listing={listing} onNavigate={onNavigate} />

      <div className="host-tabs" role="tablist" aria-label="Séjours">
        <button type="button" role="tab" aria-selected={tab === 'today'} className={tab === 'today' ? 'on' : ''} onClick={() => setTab('today')}>Aujourd’hui</button>
        <button type="button" role="tab" aria-selected={tab === 'up'} className={tab === 'up' ? 'on' : ''} onClick={() => setTab('up')}>À venir</button>
      </div>

      <p className="host-section-label">{reservationCountLabel(visible.length)}</p>

      {visible.length ? visible.map((row) => (
        <button
          type="button"
          className="host-card"
          key={row.id}
          data-testid={`host-today-${row.kind}`}
          onClick={() => onNavigate('/host/reservations')}
        >
          <span className="time">{todayCardTime(row, listing)}</span>
          <span className="who">
            <Avatar initials={row.initials} />
            <span className="who-copy">
              <h3>{todayCardTitle(row)}</h3>
              <p>{listing.name} · {listing.city}</p>
            </span>
          </span>
        </button>
      )) : (
        <EmptyBlock
          title={tab === 'today' ? 'Rien aujourd’hui' : 'Aucun séjour à venir'}
          copy="Les réservations confirmées de cette annonce apparaissent ici. Cet écran n’affiche pas de voyageur de démonstration."
        />
      )}

      <button type="button" className="mh-verify" onClick={onOpenVerify} data-testid="host-verify-card">
        <h3>Profil hôte Movera</h3>
        <p>La confiance passe par la vérification d’identité. Sécurisez votre compte pour rassurer les voyageurs.</p>
        <span className="badge">Vérification recommandée</span>
      </button>

      {follows.length ? (
        <>
          <p className="host-section-label">Suivis</p>
          {follows.map((row) => (
            <button type="button" className="host-follow" key={row.id} data-testid="host-follow-up" onClick={() => onNavigate('/host/reservations')}>
              <span className="av">{row.initials}</span>
              <span className="info">
                <span>{row.daysLeft} jour{row.daysLeft > 1 ? 's' : ''} restant{row.daysLeft > 1 ? 's' : ''}</span>
                <strong>Laisser un avis à {row.guest}</strong>
                <p>{listing.name} · {listing.city}</p>
              </span>
            </button>
          ))}
        </>
      ) : null}
    </div>
  )
}

/* ---- Menu / dashboard ------------------------------------------------- */

function MenuScreen({ listing, rows, reviews, onNavigate, onOverlay }) {
  const revenue = useMemo(() => hostRevenueBreakdown(rows), [rows])
  const spark = useMemo(() => hostRevenueSpark(rows), [rows])
  const summary = useMemo(() => hostReviewSummary(reviews), [reviews])

  return (
    <div className="host-scroll" data-testid="host-menu">
      <div className="host-top">
        <h1>Tableau de bord</h1>
        <div className="acts">
          <button type="button" aria-label="Notifications" onClick={() => onNavigate('/host/messages')}><BellIcon /></button>
        </div>
      </div>

      <div className="host-stats-6d">
        <button type="button" className="hs6-rev" onClick={() => onNavigate('/host/earnings')} data-testid="host-stat-revenue">
          <span className="hs6-rev-top">
            <span className="hs6-badge">Revenus</span>
          </span>
          <span className="hs6-amount">{Math.round(revenue.net).toLocaleString('fr-FR')} <small>{listing.currency}</small></span>
          <span className="hs6-sub">Net estimé sur réservations confirmées</span>
          <span className="hs6-chart" aria-hidden="true">
            {spark.map((bar, index) => <span key={index} style={{ '--h': `${bar.height}%` }} />)}
          </span>
          <span className="hs6-cta">Détail &amp; paiements ›</span>
        </button>

        <button type="button" className="hs6-rate" onClick={() => onNavigate('/host/reviews')} data-testid="host-stat-reviews">
          <span className="hs6-ring" aria-hidden="true">
            <svg viewBox="0 0 72 72">
              <circle className="hs6-ring-bg" cx="36" cy="36" r="30" />
              <circle className="hs6-ring-fg" cx="36" cy="36" r="30" style={{ '--pct': summary.hasReviews ? summary.score / 5 : 0 }} />
            </svg>
            <span className="hs6-ring-val">{summary.hasReviews ? summary.score.toFixed(1).replace('.', ',') : '—'}</span>
          </span>
          <span className="hs6-rate-body">
            <span className="hs6-badge light">Avis</span>
            <strong>{summary.hasReviews ? `${summary.count} avis` : 'Pas encore d’avis'}</strong>
            <span className="hs6-cta">Lire &amp; répondre ›</span>
          </span>
        </button>
      </div>

      <button type="button" className="host-banner2" onClick={() => onNavigate('/host?new=1')} data-testid="host-create-banner">
        <span style={{ fontSize: '28px' }} aria-hidden="true">🏡</span>
        <span><strong>Créer une annonce</strong><span className="sub">Publiez un logement sur Movera</span></span>
      </button>

      <div className="host-menu-list">
        {HOST_MENU_ROWS.map((row) => {
          const Icon = MENU_ICONS[row.icon]
          return (
            <button
              type="button"
              className="si"
              key={row.id}
              data-testid={`host-menu-${row.id}`}
              onClick={() => (row.kind === 'overlay' ? onOverlay(row.target) : onNavigate(row.target))}
            >
              <Icon className="ic" />
              <span className="label">{row.label}</span>
              <ChevronIcon />
            </button>
          )
        })}
      </div>

      <button type="button" className="host-back-travel" onClick={() => onNavigate('/')}>← Mode Voyageur</button>
    </div>
  )
}

/* ---- Revenue ---------------------------------------------------------- */

function RevenueScreen({ listing, rows, onNavigate }) {
  const [period, setPeriod] = useState('month')
  const scoped = useMemo(() => hostRevenueByPeriod(rows, period), [rows, period])
  const breakdown = useMemo(() => hostRevenueBreakdown(scoped), [scoped])
  const history = useMemo(() => {
    const data = new Map()
    rows.forEach((row) => {
      const key = String(row.checkIn).slice(0, 7)
      data.set(key, (data.get(key) || 0) + row.gross)
    })
    return Array.from(data.entries()).sort(([a], [b]) => b.localeCompare(a)).slice(0, 6)
  }, [rows])

  return (
    <div className="host-scroll" data-testid="host-earnings">
      <div className="host-top">
        <button type="button" className="hs6-back" aria-label="Retour" onClick={() => onNavigate('/host/menu')}><BackIcon /></button>
        <h1 style={{ flex: 1, fontSize: '18px' }}>Revenus</h1>
      </div>

      <div className="rev-page">
        <div className="rev-hero">
          <div className="rev-period" role="tablist" aria-label="Période">
            <button type="button" role="tab" aria-selected={period === 'month'} className={period === 'month' ? 'on' : ''} onClick={() => setPeriod('month')}>Ce mois</button>
            <button type="button" role="tab" aria-selected={period === 'year'} className={period === 'year' ? 'on' : ''} onClick={() => setPeriod('year')}>Année</button>
            <button type="button" role="tab" aria-selected={period === 'all'} className={period === 'all' ? 'on' : ''} onClick={() => setPeriod('all')}>Tout</button>
          </div>
          <div className="rev-hero-amount">{Math.round(breakdown.net).toLocaleString('fr-FR')} <small>{listing.currency}</small></div>
          <div className="rev-hero-sub">Net estimé après frais de service Movera</div>
        </div>

        <div className="rev-section">
          <div className="rev-sec-h"><h3>Ventilation</h3></div>
          {breakdown.stays.length ? breakdown.stays.map((stay) => (
            <div className="rev-row" key={stay.id}>
              <span>{stay.label} · {stay.nights} nuit{stay.nights > 1 ? 's' : ''}</span>
              <strong>{formatMoney(stay.gross, listing.currency)}</strong>
            </div>
          )) : <div className="rev-row muted"><span>Aucune réservation sur la période</span><strong>0 {listing.currency}</strong></div>}
          <div className="rev-row muted"><span>Frais de service Movera</span><strong>−{formatMoney(breakdown.fee, listing.currency)}</strong></div>
          <div className="rev-row total"><span>Net à recevoir</span><strong>{formatMoney(breakdown.net, listing.currency)}</strong></div>
        </div>

        <div className="rev-section">
          <div className="rev-sec-h"><h3>Historique</h3></div>
          {history.length ? history.map(([month, value]) => (
            <div className="rev-hist" key={month}><span>{formatMonth(month)}</span><strong>{formatMoney(value, listing.currency)}</strong></div>
          )) : <div className="rev-row muted"><span>Pas encore d’historique</span><strong>—</strong></div>}
        </div>
      </div>

      <p className="hb-note">
        Les versements bancaires, commissions réelles, remboursements et documents fiscaux
        demandent un backend de paiement. Aucun versement n’est simulé ici : les montants
        ci-dessus sont calculés depuis vos tarifs et vos réservations confirmées.
      </p>
    </div>
  )
}

/* ---- Reviews ---------------------------------------------------------- */

function ReviewsScreen({ reviews, onNavigate }) {
  const [filter, setFilter] = useState('all')
  const summary = useMemo(() => hostReviewSummary(reviews), [reviews])
  const visible = reviews.filter((review) => filter === 'all' || (filter === 'pending' ? !review.reply : Boolean(review.reply)))

  return (
    <div className="host-scroll" data-testid="host-reviews">
      <div className="host-top">
        <button type="button" className="hs6-back" aria-label="Retour" onClick={() => onNavigate('/host/menu')}><BackIcon /></button>
        <h1 style={{ flex: 1, fontSize: '18px' }}>Avis voyageurs</h1>
      </div>

      <div className="rvw-page">
        {/* The score hero is the summary of something. With no reviews it has
            nothing to summarise, and rendering it anyway stacked two empty
            states saying the same thing -- with an em-dash at 44px reading as
            a black bar where the score belongs. One empty state, or the hero. */}
        {summary.hasReviews ? (
          <>
            <div className="rvw-hero">
              <div className="rvw-score">{summary.score.toFixed(1).replace('.', ',')}</div>
              <div className="rvw-stars" aria-hidden="true">{'★'.repeat(Math.round(summary.score))}{'☆'.repeat(5 - Math.round(summary.score))}</div>
              <div className="rvw-meta">{summary.count} avis public{summary.count > 1 ? 's' : ''}</div>
              <div className="rvw-bars">
                {summary.categories.map((category) => (
                  <div className="rvw-bar" key={category.id}>
                    <span>{category.label}</span>
                    <i style={{ '--w': `${category.percent}%` }} />
                    <b>{category.score.toFixed(1).replace('.', ',')}</b>
                  </div>
                ))}
              </div>
            </div>

            <div className="rvw-filters" role="tablist" aria-label="Filtrer les avis">
              <button type="button" role="tab" aria-selected={filter === 'all'} className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>Tous</button>
              <button type="button" role="tab" aria-selected={filter === 'pending'} className={filter === 'pending' ? 'on' : ''} onClick={() => setFilter('pending')}>À répondre</button>
              <button type="button" role="tab" aria-selected={filter === 'done'} className={filter === 'done' ? 'on' : ''} onClick={() => setFilter('done')}>Répondus</button>
            </div>
            {visible.map((review) => (
              <article className="rvw-card" key={review.id}>
                <div className="rvw-head">
                  <span className="av">{initialsFor(review.guest)}</span>
                  <div><strong>{review.guest}</strong><span>{formatShortDate(review.date)}</span></div>
                  <div className="rvw-score-sm">{Number(review.score).toFixed(1).replace('.', ',')}</div>
                </div>
                <p>{review.text}</p>
                {review.reply
                  ? <div className="rvw-host-reply"><strong>Votre réponse</strong><span>{review.reply}</span></div>
                  : <button type="button" className="rvw-reply">Répondre</button>}
              </article>
            ))}
          </>
        ) : (
          <EmptyBlock
            title="Pas encore d’avis"
            copy="Les avis apparaissent après le départ des voyageurs. Cet écran n’affiche pas de note inventée tant qu’aucun avis n’a été déposé."
          />
        )}
      </div>
    </div>
  )
}

/* ---- Reservations ------------------------------------------------------ */

function ReservationsScreen({ listing, rows, onNavigate }) {
  const [filter, setFilter] = useState('active')
  const visible = rows.filter((row) => (filter === 'all' ? true : filter === 'active' ? row.status !== 'past' : row.status === 'past'))

  return (
    <div className="host-scroll" data-testid="host-reservations">
      <div className="host-top">
        <button type="button" className="hs6-back" aria-label="Retour" onClick={() => onNavigate('/host/menu')}><BackIcon /></button>
        <h1 style={{ flex: 1, fontSize: '18px' }}>Réservations</h1>
      </div>

      <div className="host-tabs" role="tablist" aria-label="Filtrer les réservations">
        <button type="button" role="tab" aria-selected={filter === 'active'} className={filter === 'active' ? 'on' : ''} onClick={() => setFilter('active')}>À venir</button>
        <button type="button" role="tab" aria-selected={filter === 'past'} className={filter === 'past' ? 'on' : ''} onClick={() => setFilter('past')}>Terminées</button>
        <button type="button" role="tab" aria-selected={filter === 'all'} className={filter === 'all' ? 'on' : ''} onClick={() => setFilter('all')}>Toutes</button>
      </div>

      {visible.length ? visible.map((row) => (
        <div className="host-follow" key={row.id}>
          <span className="av">{initialsFor(row.guestLabel || row.id)}</span>
          <span className="info">
            <span>{formatShortDate(row.checkIn)} → {formatShortDate(row.checkOut)}</span>
            <strong>{row.room?.name || 'Réservation confirmée'}</strong>
            <p>{formatMoney(row.gross, listing.currency)} · {row.units} chambre{row.units > 1 ? 's' : ''}</p>
          </span>
        </div>
      )) : (
        <EmptyBlock
          title="Aucune réservation dans cette vue"
          copy="Seules les réservations réellement enregistrées dans le stock local de cette annonce sont listées."
        />
      )}
    </div>
  )
}

/* ---- Listings ---------------------------------------------------------- */

function ListingsScreen({ listing, onNavigate, onDelete }) {
  const [selected, setSelected] = useState('')
  const [tipOpen, setTipOpen] = useState(false)
  const cover = listingCoverPhoto(listing)
  const online = listing.status !== 'unlisted'

  return (
    <div className="host-scroll" data-testid="host-listings">
      <div className="host-top">
        <h1>Mes annonces</h1>
        <div className="acts">
          <button
            type="button"
            aria-label="Édition groupée"
            aria-pressed={tipOpen}
            onClick={() => { setTipOpen((value) => !value); setSelected('') }}
            data-testid="host-bulk-edit"
          ><ListingsIcon /></button>
          <button type="button" aria-label="Créer une annonce" onClick={() => onNavigate('/host?new=1')} data-testid="host-listings-add"><PlusIcon /></button>
        </div>
      </div>

      {tipOpen && !selected ? (
        <div className="mh-bulk-tip" data-testid="host-bulk-tip">
          <div>
            <strong>Sélection</strong>
            <p>Une seule annonce à la fois · modifier ou supprimer</p>
          </div>
          <button type="button" aria-label="Fermer" onClick={() => setTipOpen(false)}>×</button>
        </div>
      ) : null}

      {selected ? (
        <div className="ls-action-bar" data-testid="host-listing-actions">
          <div className="ls-action-info">
            <strong>{listing.name}</strong>
            <span>Sélectionnée</span>
          </div>
          <div className="ls-action-btns">
            <button type="button" className="ls-edit" onClick={() => onNavigate('/host/listings/editor')}>Modifier</button>
            <button type="button" className="ls-del" onClick={onDelete}>Supprimer</button>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        className="listing-card"
        data-selected={selected === listing.id ? 'true' : 'false'}
        data-testid={`host-listing-card-${listing.id}`}
        onClick={() => (tipOpen ? setSelected((value) => (value ? '' : listing.id)) : onNavigate('/host/listings/editor'))}
      >
        <span className="ph">
          {cover
            ? <OptimizedListingImage src={cover} alt="" sizes="(max-width:430px) 100vw, 400px" />
            : <span className="ph-empty" aria-hidden="true">🏡</span>}
          <span className="status" data-offline={online ? 'false' : 'true'}>
            <i aria-hidden="true" />{online ? 'En ligne' : 'Masquée'}
          </span>
        </span>
        <span className="bd">
          <h3>{listing.name}</h3>
          <p>{listingSubtitle(listing)}</p>
        </span>
      </button>
    </div>
  )
}

/* ---- Page -------------------------------------------------------------- */

export function HostWorkspacePage({ view, profile, userId, onNavigate }) {
  const listing = profile.listing
  const [reservations, setReservations] = useState(() => listConfirmedRoomReservationsForListing(listing.id))
  /* `/host/settings` is a route a host can land on directly -- from the menu,
     from a bookmark, from the back button -- so the overlay is open whenever
     the view says settings, not only when a menu row set the state. Deriving
     it from one of the two sources and not the other is what leaves a route
     rendering an empty screen. */
  const [overlay, setOverlay] = useState('')
  const settingsOpen = overlay === 'settings' || view === 'settings'

  useEffect(() => {
    const sync = () => setReservations(listConfirmedRoomReservationsForListing(listing.id))
    sync()
    window.addEventListener(HOST_ROOM_INVENTORY_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(HOST_ROOM_INVENTORY_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [listing.id])

  const rows = useMemo(() => reservationRows(listing, reservations), [listing, reservations])
  /* No review records exist yet -- there is no store behind them and no
     backend. The screens read this empty list and say so, rather than
     rendering b225's hard-coded 5,0 over a listing nobody has stayed in. */
  const reviews = useMemo(() => [], [])

  return (
    <section className="host-b225" data-testid="host-workspace" data-view={view}>
      {view === 'dashboard' ? <TodayScreen listing={listing} rows={rows} onNavigate={onNavigate} onOpenVerify={() => onNavigate('/profile')} /> : null}
      {view === 'listings' ? <ListingsScreen listing={listing} onNavigate={onNavigate} onDelete={() => onNavigate('/host/listings/editor')} /> : null}
      {view === 'listing-editor' ? (
        <HostListingEditor
          profile={profile}
          userId={userId}
          onNavigate={onNavigate}
          onBack={() => onNavigate('/host/listings')}
        />
      ) : null}
      {view === 'reservations' ? <ReservationsScreen listing={listing} rows={rows} onNavigate={onNavigate} /> : null}
      {view === 'earnings' ? <RevenueScreen listing={listing} rows={rows} onNavigate={onNavigate} /> : null}
      {view === 'reviews' ? <ReviewsScreen reviews={reviews} onNavigate={onNavigate} /> : null}
      {view === 'messages' ? <HostMessagesView listing={listing} rows={rows} onNavigate={onNavigate} /> : null}
      {view === 'menu' || view === 'settings' ? (
        <MenuScreen listing={listing} rows={rows} reviews={reviews} onNavigate={onNavigate} onOverlay={setOverlay} />
      ) : null}

      {settingsOpen ? (
        <HostListingSettings
          listing={listing}
          userId={userId}
          onClose={() => { setOverlay(''); if (view === 'settings') onNavigate('/host/menu') }}
        />
      ) : null}

      <HostWorkspaceNav active={hostNavViewFor(view)} onNavigate={onNavigate} />
    </section>
  )
}
