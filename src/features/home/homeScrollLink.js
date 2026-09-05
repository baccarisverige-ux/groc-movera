let moveraScrollRaf = 0
let moveraResizeObserver = null
let moveraObservedHeader = null
let moveraObservedShell = null
let moveraObservedWelcome = null
let moveraHeaderHeight = 0
let moveraShellHeight = 0
let moveraDisplayedTravel = 0
let moveraLastFrameTime = 0
const MOVERA_DOCK_FOLLOW_MS = 92

function getHomeElements() {
  return {
    header: document.querySelector('.b225-home-header'),
    shell: document.querySelector('.b225-categories-shell'),
    rail: document.querySelector('.b225-categories'),
    welcome: document.querySelector('.b225-welcome'),
  }
}

function visualViewportOffsetTop() {
  const offsetTop = Number(window.visualViewport?.offsetTop)
  return Number.isFinite(offsetTop) ? Math.max(0, offsetTop) : 0
}

function observeHomeGeometry(header, shell, welcome) {
  if (
    moveraObservedHeader === header
    && moveraObservedShell === shell
    && moveraObservedWelcome === welcome
  ) return

  moveraResizeObserver?.disconnect()
  moveraResizeObserver = null
  moveraObservedHeader = header
  moveraObservedShell = shell
  moveraObservedWelcome = welcome
  moveraDisplayedTravel = 0
  moveraLastFrameTime = 0
  document.documentElement.style.setProperty('--movera-category-upward-travel', '0px')

  if ('ResizeObserver' in window) {
    moveraResizeObserver = new ResizeObserver(() => {
      measureHomeGeometry()
      requestCategorySync()
    })
    moveraResizeObserver.observe(header)
    moveraResizeObserver.observe(shell)
    moveraResizeObserver.observe(welcome)
  }
}

function measureHomeGeometry() {
  const { header, shell, rail, welcome } = getHomeElements()
  if (!header || !shell || !rail || !welcome) return false

  observeHomeGeometry(header, shell, welcome)
  moveraHeaderHeight = header.getBoundingClientRect().height
  moveraShellHeight = shell.getBoundingClientRect().height

  document.documentElement.style.setProperty('--movera-home-header-height', `${moveraHeaderHeight}px`)
  shell.classList.add('movera-categories-linked')
  rail.classList.add('movera-categories-linked')
  return true
}

function syncCategoryPosition(timestamp = performance.now()) {
  moveraScrollRaf = 0
  const { header, shell, rail, welcome } = getHomeElements()
  if (!header || !shell || !rail || !welcome) return false
  if ((!moveraHeaderHeight || !moveraShellHeight) && !measureHomeGeometry()) return false

  // Mobile WebKit can leave the visual viewport panned after an input is
  // dismissed while window.scrollY is already restored. Client rects then
  // carry that visual-viewport offset, which would otherwise pull the sticky
  // category rail farther under the Home header. Normalize back to layout-
  // viewport coordinates before deriving the dock travel.
  const welcomeBottom = welcome.getBoundingClientRect().bottom + visualViewportOffsetTop()
  const dockBottom = moveraHeaderHeight + moveraShellHeight
  const targetTravel = Math.min(
    moveraShellHeight,
    Math.max(0, dockBottom - welcomeBottom),
  )

  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  if (reducedMotion) {
    moveraDisplayedTravel = targetTravel
  } else {
    const elapsed = moveraLastFrameTime ? Math.min(34, Math.max(1, timestamp - moveraLastFrameTime)) : 16.67
    const follow = 1 - Math.exp(-elapsed / MOVERA_DOCK_FOLLOW_MS)
    moveraDisplayedTravel += (targetTravel - moveraDisplayedTravel) * follow
    if (Math.abs(targetTravel - moveraDisplayedTravel) < 0.06) moveraDisplayedTravel = targetTravel
  }
  moveraLastFrameTime = timestamp

  document.documentElement.style.setProperty('--movera-category-upward-travel', `${moveraDisplayedTravel}px`)
  const moving = moveraDisplayedTravel > 0.5
  const hiddenUnderSearch = moveraDisplayedTravel >= moveraShellHeight - 0.5
  shell.classList.toggle('movera-categories-moving-under-header', moving)
  rail.classList.toggle('movera-categories-moving-under-header', moving)
  shell.classList.toggle('movera-categories-under-search', hiddenUnderSearch)
  rail.classList.toggle('movera-categories-under-search', hiddenUnderSearch)

  if (Math.abs(targetTravel - moveraDisplayedTravel) >= 0.06) requestCategorySync()
  return true
}

function requestCategorySync() {
  if (moveraScrollRaf) return
  moveraScrollRaf = requestAnimationFrame(syncCategoryPosition)
}

function refreshCategoryLink() {
  moveraLastFrameTime = 0
  if (measureHomeGeometry()) requestCategorySync()
}

window.addEventListener('scroll', requestCategorySync, { passive: true })
window.addEventListener('resize', refreshCategoryLink, { passive: true })
window.visualViewport?.addEventListener('resize', refreshCategoryLink, { passive: true })
window.visualViewport?.addEventListener('scroll', refreshCategoryLink, { passive: true })
window.addEventListener('popstate', refreshCategoryLink)
window.addEventListener('movera-search-restored', refreshCategoryLink)

const root = document.getElementById('root') || document.documentElement
const homeMountObserver = new MutationObserver((mutations) => {
  if (!mutations.some((mutation) => mutation.type === 'childList')) return
  requestAnimationFrame(refreshCategoryLink)
})
homeMountObserver.observe(root, { childList: true, subtree: true })

refreshCategoryLink()
