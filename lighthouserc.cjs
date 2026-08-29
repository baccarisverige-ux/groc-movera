module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run preview -- --host 127.0.0.1',
      startServerReadyPattern: 'Local:',
      url: [
        'http://127.0.0.1:4173/Movera-host1/',
        'http://127.0.0.1:4173/Movera-host1/map',
      ],
      numberOfRuns: 1,
      settings: {
        preset: 'desktop',
        chromeFlags: '--no-sandbox --headless=new',
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.65 }],
        'categories:accessibility': ['error', { minScore: 0.8 }],
        'categories:best-practices': ['warn', { minScore: 0.8 }],
        'categories:seo': ['warn', { minScore: 0.75 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.25 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 4500 }],
      },
    },
    upload: { target: 'filesystem', outputDir: './lhci-report' },
  },
}
