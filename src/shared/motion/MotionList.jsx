import { AnimatePresence, motion, useReducedMotion } from './runtime.js'

const MOTION_TAGS = Object.freeze({
  article: motion.article,
  button: motion.button,
  div: motion.div,
  li: motion.li,
})

const DEFAULT_ITEM_MOTION = Object.freeze({
  activeScale: 1,
  enterScale: 0.992,
  enterY: 10,
  exitScale: 0.992,
  exitY: -5,
  inactiveScale: 1,
  initialOpacity: 0,
  layout: true,
  stagger: 0.025,
  tapScale: 0.992,
  spring: Object.freeze({ stiffness: 390, damping: 34, mass: 0.78 }),
})

function resolveMotionTag(as) {
  return MOTION_TAGS[as] || motion.div
}

export function MotionList({
  as = 'div',
  children,
  className,
  nodeRef,
  presenceMode = 'sync',
  ...props
}) {
  const Component = resolveMotionTag(as)

  return (
    <Component ref={nodeRef} className={className} {...props}>
      <AnimatePresence initial={false} mode={presenceMode}>
        {children}
      </AnimatePresence>
    </Component>
  )
}

export function MotionListItem({
  as = 'div',
  active,
  children,
  className,
  config,
  index = 0,
  ...props
}) {
  const reduceMotion = useReducedMotion()
  const Component = resolveMotionTag(as)
  const settings = { ...DEFAULT_ITEM_MOTION, ...config }
  const delay = reduceMotion ? 0 : Math.min(index, 8) * settings.stagger
  const targetScale = active === undefined
    ? 1
    : active
      ? settings.activeScale
      : settings.inactiveScale

  return (
    <Component
      className={className}
      layout={settings.layout && !reduceMotion ? 'position' : false}
      initial={reduceMotion ? false : {
        opacity: settings.initialOpacity,
        scale: settings.enterScale,
        y: settings.enterY,
      }}
      animate={{ opacity: 1, scale: targetScale, y: 0 }}
      exit={reduceMotion ? undefined : {
        opacity: 0,
        scale: settings.exitScale,
        y: settings.exitY,
      }}
      transition={reduceMotion ? { duration: 0 } : {
        opacity: { duration: 0.18, delay },
        scale: { type: 'spring', ...settings.spring, delay },
        y: { type: 'spring', ...settings.spring, delay },
        layout: { type: 'spring', ...settings.spring },
      }}
      whileTap={reduceMotion ? undefined : { scale: settings.tapScale }}
      {...props}
    >
      {children}
    </Component>
  )
}
