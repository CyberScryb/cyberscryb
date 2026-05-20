# Technology Stack

**Analysis Date:** 2026-05-20

## Languages

**Primary:**
- JavaScript (ES6+) — all frontend and backend code; no TypeScript, no transpilation
- HTML5 — all page templates written by hand
- CSS3 — single global stylesheet with no preprocessor

**Secondary:**
- JSON — config files (`firebase.json`, `.firebaserc`, `firestore.indexes.json`)

## Runtime

**Environment:**
- Node.js 20 (specified in `functions/package.json` → `engines.node: "20"`)
- GitHub Actions runner: `ubuntu-latest`

**Package Manager:**
- npm (root project + `functions/`)
- Root lockfile: present (`package-lock.json`)
- Functions lockfile: present (`functions/package-lock.json`)

## Frameworks

**Core (Backend):**
- Firebase Functions v6.3.2 — serverless Cloud Functions runtime (`functions/package.json`)
- firebase-admin v13.0.0 — Firestore access from Cloud Functions (`functions/package.json`)
- cors v2.8.5 — CORS middleware for all Cloud Function endpoints (`functions/package.json`)

**Frontend:**
- No framework. Vanilla JS only. No React, Vue, Angular, or build step.
- All pages are static HTML rendered server-side by Firebase Hosting.

**Testing:**
- jest v30.3.0 — test runner (root `package.json` devDependencies)
- jest-environment-jsdom v30.3.0 — browser environment simulation for jest

**Build/Dev:**
- No build step. Files in `public/` are deployed as-is.
- `generate-pages.js` — custom Node.js script that generates SEO guide pages (not a build framework)
- Firebase CLI (installed globally in CI via `npm install -g firebase-tools`)

## Key Dependencies

**Critical (functions/):**
- `firebase-functions` v6.3.2 — Cloud Functions SDK; all four exported functions use `functions.https.onRequest()`
- `firebase-admin` v13.0.0 — Firestore client; used in `subscribeEmail` to store subscribers
- `cors` v2.8.5 — applied to every Cloud Function endpoint

**Dev only (root):**
- `jest` v30.3.0 — unit testing
- `jest-environment-jsdom` v30.3.0 — DOM testing environment

**No frontend dependencies** — zero npm packages loaded in the browser. All third-party browser code loads from CDNs.

## Configuration

**Environment (Cloud Functions):**
- Google AI API key stored in Firebase Functions config: `functions.config().google.api_key`
- Fallback env var: `process.env.GOOGLE_API_KEY`
- Set via: `firebase functions:config:set google.api_key="YOUR_KEY"`
- Firebase token for CI stored in GitHub Actions secret: `FIREBASE_TOKEN`

**Hosting (`firebase.json`):**
- `cleanUrls: true` — strips `.html` extensions from URLs
- `trailingSlash: true` — all URLs end with `/`
- Static assets (`/css/**`, `/js/**`, `**/*.svg`) cached 1 year (`max-age=31536000, immutable`)
- HTML pages: no cache (`max-age=0, must-revalidate`)
- CSP header applied to all `**/*.html` pages
- Security headers: `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`

**Firebase project:**
- Project ID: `gen-lang-client-0384486156`
- Firestore location: `nam5` (North America multi-region)
- Firestore database: `(default)`

**Build:**
- No build config files (no webpack, vite, rollup, etc.)
- CI config: `.github/workflows/deploy.yml`

## Platform Requirements

**Development:**
- Node.js 20+
- Firebase CLI (`npm install -g firebase-tools`)
- Local Firebase login saved (no token needed locally)
- Google Cloud API key with Gemini API access

**Production:**
- Firebase Hosting (static files from `public/`)
- Google Cloud Functions (Node.js 20 runtime)
- Cloudflare as CDN layer in front of Firebase Hosting
- GitHub Actions for CI/CD (auto-deploys hosting + functions on push to `main`)

**Deployment constraints:**
- Google Cloud API returns 403 from Claude Code web environment — deploy only via GitHub Actions or local Firebase CLI
- Functions deploy requires `npm install` in `./functions` first (handled by CI workflow)

---

*Stack analysis: 2026-05-20*
