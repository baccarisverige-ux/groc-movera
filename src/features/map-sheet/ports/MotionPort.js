export function assertMapSheetMotionPort(port) {
  for (const method of ['interrupt', 'startDrag', 'moveToProgress', 'endDrag', 'snapToPosition']) {
    if (typeof port?.[method] !== 'function') throw new TypeError(`Map Sheet MotionPort requires ${method}()`)
  }
  return port
}
