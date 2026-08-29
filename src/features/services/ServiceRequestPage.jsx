import { useMemo, useState } from 'react'
import { ArrowLeftIcon } from '../../shared/icons/AppIcons.jsx'
import { getServiceBySlug } from './serviceCatalog.js'
import './service-request-page.css'

function goBack(onNavigate) {
  if (window.history.length > 1) {
    window.history.back()
    return
  }
  onNavigate('/')
}

function slugFromPath() {
  const parts = window.location.pathname.split('/').filter(Boolean)
  const idx = parts.lastIndexOf('services')
  return idx >= 0 ? parts[idx + 1] || '' : parts[parts.length - 1] || ''
}

export function ServiceRequestPage({ params, onNavigate }) {
  const slug = params?.slug || slugFromPath()
  const service = useMemo(() => getServiceBySlug(slug), [slug])
  const [date, setDate] = useState('')
  const [place, setPlace] = useState('')
  const [note, setNote] = useState('')
  const [sent, setSent] = useState(false)

  if (!service) {
    return (
      <div className="service-request-page" data-testid="page-service-missing">
        <header className="service-request-top">
          <button type="button" className="service-request-back" onClick={() => goBack(onNavigate)} aria-label="Retour">
            <ArrowLeftIcon />
          </button>
          <strong>Movera</strong>
        </header>
        <section className="service-request-empty">
          <h1>Service introuvable</h1>
          <p>Cette offre n’est pas disponible dans Movera.</p>
          <button type="button" onClick={() => onNavigate('/')}>Retour à l’accueil</button>
        </section>
      </div>
    )
  }

  const submit = (event) => {
    event.preventDefault()
    if (!date.trim() || !place.trim()) return
    setSent(true)
  }

  return (
    <div className="service-request-page" data-testid="page-service" data-service={service.slug}>
      <header className="service-request-top">
        <button type="button" className="service-request-back" onClick={() => goBack(onNavigate)} aria-label="Retour">
          <ArrowLeftIcon />
        </button>
        <strong>Movera</strong>
      </header>

      <section className="service-request-hero">
        <span className="service-request-hero__photo" aria-hidden="true">
          <img src={service.image} alt="" decoding="async" />
        </span>
        <div>
          <span className="service-request-eyebrow">{service.subtitle}</span>
          <h1>{service.title}</h1>
          <p>{service.pitch}</p>
        </div>
      </section>

      {sent ? (
        <section className="service-request-confirm" aria-live="polite">
          <span>Demande envoyée</span>
          <h2>Nous avons bien reçu votre demande</h2>
          <p>Movera vous recontacte rapidement pour confirmer {service.title.toLowerCase()}.</p>
          <button type="button" onClick={() => onNavigate('/')}>Retour à l’accueil</button>
        </section>
      ) : (
        <form className="service-request-form" onSubmit={submit}>
          <label>
            <span>{service.dateLabel}</span>
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
          </label>
          <label>
            <span>{service.placeLabel}</span>
            <input type="text" value={place} onChange={(event) => setPlace(event.target.value)} placeholder={service.placePlaceholder} required />
          </label>
          <label>
            <span>Note</span>
            <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={4} placeholder="Précisions utiles (optionnel)" />
          </label>
          <button type="submit">Envoyer la demande</button>
        </form>
      )}
    </div>
  )
}
