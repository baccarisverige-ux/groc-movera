import { useEffect } from 'react'

export function ViewportController({ onLifecycle }) {
  useEffect(() => {
    const onVisibility = () => onLifecycle(document.hidden ? 'background' : 'foreground')
    const onOrientation = () => onLifecycle('orientation')
    const onPageHide = () => onLifecycle('background')
    const onPageShow = () => onLifecycle('foreground')

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('orientationchange', onOrientation)
    window.addEventListener('pagehide', onPageHide)
    window.addEventListener('pageshow', onPageShow)

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('orientationchange', onOrientation)
      window.removeEventListener('pagehide', onPageHide)
      window.removeEventListener('pageshow', onPageShow)
    }
  }, [onLifecycle])

  return null
}
