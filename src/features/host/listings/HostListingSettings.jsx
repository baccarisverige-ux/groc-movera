import { useMemo, useState } from 'react'
import { updateHostListing } from '../../../entities/host/hostProfileStore.js'
import { HOST_PROMOTIONS } from '../onboarding/hostOnboardingModel.js'
import '../workspace/host-b225.css'
import {
  CANCELLATION_POLICIES,
  LISTING_STATUSES,
  listingStatus,
  normalizePricingBounds,
} from './hostListingEditorModel.js'
import {
  formatSettingValue,
  readSettingField,
  settingsField,
  unitSuffix,
  writeSettingField,
} from './hostListingSettingsModel.js'

/* Listing settings, in b225's shape.
 *
 * The reference calls this mh2Settings: a full-screen page, four tabs, and a
 * body of read-only value cards -- "Prix de base / nuit · 580 TND". Tapping a
 * card does not reveal an inline field; it pushes mh2PriceEdit, a second page
 * that is one enormous centred number and a save button. That two-page model
 * is the design, not a detail: on a phone a 44px number you can read from
 * across the room beats a 16px field in a list, and the host only ever edits
 * one value at a time.
 *
 * The draft-and-save logic underneath is the one that was already here and
 * already covered by tests -- bounds are normalised on save, a max below the
 * min is corrected rather than stored. Only the shell changed. */

const TABS = Object.freeze([
  { id: 'pricing', label: 'Tarifs' },
  { id: 'discounts', label: 'Réduc.' },
  { id: 'availability', label: 'Dispo.' },
  { id: 'cancellation', label: 'Annul.' },
])

function CloseIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
}

function ValueCard({ id, value, currency, onOpen, testId }) {
  const field = settingsField(id)
  return (
    <button type="button" className="mh2-card" onClick={() => onOpen(id)} data-testid={testId}>
      <label>{field.label}</label>
      <div className="val">{formatSettingValue(value, field.unit, currency)}</div>
      {field.hint ? <div className="hint">{field.hint}</div> : null}
    </button>
  )
}

/* The mh2PriceEdit page. One number, one unit line, one save. */
function EditPage({ fieldId, value, currency, onCancel, onCommit }) {
  const field = settingsField(fieldId)
  const [text, setText] = useState(() => String(Math.round(Number(value) || 0)))
  return (
    /* The dialog is named "Modifier — X", not "X".
       Naming it after the field made the dialog and the field it contains
       announce identically, so a screen-reader user hears the same words for
       the container and the control, and any by-name lookup matches both. */
    <div className="host-b225-ov" role="dialog" aria-modal="true" aria-label={`Modifier — ${field.label}`} data-testid="host-settings-edit">
      <div className="mh2-head">
        <button type="button" className="mh2-x" aria-label="Annuler" onClick={onCancel}><CloseIcon /></button>
        <h1>{field.label}</h1>
        <span style={{ width: '36px' }} />
      </div>
      <div className="mh2-body mh2-price-body">
        <input
          className="mh2-big-input"
          inputMode="numeric"
          aria-label={field.label}
          value={text}
          autoFocus
          onChange={(event) => setText(event.target.value.replace(/\D/g, '').slice(0, 6))}
        />
        <p style={{ textAlign: 'center', color: '#6b7c72', marginTop: '8px' }}>
          {unitSuffix(field.unit, currency)}{field.unit === 'tnd' ? ' / nuit' : ''}
        </p>
      </div>
      <div className="mh2-foot">
        <button type="button" className="mh2-save" onClick={() => onCommit(Math.max(0, Number(text) || 0))} data-testid="host-settings-edit-save">
          Enregistrer
        </button>
      </div>
    </div>
  )
}

function draftFromListing(listing) {
  return {
    basePrice: listing.basePrice,
    pricing: {
      min: Number(listing.pricing?.min ?? 0),
      max: Number(listing.pricing?.max ?? 0),
      smart: Boolean(listing.pricing?.smart),
    },
    fees: {
      cleaning: Number(listing.fees?.cleaning ?? 0),
      pet: Number(listing.fees?.pet ?? 0),
      extraGuest: Number(listing.fees?.extraGuest ?? 0),
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
  const [editing, setEditing] = useState('')
  const [draft, setDraft] = useState(() => draftFromListing(listing))
  const [error, setError] = useState('')

  const currency = listing.currency || 'TND'
  const bounds = useMemo(
    () => normalizePricingBounds({ min: draft.pricing.min, max: draft.pricing.max, base: draft.basePrice }),
    [draft.pricing.min, draft.pricing.max, draft.basePrice],
  )

  const togglePromotion = (id) => {
    setDraft((state) => ({
      ...state,
      promotions: state.promotions.includes(id)
        ? state.promotions.filter((item) => item !== id)
        : [...state.promotions, id],
    }))
  }

  const save = () => {
    try {
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
      if (typeof onSaved === 'function') onSaved('Réglages enregistrés')
      onClose()
    } catch (saveError) {
      setError(saveError?.message || 'Impossible d’enregistrer ces réglages.')
    }
  }

  if (editing) {
    return (
      <EditPage
        fieldId={editing}
        value={readSettingField(draft, editing)}
        currency={currency}
        onCancel={() => setEditing('')}
        onCommit={(value) => { setDraft((state) => writeSettingField(state, editing, value)); setEditing(''); setError('') }}
      />
    )
  }

  return (
    <div className="host-b225-ov" role="dialog" aria-modal="true" aria-label="Réglages de l’annonce" data-testid="host-listing-settings">
      <div className="mh2-head">
        <button type="button" className="mh2-x" aria-label="Fermer" onClick={onClose}><CloseIcon /></button>
        <h1>Réglages annonce</h1>
        <span className="mh2-x" aria-hidden="true" style={{ fontSize: '12px', fontWeight: 800 }}>{currency}</span>
      </div>

      <div className="mh2-tabs" role="tablist" aria-label="Catégories de réglages">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={tab === item.id ? 'on' : ''}
            onClick={() => setTab(item.id)}
          >{item.label}</button>
        ))}
      </div>

      <div className="mh2-body">
        {tab === 'pricing' ? (
          <>
            <div className="mh2-card">
              <label>Prix de base / nuit</label>
              <div className="val">{formatSettingValue(draft.basePrice, 'tnd', currency)}</div>
              <div className="hint">Défini dans l’annonce</div>
            </div>
            <ValueCard id="min" value={draft.pricing.min || bounds.min} currency={currency} onOpen={setEditing} testId="host-settings-min" />
            <ValueCard id="max" value={draft.pricing.max || bounds.max} currency={currency} onOpen={setEditing} testId="host-settings-max" />
            <button
              type="button"
              className="toggle-row mh2-card"
              aria-pressed={draft.pricing.smart}
              onClick={() => setDraft((state) => ({ ...state, pricing: { ...state.pricing, smart: !state.pricing.smart } }))}
              data-testid="host-settings-smart"
            >
              <span>
                <strong style={{ fontSize: '14px' }}>Tarification intelligente</strong>
                <p className="hint" style={{ margin: '4px 0 0' }}>Ajustement automatique selon la demande, sans sortir de la fourchette</p>
              </span>
              <span className="toggle" data-on={draft.pricing.smart ? 'true' : 'false'} aria-hidden="true" />
            </button>

            <h3 className="mh2-sec">Frais</h3>
            <ValueCard id="cleaning" value={draft.fees.cleaning} currency={currency} onOpen={setEditing} testId="host-settings-cleaning" />
            <ValueCard id="pet" value={draft.fees.pet} currency={currency} onOpen={setEditing} testId="host-settings-pet" />
            <ValueCard id="extraGuest" value={draft.fees.extraGuest} currency={currency} onOpen={setEditing} />
            <ValueCard id="extraGuestAfter" value={draft.fees.extraGuestAfter} currency={currency} onOpen={setEditing} />
            <p className="mh2-note">Laissez un frais à 0 pour ne pas l’appliquer.</p>
          </>
        ) : null}

        {tab === 'discounts' ? (
          <>
            {HOST_PROMOTIONS.map((item) => {
              const active = draft.promotions.includes(item.id)
              return (
                <button
                  key={item.id}
                  type="button"
                  className="mh2-card"
                  data-on={active ? 'true' : 'false'}
                  aria-pressed={active}
                  onClick={() => togglePromotion(item.id)}
                >
                  <label>{item.label}</label>
                  <div className="val">−{item.value} %</div>
                  <div className="hint">{item.detail}</div>
                </button>
              )
            })}
            <p className="mh2-note">Les pourcentages s’éditent en %, jamais en montant. Une seule réduction s’applique par séjour.</p>
          </>
        ) : null}

        {tab === 'availability' ? (
          <>
            <ValueCard id="minNights" value={draft.stayRules.minNights} currency={currency} onOpen={setEditing} testId="host-settings-min-nights" />
            <ValueCard id="maxNights" value={draft.stayRules.maxNights} currency={currency} onOpen={setEditing} />
            <ValueCard id="advanceNoticeDays" value={draft.stayRules.advanceNoticeDays} currency={currency} onOpen={setEditing} />
            <ValueCard id="preparationDays" value={draft.stayRules.preparationDays} currency={currency} onOpen={setEditing} />
            <h3 className="mh2-sec">Visibilité</h3>
            {LISTING_STATUSES.map((item) => (
              <button
                key={item.id}
                type="button"
                className="mh2-card"
                data-on={draft.status === item.id ? 'true' : 'false'}
                aria-pressed={draft.status === item.id}
                onClick={() => setDraft((state) => ({ ...state, status: item.id }))}
                data-testid={`host-settings-status-${item.id}`}
              >
                <label>{item.label}</label>
                <div className="hint">{item.detail}</div>
              </button>
            ))}
          </>
        ) : null}

        {tab === 'cancellation' ? CANCELLATION_POLICIES.map((item) => (
          <button
            key={item.id}
            type="button"
            className="mh2-card"
            data-on={draft.cancellationPolicy === item.id ? 'true' : 'false'}
            aria-pressed={draft.cancellationPolicy === item.id}
            onClick={() => setDraft((state) => ({ ...state, cancellationPolicy: item.id }))}
            data-testid={`host-settings-policy-${item.id}`}
          >
            <label>Politique</label>
            <div className="val sm">{item.label}</div>
            <div className="hint">{item.detail}</div>
          </button>
        )) : null}

        {error ? <p className="mh2-note" role="alert" style={{ color: '#c1121f' }}>{error}</p> : null}
      </div>

      <div className="mh2-foot">
        <button type="button" className="mh2-save" onClick={save} data-testid="host-settings-save">
          Enregistrer les modifications
        </button>
      </div>
    </div>
  )
}
