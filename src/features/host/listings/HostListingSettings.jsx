import { useMemo, useState } from 'react'
import { updateHostListing } from '../../../entities/host/hostProfileStore.js'
import { HOST_PROMOTIONS } from '../onboarding/hostOnboardingModel.js'
import {
  CANCELLATION_POLICIES,
  LISTING_STATUSES,
  listingStatus,
  normalizePricingBounds,
} from './hostListingEditorModel.js'
import './host-listings.css'

/* Listing settings: the gear in the editor.

   Four tabs, each one a policy the host sets once and the rest of the app
   reads -- the calendar clamps a nightly price to the Smart Pricing bounds,
   the booking engine reads the stay rules, the offer page shows the fees. The
   values were already scattered across onboarding screens with no way back to
   them after publishing; this is that way back. */

const TABS = Object.freeze([
  { id: 'pricing', label: 'Tarifs' },
  { id: 'discounts', label: 'Réductions' },
  { id: 'availability', label: 'Disponibilité' },
  { id: 'cancellation', label: 'Annulation' },
])

function CloseIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
}

function CheckIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.2 4.2L19 7" /></svg>
}

function ChevronIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
}

function PriceField({ label, value, currency, onChange }) {
  return (
    <label className="host-price-field">
      <span>{label}</span>
      <div>
        <input
          inputMode="numeric"
          value={value}
          aria-label={label}
          onChange={(event) => onChange(event.target.value.replace(/\D/g, '').slice(0, 5))}
        />
        <b>{currency}</b>
      </div>
    </label>
  )
}

function Toggle({ label, detail, checked, onChange }) {
  return (
    <label className="host-edit-toggle host-edit-toggle--card">
      <span><strong>{label}</strong>{detail ? <small>{detail}</small> : null}</span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <i aria-hidden="true" />
    </label>
  )
}

function Stepper({ label, detail, value, min, max, suffix, onChange }) {
  return (
    <div className="host-edit-stepper host-edit-stepper--card">
      <span><strong>{label}</strong>{detail ? <small>{detail}</small> : null}</span>
      <div>
        <button type="button" aria-label={`Réduire ${label}`} disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))}>−</button>
        <b>{value}{suffix ? <em>{suffix}</em> : null}</b>
        <button type="button" aria-label={`Augmenter ${label}`} disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))}>+</button>
      </div>
    </div>
  )
}

function PricingTab({ draft, setDraft, currency, onOpenFees }) {
  const bounds = normalizePricingBounds({ min: draft.pricing.min, max: draft.pricing.max, base: draft.basePrice })
  const inverted = Number(draft.pricing.max) > 0 && Number(draft.pricing.max) < Number(draft.pricing.min)
  return (
    <>
      <div className="host-price-card">
        <PriceField label="Prix minimum par nuit" currency={currency} value={draft.pricing.min} onChange={(min) => setDraft({ pricing: { ...draft.pricing, min } })} />
        <PriceField label="Prix maximum par nuit" currency={currency} value={draft.pricing.max} onChange={(max) => setDraft({ pricing: { ...draft.pricing, max } })} />
      </div>
      {inverted ? (
        <p className="host-workspace-feedback" role="status">
          Le maximum est inférieur au minimum. Il sera ramené à {bounds.max} {currency} à l’enregistrement.
        </p>
      ) : null}

      <Toggle
        label="Tarification intelligente"
        detail="Vos prix sont ajustés automatiquement selon la demande, sans jamais sortir de la fourchette ci-dessus."
        checked={draft.pricing.smart}
        onChange={(smart) => setDraft({ pricing: { ...draft.pricing, smart } })}
      />

      <button type="button" className="host-settings-row" onClick={onOpenFees} data-testid="host-settings-fees">
        <span><strong>Frais</strong><small>Ménage, animaux, voyageur supplémentaire</small></span>
        <ChevronIcon />
      </button>

      <p className="host-edit-note">
        Le prix de base actuel est de {Math.round(Number(draft.basePrice) || 0)} {currency}. Une nuit
        modifiée dans le calendrier reste comprise dans cette fourchette.
      </p>
    </>
  )
}

function FeesTab({ draft, setDraft, currency }) {
  const set = (patch) => setDraft({ fees: { ...draft.fees, ...patch } })
  return (
    <>
      <div className="host-price-card">
        <PriceField label="Frais de ménage" currency={currency} value={draft.fees.cleaning} onChange={(cleaning) => set({ cleaning })} />
        <PriceField label="Frais animal" currency={currency} value={draft.fees.pet} onChange={(pet) => set({ pet })} />
        <PriceField label="Voyageur supplémentaire" currency={currency} value={draft.fees.extraGuest} onChange={(extraGuest) => set({ extraGuest })} />
      </div>
      <Stepper
        label="À partir du voyageur n°"
        detail="Le supplément ne s’applique qu’au-delà de ce nombre."
        value={Math.max(1, Number(draft.fees.extraGuestAfter) || 1)}
        min={1}
        max={20}
        onChange={(extraGuestAfter) => set({ extraGuestAfter })}
      />
      <p className="host-edit-note">Laissez un frais à 0 pour ne pas l’appliquer.</p>
    </>
  )
}

function DiscountsTab({ draft, setDraft }) {
  const toggle = (id) => {
    const next = draft.promotions.includes(id)
      ? draft.promotions.filter((item) => item !== id)
      : [...draft.promotions, id]
    setDraft({ promotions: next })
  }
  return (
    <div className="host-settings-list">
      {HOST_PROMOTIONS.map((item) => {
        const active = draft.promotions.includes(item.id)
        return (
          <button key={item.id} type="button" aria-pressed={active} data-active={active ? 'true' : 'false'} onClick={() => toggle(item.id)}>
            <b>{item.value}%</b>
            <span><strong>{item.label}</strong><small>{item.detail}</small></span>
            {active ? <i><CheckIcon /></i> : null}
          </button>
        )
      })}
    </div>
  )
}

function AvailabilityTab({ draft, setDraft }) {
  const rules = draft.stayRules
  const set = (patch) => setDraft({ stayRules: { ...rules, ...patch } })
  return (
    <>
      <Stepper label="Nuits minimum" value={rules.minNights} min={1} max={365} suffix=" n" onChange={(minNights) => set({ minNights, maxNights: Math.max(minNights, rules.maxNights) })} />
      <Stepper label="Nuits maximum" value={rules.maxNights} min={rules.minNights} max={365} suffix=" n" onChange={(maxNights) => set({ maxNights })} />
      <Stepper label="Préavis d’arrivée" detail="Délai minimum entre la réservation et l’arrivée." value={rules.advanceNoticeDays} min={0} max={365} suffix=" j" onChange={(advanceNoticeDays) => set({ advanceNoticeDays })} />
      <Stepper label="Temps de préparation" detail="Nuits bloquées automatiquement après un départ." value={rules.preparationDays} min={0} max={7} suffix=" j" onChange={(preparationDays) => set({ preparationDays })} />
      <div className="host-settings-status" role="radiogroup" aria-label="Visibilité de l’annonce">
        {LISTING_STATUSES.map((item) => (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={draft.status === item.id}
            data-active={draft.status === item.id ? 'true' : 'false'}
            onClick={() => setDraft({ status: item.id })}
          >
            <span><strong>{item.label}</strong><small>{item.detail}</small></span>
            {draft.status === item.id ? <i><CheckIcon /></i> : null}
          </button>
        ))}
      </div>
    </>
  )
}

function CancellationTab({ draft, setDraft }) {
  return (
    <div className="host-settings-status" role="radiogroup" aria-label="Politique d’annulation">
      {CANCELLATION_POLICIES.map((item) => (
        <button
          key={item.id}
          type="button"
          role="radio"
          aria-checked={draft.cancellationPolicy === item.id}
          data-active={draft.cancellationPolicy === item.id ? 'true' : 'false'}
          onClick={() => setDraft({ cancellationPolicy: item.id })}
        >
          <span><strong>{item.label}</strong><small>{item.detail}</small></span>
          {draft.cancellationPolicy === item.id ? <i><CheckIcon /></i> : null}
        </button>
      ))}
    </div>
  )
}

function draftFromListing(listing) {
  return {
    basePrice: listing.basePrice,
    pricing: {
      min: String(listing.pricing?.min ?? ''),
      max: String(listing.pricing?.max ?? ''),
      smart: Boolean(listing.pricing?.smart),
    },
    fees: {
      cleaning: String(listing.fees?.cleaning ?? 0),
      pet: String(listing.fees?.pet ?? 0),
      extraGuest: String(listing.fees?.extraGuest ?? 0),
      extraGuestAfter: Number(listing.fees?.extraGuestAfter ?? 2),
    },
    promotions: [...(listing.promotions || [])],
    stayRules: { ...listing.stayRules },
    cancellationPolicy: listing.cancellationPolicy || 'moderate',
    status: listingStatus(listing),
  }
}

export function HostListingSettings({ listing, userId, onClose, onSaved }) {
  const [tab, setTab] = useState('pricing')
  const [feesOpen, setFeesOpen] = useState(false)
  const [draft, setDraft] = useState(() => draftFromListing(listing))
  const [error, setError] = useState('')

  const currency = listing.currency || 'TND'
  const patch = (part) => { setDraft((state) => ({ ...state, ...part })); setError('') }

  const activeLabel = useMemo(
    () => (feesOpen ? 'Frais' : TABS.find((item) => item.id === tab)?.label || 'Réglages'),
    [tab, feesOpen],
  )

  const save = () => {
    try {
      const bounds = normalizePricingBounds({ min: draft.pricing.min, max: draft.pricing.max, base: draft.basePrice })
      updateHostListing(userId, {
        pricing: { min: bounds.min, max: bounds.max, smart: draft.pricing.smart },
        fees: {
          cleaning: Number(draft.fees.cleaning) || 0,
          pet: Number(draft.fees.pet) || 0,
          extraGuest: Number(draft.fees.extraGuest) || 0,
          extraGuestAfter: Number(draft.fees.extraGuestAfter) || 2,
        },
        promotions: draft.promotions,
        stayRules: draft.stayRules,
        cancellationPolicy: draft.cancellationPolicy,
        status: draft.status,
      })
      onSaved(`${activeLabel} · enregistré`)
      onClose()
    } catch (saveError) {
      setError(saveError?.message || 'Impossible d’enregistrer ces réglages.')
    }
  }

  return (
    <div className="host-sheet host-sheet--settings" role="dialog" aria-modal="true" aria-label="Réglages de l’annonce" data-testid="host-listing-settings">
      <button type="button" className="host-sheet__scrim" aria-label="Fermer" onClick={onClose} />
      <div className="host-sheet__panel host-sheet__panel--full">
        <div className="host-settings__top">
          <button type="button" aria-label="Fermer" onClick={feesOpen ? () => setFeesOpen(false) : onClose}><CloseIcon /></button>
          <span className="host-settings__currency">{currency}</span>
        </div>
        <h2 className="host-settings__title">{feesOpen ? 'Frais' : 'Réglages'}</h2>

        {feesOpen ? null : (
          <div className="host-settings__tabs" role="tablist" aria-label="Catégories de réglages">
            {TABS.map((item) => (
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
        )}

        <div className="host-settings__body">
          {feesOpen ? <FeesTab draft={draft} setDraft={patch} currency={currency} /> : null}
          {!feesOpen && tab === 'pricing' ? <PricingTab draft={draft} setDraft={patch} currency={currency} onOpenFees={() => setFeesOpen(true)} /> : null}
          {!feesOpen && tab === 'discounts' ? <DiscountsTab draft={draft} setDraft={patch} /> : null}
          {!feesOpen && tab === 'availability' ? <AvailabilityTab draft={draft} setDraft={patch} /> : null}
          {!feesOpen && tab === 'cancellation' ? <CancellationTab draft={draft} setDraft={patch} /> : null}
          {error ? <p className="host-workspace-feedback" role="alert">{error}</p> : null}
        </div>

        <div className="host-sheet__foot">
          <button type="button" className="host-primary-action" onClick={save} data-testid="host-settings-save">Enregistrer</button>
        </div>
      </div>
    </div>
  )
}
