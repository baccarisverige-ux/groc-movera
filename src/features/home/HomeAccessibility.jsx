import { useEffect } from 'react'

const HOME_ACCESSIBLE_NAMES = {
  homeSearchBtn: 'Rechercher une destination',
  homeMapBtn: 'Explorer la carte',
}

export function HomeAccessibility() {
  useEffect(() => {
    const applyAccessibilityFixes = () => {
      for (const [id, label] of Object.entries(HOME_ACCESSIBLE_NAMES)) {
        const element = document.getElementById(id)
        if (element && element.getAttribute('aria-label') !== label) {
          element.setAttribute('aria-label', label)
        }
      }

      const featuredScroll = document.querySelector('.b225-featured-scroll')
      if (featuredScroll) {
        if (featuredScroll.tabIndex !== 0) featuredScroll.tabIndex = 0
        if (!featuredScroll.getAttribute('aria-label')) {
          featuredScroll.setAttribute('aria-label', "Sélection d'Exception")
        }
      }
    }

    applyAccessibilityFixes()
    const observer = new MutationObserver(applyAccessibilityFixes)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])

  return null
}
