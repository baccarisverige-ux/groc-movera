# Final host offer architecture audit

Final architecture boundary verified on 2026-09-03 after commit `1bc1a1abadc73517ebe188c9ee3e7e1210dbf91b`.

Validated boundaries:
- each supported property category owns its offer-flow policy;
- Hotel owns its room-access options, Hotel amenities, Hotel highlights, 5–20 room-category photo policy, copy and presentation;
- Maison d’hôte owns its room-access options and room-inventory offer policy;
- Appartement and Villa remain independent single-property flows;
- shared onboarding and hospitality enhancers consume the generic `offerFlowRegistry` contract and do not decide category behavior;
- the obsolete root `hostHotelAmenitiesModel.js` wrapper is removed;
- architecture guard blocks category-policy leakage back into shared orchestration.

Validation passed: architecture guard, lint, unit suite, production build, bundle budgets, Hospitality E2E on mobile Chromium, and Hospitality E2E on WebKit.
