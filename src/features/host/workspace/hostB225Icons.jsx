/* The b225 host icon set, path data copied from the reference file.
 *
 * These are deliberately not "equivalent" icons: the bookmark-shaped Today
 * mark, the four-square Annonces grid and the speech bubble with the tail on
 * the left are what the reference draws, and swapping in lookalikes is how a
 * port stops looking like the thing it ports. Every icon is a bare 24x24
 * stroke path; colour, width and join come from CSS so one rule restyles all
 * of them at once. */

function Svg({ children, ...rest }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" {...rest}>{children}</svg>
}

export function TodayIcon(props) {
  return <Svg {...props}><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></Svg>
}

export function CalendarIcon(props) {
  return <Svg {...props}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></Svg>
}

export function ListingsIcon(props) {
  return (
    <Svg {...props}>
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
    </Svg>
  )
}

export function MessagesIcon(props) {
  return <Svg {...props}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></Svg>
}

export function MenuIcon(props) {
  return <Svg {...props}><path d="M3 12h18M3 6h18M3 18h18" /></Svg>
}

export function BellIcon(props) {
  return <Svg {...props}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></Svg>
}

export function SearchIcon(props) {
  return <Svg {...props}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></Svg>
}

export function PlusIcon(props) {
  return <Svg {...props}><path d="M12 5v14M5 12h14" /></Svg>
}

export function GridIcon(props) {
  return (
    <Svg {...props}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
    </Svg>
  )
}

export function ClockIcon(props) {
  return <Svg {...props}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Svg>
}

export function GearIcon(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </Svg>
  )
}

export function UserIcon(props) {
  return <Svg {...props}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></Svg>
}

export function ShieldIcon(props) {
  return <Svg {...props}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></Svg>
}

export function BookIcon(props) {
  return <Svg {...props}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></Svg>
}

export function HelpIcon(props) {
  return <Svg {...props}><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" x2="12.01" y1="17" y2="17" /></Svg>
}

export function MoneyIcon(props) {
  return <Svg {...props}><line x1="12" x2="12" y1="1" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></Svg>
}

export function ChartIcon(props) {
  return <Svg {...props}><path d="M3 3v18h18" /><path d="M7 14l4-4 4 4 5-6" /></Svg>
}

export function ChevronIcon(props) {
  return <Svg className="chev" {...props}><path d="M9 18l6-6-6-6" /></Svg>
}

export function BackIcon(props) {
  return <Svg {...props}><path d="M19 12H5M12 19l-7-7 7-7" /></Svg>
}
