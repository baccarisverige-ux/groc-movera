import { SnapSheetMotionSurface } from '../../../shared/motion/SnapSheetMotionSurface.jsx'
import { MAP_OFFER_SHEET_MOTION } from './mapOfferSheetMotion.config.js'

export function MapOfferSheetMotionSurface({
  className,
  ariaLabel,
  children,
  collapsedVisiblePx,
  onProgressChange,
}) {
  return (
    <SnapSheetMotionSurface
      {...MAP_OFFER_SHEET_MOTION}
      className={className}
      ariaLabel={ariaLabel}
      collapsedVisiblePx={collapsedVisiblePx ?? MAP_OFFER_SHEET_MOTION.collapsedVisiblePx}
      onProgressChange={onProgressChange}
      testId="map-offer-sheet"
    >
      {children}
    </SnapSheetMotionSurface>
  )
}
