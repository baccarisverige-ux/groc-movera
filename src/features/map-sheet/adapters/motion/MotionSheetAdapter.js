import { animate } from '../../../../shared/motion/runtime.js'
import { clampMapSheetProgress, getMapSheetPositionProgress } from '../../core/MapSheetState.js'

const DEFAULT_SPRING = Object.freeze({
  stiffness: 430,
  damping: 38,
  mass: 0.82,
  restDelta: 0.002,
  restSpeed: 0.01,
})

export function createMotionSheetAdapter({
  readProgress = () => 0,
  writeProgress,
  onProgress,
  animateValue = animate,
  reducedMotion = false,
  spring = DEFAULT_SPRING,
} = {}) {
  if (typeof writeProgress !== 'function') throw new TypeError('MotionSheetAdapter requires writeProgress(progress)')
  if (typeof readProgress !== 'function') throw new TypeError('MotionSheetAdapter requires readProgress()')
  if (typeof animateValue !== 'function') throw new TypeError('MotionSheetAdapter requires animateValue()')

  let active = null

  const currentProgress = () => clampMapSheetProgress(readProgress())
  const commit = (value) => {
    const progress = clampMapSheetProgress(value)
    writeProgress(progress)
    onProgress?.(progress)
    return progress
  }

  const interrupt = () => {
    const pending = active
    active = null
    if (!pending) return currentProgress()
    pending.controls?.stop?.()
    pending.resolve({ interrupted: true, progress: currentProgress() })
    return currentProgress()
  }

  const startDrag = () => {
    interrupt()
    return currentProgress()
  }

  const moveToProgress = (progress) => commit(progress)
  const endDrag = () => currentProgress()

  const snapToPosition = ({ position, progress, velocity = 0 } = {}) => {
    const target = clampMapSheetProgress(
      progress == null ? getMapSheetPositionProgress(position) : progress,
    )

    interrupt()

    if (reducedMotion || Math.abs(currentProgress() - target) <= 0.001) {
      commit(target)
      return Promise.resolve({ interrupted: false, position, progress: target })
    }

    return new Promise((resolve, reject) => {
      let settled = false
      const finish = (result) => {
        if (settled) return
        settled = true
        if (active?.resolve === finish) active = null
        resolve(result)
      }

      try {
        const controls = animateValue(currentProgress(), target, {
          type: 'spring',
          ...DEFAULT_SPRING,
          ...spring,
          velocity: Number(velocity) || 0,
          onUpdate: commit,
          onComplete: () => {
            commit(target)
            finish({ interrupted: false, position, progress: target })
          },
        })
        active = { controls, resolve: finish }
      } catch (error) {
        active = null
        reject(error)
      }
    })
  }

  const destroy = () => {
    interrupt()
  }

  return {
    interrupt,
    startDrag,
    moveToProgress,
    endDrag,
    snapToPosition,
    destroy,
  }
}
