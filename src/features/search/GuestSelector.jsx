const rows = [
  { key: 'adults', label: 'Adultes', hint: '13 ans et plus', min: 1, max: 16 },
  { key: 'children', label: 'Enfants', hint: 'De 2 à 12 ans', min: 0, max: 10 },
  { key: 'infants', label: 'Bébés', hint: 'Moins de 2 ans', min: 0, max: 5 },
  { key: 'pets', label: 'Animaux', hint: 'Animaux de compagnie', min: 0, max: 5 },
]

export function GuestSelector({ state, onChange }) {
  const update = (key, delta, min, max) => {
    const current = Number(state[key]) || 0
    onChange({ ...state, [key]: Math.min(max, Math.max(min, current + delta)) })
  }

  return (
    <div className="movera-st__guest-list" data-testid="search-guest-list">
      {rows.map((row) => {
        const value = Number(state[row.key]) || 0
        return (
          <div className="movera-st__guest-row" key={row.key}>
            <div className="movera-st__guest-copy"><strong>{row.label}</strong><span>{row.hint}</span></div>
            <div className="movera-st__counter">
              <button type="button" aria-label={`Retirer ${row.label.toLowerCase()}`} disabled={value <= row.min} onClick={() => update(row.key, -1, row.min, row.max)}>−</button>
              <strong data-testid={`search-${row.key}-count`}>{value}</strong>
              <button type="button" aria-label={`Ajouter ${row.label.toLowerCase()}`} disabled={value >= row.max} onClick={() => update(row.key, 1, row.min, row.max)}>+</button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
