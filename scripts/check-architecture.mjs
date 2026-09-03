import { access, readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';

const src = fileURLToPath(new URL('../src/', import.meta.url));
const forbidden = [
  'src/pages/',
  'src/features/search-transition/',
  'src/features/map-carousel/',
  'src/styles/tokens.css',
  'src/features/account/AccountPages.jsx',
  'src/features/host/HostPages.jsx',
  'src/features/listing-detail/listingDetailData.js',
  'src/features/beach/beach-page.css',
  'src/features/beach/beach-page-scale.css',
];
const required = [
  'src/app/router/routes.jsx',
  'src/app/layouts/GuestLayout.jsx',
  'src/features/home/HomePage.jsx',
  'src/features/home/data/homeData.js',
  'src/features/home/assets/all-category-globe.png',
  'src/features/home/assets/appartement-category.png',
  'src/features/home/assets/maison-hote-category.png',
  'src/features/home/assets/partner-category.png',
  'src/features/home/assets/plage-category.png',
  'src/features/home/assets/hotel-category.png',
  'src/features/home/assets/villa-category.png',
  'src/features/home/assets/experience-category.webp',
  'src/features/beach/BeachPage.jsx',
  'src/features/beach/assets/hero.webp',
  'src/features/guesthouse/GuestHousePage.jsx',
  'src/features/guesthouse/assets/hero.webp',
  'src/features/search/SearchTransitionHost.jsx',
  'src/features/search/searchState.js',
  'src/features/host/onboarding/HostPinMap.jsx',
  'src/features/host/onboarding/hostPinReactEngineEnhancer.jsx',
  'src/features/host/onboarding/offer-flows/offerFlowRegistry.js',
  'src/features/host/onboarding/offer-flows/shared/commonOfferFlow.js',
  'src/features/host/onboarding/offer-flows/apartment/apartmentOfferFlow.js',
  'src/features/host/onboarding/offer-flows/villa/villaOfferFlow.js',
  'src/features/host/onboarding/offer-flows/guesthouse/guestHouseOfferFlow.js',
  'src/features/host/onboarding/offer-flows/hotel/hotelOfferFlow.js',
  'src/features/host/onboarding/offer-flows/hotel/hotelOfferVisuals.jsx',
  'src/features/map/MapPage.jsx',
  'src/features/map/constants/map.constants.js',
  'src/features/map-engine/MapContainer.jsx',
  'src/features/map-engine/layers/TileLayer.jsx',
  'src/features/map-engine/layers/MarkerLayer.jsx',
  'src/features/map-engine/layers/ClusterLayer.jsx',
  'src/features/map-engine/controls/MapControls.jsx',
  'src/features/map-engine/lifecycle/ResizeManager.jsx',
  'src/features/map-engine/lifecycle/ViewportController.jsx',
  'src/features/map-engine/geometry/geometry.js',
  'src/features/map-engine/model/markerModel.js',
  'src/services/geocoding/nominatimProvider.js',
  'src/services/geocoding/geocodingService.js',
  'src/services/geocoding/index.js',
  'src/services/storage/storageAdapter.js',
  'src/entities/listing/assets/villa-emeraude.webp',
  'src/shared/collection/CollectionPage.jsx',
  'src/shared/collection/collection-page.css',
  'src/shared/collection/collection-page-scale.css',
  'src/shared/motion/runtime.js',
  'src/shared/motion/MotionList.jsx',
  'src/shared/motion/SnapSheetMotionSurface.jsx',
  'src/styles/tokens/index.css',
  'src/styles/tokens/colors.css',
  'src/styles/tokens/typography.css',
  'src/styles/tokens/spacing.css',
  'src/styles/tokens/radius.css',
  'src/styles/tokens/shadows.css',
  'src/styles/tokens/motion.css',
  'src/styles/tokens/z-index.css',
  'src/styles/tokens/breakpoints.css',
];

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else files.push(path);
  }
  return files;
}

const violations = [];
for (const requiredPath of required) {
  try { await access(new URL(`../${requiredPath}`, import.meta.url)); }
  catch { violations.push(`${requiredPath}: required architecture file missing`); }
}

const files = await walk(src);
for (const file of files) {
  const repoPath = `src/${relative(src, file).replaceAll('\\', '/')}`;
  for (const legacy of forbidden) {
    if (legacy.endsWith('/') && `${repoPath}/`.startsWith(legacy)) violations.push(`${repoPath}: legacy path`);
    if (!legacy.endsWith('/') && repoPath === legacy) violations.push(`${repoPath}: retired file`);
  }
  if (!/\.(js|jsx|mjs|css)$/.test(file)) continue;
  const text = await readFile(file, 'utf8');

  if (/data:image\//i.test(text)) {
    violations.push(`${repoPath}: embedded image data; store page media in its owning assets folder`);
  }

  for (const legacy of forbidden.filter(item => item.endsWith('/') && item !== 'src/pages/')) {
    const fragment = legacy.replace(/^src\//, '');
    if (text.includes(fragment)) violations.push(`${repoPath}: references ${fragment}`);
  }

  if (/^src\/features\//.test(repoPath) && /(?:\.\.\/)+[^'\"]*features\//.test(text)) {
    violations.push(`${repoPath}: feature-to-feature internal import; use entities/shared/services or a public boundary`);
  }
  if (repoPath.startsWith('src/features/') && text.includes('localStorage.')) {
    violations.push(`${repoPath}: direct localStorage access; use services/storage/storageAdapter.js`);
  }
  if ((repoPath.startsWith('src/entities/') || repoPath.startsWith('src/services/') || repoPath.startsWith('src/shared/')) && text.includes('/features/')) {
    violations.push(`${repoPath}: lower-level layer must not import from features`);
  }

  const importsMotionPackage = /from\s+['"]motion(?:\/react)?['"]/.test(text);
  if (importsMotionPackage && repoPath !== 'src/shared/motion/runtime.js') {
    violations.push(`${repoPath}: direct Motion package import; use src/shared/motion/runtime.js`);
  }
}

const onboardingModel = await readFile(new URL('../src/features/host/onboarding/hostOnboardingModel.js', import.meta.url), 'utf8');
if (onboardingModel.includes('hostHotelAmenitiesModel') || onboardingModel.includes('HOTEL_LISTING_HIGHLIGHTS')) {
  violations.push('hostOnboardingModel.js: category-specific Hotel rules must live in offer-flows/hotel');
}

const onboardingPage = await readFile(new URL('../src/features/host/onboarding/HostOnboardingPage.jsx', import.meta.url), 'utf8');
if (!onboardingPage.includes('getOfferFlow(draft.propertyType)')) {
  violations.push('HostOnboardingPage.jsx: common orchestrator must resolve category rules through offerFlowRegistry');
}
if (onboardingPage.includes('supportsPooledRoomInventory') || onboardingPage.includes('HOST_HOTEL_HIGHLIGHTS')) {
  violations.push('HostOnboardingPage.jsx: category business rules leaked back into the common orchestrator');
}

const indexHtml = await readFile(new URL('../index.html', import.meta.url), 'utf8');
if (/data:image\//i.test(indexHtml)) {
  violations.push('index.html: embedded image data; use a separate bootstrap asset');
}

if (violations.length) {
  console.error('Architecture guard failed:\n' + violations.map(v => `- ${v}`).join('\n'));
  process.exit(1);
}

console.log(`Architecture guard passed: ${required.length} required boundaries present, page media externalized, retired paths absent, storage centralized, Motion has one runtime entrypoint, and lower-level layers independent from features.`);
