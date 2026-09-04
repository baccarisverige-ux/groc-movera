export function createMapSheetScrollSnapshot({
  scrollTop = 0,
  scrollHeight = 0,
  clientHeight = 0,
  edgeEpsilonPx = 2,
} = {}) {
  const safeHeight = Math.max(0, Number(scrollHeight) || 0)
  const safeClient = Math.max(0, Number(clientHeight) || 0)
  const maxScrollTop = Math.max(0, safeHeight - safeClient)
  const rawScrollTop = Number(scrollTop) || 0
  const normalizedScrollTop = Math.min(maxScrollTop, Math.max(0, rawScrollTop))
  const epsilon = Math.max(0, Number(edgeEpsilonPx) || 0)

  return Object.freeze({
    rawScrollTop,
    scrollTop: normalizedScrollTop,
    maxScrollTop,
    atTop: rawScrollTop <= epsilon,
    atBottom: rawScrollTop >= maxScrollTop - epsilon,
    canScroll: maxScrollTop > epsilon,
  })
}

export function assertMapSheetScrollPort(port) {
  if (typeof port?.getSnapshot !== 'function') throw new TypeError('Map Sheet ScrollPort requires getSnapshot()')
  return port
}
