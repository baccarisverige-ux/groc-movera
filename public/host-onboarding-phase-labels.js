(() => {
  const LABEL_BY_SCREEN = Object.freeze({
    'intro-place': '1',
    'property-type': '1.1',
    'guest-access': '1.2',
    address: '1.3',
    pin: '1.4',
    basics: '1.5',

    'intro-presentation': '2',
    amenities: '2.1',
    photos: '2.2',

    title: '3',
    highlights: '3.1',
    description: '3.2',
    safety: '3.3',
    'intro-publish': '3.4',
    booking: '3.5',
    price: '3.6',
    promotions: '3.7',

    review: '4',
  })

  function applyStageLabel() {
    const onboarding = document.querySelector('.host-onboarding[data-screen]')
    if (!onboarding) return

    const screen = onboarding.dataset.screen || ''
    const label = LABEL_BY_SCREEN[screen] || '1'
    const eyebrow = onboarding.querySelector('.host-onboarding__eyebrow')

    if (eyebrow && eyebrow.textContent !== `Étape ${label}`) {
      eyebrow.textContent = `Étape ${label}`
    }
  }

  const observer = new MutationObserver(applyStageLabel)
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['data-screen'],
  })

  applyStageLabel()
})()
