import { useLayoutEffect, useRef, useState } from 'react'

function terminalSelector(step, addressMode) {
  if (addressMode) return '.movera-st__address-suggestions, .movera-st__address-empty'
  if (step === 'dates') return '.movera-st__screen--dates .movera-st__action'
  if (step === 'guests') return '.movera-st__screen--guests .movera-st__action--search'
  return '.movera-st__screen--destination .movera-st__destinations'
}

function bottomWithinRoot(element, root) {
  if (!element || !root) return null

  let bottom = element.offsetTop + element.offsetHeight
  let parent = element.offsetParent
  while (parent && parent !== root) {
    bottom += parent.offsetTop
    parent = parent.offsetParent
  }

  if (parent === root) return bottom

  const rootRect = root.getBoundingClientRect()
  const elementRect = element.getBoundingClientRect()
  if (!rootRect.height || !elementRect.height) return null
  return Math.max(0, elementRect.bottom - rootRect.top)
}

export function useSearchPanelFit({ active, step, addressMode, lockedViewportHeight }) {
  const contentRef = useRef(null)
  const [panelHeight, setPanelHeight] = useState(null)

  useLayoutEffect(() => {
    if (!active || !contentRef.current) return undefined

    const content = contentRef.current
    const visualViewport = window.visualViewport
    let frame = 0
    let settleTimer = 0

    const measure = () => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => {
        const terminal = content.querySelector(terminalSelector(step, addressMode))
        const paddingBottom = Number.parseFloat(window.getComputedStyle(content).paddingBottom) || 0
        const terminalBottom = bottomWithinRoot(terminal, content)
        const naturalHeight = Math.ceil((terminalBottom ?? content.scrollHeight) + paddingBottom + 2)
        const liveViewportHeight = Math.round(visualViewport?.height || window.innerHeight || lockedViewportHeight)
        const maxHeight = Math.max(120, liveViewportHeight - 12)
        const nextHeight = Math.min(maxHeight, Math.max(120, naturalHeight))
        setPanelHeight((current) => (current === nextHeight ? current : nextHeight))
      })
    }

    const observer = new ResizeObserver(measure)
    observer.observe(content)
    const initialTerminal = content.querySelector(terminalSelector(step, addressMode))
    if (initialTerminal) observer.observe(initialTerminal)

    measure()
    settleTimer = window.setTimeout(measure, 380)
    window.addEventListener('resize', measure, { passive: true })
    visualViewport?.addEventListener('resize', measure, { passive: true })

    return () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(settleTimer)
      observer.disconnect()
      window.removeEventListener('resize', measure)
      visualViewport?.removeEventListener('resize', measure)
    }
  }, [active, step, addressMode, lockedViewportHeight])

  return { contentRef, panelHeight }
}
