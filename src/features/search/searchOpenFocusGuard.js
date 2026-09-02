const SEARCH_TRIGGER = '.b225-search'
const SEARCH_TRANSITION = '[data-testid="search-transition"]'
const SEARCH_CLOSE_CONTROL = '.movera-st__persistent-toggle, .movera-st__close'
const KEYBOARD_FREE_STEPS = new Set(['dates', 'guests'])
let searchWasMounted = false

function blurCurrentField() {
  const active = document.activeElement
  if (active instanceof HTMLElement && active !== document.body) active.blur()
}

function dismissKeyboardNow() {
  blurCurrentField()
  requestAnimationFrame(blurCurrentField)
}

function announceSearchRestored() {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.dispatchEvent(new Event('movera-search-restored'))
  }))
}

function currentSearchStep() {
  return document.querySelector(SEARCH_TRANSITION)?.getAttribute('data-step') || ''
}

function dismissKeyboardForStep() {
  if (!KEYBOARD_FREE_STEPS.has(currentSearchStep())) return
  dismissKeyboardNow()
}

function eventElement(event) {
  return event.target instanceof Element ? event.target : null
}

function isSearchCloseControl(event) {
  const target = eventElement(event)
  return Boolean(target?.closest(SEARCH_CLOSE_CONTROL) && document.querySelector(SEARCH_TRANSITION))
}

function clearHiddenMapCarryText(event) {
  const target = eventElement(event)
  if (!(target instanceof HTMLInputElement)) return
  if (!target.matches('.movera-st[data-map-origin="true"] .movera-st__persistent-search input')) return
  if (!target.value) return

  const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  if (valueSetter) valueSetter.call(target, '')
  else target.value = ''

  target.dispatchEvent(new Event('input', { bubbles: true }))
}

function onSearchPointerDown(event) {
  if (isSearchCloseControl(event)) {
    dismissKeyboardNow()
    return
  }

  const trigger = eventElement(event)?.closest(SEARCH_TRIGGER)
  if (!trigger || !document.querySelector('[data-testid="page-home"]')) return
  dismissKeyboardNow()
}

function onSearchClick(event) {
  if (isSearchCloseControl(event)) {
    dismissKeyboardNow()
    return
  }

  const trigger = eventElement(event)?.closest(SEARCH_TRIGGER)
  if (!trigger || !document.querySelector('[data-testid="page-home"]')) return
  dismissKeyboardNow()
}

function onFocusIn(event) {
  clearHiddenMapCarryText(event)
  if (!KEYBOARD_FREE_STEPS.has(currentSearchStep())) return
  requestAnimationFrame(blurCurrentField)
}

/* SearchTransitionHost locks the background with fixed body/html overflow.
   Its older document-level touchmove/wheel blocker must not swallow native
   scrolling that starts inside the search UI itself. This listener is
   registered before the transition mounts, so it can stop only the later
   background blocker without cancelling the browser's default scroll. */
function preserveSearchNativeScroll(event) {
  const target = eventElement(event)
  if (!target?.closest(SEARCH_TRANSITION)) return
  event.stopImmediatePropagation()
}

const stepObserver = new MutationObserver((mutations) => {
  const popup = document.querySelector(SEARCH_TRANSITION)
  if (popup) searchWasMounted = true
  else if (searchWasMounted) {
    searchWasMounted = false
    dismissKeyboardNow()
    announceSearchRestored()
  }

  for (const mutation of mutations) {
    if (mutation.type === 'attributes' && mutation.attributeName === 'data-step') {
      dismissKeyboardForStep()
      return
    }
  }

  if (popup && KEYBOARD_FREE_STEPS.has(popup.getAttribute('data-step'))) dismissKeyboardForStep()
})

stepObserver.observe(document.documentElement, {
  subtree: true,
  childList: true,
  attributes: true,
  attributeFilter: ['data-step'],
})

document.addEventListener('pointerdown', onSearchPointerDown, true)
document.addEventListener('click', onSearchClick, true)
document.addEventListener('focusin', onFocusIn, true)
document.addEventListener('touchmove', preserveSearchNativeScroll, { passive: true })
document.addEventListener('wheel', preserveSearchNativeScroll, { passive: true })
