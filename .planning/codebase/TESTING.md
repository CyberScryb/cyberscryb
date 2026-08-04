# Testing Patterns

**Analysis Date:** 2026-05-20

## Test Framework

**Runner:** Jest 30.3.0

- Config: none (uses `package.json` `"scripts": { "test": "jest --verbose" }`)
- Environment: `jest-environment-jsdom` 30.3.0 (required for browser DOM simulation)
- Location: `package.json` at repo root

**Assertion Library:** Jest built-in (`expect`, matchers)

**Run Commands:**

```bash
npm test              # Run all tests (jest --verbose)
```

No watch mode or coverage commands are configured in `package.json`.

## Test File Organization

**Location:** All tests live in `/__tests__/` at repo root — not co-located with source files.

**Naming:** `{tool-name}.test.js` pattern.

**Current test files:**

- `/__tests__/password-checker.test.js` — tests `public/tools/password-checker/script.js`
- `/__tests__/firebase-functions.test.js` — tests logic from `functions/index.js`
- `/__tests__/json-csv-converter.test.js` — tests `public/tools/json-csv-converter/script.js`

## Test Structure

**Suite Organization:**

```javascript
/**
 * Tool Name Tests
 * Tests: functionA, functionB, ...
 *
 * @jest-environment jsdom
 */

// Set up DOM before require() — script executes on load
document.body.innerHTML = `<div id="element-id">...</div>`;

const { functionA, functionB } = require('../public/tools/tool-name/script');

// ── functionA ──────────────────────────────────────────
describe('functionA', () => {
  test('describes expected behavior', () => {
    expect(functionA(input)).toBe(expected);
  });
});
```

**Key pattern:** DOM must be constructed before `require()` because tool scripts run immediately on load and query the DOM at parse time. The `@jest-environment jsdom` directive in the JSDoc comment activates jsdom.

## What Tests Cover

### `password-checker.test.js`

Pure functions exported from `public/tools/password-checker/script.js`:

- `formatTime(seconds)` — 12 tests covering all time range branches (instant → billions of years → ∞)
- `getPercentile(entropy)` — 9 tests including common password detection and table integrity
- `generateVerificationId(password, entropy, percentile)` — format regex tests
- `COMMON_PASSWORDS` Set membership
- `KEYBOARD_PATTERNS` array contents
- Security audit: documents known `Math.random()` issue (placeholder test, not a fix)

### `firebase-functions.test.js`

Logic re-implemented inline (functions module can't be imported due to `admin.initializeApp` side effects):

- `getClientIP(req)` — 5 tests: forwarded-for extraction, whitespace trimming, fallback to remoteAddress
- `checkRateLimit(ip)` — 6 tests: per-IP limits, global daily limit, reset timing
- Email validation regex — 8 tests: valid/invalid formats, spaces
- Referer security check — documents VULNERABILITY in current `string.includes()` implementation and tests the correct `new URL(referer).hostname` fix

### `json-csv-converter.test.js`

Pure functions exported from `public/tools/json-csv-converter/script.js`:

- `escapeCsvField(str)` — 7 tests: commas, quotes, newlines, empty string
- `parseCsvLines(str)` — 8 tests: RFC 4180 compliance, CRLF, quoted fields with embedded newlines
- `jsonToCsv(jsonStr)` — 10 tests: array/object/nested, null handling, escaping, error cases
- `csvToJson(csvStr)` — 8 tests: type coercion (number, boolean, null), nested JSON detection
- Roundtrip tests: `JSON → CSV → JSON` with special characters

## How Tools Export for Testing

Source files use a CommonJS guard so they work in both browser and Node/Jest:

```javascript
// At the bottom of the source file:
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { functionName, anotherName };
}
```

Only pure functions are exported. DOM-manipulating code runs on load but the pure logic is extracted.

Tools that do NOT have this guard cannot be unit tested without refactoring.

**Currently testable tools:** `json-csv-converter`, `password-checker`
**Not testable without refactoring:** all other tools (no `module.exports` guard)

## Mocking

No external mocking library used. The `firebase-functions.test.js` avoids importing the module entirely — it re-defines the logic inline to work around `admin.initializeApp()` and `setInterval` side effects at module load time.

No `jest.mock()` calls exist in the test suite.

## CI/CD Pipeline — What's Checked

**GitHub Actions workflow:** `.github/workflows/deploy.yml`

Steps:

1. `actions/checkout@v4`
2. `actions/setup-node@v4` (Node 20)
3. `npm install -g firebase-tools`
4. `npm install` in `./functions`
5. `firebase deploy --only hosting,functions`

**What is NOT in the CI pipeline:**

- `npm test` is never run before deployment
- No lint step
- No type checking
- No build validation
- Deployment happens on every push to `main` regardless of test results

Tests can fail locally and deployment will still succeed.

## Linting and Formatting

**No ESLint configured.** No `.eslintrc`, `eslint.config.*`, or biome config found.

**No Prettier configured.** No `.prettierrc` or `prettier.config.*` found.

Code style is inconsistent across files — some use 4-space indent, some use 2-space. No enforcement tool.

## Manual QA Process

No formal manual QA checklist exists in the codebase. CLAUDE.md specifies a post-change audit:

**Agent 1 — Broken Things Audit (manual/AI-assisted):**

- Missing CSS/JS link paths on modified pages
- Nav has Blog link on all tool pages
- Deferred AdSense + GA4 loaders present
- Schema.org JSON-LD present on tool pages
- No trailing slash path issues on root pages
- `toolId` matches a key in `AI_PROMPTS` in `functions/index.js`
- `/api/ai-generate`, `/api/rewrite`, `/api/subscribe` rewrites in `firebase.json`
- No leftover placeholder text

**Agent 2 — Value/Traffic Audit (manual/AI-assisted):** traffic opportunities, CTAs, affiliate panels.

**Agent 3 — Consistency Audit (manual/AI-assisted):** tools.html links, sitemap.xml, meta descriptions, og:image, outdated content.

This audit is launched manually after changes — it is not automated.

## What's Missing

**No tests exist for:**

- All AI tool JS files (`summarizer.js`, `humanizer.js`, `email-writer.js`, `hardship-letter.js`, etc.)
- `public/tools/shared/ai-tool.js` (CSAITool core — email gate logic, typewriter, usage tracking)
- `public/tools/shared/email-capture.js`
- `public/tools/shared/affiliate-panel.js`
- `functions/index.js` (only logic patterns extracted into tests; the actual module is untested)
- `public/js/script.js` (navbar, hamburger, Cloudflare chatbot loader)
- All dev tools without `module.exports`: base64, markdown-html, color-palette, qr-generator, etc.
- Any integration test hitting the live `/api/ai-generate` endpoint
- Any E2E test (no Playwright, Cypress, or similar)
- Any accessibility testing
- Any performance/Lighthouse testing

**CI has no test gate.** Tests never run in the deployment pipeline. Broken tests in `/__tests__/` will not block a deploy.

**Coverage tracking:** Not configured. No coverage threshold enforcement.

---

_Testing analysis: 2026-05-20_
