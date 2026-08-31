import { useState } from 'react'
import { useHostProfile } from '../../entities/host/hostProfileStore.js'
import { useAuthSession } from '../auth/authSession.js'
import { HostCalendarPage } from './calendar/HostCalendarPage.jsx'
import { HostOnboardingPage } from './onboarding/HostOnboardingPage.jsx'
import { HostRoomTypeManager } from './rooms/HostRoomTypeManager.jsx'
import './onboarding/hostIntroVideoEnhancer.js'

export function HostEntryPage({ onNavigate }) {
  const { session } = useAuthSession()
  const { profile } = useHostProfile(session?.userId)
  const [activatedProfile, setActivatedProfile] = useState(null)
  const activeProfile = profile || activatedProfile

  if (!activeProfile) {
    return <HostOnboardingPage onNavigate={onNavigate} onActivated={setActivatedProfile} />
  }

  return (
    <>
      <HostCalendarPage onNavigate={onNavigate} hostProfile={activeProfile} />
      <HostRoomTypeManager profile={activeProfile} userId={session?.userId} onNavigate={onNavigate} />
    </>
  )
}
