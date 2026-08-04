---
plan_id: 01-C
phase: 1
title: 'Jest+jsdom tests for client-side dev tools: base64, hash, regex, url-encoder, slug, case-converter, uuid, epoch, json-formatter'
wave: 1
depends_on: []
files_modified:
  - __tests__/base64-tool.test.js
  - __tests__/hash-generator.test.js
  - __tests__/url-encoder.test.js
  - __tests__/slug-generator.test.js
  - __tests__/case-converter.test.js
  - __tests__/json-formatter.test.js
  - __tests__/uuid-generator.test.js
  - __tests__/epoch-converter.test.js
  - public/tools/base64-tool/script.js
  - public/tools/hash-generator/script.js
  - public/tools/url-encoder/script.js
  - public/tools/slug-generator/script.js
  - public/tools/case-converter/script.js
  - public/tools/json-formatter/script.js
  - public/tools/uuid-generator/script.js
  - public/tools/epoch-converter/script.js
autonomous: true
requirements: [AUDIT-02]
must_haves:
  - 'Every client-side dev tool in the in-scope list has a Jest test file that calls its pure transform function with at least 3 input/output pairs covering: happy path, edge case (empty input, unicode, very long input as relevant), and a documented failure mode'
  - "Each tool's script.js exports its pure transform functions via the CommonJS guard pattern already used by password-checker.js and json-csv-converter.js so the tests can require them"
  - 'npm test exits 0 with all new test suites green'
  - 'The transform functions remain identical to current behavior — this plan adds tests around existing code, it does NOT change tool behavior (a regression would be a bug, not a feature)'
---

<objective>
Lock in the correctness of every client-side dev tool with Jest tests so brownfield polish in later phases doesn't silently break them.

Purpose: Phase 1 success criterion #2 requires "every client-side dev tool works in Chrome, Safari, Firefox, and mobile." We can't automate cross-browser, but we CAN lock in the pure-function correctness so a CSS or layout change in Phase 2 can't break the underlying transform. The codebase already has this pattern (`__tests__/password-checker.test.js`, `__tests__/json-csv-converter.test.js` use the CommonJS guard from CONVENTIONS.md) — this plan extends the pattern to the rest of the dev tools that have non-trivial logic.
Output: Eight new Jest test files + minimal CommonJS guard exports added to eight `script.js` files.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/codebase/CONVENTIONS.md
@.planning/codebase/STRUCTURE.md
@CLAUDE.md

# Existing patterns to copy

@**tests**/password-checker.test.js
@**tests**/json-csv-converter.test.js
@public/tools/password-checker/script.js
@public/tools/json-csv-converter/script.js

<interfaces>
<!-- CommonJS export pattern from CONVENTIONS.md (already in use by password-checker.js line 291 and json-csv-converter.js line 355) -->

if (typeof module !== 'undefined' && module.exports) {
module.exports = { functionName, anotherFunction };
}

This guard is invisible to the browser (no `module` global) and exposes the
pure functions to Jest. Browser execution of the file is unaffected.

Tools in scope for this plan (8 tools, all client-side, all have non-trivial
pure transform logic that benefits from tests):

1. base64-tool — encode/decode string ↔ base64, including UTF-8 multi-byte
2. hash-generator — MD5/SHA-1/SHA-256/SHA-512 of input (uses Web Crypto SubtleCrypto)
3. url-encoder — encodeURIComponent / decodeURIComponent, handle reserved chars
4. slug-generator — string → URL-safe slug (lowercase, dashes, strip diacritics)
5. case-converter — camelCase, snake_case, kebab-case, PascalCase, CONSTANT_CASE
6. json-formatter — pretty-print / minify / validate JSON
7. uuid-generator — v4 UUID via crypto.getRandomValues (per CLAUDE.md — must NOT use Math.random)
8. epoch-converter — epoch seconds ↔ ISO 8601 ↔ human-readable

Tools NOT in scope this plan (handled differently or already tested):

- password-checker (already tested in **tests**/password-checker.test.js)
- json-csv-converter (already tested in **tests**/json-csv-converter.test.js)
- markdown-html (uses third-party marked.js, smoke-test only via Plan E)
- color-palette (visual tool, no pure transform)
- qr-generator (uses third-party qrcode.js, tested via Plan E)
- regex-tester (interactive UI, smoke-test only via Plan E)
- cron-builder (interactive UI, smoke-test only via Plan E)
- text-diff, lorem-ipsum, word-counter, html-entity (covered in Plan E manual smoke pass — they have less behavior surface)
- jwt-decoder, privacy-generator, seo-tag-generator (more complex; defer to Phase 2 UX work)
</interfaces>

</context>

<tasks>

<task id="3.1">
  <description>Add CommonJS guard exports to all 8 in-scope tool script.js files (refactor only — no behavior change) and write tests for the first 4 simpler tools (base64, url-encoder, slug, case-converter).</description>
  <files>public/tools/base64-tool/script.js, public/tools/url-encoder/script.js, public/tools/slug-generator/script.js, public/tools/case-converter/script.js, public/tools/hash-generator/script.js, public/tools/json-formatter/script.js, public/tools/uuid-generator/script.js, public/tools/epoch-converter/script.js, __tests__/base64-tool.test.js, __tests__/url-encoder.test.js, __tests__/slug-generator.test.js, __tests__/case-converter.test.js</files>
  <read_first>
    - /home/user/cyberscryb/public/tools/password-checker/script.js (the CommonJS guard pattern — bottom of file, exact syntax)
    - /home/user/cyberscryb/__tests__/password-checker.test.js (the test structure — `describe`, `test`, edge cases)
    - /home/user/cyberscryb/public/tools/base64-tool/script.js (current implementation — identify the encode/decode functions)
    - /home/user/cyberscryb/public/tools/url-encoder/script.js (current implementation)
    - /home/user/cyberscryb/public/tools/slug-generator/script.js (current implementation)
    - /home/user/cyberscryb/public/tools/case-converter/script.js (current implementation)
    - /home/user/cyberscryb/public/tools/hash-generator/script.js (current implementation — identify whether MD5/SHA functions are pure or DOM-bound)
    - /home/user/cyberscryb/public/tools/json-formatter/script.js (current implementation)
    - /home/user/cyberscryb/public/tools/uuid-generator/script.js (current implementation — confirm it uses crypto.getRandomValues per CLAUDE.md historical mistakes table)
    - /home/user/cyberscryb/public/tools/epoch-converter/script.js (current implementation)
  </read_first>
  <action>For each of the 8 tool `script.js` files, append at the bottom (after all existing code, after the DOMContentLoaded handler if present) the CommonJS guard pattern: `if (typeof module !== 'undefined' && module.exports) { module.exports = { /* the named pure functions extracted from this file */ }; }`. Identify pure functions by these criteria: takes input as a string/value argument, returns transformed output, does NOT touch `document.*` or `window.*`. If a transform is currently inline inside a DOM event handler (common for these tools), extract it into a named top-level function first (e.g., `function encodeBase64(input) { ... }`), then have the event handler call that named function. The DOM behavior must remain byte-identical — verify by visual inspection that the only structural change is the new named function plus the export. For each tool, the exported function names must match what the test file requires below. Then create the four test files: (a) `__tests__/base64-tool.test.js` — require `encodeBase64` and `decodeBase64` (or whatever the actual exported names are after refactor); test 3 cases each — round-trip ASCII string, round-trip UTF-8 string with emoji (`'hello 🎉 world'`), invalid base64 input throws or returns empty-string per current behavior. (b) `__tests__/url-encoder.test.js` — test `encodeURIComponent`-style behavior on reserved chars (`?`, `&`, `=`, `#`, space), unicode characters, and round-trip. (c) `__tests__/slug-generator.test.js` — test ASCII conversion (`'Hello World!' → 'hello-world'`), diacritic stripping (`'Café Naïve' → 'cafe-naive'`), multiple-space collapse, leading/trailing dash trim. (d) `__tests__/case-converter.test.js` — test each conversion: camelCase, snake_case, kebab-case, PascalCase, CONSTANT_CASE on a known input like `'the quick brown fox'`. If the actual conversion functions don't exist as separate exports today, document in the test file's header comment what names were chosen during extraction. Use jsdom environment (`/** @jest-environment jsdom */` at top of any test file that needs `window` or `crypto` globals; default `node` environment otherwise).</action>
  <verify>
    <automated>cd /home/user/cyberscryb && npm test -- --testPathPattern='(base64-tool|url-encoder|slug-generator|case-converter)\.test\.js' 2>&1 | tail -25</automated>
  </verify>
  <acceptance_criteria>
    - source assertion: all 8 tool script.js files contain the literal `module.exports = {` near the bottom
    - source assertion: each of the 4 new test files exists in `__tests__/`
    - behavior assertion: `npm test -- --testPathPattern='(base64-tool|url-encoder|slug-generator|case-converter)\.test\.js'` exits 0
    - behavior assertion: the base64 test verifies an emoji round-trip
    - behavior assertion: the slug test verifies diacritic stripping
    - source assertion: no `script.js` file removed or renamed existing top-level functions (verified by `git diff --stat public/tools/*/script.js` showing only additions)
  </acceptance_criteria>
  <verification>Open the modified script.js files in a browser (or load each tool page locally) to confirm the export guard doesn't break browser execution. Run `npm test` and confirm the four new suites are green.</verification>
</task>

<task id="3.2">
  <description>Write tests for the remaining 4 tools (hash-generator, json-formatter, uuid-generator, epoch-converter), including the security-sensitive crypto.getRandomValues assertion for UUID.</description>
  <files>__tests__/hash-generator.test.js, __tests__/json-formatter.test.js, __tests__/uuid-generator.test.js, __tests__/epoch-converter.test.js</files>
  <read_first>
    - /home/user/cyberscryb/public/tools/hash-generator/script.js (post-refactor from task 3.1 — confirm exported function signatures, identify if it uses Web Crypto SubtleCrypto.digest which returns a Promise)
    - /home/user/cyberscryb/public/tools/json-formatter/script.js (post-refactor — find format/minify/validate exports)
    - /home/user/cyberscryb/public/tools/uuid-generator/script.js (post-refactor — confirm it uses crypto.getRandomValues per CLAUDE.md historical mistake row)
    - /home/user/cyberscryb/public/tools/epoch-converter/script.js (post-refactor — find epochToISO, isoToEpoch, or equivalent)
    - /home/user/cyberscryb/__tests__/password-checker.test.js (template for jsdom-environment tests that use crypto)
  </read_first>
  <action>Create four test files. (a) `__tests__/hash-generator.test.js` — use `/** @jest-environment jsdom */` at top; if the hash functions use Web Crypto SubtleCrypto (async, returns Promise<ArrayBuffer>) confirm jsdom or Node 20 provides `crypto.subtle` (Node 20+ has `globalThis.crypto.subtle`). Test SHA-256 of `'hello'` equals the known hex `2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824`. Test SHA-1, MD5 if implemented with the library's known outputs for `'hello'`. (b) `__tests__/json-formatter.test.js` — node environment; test `prettyPrint('{"a":1}')` returns a string containing newlines and 2-space indent; test `minify('{\n  "a": 1\n}')` returns `'{"a":1}'`; test `validate('not json')` returns `false` or throws per current implementation. (c) `__tests__/uuid-generator.test.js` — jsdom environment; test `generateUuid()` returns a string matching the regex `/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i` (v4 UUID format); test 100 generated UUIDs are all unique; add a critical regression test that asserts the source file does NOT contain the literal string `Math.random` (per CLAUDE.md historical mistake — read the file via fs.readFileSync and assert `!source.includes('Math.random')`). (d) `__tests__/epoch-converter.test.js` — node environment; test `epochToISO(0)` returns `'1970-01-01T00:00:00.000Z'`; test `isoToEpoch('2026-01-01T00:00:00.000Z')` returns `1767225600` or `1767225600000` per current units (verify which); test a round-trip with a known timestamp. If any tool's actual implementation does not yet have the function name the test expects, the test file's header MUST list the exact function name used (post-refactor in task 3.1) so there is no ambiguity.</action>
  <verify>
    <automated>cd /home/user/cyberscryb && npm test 2>&1 | tail -30</automated>
  </verify>
  <acceptance_criteria>
    - source assertion: all four test files exist in `__tests__/`
    - behavior assertion: `npm test` exits 0 with all eight new test suites green
    - source assertion: `uuid-generator.test.js` contains an assertion that the source file does NOT contain `Math.random` (regression guard per CLAUDE.md)
    - source assertion: `hash-generator.test.js` references the known SHA-256 hex for `'hello'`
    - source assertion: `epoch-converter.test.js` references epoch 0 = `1970-01-01T00:00:00.000Z`
  </acceptance_criteria>
  <verification>Run `npm test`. Confirm all 8 new dev-tool test suites green plus existing 3 (firebase-functions, json-csv-converter, password-checker) plus Plan B's 3 new suites still green.</verification>
</task>

</tasks>

<verification>
- `npm test` exits 0 with 11+ test suites green (3 existing + 3 from Plan B + 8 from this plan, minus any merged)
- Eight tool `script.js` files have CommonJS guard exports
- Tool browser behavior is identical before and after the refactor (verified by visual inspection of git diff showing only additions and the addition of named function declarations where transforms were inline)
- Phase 1 success criterion #2 has automated coverage at the transform-correctness layer (cross-browser visual testing is covered by Plan E's Lighthouse pass)
- The CLAUDE.md "Math.random in password generator" historical mistake is now also enforced for the UUID generator by a source-level regression test
</verification>

<success_criteria>

- Every in-scope dev tool's pure transform logic is locked in by tests
- Refactoring the UI in Phase 2 can't silently break the underlying transforms
- Test coverage extends the existing pattern (password-checker, json-csv-converter) rather than introducing a new test framework
  </success_criteria>

<output>
Create `.planning/phases/01-audit-triage/01-C-SUMMARY.md` when done, summarizing: tools tested, function names that were extracted/renamed during the refactor, any tool where the existing implementation surprised the tests (e.g., behavior different from expected), and test counts.
</output>
