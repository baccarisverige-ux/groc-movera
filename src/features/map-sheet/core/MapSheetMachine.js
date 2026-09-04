import { createMapSheetGesturePolicy } from './MapSheetGesturePolicy.js'
import { reduceMapSheet } from './MapSheetReducer.js'
import { createMapSheetState } from './MapSheetState.js'

export function createMapSheetMachine({ initialState, policy } = {}) {
  let currentState = initialState ?? createMapSheetState()
  const resolvedPolicy = createMapSheetGesturePolicy(policy)

  return Object.freeze({
    getState() {
      return currentState
    },
    getPolicy() {
      return resolvedPolicy
    },
    dispatch(event) {
      const result = reduceMapSheet(currentState, event, { policy: resolvedPolicy })
      currentState = result.state
      return result
    },
    reset(nextState = createMapSheetState()) {
      currentState = nextState
      return currentState
    },
  })
}
