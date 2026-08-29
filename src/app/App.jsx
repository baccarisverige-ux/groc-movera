import { HomeAccessibility } from '../features/home/HomeAccessibility.jsx'
import { ResilienceLayer } from '../features/resilience/ResilienceLayer.jsx'
import { SearchTransitionHost } from '../features/search/SearchTransitionHost.jsx'
import { GlobalErrorBoundary } from './error-boundary/GlobalErrorBoundary.jsx'
import { AppProviders } from './providers/AppProviders.jsx'
import { AppRouter, navigate } from './router/index.jsx'

function App() {
  return (
    <GlobalErrorBoundary>
      <ResilienceLayer>
        <AppProviders>
          <HomeAccessibility />
          <AppRouter />
          <SearchTransitionHost onNavigate={navigate} />
        </AppProviders>
      </ResilienceLayer>
    </GlobalErrorBoundary>
  )
}

export default App
