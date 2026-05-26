---
phase: "01"
plan: "B"
subsystem: "functions/tests"
tags: ["jest", "firebase-functions", "ai-prompts", "error-shape", "testing", "regression"]
dependency_graph:
  requires: ["01-A"]
  provides: ["jest coverage for AI_PROMPTS dispatch table", "regression guard against res.send() errors", "test export hook in functions/index.js"]
  affects: ["__tests__/", "functions/index.js", "package.json"]
tech_stack:
  added: []
  patterns: ["jest.mock for firebase-admin/firebase-functions", "describe.each for parametric tool tests", "CommonJS __testing export guarded by NODE_ENV"]
key_files:
  created:
    - "__tests__/ai-prompts.test.js"
    - "__tests__/ai-generate-handler.test.js"
    - "__tests__/rewrite-error-shape.test.js"
  modified:
    - "functions/index.js"
    - "package.json"
decisions:
  - "Added modulePaths: ['<rootDir>/functions/node_modules'] to jest config so firebase-admin/firebase-functions resolve from functions/node_modules"
  - "Added --forceExit to npm test to handle setInterval timers from functions/index.js keeping Jest open"
  - "Used testEnvironment: node in jest config for Node.js crypto compatibility"
  - "test export uses NODE_ENV=test guard so __testing is never exposed in production"
  - "ai-generate-handler.test.js tests isAllowedReferer and sanitizeParams via __testing instead of trying to unwrap CORS handler"
  - "AI_PROMPTS has 21 keys as of 2026-05-26: summarizer, email-writer, bio-generator, product-description, code-explainer, meta-description, ai-detector, hardship-letter, appeal-letter, custody-document, caregiver-report, budget-planner, resume-bullets, tweet-generator, paraphraser, linkedin-post, cold-email, job-description, press-release, seo-title, voice-writer"
metrics:
  duration: "~15 minutes"
  completed: "2026-05-26"
  tests_total: 304
  tests_new: 90
---

# Phase 01 Plan B: AI Prompt Builder + Error Shape Tests Summary

Jest tests proving all 21 AI_PROMPTS keys build correctly, every error path returns JSON (never plain text), with CommonJS __testing export added to functions/index.js.

## What Was Built

### Test Files Created

**`__tests__/ai-prompts.test.js`** (64 tests)
- Verifies exact 21-key set in AI_PROMPTS dispatch table
- `describe.each` loop over all tool IDs: each tool has gemini-3.1-pro-preview model, build is a function, and `build('TEST_INPUT_42', {})` returns a string containing the literal input and is >50 chars

**`__tests__/ai-generate-handler.test.js`** (25 tests)
- Tests `isAllowedReferer` security function: allows cyberscryb.com, www, localhost, Firebase domain, valid subdomains; blocks evil.com, query-param spoofing, subdomain spoofing, malformed URLs
- Tests `sanitizeParams` function: null/non-object handling, boolean passthrough, numeric clamping to 1-20, string truncation at 300 chars, allowlist enforcement for voice/platform/docType params

**`__tests__/rewrite-error-shape.test.js`** (1 test)
- Reads functions/index.js source directly, strips comment lines, asserts zero matches for `res.status(N).send(` pattern
- Acts as a regression guard: if any developer adds res.send() for error responses, this test fails immediately

### functions/index.js Changes

Added test export at bottom of file (guarded by NODE_ENV):
```javascript
if (process.env.NODE_ENV === 'test') {
    module.exports.__testing = { AI_PROMPTS, sanitizeParams, isAllowedReferer, ALLOWED_HOSTS };
}
```

All existing error paths already use `res.status(N).json({ error: '...' })` — no res.send() patterns found in source.

### package.json Changes

Added jest configuration section with `modulePaths` pointing to `functions/node_modules` so Jest can resolve `firebase-admin` and `firebase-functions/v1` modules when requiring `functions/index.js` in tests.

## Deviations from Plan

### Auto-fixed Issues

**[Rule 2 - Missing Critical Config] Added jest modulePaths for firebase module resolution**
- **Found during:** Task 2.1
- **Issue:** `firebase-admin` could not be resolved by Jest from the root `node_modules` — it lives in `functions/node_modules`. Without this, both ai-prompts and ai-generate-handler test suites fail with "Cannot find module 'firebase-admin'"
- **Fix:** Added `"jest": { "modulePaths": ["<rootDir>/functions/node_modules"] }` to `package.json`
- **Files modified:** `package.json`
- **Commit:** `c26d547` (wip wave1)

**[Rule 3 - Blocking] Ran npm install in functions/ to populate node_modules**
- **Found during:** Task 2.1
- **Issue:** `functions/node_modules` was absent (not tracked in git). Jest cannot resolve firebase deps without them installed.
- **Fix:** `cd functions && npm install` — this is a runtime prerequisite, not committed to git
- **Note:** CI/CD must also run `npm install` in `functions/` before running `npm test`

**[Rule 1 - Deviation from plan key count] Test expects 21 keys, not 16**
- **Found during:** Task 2.1 (reading functions/index.js)
- **Issue:** Plan spec said "16 keys" and listed them, but functions/index.js already had 21 keys (5 additional: linkedin-post, cold-email, job-description, press-release, seo-title)
- **Fix:** Test file uses actual 21-key list from current functions/index.js state

## Threat Flags

None — these are test-only files. No new network endpoints or auth paths introduced.

## Known Stubs

None.

## Self-Check: PASSED

Files confirmed present:
- `/home/user/cyberscryb/__tests__/ai-prompts.test.js` FOUND
- `/home/user/cyberscryb/__tests__/ai-generate-handler.test.js` FOUND
- `/home/user/cyberscryb/__tests__/rewrite-error-shape.test.js` FOUND

`functions/index.js` __testing export: 1 occurrence (confirmed via grep)
No `res.status(N).send(` patterns in functions/index.js (confirmed via grep)
`npm test` result: 304 passed, 14 suites, exit 0
