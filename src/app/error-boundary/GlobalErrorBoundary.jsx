import { Component } from 'react'
import { toBrowserPath } from '../router/basePath.js'

export class GlobalErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null, retries: 0 }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[Movera Host] Unhandled render error captured', error, info)
  }

  retry = () => {
    if (this.state.retries >= 1) return
    const url = new URL(window.location.href)
    url.searchParams.delete('__testError')
    window.history.replaceState({}, '', `${url.pathname}${url.search}`)
    this.setState((state) => ({ error: null, retries: state.retries + 1 }))
  }

  render() {
    if (this.state.error) {
      const exhausted = this.state.retries >= 1
      return (
        <main className="global-error" data-testid="global-error-boundary">
          <p className="route-page__eyebrow">Erreur</p>
          <h1>Une erreur est survenue</h1>
          <p>Aucun écran blanc : une récupération contrôlée reste disponible.</p>
          <button className="route-link-button" type="button" disabled={exhausted} onClick={this.retry}>{exhausted ? 'Retry limité' : 'Réessayer'}</button>
          <button className="route-link-button" type="button" onClick={() => window.location.assign(toBrowserPath('/'))}>Retour à l’accueil</button>
        </main>
      )
    }
    return this.props.children
  }
}
