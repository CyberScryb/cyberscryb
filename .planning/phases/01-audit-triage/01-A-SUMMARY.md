---
phase: '01'
plan: 'A'
subsystem: 'audit-tooling'
tags: ['audit', 'inventory', 'tooling']
dependency_graph:
  requires: []
  provides: ['tool-inventory', 'orphan-report', 'triage-decisions']
  affects: ['01-D-PLAN.md']
tech_stack:
  added: []
  patterns: ['Node.js script with no external deps', 'Markdown report generation']
key_files:
  created:
    - scripts/audit-inventory.js
    - .planning/phases/01-audit-triage/AUDIT-INVENTORY.md
  modified: []
decisions:
  - 'budget-planner assigned fix-in-plan-D — Life Tool with high hardship audience fit'
  - '5 undocumented AI_PROMPTS (linkedin-post, cold-email, job-description, press-release, seo-title) found and triaged as future tools'
  - 'humanizer/index_v1.html assigned remove disposition'
metrics:
  duration: '~10 minutes'
  completed: '2026-05-26'
  tasks_completed: 1
  files_created: 2
---

# Phase 01 Plan A: Tool Inventory Audit Summary

Automated inventory script cross-referencing 49 tools against 4 registries (AI_PROMPTS, tools.html, sitemap.xml, homepage dropdown), surfacing 6 orphan AI prompts, 1 legacy file, and tool count drift.

## What Was Built

`scripts/audit-inventory.js` — zero-dependency Node.js script that:

- Reads `functions/index.js`, `public/tools.html`, `public/sitemap.xml`, `public/index.html`
- Walks all `public/tools/*/` directories
- Produces a 49-row Markdown table with 12 attribute columns per tool
- Outputs 4 analysis sections: Orphan AI_PROMPTS, Orphan Frontends, Tool Count Drift, Legacy Files
- Supports `--check` flag (exits 1 if new orphans exist outside allowlist)
- Preserves manually-appended `## Triage Decisions` section on re-runs

`AUDIT-INVENTORY.md` — the generated report with triage decisions appended.

## Total Tools Inventoried

49 unique tool names across all registries (43 directories + 6 AI_PROMPTS-only keys).

Breakdown:

- **AI writing tools:** 17 (11 fully wired, 5 future/orphan prompts, 1 pending wiring)
- **Dev tools:** 22 (all fully wired)
- **Life tools:** 5 (4 fully wired, 1 missing frontend — budget-planner)
- **Special/other:** 5 (ai-writing-suite, distill, fluid-sim, gig-auto-pilot, shared)

## Orphans Found

**6 Orphan AI_PROMPTS** (prompt defined, no frontend directory):

- `budget-planner` — priority Life Tool, frontend needs to be built
- `linkedin-post`, `cold-email`, `job-description`, `press-release`, `seo-title` — future tools with prompts already written but no UI

**0 New Orphan Frontends** — the only frontend-without-registries is `shared` (helper, in allowlist)

## Triage Decisions Summary

| disposition     | count | items                                                                                                                                                                   |
| --------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fix-in-plan-D` | 13    | budget-planner, ai-writing-suite wiring, distill sitemap, count drift, 5 future tools, ai-writing-suite JSON-LD + nav, humanizer JSON-LD, privacy-generator breadcrumbs |
| `remove`        | 1     | humanizer/index_v1.html                                                                                                                                                 |
| `accepted`      | 1     | fluid-sim missing JSON-LD/breadcrumbs                                                                                                                                   |

## Surprises

**5 undocumented AI_PROMPTS discovered.** The plan expected 16 AI_PROMPTS keys. The actual `functions/index.js` has 21 keys — 5 additional prompts (linkedin-post, cold-email, job-description, press-release, seo-title) were written but never documented in CLAUDE.md or any plan. These are fully functional prompts with no frontend. All triaged as `fix-in-plan-D`.

**tools.html meta count lag.** tools.html meta description still says "39+" while the actual tool count is 41 and index.html already says "41". Minor but creates inconsistent signals for search crawlers.

**distill directory exists but has no index.html.** Only `public/tools/distill/privacy.html` exists inside that dir. The sitemap lists `/tools/distill/` but tools.html does not. This is a half-built page — the sitemap URL will 404.

## Self-Check

- [x] `scripts/audit-inventory.js` exists and `node scripts/audit-inventory.js` exits 0
- [x] `AUDIT-INVENTORY.md` exists with table header `| tool | category | has_directory | in_AI_PROMPTS |`
- [x] Report contains all 4 required sections
- [x] `## Triage Decisions` section present with disposition for every flagged item
- [x] `budget-planner` assigned `fix-in-plan-D`
- [x] Committed: 907bb9b
- [x] Pushed to branch claude/install-gsd-build-MINOx
