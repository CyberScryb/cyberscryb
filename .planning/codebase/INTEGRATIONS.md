# External Integrations

**Analysis Date:** 2026-05-20

## APIs & External Services

**AI Generation:**

- Google Gemini API — powers all AI tools on the site
  - Model: `gemini-3.1-pro-preview` (CRITICAL: must use `-preview` suffix; stable name returns 404)
  - API endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent`
  - Auth: API key via `functions.config().google.api_key` or `process.env.GOOGLE_API_KEY`
  - Used by: all four Cloud Functions in `functions/index.js`
  - Billing: $10 prepaid + $100 cap on Google Cloud account
  - Rate limits enforced server-side: 10 req/IP/min, 500 req/day global cap (in-memory, resets on cold start)

**Affiliate Networks:**

- Commission Junction (CJ Affiliate) — affiliate tracking pixel
  - Publisher ID: `101754535`
  - Script: `https://www.anrdoezrs.net/am/101754535/include/allCj/impressions/page/am.js`
  - Loaded deferred (3s after load or on first user interaction) in `public/js/script.js`
  - CSP allows: `https://www.anrdoezrs.net`, `https://www.dpbolvw.net`, `https://www.kqzyfj.com`
  - Note: Affiliate panel has placeholder URLs — real links pending Nate's application approval

## Data Storage

**Databases:**

- Google Cloud Firestore
  - Project: `gen-lang-client-0384486156`
  - Database: `(default)`
  - Region: `nam5` (North America multi-region)
  - Client: `firebase-admin` v13.0.0 (server-side only, in Cloud Functions)
  - Current usage: `subscribers` collection only (email capture)
  - Schema: `{ email, source, subscribedAt (serverTimestamp), ip }`
  - Rules file: `firestore.rules`
  - Indexes file: `firestore.indexes.json`

**File Storage:**

- Firebase Hosting static file delivery only — no object storage (no S3, GCS buckets, etc.)

**Caching:**

- Cloudflare CDN caching (layer in front of Firebase Hosting)
- Firebase Hosting browser caching: 1 year for `/css/**`, `/js/**`, `**/*.svg`; no-cache for HTML

## Authentication & Identity

**Auth Provider:**

- None — no user login system. No Firebase Auth, no OAuth.
- AI tools use email gate (cookie-based, not server-authenticated):
  - `cs_subscribed=1` cookie set after email submission via `subscribeEmail` Cloud Function
  - Managed in `public/tools/shared/ai-tool.js` (`CSAITool.init()`)
  - Free tier: 3 uses/day per tool (tracked in `localStorage`), 500-char input limit
  - Subscribed users: unlimited usage, full output visible

**Pro Tier:**

- Stripe payment integration planned but not implemented
- Pro buttons currently link to `#` (placeholder)
- Monthly ($5) and annual ($29) price points defined but no Stripe links wired up

## Analytics & Monitoring

**Web Analytics:**

- Google Analytics 4
  - Measurement ID: `G-73LQZEDNR6`
  - Tag Manager script: `https://www.googletagmanager.com/gtag/js?id=G-73LQZEDNR6`
  - Loaded deferred: 1.5s after page load (async, non-blocking)
  - Cookie consent respected: `localStorage.getItem('cs_cookie_consent') === 'declined'` disables GA4
  - Custom events tracked in `public/js/script.js`: `affiliate_click`, `tool_launch`, `newsletter_signup`

**Search Console:**

- Google Search Console verified via meta tag: `40UhuvQCBj2dtn1E2FNte0dCBASfDc91zI-FTjEKQ24`
- Present in `public/index.html` head

**Error Tracking:**

- None — no Sentry, Datadog, or similar. Cloud Function errors log to Firebase/Google Cloud Logging only (`console.error`).

**Logs:**

- Cloud Functions: Firebase Functions log (`firebase functions:log`)
- Hosting: Firebase Hosting access logs

## Advertising

**Google AdSense:**

- Publisher ID: `ca-pub-5721233331247292`
- Script: `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5721233331247292`
- Loaded deferred: 2.5s after load OR on first user interaction (whichever comes first) — protects LCP
- Status as of 2026-05-20: re-review submitted ~May 14 2026 after initial denial; awaiting approval
- CSP allows: `https://pagead2.googlesyndication.com`, `https://googleads.g.doubleclick.net`, `https://www.google.com`
- Each AI tool page has 2 AdSense units

## CDN & Infrastructure

**Cloudflare:**

- Acts as CDN/proxy in front of Firebase Hosting
- Cloudflare AI Chatbot widget active on every page
  - Widget ID: `722da820-be39-4721-bc14-4e498d45d78b`
  - Script: `https://722da820-be39-4721-bc14-4e498d45d78b.search.ai.cloudflare.com/assets/v0.0.30/search-snippet.es.js`
  - Custom element: `<chat-bubble-snippet>`
  - Loaded deferred: 3s after page load (in `public/js/script.js`)
  - Styled to match dark theme via injected CSS custom properties
- OWASP Core Ruleset: enabled (can block requests pasting JSON/code into tool inputs — known tradeoff)
- Cloudflare Turnstile: active (caused challenge loop on Nate's PC due to NextDNS; not a site issue)

**Firebase Hosting:**

- Serves static files from `public/` directory
- URL rewrites route `/api/*` paths to Cloud Functions:
  - `GET/POST /api/rewrite` → `rewriteText` function
  - `GET/POST /api/gig` and `/api/gig-work` → `generateGigWork` function
  - `GET/POST /api/subscribe` → `subscribeEmail` function
  - `GET/POST /api/ai-generate` → `generateAI` function

## Fonts

**Google Fonts:**

- Families loaded: `Orbitron` (weights 700, 900) + `Inter` (weights 400, 500, 600)
- URL: `https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Inter:wght@400;500;600&display=swap`
- Loaded async via `<link rel="preload" as="style" onload="...">` to avoid render-blocking
- Preconnect hints for `fonts.googleapis.com` and `fonts.gstatic.com` in every page head

## CI/CD & Deployment

**Hosting:**

- Firebase Hosting (primary)
- Domain: `cyberscryb.com` (via Cloudflare DNS)
- Fallback domain: `gen-lang-client-0384486156.web.app`

**CI Pipeline:**

- GitHub Actions — `.github/workflows/deploy.yml`
- Trigger: push to `main` branch
- Steps: checkout → Node.js 20 setup → install Firebase CLI → `npm install` in `./functions` → `firebase deploy --only hosting,functions`
- Auth: `FIREBASE_TOKEN` secret stored in GitHub repository secrets
- Deploy time: 3–5 minutes after push

**Repository:**

- GitHub: `https://github.com/CyberScryb/cyberscryb`

## Email & Notifications

**Email Service:**

- No transactional email provider (no SendGrid, Mailgun, Postmark, etc.)
- Email addresses collected via Firestore only — no automated welcome email or drip sequence
- Contact form at `public/contact.html` — no backend handler visible; appears to be a static form

## SEO & Structured Data

**Schema.org:**

- `WebSite` JSON-LD on homepage
- `Organization` JSON-LD on homepage
- `SoftwareApplication` + `BreadcrumbList` JSON-LD on tool pages (required pattern)
- Open Graph and Twitter Card meta tags on all pages

**Sitemaps:**

- `public/sitemap.xml` — manually maintained; must be updated when adding new tools
- `public/feed.xml` — RSS feed for guides
- `public/robots.txt` — present

## Security

**API Security (Cloud Functions):**

- Referer validation: `new URL(referer).hostname` checked against allowlist (`cyberscryb.com`, `www.cyberscryb.com`, `localhost`, `gen-lang-client-0384486156.web.app`) — implemented in `functions/index.js`
- Rate limiting: in-memory per-IP (10/min) and global daily cap (500/day) — `functions/index.js`
- Input length cap: 5000 characters max for `generateAI` endpoint

**Frontend:**

- `crypto.getRandomValues()` used for security-sensitive operations (password generator tools)
- CSP header restricts script/style/connect sources to known domains
- `X-Frame-Options: SAMEORIGIN` prevents clickjacking
- `X-Content-Type-Options: nosniff` prevents MIME sniffing

---

_Integration audit: 2026-05-20_
