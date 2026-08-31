import { useEffect, useState } from 'react'
import { useHostProfile } from '../../entities/host/hostProfileStore.js'
import { writeHostPublicIdentity } from '../../entities/host/hostPublicIdentityStore.js'
import { useAuthSession } from '../auth/authSession.js'
import { HostCalendarPage } from './calendar/HostCalendarPage.jsx'
import { HostOnboardingPage } from './onboarding/HostOnboardingPage.jsx'
import { HostReservationsPage } from './reservations/HostReservationsPage.jsx'
import { HostWorkspaceNav, HostWorkspacePage } from './workspace/HostWorkspacePage.jsx'
import { hostWorkspaceViewFromPath } from './workspace/hostWorkspaceModel.js'
import './onboarding/hostIntroVideoEnhancer.js'
import './onboarding/hostRoomTypesOnboardingEnhancer.js'

export function HostEntryPage({ onNavigate }) {
  const { session } = useAuthSession()
  const { profile } = useHostProfile(session?.userId)
  const [activatedProfile, setActivatedProfile] = useState(null)
  const activeProfile = profile || activatedProfile
  const view = hostWorkspaceViewFromPath(window.location.pathname)

  useEffect(() => {
    if (!activeProfile || !session?.userId) return
    writeHostPublicIdentity(session.userId, {
      displayName: session.displayName || '',
      since: activeProfile.createdAt || '',
    })
  }, [activeProfile, session?.userId, session?.displayName])

  if (!activeProfile) {
    return <HostOnboardingPage onNavigate={onNavigate} onActivated={setActivatedProfile} />
  }

  if (view === 'calendar') {
    return (
      <div className="host-workspace-calendar-wrap" data-testid="host-workspace-calendar">
        <HostWorkspaceNav active="calendar" onNavigate={onNavigate} />
        <HostCalendarPage onNavigate={onNavigate} hostProfile={activeProfile} />
      </div>
    )
  }

  if (view === 'reservations') {
    return <HostReservationsPage profile={activeProfile} onNavigate={onNavigate} />
  }

  return (
    <HostWorkspacePage
      view={view}
      profile={activeProfile}
      userId={session?.userId}
      onNavigate={onNavigate}
    />
  )
}
