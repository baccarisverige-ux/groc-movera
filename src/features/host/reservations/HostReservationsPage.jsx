import { useEffect, useMemo, useState } from 'react'
import { RESERVATIONS_EVENT, listReservationsForListing } from '../../../entities/reservation/reservationStore.js'
import { changeReservationStatus } from '../../../entities/reservation/reservationService.js'
import { HostWorkspaceNav } from '../workspace/HostWorkspacePage.jsx'
import '../workspace/host-workspace.css'
import './host-reservations.css'

function money(value, currency = 'TND') {
  return `${Math.round(Number(value) || 0).toLocaleString('fr-FR')} ${currency}`
}

function dateLabel(value) {
  const date = new Date(`${value}T12:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

function statusLabel(status) {
  if (status === 'pending') return 'Demande à valider'
  if (status === 'confirmed') return 'Confirmée'
  if (status === 'cancelled') return 'Annulée'
  return status
}

export function HostReservationsPage({ profile, onNavigate }) {
  const listing = profile?.listing
  const [version, setVersion] = useState(0)
  const [filter, setFilter] = useState('active')
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

  const reservations = useMemo(() => {
    void version
    return listing?.id ? listReservationsForListing(listing.id, { includeCancelled: true }) : []
  }, [listing?.id, version])

  const visible = reservations.filter((reservation) => {
    if (filter === 'all') return true
    if (filter === 'pending') return reservation.status === 'pending'
    if (filter === 'confirmed') return reservation.status === 'confirmed'
    return reservation.status !== 'cancelled'
  })

  const roomName = (reservation) => listing?.roomTypes?.find((room) => room.id === reservation.roomTypeId)?.name || ''

  const updateStatus = (reservation, status) => {
    setFeedback('')
    try {
      const updated = changeReservationStatus(reservation.id, status)
      setFeedback(status === 'confirmed' ? 'Réservation confirmée et disponibilité mise à jour.' : 'Réservation annulée et disponibilité libérée.')
      setVersion((value) => value + 1)
      return updated
    } catch (error) {
      setFeedback(error?.message || 'Impossible de modifier cette réservation.')
      return null
    }
  }

  if (!listing) return null

  return (
    <section className="host-workspace host-reservations-page" data-testid="host-reservations-canonical">
      <header className="host-workspace__header host-reservations-page__header">
        <div className="host-workspace__brand"><span>MH</span><div><strong>Movera Host</strong><small>{listing.city} · {listing.name}</small></div></div>
        <div className="host-workspace__header-row"><div><small>Demandes et séjours réels</small><h1>Réservations</h1></div><button type="button" className="host-workspace__traveler" onClick={() => onNavigate('/')}>Mode Voyageur</button></div>
      </header>
      <HostWorkspaceNav active="reservations" onNavigate={onNavigate} />

      <main className="host-workspace__content host-reservations-page__content">
        <section className="host-workspace-section">
          <div className="host-workspace-section__head"><div><span>Source unique</span><h2>{reservations.length} réservation{reservations.length > 1 ? 's' : ''}</h2></div><b>{reservations.filter((item) => item.status === 'pending').length} à valider</b></div>
          <div className="host-segmented host-reservations-page__filters">
            <button type="button" data-active={filter === 'active'} onClick={() => setFilter('active')}>Actives</button>
            <button type="button" data-active={filter === 'pending'} onClick={() => setFilter('pending')}>Demandes</button>
            <button type="button" data-active={filter === 'confirmed'} onClick={() => setFilter('confirmed')}>Confirmées</button>
            <button type="button" data-active={filter === 'all'} onClick={() => setFilter('all')}>Toutes</button>
          </div>

          {feedback ? <p className="host-workspace-feedback" role="status">{feedback}</p> : null}

          {visible.length ? (
            <div className="host-reservations-page__list">
              {visible.map((reservation) => {
                const room = roomName(reservation)
                return (
                  <article key={reservation.id} className="host-reservations-page__card" data-status={reservation.status}>
                    <div className="host-reservations-page__status"><span>{statusLabel(reservation.status)}</span><strong>{money(reservation.total, reservation.currency)}</strong></div>
                    <h3>{reservation.guestLabel || 'Voyageur Movera'}</h3>
                    <p>{dateLabel(reservation.checkIn)} → {dateLabel(reservation.checkOut)}</p>
                    <small>{room ? `${room} · ` : ''}{reservation.units} unité{reservation.units > 1 ? 's' : ''} · Réf. {reservation.id}</small>
                    {reservation.status !== 'cancelled' ? (
                      <div className="host-reservations-page__actions">
                        {reservation.status === 'pending' ? <button type="button" className="is-primary" onClick={() => updateStatus(reservation, 'confirmed')}>Confirmer</button> : null}
                        <button type="button" onClick={() => updateStatus(reservation, 'cancelled')}>Annuler</button>
                      </div>
                    ) : null}
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="host-workspace-empty"><span className="host-workspace-empty__mark">MH</span><strong>Aucune réservation dans cette vue</strong><p>Seules les demandes et réservations réellement créées depuis le calendrier voyageur apparaissent ici.</p></div>
          )}
        </section>
      </main>
    </section>
  )
}
