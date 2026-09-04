import { MAP_SHEET_COMMAND, mapSheetCommand } from './MapSheetCommands.js'
import { MAP_SHEET_EVENT } from './MapSheetEvents.js'
import { DEFAULT_MAP_SHEET_GESTURE_POLICY } from './MapSheetGesturePolicy.js'
import { resolveMapSheetSnap, getMapSheetSnapPoint } from './MapSheetSnapEngine.js'
import {
  MAP_SHEET_MODE,
  clampMapSheetProgress,
  getMapSheetPositionProgress,
  isMapSheetPosition,
} from './MapSheetState.js'

function noChange(state) {
  return { state, commands: [] }
}

function interactionFromEvent(event) {
  return {
    origin: event.origin ?? 'sheet',
    startX: Number(event.x) || 0,
    startY: Number(event.y) || 0,
    startedAt: Number(event.time) || 0,
  }
}

export function reduceMapSheet(state, event, { policy = DEFAULT_MAP_SHEET_GESTURE_POLICY } = {}) {
  if (!state || !event?.type) return noChange(state)

  switch (event.type) {
    case MAP_SHEET_EVENT.INTERACTION_BEGIN: {
      const commands = state.mode === MAP_SHEET_MODE.SNAPPING
        ? [mapSheetCommand(MAP_SHEET_COMMAND.INTERRUPT_SNAP)]
        : []

      return {
        state: {
          ...state,
          mode: MAP_SHEET_MODE.TAP_PENDING,
          targetPosition: null,
          interaction: interactionFromEvent(event),
        },
        commands,
      }
    }

    case MAP_SHEET_EVENT.SHEET_DRAG_BEGIN: {
      if (![MAP_SHEET_MODE.TAP_PENDING, MAP_SHEET_MODE.LIST_SCROLLING].includes(state.mode)) return noChange(state)
      return {
        state: { ...state, mode: MAP_SHEET_MODE.SHEET_DRAGGING },
        commands: [mapSheetCommand(MAP_SHEET_COMMAND.START_SHEET_DRAG, { progress: state.progress })],
      }
    }

    case MAP_SHEET_EVENT.LIST_SCROLL_BEGIN: {
      if (state.mode !== MAP_SHEET_MODE.TAP_PENDING) return noChange(state)
      return {
        state: { ...state, mode: MAP_SHEET_MODE.LIST_SCROLLING },
        commands: [],
      }
    }

    case MAP_SHEET_EVENT.SHEET_DRAG_PROGRESS: {
      if (state.mode !== MAP_SHEET_MODE.SHEET_DRAGGING) return noChange(state)
      const progress = clampMapSheetProgress(event.progress)
      return {
        state: { ...state, progress },
        commands: [mapSheetCommand(MAP_SHEET_COMMAND.MOVE_SHEET, { progress })],
      }
    }

    case MAP_SHEET_EVENT.INTERACTION_END: {
      if (state.mode === MAP_SHEET_MODE.SHEET_DRAGGING) {
        const target = resolveMapSheetSnap({ progress: state.progress, velocity: event.velocity, policy })
        return {
          state: {
            ...state,
            mode: MAP_SHEET_MODE.SNAPPING,
            targetPosition: target.position,
            interaction: null,
          },
          commands: [
            mapSheetCommand(MAP_SHEET_COMMAND.END_SHEET_DRAG),
            mapSheetCommand(MAP_SHEET_COMMAND.SNAP_TO_POSITION, target),
          ],
        }
      }

      if ([MAP_SHEET_MODE.TAP_PENDING, MAP_SHEET_MODE.LIST_SCROLLING].includes(state.mode)) {
        return {
          state: { ...state, mode: MAP_SHEET_MODE.IDLE, interaction: null },
          commands: [],
        }
      }

      return noChange(state)
    }

    case MAP_SHEET_EVENT.INTERACTION_CANCEL: {
      if (state.mode === MAP_SHEET_MODE.SHEET_DRAGGING) {
        const target = getMapSheetSnapPoint(state.position, policy)
        return {
          state: {
            ...state,
            mode: MAP_SHEET_MODE.SNAPPING,
            targetPosition: target.position,
            interaction: null,
          },
          commands: [
            mapSheetCommand(MAP_SHEET_COMMAND.END_SHEET_DRAG),
            mapSheetCommand(MAP_SHEET_COMMAND.SNAP_TO_POSITION, target),
          ],
        }
      }

      if ([MAP_SHEET_MODE.TAP_PENDING, MAP_SHEET_MODE.LIST_SCROLLING].includes(state.mode)) {
        return {
          state: { ...state, mode: MAP_SHEET_MODE.IDLE, interaction: null },
          commands: [],
        }
      }

      return noChange(state)
    }

    case MAP_SHEET_EVENT.SNAP_COMPLETE: {
      const position = isMapSheetPosition(event.position)
        ? event.position
        : state.targetPosition ?? state.position

      return {
        state: {
          ...state,
          mode: MAP_SHEET_MODE.IDLE,
          position,
          progress: getMapSheetPositionProgress(position),
          targetPosition: null,
          interaction: null,
        },
        commands: [],
      }
    }

    default:
      return noChange(state)
  }
}
