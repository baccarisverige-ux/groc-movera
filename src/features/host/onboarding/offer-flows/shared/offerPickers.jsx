import { ParkingIcon, SnowflakeIcon, WavesIcon, WifiIcon } from '../../../../../shared/icons/AppIcons.jsx'

/* The amenity and highlight pickers, rendered from one place.

   These screens exist twice in a host's life: once in the procedure, when
   they are creating the listing, and again in the editor, when they come back
   to change it. They were written twice, and the second copy had no icons, no
   detail lines, no group symbols and a generic heading where the first had
   the category's own words -- so "Quels équipements propose votre villa ?"
   with colour icons became "Équipements" with bare labels the moment you
   tapped the same thing from the editor.

   One component now, used by both. The flow supplies the catalogue, the copy
   and the icons; the caller supplies only the selection and what to do when
   it changes. There is no second copy left to drift. */

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

export function AmenityGlyph({ id }) {
  if (id === 'wifi') return <WifiIcon size={25} />
  if (id === 'parking') return <ParkingIcon size={25} />
  if (id === 'pool' || id === 'waterfront' || id === 'beach-access') return <WavesIcon size={25} />
  if (id === 'ac') return <SnowflakeIcon size={25} />
  return <SimpleAmenityIcon kind={id} />
}

function CheckIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.2 4.2L19 7" /></svg>
}

export function AmenityPicker({ flow, selected, onToggle }) {
  const { AmenityIcon, amenitySymbols } = flow.presentation
  return (
    <div className="host-onboarding__amenity-groups">
      {flow.amenityGroups.map((group) => {
        const items = flow.amenities.filter((item) => item.group === group.id)
        if (!items.length) return null
        return (
          <section className="host-onboarding__amenity-section" data-group={group.id} key={group.id}>
            <h2 data-group-symbol={amenitySymbols[group.id] || undefined}>{group.label}</h2>
            <div className="host-onboarding__amenity-grid">
              {items.map((item) => {
                const active = selected.includes(item.id)
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={active}
                    data-active={active ? 'true' : 'false'}
                    data-group-symbol={amenitySymbols[group.id] || undefined}
                    onClick={() => onToggle(item.id)}
                  >
                    {AmenityIcon ? <AmenityIcon id={item.id} fallback={<AmenityGlyph id={item.id} />} /> : <AmenityGlyph id={item.id} />}
                    <span className="host-onboarding__amenity-copy"><strong>{item.label}</strong>{item.detail ? <small>{item.detail}</small> : null}</span>
                    {active ? <span className="host-onboarding__choice-check"><CheckIcon /></span> : null}
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

export function HighlightPicker({ flow, selected, onToggle }) {
  const { HighlightIcon } = flow.presentation
  return (
    <div className="host-offer-grouped-highlights">
      <div className="host-offer-grouped-highlights__summary">
        <strong>{flow.copy.highlightsSummaryTitle}</strong>
        <span>{flow.copy.highlightsSummaryText}</span>
        <b>{selected.length} sélectionné{selected.length > 1 ? 's' : ''}</b>
      </div>
      {flow.highlightGroups.map((group) => {
        const items = flow.highlights.filter((item) => item.group === group.id)
        if (!items.length) return null
        return (
          <section className="host-offer-grouped-highlights__group" data-group={group.id} key={group.id}>
            <div className="host-offer-grouped-highlights__group-head"><h2>{group.title}</h2><p>{group.text}</p></div>
            <div className="host-offer-grouped-highlights__grid">
              {items.map((item) => {
                const active = selected.includes(item.id)
                return (
                  <button
                    className="host-offer-grouped-highlight"
                    key={item.id}
                    type="button"
                    aria-pressed={active}
                    data-active={active ? 'true' : 'false'}
                    data-tone={item.tone}
                    onClick={() => onToggle(item.id)}
                  >
                    <span className="host-offer-grouped-highlight__icon">{HighlightIcon ? <HighlightIcon id={item.id} /> : null}</span>
                    <span className="host-offer-grouped-highlight__copy"><strong>{item.label}</strong>{item.detail ? <small>{item.detail}</small> : null}</span>
                    <span className="host-offer-grouped-highlight__check">✓</span>
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

/* Who the traveller books, as the category describes it.

   A hôtel and a maison d'hôte declare roomAccessPresentation -- their own
   wording, icons and a recommended badge -- while a villa and an appartement
   use the plain three-way choice. The editor was showing the plain list to
   every category, so a hotelier who read "Chambre entière · Le voyageur
   réserve une chambre complète" during the procedure came back to a bare
   "Chambre privée". Same source for both now. */
export function guestAccessOptions(flow) {
  const presentation = flow.roomAccessPresentation
  if (presentation?.options?.length) {
    return presentation.options.map((option) => ({
      id: option.id,
      label: option.label,
      description: option.description,
      badge: option.badge || '',
      icon: option.icon || '',
    }))
  }
  return flow.guestAccess.map((option) => ({
    id: option.id,
    label: option.label,
    description: option.description,
    badge: '',
    icon: '',
  }))
}
