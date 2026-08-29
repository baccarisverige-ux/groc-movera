import { createContext, useMemo, useState } from 'react'

export const AuthContext = createContext(null)
export const AppStateContext = createContext(null)
export const ErrorHandlingContext = createContext(null)

export function AppProviders({ children }) {
  const [session] = useState({ status: 'guest', user: null })
  const [appState, setAppState] = useState({ locale: 'fr', currency: 'TND' })

  const authValue = useMemo(() => ({ session }), [session])
  const appValue = useMemo(() => ({ appState, setAppState }), [appState])
  const errorValue = useMemo(
    () => ({ reportError: (error) => console.error('[Movera Host]', error) }),
    [],
  )

  return (
    <ErrorHandlingContext.Provider value={errorValue}>
      <AuthContext.Provider value={authValue}>
        <AppStateContext.Provider value={appValue}>{children}</AppStateContext.Provider>
      </AuthContext.Provider>
    </ErrorHandlingContext.Provider>
  )
}
