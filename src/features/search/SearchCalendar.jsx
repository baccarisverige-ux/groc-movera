import { useMemo, useState } from 'react'

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

function toIso(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseIso(value) {
  if (!value) return null
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day, 12)
}

function buildMonth(cursor) {
  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const first = new Date(year, month, 1, 12)
  const offset = (first.getDay() + 6) % 7
  const days = new Date(year, month + 1, 0).getDate()
  return Array.from({ length: 42 }, (_, index) => {
    const day = index - offset + 1
    if (day < 1 || day > days) return null
    const date = new Date(year, month, day, 12)
    return { day, iso: toIso(date), date }
  })
}

export function SearchCalendar({ checkin, checkout, minDate, onChange }) {
  const initial = parseIso(checkin) || parseIso(minDate) || new Date()
  const [cursor, setCursor] = useState(() => new Date(initial.getFullYear(), initial.getMonth(), 1, 12))
  const days = useMemo(() => buildMonth(cursor), [cursor])
  const min = parseIso(minDate)
  const start = parseIso(checkin)
  const end = parseIso(checkout)

  const choose = (item) => {
    if (!item) return
    if (min && item.date < min) return
    if (!start || end) {
      onChange({ checkin: item.iso, checkout: '' })
      return
    }
    if (item.date <= start) {
      onChange({ checkin: item.iso, checkout: '' })
      return
    }
    onChange({ checkin, checkout: item.iso })
  }

  const previousMonth = () => {
    const previous = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1, 12)
    const floor = new Date((min || new Date()).getFullYear(), (min || new Date()).getMonth(), 1, 12)
    if (previous < floor) return
    setCursor(previous)
  }

  const nextMonth = () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1, 12))

  return (
    <div className="movera-st__calendar" data-testid="search-calendar">
      <div className="movera-st__calendar-head">
        <button type="button" aria-label="Mois précédent" onClick={previousMonth}>‹</button>
        <strong>{MONTHS[cursor.getMonth()]} {cursor.getFullYear()}</strong>
        <button type="button" aria-label="Mois suivant" onClick={nextMonth}>›</button>
      </div>
      <div className="movera-st__weekdays">{WEEKDAYS.map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div>
      <div className="movera-st__calendar-grid">
        {days.map((item, index) => {
          if (!item) return <span className="movera-st__day movera-st__day--empty" key={`empty-${index}`} />
          const disabled = Boolean(min && item.date < min)
          const selectedStart = item.iso === checkin
          const selectedEnd = item.iso === checkout
          const inRange = Boolean(start && end && item.date > start && item.date < end)
          return (
            <button
              type="button"
              key={item.iso}
              className="movera-st__day"
              data-date={item.iso}
              data-start={selectedStart}
              data-end={selectedEnd}
              data-range={inRange}
              disabled={disabled}
              onClick={() => choose(item)}
              aria-label={`${item.day} ${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`}
            >{item.day}</button>
          )
        })}
      </div>
    </div>
  )
}
