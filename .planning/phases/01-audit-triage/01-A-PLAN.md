---
plan_id: 01-A
phase: 1
title: 'Static inventory: cross-reference every tool against AI_PROMPTS, tools.html, sitemap.xml, homepage dropdown'
wave: 1
depends_on: []
files_modified:
  - .planning/phases/01-audit-triage/AUDIT-INVENTORY.md
  - scripts/audit-inventory.js
autonomous: true
requirements: [AUDIT-03, AUDIT-06]
must_haves:
  - 'AUDIT-INVENTORY.md exists and lists every tool directory under public/tools/ with cross-reference columns: in AI_PROMPTS?, in tools.html?, in sitemap.xml?, in homepage dropdown?, has JSON-LD?, has Blog nav link?, has breadcrumbs?'
  - 'Every orphan (toolId in AI_PROMPTS with no frontend, or frontend with no AI_PROMPTS entry, or tool with no tools.html card) is flagged with severity and remediation owner (Plan D vs out-of-phase)'
  - 'Inventory script scripts/audit-inventory.js is runnable via node and exits 0 when no new orphans are introduced after Plan D fixes ship'
  - "Phase 1 success criterion #5 (every AI tool's toolId maps to a key in AI_PROMPTS; no orphan tools or orphan prompts) has a single source of truth document"
---

<objective>
Produce the authoritative inventory of every tool on the site, cross-referenced against every registry it should appear in (AI_PROMPTS dispatch table, tools.html grid, sitemap.xml, homepage dropdown, JSON-LD, nav, breadcrumbs).

Purpose: Phase 1 cannot fix what isn't measured. CONCERNS.md already lists suspected orphans (`budget-planner` prompt with no page, `ai-writing-suite` tool with no sitemap entry, `humanizer/index_v1.html` legacy file, inconsistent tool counts). Plan D consumes this inventory to ship fixes; downstream phases consume it for nav/Schema work.
Output: `.planning/phases/01-audit-triage/AUDIT-INVENTORY.md` (the report) and `scripts/audit-inventory.js` (the script that regenerates it and exits non-zero on regression).
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/codebase/STRUCTURE.md
@.planning/codebase/CONCERNS.md
@.planning/codebase/CONVENTIONS.md
@CLAUDE.md

# Source-of-truth files the inventory must read

@functions/index.js
@public/tools.html
@public/sitemap.xml
@public/index.html

<interfaces>
<!-- AI_PROMPTS dispatch table keys (from functions/index.js lines 256–600+) -->
<!-- Confirmed via grep: 16 keys present -->

AI_PROMPTS keys (as of 2026-05-20):

- summarizer
- email-writer
- bio-generator
- product-description
- code-explainer
- meta-description
- ai-detector
- hardship-letter
- appeal-letter
- custody-document
- caregiver-report
- budget-planner <-- prompt exists, NO frontend (confirmed orphan, CONCERNS.md)
- resume-bullets
- tweet-generator
- paraphraser
- voice-writer

Tool directories under public/tools/ (43 directories including 'shared'):
ai-detector, ai-writing-suite, appeal-letter, base64-tool, bio-generator,
caregiver-report, case-converter, code-explainer, color-palette, cron-builder,
custody-document, distill, email-writer, epoch-converter, fluid-sim,
gig-auto-pilot, hardship-letter, hash-generator, html-entity, humanizer,
json-csv-converter, json-formatter, jwt-decoder, lorem-ipsum, markdown-html,
meta-description, paraphraser, password-checker, privacy-generator,
product-description, qr-generator, regex-tester, resume-bullets,
seo-tag-generator, shared, slug-generator, summarizer, text-diff,
tweet-generator, url-encoder, uuid-generator, voice-writer, word-counter

Special cases (NOT in AI_PROMPTS, handled separately):

- humanizer: uses /api/rewrite → exports.rewriteText (legacy, not AI_PROMPTS)
- gig-auto-pilot: uses /api/gig → exports.generateGigWork (separate function)
- shared: not a tool, contains ai-tool.js
- distill: Chrome extension landing page, not an AI tool
- ai-writing-suite: unknown status, must inspect (CONCERNS.md flagged)
- fluid-sim: visual/fun tool, client-side only

Known issues from CONCERNS.md to flag in inventory:

1. budget-planner — prompt in functions/index.js lines 479-498, NO public/tools/budget-planner/ directory
2. humanizer/index_v1.html — legacy file alongside index.html, only one should be canonical
3. ai-writing-suite — directory exists, NOT in tools.html, NOT in sitemap.xml
4. distill — linked from tools.html, NOT in sitemap.xml
5. Tool count claims inconsistent: index.html says "41", tools.html meta says "39+", og says "38+", JSON-LD says 38
6. tools.html canonical URL still uses ".html" suffix (cleanUrls strips it in production)
</interfaces>

</context>

<tasks>

<task id="1.1">
  <description>Write the inventory generation script that produces AUDIT-INVENTORY.md by cross-referencing every registry.</description>
  <files>scripts/audit-inventory.js</files>
  <read_first>
    - /home/user/cyberscryb/functions/index.js (extract AI_PROMPTS keys by regex matching `^\s+'[a-z-]+':\s*\{` in the AI_PROMPTS object literal between lines ~256 and the closing brace before the `cleanInput` helper)
    - /home/user/cyberscryb/public/tools.html (extract every `href` containing `/tools/` that points to a tool subdirectory)
    - /home/user/cyberscryb/public/sitemap.xml (extract every `<loc>` value)
    - /home/user/cyberscryb/public/index.html (extract every `<option value="...">` from the homepage tool dropdown)
    - /home/user/cyberscryb/.planning/codebase/STRUCTURE.md (list of tool categories — Life Tools, AI Writing Tools, Developer Tools)
    - /home/user/cyberscryb/.planning/codebase/CONCERNS.md (known orphans to assert against)
  </read_first>
  <action>Create a Node script at `scripts/audit-inventory.js` (no external deps — use only built-in `fs` and `path`). The script reads all five source-of-truth files listed in `<read_first>`, builds five Sets (`promptKeys`, `toolDirs`, `toolsHtmlEntries`, `sitemapEntries`, `homepageDropdownEntries`), then walks `public/tools/*/` and emits a Markdown table with columns: `tool`, `category` (life|ai-writing|dev|other), `has_directory`, `in_AI_PROMPTS`, `in_tools_html`, `in_sitemap`, `in_homepage_dropdown`, `has_index_html`, `has_json_ld`, `has_blog_nav_link`, `has_breadcrumbs`, `has_canonical`, `legacy_files` (e.g., index_v1.html siblings). Each boolean column uses `yes` or `no` literals, not emoji. The script also emits four explicit sections after the table: `## Orphan AI_PROMPTS` (prompt key with no `public/tools/{key}/index.html`), `## Orphan Frontends` (directory present but not in AI_PROMPTS, tools.html, sitemap.xml, or homepage dropdown — excluding `shared/`, `distill/`, `fluid-sim/`, `ai-writing-suite/`, `humanizer/`, `gig-auto-pilot/` which are documented exceptions), `## Tool Count Drift` (the exact strings claiming a count from index.html and tools.html with line numbers), and `## Legacy Files` (any `index_v*.html` or sibling duplicate). Script exits with code 1 if `Orphan AI_PROMPTS` or `Orphan Frontends` is non-empty AFTER an allowlist of documented exceptions is applied; exit 0 otherwise. The allowlist is a `const KNOWN_EXCEPTIONS` array in the script header, populated initially with `humanizer` (uses /api/rewrite), `gig-auto-pilot` (uses /api/gig), `distill` (landing page), `fluid-sim` (visual), `shared` (helper), and reading the schema for `has_json_ld` uses a string-contains check for `"@type": "SoftwareApplication"` in the index.html. Write output to `.planning/phases/01-audit-triage/AUDIT-INVENTORY.md` overwriting any existing file. Add a CLI flag `--check` that runs the script silently and exits non-zero on regression (no file write). Do not import any external library. Use `process.cwd()` resolved against `path.join` for all file reads so the script runs from project root.</action>
  <verify>
    <automated>cd /home/user/cyberscryb && node scripts/audit-inventory.js && test -f .planning/phases/01-audit-triage/AUDIT-INVENTORY.md && grep -c '| tool |' .planning/phases/01-audit-triage/AUDIT-INVENTORY.md</automated>
  </verify>
  <acceptance_criteria>
    - source assertion: file `/home/user/cyberscryb/scripts/audit-inventory.js` exists
    - source assertion: file `/home/user/cyberscryb/.planning/phases/01-audit-triage/AUDIT-INVENTORY.md` exists after running the script
    - behavior assertion: `node scripts/audit-inventory.js` exits 0 when only documented exceptions remain
    - behavior assertion: `node scripts/audit-inventory.js --check` exits non-zero if a new orphan is introduced (test by temporarily adding a fake `'fake-tool': {}` line to AI_PROMPTS and verifying exit code is 1)
    - source assertion: `AUDIT-INVENTORY.md` contains a Markdown table header line matching `| tool | category | has_directory | in_AI_PROMPTS |`
    - source assertion: `AUDIT-INVENTORY.md` contains the section headers `## Orphan AI_PROMPTS`, `## Orphan Frontends`, `## Tool Count Drift`, `## Legacy Files`
  </acceptance_criteria>
  <verification>Run the script. Open AUDIT-INVENTORY.md and confirm the table lists 40+ tools and the four orphan/drift sections are populated.</verification>
</task>

<task id="1.2">
  <description>Generate the inventory report and triage every finding into a categorized fix list that Plan D consumes.</description>
  <files>.planning/phases/01-audit-triage/AUDIT-INVENTORY.md</files>
  <read_first>
    - /home/user/cyberscryb/scripts/audit-inventory.js (the script just created)
    - /home/user/cyberscryb/.planning/codebase/CONCERNS.md (cross-check that every CONCERNS-listed orphan appears in the report; if any is missing the script is buggy)
    - /home/user/cyberscryb/public/tools/ai-writing-suite/index.html (inspect to determine: is this a finished tool that should be wired up, or a draft to remove?)
    - /home/user/cyberscryb/public/tools/humanizer/index_v1.html (compare against `index.html` to confirm it's legacy)
  </read_first>
  <action>Run the script from Task 1.1 to generate `AUDIT-INVENTORY.md`. After it generates, manually append a `## Triage Decisions` section at the end of the file. For each item in `## Orphan AI_PROMPTS`, `## Orphan Frontends`, `## Tool Count Drift`, and `## Legacy Files`, add a row with three columns: `finding`, `disposition` (one of: `fix-in-plan-D`, `defer-to-phase-3`, `defer-to-phase-6`, `remove`, `keep-as-documented-exception`), `notes`. Specific dispositions required: `budget-planner` orphan prompt → `fix-in-plan-D` with note "Build frontend per CONCERNS.md Tech Debt section — Life Tool fits hardship audience"; `humanizer/index_v1.html` → `remove` with note "Legacy file, supersede by index.html"; `ai-writing-suite` → after inspecting the file: `remove` if it's a draft, or `fix-in-plan-D` (wire up to tools.html + sitemap.xml + dropdown) if it's complete; `distill` not in sitemap → `fix-in-plan-D` with note "Add /distill/ to sitemap.xml"; tool count drift → `fix-in-plan-D` with note "Standardize on actual count from inventory (count the rows where has_directory=yes AND in_tools_html=yes), update index.html hero + trust bar + stat counter + tools.html meta/og/JSON-LD". Commit AUDIT-INVENTORY.md to git.</action>
  <verify>
    <automated>grep -c '## Triage Decisions' /home/user/cyberscryb/.planning/phases/01-audit-triage/AUDIT-INVENTORY.md | grep -v '^#' | grep -c "^1$"</automated>
  </verify>
  <acceptance_criteria>
    - source assertion: AUDIT-INVENTORY.md contains the section `## Triage Decisions`
    - source assertion: AUDIT-INVENTORY.md mentions `budget-planner` AND assigns it `fix-in-plan-D`
    - source assertion: AUDIT-INVENTORY.md mentions `humanizer/index_v1.html` AND assigns it `remove` or `fix-in-plan-D`
    - source assertion: AUDIT-INVENTORY.md mentions `ai-writing-suite` with an explicit disposition
    - behavior assertion: `git log --oneline -1 -- .planning/phases/01-audit-triage/AUDIT-INVENTORY.md` returns a commit (file is tracked)
  </acceptance_criteria>
  <verification>Open the file. Confirm every row in every orphan/drift section has a triage row in the `## Triage Decisions` table. Confirm git log shows the commit.</verification>
</task>

</tasks>

<verification>
- `node scripts/audit-inventory.js` exits 0 and produces a Markdown report with 40+ tool rows and four orphan/drift sections
- Every CONCERNS.md-listed orphan (budget-planner, humanizer/index_v1.html, ai-writing-suite, distill missing from sitemap, tool count drift) appears in the report
- The `## Triage Decisions` table has a disposition for every flagged item
- The script can be re-run after Plan D ships fixes and will exit 0 once orphans are resolved (regression gate for downstream phases)
</verification>

<success_criteria>

- AUDIT-INVENTORY.md is the single source of truth for "what tools exist and where they should be registered"
- Plan D has a concrete, prioritized list to work from (no exploration needed)
- The `--check` mode gives Phase 2+ a CI-style regression guard against new orphans
- Phase 1 success criterion #5 is measurable and verifiable
  </success_criteria>

<output>
Create `.planning/phases/01-audit-triage/01-A-SUMMARY.md` when done, summarizing: total tools inventoried, count of orphans found by category, triage decisions assigned to Plan D vs deferred, and any surprises that emerged from the inspection of `ai-writing-suite/index.html`.
</output>
