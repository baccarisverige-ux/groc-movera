import { useEffect, useMemo, useState } from 'react'
import { activateHostProfile } from '../../../entities/host/hostProfileStore.js'
import { ParkingIcon, SnowflakeIcon, WavesIcon, WifiIcon } from '../../../shared/icons/AppIcons.jsx'
import { useAuthSession } from '../../auth/authSession.js'
import { clearHostOnboardingDraft, readHostOnboardingDraft, writeHostOnboardingDraft } from './hostOnboardingDraftStore.js'
import { useHostMapLocationSync } from './hostLocationSync.js'
import {
  HOST_AMENITIES,
  HOST_AMENITY_GROUPS,
  HOST_GUEST_ACCESS,
  HOST_HIGHLIGHTS,
  HOST_ONBOARDING_SCREENS,
  HOST_PROMOTIONS,
  HOST_PROPERTY_TYPES,
  phaseProgress,
  screenId,
  screenPhase,
} from './hostOnboardingModel.js'
import './host-onboarding-page.css'

function ArrowIcon({ back = false }) {
  return (
    <svg className={back ? 'is-back' : ''} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  )
}

function BookmarkIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 4h11v16l-5.5-3.4L6.5 20V4Z" /></svg>
}

function QuestionIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 0 0-7.3 14.2L4 21l4-1.1A9 9 0 1 0 12 3Z"/><path d="M9.7 9.2a2.5 2.5 0 1 1 3.4 2.3c-.8.5-1.1 1-1.1 2M12 17h.01"/></svg>
}

function HomeIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11 12 4l8 7"/><path d="M6.5 10v10h11V10M9.5 20v-5h5v5"/></svg>
}

function DoorIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10v18H7zM10 6h7v15M14 12h.01" /></svg>
}

function BunkIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5v16M19 5v16M5 9h14M5 17h14M7 6h5a2 2 0 0 1 2 2v1M7 14h5a2 2 0 0 1 2 2v1" /></svg>
}

function PinIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.4"/></svg>
}

function PhotoIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="9" r="1.5"/><path d="m5.5 17 4.5-4.5 3 3 2-2 3.5 3.5"/></svg>
}

function CheckIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.2 4.2L19 7"/></svg>
}

function PersonIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="7" r="3"/><path d="M5 21c.6-5 3-8 7-8s6.4 3 7 8"/></svg>
}

function BedIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V8M20 19v-7a3 3 0 0 0-3-3H9a3 3 0 0 0-3 3v2M4 14h16M7 9V7h5a3 3 0 0 1 3 3" /></svg>
}

function BathIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-3ZM7 12V6a3 3 0 0 1 6 0M8 19l-1 2M16 19l1 2" /></svg>
}

function PropertyTypeIcon({ type }) {
  const name = String(type).toLowerCase()
  if (name.includes('appartement') || name.includes('hôtel')) {
    return <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M12 42V9h18v33M30 18h7v24M18 16h5M18 23h5M18 30h5M34 25h3M34 32h3M8 42h33"/></svg>
  }
  if (name.includes('bateau')) {
    return <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M14 31h25l-5 9H13l-5-9h6ZM18 31V8l15 10H18M8 43c4 2 8 2 12 0 4 2 8 2 12 0 4 2 7 2 10 0"/></svg>
  }
  if (name.includes('tiny')) {
    return <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M10 31V16l14-9 14 9v15M15 31h18M19 31V21h10v10M13 37h22M15 37a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM33 37a3 3 0 1 0 0 6 3 3 0 0 0 0-6"/></svg>
  }
  if (name.includes('loft') || name.includes('studio')) {
    return <svg viewBox="0 0 48 48" aria-hidden="true"><path d="M10 39V15L24 7l14 8v24H10ZM18 39V25h12v14M14 19h20M31 12v9"/></svg>
  }
  if (name.includes('chalet')) {
    return <svg viewBox="0 0 48 48" aria-hidden="true"><path d="m8 27 16-18 16 18M13 24v17h22V24M19 41V29h10v12M36 15h5M39 12v16"/></svg>
  }
  return <svg viewBox="0 0 48 48" aria-hidden="true"><path d="m7 23 17-15 17 15M11 20v22h26V20M19 42V29h10v13M15 25h6M31 25h4"/></svg>
}

function GuestAccessIcon({ id }) {
  if (id === 'private') return <DoorIcon />
  if (id === 'shared') return <BunkIcon />
  return <HomeIcon />
}

function SimpleAmenityIcon({ kind }) {
  const icons = {
    tv: <><rect x="4" y="6" width="16" height="12" rx="2"/><path d="m9 22 3-4 3 4"/></>,
    kitchen: <><path d="M6 4v16M18 4v16M10 7h5v5h-5zM10 16h8"/></>,
    washer: <><rect x="5" y="3" width="14" height="18" rx="2"/><circle cx="12" cy="13" r="5"/><path d="M8 7h.01M11 7h4"/></>,
    dryer: <><rect x="5" y="3" width="14" height="18" rx="2"/><circle cx="12" cy="13" r="5"/><path d="M8 7h.01M14 7h2"/></>,
    essentials: <><path d="M7 5h4v14H7zM13 5h4v14h-4zM5 19h14"/></>,
    heating: <><path d="M8 4v16M12 4v16M16 4v16M5 7h14M5 17h14"/></>,
    'hot-water': <><path d="M8 8h8l2 4v7H6v-7l2-4ZM10 5c0-1 1-2 1-3M14 5c0-1 1-2 1-3"/></>,
    refrigerator: <><rect x="7" y="3" width="10" height="18" rx="1"/><path d="M7 10h10M10 7v1M10 13v2"/></>,
    'coffee-maker': <><path d="M6 8h10v9H6zM16 10h2a3 3 0 0 1 0 6h-2M8 4c0 1-1 2-1 3M12 4c0 1-1 2-1 3"/></>,
    'cooking-basics': <><path d="M6 4v16M10 4v7M14 4v7M18 4v16M10 14h4"/></>,
    'hair-dryer': <><path d="M5 9c5-5 11-4 14-1l-5 5H8zM10 13l-1 7M14 13l3 4"/></>,
    hangers: <><path d="M12 7a2 2 0 1 1 2-2c0 2-2 2-2 4L4 15h16l-8-6"/></>,
    iron: <><path d="M7 17h12l-2-7H9c-3 0-4 4-4 7h2ZM9 10l2-4h5l1 4"/></>,
    shampoo: <><rect x="8" y="7" width="8" height="14" rx="2"/><path d="M10 7V4h5M13 4V2"/></>,
    crib: <><path d="M5 8v13M19 8v13M5 17h14M8 9v8M11 9v8M14 9v8M17 9v8"/></>,
    gym: <><path d="M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10"/></>,
    'hot-tub': <><path d="M5 11h14v8H5zM8 7c0-2 2-2 2-4M12 7c0-2 2-2 2-4M16 7c0-2 2-2 2-4"/></>,
    fireplace: <><path d="M5 4h14v17H5zM8 8h8v10H8zM12 17c-3-2-2-5 0-7 3 2 4 5 0 7Z"/></>,
    outdoor: <><path d="M5 11h14M7 11v10M17 11v10M9 15h6M12 5c4 0 7 2 7 6H5c0-4 3-6 7-6Z"/></>,
    workspace: <><path d="M5 11h14v5H5zM8 16v5M16 16v5M15 6h4v5M17 4v2"/></>,
    'ev-charger': <><path d="M6 4h9v17H6zM15 8h3l2 3v7a2 2 0 0 1-4 0M9 8h3M9 12h3"/></>,
  }
  return <svg className="host-onboarding__amenity-svg" viewBox="0 0 24 24" aria-hidden="true">{icons[kind] || <path d="M6 6h12v12H6z" />}</svg>
}

function AmenityGlyph({ id }) {
  if (id === 'wifi') return <WifiIcon size={25} />
  if (id === 'parking') return <ParkingIcon size={25} />
  if (id === 'pool' || id === 'waterfront' || id === 'beach-access') return <WavesIcon size={25} />
  if (id === 'ac') return <SnowflakeIcon size={25} />
  return <SimpleAmenityIcon kind={id} />
}

function CounterRow({ label, value, min = 0, onChange, icon }) {
  return (
    <div className="host-onboarding__counter-row">
      <span className="host-onboarding__counter-label">{icon}<strong>{label}</strong></span>
      <div>
        <button type="button" aria-label={`Réduire ${label}`} disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))}>−</button>
        <b>{value}</b>
        <button type="button" aria-label={`Augmenter ${label}`} onClick={() => onChange(value + 1)}>+</button>
      </div>
    </div>
  )
}

const VISUAL_STAGES = Object.freeze([
  { id: 1, label: 'Votre logement' },
  { id: 2, label: 'Équipements' },
  { id: 3, label: 'Réglages' },
  { id: 4, label: 'Publication' },
])

function visualStageFor(id) {
  if (['intro-place', 'property-type', 'guest-access', 'address', 'pin', 'basics'].includes(id)) return 1
  if (['intro-presentation', 'amenities', 'photos'].includes(id)) return 2
  if (['title', 'highlights', 'description', 'safety', 'intro-publish', 'booking', 'price', 'promotions'].includes(id)) return 3
  return 4
}

function PhaseTracker({ stage }) {
  return (
    <div className="host-onboarding__phase-tracker" aria-label={`Étape visuelle ${stage} sur 4`}>
      {VISUAL_STAGES.map((item) => {
        const state = item.id < stage ? 'done' : item.id === stage ? 'active' : 'future'
        return (
          <div key={item.id} data-state={state}>
            <span>{state === 'done' ? <CheckIcon /> : item.id}</span>
            <small>{item.label}</small>
          </div>
        )
      })}
    </div>
  )
}

function HeroHouseIllustration() {
  return (
    <svg className="host-onboarding__hero-house" viewBox="0 0 560 400" aria-hidden="true">
      <defs>
        <linearGradient id="houseWall" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff"/><stop offset="1" stopColor="#e9e9e4"/></linearGradient>
        <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#c6d0c8" stopOpacity=".9"/><stop offset="1" stopColor="#8d9c92" stopOpacity=".55"/></linearGradient>
        <linearGradient id="warm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f5dfbf"/><stop offset="1" stopColor="#c99d70"/></linearGradient>
        <filter id="houseShadow" x="-20%" y="-20%" width="140%" height="160%"><feDropShadow dx="0" dy="18" stdDeviation="17" floodColor="#183326" floodOpacity=".12"/></filter>
      </defs>
      <ellipse cx="280" cy="357" rx="220" ry="24" fill="#dfe2de" opacity=".58"/>
      <g filter="url(#houseShadow)">
        <path d="M122 184h324v150H122z" fill="url(#houseWall)" stroke="#c9cdc9"/>
        <path d="M189 72h218v138H189z" fill="url(#houseWall)" stroke="#c9cdc9"/>
        <path d="M180 72h238l-12 17H192z" fill="#4d514f"/>
        <path d="M189 97h218v83H189z" fill="url(#glass)" stroke="#333" strokeWidth="5"/>
        <path d="M258 97v83M333 97v83" stroke="#333" strokeWidth="4"/>
        <rect x="206" y="121" width="51" height="34" rx="4" fill="url(#warm)" opacity=".88"/>
        <rect x="345" y="120" width="42" height="38" rx="4" fill="url(#warm)" opacity=".86"/>
        <path d="M145 207h201v94H145z" fill="url(#glass)" stroke="#333" strokeWidth="5"/>
        <path d="M213 207v94M280 207v94" stroke="#333" strokeWidth="4"/>
        <rect x="174" y="242" width="86" height="42" rx="6" fill="url(#warm)" opacity=".9"/>
        <path d="M368 209h54v125h-54z" fill="#272826"/>
        <circle cx="409" cy="273" r="3" fill="#d8b678"/>
        <rect x="205" y="42" width="91" height="16" rx="3" transform="rotate(-6 205 42)" fill="#333b39"/>
        <path d="M126 334h318v14H126z" fill="#d4d7d3"/>
        <path d="M97 314h350v20H97z" fill="#eef0ed" stroke="#d5d7d4"/>
      </g>
      <g fill="#5d7b64">
        <circle cx="94" cy="250" r="31"/><circle cx="469" cy="221" r="36"/><circle cx="478" cy="274" r="26"/><circle cx="82" cy="292" r="24"/>
      </g>
      <g fill="#31523a" opacity=".9"><rect x="89" y="252" width="7" height="76" rx="4"/><rect x="465" y="224" width="8" height="104" rx="4"/></g>
      <g fill="#f0ece5" stroke="#c9c5bd"><rect x="128" y="304" width="68" height="29" rx="8"/><rect x="203" y="309" width="42" height="21" rx="10"/><rect x="252" y="313" width="42" height="18" rx="9"/></g>
      <g fill="#fff" stroke="#bfc2bf"><rect x="329" y="319" width="22" height="28" rx="5"/><rect x="355" y="312" width="19" height="35" rx="5"/></g>
    </svg>
  )
}

function PhaseIntro({ eyebrow, title, text, variant = 'home' }) {
  return (
    <main className={`host-onboarding__phase-intro host-onboarding__phase-intro--${variant}`}>
      <div className="host-onboarding__phase-visual"><HeroHouseIllustration /></div>
      <span className="host-onboarding__eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      <p>{text}</p>
    </main>
  )
}

export function HostOnboardingPage({ onNavigate, onActivated }) {
  const { session } = useAuthSession()
  const [draft, setDraft] = useState(() => readHostOnboardingDraft(session?.userId))
  const [step, setStep] = useState(() => Math.min(readHostOnboardingDraft(session?.userId).screenIndex || 0, HOST_ONBOARDING_SCREENS.length - 1))
  const [feedback, setFeedback] = useState('')
  useHostMapLocationSync(setDraft)

  const id = screenId(step)
  const phase = screenPhase(step)
  const internalProgress = phaseProgress(step)
  const visualStage = visualStageFor(id)

  useEffect(() => {
    const nextDraft = readHostOnboardingDraft(session?.userId)
    setDraft(nextDraft)
    setStep(Math.min(nextDraft.screenIndex || 0, HOST_ONBOARDING_SCREENS.length - 1))
  }, [session?.userId])

  useEffect(() => {
    if (!session?.userId) return
    writeHostOnboardingDraft(session.userId, { ...draft, screenIndex: step })
  }, [session?.userId, draft, step])

  const updateDraft = (patch) => setDraft((current) => ({ ...current, ...patch }))
  const updateSafety = (key, value) => setDraft((current) => ({ ...current, safety: { ...current.safety, [key]: value } }))

  const canContinue = useMemo(() => {
    if (id === 'property-type') return Boolean(draft.propertyType)
    if (id === 'guest-access') return Boolean(draft.guestAccess)
    if (id === 'address') return Boolean(draft.address.trim() && draft.city.trim())
    if (id === 'pin') return draft.pinConfirmed
    if (id === 'basics') return draft.guests >= 1 && draft.bedrooms >= 0 && draft.beds >= 1 && draft.bathrooms >= 0
    if (id === 'title') return draft.title.trim().length >= 5
    if (id === 'highlights') return draft.highlights.length >= 1 && draft.highlights.length <= 2
    if (id === 'description') return draft.description.trim().length >= 20
    if (id === 'booking') return Boolean(draft.bookingMode)
    if (id === 'price') return Number(draft.basePrice) > 0
    if (id === 'review') return draft.confirmedAuthority && draft.acceptedRules
    return true
  }, [id, draft])

  const toggleArrayValue = (field, value, max = Infinity) => {
    setDraft((current) => {
      const values = Array.isArray(current[field]) ? current[field] : []
      const exists = values.includes(value)
      if (exists) return { ...current, [field]: values.filter((item) => item !== value) }
      if (values.length >= max) return current
      return { ...current, [field]: [...values, value] }
    })
  }

  const goBack = () => {
    setFeedback('')
    if (step === 0) onNavigate('/profile')
    else setStep((value) => Math.max(0, value - 1))
  }

  const next = () => {
    setFeedback('')
    if (!canContinue) {
      setFeedback('Complétez cette étape pour continuer.')
      return
    }
    if (step < HOST_ONBOARDING_SCREENS.length - 1) setStep((value) => value + 1)
  }

  const finish = () => {
    if (!session?.userId || !canContinue) return
    const profile = activateHostProfile(session.userId, {
      id: 'primary-listing',
      name: draft.title.trim(),
      city: draft.city.trim(),
      type: draft.propertyType,
      basePrice: Number(draft.basePrice),
      address: draft.address.trim(),
      latitude: draft.latitude,
      longitude: draft.longitude,
      guestAccess: draft.guestAccess,
      guests: draft.guests,
      bedrooms: draft.bedrooms,
      beds: draft.beds,
      bathrooms: draft.bathrooms,
      amenities: draft.amenities,
      highlights: draft.highlights,
      description: draft.description.trim(),
      bookingMode: draft.bookingMode,
      promotions: draft.promotions,
      safety: draft.safety,
      photos: [],
    })
    clearHostOnboardingDraft(session.userId)
    onActivated?.(profile)
  }

  return (
    <section className="host-onboarding" data-testid="host-onboarding" data-screen={id} data-phase={phase}>
      <header className="host-onboarding__topbar">
        <button type="button" className="host-onboarding__top-pill" onClick={() => onNavigate('/profile')}><BookmarkIcon /><span>Enregistrer et quitter</span></button>
        <button type="button" className="host-onboarding__top-pill" onClick={() => setFeedback('Le centre d’aide Hôte sera ajouté dans une prochaine étape.')}><QuestionIcon /><span>Questions ?</span></button>
      </header>

      <div className="host-onboarding__micro-progress" aria-hidden="true"><i style={{ width: `${Math.round(internalProgress * 100)}%` }} /></div>

      {id === 'intro-place' ? (
        <PhaseIntro eyebrow="Étape 1" title="Parlez-nous de votre logement" text="On commence par les bases : type de logement, accès voyageurs, emplacement et capacité d’accueil." />
      ) : null}

      {id === 'property-type' ? (
        <main className="host-onboarding__step">
          <span className="host-onboarding__eyebrow">Étape {step + 1}</span>
          <h1>Quel type décrit le mieux votre logement ?</h1>
          <p>Choisissez la catégorie qui correspond le plus à votre bien.</p>
          <div className="host-onboarding__choice-grid" role="radiogroup" aria-label="Type de logement">
            {HOST_PROPERTY_TYPES.map((item) => (
              <button key={item} type="button" role="radio" aria-checked={draft.propertyType === item} data-active={draft.propertyType === item ? 'true' : 'false'} onClick={() => updateDraft({ propertyType: item })}>
                <span><PropertyTypeIcon type={item} /></span>
                <strong>{item}</strong>
              </button>
            ))}
          </div>
        </main>
      ) : null}

      {id === 'guest-access' ? (
        <main className="host-onboarding__step">
          <span className="host-onboarding__eyebrow">Étape {step + 1}</span>
          <h1>Quel type de séjour auront les voyageurs ?</h1>
          <p>Choisissez l’option qui décrit le mieux l’espace proposé.</p>
          <div className="host-onboarding__stacked-options" role="radiogroup" aria-label="Accès voyageurs">
            {HOST_GUEST_ACCESS.map((item) => (
              <button key={item.id} type="button" role="radio" aria-checked={draft.guestAccess === item.id} data-active={draft.guestAccess === item.id ? 'true' : 'false'} onClick={() => updateDraft({ guestAccess: item.id })}>
                <span className="host-onboarding__radio-dot">{draft.guestAccess === item.id ? <CheckIcon /> : null}</span>
                <div><strong>{item.label}</strong><small>{item.description}</small></div>
                <GuestAccessIcon id={item.id} />
              </button>
            ))}
          </div>
        </main>
      ) : null}

      {id === 'address' ? (
        <main className="host-onboarding__step">
          <span className="host-onboarding__eyebrow">Étape {step + 1}</span>
          <h1>Où se trouve votre logement ?</h1>
          <p>L’adresse exacte ne sera communiquée aux voyageurs qu’après réservation.</p>
          <label><span>Adresse du logement</span><input value={draft.address} onChange={(event) => updateDraft({ address: event.target.value, pinConfirmed: false })} placeholder="Ex. 14 avenue Habib Bourguiba" aria-label="Adresse du logement" /></label>
          <label><span>Ville</span><input value={draft.city} onChange={(event) => updateDraft({ city: event.target.value, pinConfirmed: false })} aria-label="Ville du logement" /></label>
          <div className="host-onboarding__address-note"><PinIcon /><span>Nous utiliserons cette adresse pour placer votre logement sur la carte.</span></div>
        </main>
      ) : null}

      {id === 'pin' ? (
        <main className="host-onboarding__step">
          <span className="host-onboarding__eyebrow">Étape {step + 1}</span>
          <h1>Le repère est-il au bon endroit ?</h1>
          <p>Ajustez l’emplacement si nécessaire. L’adresse exacte restera privée jusqu’à la réservation.</p>
          <div className="host-onboarding__map-card">
            <div className="host-onboarding__address-chip"><PinIcon /><span>{draft.address}, {draft.city}</span></div>
            <div className="host-onboarding__map-pin"><HomeIcon /></div>
            <span className="host-onboarding__map-road host-onboarding__map-road--one" />
            <span className="host-onboarding__map-road host-onboarding__map-road--two" />
            <span className="host-onboarding__map-road host-onboarding__map-road--three" />
            <div className="host-onboarding__map-zoom"><button type="button" aria-label="Zoom avant">+</button><button type="button" aria-label="Zoom arrière">−</button></div>
            <div className="host-onboarding__map-hint">Déplacez la carte pour ajuster le repère</div>
          </div>
          <button type="button" className="host-onboarding__secondary" data-active={draft.pinConfirmed ? 'true' : 'false'} onClick={() => updateDraft({ pinConfirmed: true })}>{draft.pinConfirmed ? 'Emplacement confirmé' : 'Confirmer cet emplacement'} {draft.pinConfirmed ? <CheckIcon /> : <PinIcon />}</button>
        </main>
      ) : null}

      {id === 'basics' ? (
        <main className="host-onboarding__step">
          <span className="host-onboarding__eyebrow">Étape {step + 1}</span>
          <h1>Partagez les informations de base</h1>
          <p>Vous pourrez affiner tous ces détails plus tard.</p>
          <div className="host-onboarding__counter-card">
            <CounterRow label="Voyageurs" value={draft.guests} min={1} icon={<PersonIcon />} onChange={(value) => updateDraft({ guests: value })} />
            <CounterRow label="Chambres" value={draft.bedrooms} icon={<BedIcon />} onChange={(value) => updateDraft({ bedrooms: value })} />
            <CounterRow label="Lits" value={draft.beds} min={1} icon={<BedIcon />} onChange={(value) => updateDraft({ beds: value })} />
            <CounterRow label="Salles de bain" value={draft.bathrooms} icon={<BathIcon />} onChange={(value) => updateDraft({ bathrooms: value })} />
          </div>
        </main>
      ) : null}

      {id === 'intro-presentation' ? (
        <PhaseIntro eyebrow="Étape 2" title="Mettez votre logement en valeur" text="Choisissez les équipements, préparez les photos et rédigez une présentation claire de votre logement." variant="presentation" />
      ) : null}

      {id === 'amenities' ? (
        <main className="host-onboarding__step host-onboarding__step--amenities">
          <span className="host-onboarding__eyebrow">Étape {step + 1}</span>
          <h1>Choisissez les équipements qui font la différence</h1>
          <p>Sélectionnez uniquement ce qui est réellement disponible.</p>
          <div className="host-onboarding__amenity-groups">
            {HOST_AMENITY_GROUPS.map((group) => (
              <section className="host-onboarding__amenity-section" data-group={group.id} key={group.id}>
                <h2>{group.label}</h2>
                <div className="host-onboarding__amenity-grid">
                  {HOST_AMENITIES.filter((item) => item.group === group.id).map((item) => {
                    const active = draft.amenities.includes(item.id)
                    return (
                      <button key={item.id} type="button" aria-pressed={active} data-active={active ? 'true' : 'false'} onClick={() => toggleArrayValue('amenities', item.id)}>
                        <AmenityGlyph id={item.id} />
                        <span className="host-onboarding__amenity-copy"><strong>{item.label}</strong>{item.detail ? <small>{item.detail}</small> : null}</span>
                        {active ? <span className="host-onboarding__choice-check"><CheckIcon /></span> : null}
                      </button>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        </main>
      ) : null}

      {id === 'photos' ? (
        <main className="host-onboarding__step host-onboarding__step--photos">
          <span className="host-onboarding__eyebrow">Étape {step + 1}</span>
          <h1>Ajoutez quelques photos de votre logement</h1>
          <p>Au moins 5 photos seront recommandées. Pour l’instant, les emplacements restent volontairement vides.</p>
          <div className="host-onboarding__photo-uploader">
            <span className="host-onboarding__photo-stack"><PhotoIcon /><i>+</i></span>
            <small>Salon, cuisine, chambres et autres espaces</small>
            <button type="button" disabled>Ajouter des photos <span>+</span></button>
          </div>
          <div className="host-onboarding__photo-slots" data-testid="host-photo-placeholders">
            {[1, 2, 3, 4, 5].map((item) => <div key={item}><span>+</span></div>)}
          </div>
          <div className="host-onboarding__skip-note">L’upload sera connecté lors d’une prochaine étape.</div>
        </main>
      ) : null}

      {id === 'title' ? (
        <main className="host-onboarding__step host-onboarding__step--title">
          <span className="host-onboarding__eyebrow">Étape {step + 1}</span>
          <h1>Donnez un titre mémorable à votre logement</h1>
          <p>Les titres courts et précis fonctionnent le mieux.</p>
          <label className="host-onboarding__big-field"><span>Titre de l’annonce</span><textarea rows="7" maxLength="50" value={draft.title} onChange={(event) => updateDraft({ title: event.target.value })} placeholder="Écrivez votre titre ici" aria-label="Titre de l’annonce" /></label>
          <span className="host-onboarding__char-count">{draft.title.length}/50</span>
        </main>
      ) : null}

      {id === 'highlights' ? (
        <main className="host-onboarding__step">
          <span className="host-onboarding__eyebrow">Étape {step + 1}</span>
          <h1>Décrivez votre logement</h1>
          <p>Choisissez jusqu’à 2 points forts pour commencer.</p>
          <div className="host-onboarding__chips">
            {HOST_HIGHLIGHTS.map((item) => {
              const active = draft.highlights.includes(item.id)
              return <button key={item.id} type="button" aria-pressed={active} data-active={active ? 'true' : 'false'} onClick={() => toggleArrayValue('highlights', item.id, 2)}>{active ? <CheckIcon /> : null}{item.label}</button>
            })}
          </div>
          <small className="host-onboarding__selection-count">{draft.highlights.length}/2 sélectionné{draft.highlights.length > 1 ? 's' : ''}</small>
        </main>
      ) : null}

      {id === 'description' ? (
        <main className="host-onboarding__step host-onboarding__step--description">
          <span className="host-onboarding__eyebrow">Étape {step + 1}</span>
          <h1>Présentez ce qui rend votre logement spécial</h1>
          <p>Une description simple et chaleureuse suffit.</p>
          <label className="host-onboarding__big-field"><span>Description</span><textarea rows="12" maxLength="500" value={draft.description} onChange={(event) => updateDraft({ description: event.target.value })} placeholder="Décrivez l’ambiance, les espaces et les principaux atouts…" aria-label="Description du logement" /></label>
          <span className="host-onboarding__char-count">{draft.description.length}/500</span>
        </main>
      ) : null}

      {id === 'safety' ? (
        <main className="host-onboarding__step">
          <span className="host-onboarding__eyebrow">Étape {step + 1}</span>
          <h1>Partagez les informations de sécurité</h1>
          <p>Indiquez clairement les dispositifs présents dans le logement.</p>
          <div className="host-onboarding__safety-card">
            <strong>Surveillance & sécurité</strong>
            <label className="host-onboarding__toggle-row"><span>Caméra extérieure présente</span><input type="checkbox" checked={draft.safety.exteriorCamera} onChange={(event) => updateSafety('exteriorCamera', event.target.checked)} /></label>
            <label className="host-onboarding__toggle-row"><span>Moniteur de bruit présent</span><input type="checkbox" checked={draft.safety.noiseMonitor} onChange={(event) => updateSafety('noiseMonitor', event.target.checked)} /></label>
            <label className="host-onboarding__toggle-row"><span>Arme présente sur la propriété</span><input type="checkbox" checked={draft.safety.weapons} onChange={(event) => updateSafety('weapons', event.target.checked)} /></label>
          </div>
          <div className="host-onboarding__safety-card">
            <strong>Détecteurs</strong>
            <label className="host-onboarding__toggle-row"><span>Détecteur de fumée</span><input type="checkbox" checked={draft.safety.smokeAlarm} onChange={(event) => updateSafety('smokeAlarm', event.target.checked)} /></label>
            <label className="host-onboarding__toggle-row"><span>Détecteur de monoxyde de carbone</span><input type="checkbox" checked={draft.safety.carbonMonoxideAlarm} onChange={(event) => updateSafety('carbonMonoxideAlarm', event.target.checked)} /></label>
          </div>
        </main>
      ) : null}

      {id === 'intro-publish' ? (
        <PhaseIntro eyebrow="Étape 3" title="Finalisez et publiez" text="Confirmez vos préférences de réservation, vérifiez le prix et préparez votre annonce pour la publication." variant="publish" />
      ) : null}

      {id === 'booking' ? (
        <main className="host-onboarding__step">
          <span className="host-onboarding__eyebrow">Étape {step + 1}</span>
          <h1>Choisissez vos préférences de réservation</h1>
          <p>Vous pourrez modifier ce réglage plus tard.</p>
          <div className="host-onboarding__stacked-options host-onboarding__stacked-options--booking" role="radiogroup" aria-label="Mode de réservation">
            <button type="button" role="radio" aria-checked={draft.bookingMode === 'request-first'} data-active={draft.bookingMode === 'request-first' ? 'true' : 'false'} onClick={() => updateDraft({ bookingMode: 'request-first' })}><span className="host-onboarding__radio-dot">{draft.bookingMode === 'request-first' ? <CheckIcon /> : null}</span><div><strong>Approuver les premières réservations</strong><small>Vous examinez chaque demande avant de confirmer.</small></div></button>
            <button type="button" role="radio" aria-checked={draft.bookingMode === 'instant'} data-active={draft.bookingMode === 'instant' ? 'true' : 'false'} onClick={() => updateDraft({ bookingMode: 'instant' })}><span className="host-onboarding__radio-dot">{draft.bookingMode === 'instant' ? <CheckIcon /> : null}</span><div><strong>Réservation instantanée</strong><small>Les voyageurs peuvent réserver automatiquement.</small></div></button>
          </div>
        </main>
      ) : null}

      {id === 'price' ? (
        <main className="host-onboarding__step host-onboarding__step--price">
          <span className="host-onboarding__eyebrow">Étape {step + 1}</span>
          <h1>Définissez votre prix de départ</h1>
          <p>Ce tarif servira de base dans votre calendrier Hôte.</p>
          <label className="host-onboarding__price"><span>Prix de base par nuit</span><div><input inputMode="numeric" value={draft.basePrice} onChange={(event) => updateDraft({ basePrice: event.target.value.replace(/\D/g, '').slice(0, 5) })} aria-label="Prix par nuit" /><b>TND</b></div></label>
          <div className="host-onboarding__weekend-card"><span>Ajustement week-end</span><strong>+7%</strong><small>modifiable après publication</small></div>
        </main>
      ) : null}

      {id === 'promotions' ? (
        <main className="host-onboarding__step">
          <span className="host-onboarding__eyebrow">Étape {step + 1}</span>
          <h1>Ajoutez des réductions si vous le souhaitez</h1>
          <p>Ces promotions sont facultatives et pourront être modifiées ensuite.</p>
          <div className="host-onboarding__promotion-list">
            {HOST_PROMOTIONS.map((item) => {
              const active = draft.promotions.includes(item.id)
              return <button key={item.id} type="button" aria-pressed={active} data-active={active ? 'true' : 'false'} onClick={() => toggleArrayValue('promotions', item.id)}><b>{item.value}%</b><span><strong>{item.label}</strong><small>{item.detail}</small></span><i>{active ? <CheckIcon /> : null}</i></button>
            })}
          </div>
        </main>
      ) : null}

      {id === 'review' ? (
        <main className="host-onboarding__step host-onboarding__step--review">
          <span className="host-onboarding__eyebrow">Étape finale</span>
          <h1>Finalisez et publiez</h1>
          <p>Vérifiez vos principaux réglages avant d’activer votre espace Hôte.</p>
          <div className="host-onboarding__review-summary">
            <section><span className="host-onboarding__review-icon">▣</span><div><strong>Préférence de réservation</strong><small>{draft.bookingMode === 'instant' ? 'Réservation instantanée' : 'Validation des premières demandes'}</small></div><b>›</b></section>
            <section><span className="host-onboarding__review-icon">◇</span><div><strong>Tarification</strong><small>Prix de base</small></div><em>{Number(draft.basePrice) || 0} TND</em></section>
            <section><span className="host-onboarding__review-icon">✓</span><div><strong>Sécurité</strong><small>Informations renseignées</small></div><i>Complet</i></section>
          </div>
          <div className="host-onboarding__review-card">
            <span>{draft.propertyType} · {draft.city}</span>
            <strong>{draft.title}</strong>
            <small>{draft.guests} voyageurs · {draft.bedrooms} chambre{draft.bedrooms > 1 ? 's' : ''} · {Number(draft.basePrice) || 0} TND / nuit</small>
          </div>
          <label className="host-onboarding__check"><input type="checkbox" checked={draft.confirmedAuthority} onChange={(event) => updateDraft({ confirmedAuthority: event.target.checked })} /><span>Je confirme être autorisé à proposer ce logement sur Movera.</span></label>
          <label className="host-onboarding__check"><input type="checkbox" checked={draft.acceptedRules} onChange={(event) => updateDraft({ acceptedRules: event.target.checked })} /><span>J’accepte les règles Hôte et les conditions de la plateforme.</span></label>
        </main>
      ) : null}

      <footer className="host-onboarding__footer">
        <PhaseTracker stage={visualStage} />
        {feedback ? <span className="host-onboarding__feedback" role="status">{feedback}</span> : null}
        <div className="host-onboarding__footer-actions">
          <button type="button" className="host-onboarding__back" onClick={goBack}><ArrowIcon back />Retour</button>
          <button type="button" className="host-onboarding__primary" disabled={!canContinue} onClick={id === 'review' ? finish : next}>{id === 'review' ? 'Publier le logement' : step === 0 ? 'Commencer' : 'Continuer'} <ArrowIcon /></button>
        </div>
      </footer>
    </section>
  )
}
