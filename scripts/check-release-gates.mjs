import { readFile } from 'node:fs/promises'

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

const pkg = JSON.parse(await read('package.json'))
const playwright = await read('playwright.config.mjs')
const quality = await read('.github/workflows/quality.yml')
const deploy = await read('.github/workflows/deploy-pages-direct.yml')

const violations = []
const requiredScripts = [
  'test:unit',
  'test:integration',
  'test:e2e:chromium',
  'test:e2e:webkit',
  'test:responsive',
  'test:map-regressions',
  'quality:architecture',
]
const requiredProjects = [
  'desktop-chromium',
  'mobile-chromium',
  'desktop-webkit',
  'mobile-webkit',
]

for (const script of requiredScripts) {
  if (!pkg.scripts?.[script]) violations.push(`package.json: required release script missing: ${script}`)
}

for (const project of requiredProjects) {
  if (!playwright.includes(`name: '${project}'`)) {
    violations.push(`playwright.config.mjs: required browser project missing: ${project}`)
  }
  if (!quality.includes(project)) {
    violations.push(`quality.yml: release matrix no longer covers ${project}`)
  }
}

for (const token of [
  'test:integration',
  'test:map-regressions',
  'responsive-baseline.spec.js',
  'audit-live-cleanup.mjs',
  'quality:architecture',
]) {
  if (!quality.includes(token)) violations.push(`quality.yml: permanent release gate missing: ${token}`)
}

if (!/^\s*workflow_run:\s*$/m.test(deploy)) {
  violations.push('deploy-pages-direct.yml: Pages must be triggered by workflow_run')
}
if (!deploy.includes('Movera Quality Gate')) {
  violations.push('deploy-pages-direct.yml: Pages must depend on Movera Quality Gate')
}
if (!deploy.includes("github.event.workflow_run.conclusion == 'success'")) {
  violations.push('deploy-pages-direct.yml: successful quality conclusion guard is required')
}
if (!deploy.includes('github.event.workflow_run.head_sha')) {
  violations.push('deploy-pages-direct.yml: deployment must pin the tested workflow head SHA')
}
if (/^\s{2}push:\s*$/m.test(deploy)) {
  violations.push('deploy-pages-direct.yml: direct push-triggered Pages deployment is forbidden')
}
if (/^\s{2}workflow_dispatch:\s*$/m.test(deploy)) {
  violations.push('deploy-pages-direct.yml: manual deployment bypass is forbidden')
}
if (/AIza[0-9A-Za-z_-]{20,}/.test(deploy)) {
  violations.push('deploy-pages-direct.yml: hard-coded Google Maps API key detected')
}
if (/VITE_GOOGLE_MAPS_API_KEY:[^\n]*\|\|/.test(deploy)) {
  violations.push('deploy-pages-direct.yml: secret fallback bypass is forbidden')
}

if (violations.length) {
  console.error('Release architecture guard failed:\n' + violations.map((violation) => `- ${violation}`).join('\n'))
  process.exit(1)
}

console.log('Release architecture guard passed: unit/integration/browser/responsive/Map gates are permanent and Pages is pinned to a successful tested main SHA.')
