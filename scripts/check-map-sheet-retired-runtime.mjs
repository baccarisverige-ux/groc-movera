import { access, readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join, relative } from 'node:path'

const repoRoot = fileURLToPath(new URL('../', import.meta.url))
const srcRoot = join(repoRoot, 'src')

const retiredPaths = [
  'src/features/map/motion/MapOfferSheetMotionSurface.jsx',
  'src/features/map/motion/useMapOfferScrollSheetHandoff.js',
  'src/features/map/motion/mapOfferSheetMotion.config.js',
]

const retiredTokens = [
  'MapOfferSheetMotionSurface',
  'useMapOfferSheetGestureRouter',
  'useMapOfferScrollSheetHandoff',
  'MAP_OFFER_SHEET_MOTION',
  'manualReleaseBehavior',
  'freeManualRelease',
]

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) files.push(...await walk(path))
    else files.push(path)
  }
  return files
}

const violations = []

for (const retiredPath of retiredPaths) {
  try {
    await access(join(repoRoot, retiredPath))
    violations.push(`${retiredPath}: retired Map Sheet runtime must stay deleted`)
  } catch {
    // Expected: retired file does not exist.
  }
}

for (const file of await walk(srcRoot)) {
  if (!/\.(js|jsx|mjs|ts|tsx)$/.test(file)) continue
  const repoPath = `src/${relative(srcRoot, file).replaceAll('\\', '/')}`
  const text = await readFile(file, 'utf8')
  for (const token of retiredTokens) {
    if (text.includes(token)) violations.push(`${repoPath}: retired Map Sheet token reintroduced: ${token}`)
  }
}

const bridgePath = join(srcRoot, 'features', 'map', 'MapOfferSheet.jsx')
const bridge = await readFile(bridgePath, 'utf8')
if (!bridge.includes("from './mapOfferItemMotion.config.js'")) {
  violations.push('src/features/map/MapOfferSheet.jsx: offer-item animation must stay detached from retired map/motion runtime')
}

const sharedSnapPath = join(srcRoot, 'shared', 'motion', 'SnapSheetMotionSurface.jsx')
const sharedSnap = await readFile(sharedSnapPath, 'utf8')
if (sharedSnap.includes('manualReleaseBehavior') || sharedSnap.includes('freeManualRelease')) {
  violations.push('src/shared/motion/SnapSheetMotionSurface.jsx: Map-specific free-release behavior leaked back into shared runtime')
}

if (violations.length) {
  console.error('Retired Map Sheet runtime guard failed:\n' + violations.map((violation) => `- ${violation}`).join('\n'))
  process.exit(1)
}

console.log('Retired Map Sheet runtime guard passed: legacy motion/gesture files remain deleted, shared SnapSheet is Map-agnostic, and offer-item motion is isolated from the retired runtime.')
