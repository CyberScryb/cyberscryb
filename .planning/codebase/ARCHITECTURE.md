<!-- refreshed: 2026-05-20 -->

# Architecture

**Analysis Date:** 2026-05-20

## System Overview

```text
┌──────────────────────────────────────────────────────────────────────────┐
│                        Browser / User                                    │
└────────────────────────────┬─────────────────────────────────────────────┘
                             │ HTTPS
                             ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                     Cloudflare CDN                                       │
│  - OWASP Core Ruleset (WAF enabled)                                      │
│  - AI Chatbot: 722da820-be39-4721-bc14-4e498d45d78b.search.ai.cloudflare │
└────────────────────────────┬─────────────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────────────┐
│               Firebase Hosting (project: gen-lang-client-0384486156)     │
│  public/ → served as static files                                        │
│  cleanUrls: true   trailingSlash: true                                   │
│  Cache: CSS/JS/SVG = 1 year immutable; HTML = no-cache                   │
│                                                                          │
│  Rewrites (firebase.json):                                               │
│  /api/rewrite    → Cloud Function: rewriteText                           │
│  /api/gig        → Cloud Function: generateGigWork                       │
│  /api/gig-work   → Cloud Function: generateGigWork (alias)               │
│  /api/ai-generate → Cloud Function: generateAI                           │
│  /api/subscribe  → Cloud Function: subscribeEmail                        │
└──────────────┬───────────────────────────────┬───────────────────────────┘
               │                               │
               ▼                               ▼
┌──────────────────────────┐    ┌──────────────────────────────────────────┐
│   Static Frontend        │    │   Cloud Functions (Node 20)              │
│   public/                │    │   functions/index.js                     │
│   - Vanilla HTML/CSS/JS  │    │                                          │
│   - No build step        │    │  exports.rewriteText     (humanizer)     │
│   - No framework         │    │  exports.generateGigWork (gig-auto-pilot)│
│                          │    │  exports.generateAI      (14 AI tools)   │
│                          │    │  exports.subscribeEmail  (email capture) │
└──────────────────────────┘    └──────────────┬───────────────────────────┘
                                               │
                              ┌────────────────┴───────────────┐
                              │                                │
                              ▼                                ▼
               ┌──────────────────────────┐   ┌───────────────────────────┐
               │  Google Gemini API       │   │  Firebase Firestore        │
               │  gemini-3.1-pro-preview  │   │  Collection: subscribers  │
               │  v1beta endpoint         │   │  (email capture storage)  │
               └──────────────────────────┘   └───────────────────────────┘
```

## Component Responsibilities

| Component            | Responsibility                                                  | File                                     |
| -------------------- | --------------------------------------------------------------- | ---------------------------------------- |
| Firebase Hosting     | Serve static assets, route /api/* to functions                  | `firebase.json`                          |
| Cloud Functions      | AI generation, email subscription, rate limiting                | `functions/index.js`                     |
| CSAITool (shared JS) | Email gate, usage tracking, typewriter output, API calls        | `public/tools/shared/ai-tool.js`         |
| email-capture.js     | Passive email bar injected into guide/tool pages                | `public/tools/shared/email-capture.js`   |
| affiliate-panel.js   | Contextual affiliate recommendations per tool                   | `public/tools/shared/affiliate-panel.js` |
| script.js            | Global nav, GA4 events, Cloudflare chatbot loader, CJ Affiliate | `public/js/script.js`                    |
| generate-pages.js    | Node script that generates all guide HTML from page data        | `generate-pages.js`                      |
| GitHub Actions       | CI/CD: deploy hosting + functions on push to main               | `.github/workflows/deploy.yml`           |

## Pattern Overview

**Overall:** Server-rendered static site with serverless backend functions

**Key Characteristics:**

- No build step, no bundler, no framework — vanilla HTML/CSS/JS deployed directly
- All AI processing happens server-side in Cloud Functions; browser only POSTs inputs and renders results
- Frontend consumes a single generic endpoint (`/api/ai-generate`) for all 14 AI tools, differentiated by a `tool` param
- Guide pages are code-generated by a Node script (`generate-pages.js`) from a data array — not authored individually
- Revenue relies on AdSense (deferred load), affiliate links, and a planned Stripe Pro tier

## Layers

**Static Hosting Layer:**

- Purpose: Serve all HTML, CSS, JS, SVG directly to browser
- Location: `public/`
- Contains: Tool pages, blog posts, guides, global CSS, global JS
- Depends on: Firebase Hosting, Cloudflare CDN
- Used by: End users via browser

**Shared Frontend Layer:**

- Purpose: Common behavior reused across all AI tool pages
- Location: `public/tools/shared/`
- Contains: `ai-tool.js` (email gate + API caller), `email-capture.js` (subscription bar), `affiliate-panel.js` (contextual recommendations), `ai-tool.css`, `email-capture.css`
- Depends on: `/api/ai-generate`, `/api/subscribe`
- Used by: All AI tool pages via `<script src="../shared/ai-tool.js">`

**Cloud Functions Layer:**

- Purpose: Secure AI calls, email capture, rate limiting
- Location: `functions/index.js`
- Contains: 4 exported HTTP functions, `AI_PROMPTS` object with 14 tool configs, in-memory rate limiter
- Depends on: Google Gemini API, Firebase Firestore, `firebase-functions`, `firebase-admin`, `cors`
- Used by: Frontend via `/api/*` rewrites in `firebase.json`

**Data Layer:**

- Purpose: Persist subscriber emails
- Location: Firebase Firestore, collection `subscribers`
- Used by: `subscribeEmail` Cloud Function only

## Data Flow

### AI Tool Request Path

1. User fills form and clicks "Generate" — handled in `public/tools/shared/ai-tool.js` (`generateBtn` click handler)
2. `CSAITool` collects `input` + `params` via `config.collectInput()` / `config.collectParams()` (per-tool)
3. `fetch('/api/ai-generate', { method: 'POST', body: { tool, input, params } })` — routed by Firebase Hosting rewrite
4. Cloud Function `generateAI` in `functions/index.js`:
   - Validates referer against `ALLOWED_HOSTS`
   - Checks in-memory rate limit (10 req/IP/min, 500 global/day)
   - Looks up `AI_PROMPTS[tool]`, calls `.build(input, params)` to construct prompt
   - POSTs to `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview:generateContent`
   - Returns `{ result, tool }` as JSON
5. Frontend receives result; if user is anonymous and already used free trial → `showPreviewWithGate()`, else `showFullResult()` with typewriter animation
6. Email gate: on submit, `fetch('/api/subscribe')` → `subscribeEmail` function stores email in Firestore → sets `cs_subscribed=1` cookie → `unlockFullResult()`

### Email Subscription Flow (passive bar)

1. `email-capture.js` checks `localStorage('cs_email_subscribed')` — skips if already subscribed
2. Injects subscription bar before `<footer>` DOM element
3. On submit: `fetch('/api/subscribe', { email, source: 'email_bar' })`
4. On success: sets `localStorage('cs_email_subscribed')`, hides form

### Humanizer-Specific Flow

- Uses a separate Cloud Function `rewriteText` (not `generateAI`)
- Endpoint: `/api/rewrite` → `functions/index.js` `exports.rewriteText`
- Uses `gemini-3.1-pro-preview` directly (not the `AI_PROMPTS` dispatch table)
- Has same referer check and rate limiting

### Guide Page Generation (build-time)

1. Run `node generate-pages.js` locally
2. Script reads `pages[]` array (21 SEO guide definitions) and generates HTML for each
3. Writes output to both `content-site/guides/` and `public/guides/`
4. Also regenerates `public/sitemap.xml`
5. Commit and push to trigger deploy

**State Management:**

- Per-user AI usage: `localStorage` keyed by `cs_{toolId}_usage` (date + count)
- Subscription state: cookie `cs_subscribed=1` (365 days) + `localStorage('cs_email_subscribed')`
- Free trial tracking: `localStorage('cs_free_trial_used')` (one free full result before gate)
- Rate limiting: in-memory `rateLimitStore` object in Cloud Function (resets on cold start)

## Key Abstractions

**CSAITool:**

- Purpose: Unified email gate + API caller reused by all 14 AI tool pages
- Examples: `public/tools/summarizer/summarizer.js`, `public/tools/email-writer/email-writer.js`
- Pattern: Each tool calls `window.CSAITool.init({ toolId, collectInput, collectParams, onStats })` with tool-specific config

**AI_PROMPTS dispatch table:**

- Purpose: Add a new AI tool without touching routing — just add a key to the object
- Location: `functions/index.js` lines 228-548
- Pattern: `{ toolId: { model: '...', build: (input, params) => promptString } }`

**generate-pages.js data-driven generation:**

- Purpose: 21 SEO guides generated from a `pages[]` data array with a single HTML template function
- Pattern: Each page object has `slug`, `title`, `h1`, `sections[]`, `faqs[]`, `citations[]`
- Output: `public/guides/{slug}.html` with full JSON-LD (Article + FAQPage + SoftwareApplication)

## Entry Points

**Homepage:**

- Location: `public/index.html`
- Uses absolute paths for all assets (`/css/style.css`, `/js/script.js`, `/favicon.svg`)

**Tool Pages:**

- Location: `public/tools/{tool-name}/index.html`
- Use relative paths 2 levels up: `../../css/style.css`, `../../js/script.js`
- Load shared JS: `../shared/ai-tool.js`, `../shared/affiliate-panel.js`
- Load tool-specific JS last: `./{tool-name}.js` or `./script.js`

**Cloud Functions:**

- Location: `functions/index.js`
- Triggered by: HTTP rewrites in `firebase.json`

**CI/CD:**

- Location: `.github/workflows/deploy.yml`
- Triggers: push to `main` branch
- Steps: checkout → Node 20 → `npm install` in `./functions` → `firebase deploy --only hosting,functions`

## Architectural Constraints

- **No build step:** All JS is served as-is. No TypeScript, no bundler, no transpilation.
- **Threading:** Cloud Functions are single-threaded Node.js; rate limiter state is in-memory and resets on cold start.
- **Global state in functions:** `rateLimitStore`, `globalDailyCount`, and `globalDayReset` are module-level variables in `functions/index.js`. They reset on cold start — by design for abuse prevention.
- **Trailing slash + clean URLs:** `firebase.json` `cleanUrls: true` + `trailingSlash: true`. Root-level pages MUST use absolute paths (`/css/style.css`). Tool pages use `../../css/style.css` (two directories deep).
- **No Stripe wiring:** Pro tier buttons link to `/pro.html`, not a payment processor. Stripe is not connected.
- **No circular imports:** All JS files are independent scripts loaded sequentially via `<script>` tags.

## Anti-Patterns

### Inconsistent error response format in rewriteText

**What happens:** `exports.rewriteText` in `functions/index.js` (lines 147, 219) returns `res.status(500).send(string)` in some error branches instead of `res.status(500).json({ error: ... })`.
**Why it's wrong:** The frontend (`CSAITool`) calls `response.json()` and crashes when it receives plain text. Causes "Request failed" with no useful error to the user.
**Do this instead:** Always use `res.status(N).json({ error: 'message' })` — as `generateAI` does correctly.

### Placeholder affiliate URLs

**What happens:** `public/tools/shared/affiliate-panel.js` uses `?utm_source=cyberscryb&utm_medium=affiliate` appended to direct domain URLs (not real affiliate tracking links).
**Why it's wrong:** These are not real affiliate links. Clicks generate no commission.
**Do this instead:** Replace with real CJ Affiliate / Impact links once Nate applies and gets approved.

## Error Handling

**Strategy:** Functions return JSON error objects with HTTP status codes. Frontend catches via `try/catch` and maps status codes to user-friendly messages.

**Patterns:**

- `429` → "Busy right now — try again in a minute."
- `400` → "Please check your input."
- `500+` → "Something went wrong, try again."
- Rate limit errors always use `res.status(429).json({ error: reason })`
- Gemini API errors are logged server-side and surfaced as `{ error: "AI Error: {message}" }`

## Cross-Cutting Concerns

**Logging:** `console.error` / `console.warn` in Cloud Functions — surfaced in Firebase Functions logs. No structured logging or error tracking service.
**Validation:** Referer allowlist (`ALLOWED_HOSTS`) + in-memory rate limiting in each Cloud Function. Input length capped at 5000 chars in `generateAI`.
**Authentication:** None (no user accounts). Subscription state tracked via cookie + localStorage. Pro tier gated by `cs_subscribed` cookie in frontend only — no server-side auth.
**Performance:** AdSense deferred 2.5s or on first interaction. GA4 deferred 1.5s. Cloudflare chatbot deferred 3s. CSS/JS/SVG assets served with 1-year immutable cache headers.

---

_Architecture analysis: 2026-05-20_
