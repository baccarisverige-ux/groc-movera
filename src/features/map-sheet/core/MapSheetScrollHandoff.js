export const MAP_SHEET_SCROLL_OWNER = Object.freeze({
  SHEET: 'sheet',
  LIST: 'list',
})

export function resolveMapSheetScrollHandoff({
  deltaY = 0,
  atTop = false,
  startsOnFirstOffer = false,
} = {}) {
  const pullingDown = Number(deltaY) > 0
  if (pullingDown && atTop && startsOnFirstOffer) return MAP_SHEET_SCROLL_OWNER.SHEET
  return MAP_SHEET_SCROLL_OWNER.LIST
}
