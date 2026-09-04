import {
  MAP_SHEET_COMMAND,
  completeMapSheetSnap,
  createMapSheetMachine,
  requestMapSheetSnap,
} from '../core/index.js'
import {
  assertMapSheetListingSelectionPort,
  assertMapSheetMapCameraPort,
  assertMapSheetMotionPort,
} from '../ports/index.js'
import { focusListingOnMap as runFocusListingOnMap } from './focusListingOnMap.js'

export function createMapSheetController({
  machine = createMapSheetMachine(),
  motion,
  mapCamera,
  selection,
} = {}) {
  if (typeof machine?.dispatch !== 'function' || typeof machine?.getState !== 'function') {
    throw new TypeError('MapSheetController requires a state machine with dispatch() and getState()')
  }

  assertMapSheetMotionPort(motion)
  assertMapSheetMapCameraPort(mapCamera)
  assertMapSheetListingSelectionPort(selection)

  const listeners = new Set()
  let destroyed = false
  let commandTail = Promise.resolve()
  let focusRevision = 0

  const notify = (state) => {
    for (const listener of listeners) listener(state)
  }

  const executeCommand = async (command) => {
    switch (command?.type) {
      case MAP_SHEET_COMMAND.INTERRUPT_SNAP:
        return motion.interrupt()
      case MAP_SHEET_COMMAND.START_SHEET_DRAG:
        return motion.startDrag(command)
      case MAP_SHEET_COMMAND.MOVE_SHEET:
        return motion.moveToProgress(command.progress)
      case MAP_SHEET_COMMAND.END_SHEET_DRAG:
        return motion.endDrag(command)
      case MAP_SHEET_COMMAND.SNAP_TO_POSITION: {
        const result = await motion.snapToPosition(command)
        if (!result?.interrupted) {
          const completed = machine.dispatch(completeMapSheetSnap(command.position))
          notify(completed.state)
        }
        return result
      }
      default:
        return undefined
    }
  }

  const executeCommands = async (commands) => {
    for (const command of commands || []) await executeCommand(command)
  }

  const scheduleCommands = (commands = []) => {
    const immediate = commands.filter((command) => command.type === MAP_SHEET_COMMAND.INTERRUPT_SNAP)
    const queued = commands.filter((command) => command.type !== MAP_SHEET_COMMAND.INTERRUPT_SNAP)

    for (const command of immediate) executeCommand(command)
    if (!queued.length) return commandTail.catch(() => undefined)

    const previous = commandTail.catch(() => undefined)
    const next = previous.then(() => executeCommands(queued))
    commandTail = next
    return next
  }

  const dispatch = (event) => {
    if (destroyed) throw new Error('MapSheetController is destroyed')
    const result = machine.dispatch(event)
    notify(result.state)
    return { ...result, done: scheduleCommands(result.commands) }
  }

  const subscribe = (listener, { emitCurrent = false } = {}) => {
    if (typeof listener !== 'function') throw new TypeError('MapSheetController subscribe requires a listener')
    listeners.add(listener)
    if (emitCurrent) listener(machine.getState())
    return () => listeners.delete(listener)
  }

  const snapToPosition = async (position, options = {}) => {
    if (destroyed) throw new Error('MapSheetController is destroyed')
    focusRevision += 1
    mapCamera.cancelFocus()
    const result = dispatch(requestMapSheetSnap(position, options))
    await result.done
    return machine.getState()
  }

  const focusListingOnMap = async (listingId, options = {}) => {
    if (destroyed) throw new Error('MapSheetController is destroyed')
    const revision = ++focusRevision

    motion.interrupt()
    mapCamera.cancelFocus()

    return runFocusListingOnMap({
      listingId,
      dispatch,
      motion,
      mapCamera,
      selection,
      options,
      isCurrent: () => !destroyed && revision === focusRevision,
    })
  }

  const destroy = () => {
    if (destroyed) return
    destroyed = true
    focusRevision += 1
    motion.interrupt()
    motion.destroy?.()
    mapCamera.cancelFocus()
    listeners.clear()
  }

  return {
    dispatch,
    subscribe,
    getState: () => machine.getState(),
    snapToPosition,
    focusListingOnMap,
    destroy,
  }
}
