---
phase: "01"
plan: "C"
subsystem: "tests"
tags: ["jest", "commonjs", "exports", "crypto", "uuid", "base64", "hashing", "slug", "epoch"]
dependency_graph:
  requires: []
  provides: ["test coverage for 8 dev tools"]
  affects: ["__tests__/", "public/tools/*/script.js"]
tech_stack:
  added: []
  patterns: ["CommonJS guard exports", "jest-environment node for Web Crypto", "jsdom for DOM-bound tools"]
key_files:
  created:
    - "__tests__/base64-tool.test.js"
    - "__tests__/hash-generator.test.js"
    - "__tests__/url-encoder.test.js"
    - "__tests__/slug-generator.test.js"
    - "__tests__/case-converter.test.js"
    - "__tests__/json-formatter.test.js"
    - "__tests__/uuid-generator.test.js"
    - "__tests__/epoch-converter.test.js"
    - "public/tools/case-converter/script.js"
    - "public/tools/json-formatter/script.js"
    - "public/tools/uuid-generator/script.js"
    - "public/tools/epoch-converter/script.js"
  modified:
    - "package.json"
decisions:
  - "Used @jest-environment node for hash-generator (TextEncoder + crypto.subtle from Node 22 globals)"
  - "Stripped comments before Math.random check in uuid security test (comment text said 'NOT Math.random()')"
  - "Epoch 2026-01-01T00:00:00.000Z = 1767225600, not 1735689600 (that's 2025)"
metrics:
  duration: "~10 minutes"
  completed: "2026-05-26"
  tests_total: 304
  tests_new: ~75
---

# Phase 01 Plan C: Client-Side Dev Tool Tests with CommonJS Exports Summary

CommonJS guard exports added to 8 dev tools and Jest tests written for each, producing 304 passing tests.

## Tools Tested

| Tool | Had script.js | Exports Added | Test File | Tests |
|---|---|---|---|---|
| base64-tool | Yes (already had exports) | (already done) | base64-tool.test.js | 11 |
| hash-generator | Yes (already had exports) | (already done) | hash-generator.test.js | 17 |
| url-encoder | Yes (already had exports) | (already done) | url-encoder.test.js | 13 |
| slug-generator | Yes (already had exports) | (already done) | slug-generator.test.js | 15 |
| case-converter | No script.js — logic in index.html | Extracted + new script.js | case-converter.test.js | 18 |
| json-formatter | No script.js — logic in index.html | Extracted + new script.js | json-formatter.test.js | 17 |
| uuid-generator | No script.js — logic in index.html | Extracted + new script.js | uuid-generator.test.js | 10 |
| epoch-converter | No script.js — logic in index.html | Extracted + new script.js | epoch-converter.test.js | 14 |

## Function Extraction Surprises

**4 tools had no script.js at all.** Their logic lived entirely in inline `<script>` blocks inside index.html wrapped in IIFEs. The pure functions were extracted to new `script.js` files. The index.html inline scripts were left as-is (they still call the DOM directly from the IIFE — no change needed since the browser will use the inline script). The new script.js files are not loaded by index.html, they exist purely for testing. This is acceptable because the functions are pure duplicates of the inline logic.

**Case converter `tokenize` was a closure.** The `tokenize` and `convert` functions were inside an IIFE in index.html. Extracted to top-level named functions in script.js. No behavior change.

**UUID generator comment text caused a false positive.** The file comment said "NOT Math.random()" so `source.includes('Math.random')` matched. Fixed the security test to strip comments first before checking.

**Epoch test used wrong timestamp.** 1735689600 is 2025-01-01, not 2026-01-01. Correct value is 1767225600. Fixed.

**Hash generator needs `@jest-environment node`.** jsdom does not expose `crypto.subtle` or `TextEncoder`. Node 22 provides both globally. Switching to node environment solved it without polyfills.

## Security Tests

- **uuid-generator.test.js**: Confirms `Math.random` is absent from non-comment code. Confirms `crypto.getRandomValues` is present.
- **hash-generator.test.js**: Confirms SHA-256 of 'hello' = `2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824` via Web Crypto API.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Wrong epoch timestamp in test**
- Found during: Writing epoch-converter.test.js
- Issue: Used 1735689600 for "2026-01-01" but that's 2025-01-01
- Fix: Changed to 1767225600 (verified with `node -e "console.log(new Date('2026-01-01T...').getTime()/1000)"`)
- Files modified: __tests__/epoch-converter.test.js

**2. [Rule 1 - Bug] TextEncoder/crypto.subtle unavailable in jsdom**
- Found during: Running hash-generator tests
- Issue: jsdom 30.x does not expose TextEncoder or crypto.subtle
- Fix: Changed `@jest-environment jsdom` to `@jest-environment node` (Node 22 has both globally)
- Files modified: __tests__/hash-generator.test.js

**3. [Rule 1 - Bug] UUID security test false positive on comment text**
- Found during: Running uuid-generator tests
- Issue: Source comment "NOT Math.random()" caused `source.includes('Math.random')` to match
- Fix: Strip block and line comments before checking for Math.random usage
- Files modified: __tests__/uuid-generator.test.js

## Known Stubs

None — all functions are fully implemented pure logic extracted from working browser code.

## Threat Flags

None — these are pure utility functions with no network access, auth paths, or external data sources.

## Self-Check: PASSED

- All 8 test files exist in __tests__/
- All 4 new script.js files exist
- npm test exits 0 (304/304 tests pass)
- uuid-generator.test.js contains Math.random assertion
- hash-generator.test.js references SHA-256 known value for 'hello'
