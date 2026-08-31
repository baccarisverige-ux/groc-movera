import { useState } from 'react'
import { useHostProfile } from '../../entities/host/hostProfileStore.js'
import { useAuthSession } from '../auth/authSession.js'
import { HostCalendarPage } from './calendar/HostCalendarPage.jsx'
import { HostOnboardingPage } from './onboarding/HostOnboardingPage.jsx'
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

  return (
    <HostWorkspacePage
      view={view}
      profile={activeProfile}
      userId={session?.userId}
      onNavigate={onNavigate}
    />
  )
}
