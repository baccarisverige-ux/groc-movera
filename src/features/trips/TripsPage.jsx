import { useEffect, useMemo, useState } from 'react'
import { listReservationsForGuest, RESERVATIONS_EVENT } from '../../entities/reservation/reservationStore.js'
import { changeReservationStatus } from '../../entities/reservation/reservationService.js'
import { OptimizedListingImage } from '../../shared/media/OptimizedListingImage.jsx'
import { useAuthSession } from '../auth/authSession.js'
import { getGuestListingById } from '../listing/guestListings.js'
import './trips-page.css'

function dateLabel(value) {
  const date = new Date(`${value}T12:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

function statusLabel(status) {
  if (status === 'pending') return 'En attente de l’hôte'
  if (status === 'confirmed') return 'Confirmée'
  if (status === 'cancelled') return 'Annulée'
  return status
}

export function TripsPage({ onNavigate }) {
  const { session } = useAuthSession()
  const [version, setVersion] = useState(0)
  const [feedback, setFeedback] = useState('')

  useEffect(() => {
    const sync = () => setVersion((value) => value + 1)
    window.addEventListener(RESERVATIONS_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(RESERVATIONS_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const trips = useMemo(() => {
    void version
    return listReservationsForGuest(session?.userId || '').map((reservation) => ({
      reservation,
      listing: getGuestListingById(reservation.listingId),
    }))
  }, [session?.userId, version])

  const cancelTrip = (id) => {
    setFeedback('')
    try {
      changeReservationStatus(id, 'cancelled')
      setFeedback('Réservation annulée. La disponibilité a été mise à jour.')
      setVersion((value) => value + 1)
    } catch (error) {
      setFeedback(error?.message || 'Impossible d’annuler cette réservation.')
    }
  }

  return (
    <section className="trips-page" data-testid="page-trips">
      <header className="trips-page__header">
        <span>Movera Host</span>
        <h1>Voyages</h1>
        <p>Demandes et réservations créées depuis votre compte voyageur.</p>
      </header>

      <main className="trips-page__content">
        {feedback ? <p className="trips-page__feedback" role="status">{feedback}</p> : null}
        {trips.length ? (
          <div className="trips-page__list">
            {trips.map(({ reservation, listing }) => (
              <article className="trips-page__card" key={reservation.id} data-status={reservation.status}>
                <button type="button" className="trips-page__listing" onClick={() => listing && onNavigate(`/listing/${listing.id}`)} disabled={!listing}>
                  <span className="trips-page__image">{listing?.image ? <OptimizedListingImage src={listing.image} alt="" loading="lazy" sizes="84px" /> : <b>MH</b>}</span>
                  <span className="trips-page__copy">
                    <small>{statusLabel(reservation.status)}</small>
                    <strong>{listing?.title || 'Annonce indisponible'}</strong>
                    <span>{listing?.location || ''}</span>
                  </span>
                </button>
                <div className="trips-page__meta">
                  <div><span>Séjour</span><strong>{dateLabel(reservation.checkIn)} → {dateLabel(reservation.checkOut)}</strong></div>
                  <div><span>Total réservé</span><strong>{reservation.total} {reservation.currency}</strong></div>
                  <div><span>Référence</span><strong>{reservation.id}</strong></div>
                </div>
                {reservation.status !== 'cancelled' ? <button type="button" className="trips-page__cancel" onClick={() => cancelTrip(reservation.id)}>Annuler la réservation</button> : null}
              </article>
            ))}
          </div>
        ) : (
          <div className="trips-page__empty">
            <span>MH</span>
            <h2>Aucun voyage pour le moment</h2>
            <p>Une demande ou réservation créée depuis une annonce apparaîtra ici automatiquement.</p>
            <button type="button" onClick={() => onNavigate('/')}>Découvrir les séjours</button>
          </div>
        )}
      </main>
    </section>
  )
}
