const CATEGORY_IDS_BY_LABEL = new Map([
  ['Tout', 'all'],
  ['Maison d’hôte', 'guesthouse'],
  ['Plage', 'beach'],
  ['Appartement', 'family'],
  ['Villa', 'prestige'],
  ['Expérience', 'experience'],
  ['Partenaire', 'partner'],
])

let scheduled = false

function getCategoryLabel(button) {
  return Array.from(button.childNodes)
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent || '')
    .join('')
    .trim()
}

function applyCategoryIdentity() {
  const categories = document.querySelector('.b225-categories')
  if (!categories) return false

  let matched = 0
  categories.querySelectorAll(':scope > button').forEach((button) => {
    const id = CATEGORY_IDS_BY_LABEL.get(getCategoryLabel(button))
    if (!id) return

    matched += 1
    button.dataset.categoryId = id
  })

  return matched === CATEGORY_IDS_BY_LABEL.size
}

function scheduleApply() {
  if (scheduled) return
  scheduled = true
  requestAnimationFrame(() => {
    scheduled = false
    applyCategoryIdentity()
  })
}

scheduleApply()

const observer = new MutationObserver((mutations) => {
  if (mutations.some((mutation) => mutation.type === 'childList')) scheduleApply()
})
observer.observe(document.getElementById('root') || document.documentElement, {
  childList: true,
  subtree: true,
})
