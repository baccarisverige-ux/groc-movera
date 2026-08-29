# Movera Host

Frontend mobile-first de Movera Host, construit avec React et Vite.

## Développement

```bash
npm ci
npm run dev
```

## Validation

```bash
npm run lint
npm run quality:architecture
npm run test:unit
npm run build
npm run quality:bundle
npm run test:e2e
npm run test:a11y
```

Le gate CI principal est `.github/workflows/quality.yml`. Les contrôles Search dédiés et CodeQL restent séparés.

## Structure principale

- `src/` — application et fonctionnalités
- `public/` — assets publics utilisés par l'application
- `tests/` — tests unitaires, E2E, responsive et accessibilité
- `scripts/` — contrôles d'architecture, budget bundle et audit de nettoyage

Branche de travail actuelle : `b225-ui-home`.
