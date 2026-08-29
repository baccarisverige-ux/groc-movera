function IconBase({ children, size = 18, strokeWidth = 1.8, className = '', ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  )
}

export function ArrowLeftIcon(props) {
  return <IconBase {...props}><path d="m15 18-6-6 6-6" /></IconBase>
}

export function SlidersHorizontalIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M4 7h8" />
      <path d="M16 7h4" />
      <circle cx="14" cy="7" r="2" />
      <path d="M4 17h4" />
      <path d="M12 17h8" />
      <circle cx="10" cy="17" r="2" />
    </IconBase>
  )
}

export function WifiIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M5 12.6a10.7 10.7 0 0 1 14 0" />
      <path d="M8.5 16.1a5.8 5.8 0 0 1 7 0" />
      <path d="M12 20h.01" />
    </IconBase>
  )
}

export function WavesIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M3 8.5c1.6 0 1.6 1 3.2 1s1.6-1 3.2-1 1.6 1 3.2 1 1.6-1 3.2-1 1.6 1 3.2 1" />
      <path d="M3 13c1.6 0 1.6 1 3.2 1s1.6-1 3.2-1 1.6 1 3.2 1 1.6-1 3.2-1 1.6 1 3.2 1" />
      <path d="M3 17.5c1.6 0 1.6 1 3.2 1s1.6-1 3.2-1 1.6 1 3.2 1 1.6-1 3.2-1 1.6 1 3.2 1" />
    </IconBase>
  )
}

export function ParkingIcon(props) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 17V7.5H13a3 3 0 0 1 0 6H9.5" />
    </IconBase>
  )
}

export function SnowflakeIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M12 2v20" />
      <path d="m5.6 5.6 12.8 12.8" />
      <path d="m18.4 5.6-12.8 12.8" />
      <path d="m8.5 3.8 3.5 2 3.5-2" />
      <path d="m8.5 20.2 3.5-2 3.5 2" />
    </IconBase>
  )
}

export function PawPrintIcon(props) {
  return (
    <IconBase {...props}>
      <circle cx="7.2" cy="8" r="1.7" />
      <circle cx="16.8" cy="8" r="1.7" />
      <circle cx="9.8" cy="5.3" r="1.5" />
      <circle cx="14.2" cy="5.3" r="1.5" />
      <path d="M7.8 16.3c0-2.4 1.9-4.3 4.2-4.3s4.2 1.9 4.2 4.3c0 1.7-1.3 3-3 3h-2.4c-1.7 0-3-1.3-3-3Z" />
    </IconBase>
  )
}
