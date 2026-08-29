import { useMemo, useState } from 'react'
import { getListingSummary } from '../../entities/listing/listingCatalog.js'
import { getMessageThread } from './messagesData.js'
import './messages-page.css'

function BackIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
}

function SendIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m22 2-7 20-4-9-9-4 20-7Z"/><path d="M22 2 11 13"/></svg>
}

export function MessageThreadPage({ params, onNavigate }) {
  const thread = getMessageThread(params.threadId)
  const listing = thread?.listingId ? getListingSummary(thread.listingId) : null
  const [draft, setDraft] = useState('')
  const [sentMessages, setSentMessages] = useState([])
  const messages = useMemo(() => thread ? [...thread.messages, ...sentMessages] : [], [thread, sentMessages])

  if (!thread) {
    return (
      <div className="messages-page message-thread-page" data-testid="page-message-thread">
        <section className="message-thread-missing">
          <h1>Conversation introuvable</h1>
          <button type="button" onClick={() => onNavigate('/messages')}>Retour aux messages</button>
        </section>
      </div>
    )
  }

  const submitMessage = (event) => {
    event.preventDefault()
    const value = draft.trim()
    if (!value) return
    setSentMessages((current) => [...current, { id: `local-${Date.now()}`, from: 'guest', text: value, time: 'Maintenant' }])
    setDraft('')
  }

  return (
    <div className="messages-page message-thread-page" data-testid="page-message-thread" data-thread-id={thread.id}>
      <header className="message-thread-header">
        <button type="button" className="message-thread-back" onClick={() => window.history.length > 1 ? window.history.back() : onNavigate('/messages')} aria-label="Retour aux messages">
          <BackIcon />
        </button>
        <span className="message-thread-avatar" aria-hidden="true">{thread.initials}</span>
        <span className="message-thread-identity">
          <strong>{thread.participant}</strong>
          <small>{thread.role}</small>
        </span>
        <span className="message-thread-status" aria-label="Conversation active">●</span>
      </header>

      <section className="message-thread-stay" aria-label="Contexte du séjour">
        {listing?.image ? <img src={listing.image} alt={thread.stayLabel} /> : <span className="message-thread-stay__fallback" aria-hidden="true">M</span>}
        <div>
          <span>{thread.status}</span>
          <strong>{thread.stayLabel}</strong>
        </div>
      </section>

      <section className="message-thread-body" aria-label={`Conversation avec ${thread.participant}`} aria-live="polite">
        <div className="message-thread-day">Aujourd’hui</div>
        {messages.map((message) => (
          <div key={message.id} className={`message-bubble-row message-bubble-row--${message.from}`}>
            <div className="message-bubble">
              <p>{message.text}</p>
              <span>{message.time}</span>
            </div>
          </div>
        ))}
      </section>

      <form className="message-composer" onSubmit={submitMessage}>
        <label>
          <span className="sr-only">Écrire un message</span>
          <textarea
            rows="1"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Écrire un message…"
            aria-label="Écrire un message"
          />
        </label>
        <button type="submit" disabled={!draft.trim()} aria-label="Envoyer le message"><SendIcon /></button>
      </form>
    </div>
  )
}
