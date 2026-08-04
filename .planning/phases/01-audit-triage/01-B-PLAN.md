---
plan_id: 01-B
phase: 1
title: 'AI tool functional tests: every toolId reaches Gemini, every prompt builds, every error path returns JSON'
wave: 1
depends_on: []
files_modified:
  - __tests__/ai-prompts.test.js
  - __tests__/ai-generate-handler.test.js
  - __tests__/rewrite-error-shape.test.js
  - functions/index.js
autonomous: true
requirements: [AUDIT-01, AUDIT-05]
must_haves:
  - 'Every key in AI_PROMPTS has a Jest test that calls its .build(input, params) function with representative input and asserts the returned prompt string is non-empty and contains the input verbatim'
  - 'A Jest test asserts that the /api/ai-generate handler returns JSON (never plain text) on every error branch — 400 missing tool, 400 unknown tool, 429 rate limited, 500 Gemini error'
  - 'A Jest test asserts that the rewriteText handler (humanizer) returns JSON on every error branch — fixing CONCERNS.md WARNING that lines 83, 93, 108, 147, 155, 163, 174, 208, 219, 589 use res.send() instead of res.json()'
  - "All error responses in functions/index.js use res.status(N).json({ error: '...' }) — verified by a grep gate that finds zero res.status(.*).send( patterns outside of success paths"
  - 'npm test exits 0'
---

<objective>
Automate the functional verification that every AI tool can complete a generation end-to-end, and fix the error-response inconsistency that CONCERNS.md flagged as a WARNING (plain-text errors that the frontend tries to JSON.parse and crashes on).

Purpose: Phase 1 success criterion #1 requires "all 17 AI tools generate output end-to-end without errors." Click-testing 17 tools by hand is fragile and doesn't catch regressions. This plan installs an automated test suite that proves every prompt builds, every error path returns the contract the frontend expects, and the humanizer's legacy plain-text errors get fixed. Tests double as documentation of the contract.
Output: Three new Jest test files + a hardened `functions/index.js` where every error response uses `res.status(N).json({ error })`.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/codebase/ARCHITECTURE.md
@.planning/codebase/CONCERNS.md
@.planning/codebase/CONVENTIONS.md
@CLAUDE.md

# Source files under test

@functions/index.js
@public/tools/shared/ai-tool.js
@**tests**/firebase-functions.test.js

<interfaces>
<!-- Frontend → backend contract from public/tools/shared/ai-tool.js lines 246-260 -->

Request shape (POST /api/ai-generate):
body: { tool: string, input: string|object, params?: object }

Frontend error parser (ai-tool.js lines 252-258):
if (!response.ok) {
let errMsg = '';
try {
const errData = await response.json(); // <-- ALWAYS calls .json()
errMsg = errData.error || '';
} catch (e) {}
throw new Error(friendlyError(response.status, errMsg));
}

Implication: ANY response with res.send(plainText) crashes the try/await
silently and falls back to friendlyError(status, '') with no useful message.

Success response shape (generateAI):
res.status(200).json({ result: string, tool: string })

Error response shape (REQUIRED, contract):
res.status(N).json({ error: string })

AI_PROMPTS structure (functions/index.js):
{
[toolId]: {
model: 'gemini-3.1-pro-preview',
build: (input, params) => promptString
}
}

Pattern from CONVENTIONS.md (CRITICAL):
ALL errors must use res.status(N).json({ error: '...' })
Never use res.send() for errors — the frontend always calls .json() on the response.
</interfaces>
</context>

<tasks>

<task id="2.1">
  <description>Extract AI_PROMPTS into a testable module and write per-tool prompt-builder tests.</description>
  <files>__tests__/ai-prompts.test.js, functions/index.js</files>
  <read_first>
    - /home/user/cyberscryb/functions/index.js (specifically the AI_PROMPTS object literal, lines ~256 through the closing brace before the `cleanInput` helper or the `exports.generateAI` declaration — read it once, identify every key)
    - /home/user/cyberscryb/__tests__/firebase-functions.test.js (existing test pattern — extract the "test the pure logic directly without importing side-effectful module" pattern)
    - /home/user/cyberscryb/package.json (confirm jest + jest-environment-jsdom present, confirm `npm test` script runs `jest --verbose`)
  </read_first>
  <action>In `functions/index.js`, after the AI_PROMPTS declaration, add a CommonJS guarded export at the bottom of the file (after all `exports.*` Cloud Function declarations and after the `setInterval` cleanup): `if (process.env.NODE_ENV === 'test') { module.exports.__testing = { AI_PROMPTS, sanitizeParams, isAllowedReferer, ALLOWED_HOSTS }; }`. This exposes the dispatch table to tests without affecting Firebase runtime. Then create `__tests__/ai-prompts.test.js` that sets `process.env.NODE_ENV = 'test'` before any require, requires `../functions/index.js` (handling the `admin.initializeApp()` side effect — if it throws because of missing credentials, wrap the require in a try/catch and re-export `AI_PROMPTS` from a lightweight extraction via reading `functions/index.js` as a string and `vm.runInNewContext` — but prefer the guarded export). The test file MUST contain a single `describe('AI_PROMPTS dispatch table')` with: (a) a test asserting exactly 16 keys exist matching the snapshot ['summarizer', 'email-writer', 'bio-generator', 'product-description', 'code-explainer', 'meta-description', 'ai-detector', 'hardship-letter', 'appeal-letter', 'custody-document', 'caregiver-report', 'budget-planner', 'resume-bullets', 'tweet-generator', 'paraphraser', 'voice-writer']; (b) a `describe.each` over every key that asserts `AI_PROMPTS[key].model === 'gemini-3.1-pro-preview'` (the mandatory `-preview` suffix per CLAUDE.md), `typeof AI_PROMPTS[key].build === 'function'`, and `AI_PROMPTS[key].build('TEST_INPUT_42', {}).includes('TEST_INPUT_42')` (proves input is interpolated into the prompt); (c) a test that each prompt is at least 50 characters when called with a 10-char input (catches accidentally truncated prompts). If `admin.initializeApp()` blocks importing the module, mock `firebase-admin` and `firebase-functions` via `jest.mock` at the top of the test file with stub implementations returning empty objects. Do NOT call the actual Gemini API in any test.</action>
  <verify>
    <automated>cd /home/user/cyberscryb && npm test -- --testPathPattern=ai-prompts.test.js 2>&1 | tail -20</automated>
  </verify>
  <acceptance_criteria>
    - source assertion: file `/home/user/cyberscryb/__tests__/ai-prompts.test.js` exists
    - source assertion: `functions/index.js` contains the string `module.exports.__testing` exactly once
    - behavior assertion: `npm test -- --testPathPattern=ai-prompts.test.js` exits 0
    - behavior assertion: the test output reports at least 16 passing tests in the `describe.each` block
    - source assertion: every `AI_PROMPTS[key].model` value in the test snapshot string is the literal `gemini-3.1-pro-preview`
  </acceptance_criteria>
  <verification>Run `npm test -- --testPathPattern=ai-prompts.test.js`. Confirm pass count ≥ 16 + suite-level assertions.</verification>
</task>

<task id="2.2">
  <description>Replace every res.send() error response in functions/index.js with res.status(N).json({ error }), and write the error-shape contract test that prevents regression.</description>
  <files>functions/index.js, __tests__/rewrite-error-shape.test.js, __tests__/ai-generate-handler.test.js</files>
  <read_first>
    - /home/user/cyberscryb/functions/index.js (lines 80–250 for rewriteText and generateGigWork, lines 250–620 for generateAI and subscribeEmail — identify every `res.status(N).send(` and every `res.send(` outside of success paths)
    - /home/user/cyberscryb/.planning/codebase/CONCERNS.md (Security Issues section — the exact line numbers cited: 83, 93, 108, 147, 155, 163, 174, 208, 219, 589)
    - /home/user/cyberscryb/public/tools/shared/ai-tool.js (lines 252–258 confirm frontend always calls .json() on errors)
  </read_first>
  <action>Edit `functions/index.js` to replace every error-path `res.status(N).send(message)` with `res.status(N).json({ error: message })`. Concretely audit these patterns: (a) rate-limit rejections in `rewriteText`, `generateGigWork`, and `generateAI` (status 429); (b) referer rejections (status 403); (c) missing-input or missing-tool rejections (status 400); (d) unknown-tool rejections in `generateAI` (status 400); (e) `catch (error)` blocks at the bottom of every handler (status 500); (f) any `res.send("Internal Server Error")` or similar bare strings. After editing, run `grep -nE "res\.status\([0-9]+\)\.send\(" functions/index.js | grep -v '^#'` and confirm it returns zero matches. Success paths that intentionally use `res.send()` to send non-JSON (rare; the codebase does not have these) are exempted — but verify none exist. Then create `__tests__/rewrite-error-shape.test.js`: a Jest test that reads `functions/index.js` as a UTF-8 string via `fs.readFileSync` and asserts `(?:^|[^/])res\.status\(\d+\)\.send\(` does NOT match anywhere in the file using a multiline regex that ignores commented-out lines (strip `//` line comments before matching). Add a second assertion that every `res.status(` call within 100 chars is followed by `.json(` (not `.send(`). Then create `__tests__/ai-generate-handler.test.js`: build mock req/res objects with `jest.fn()` for `res.status` (returns the same mock) and `res.json` (records calls), simulate the four error branches by invoking the underlying logic — since the handler wraps in `cors(req, res, async ...)` and requires the firebase-functions runtime, extract the inner async handler into a testable function (`async function handleGenerate(req, res)`) inside `functions/index.js` if not already done, and import it via `module.exports.__testing`. Test: (i) missing `tool` in body → `res.status(400)` called, `res.json({ error: ... })` called; (ii) unknown `tool` value not in AI_PROMPTS → `res.status(400)` + `res.json({ error })`; (iii) referer not in ALLOWED_HOSTS → `res.status(403)` + `res.json`; (iv) `checkRateLimit` returning `{ allowed: false }` → `res.status(429)` + `res.json`. Stub the Gemini fetch with `global.fetch = jest.fn(() => Promise.resolve({ ok: false, json: () => ({}) }))`.</action>
  <verify>
    <automated>cd /home/user/cyberscryb && grep -nE "res\.status\([0-9]+\)\.send\(" functions/index.js | grep -v '^\s*//' | wc -l | grep -q '^0$' && npm test 2>&1 | tail -30</automated>
  </verify>
  <acceptance_criteria>
    - source assertion: `grep -nE "res\.status\([0-9]+\)\.send\(" functions/index.js | grep -v '^\s*//'` returns zero non-comment matches
    - source assertion: file `/home/user/cyberscryb/__tests__/rewrite-error-shape.test.js` exists
    - source assertion: file `/home/user/cyberscryb/__tests__/ai-generate-handler.test.js` exists
    - behavior assertion: `npm test` exits 0
    - behavior assertion: the regression test in `rewrite-error-shape.test.js` fails if I temporarily add a `res.status(500).send("bad")` line back to functions/index.js (verify by toggling once, confirming fail, then reverting)
    - source assertion: the four error branches in ai-generate-handler.test.js each call `res.json` with an object containing an `error` key
  </acceptance_criteria>
  <verification>Run `npm test` — all suites green. Run the grep — zero matches. Toggle a `res.send` back in temporarily to confirm the regression test catches it; revert.</verification>
</task>

</tasks>

<verification>
- `npm test` exits 0 with all four new test files passing
- `grep -nE "res\.status\([0-9]+\)\.send\(" functions/index.js | grep -v '^\s*//'` returns zero matches
- All 16 AI_PROMPTS keys are covered by per-tool tests asserting model name and build function behavior
- The contract regression test prevents anyone from reintroducing plain-text error responses in future phases
- Phase 1 success criterion #1 ("17 AI tools generate output end-to-end without errors") has automated coverage at the prompt-builder + handler layer; full Gemini round-trip is verified in Plan E's Lighthouse + manual smoke pass
</verification>

<success_criteria>

- Every AI tool's prompt builds without throwing for representative input
- The error-response contract between frontend and backend is enforced by tests
- The humanizer's plain-text error responses (CONCERNS.md WARNING) are eliminated
- Future regressions in error shape are caught by `npm test`, not by users seeing "Request failed" with no detail
  </success_criteria>

<output>
Create `.planning/phases/01-audit-triage/01-B-SUMMARY.md` when done, summarizing: tests added, prompt keys covered, error-response sites fixed (with line numbers from CONCERNS.md before/after), and any quirks discovered when mocking `firebase-admin` / `firebase-functions`.
</output>
