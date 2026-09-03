# Host offer creation architecture

Each property category owns its offer-creation business rules. The common onboarding page is an orchestrator only.

## Category modules

- `src/features/host/onboarding/offer-flows/apartment/apartmentOfferFlow.js` — Appartement
- `src/features/host/onboarding/offer-flows/villa/villaOfferFlow.js` — Villa
- `src/features/host/onboarding/offer-flows/guesthouse/guestHouseOfferFlow.js` — Maison d’hôte
- `src/features/host/onboarding/offer-flows/hotel/hotelOfferFlow.js` — Hôtel
- `src/features/host/onboarding/offer-flows/hotel/hotelOfferVisuals.jsx` — Hôtel-specific presentation assets

`offerFlowRegistry.js` is the only selector used by the common onboarding orchestrator.

## Shared boundary

`shared/commonOfferFlow.js` contains defaults shared by all categories: common screens, common guest-access options, common amenities, common highlights and default validation limits.

A category may override its own:

- room inventory support;
- photo policy;
- amenities and amenity groups;
- highlight groups and selection limits;
- category-specific copy.

## Hospitality rules

- Appartement: single-property offer; 5–20 listing photos.
- Villa: single-property offer; 5–20 listing photos.
- Maison d’hôte: supports room-category inventory when the stay mode uses rooms.
- Hôtel: room-category inventory; 5–20 photos per room category; Hotel-only amenities; unlimited selected Hotel highlight badges.

## Architecture contract

`scripts/check-architecture.mjs` requires every category module and rejects Hotel business rules leaking back into `hostOnboardingModel.js` or the common `HostOnboardingPage.jsx` orchestrator.

`tests/unit/hostOfferFlowRegistry.test.js` verifies that every supported property type resolves to its own flow and that Hotel/Maison d’hôte room inventory remains isolated from Appartement/Villa.