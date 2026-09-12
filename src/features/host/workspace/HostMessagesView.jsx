import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  buildHostThreads,
  HOST_MESSAGE_EVENT,
  listMessagesForListing,
  sendHostMessage,
} from '../../../entities/host/hostMessageStore.js'
import './host-messages.css'

/* The host inbox.

   This view used to be a permanent empty state, because the only conversations
   in the app are guest-side demo fixtures and showing them here would have
   claimed this host had correspondence they never had. Threads are derived from
   confirmed reservations instead — real rows in this listing's inventory — and
   the only messages shown are ones the host actually wrote. A traveller reply
   still needs a messaging backend, and the view says so plainly rather than
   simulating one. */

function shortDate(value) {
  const date = new Date(`${value}T12:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(date)
}

function messageTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date)
}

function initials(text) {
  return String(text || 'MH').trim().slice(0, 2).toUpperCase()
}

function ThreadRow({ thread, active, onOpen }) {
  const { reservation, lastMessage, unanswered } = thread
  // an inbox is addressed to a person, so the traveller leads and the room follows
  const label = reservation.guestLabel || 'Voyageur Movera'
  const room = reservation.room?.name || ''
  return (
    <button
      type="button"
      className="host-thread"
      data-active={active ? 'true' : 'false'}
      aria-current={active ? 'true' : undefined}
      onClick={() => onOpen(thread.threadId)}
    >
      <span className="host-thread__avatar" aria-hidden="true">{initials(label)}</span>
      <span className="host-thread__body">
        <span className="host-thread__top">
          <strong>{label}</strong>
          {unanswered ? <i className="host-thread__dot" aria-label="Pas encore de message" /> : null}
        </span>
        <small>{room ? `${room} · ` : ''}{shortDate(reservation.checkIn)} → {shortDate(reservation.checkOut)}</small>
        <span className="host-thread__preview">
          {lastMessage ? lastMessage.body : 'Aucun message envoyé pour ce séjour.'}
        </span>
      </span>
    </button>
  )
}

function Conversation({ thread, onSend, pending, notice }) {
  const [draft, setDraft] = useState('')
  const { reservation } = thread

  const submit = async (event) => {
    event.preventDefault()
    const body = draft.trim()
    if (!body) return
    const sent = await onSend(thread.threadId, body)
    if (sent) setDraft('')
  }

  return (
    <section className="host-conversation" aria-label="Conversation">
      <header className="host-conversation__head">
        <div>
          <strong>{reservation.guestLabel || 'Voyageur Movera'}</strong>
          <small>{reservation.room?.name ? `${reservation.room.name} · ` : ''}{shortDate(reservation.checkIn)} → {shortDate(reservation.checkOut)} · {reservation.units} chambre{reservation.units > 1 ? 's' : ''}</small>
        </div>
        <span className="host-conversation__ref">Réf. {reservation.id}</span>
      </header>

      <div className="host-conversation__stream">
        {thread.messages.length ? (
          thread.messages.map((message) => (
            <article className="host-message" key={message.id} data-author={message.author}>
              <p>{message.body}</p>
              <time dateTime={message.createdAt}>{messageTime(message.createdAt)}</time>
            </article>
          ))
        ) : (
          <p className="host-conversation__empty">
            Écrivez le premier message de ce séjour. Il est enregistré sur cet appareil et
            sera repris par la messagerie voyageur lorsqu’elle sera connectée.
          </p>
        )}
      </div>

      <form className="host-composer" onSubmit={submit}>
        <label className="host-composer__field">
          <span className="host-composer__label">Message au voyageur</span>
          <textarea
            rows="3"
            maxLength={1000}
            value={draft}
            placeholder="Informations d’arrivée, code d’accès, recommandations…"
            onChange={(event) => setDraft(event.target.value)}
          />
        </label>
        <button type="submit" className="host-primary-action" disabled={pending || !draft.trim()}>
          {pending ? 'Envoi…' : 'Envoyer'}
        </button>
      </form>

      {notice ? <p className="host-workspace-feedback" role="status">{notice}</p> : null}
    </section>
  )
}

export function HostMessagesView({ listing, rows, onNavigate }) {
  const [messages, setMessages] = useState([])
  const [activeId, setActiveId] = useState('')
  const [pending, setPending] = useState(false)
  const [notice, setNotice] = useState('')

  const refresh = useCallback(async () => {
    setMessages(await listMessagesForListing(listing.id))
  }, [listing.id])

  useEffect(() => {
    let cancelled = false
    const sync = async () => {
      const next = await listMessagesForListing(listing.id)
      if (!cancelled) setMessages(next)
    }
    sync()
    window.addEventListener(HOST_MESSAGE_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      cancelled = true
      window.removeEventListener(HOST_MESSAGE_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [listing.id])

  const threads = useMemo(() => buildHostThreads(rows, messages), [rows, messages])
  /* Pin the open thread by id. Falling back to threads[0] on every render meant
     the conversation jumped to a different traveller whenever the ordering
     changed — including immediately after sending, which is the one moment the
     host is certainly still reading it. */
  const active = threads.find((thread) => thread.threadId === activeId) || threads[0] || null

  const send = async (threadId, body) => {
    setPending(true)
    setNotice('')
    const result = await sendHostMessage({ listingId: listing.id, threadId, body })
    setPending(false)
    setActiveId(threadId)
    if (!result.ok) {
      setNotice('Le message n’a pas pu être enregistré : le stockage de ce navigateur est plein ou bloqué.')
      return false
    }
    await refresh()
    return true
  }

  if (!threads.length) {
    return (
      <div className="host-workspace-view" data-testid="host-messages">
        <section className="host-workspace-section host-workspace-section--flush">
          <div className="host-workspace-section__head">
            <div><span>Boîte Hôte</span><h2>Messages voyageurs</h2></div>
          </div>
          <div className="host-workspace-empty">
            <span className="host-workspace-empty__mark">MH</span>
            <strong>Aucun séjour à suivre</strong>
            <p>
              Chaque réservation confirmée ouvre une conversation ici. Aucune conversation
              de démonstration n’est reprise : cette boîte ne contient que vos séjours réels.
            </p>
            <button type="button" onClick={() => onNavigate('/host/reservations')}>Voir les réservations</button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="host-workspace-view host-messages" data-testid="host-messages">
      <h1 className="host-screen-title">Messages</h1>
      <section className="host-workspace-section host-workspace-section--flush">
        <div className="host-workspace-section__head">
          <div><span>Boîte Hôte</span><h2>Messages voyageurs</h2></div>
          <b>{threads.length}</b>
        </div>
        <div className="host-messages__layout">
          <div className="host-thread-list" role="list">
            {threads.map((thread) => (
              <ThreadRow
                key={thread.threadId}
                thread={thread}
                active={active?.threadId === thread.threadId}
                onOpen={setActiveId}
              />
            ))}
          </div>
          {active ? <Conversation thread={active} onSend={send} pending={pending} notice={notice} /> : null}
        </div>
        <p className="host-workspace-note host-workspace-note--boxed">
          Les réponses voyageur nécessitent une messagerie connectée. Vos messages sont
          conservés et seront rattachés au fil du voyageur dès cette connexion.
        </p>
      </section>
    </div>
  )
}
