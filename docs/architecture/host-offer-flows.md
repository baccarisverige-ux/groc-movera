# Host offer creation architecture

Each property category owns its offer-creation business rules. The common onboarding page is an orchestrator only.

## Category modules

- `src/features/host/onboarding/offer-flows/apartment/apartmentOfferFlow.js` — Appartement
- `src/features/host/onboarding/offer-flows/villa/villaOfferFlow.js` — Villa
- `src/features/host/onboarding/offer-flows/guesthouse/guestHouseOfferFlow.js` — Maison d’hôte
- `src/features/host/onboarding/offer-flows/hotel/hotelOfferFlow.js` — Hôtel
- `src/features/host/onboarding/offer-flows/hotel/hotelOfferVisuals.jsx` — Hôtel-specific presentation adapter
- `src/features/host/onboarding/offer-flows/hotel/hotel-amenities.css` and `hotel-highlights.css` — Hôtel-owned styles

`offerFlowRegistry.js` is the only selector used by the common onboarding orchestrator.

## Shared boundary

`shared/commonOfferFlow.js` contains defaults shared by all categories: common screens, common guest-access options, common amenities, common highlights and default validation limits.

A category may override its own:

- room inventory support;
- photo policy;
- amenities and amenity groups;
- highlight groups and selection limits;
- category-specific copy;
- category-specific presentation adapter (variant, symbols, icons and styles);
- hospitality room-access policy, copy and allowed options when applicable.

## Hospitality rules

- Appartement: single-property offer; 5–20 listing photos.
- Villa: single-property offer; 5–20 listing photos.
- Maison d’hôte: supports room-category inventory when the stay mode uses rooms.
- Hôtel: room-category inventory; 5–20 photos per room category; Hotel-only amenities; unlimited selected Hotel highlight badges.

## Architecture contract

`scripts/check-architecture.mjs` requires every category module and rejects Hotel business or presentation rules leaking back into `hostOnboardingModel.js`, the common `HostOnboardingPage.jsx` orchestrator, or `hostRoomProfessionalFlow.js`. The professional room flow resolves photo limits from `getOfferFlow(...).photoPolicy`; it does not own Hotel constants.

`tests/unit/hostOfferFlowRegistry.test.js` verifies that every supported property type resolves to its own flow and that Hotel/Maison d’hôte room inventory remains isolated from Appartement/Villa.
## Policy / engine rule

Category modules own category decisions and wording. Shared enhancers (`hostHospitalityGuestAccessEnhancer.js`, `hostRoomTypesOnboardingEnhancer.js`, `hostRoomProfessionalFlow.js`) only render or execute generic mechanics from the active `offerFlowRegistry` contract. No Hotel-only model wrapper is allowed at the onboarding root.
