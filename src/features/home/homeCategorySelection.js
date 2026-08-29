const VALID_CATEGORY_IDS = new Set(['all', 'guesthouse', 'beach', 'hotel', 'prestige', 'family', 'experience', 'partner'])

let selectedCategoryId = 'all'

export function getSelectedHomeCategory() {
  return selectedCategoryId
}

export function setSelectedHomeCategory(categoryId) {
  if (VALID_CATEGORY_IDS.has(categoryId)) selectedCategoryId = categoryId
}
