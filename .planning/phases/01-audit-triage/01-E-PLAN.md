---
plan_id: 01-E
phase: 1
title: 'Lighthouse audit on top 10 pages + cross-browser AI tool verification + ship critical fixes'
wave: 2
depends_on: [01-A, 01-D]
files_modified:
  - .planning/phases/01-audit-triage/LIGHTHOUSE-REPORT.md
  - .planning/phases/01-audit-triage/CROSSBROWSER-REPORT.md
  - scripts/lighthouse-audit.sh
  - public/tools.html
  - public/index.html
  - public/og-image.png
  - public/css/style.css
autonomous: false
requirements: [AUDIT-04, AUDIT-05]
must_haves:
  - 'LIGHTHOUSE-REPORT.md exists and lists Lighthouse scores (Performance, Accessibility, Best Practices, SEO) for the top 10 pages: homepage, tools.html, summarizer, hardship-letter, humanizer, email-writer, json-csv-converter, password-checker, about.html, /guides/ index'
  - 'Every score below 90 in Performance, Accessibility, or SEO is either fixed in this plan OR explicitly deferred to a named later phase with reason'
  - 'scripts/lighthouse-audit.sh re-runs the audit against the deployed site and writes the report'
  - 'tools.html GA4 loader is deferred matching the index.html pattern (closes CONCERNS.md INFO)'
  - 'Lighthouse-flagged accessibility issues are fixed in this plan if the fix is non-disruptive (alt text, button labels, contrast tweaks via CSS variables already in place)'
  - 'Phase 1 success criterion #3 (top 10 pages score >=90 on Lighthouse perf/a11y/SEO) is satisfied OR every gap has a tracked disposition'
  - 'CROSSBROWSER-REPORT.md exists and documents end-to-end functional verification of the top 5 AI tools (summarizer, hardship-letter, humanizer, email-writer, paraphraser) in Chrome, Safari, Firefox, and mobile (375px viewport) — covers AUDIT-05'
---

<objective>
Measure where the site actually stands on Lighthouse and ship the high-leverage fixes that come out of it.

Purpose: Phase 1 success criterion #3 is concrete: top 10 pages, score >=90 on perf/a11y/SEO. Without measurement we are guessing. This plan runs the audit, captures the numbers, ships the fixes that are cheap, and creates an explicit defer list for fixes that need bigger work (e.g., SVG og:image fix may need a real PNG asset Nate generates locally; that goes to Phase 6 brand polish).

Output: A LIGHTHOUSE-REPORT.md with per-page scores and per-issue dispositions, a reusable scripts/lighthouse-audit.sh runner, and CSS/HTML fixes applied for everything that can be fixed without dragging the plan past its context budget.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/codebase/CONCERNS.md
@.planning/codebase/CONVENTIONS.md
@.planning/phases/01-audit-triage/AUDIT-INVENTORY.md
@CLAUDE.md

# Files frequently flagged by Lighthouse on this site (per CONCERNS.md)

@public/tools.html
@public/index.html
@public/css/style.css

<interfaces>
Top 10 pages to audit (chosen by traffic + strategic importance):
  1. https://cyberscryb.com/                            (homepage)
  2. https://cyberscryb.com/tools                       (tool grid)
  3. https://cyberscryb.com/tools/summarizer/           (canonical AI tool template)
  4. https://cyberscryb.com/tools/hardship-letter/      (top Life Tool)
  5. https://cyberscryb.com/tools/humanizer/            (highest-traffic AI tool)
  6. https://cyberscryb.com/tools/email-writer/         (popular AI tool)
  7. https://cyberscryb.com/tools/json-csv-converter/   (top dev tool)
  8. https://cyberscryb.com/tools/password-checker/     (security tool, indexed well)
  9. https://cyberscryb.com/about                       (root-level page)
  10. https://cyberscryb.com/guides/                    (guides index)

Lighthouse runner: npx -y @lhci/cli@latest collect, or
npx -y lighthouse <url> --output=json --output=html --chrome-flags="--headless"
(if Chrome is available in the runner environment)

If headless Chrome is not available in this environment, the script
must fall back to using PageSpeed Insights API:
https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=<URL>&category=performance&category=accessibility&category=seo
This returns lighthouseResult.categories.{performance,accessibility,seo,best-practices}.score (0-1).

Known issues this audit will likely flag (from CONCERNS.md):

- tools.html GA4 not deferred (loads sync at lines 36-42 — perf hit)
- og:image is SVG (Best Practices warning on most platforms)
- Same AdSense slot ID across all pages (no Lighthouse impact but recorded)
- Image alt text gaps (Accessibility — surface and patch)
- tools.html canonical .html suffix (fixed by Plan D, but verify scored)

Constraint: Cannot deploy from Claude Code web environment.
The audit runs against the ALREADY-DEPLOYED site at cyberscryb.com.
If a fix requires re-deploy to verify, the verify step is a checkpoint
that Nate runs after pushing main (GitHub Actions auto-deploys).
</interfaces>
</context>

<tasks>

<task id="5.1">
  <description>Build the Lighthouse audit runner script and produce LIGHTHOUSE-REPORT.md with current scores for the top 10 pages.</description>
  <files>scripts/lighthouse-audit.sh, .planning/phases/01-audit-triage/LIGHTHOUSE-REPORT.md</files>
  <read_first>
    - /home/user/cyberscryb/.planning/codebase/CONCERNS.md (the perf/SEO/security sections — these predict what Lighthouse will flag)
    - /home/user/cyberscryb/public/tools.html (lines 36-42 area — confirm the synchronous GA4 loader)
    - /home/user/cyberscryb/public/index.html (lines containing the deferred GA4 loader — this is the pattern to copy)
    - /home/user/cyberscryb/public/css/style.css (skim for any obvious accessibility issues — low-contrast colors, missing focus states)
  </read_first>
  <action>Create scripts/lighthouse-audit.sh as a bash script that audits the 10 URLs listed in the interfaces block. Strategy: try the PageSpeed Insights API first because it does not require headless Chrome and works from any environment (no API key needed for low-volume use). For each URL, call https://www.googleapis.com/pagespeedonline/v5/runPagespeed with category params performance, accessibility, seo, best-practices, and strategy=mobile (mobile is the Lighthouse default and what Google ranks on). Parse the JSON response with jq to extract lighthouseResult.categories.{performance,accessibility,seo,best-practices}.score, multiply by 100, round. Also extract the top 3 audits.{audit-key}.title strings where audits[key].score is below 0.9 — these become the "issues" list per page. Write the results to .planning/phases/01-audit-triage/LIGHTHOUSE-REPORT.md as a Markdown table with columns: page, Performance, Accessibility, SEO, Best Practices, top issues (comma-separated). Add a ## Per-Page Findings section below the table with one subsection per page listing every audit that scored below 0.9 with its description. Add a ## Disposition Table section at the bottom that the human fills in after reviewing — pre-populate it with one row per below-90 issue and an empty disposition column (values: fix-in-task-5.2, defer-to-phase-2-ux, defer-to-phase-6-brand, defer-to-phase-3-ai, won't-fix). The script must accept an optional first argument that is the path to write the report to (defaults to .planning/phases/01-audit-triage/LIGHTHOUSE-REPORT.md). The script must handle PSI API rate limits by sleeping 2 seconds between requests. If jq is not available, fall back to grep+sed parsing of the JSON. The script must exit non-zero only on network errors, not on low scores (low scores are data, not failure).</action>
  <verify>
    <automated>cd /home/user/cyberscryb && bash scripts/lighthouse-audit.sh && test -f .planning/phases/01-audit-triage/LIGHTHOUSE-REPORT.md && grep -c '| Performance |' .planning/phases/01-audit-triage/LIGHTHOUSE-REPORT.md</automated>
  </verify>
  <acceptance_criteria>
    - source assertion: file scripts/lighthouse-audit.sh exists and is executable (chmod +x applied)
    - source assertion: file .planning/phases/01-audit-triage/LIGHTHOUSE-REPORT.md exists after running the script
    - source assertion: LIGHTHOUSE-REPORT.md contains a table header row with the columns page, Performance, Accessibility, SEO, Best Practices
    - source assertion: LIGHTHOUSE-REPORT.md contains a ## Per-Page Findings section
    - source assertion: LIGHTHOUSE-REPORT.md contains a ## Disposition Table section with at least one row per below-90 issue
    - behavior assertion: the script returns scores for all 10 URLs (the page column has 10 data rows, not fewer)
  </acceptance_criteria>
  <verification>Run the script. Read the report. Confirm scores are populated for all 10 pages and the disposition table is pre-populated.</verification>
</task>

<task id="5.2">
  <description>Apply the cheap, in-scope Lighthouse fixes: defer GA4 on tools.html, add missing alt text, add missing form labels, normalize meta description lengths, surface any other patches that score below 90 and can be fixed without external assets.</description>
  <files>public/tools.html, public/index.html, public/css/style.css, public/tools/*/index.html (only those flagged with alt-text or label issues by Lighthouse)</files>
  <read_first>
    - /home/user/cyberscryb/.planning/phases/01-audit-triage/LIGHTHOUSE-REPORT.md (the Disposition Table — only act on rows marked fix-in-task-5.2)
    - /home/user/cyberscryb/public/index.html (the existing deferred GA4 loader pattern — exact code to copy to tools.html)
    - /home/user/cyberscryb/public/tools.html (lines 36-42 area where the sync GA4 loader lives)
    - /home/user/cyberscryb/.planning/codebase/CONVENTIONS.md (the deferred GA4 + AdSense pattern — the canonical reference)
  </read_first>
  <action>For each row in LIGHTHOUSE-REPORT.md's Disposition Table where disposition is fix-in-task-5.2, apply the fix. Required fixes regardless of report contents (because they are already documented in CONCERNS.md): (a) public/tools.html — replace the synchronous GA4 loader at lines 36-42 with the exact deferred pattern from public/index.html (the GA4 inline stub + the timeout-based async loader); the resulting tools.html GA4 block must be byte-identical to index.html's pattern except for any page-specific page_path config. (b) For every page in the top 10 that Lighthouse flagged for missing alt text on an img, add a descriptive alt attribute — read the surrounding context to write meaningful alt text (NOT "image" or "icon" — descriptive: alt="CyberScryb logo" for the logo, alt="" for purely decorative SVGs). (c) For every page flagged for "form element does not have associated label", inspect the input and add a visible <label for="..."> or an aria-label attribute. (d) For every page where meta description is outside 140-160 chars, edit to within range using Nate voice (NO banned words — check CLAUDE.md banned list before writing). (e) For Best Practices "image elements do not have explicit width and height", add width/height attrs to flagged img tags. SVG og:image fix is OUT OF SCOPE for this plan — assign disposition defer-to-phase-6-brand because it requires Nate to generate a 1200x630 PNG asset. After applying fixes, append a ## Fixes Applied in 5.2 section to LIGHTHOUSE-REPORT.md listing each change with file:line reference. Do NOT change tool behavior, layout, or copy beyond what Lighthouse flagged. If a fix would require modifying more than 5 tool pages, surface it in the SUMMARY for Phase 2 instead of fixing here (sized to fit this plan's context budget).</action>
  <verify>
    <automated>cd /home/user/cyberscryb && grep -A 5 "G-73LQZEDNR6" public/tools.html | grep -q "setTimeout\|window.addEventListener\|readyState" && grep -q "## Fixes Applied in 5.2" .planning/phases/01-audit-triage/LIGHTHOUSE-REPORT.md</automated>
  </verify>
  <acceptance_criteria>
    - source assertion: public/tools.html GA4 loader uses the deferred pattern — the GA4 script tag is preceded by setTimeout/load-event/readyState logic (no longer a bare async script tag)
    - source assertion: LIGHTHOUSE-REPORT.md ends with a ## Fixes Applied in 5.2 section listing every file changed with file:line references
    - source assertion: Every row in the Disposition Table now has a disposition filled in (no empty cells)
    - source assertion: No banned voice words introduced into any edited meta description (grep -ciE on each edited page returns 0 for banned word list)
    - behavior assertion: After Nate pushes to main and GitHub Actions deploys, re-running scripts/lighthouse-audit.sh shows tools.html Performance score has improved OR the disposition explains why not
  </acceptance_criteria>
  <verification>Read public/tools.html line 36-42 area and confirm the deferred GA4 pattern matches index.html's exactly. Read LIGHTHOUSE-REPORT.md and confirm the ## Fixes Applied section is populated and every disposition is non-empty.</verification>
</task>

<task id="5.3" type="checkpoint:human-verify" gate="blocking">
  <what-built>Plan E delivered: scripts/lighthouse-audit.sh script that runs against the deployed site via PageSpeed Insights API, LIGHTHOUSE-REPORT.md with per-page scores and per-issue dispositions, in-scope fixes applied (tools.html GA4 deferred, alt text gaps closed, meta descriptions normalized, form labels added where missing).</what-built>
  <how-to-verify>
    1. Open .planning/phases/01-audit-triage/LIGHTHOUSE-REPORT.md and confirm: 10 pages have scores, ## Disposition Table is fully populated, ## Fixes Applied in 5.2 section exists.
    2. Confirm tools.html GA4 loader is now deferred (matches index.html pattern).
    3. Push to main. Wait 3-5 min for GitHub Actions to deploy hosting + functions.
    4. Re-run bash scripts/lighthouse-audit.sh after deploy completes. Confirm scores improve on pages where fixes were applied (or that they hold steady).
    5. For any page still below 90, confirm the LIGHTHOUSE-REPORT.md disposition explicitly defers to a named phase with a stated reason.
    6. Confirm SVG og:image fix is documented as defer-to-phase-6-brand (requires PNG asset generation outside this plan's scope).
    7. Optional: open one of the audited pages in Chrome DevTools Lighthouse and run a manual audit to spot-check the PSI API scores match.
  </how-to-verify>
  <resume-signal>Type "approved" when verified, or describe what's missing.</resume-signal>
</task>

<task id="5.4" type="checkpoint:human-verify" gate="blocking">
  <description>Cross-browser functional verification of the top 5 AI tools — satisfies AUDIT-05.</description>
  <files>.planning/phases/01-audit-triage/CROSSBROWSER-REPORT.md</files>
  <read_first>
    - /home/user/cyberscryb/.planning/REQUIREMENTS.md (AUDIT-05 exact requirement text)
    - /home/user/cyberscryb/public/tools/shared/ai-tool.js (the shared core that drives every AI tool — understand the email gate / generation / copy flow)
  </read_first>
  <action>Create .planning/phases/01-audit-triage/CROSSBROWSER-REPORT.md as a manual verification log. Nate runs this checklist on the deployed site at cyberscryb.com for each of the top 5 AI tools (summarizer, hardship-letter, humanizer, email-writer, paraphraser) in 4 environments (Chrome desktop, Safari desktop, Firefox desktop, mobile 375px viewport — use Chrome DevTools device mode if no physical device). For each tool × environment cell, run this flow and record PASS or FAIL with notes: (1) load the tool page, (2) paste 100-300 chars of test input, (3) click Generate, (4) confirm a result appears (typewriter animation OK), (5) if the email gate appears, enter a test email and confirm it unlocks the result, (6) click Copy and confirm the system clipboard now contains the output. The report file template (Claude writes the template, Nate fills in PASS/FAIL):

```
# Cross-Browser AI Tool Verification — Phase 1

| Tool             | Chrome | Safari | Firefox | Mobile 375px |
|------------------|--------|--------|---------|--------------|
| summarizer       |        |        |         |              |
| hardship-letter  |        |        |         |              |
| humanizer        |        |        |         |              |
| email-writer     |        |        |         |              |
| paraphraser      |        |        |         |              |

## Failures and Workarounds
(For each FAIL, document the tool, browser, what broke, and any workaround or follow-up task.)

## Approved
- Verifier: Nate
- Date:
- All FAILs have either fixes in this phase or follow-up phase assignments: yes/no
```

Nate runs the verification, fills in the table, and types "approved" to resume. If any cell fails AND the fix is cheap, add it to LIGHTHOUSE-REPORT.md disposition as fix-in-task-5.2 and re-loop. If the fix is expensive, defer to a named later phase (e.g., Phase 2 UX polish for mobile layout issues, Phase 3 AI quality for cross-browser streaming behavior).</action>
<verify>
<automated>test -f /home/user/cyberscryb/.planning/phases/01-audit-triage/CROSSBROWSER-REPORT.md && grep -c "| summarizer" /home/user/cyberscryb/.planning/phases/01-audit-triage/CROSSBROWSER-REPORT.md</automated>
</verify>
<acceptance_criteria> - source assertion: file .planning/phases/01-audit-triage/CROSSBROWSER-REPORT.md exists - source assertion: CROSSBROWSER-REPORT.md has a table row for each of: summarizer, hardship-letter, humanizer, email-writer, paraphraser - source assertion: CROSSBROWSER-REPORT.md has 4 verification columns: Chrome, Safari, Firefox, Mobile 375px - behavior assertion: after Nate fills in the table, every cell is PASS or has a documented FAIL with a follow-up disposition - source assertion: CROSSBROWSER-REPORT.md includes an "Approved" block with Nate's name and date once verification is complete
</acceptance_criteria>
<verification>Read the file. Confirm the table exists and every cell either says PASS or has a documented FAIL with a disposition (fix-now or defer-to-phase-N).</verification>
<resume-signal>Type "approved" when Nate has filled in the table and recorded outcomes for all 20 cells.</resume-signal>
</task>

</tasks>

<verification>
- bash scripts/lighthouse-audit.sh produces LIGHTHOUSE-REPORT.md with scores for 10 pages
- Every below-90 issue has a disposition (fix-in-task-5.2, defer-to-named-phase, won't-fix)
- tools.html GA4 loader matches the index.html deferred pattern
- After redeploy, tools.html Performance score has improved or the disposition explains why not
- Phase 1 success criterion #3 is satisfied OR every gap is tracked with reason
</verification>

<success_criteria>

- The site has measurable baseline Lighthouse scores for the first time (no more guessing)
- Cheap fixes are shipped immediately
- Expensive fixes (SVG og:image PNG conversion, blocking script audits, image optimization) are explicitly deferred with phase assignments
- scripts/lighthouse-audit.sh is reusable as a smoke test before any future release
  </success_criteria>

<output>
Create .planning/phases/01-audit-triage/01-E-SUMMARY.md when done, summarizing: baseline scores per page (before fixes), fixes applied, expected impact, deferred issues with phase assignments, and any surprises Lighthouse flagged that weren't in CONCERNS.md.
</output>
