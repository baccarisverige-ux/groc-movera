import { useMemo, useState } from 'react'
import { getListingSummary } from '../../entities/listing/listingCatalog.js'
import { MotionList, MotionListItem } from '../../shared/motion/MotionList.jsx'
import { messageThreads } from './messagesData.js'
import './messages-page.css'

const MESSAGE_ITEM_MOTION = Object.freeze({
  enterScale: 0.995,
  enterY: 7,
  exitScale: 0.992,
  exitY: -5,
  initialOpacity: 0.76,
  layout: true,
  stagger: 0.018,
  tapScale: 0.987,
  spring: Object.freeze({ stiffness: 420, damping: 35, mass: 0.72 }),
})

function SearchIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>
}

function ChevronIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>
}

export function MessagesPage({ onNavigate }) {
  const [query, setQuery] = useState('')
  const normalizedQuery = query.trim().toLowerCase()
  const visibleThreads = useMemo(() => messageThreads.filter((thread) => {
    if (!normalizedQuery) return true
    return `${thread.participant} ${thread.role} ${thread.stayLabel} ${thread.lastMessage}`.toLowerCase().includes(normalizedQuery)
  }), [normalizedQuery])
  const unreadCount = messageThreads.reduce((sum, thread) => sum + thread.unread, 0)

  return (
    <div className="messages-page" data-testid="page-messages">
      <section className="messages-hero">
        <div className="messages-hero__eyebrow">Conversations</div>
        <div className="messages-hero__heading">
          <div>
            <h1>Messages</h1>
            <p>Vos échanges avec les hôtes et l’assistance Movera, au même endroit.</p>
          </div>
          <span className="messages-unread-count" aria-label={`${unreadCount} messages non lus`}>{unreadCount}</span>
        </div>
      </section>

      <section className="messages-toolbar" aria-label="Rechercher dans les messages">
        <label className="messages-search">
          <SearchIcon />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher une conversation"
            aria-label="Rechercher une conversation"
          />
        </label>
      </section>

      <section className="messages-list" aria-label="Liste des conversations">
        <header className="messages-list__head">
          <span>Boîte de réception</span>
          <strong>{visibleThreads.length} conversation{visibleThreads.length > 1 ? 's' : ''}</strong>
        </header>

        {visibleThreads.length ? (
          <MotionList className="messages-thread-list" data-motion-list="messages">
            {visibleThreads.map((thread, index) => {
              const listing = thread.listingId ? getListingSummary(thread.listingId) : null
              return (
                <MotionListItem
                  as="button"
                  key={thread.id}
                  index={index}
                  config={MESSAGE_ITEM_MOTION}
                  type="button"
                  className={`message-thread-card${thread.unread ? ' is-unread' : ''}`}
                  onClick={() => onNavigate(`/messages/${thread.id}`)}
                  data-thread-id={thread.id}
                >
                  <span className="message-thread-card__avatar" aria-hidden="true">{thread.initials}</span>
                  <span className="message-thread-card__content">
                    <span className="message-thread-card__topline">
                      <strong>{thread.participant}</strong>
                      <small>{thread.time}</small>
                    </span>
                    <span className="message-thread-card__role">{thread.role}</span>
                    <span className="message-thread-card__preview">{thread.lastMessage}</span>
                    <span className="message-thread-card__stay">
                      {listing?.image ? <img src={listing.image} alt="" aria-hidden="true" /> : <span className="message-thread-card__stay-icon" aria-hidden="true">M</span>}
                      <span><strong>{thread.stayLabel}</strong><small>{thread.status}</small></span>
                    </span>
                  </span>
                  <span className="message-thread-card__edge">
                    {thread.unread ? <span className="message-thread-card__badge">{thread.unread}</span> : null}
                    <ChevronIcon />
                  </span>
                </MotionListItem>
              )
            })}
          </MotionList>
        ) : (
          <div className="messages-empty">
            <span>◌</span>
            <h2>Aucune conversation trouvée</h2>
            <p>Essayez un autre nom, séjour ou mot-clé.</p>
            <button type="button" onClick={() => setQuery('')}>Effacer la recherche</button>
          </div>
        )}
      </section>
    </div>
  )
}
