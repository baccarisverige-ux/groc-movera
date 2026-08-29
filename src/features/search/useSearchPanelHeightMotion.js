import { useEffect, useRef, useState } from 'react'
import { animate } from '../../shared/motion/runtime.js'

export function useSearchPanelHeightMotion({ active, open, ready, targetHeight, fallbackHeight }) {
  const [height, setHeight] = useState(fallbackHeight)
  const currentRef = useRef(fallbackHeight)
  const wasActiveRef = useRef(false)

  useEffect(() => {
    if (active && !wasActiveRef.current) {
      currentRef.current = fallbackHeight
      setHeight(fallbackHeight)
    }
    if (!active) {
      currentRef.current = fallbackHeight
      setHeight(fallbackHeight)
    }
    wasActiveRef.current = active
  }, [active, fallbackHeight])

  useEffect(() => {
    if (!active || !open || !ready || !targetHeight) return undefined

    const target = Math.round(targetHeight)
    const start = Number(currentRef.current || fallbackHeight)
    if (Math.abs(target - start) < 1) {
      currentRef.current = target
      setHeight(target)
      return undefined
    }

    const controls = animate(start, target, {
      duration: 0.34,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (value) => {
        currentRef.current = value
        setHeight(Math.round(value))
      },
      onComplete: () => {
        currentRef.current = target
        setHeight(target)
      },
    })

    return () => controls.stop()
  }, [active, open, ready, targetHeight, fallbackHeight])

  return Math.round(height || fallbackHeight)
}
