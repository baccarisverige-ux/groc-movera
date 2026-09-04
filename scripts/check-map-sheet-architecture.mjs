import { access, readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join, relative } from 'node:path'

const srcRoot = fileURLToPath(new URL('../src/', import.meta.url))
const moduleRoot = join(srcRoot, 'features', 'map-sheet')

const required = [
  'src/features/map-sheet/README.md',
  'src/features/map-sheet/index.js',
  'src/features/map-sheet/core/index.js',
  'src/features/map-sheet/core/MapSheetState.js',
  'src/features/map-sheet/core/MapSheetEvents.js',
  'src/features/map-sheet/core/MapSheetCommands.js',
  'src/features/map-sheet/core/MapSheetGesturePolicy.js',
  'src/features/map-sheet/core/MapSheetSnapEngine.js',
  'src/features/map-sheet/core/MapSheetReducer.js',
  'src/features/map-sheet/core/MapSheetMachine.js',
  'src/features/map-sheet/core/MapSheetSelectors.js',
  'src/features/map-sheet/core/MapSheetScrollHandoff.js',
  'src/features/map-sheet/core/MapSheetGestureOwnership.js',
  'src/features/map-sheet/ports/index.js',
  'src/features/map-sheet/ports/GesturePort.js',
  'src/features/map-sheet/ports/ScrollPort.js',
  'src/features/map-sheet/adapters/index.js',
  'src/features/map-sheet/adapters/browser/PointerGestureAdapter.js',
  'src/features/map-sheet/adapters/browser/IOSGestureAdapter.js',
  'src/features/map-sheet/adapters/browser/IOSScrollAdapter.js',
  'src/features/map-sheet/application/index.js',
  'src/features/map-sheet/ui/index.js',
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

for (const requiredPath of required) {
  try {
    await access(new URL(`../${requiredPath}`, import.meta.url))
  } catch {
    violations.push(`${requiredPath}: required Map Sheet V2 boundary missing`)
  }
}

const moduleFiles = await walk(moduleRoot)
for (const file of moduleFiles) {
  if (!/\.(js|jsx|mjs|ts|tsx)$/.test(file)) continue
  const repoPath = `src/${relative(srcRoot, file).replaceAll('\\', '/')}`
  const text = await readFile(file, 'utf8')

  const isCore = repoPath.startsWith('src/features/map-sheet/core/')
  const isPorts = repoPath.startsWith('src/features/map-sheet/ports/')
  const isAdapters = repoPath.startsWith('src/features/map-sheet/adapters/')
  const isApplication = repoPath.startsWith('src/features/map-sheet/application/')
  const isUi = repoPath.startsWith('src/features/map-sheet/ui/')

  if (isCore || isPorts) {
    const forbiddenRuntimePatterns = [
      [/from\s+['"]react(?:\/[^'"]*)?['"]/, 'React'],
      [/from\s+['"]motion(?:\/[^'"]*)?['"]/, 'Motion'],
      [/shared\/motion\//, 'shared Motion runtime'],
      [/\bwindow\b|\bdocument\b|\bnavigator\b/, 'browser global'],
      [/\bHTMLElement\b|\bElement\b|\bTouchEvent\b|\bPointerEvent\b|\bMouseEvent\b/, 'DOM event/type'],
      [/\.addEventListener\s*\(|\.removeEventListener\s*\(/, 'DOM listener'],
    ]
    for (const [pattern, label] of forbiddenRuntimePatterns) {
      if (pattern.test(text)) violations.push(`${repoPath}: headless boundary cannot depend on ${label}`)
    }
  }

  if (isCore && /from\s+['"][^'"]*(?:ports|adapters|application|ui)\//.test(text)) {
    violations.push(`${repoPath}: core must not depend outward on ports/adapters/application/ui`)
  }

  if (isPorts && /from\s+['"][^'"]*(?:adapters|application|ui)\//.test(text)) {
    violations.push(`${repoPath}: ports must stay implementation-free`)
  }

  if (isAdapters) {
    if (/from\s+['"][^'"]*(?:application|ui)\//.test(text)) {
      violations.push(`${repoPath}: adapters may depend on ports/core, never application or UI`)
    }
    if (/\.map-offer-sheet|map-offer-sheet__/.test(text)) {
      violations.push(`${repoPath}: adapter is coupled to legacy Map CSS selectors; use semantic origin descriptors`)
    }
  }

  if (isApplication) {
    if (/from\s+['"][^'"]*(?:adapters|ui)\//.test(text)) {
      violations.push(`${repoPath}: application layer must depend on ports/core, never adapters or UI`)
    }
    if (/from\s+['"]react(?:\/[^'"]*)?['"]|from\s+['"]motion(?:\/[^'"]*)?['"]|shared\/motion\//.test(text)) {
      violations.push(`${repoPath}: application layer cannot depend on React or Motion`)
    }
    if (/\bwindow\b|\bdocument\b|\.addEventListener\s*\(/.test(text)) {
      violations.push(`${repoPath}: application layer cannot own browser/DOM behavior`)
    }
  }

  if (isUi) {
    if (/from\s+['"]motion(?:\/[^'"]*)?['"]|shared\/motion\//.test(text)) {
      violations.push(`${repoPath}: UI cannot import Motion directly; use the adapter/controller boundary`)
    }
    if (/\.addEventListener\s*\(|\.removeEventListener\s*\(|onTouch(?:Start|Move|End|Cancel)\s*=|onPointer(?:Down|Move|Up|Cancel)\s*=/.test(text)) {
      violations.push(`${repoPath}: UI cannot own low-level gestures; use browser gesture adapters`)
    }
  }

  if (/from\s+['"](?:\.\.\/)+map\//.test(text) || /src\/features\/map\//.test(text)) {
    violations.push(`${repoPath}: Map Sheet V2 cannot depend on legacy Map internals`)
  }
}

const allSrcFiles = await walk(srcRoot)
for (const file of allSrcFiles) {
  if (!/\.(js|jsx|mjs|ts|tsx)$/.test(file)) continue
  const repoPath = `src/${relative(srcRoot, file).replaceAll('\\', '/')}`
  if (repoPath.startsWith('src/features/map-sheet/')) continue
  const text = await readFile(file, 'utf8')
  if (/map-sheet\/(?:core|ports|adapters|application|ui)\//.test(text)) {
    violations.push(`${repoPath}: imports private Map Sheet V2 internals; use src/features/map-sheet/index.js`)
  }
}

if (violations.length) {
  console.error('Map Sheet V2 architecture guard failed:\n' + violations.map((violation) => `- ${violation}`).join('\n'))
  process.exit(1)
}

console.log(`Map Sheet V2 architecture guard passed: ${required.length} boundaries present; headless core isolated; gesture/scroll ports protected; browser/iOS adapters decoupled from legacy Map CSS; UI gesture-free; private internals encapsulated.`)
