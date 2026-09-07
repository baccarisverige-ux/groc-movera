// Permanent live-cleanup guard. Keep this audit in the global quality gate.
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8')
const listFiles = (dir) => fs.existsSync(path.join(root, dir)) ? fs.readdirSync(path.join(root, dir)) : []

const app = read('src/app/App.jsx')
const searchDir = 'src/features/search'
const searchFiles = listFiles(searchDir).sort()
const workflowFiles = listFiles('.github/workflows').filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'))

const expectedSearchFiles = [
  'GuestSelector.jsx',
  'SearchCalendar.jsx',
  'SearchStepMotion.jsx',
  'SearchTransitionHost.jsx',
  'mapHandoff.js',
  'searchAddressMode.css',
  'searchData.js',
  'searchExactFit.css',
  'searchOpenFocusGuard.js',
  'searchState.js',
  'searchStepFit.css',
  'searchTransition-stability.css',
  'searchTransition.css',
  'tunisiaPinScannerLegacy.js',
  'useAddressAutocomplete.js',
  'useSearchPanelFit.js',
  'useSearchPanelHeightMotion.js',
].sort()

const retiredSearchFiles = ['tunisiaPinScanner.js']
const unexpectedSearchFiles = searchFiles.filter((file) => !expectedSearchFiles.includes(file))
const missingSearchFiles = expectedSearchFiles.filter((file) => !searchFiles.includes(file))
const reintroducedRetiredSearchFiles = retiredSearchFiles.filter((file) => searchFiles.includes(file))
const searchImplementations = searchFiles.filter((f) => /Search.*\.jsx$/.test(f))
const mountedTransitions = (app.match(/<SearchTransitionHost\b/g) || []).length
const mountedSearchV2 = (app.match(/<SearchExperience\b/g) || []).length

const addressAutocomplete = read('src/features/search/useAddressAutocomplete.js')
const popupUsesSharedGeocoding = /from\s+['"]\.\.\/\.\.\/services\/geocoding\/index\.js['"]/.test(addressAutocomplete)
const popupKeepsLegacyFallback = /from\s+['"]\.\/tunisiaPinScannerLegacy\.js['"]/.test(addressAutocomplete)

const cssLayers = searchFiles.filter((file) => /^searchTransition.*\.css$/.test(file))
const transitionCss = read('src/features/search/searchTransition.css')
const stabilityCss = read('src/features/search/searchTransition-stability.css')
const importantCount = [transitionCss, stabilityCss].reduce((sum, css) => sum + (css.match(/!important/g) || []).length, 0)

const deployWorkflows = []
const legacyPhaseBranchTargets = []
for (const file of workflowFiles) {
  const content = read(`.github/workflows/${file}`)
  if (/deploy-pages@|github-pages-deploy-action|deploy\/github-pages/.test(content)) {
    deployWorkflows.push({ file, directPages: /actions\/deploy-pages@/.test(content), branchPublish: /deploy\/github-pages/.test(content) })
  }
  const matches = [...content.matchAll(/\bphase\d+[\w-]*/g)].map((match) => match[0])
  if (matches.length) legacyPhaseBranchTargets.push({ file, targets: [...new Set(matches)] })
}

/* Movera moved off /Movera-host1/ to /groc-movera/. Two workflows still drove
   the app through the retired prefix while triggering on a branch that no
   longer exists, so they could never run and could never catch a production
   base-path break. Keep CI pointed at the base path that actually ships. */
const RETIRED_BASE_PATH = '/Movera-host1'
const workflowsUsingRetiredBase = workflowFiles.filter((file) => read(`.github/workflows/${file}`).includes(RETIRED_BASE_PATH))

const expectedDeployWorkflow = 'deploy-pages-direct.yml'
const directDeploy = deployWorkflows.find((item) => item.file === expectedDeployWorkflow)
const legacyBranchPublish = deployWorkflows.filter((item) => item.branchPublish)
const legacyPhaseWorkflows = workflowFiles.filter((file) => /^phase-(?:\d+(?:-\d+)?)-validation\.ya?ml$/.test(file))
const redundantPermanentWorkflows = workflowFiles.filter((file) => ['b225-home-validation.yml', 'live-e2e-uat-cleanup.yml'].includes(file))
const permanentCriticalRegression = 'tests/e2e/critical-regressions.spec.js'
const hasPermanentCriticalRegression = fs.existsSync(path.join(root, permanentCriticalRegression))
const qualityWorkflow = read('.github/workflows/quality.yml')
const qualityHasCleanupAudit = /node scripts\/audit-live-cleanup\.mjs/.test(qualityWorkflow)

const report = {
  liveSearch: 'SearchTransitionHost',
  mountedTransitions,
  mountedSearchV2,
  searchImplementations,
  searchFiles,
  expectedSearchFiles,
  retiredSearchFiles,
  unexpectedSearchFiles,
  missingSearchFiles,
  reintroducedRetiredSearchFiles,
  popupUsesSharedGeocoding,
  popupKeepsLegacyFallback,
  cssLayers,
  importantCount,
  deployWorkflows,
  expectedDeployWorkflow,
  legacyPhaseWorkflows,
  legacyPhaseBranchTargets,
  redundantPermanentWorkflows,
  permanentCriticalRegression,
  hasPermanentCriticalRegression,
  qualityHasCleanupAudit,
  workflowsUsingRetiredBase,
  findings: [],
}

if (mountedTransitions !== 1) report.findings.push(`Expected exactly one SearchTransitionHost mount, found ${mountedTransitions}`)
if (mountedSearchV2 !== 0) report.findings.push(`Unexpected SearchExperience mount on live branch: ${mountedSearchV2}`)
if (unexpectedSearchFiles.length) report.findings.push(`Unexpected Search files detected: ${unexpectedSearchFiles.join(', ')}`)
if (missingSearchFiles.length) report.findings.push(`Expected Search files missing: ${missingSearchFiles.join(', ')}`)
if (reintroducedRetiredSearchFiles.length) report.findings.push(`Retired Search files reintroduced: ${reintroducedRetiredSearchFiles.join(', ')}`)
if (!popupUsesSharedGeocoding) report.findings.push('Search popup must use the shared services/geocoding boundary')
if (!popupKeepsLegacyFallback) report.findings.push('Search popup legacy geocoding fallback was removed before migration cleanup approval')
if (cssLayers.length !== 2) report.findings.push(`Expected exactly 2 Search CSS layers, found ${cssLayers.length}: ${cssLayers.join(', ')}`)
if (importantCount > 35) report.findings.push(`High CSS override debt: ${importantCount} !important declarations across Search CSS layers`)
if (deployWorkflows.length !== 1) report.findings.push(`Expected exactly one deployment workflow, found ${deployWorkflows.length}: ${deployWorkflows.map((x) => x.file).join(', ')}`)
if (!directDeploy?.directPages) report.findings.push(`Expected ${expectedDeployWorkflow} to use direct GitHub Pages deployment`)
if (legacyBranchPublish.length) report.findings.push(`Legacy deploy/github-pages publishing detected: ${legacyBranchPublish.map((x) => x.file).join(', ')}`)
if (legacyPhaseWorkflows.length) report.findings.push(`Legacy phase validation workflows detected: ${legacyPhaseWorkflows.join(', ')}`)
if (legacyPhaseBranchTargets.length) report.findings.push(`Legacy phase branch targets detected: ${legacyPhaseBranchTargets.map((x) => `${x.file}:${x.targets.join('|')}`).join(', ')}`)
if (redundantPermanentWorkflows.length) report.findings.push(`Redundant permanent workflows detected: ${redundantPermanentWorkflows.join(', ')}`)
if (!hasPermanentCriticalRegression) report.findings.push(`Permanent critical regression suite missing: ${permanentCriticalRegression}`)
if (!qualityHasCleanupAudit) report.findings.push('Movera Quality Gate is missing the permanent cleanup audit')
if (workflowsUsingRetiredBase.length) report.findings.push(`Workflows still driving the retired ${RETIRED_BASE_PATH} base path: ${workflowsUsingRetiredBase.join(', ')}`)

console.log(JSON.stringify(report, null, 2))

if (
  mountedTransitions !== 1 ||
  mountedSearchV2 !== 0 ||
  unexpectedSearchFiles.length ||
  missingSearchFiles.length ||
  reintroducedRetiredSearchFiles.length ||
  !popupUsesSharedGeocoding ||
  !popupKeepsLegacyFallback ||
  cssLayers.length !== 2 ||
  deployWorkflows.length !== 1 ||
  !directDeploy?.directPages ||
  legacyBranchPublish.length ||
  legacyPhaseWorkflows.length ||
  legacyPhaseBranchTargets.length ||
  redundantPermanentWorkflows.length ||
  !hasPermanentCriticalRegression ||
  !qualityHasCleanupAudit ||
  workflowsUsingRetiredBase.length
) process.exit(1)
