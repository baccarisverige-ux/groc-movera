/* The settings page, as data.
 *
 * b225 puts every editable value behind the same two-step gesture: a card
 * shows it, a second page edits it. Both screens need to agree on the value's
 * label, its unit, and -- the part that actually breaks -- which branch of the
 * draft it lives in. A price minimum is in draft.pricing, a cleaning fee is in
 * draft.fees, a preparation delay is in draft.stayRules, and the edit page has
 * no way to know which unless something tells it.
 *
 * Pure module: no React, no storage. */

export const SETTINGS_FIELDS = Object.freeze({
  min: { label: 'Prix minimum', unit: 'tnd', group: 'pricing', hint: 'Plancher pour une nuit du calendrier' },
  max: { label: 'Prix maximum', unit: 'tnd', group: 'pricing', hint: 'Plafond pour une nuit du calendrier' },
  cleaning: { label: 'Ménage / séjour', unit: 'tnd', group: 'fees', hint: '' },
  pet: { label: 'Animal / séjour', unit: 'tnd', group: 'fees', hint: '' },
  extraGuest: { label: 'Voyageur extra / nuit', unit: 'tnd', group: 'fees', hint: '' },
  extraGuestAfter: { label: 'À partir du voyageur n°', unit: 'count', group: 'fees', hint: 'Le supplément ne s’applique qu’au-delà' },
  minNights: { label: 'Nuits minimum', unit: 'count', group: 'stayRules', hint: '' },
  maxNights: { label: 'Nuits maximum', unit: 'count', group: 'stayRules', hint: '' },
  advanceNoticeDays: { label: 'Préavis d’arrivée', unit: 'days', group: 'stayRules', hint: 'Délai entre la réservation et l’arrivée' },
  preparationDays: { label: 'Temps de préparation', unit: 'days', group: 'stayRules', hint: 'Nuits bloquées après un départ' },
})

export function settingsField(id) {
  return SETTINGS_FIELDS[id] || null
}

export function unitSuffix(unit, currency = 'TND') {
  if (unit === 'tnd') return currency
  if (unit === 'days') return 'jour(s)'
  return ''
}

export function formatSettingValue(value, unit, currency = 'TND') {
  const number = Math.round(Number(value) || 0)
  if (unit === 'tnd') return `${number} ${currency}`
  if (unit === 'days') return `${number} jour${number > 1 ? 's' : ''}`
  return String(number)
}

export function readSettingField(draft, id) {
  const field = SETTINGS_FIELDS[id]
  if (!field || !draft) return 0
  return Number(draft[field.group]?.[id]) || 0
}

/* Writes are clamped at the point of writing, not at save time. A maximum
   below its minimum is not a preference a host can hold -- it is a window no
   stay and no price can fall into -- and letting it sit in the draft until
   save means the card shows a number the store will silently replace. */
export function writeSettingField(draft, id, rawValue) {
  const field = SETTINGS_FIELDS[id]
  if (!field) return draft
  const value = Math.max(0, Math.round(Number(rawValue) || 0))
  const group = { ...draft[field.group], [id]: value }

  if (field.group === 'stayRules') {
    if (id === 'minNights') {
      group.minNights = Math.max(1, value)
      group.maxNights = Math.max(group.minNights, Number(group.maxNights) || group.minNights)
    }
    if (id === 'maxNights') {
      group.maxNights = Math.max(Number(group.minNights) || 1, value)
    }
  }

  if (field.group === 'pricing') {
    if (id === 'min') group.min = Math.max(1, value)
    if (id === 'max') group.max = Math.max(1, value)
  }

  if (id === 'extraGuestAfter') group.extraGuestAfter = Math.max(1, value)

  return { ...draft, [field.group]: group }
}
