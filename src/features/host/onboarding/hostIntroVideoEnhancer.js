import './host-intro-premium.css'
import './hostRoomTypesOnboardingEnhancer.js'
import './hostRoomContinueGuard.js'
import './hostRoomProfessionalFlow.js'

const INTRO_SELECTOR = '.host-onboarding[data-screen="intro-place"] .host-onboarding__phase-visual'
const PRESENTATION_SELECTOR = '.host-onboarding[data-screen="intro-presentation"] .host-onboarding__phase-visual'
const PUBLISH_SELECTOR = '.host-onboarding[data-screen="intro-publish"] .host-onboarding__phase-visual'
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'
const BASE_URL = import.meta.env.BASE_URL
const HOST_INTRO_VIDEO_SRC = `${BASE_URL}assets/host-intro.mp4?v=movera-host5`
const STEP_TWO_VIDEO_SOURCES = [
  `${BASE_URL}up.mp4`,
  `${BASE_URL}assets/up.mp4`,
  `${BASE_URL}assets/bootstrap/up.mp4`,
]
const STEP_THREE_VIDEO_SRC = `${BASE_URL}assets/host-publish.mp4?v=movera-host8`

function configureVideo(video) {
  video.muted = true
  video.defaultMuted = true
  video.loop = false
  video.playsInline = true
  video.preload = 'auto'
  video.setAttribute('muted', '')
  video.setAttribute('playsinline', '')
  video.setAttribute('webkit-playsinline', '')
  video.setAttribute('aria-hidden', 'true')
  video.tabIndex = -1

  if (!window.matchMedia?.(REDUCED_MOTION_QUERY).matches) {
    video.autoplay = true
    video.addEventListener('canplay', () => {
      const playPromise = video.play()
      if (playPromise?.catch) playPromise.catch(() => {})
    }, { once: true })
  }

  return video
}

function createIntroVideo() {
  const video = configureVideo(document.createElement('video'))
  video.className = 'host-onboarding__intro-video'
  video.src = HOST_INTRO_VIDEO_SRC
  return video
}

function createStepTwoVideo(container) {
  const video = configureVideo(document.createElement('video'))
  video.className = 'host-onboarding__step-two-video'

  let sourceIndex = 0
  const tryNextSource = () => {
    if (sourceIndex >= STEP_TWO_VIDEO_SOURCES.length) {
      video.remove()
      container.classList.remove('host-onboarding__phase-visual--step-two-video')
      return
    }

    video.src = STEP_TWO_VIDEO_SOURCES[sourceIndex]
    sourceIndex += 1
    video.load()
  }

  video.addEventListener('loadeddata', () => {
    container.classList.add('host-onboarding__phase-visual--step-two-video')
  }, { once: true })
  video.addEventListener('error', tryNextSource)
  tryNextSource()

  return video
}

function createStepThreeVideo() {
  const video = configureVideo(document.createElement('video'))
  video.className = 'host-onboarding__step-three-video'
  video.src = STEP_THREE_VIDEO_SRC
  return video
}

function enhanceHostIntro() {
  const intro = document.querySelector(INTRO_SELECTOR)
  if (intro && !intro.querySelector('.host-onboarding__intro-video')) {
    intro.classList.add('host-onboarding__phase-visual--video')
    intro.append(createIntroVideo())
  }

  const presentation = document.querySelector(PRESENTATION_SELECTOR)
  if (presentation && !presentation.querySelector('.host-onboarding__step-two-video')) {
    presentation.append(createStepTwoVideo(presentation))
  }

  const publish = document.querySelector(PUBLISH_SELECTOR)
  if (publish && !publish.querySelector('.host-onboarding__step-three-video')) {
    publish.classList.add('host-onboarding__phase-visual--step-three-video')
    publish.append(createStepThreeVideo())
  }
}

const observer = new MutationObserver(enhanceHostIntro)
observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['data-screen'],
})

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', enhanceHostIntro, { once: true })
} else {
  enhanceHostIntro()
}

requestAnimationFrame(enhanceHostIntro)
