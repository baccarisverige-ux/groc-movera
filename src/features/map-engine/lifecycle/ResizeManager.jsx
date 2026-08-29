import { useLayoutEffect } from 'react'

export function ResizeManager({ targetRef, onSize }) {
  useLayoutEffect(() => {
    const node = targetRef.current
    if (!node) return undefined

    let frame = 0
    const measure = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const rect = node.getBoundingClientRect()
        onSize({ width: Math.max(1, Math.round(rect.width)), height: Math.max(1, Math.round(rect.height)) })
      })
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    window.addEventListener('resize', measure, { passive: true })
    window.addEventListener('orientationchange', measure, { passive: true })

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('resize', measure)
      window.removeEventListener('orientationchange', measure)
    }
  }, [targetRef, onSize])

  return null
}
