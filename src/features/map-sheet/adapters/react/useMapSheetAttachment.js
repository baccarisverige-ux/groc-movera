import { useEffect, useState } from 'react'
import { MAP_SHEET_EXPANDED_PROGRESS_THRESHOLD } from '../../core/MapSheetState.js'

export const MAP_SHEET_ATTACHED_EXIT_PROGRESS = 0.92

export function nextMapSheetAttached(currentAttached, progress) {
  return currentAttached
    ? progress > MAP_SHEET_ATTACHED_EXIT_PROGRESS
    : progress >= MAP_SHEET_EXPANDED_PROGRESS_THRESHOLD
}

export function useMapSheetAttachment(progress) {
  const [attached, setAttached] = useState(
    () => progress >= MAP_SHEET_EXPANDED_PROGRESS_THRESHOLD,
  )

  useEffect(() => {
    setAttached((current) => nextMapSheetAttached(current, progress))
  }, [progress])

  return attached
}
