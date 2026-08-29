import { useEffect, useRef } from 'react'
import { AnimatePresence, motion, useReducedMotion } from '../../shared/motion/runtime.js'

const STEP_ORDER = Object.freeze({ destination: 0, dates: 1, guests: 2 })

export function SearchStepMotion({ step, children }) {
  const reduceMotion = useReducedMotion()
  const previousStepRef = useRef(step)
  const currentIndex = STEP_ORDER[step] ?? 0
  const previousIndex = STEP_ORDER[previousStepRef.current] ?? currentIndex
  const direction = currentIndex >= previousIndex ? 1 : -1

  useEffect(() => {
    previousStepRef.current = step
  }, [step])

  const initial = reduceMotion
    ? { opacity: 1 }
    : { opacity: 0, x: 18 * direction, y: 3, scale: 0.994 }
  const animate = { opacity: 1, x: 0, y: 0, scale: 1 }
  const exit = reduceMotion
    ? { opacity: 0 }
    : { opacity: 0, x: -12 * direction, y: -2, scale: 0.997 }

  return (
    <AnimatePresence initial={false} mode="popLayout">
      <motion.div
        key={step}
        className="movera-st__step-motion"
        initial={initial}
        animate={animate}
        exit={exit}
        transition={reduceMotion ? { duration: 0.01 } : { duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
