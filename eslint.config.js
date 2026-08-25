const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  js.configs.recommended,
  {
    ignores: [
      'node_modules/',
      '.claude/',
      'v2/',
      'functions/',
      'public/',
      'dist/',
      '*.lock',
      'coverage/',
      // Orphaned pre-content-site/public-split source tree — not referenced by
      // any build script, not deployed (public/ is the deploy root), stale
      // since 2026-08-04 and drifted from the real content-site/public copies.
      'tools/',
      // No package.json/tsconfig.json of its own, not referenced by deploy.yml
      // or firebase.json, stale since 2026-08-04 — can't build standalone from
      // here. The real curator.cyberscryb.com app likely lives elsewhere;
      // this looks like an abandoned copy, not something to guess a TS-parser
      // config for.
      'curator-prime/',
    ],
  },
  {
    files: ['**/*.js', '**/*.jsx'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        ...globals.jest,
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
      // Every current no-empty violation is a deliberate `catch {}` swallowing
      // localStorage exceptions (private browsing, quota, disabled storage) —
      // a consistent, intentional pattern across the shared tool code.
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  {
    files: ['content-site/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        ...globals.browser,
        // Loaded via separate <script> tags in the HTML these files ship with
        gtag: 'readonly',
        mixpanel: 'readonly',
        MIXPANEL_CUSTOM_LIB_URL: 'readonly',
        LifeTool: 'readonly',
      },
    },
  },
  {
    // detector.js *defines* AIDetector — declaring it a global here too would
    // collide with that definition (no-redeclare). app.js only consumes it.
    files: ['content-site/tools/ai-writing-suite/app.js'],
    languageOptions: {
      globals: {
        AIDetector: 'readonly',
      },
    },
  },
  {
    files: ['__tests__/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        ...globals.jest,
        // Several tests load browser tool scripts under jsdom
        ...globals.browser,
      },
    },
  },
  {
    // Playwright screenshot capture — Node module scope plus browser-context
    // callbacks passed to context.addInitScript()/page.evaluate().
    files: ['scripts/capture-product-shots.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    rules: {
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  {
    files: ['distill-extension/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: {
        ...globals.browser,
        ...globals.webextensions,
      },
    },
  },
  {
    files: ['cloudflare-worker/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.serviceworker,
        ...globals.es2022,
      },
    },
  },
  {
    files: ['v2/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2022,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
  },
];
