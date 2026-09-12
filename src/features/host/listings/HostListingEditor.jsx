import { useEffect, useMemo, useState } from 'react'
import { updateHostListing } from '../../../entities/host/hostProfileStore.js'
import { OptimizedListingImage } from '../../../shared/media/OptimizedListingImage.jsx'
import { COMMON_HOST_AMENITY_GROUPS } from '../onboarding/hostOnboardingModel.js'
import { getOfferFlow } from '../onboarding/offer-flows/offerFlowRegistry.js'
import { HostRoomTypeManager } from '../rooms/HostRoomTypeManager.jsx'
import { HostListingSettings } from './HostListingSettings.jsx'
import {
  listingEditorCards,
  listingEditorProgress,
  listingGallery,
  LISTING_EDITOR_TABS,
} from './hostListingEditorModel.js'
import './host-listings.css'

/* The listing editor.

   One screen, two tabs, a card per editable thing -- and a sheet per card.
   The cards come from hostListingEditorModel, so what the screen shows and
   what the progress meter counts cannot disagree.

   Every sheet writes through updateHostListing, which re-normalises the whole
   listing. That matters: a bad value here is rejected by the same rules the
   onboarding flow is held to, rather than by a second validator that drifts. */

function BackIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5 8 12l7 7" /></svg>
}

/* A cog, not a sun. The eight radial spokes of the previous icon read as a
   brightness control at 19px, which is the wrong promise for a button that
   opens pricing and availability. */
function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.3 14.6a1.6 1.6 0 0 0 .32 1.77l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.6 1.6 0 0 0-1.77-.32 1.6 1.6 0 0 0-.97 1.47V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1.05-1.47 1.6 1.6 0 0 0-1.77.32l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.6 1.6 0 0 0 .32-1.77 1.6 1.6 0 0 0-1.47-.97H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.47-1.05 1.6 1.6 0 0 0-.32-1.77l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.6 1.6 0 0 0 1.77.32H9a1.6 1.6 0 0 0 .97-1.47V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 .97 1.47 1.6 1.6 0 0 0 1.77-.32l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.6 1.6 0 0 0-.32 1.77V9a1.6 1.6 0 0 0 1.47.97H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.47.97Z" />
    </svg>
  )
}

function ChevronIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
}

function CloseIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
}

function CheckIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.2 4.2L19 7" /></svg>
}

function EyeIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="3" /></svg>
}

function Stepper({ label, value, min = 0, max = 50, onChange }) {
  return (
    <div className="host-edit-stepper">
      <span>{label}</span>
      <div>
        <button type="button" aria-label={`Réduire ${label}`} disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))}>−</button>
        <b>{value}</b>
        <button type="button" aria-label={`Augmenter ${label}`} disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}>+</button>
      </div>
    </div>
  )
}

function Toggle({ label, detail, checked, onChange }) {
  return (
    <label className="host-edit-toggle">
      <span><strong>{label}</strong>{detail ? <small>{detail}</small> : null}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <i aria-hidden="true" />
    </label>
  )
}

/* ---------- the sheets ---------- */

function PhotoSheet({ listing }) {
  const gallery = listingGallery(listing)
  return (
    <>
      <p className="host-edit-note">
        {gallery.length
          ? `${gallery.length} photo${gallery.length > 1 ? 's' : ''} publiée${gallery.length > 1 ? 's' : ''}. L’ajout et le réordonnancement seront connectés en même temps que l’upload.`
          : 'Aucune photo pour le moment. L’upload sera connecté lors d’une prochaine étape.'}
      </p>
      {gallery.length ? (
        <div className="host-edit-gallery">
          {gallery.map((photo, index) => (
            <figure key={`${photo}-${index}`}><OptimizedListingImage src={photo} alt="" sizes="110px" />{index === 0 ? <figcaption>Couverture</figcaption> : null}</figure>
          ))}
        </div>
      ) : null}
    </>
  )
}

function TitleSheet({ draft, setDraft }) {
  return (
    <label className="host-edit-field">
      <span>Titre de l’annonce</span>
      <textarea rows="3" maxLength={80} value={draft.name} onChange={(event) => setDraft({ name: event.target.value })} />
      <small>{draft.name.length}/80 · les titres courts et précis fonctionnent le mieux.</small>
    </label>
  )
}

function TypeSheet({ listing, draft, setDraft }) {
  const flow = getOfferFlow(listing.type)
  return (
    <>
      <p className="host-edit-note">
        Le type de logement est fixé à la création, car il détermine le catalogue d’équipements,
        les points forts et la gestion des chambres. Vous pouvez modifier l’accès voyageur.
      </p>
      <div className="host-edit-static"><strong>{listing.type}</strong><small>Catégorie de l’annonce</small></div>
      <div className="host-edit-choices" role="radiogroup" aria-label="Accès voyageur">
        {flow.guestAccess.map((item) => (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={draft.guestAccess === item.id}
            data-active={draft.guestAccess === item.id ? 'true' : 'false'}
            onClick={() => setDraft({ guestAccess: item.id })}
          >
            <span><strong>{item.label}</strong><small>{item.description}</small></span>
            {draft.guestAccess === item.id ? <i><CheckIcon /></i> : null}
          </button>
        ))}
      </div>
    </>
  )
}

function CapacitySheet({ draft, setDraft }) {
  return (
    <div className="host-edit-steppers">
      <Stepper label="Voyageurs" value={draft.guests} min={1} max={50} onChange={(guests) => setDraft({ guests })} />
      <Stepper label="Chambres" value={draft.bedrooms} min={0} max={50} onChange={(bedrooms) => setDraft({ bedrooms })} />
      <Stepper label="Lits" value={draft.beds} min={1} max={50} onChange={(beds) => setDraft({ beds })} />
      <Stepper label="Salles de bain" value={draft.bathrooms} min={0} max={50} onChange={(bathrooms) => setDraft({ bathrooms })} />
    </div>
  )
}

function AmenitiesSheet({ listing, draft, setDraft }) {
  const flow = getOfferFlow(listing.type)
  const groups = flow.amenityGroups.length ? flow.amenityGroups : COMMON_HOST_AMENITY_GROUPS
  const toggle = (id) => {
    const next = draft.amenities.includes(id)
      ? draft.amenities.filter((item) => item !== id)
      : [...draft.amenities, id]
    setDraft({ amenities: next })
  }
  return (
    <div className="host-edit-groups">
      {groups.map((group) => {
        const items = flow.amenities.filter((item) => item.group === group.id)
        if (!items.length) return null
        return (
          <section key={group.id}>
            <h3>{group.label}</h3>
            <div className="host-edit-checklist">
              {items.map((item) => {
                const active = draft.amenities.includes(item.id)
                return (
                  <button key={item.id} type="button" aria-pressed={active} data-active={active ? 'true' : 'false'} onClick={() => toggle(item.id)}>
                    <span>{item.label}</span>
                    {active ? <i><CheckIcon /></i> : null}
                  </button>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function HighlightsSheet({ listing, draft, setDraft }) {
  const flow = getOfferFlow(listing.type)
  const { HighlightIcon } = flow.presentation
  const toggle = (id) => {
    const next = draft.highlights.includes(id)
      ? draft.highlights.filter((item) => item !== id)
      : [...draft.highlights, id]
    setDraft({ highlights: next })
  }
  return (
    <div className="host-edit-groups" data-offer-variant={flow.presentation.variant}>
      {flow.highlightGroups.map((group) => {
        const items = flow.highlights.filter((item) => item.group === group.id)
        if (!items.length) return null
        return (
          <section key={group.id}>
            <h3>{group.title}</h3>
            <div className="host-edit-highlights">
              {items.map((item) => {
                const active = draft.highlights.includes(item.id)
                return (
                  <button key={item.id} type="button" aria-pressed={active} data-active={active ? 'true' : 'false'} onClick={() => toggle(item.id)}>
                    <span className="host-edit-highlights__icon">{HighlightIcon ? <HighlightIcon id={item.id} /> : null}</span>
                    <span className="host-edit-highlights__copy"><strong>{item.label}</strong>{item.detail ? <small>{item.detail}</small> : null}</span>
                    {active ? <i><CheckIcon /></i> : null}
                  </button>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function DescriptionSheet({ draft, setDraft }) {
  return (
    <label className="host-edit-field">
      <span>Description</span>
      <textarea rows="9" maxLength={1000} value={draft.description} onChange={(event) => setDraft({ description: event.target.value })} />
      <small>{draft.description.length}/1000 · 40 caractères au minimum pour être affichée.</small>
    </label>
  )
}

function LocationSheet({ draft, setDraft }) {
  return (
    <>
      <label className="host-edit-field">
        <span>Adresse</span>
        <input value={draft.address} maxLength={160} onChange={(event) => setDraft({ address: event.target.value })} />
      </label>
      <label className="host-edit-field">
        <span>Ville</span>
        <input value={draft.city} maxLength={80} onChange={(event) => setDraft({ city: event.target.value })} />
      </label>
      <p className="host-edit-note">
        L’adresse exacte n’est communiquée qu’après une réservation confirmée. Le repère
        de la carte suit la ville tant que l’adresse n’a pas été replacée.
      </p>
    </>
  )
}

function CheckinSheet({ draft, setDraft }) {
  const rules = draft.stayRules
  const set = (patch) => setDraft({ stayRules: { ...rules, ...patch } })
  return (
    <div className="host-edit-times">
      <label className="host-edit-field">
        <span>Arrivée à partir de</span>
        <input type="time" value={rules.checkInFrom} onChange={(event) => set({ checkInFrom: event.target.value })} />
      </label>
      <label className="host-edit-field">
        <span>Départ avant</span>
        <input type="time" value={rules.checkOutUntil} onChange={(event) => set({ checkOutUntil: event.target.value })} />
      </label>
    </div>
  )
}

function InstructionsSheet({ draft, setDraft }) {
  const guide = draft.arrivalGuide
  const set = (patch) => setDraft({ arrivalGuide: { ...guide, ...patch } })
  return (
    <>
      <label className="host-edit-field">
        <span>Instructions d’arrivée</span>
        <textarea rows="7" maxLength={1000} value={guide.instructions} onChange={(event) => set({ instructions: event.target.value })} placeholder="Code du portail, étage, remise des clés…" />
        <small>{guide.instructions.length}/1000</small>
      </label>
      <label className="host-edit-field">
        <span>Comment se rendre sur place</span>
        <textarea rows="4" maxLength={600} value={guide.directions} onChange={(event) => set({ directions: event.target.value })} placeholder="Depuis l’aéroport, depuis le centre-ville…" />
      </label>
      <p className="host-edit-note">Ces informations ne sont envoyées au voyageur qu’une fois le séjour confirmé.</p>
    </>
  )
}

function WifiSheet({ draft, setDraft }) {
  const guide = draft.arrivalGuide
  const set = (patch) => setDraft({ arrivalGuide: { ...guide, ...patch } })
  return (
    <>
      <label className="host-edit-field">
        <span>Nom du réseau</span>
        <input value={guide.wifiName} maxLength={80} onChange={(event) => set({ wifiName: event.target.value })} />
      </label>
      <label className="host-edit-field">
        <span>Mot de passe</span>
        <input value={guide.wifiPassword} maxLength={80} onChange={(event) => set({ wifiPassword: event.target.value })} />
      </label>
      <p className="host-edit-note">
        Conservé sur cet appareil avec le reste de votre annonce, et partagé avec le voyageur
        au même moment que les instructions d’arrivée.
      </p>
    </>
  )
}

function RulesSheet({ draft, setDraft }) {
  const rules = draft.stayRules
  const set = (patch) => setDraft({ stayRules: { ...rules, ...patch } })
  return (
    <div className="host-edit-toggles">
      <Toggle label="Animaux acceptés" detail="Les voyageurs peuvent venir avec un animal." checked={rules.petsAllowed} onChange={(petsAllowed) => set({ petsAllowed })} />
      <Toggle label="Fumeurs acceptés" detail="Autorisé à l’intérieur du logement." checked={rules.smokingAllowed} onChange={(smokingAllowed) => set({ smokingAllowed })} />
      <Toggle label="Événements autorisés" detail="Fêtes et réceptions." checked={rules.eventsAllowed} onChange={(eventsAllowed) => set({ eventsAllowed })} />
    </div>
  )
}

/* Room categories keep their existing manager rather than getting a second,
   parallel editor: it already owns capacities, per-room prices, photos and
   stock, and two screens writing the same inventory is how they drift. */
function RoomsSheet({ profile, userId, onNavigate }) {
  return <HostRoomTypeManager profile={profile} userId={userId} onNavigate={onNavigate} />
}

const SHEETS = {
  photos: { title: 'Visite en photos', Body: PhotoSheet, readOnly: true },
  rooms: { title: 'Chambres et catégories', Body: RoomsSheet, readOnly: true },
  title: { title: 'Titre', Body: TitleSheet },
  type: { title: 'Type de logement', Body: TypeSheet },
  capacity: { title: 'Voyageurs et couchages', Body: CapacitySheet },
  amenities: { title: 'Équipements', Body: AmenitiesSheet },
  highlights: { title: 'Points forts', Body: HighlightsSheet },
  description: { title: 'Description', Body: DescriptionSheet },
  location: { title: 'Emplacement', Body: LocationSheet },
  checkin: { title: 'Arrivée et départ', Body: CheckinSheet },
  instructions: { title: 'Instructions d’arrivée', Body: InstructionsSheet },
  wifi: { title: 'Wi-Fi', Body: WifiSheet },
  rules: { title: 'Règlement intérieur', Body: RulesSheet },
}

function draftFromListing(listing) {
  return {
    name: listing.name || '',
    description: listing.description || '',
    address: listing.address || '',
    city: listing.city || '',
    guests: Math.max(1, Number(listing.guests) || 1),
    bedrooms: Math.max(0, Number(listing.bedrooms) || 0),
    beds: Math.max(1, Number(listing.beds) || 1),
    bathrooms: Math.max(0, Number(listing.bathrooms) || 0),
    guestAccess: listing.guestAccess || 'entire',
    amenities: [...(listing.amenities || [])],
    highlights: [...(listing.highlights || [])],
    stayRules: { ...listing.stayRules },
    arrivalGuide: { instructions: '', wifiName: '', wifiPassword: '', directions: '', ...listing.arrivalGuide },
  }
}

function EditSheet({ editor, profile, listing, userId, onNavigate, onClose, onSaved }) {
  const config = SHEETS[editor]
  const [draft, setDraft] = useState(() => draftFromListing(listing))
  const [error, setError] = useState('')
  if (!config) return null
  const { Body, title, readOnly } = config

  const patch = (part) => { setDraft((state) => ({ ...state, ...part })); setError('') }

  const save = () => {
    try {
      updateHostListing(userId, draft)
      onSaved(`${title} · enregistré`)
      onClose()
    } catch (saveError) {
      setError(saveError?.message || 'Impossible d’enregistrer cette modification.')
    }
  }

  return (
    <div className="host-sheet" role="dialog" aria-modal="true" aria-label={title} data-testid={`host-edit-sheet-${editor}`}>
      <button type="button" className="host-sheet__scrim" aria-label="Fermer" onClick={onClose} />
      <div className="host-sheet__panel">
        <div className="host-sheet__head">
          <button type="button" aria-label="Fermer" onClick={onClose}><CloseIcon /></button>
          <strong>{title}</strong>
          <span />
        </div>
        <div className="host-sheet__body">
          <Body listing={listing} draft={draft} setDraft={patch} profile={profile} userId={userId} onNavigate={onNavigate} />
          {error ? <p className="host-workspace-feedback" role="alert">{error}</p> : null}
        </div>
        {readOnly ? null : (
          <div className="host-sheet__foot">
            <button type="button" className="host-primary-action" onClick={save} data-testid={`host-edit-save-${editor}`}>Enregistrer</button>
          </div>
        )}
      </div>
    </div>
  )
}

export function HostListingEditor({ profile, userId, onNavigate, onBack }) {
  const listing = profile.listing
  const [tab, setTab] = useState('space')
  const [editor, setEditor] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!notice) return undefined
    const timer = setTimeout(() => setNotice(''), 2600)
    return () => clearTimeout(timer)
  }, [notice])

  const cards = useMemo(() => listingEditorCards(listing, tab), [listing, tab])
  const progress = useMemo(() => listingEditorProgress(listing), [listing])
  const gallery = listingGallery(listing)
  const photoCard = cards.find((card) => card.id === 'photos')

  return (
    <div className="host-workspace-view host-listing-editor" data-testid="host-listing-editor">
      <header className="host-listing-editor__bar">
        <button type="button" aria-label="Retour" onClick={onBack}><BackIcon /></button>
        <strong>Éditeur d’annonce</strong>
        <button type="button" aria-label="Réglages de l’annonce" onClick={() => setSettingsOpen(true)} data-testid="host-editor-settings"><GearIcon /></button>
      </header>

      <div className="host-listing-editor__tabs" role="tablist" aria-label="Sections de l’annonce">
        {LISTING_EDITOR_TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            data-active={tab === item.id ? 'true' : 'false'}
            onClick={() => setTab(item.id)}
          >{item.label}</button>
        ))}
      </div>

      <div className="host-listing-editor__progress" aria-label={`Annonce complétée à ${progress.percent}%`}>
        <i style={{ width: `${progress.percent}%` }} />
        <span>{progress.done}/{progress.total} éléments renseignés</span>
      </div>

      <div className="host-listing-editor__cards">
        {photoCard ? (
          <article className="host-editor-card host-editor-card--photos">
            <div className="host-editor-card__copy">
              <strong>{photoCard.label}</strong>
              <small>{photoCard.hint}</small>
            </div>
            <button type="button" className="host-editor-photos" onClick={() => setEditor('photos')} aria-label="Ouvrir la visite en photos">
              {gallery.length ? (
                <>
                  <span className="host-editor-photos__count">{gallery.length} photo{gallery.length > 1 ? 's' : ''}</span>
                  <span className="host-editor-photos__stack">
                    {gallery.slice(0, 3).map((photo, index) => (
                      <span key={`${photo}-${index}`} data-slot={index}><OptimizedListingImage src={photo} alt="" sizes="200px" /></span>
                    ))}
                  </span>
                </>
              ) : <span className="host-editor-photos__empty">Ajouter des photos</span>}
            </button>
          </article>
        ) : null}

        {cards.filter((card) => card.id !== 'photos').map((card) => (
          <button
            key={card.id}
            type="button"
            className="host-editor-card host-editor-card--row"
            data-done={card.done ? 'true' : 'false'}
            data-testid={`host-editor-card-${card.id}`}
            onClick={() => setEditor(card.editor)}
          >
            <span className="host-editor-card__copy">
              <small>{card.label}</small>
              <strong>{card.value}</strong>
              {card.hint && card.done ? <em>{card.hint}</em> : null}
            </span>
            <ChevronIcon />
          </button>
        ))}
      </div>

      <button type="button" className="host-listing-editor__preview" onClick={() => onNavigate(`/listing/${encodeURIComponent(listing.id)}`)}>
        <EyeIcon /> Voir comme voyageur
      </button>

      {notice ? <p className="host-workspace-feedback host-listing-editor__notice" role="status">{notice}</p> : null}

      {editor ? (
        <EditSheet
          editor={editor}
          profile={profile}
          listing={listing}
          userId={userId}
          onNavigate={onNavigate}
          onClose={() => setEditor('')}
          onSaved={setNotice}
        />
      ) : null}

      {settingsOpen ? (
        <HostListingSettings
          listing={listing}
          userId={userId}
          onClose={() => setSettingsOpen(false)}
          onSaved={setNotice}
        />
      ) : null}
    </div>
  )
}
