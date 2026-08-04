---
phase: '01'
plan: 'D'
subsystem: 'tools/seo'
tags: ['life-tools', 'budget-planner', 'seo', 'json-ld', 'breadcrumbs', 'cleanup']
dependency_graph:
  requires: ['01-A']
  provides: ['budget-planner frontend', 'tool registry consistency', 'schema sweep']
  affects:
    [
      'tools.html',
      'index.html',
      'sitemap.xml',
      'ai-writing-suite',
      'humanizer',
      'privacy-generator',
    ]
tech_stack:
  added: []
  patterns:
    ['CSAITool.init pattern', 'SoftwareApplication + FAQPage + BreadcrumbList JSON-LD triple']
key_files:
  created:
    - public/tools/budget-planner/index.html
    - public/tools/budget-planner/budget-planner.js
  modified:
    - public/tools.html
    - public/sitemap.xml
    - public/index.html
    - public/tools/ai-writing-suite/index.html
    - public/tools/humanizer/index.html
    - public/tools/privacy-generator/index.html
    - scripts/audit-inventory.js
    - .planning/phases/01-audit-triage/AUDIT-INVENTORY.md
  deleted:
    - public/tools/humanizer/index_v1.html
decisions:
  - 'budget-planner uses FinanceApplication category (not LifestyleApplication) per JSON-LD spec for financial tools'
  - 'FUTURE_TOOL_PROMPTS allowlist added to audit script for 5 orphan prompts not being built in this phase'
  - '/distill/ added as separate sitemap entry from /tools/distill/ (root-level landing vs tool dir)'
metrics:
  duration: '~15 minutes'
  completed_date: '2026-05-26'
  tasks_completed: 3
  files_changed: 11
---

# Phase 1 Plan D: Inventory Fixes, Budget Planner, Tool Sweep Summary

Built the budget-planner Life Tool frontend, removed the humanizer legacy file, wired ai-writing-suite into registries, fixed JSON-LD types on humanizer and ai-writing-suite, added breadcrumbs to privacy-generator, and standardized tool counts across the site to 42.

## What Was Built

### Task 4.1 — Budget Planner Frontend

New Life Tool at `/tools/budget-planner/`:

- `public/tools/budget-planner/index.html`: Full tool page following the hardship-letter template. FinanceApplication JSON-LD schema, BreadcrumbList, FAQPage (5 questions). Deferred AdSense + GA4. Two-panel layout (input + output). Email gate, loading indicator, usage counter, upgrade tiers section.
- `public/tools/budget-planner/budget-planner.js`: CSAITool.init wiring with `toolId: 'budget-planner'`, `collectInput()`, `collectParams()` returning situation dropdown value, and `onStats()` for word/char counts.
- `public/tools.html`: Budget Planner card added to Life Tools section with matching icon + badge.
- `public/sitemap.xml`: Added `<url><loc>https://cyberscryb.com/tools/budget-planner/</loc>...</url>` with priority 0.7.
- `public/index.html`: Added "Build a survival budget" option to hero dropdown.

### Task 4.2 — Legacy Files, Canonical, Sitemap, Tool Counts

1. **humanizer/index_v1.html** — deleted (was a legacy file alongside current index.html).
2. **ai-writing-suite** wired:
   - Already had card in tools.html and entry in sitemap.
   - Added to homepage dropdown ("AI Writing Suite — detect & humanize").
   - Changed JSON-LD `@type` from `WebApplication` to `SoftwareApplication`.
   - Added Blog + Guides nav links (nav only had Home, Tools, About).
   - Fixed relative hrefs in nav and logo to use absolute paths (`/` instead of `../../index.html`).
   - Fixed BreadcrumbList JSON-LD: updated tools URL from `tools.html` to `tools/`.
3. **tools.html canonical** — was already `/tools/` (correct for cleanUrls:true — no change needed).
4. **/distill/ in sitemap** — added root-level landing page `https://cyberscryb.com/distill/` with priority 0.6 (separate from the existing `/tools/distill/` entry).
5. **Tool counts** — updated all count strings from 41 to 42:
   - `index.html` meta description, H1, trust bar, stats counter, "Browse all N tools" link
   - `tools.html` meta description (x2), og:description, twitter:description, JSON-LD `numberOfItems`

### Task 4.4 — Existing Page Sweep

Pages touched:

| Page                         | Fix                                                            |
| ---------------------------- | -------------------------------------------------------------- |
| humanizer/index.html         | JSON-LD `@type`: WebApplication → SoftwareApplication          |
| privacy-generator/index.html | Added breadcrumb nav (HTML) + BreadcrumbList JSON-LD           |
| ai-writing-suite/index.html  | SoftwareApplication JSON-LD + Blog/Guides nav + absolute paths |

Only 3 pages needed fixes. All other tools were already compliant per the audit. `fluid-sim` accepted by triage (no schema needed for visual tool).

## Audit Result

`node scripts/audit-inventory.js --check` now exits 0.

Changes to reach that state:

- Budget-planner frontend built (resolves orphan AI_PROMPT)
- Legacy file removed (0 legacy files)
- Tool counts accurate (actual=42, homepage claims 42)
- `FUTURE_TOOL_PROMPTS` allowlist added to `scripts/audit-inventory.js` for the 5 orphan prompts that have no frontends and are not being built in this phase: `linkedin-post`, `cold-email`, `job-description`, `press-release`, `seo-title`

## Deviations from Plan

None significant. One clarification:

**Canonical check skipped:** The plan said to change tools.html canonical from `tools.html` to `tools`. The file already had `https://cyberscryb.com/tools/` (correct). No change was needed.

## Known Stubs

None. The budget-planner frontend is fully wired to the `budget-planner` AI_PROMPT key in `functions/index.js`. The CSAITool.init flow is identical to all other working Life Tools.

## Undocumented AI_PROMPTS (Future Tools)

Per plan instructions, these 5 orphan prompts in `functions/index.js` have no frontends and are NOT being built in this phase. They are documented here for the next planning cycle:

| Prompt Key        | Notes                                             |
| ----------------- | ------------------------------------------------- |
| `linkedin-post`   | LinkedIn post generator — prompt written, no UI   |
| `cold-email`      | Cold email writer — prompt written, no UI         |
| `job-description` | Job description generator — prompt written, no UI |
| `press-release`   | Press release writer — prompt written, no UI      |
| `seo-title`       | SEO title generator — prompt written, no UI       |

Each has a complete prompt in `functions/index.js`. They can be turned into tools by following the same CSAITool.init pattern used in budget-planner.

## Self-Check: PASSED

| Check                                                  | Result    |
| ------------------------------------------------------ | --------- |
| `public/tools/budget-planner/index.html` exists        | FOUND     |
| `public/tools/budget-planner/budget-planner.js` exists | FOUND     |
| `public/tools/humanizer/index_v1.html` deleted         | CONFIRMED |
| Commit cf459d1 exists                                  | FOUND     |
| `audit-inventory.js --check` exits 0                   | PASSED    |
