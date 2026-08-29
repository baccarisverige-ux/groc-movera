import { useMemo, useState } from 'react'

const MAX_RETRIES = 2

function RecoveryCase({ kind, title, message }) {
  const [attempts, setAttempts] = useState(0)
  const [status, setStatus] = useState('error')
  const exhausted = attempts >= MAX_RETRIES

  const retry = () => {
    if (exhausted) return
    const next = attempts + 1
    setAttempts(next)
    setStatus('loading')
    window.setTimeout(() => setStatus('error'), 40)
  }

  return (
    <section className="resilience-card" data-testid={`resilience-${kind}`} data-status={status} data-attempts={attempts}>
      <h2>{title}</h2>
      {status === 'loading' ? <p>Chargement…</p> : <p role="alert">{message}</p>}
      <button type="button" onClick={retry} disabled={exhausted || status === 'loading'}>
        {exhausted ? 'Retry limité' : 'Réessayer'}
      </button>
    </section>
  )
}

export function ResilienceLab() {
  const state = useMemo(() => new URLSearchParams(window.location.search).get('state') || 'success', [])
  if (state === 'empty') return <section className="resilience-page" data-testid="state-empty"><h1>Aucun résultat</h1><p>Essayez une autre recherche.</p></section>
  if (state === 'loading') return <section className="resilience-page" data-testid="state-loading"><h1>Chargement…</h1></section>
  if (state === 'success') return <section className="resilience-page" data-testid="state-success"><h1>Service disponible</h1></section>

  return (
    <section className="resilience-page" data-testid="resilience-lab">
      <h1>Recovery contrôlée</h1>
      <RecoveryCase kind="api" title="API indisponible" message="Impossible de charger les données." />
      <RecoveryCase kind="map" title="Carte indisponible" message="La carte n’a pas pu être chargée." />
    </section>
  )
}
