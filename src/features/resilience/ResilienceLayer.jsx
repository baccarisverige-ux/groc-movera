import { useEffect, useState } from 'react'
import '../../styles/resilience.css'

export function ResilienceLayer({ children }) {
  const [online, setOnline] = useState(() => navigator.onLine)

  useEffect(() => {
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  return (
    <>
      {!online ? (
        <aside className="offline-banner" role="status" data-testid="offline-fallback">
          <strong>Mode hors connexion</strong>
          <span>Les données déjà chargées restent accessibles. Les actions réseau reprendront après reconnexion.</span>
          <button type="button" onClick={() => setOnline(navigator.onLine)}>Réessayer</button>
        </aside>
      ) : null}
      {children}
    </>
  )
}
