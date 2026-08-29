const CATEGORY_COLLECTION_ROUTES = Object.freeze({
  beach: '/plage',
  guesthouse: '/maison-d-hote',
  hotel: '/hotel',
  family: '/appartement',
  prestige: '/villa',
})

const COLLECTION_ROUTE_PATHS = Object.freeze(Object.values(CATEGORY_COLLECTION_ROUTES))

export function getCollectionRouteForCategory(categoryId) {
  return CATEGORY_COLLECTION_ROUTES[categoryId] || null
}

export function isGuestCollectionRoute(pathname) {
  return COLLECTION_ROUTE_PATHS.includes(pathname)
}

export function getGuestNavigationPath(pathname) {
  return isGuestCollectionRoute(pathname) ? '/' : pathname
}
