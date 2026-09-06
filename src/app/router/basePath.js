const BUILD_BASE_PATH = import.meta.env.BASE_URL === '/' ? '' : import.meta.env.BASE_URL.replace(/\/$/, '')
export const COMPAT_BASE_PATHS = Object.freeze(['/groc-movera', '/Movera-host1'])

export function stripBasePath(pathname, basePath) {
  if (!basePath) return null
  if (pathname === basePath || pathname === `${basePath}/`) return '/'
  if (pathname.startsWith(`${basePath}/`)) return pathname.slice(basePath.length) || '/'
  return null
}

export function toInternalPath(pathname) {
  const value = pathname || '/'
  const activeBasePath = stripBasePath(value, BUILD_BASE_PATH)
  if (activeBasePath) return activeBasePath

  for (const compatibleBasePath of COMPAT_BASE_PATHS) {
    const compatiblePath = stripBasePath(value, compatibleBasePath)
    if (compatiblePath) return compatiblePath
  }

  return value
}

export function runtimeBasePath() {
  if (BUILD_BASE_PATH) return BUILD_BASE_PATH
  if (typeof window === 'undefined') return ''
  const pathname = window.location.pathname || '/'
  return COMPAT_BASE_PATHS.find((basePath) => stripBasePath(pathname, basePath)) || ''
}

export function toBrowserPath(to) {
  const value = typeof to === 'string' && to ? to : '/'
  if (/^[a-z][a-z\d+.-]*:/i.test(value) || value.startsWith('//')) return value
  const basePath = runtimeBasePath()
  if (!basePath) return value
  if (value === '/') return `${basePath}/`
  return `${basePath}${value.startsWith('/') ? value : `/${value}`}`
}
