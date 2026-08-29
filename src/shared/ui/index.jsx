import './ui.css'

export function Button({ children, loading = false, disabled = false, ...props }) {
  return <button className="ui-button" disabled={disabled || loading} aria-busy={loading || undefined} {...props}>{loading ? 'Chargement…' : children}</button>
}

export function IconButton({ label, children, ...props }) {
  return <button className="ui-icon-button" aria-label={label} {...props}>{children}</button>
}

export function Card({ children, className = '', ...props }) {
  return <div className={`ui-card ${className}`.trim()} {...props}>{children}</div>
}

export function Badge({ children, ...props }) { return <span className="ui-badge" {...props}>{children}</span> }
export function PriceBadge({ children, ...props }) { return <span className="ui-price-badge" {...props}>{children}</span> }

export function Avatar({ src, alt = '', ...props }) {
  return src ? <img className="ui-avatar" src={src} alt={alt} {...props} /> : <div className="ui-avatar" role="img" aria-label={alt || 'Avatar'} {...props} />
}

function Overlay({ children, onClose }) {
  return <div className="ui-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose?.() }}>{children}</div>
}

export function Modal({ open, onClose, children, label = 'Dialogue' }) {
  if (!open) return null
  return <Overlay onClose={onClose}><section className="ui-modal" role="dialog" aria-modal="true" aria-label={label}>{children}</section></Overlay>
}

export function BottomSheet({ open, onClose, children, label = 'Panneau' }) {
  if (!open) return null
  return <Overlay onClose={onClose}><section className="ui-sheet" role="dialog" aria-modal="true" aria-label={label}>{children}</section></Overlay>
}

export function Drawer({ open, onClose, children, label = 'Menu' }) {
  if (!open) return null
  return <Overlay onClose={onClose}><aside className="ui-drawer" role="dialog" aria-modal="true" aria-label={label}>{children}</aside></Overlay>
}

export function Toast({ children, role = 'status' }) { return <div className="ui-toast" role={role}>{children}</div> }
export function Loader({ label = 'Chargement' }) { return <div className="ui-loader" role="status" aria-label={label} /> }
export function Skeleton({ width = '100%', height = 16, ...props }) { return <div className="ui-skeleton" aria-hidden="true" style={{ width, height }} {...props} /> }
export function EmptyState({ children = 'Aucun résultat.' }) { return <div className="ui-state" role="status">{children}</div> }
export function ErrorState({ children = 'Une erreur est survenue.' }) { return <div className="ui-state" role="alert">{children}</div> }
export function SearchInput(props) { return <input className="ui-search-input" type="search" {...props} /> }
