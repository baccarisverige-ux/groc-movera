let moveraScrollRaf = 0
let moveraResizeObserver = null
let moveraObservedHeader = null
let moveraObservedShell = null
let moveraObservedWelcome = null
let moveraHeaderHeight = 0
let moveraShellHeight = 0
let moveraDisplayedTravel = 0
let moveraLastFrameTime = 0
let moveraSearchRestorePending = false
let moveraSearchRestoreGeneration = 0
const MOVERA_DOCK_FOLLOW_MS = 92

function getHomeElements() {
  return {
    header: document.querySelector('.b225-home-header'),
    shell: document.querySelector('.b225-categories-shell'),
    rail: document.querySelector('.b225-categories'),
    welcome: document.querySelector('.b225-welcome'),
  }
}

function isSearchLocked() {
  return document.documentElement.dataset.moveraSearchLock === 'true'
    || document.body.dataset.moveraSearchLock === 'true'
}

function isCategorySyncSuspended() {
  return isSearchLocked() || moveraSearchRestorePending
}

function layoutDocumentTop(element) {
  let top = 0
  let node = element
  while (node instanceof HTMLElement) {
    top += node.offsetTop
    node = node.offsetParent
  }
  return top
}

function currentScrollTop() {
  const scrollingElementTop = Number(document.scrollingElement?.scrollTop)
  if (Number.isFinite(scrollingElementTop)) return Math.max(0, scrollingElementTop)
  const windowTop = Number(window.scrollY || window.pageYOffset)
  return Number.isFinite(windowTop) ? Math.max(0, windowTop) : 0
}

function categoryTargetTravel(welcome) {
  const welcomeBottomInDocument = layoutDocumentTop(welcome) + welcome.offsetHeight
  const welcomeBottomInViewport = welcomeBottomInDocument - currentScrollTop()
  const dockBottom = moveraHeaderHeight + moveraShellHeight
  return Math.min(
    moveraShellHeight,
    Math.max(0, dockBottom - welcomeBottomInViewport),
  )
}

function applyCategoryTravel(shell, rail) {
  document.documentElement.style.setProperty('--movera-category-upward-travel', `${moveraDisplayedTravel}px`)
  const moving = moveraDisplayedTravel > 0.5
  const hiddenUnderSearch = moveraDisplayedTravel >= moveraShellHeight - 0.5
  shell.classList.toggle('movera-categories-moving-under-header', moving)
  rail.classList.toggle('movera-categories-moving-under-header', moving)
  shell.classList.toggle('movera-categories-under-search', hiddenUnderSearch)
  rail.classList.toggle('movera-categories-under-search', hiddenUnderSearch)
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
      if (isCategorySyncSuspended()) return
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
  moveraHeaderHeight = header.offsetHeight
  moveraShellHeight = shell.offsetHeight

  document.documentElement.style.setProperty('--movera-home-header-height', `${moveraHeaderHeight}px`)
  shell.classList.add('movera-categories-linked')
  rail.classList.add('movera-categories-linked')
  return true
}

function syncCategoryPosition(timestamp = performance.now(), snap = false) {
  moveraScrollRaf = 0
  if (isCategorySyncSuspended()) return false

  const { header, shell, rail, welcome } = getHomeElements()
  if (!header || !shell || !rail || !welcome) return false
  if ((!moveraHeaderHeight || !moveraShellHeight) && !measureHomeGeometry()) return false

  const targetTravel = categoryTargetTravel(welcome)
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  if (snap || reducedMotion) {
    moveraDisplayedTravel = targetTravel
  } else {
    const elapsed = moveraLastFrameTime ? Math.min(34, Math.max(1, timestamp - moveraLastFrameTime)) : 16.67
    const follow = 1 - Math.exp(-elapsed / MOVERA_DOCK_FOLLOW_MS)
    moveraDisplayedTravel += (targetTravel - moveraDisplayedTravel) * follow
    if (Math.abs(targetTravel - moveraDisplayedTravel) < 0.06) moveraDisplayedTravel = targetTravel
  }
  moveraLastFrameTime = timestamp

  applyCategoryTravel(shell, rail)

  if (!snap && Math.abs(targetTravel - moveraDisplayedTravel) >= 0.06) requestCategorySync()
  return true
}

function requestCategorySync() {
  if (isCategorySyncSuspended() || moveraScrollRaf) return
  moveraScrollRaf = requestAnimationFrame(syncCategoryPosition)
}

function refreshCategoryLink() {
  if (isCategorySyncSuspended()) return
  moveraLastFrameTime = 0
  if (measureHomeGeometry()) requestCategorySync()
}

function snapRestoredCategoryLink() {
  if (isSearchLocked()) return
  moveraSearchRestorePending = false
  moveraLastFrameTime = 0
  if (moveraScrollRaf) {
    cancelAnimationFrame(moveraScrollRaf)
    moveraScrollRaf = 0
  }
  if (measureHomeGeometry()) syncCategoryPosition(performance.now(), true)
}

function scheduleSearchRestoreSync() {
  const generation = ++moveraSearchRestoreGeneration
  moveraSearchRestorePending = true
  if (moveraScrollRaf) {
    cancelAnimationFrame(moveraScrollRaf)
    moveraScrollRaf = 0
  }

  // Search restores body/html styles synchronously, then restores scroll on the
  // following animation frame. Keep Home's sticky category state frozen until
  // both operations have committed, then recompute once from stable layout.
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (generation !== moveraSearchRestoreGeneration || isSearchLocked()) return
      snapRestoredCategoryLink()
    })
  })
}

window.addEventListener('scroll', requestCategorySync, { passive: true })
window.addEventListener('resize', refreshCategoryLink, { passive: true })
window.visualViewport?.addEventListener('resize', refreshCategoryLink, { passive: true })
window.addEventListener('popstate', refreshCategoryLink)
window.addEventListener('movera-search-restored', scheduleSearchRestoreSync)

let moveraWasSearchLocked = isSearchLocked()
const searchLockObserver = new MutationObserver(() => {
  const locked = isSearchLocked()
  if (locked) {
    moveraWasSearchLocked = true
    moveraSearchRestorePending = false
    moveraSearchRestoreGeneration += 1
    if (moveraScrollRaf) {
      cancelAnimationFrame(moveraScrollRaf)
      moveraScrollRaf = 0
    }
    return
  }

  if (moveraWasSearchLocked) {
    moveraWasSearchLocked = false
    scheduleSearchRestoreSync()
  }
})
searchLockObserver.observe(document.documentElement, {
  attributes: true,
  attributeFilter: ['data-movera-search-lock'],
})

const root = document.getElementById('root') || document.documentElement
const homeMountObserver = new MutationObserver((mutations) => {
  if (!mutations.some((mutation) => mutation.type === 'childList')) return
  if (isCategorySyncSuspended()) return
  requestAnimationFrame(refreshCategoryLink)
})
homeMountObserver.observe(root, { childList: true, subtree: true })

refreshCategoryLink()
