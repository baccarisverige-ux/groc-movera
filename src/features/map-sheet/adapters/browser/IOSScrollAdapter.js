import { createMapSheetScrollSnapshot } from '../../ports/ScrollPort.js'

export function normalizeIOSScrollSnapshot(metrics = {}) {
  return createMapSheetScrollSnapshot(metrics)
}

export function createIOSScrollAdapter({
  element,
  edgeEpsilonPx = 2,
} = {}) {
  if (!element) throw new TypeError('IOSScrollAdapter requires a scroll element')

  const getSnapshot = () => normalizeIOSScrollSnapshot({
    scrollTop: element.scrollTop,
    scrollHeight: element.scrollHeight,
    clientHeight: element.clientHeight,
    edgeEpsilonPx,
  })

  return Object.freeze({ getSnapshot })
}
