---
plan_id: 01-D
phase: 1
title: 'Apply inventory fixes: build budget-planner frontend, remove humanizer/index_v1.html, wire/remove ai-writing-suite, standardize tool counts, add distill to sitemap, fix tools.html canonical'
wave: 2
depends_on: [01-A]
files_modified:
  - public/tools/budget-planner/index.html
  - public/tools/budget-planner/budget-planner.js
  - public/tools.html
  - public/index.html
  - public/sitemap.xml
  - public/tools/humanizer/index_v1.html
  - public/tools/ai-writing-suite/index.html
autonomous: false
requirements: [AUDIT-03, AUDIT-06]
must_haves:
  - "public/tools/budget-planner/index.html and public/tools/budget-planner/budget-planner.js exist, follow the summarizer template, and CSAITool.init({ toolId: 'budget-planner', ... }) is wired"
  - 'budget-planner is listed in tools.html (Life Tools section), in public/sitemap.xml, and as an option in the public/index.html homepage dropdown'
  - "public/tools/humanizer/index_v1.html is deleted from the repo OR its triage disposition in AUDIT-INVENTORY.md is explicitly 'keep-as-documented-exception' with a comment in the file explaining why"
  - 'ai-writing-suite is resolved per AUDIT-INVENTORY.md triage decision (either fully wired into tools.html + sitemap.xml + dropdown, OR removed from public/tools/)'
  - '/distill/ is in public/sitemap.xml'
  - 'public/tools.html canonical link points to https://cyberscryb.com/tools (no .html suffix)'
  - 'Tool count claims in public/index.html and public/tools.html match the actual count derived from the inventory; index.html hero/trust-bar/stat-counter and tools.html meta/og/JSON-LD numberOfItems all show the same number'
  - 'Running scripts/audit-inventory.js exits 0 (no orphans remain except documented exceptions)'
  - 'Existing tool pages flagged by AUDIT-INVENTORY.md as missing nav/JSON-LD/breadcrumbs are swept and fixed (or documented as structural exceptions / deferred to Phase 2). AUDIT-INVENTORY.md gets a ## Existing-Page Sweep section listing every page touched. Closes Phase 1 success criterion #4 for ALL tool pages, not just budget-planner.'
---

<objective>
Ship the visible-to-user fixes the inventory found. This is the plan that converts AUDIT-INVENTORY.md from a report into closed gaps.

Purpose: Plan A produced a list. Plan D acts on it. The fixes here are user-facing wins (a new Life Tool that exactly fits the financial hardship audience per PROJECT.md, removal of stale duplicate files, consistent tool counts, every page in the sitemap so Google can index it). Each fix individually is small; together they close half of Phase 1's success criteria.

Output: A working budget-planner tool page, an updated tools.html / index.html / sitemap.xml with consistent numbers, removed legacy files, and a green scripts/audit-inventory.js --check run.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/phases/01-audit-triage/01-A-SUMMARY.md
@.planning/phases/01-audit-triage/AUDIT-INVENTORY.md
@.planning/codebase/CONVENTIONS.md
@.planning/codebase/CONCERNS.md
@CLAUDE.md

# Template + reference files

@public/tools/summarizer/index.html
@public/tools/summarizer/summarizer.js
@public/tools/hardship-letter/index.html
@public/tools/hardship-letter/hardship-letter.js
@functions/index.js
@public/tools.html
@public/index.html
@public/sitemap.xml

<interfaces>
The budget-planner prompt already exists in functions/index.js lines 479-498.
It expects body { tool: 'budget-planner', input: <user financial situation>, params: { situation: string } }.
params.situation is free-text; sanitizeParams will slice(0, 300).

CSAITool.init contract (from public/tools/shared/ai-tool.js):
window.CSAITool.init({
toolId: 'budget-planner',
emptyMessage: 'Please describe your situation.',
collectInput: () => document.getElementById('tool-input').value.trim(),
collectParams: () => ({
situation: document.getElementById('situation-select')?.value || ''
}),
onStats: (text) => { /* optional word counter etc */ }
});

Required DOM IDs (from CONVENTIONS.md "The CSAITool.init Pattern"):
generate-btn, output-text, loading-indicator, copy-btn,
email-gate, gate-email-form, gate-email-input, gate-status,
gate-submit-btn, upgrade-tiers, usage-counter

Nav menu links (CONVENTIONS.md exact order — Blog uses absolute /blog/):
Home -> Tools -> Guides -> About -> Blog (/blog/)

Script load order at end of body:
../../js/script.js, ../shared/ai-tool.js, ./budget-planner.js,
../shared/affiliate-panel.js, /js/cs-pro-widget.js?v=2 (defer)

Schema.org JSON-LD: SoftwareApplication, price "0", priceCurrency "USD",
applicationCategory "FinanceApplication".
</interfaces>
</context>

<tasks>

<task id="4.1">
  <description>Build the budget-planner frontend (HTML + JS) following the hardship-letter template (closest Life Tool sibling), and wire it into tools.html, sitemap.xml, and the homepage dropdown.</description>
  <files>public/tools/budget-planner/index.html, public/tools/budget-planner/budget-planner.js, public/tools.html, public/sitemap.xml, public/index.html</files>
  <read_first>
    - /home/user/cyberscryb/public/tools/hardship-letter/index.html (Life Tool template — title, meta, breadcrumbs, two-panel layout, FAQ, related tools, Schema.org JSON-LD)
    - /home/user/cyberscryb/public/tools/hardship-letter/hardship-letter.js (the CSAITool.init shape for a Life Tool with a select param)
    - /home/user/cyberscryb/functions/index.js (the existing budget-planner prompt at lines 479-498 — confirm the param name is `situation` and note the prompt's intent: list income sources, categorize expenses, suggest free resources like 211/LIHEAP/SNAP)
    - /home/user/cyberscryb/public/tools.html (find the Life Tools section in the tool grid — locate the hardship-letter card and insert the budget-planner card immediately after)
    - /home/user/cyberscryb/public/sitemap.xml (find the existing tool entries, identify priority/changefreq used for Life Tools)
    - /home/user/cyberscryb/public/index.html (find the homepage tool dropdown — locate the option block for Life Tools)
  </read_first>
  <action>Create public/tools/budget-planner/index.html by copying the structure of public/tools/hardship-letter/index.html then modify these specifics. Title: "Budget Planner — Free Survival Budget Generator | CyberScryb". Meta description (140-160 chars, benefit-focused, hardship audience — sample: "Get a real survival budget when money's tight. Free tool. Lists local resources, prioritizes bills, no signup required for one try."). Canonical: https://cyberscryb.com/tools/budget-planner/. Breadcrumb path Home > Tools > Budget Planner. H1: "Budget Planner". Subhead one short sentence in Nate voice (NO banned words). Input panel label "Describe your money situation:" with textarea id tool-input placeholder "e.g. Lost my job 3 weeks ago, $400 in checking, $1200 rent due in 10 days, no credit card debt...". A select id situation-select with options: empty value "Just describe my situation", "job loss" -> "Lost my job", "medical" -> "Medical bills crushing me", "reduced hours" -> "Hours got cut", "single income" -> "Family on one income now". If AUDIT-INVENTORY.md triage specifies different option values, honor those instead — the prompt sees a free-text string so any short label is fine. Output panel with id output-text and all the required DOM IDs from the interfaces block. FAQ block with 5 questions specific to budgeting hardship — sample questions: "Is this a real budget or just generic advice?", "Will this work if I have no income at all?", "What's the 211 hotline?", "Does this replace a financial counselor?", "Why does it ask about my situation?". Schema.org SoftwareApplication JSON-LD with applicationCategory "FinanceApplication". Nav menu MUST use absolute /blog/ link per CONVENTIONS.md. All asset paths MUST use ../../css/style.css, ../../js/script.js, ../../favicon.svg (tool pages are 2 levels deep). Deferred GA4 + AdSense per CONVENTIONS.md exact pattern (G-73LQZEDNR6 and ca-pub-5721233331247292 — no other IDs). Then create public/tools/budget-planner/budget-planner.js mirroring hardship-letter.js structure: wrap in DOMContentLoaded handler calling CSAITool.init with toolId 'budget-planner', emptyMessage "Tell me about your situation — even a few lines helps.", collectInput reading #tool-input, collectParams returning an object with situation from #situation-select. Then edit public/tools.html: insert a new tool card for budget-planner in the Life Tools section immediately after the hardship-letter card, using the same markup pattern. Then edit public/sitemap.xml: add a url entry with loc https://cyberscryb.com/tools/budget-planner/, changefreq monthly, priority 0.7, placed near other tool entries. Then edit public/index.html: find the homepage dropdown option group for Life Tools and add the budget-planner option in alphabetical order. NO banned voice words anywhere — re-read CLAUDE.md banned list before writing copy (leverage, utilize, delve, tapestry, landscape, foster, moreover, furthermore, cutting-edge, game-changer, revolutionary, robust, seamless, innovative, empower, holistic, synergy, unlock, harness, thin, elevate, pivotal, nuanced). NO fabricated stats.</action>
  <verify>
    <automated>test -f /home/user/cyberscryb/public/tools/budget-planner/index.html && test -f /home/user/cyberscryb/public/tools/budget-planner/budget-planner.js && grep -q "budget-planner" /home/user/cyberscryb/public/tools.html && grep -q "tools/budget-planner/" /home/user/cyberscryb/public/sitemap.xml && grep -q "budget-planner" /home/user/cyberscryb/public/index.html && BANNED=$(grep -ciE "leverage|utilize|delve|robust|seamless|innovative|empower|holistic|synergy|unlock|harness|tapestry|foster|moreover|furthermore|game-changer|revolutionary|cutting-edge" /home/user/cyberscryb/public/tools/budget-planner/index.html) && [ "$BANNED" = "0" ]</automated>
  </verify>
  <acceptance_criteria>
    - source assertion: public/tools/budget-planner/index.html exists and contains the strings tool-input, output-text, email-gate, generate-btn, loading-indicator, upgrade-tiers, /blog/, ../../css/style.css, "@type": "SoftwareApplication"
    - source assertion: public/tools/budget-planner/budget-planner.js contains CSAITool.init( and toolId 'budget-planner'
    - source assertion: public/tools.html contains a link to /tools/budget-planner/
    - source assertion: public/sitemap.xml contains <loc>https://cyberscryb.com/tools/budget-planner/</loc>
    - source assertion: public/index.html contains tools/budget-planner/ inside a dropdown option
    - source assertion: NONE of the banned voice words appear in the new tool's index.html (case-insensitive grep returns 0)
    - behavior assertion: node scripts/audit-inventory.js --check exits 0 (budget-planner is no longer an orphan)
  </acceptance_criteria>
  <verification>Visually inspect the tool page via Read tool. Confirm two-panel layout, FAQ present, breadcrumbs present, schema present. Run scripts/audit-inventory.js --check and confirm exit 0.</verification>
</task>

<task id="4.2">
  <description>Remove legacy humanizer/index_v1.html per inventory triage, resolve ai-writing-suite per inventory triage, fix tools.html canonical, add /distill/ to sitemap, and standardize tool counts across index.html and tools.html.</description>
  <files>public/tools/humanizer/index_v1.html, public/tools/ai-writing-suite/index.html, public/tools.html, public/index.html, public/sitemap.xml</files>
  <read_first>
    - /home/user/cyberscryb/.planning/phases/01-audit-triage/AUDIT-INVENTORY.md (specifically the ## Triage Decisions section — the disposition for each item is the authoritative source for this task)
    - /home/user/cyberscryb/public/tools/humanizer/index_v1.html (confirm this is legacy by comparing first 20 lines to public/tools/humanizer/index.html — if substantively different, surface the discrepancy in the SUMMARY)
    - /home/user/cyberscryb/public/tools/ai-writing-suite/index.html (read fully — determine: is this a complete tool ready to wire up, or a draft to remove?)
    - /home/user/cyberscryb/public/tools.html (line 11 area — confirm the canonical tag still has .html suffix per CONCERNS.md SEO Gaps)
    - /home/user/cyberscryb/public/index.html (find the tool-count claims — search for "41" first, then identify the exact contexts: hero text, trust bar, stat counter)
  </read_first>
  <action>Resolve each inventory triage decision from AUDIT-INVENTORY.md. (a) humanizer/index_v1.html: if AUDIT-INVENTORY.md ## Triage Decisions says remove, delete the file. If it says keep-as-documented-exception, leave it but add an HTML comment at the top "LEGACY: kept for {reason}. See AUDIT-INVENTORY.md triage." (b) ai-writing-suite: if triage says remove, delete the directory public/tools/ai-writing-suite/. If triage says fix-in-plan-D (wire it up): add a tool card to public/tools.html using the closest sibling tool card as template, add a sitemap url entry with loc https://cyberscryb.com/tools/ai-writing-suite/ to public/sitemap.xml, and add the option to the homepage dropdown. (c) tools.html canonical: change the canonical link tag from https://cyberscryb.com/tools.html to https://cyberscryb.com/tools (no .html — cleanUrls strips it). (d) distill missing from sitemap: add a url entry to public/sitemap.xml with loc https://cyberscryb.com/distill/, changefreq monthly, priority 0.6. (e) Tool count standardization: count the rows in AUDIT-INVENTORY.md where has_directory=yes AND in_tools_html=yes — call this number N. In public/index.html find every occurrence of "41" in user-facing text (hero, trust bar, stat counter) and replace with N if N differs from 41; in public/tools.html update meta description, og:description, and the numberOfItems field in the ItemList JSON-LD to N. Do NOT change "41" if it appears in unrelated contexts (CSS dimensions, dates, etc.) — only change semantic tool-count strings. If unsure whether a "41" is a tool count or a coincidence, surface it in the SUMMARY for human review rather than silently editing. After all edits, run scripts/audit-inventory.js again — ## Tool Count Drift should now be empty.</action>
  <verify>
    <automated>cd /home/user/cyberscryb && node scripts/audit-inventory.js && grep -q 'href="https://cyberscryb.com/tools"' public/tools.html && grep -q "cyberscryb.com/distill/" public/sitemap.xml && ! grep -E 'rel="canonical"[^>]*href="https://cyberscryb.com/tools\.html"' public/tools.html</automated>
  </verify>
  <acceptance_criteria>
    - source assertion: public/tools.html canonical link uses https://cyberscryb.com/tools (no .html)
    - source assertion: public/sitemap.xml contains a loc for https://cyberscryb.com/distill/
    - source assertion: public/tools/humanizer/index_v1.html either does not exist OR contains a "LEGACY:" HTML comment at the top
    - source assertion: public/tools/ai-writing-suite/ either does not exist OR is fully wired (a card in tools.html, a sitemap entry, an option in index.html dropdown)
    - source assertion: index.html and tools.html report the same tool count N in user-facing strings
    - behavior assertion: node scripts/audit-inventory.js exits 0 with the ## Orphan AI_PROMPTS, ## Orphan Frontends, and ## Tool Count Drift sections empty (documented exceptions allowed)
  </acceptance_criteria>
  <verification>Run scripts/audit-inventory.js — confirm exit 0 and empty orphan sections. Read tools.html line 11 area to confirm canonical fix. grep sitemap.xml for distill.</verification>
</task>

<task id="4.4">
  <description>Sweep existing tool pages flagged by AUDIT-INVENTORY.md as missing nav links, JSON-LD, or breadcrumbs — apply the fixes. Closes Phase 1 success criterion #4 for every tool page, not just budget-planner.</description>
  <files>public/tools/*/index.html (only those flagged by AUDIT-INVENTORY.md as has_json_ld=no, has_blog_nav_link=no, or has_breadcrumbs=no)</files>
  <read_first>
    - /home/user/cyberscryb/.planning/phases/01-audit-triage/AUDIT-INVENTORY.md (the report from Plan A — the columns has_json_ld, has_blog_nav_link, has_breadcrumbs identify which existing pages need fixes)
    - /home/user/cyberscryb/public/tools/summarizer/index.html (the canonical template — copy the nav structure, JSON-LD block, and breadcrumb block exactly from here)
    - /home/user/cyberscryb/.planning/codebase/CONVENTIONS.md (the convention for tool-page nav, breadcrumbs, JSON-LD)
  </read_first>
  <action>For each tool page where AUDIT-INVENTORY.md flags has_json_ld=no, has_blog_nav_link=no, or has_breadcrumbs=no, apply the missing element by copying from public/tools/summarizer/index.html. Specifically: (a) For has_blog_nav_link=no — add an `<li><a href="/blog/">Blog</a></li>` element to the nav-menu ul, placed before the Pro link if it exists, otherwise after Guides. (b) For has_breadcrumbs=no — add the BreadcrumbList JSON-LD block + the visible breadcrumb nav element using the summarizer pattern, with the current tool's name and URL substituted. (c) For has_json_ld=no — add the SoftwareApplication Schema.org JSON-LD block using the summarizer pattern, with the current tool's name, description, applicationCategory, and offers replaced with this tool's values (read the tool's existing title and meta description to derive these — don't fabricate). Do NOT modify pages where the inventory column is "yes" — leave working pages alone. If a tool page has a completely different structure (e.g., fluid-sim, distill) and the standard pattern doesn't fit, document the deviation in AUDIT-INVENTORY.md as "structural-exception" and move on. If the sweep would touch more than 15 pages, do the 10 most-trafficked tool pages first (look at sitemap.xml priority values) and surface the rest in 01-D-SUMMARY.md as a follow-up for Phase 2. Append a ## Existing-Page Sweep section to AUDIT-INVENTORY.md listing every page touched with which elements were added.</action>
  <verify>
    <automated>cd /home/user/cyberscryb && grep -c '## Existing-Page Sweep' .planning/phases/01-audit-triage/AUDIT-INVENTORY.md</automated>
  </verify>
  <acceptance_criteria>
    - source assertion: AUDIT-INVENTORY.md contains a ## Existing-Page Sweep section
    - source assertion: every tool page listed under ## Existing-Page Sweep can be re-checked and the previously missing element is now present (verifiable by re-running scripts/audit-inventory.js)
    - behavior assertion: after the sweep, scripts/audit-inventory.js re-run shows fewer pages with has_json_ld=no, has_blog_nav_link=no, or has_breadcrumbs=no than before
    - source assertion: any structural exceptions are documented in AUDIT-INVENTORY.md with a reason
    - source assertion: no edits to pages where the inventory column was already "yes" (don't break working pages)
  </acceptance_criteria>
  <verification>Re-run scripts/audit-inventory.js after the sweep. Compare the has_json_ld / has_blog_nav_link / has_breadcrumbs columns to the pre-sweep counts. Confirm the gap closed for at least 10 pages OR the rest are documented as structural exceptions / phase-2 follow-ups.</verification>
</task>

<task id="4.3" type="checkpoint:human-verify" gate="blocking">
  <what-built>Plan D delivered: budget-planner tool page wired into tools.html + sitemap.xml + homepage dropdown, humanizer/index_v1.html resolved per triage, ai-writing-suite resolved per triage, tools.html canonical fixed, /distill/ added to sitemap, tool counts standardized across index.html and tools.html.</what-built>
  <how-to-verify>
    1. Open public/tools/budget-planner/index.html via Read tool — confirm: title contains "Budget Planner", canonical points to https://cyberscryb.com/tools/budget-planner/, nav menu includes /blog/ absolute link, two-panel layout present, FAQ block has 5 questions, Schema.org SoftwareApplication JSON-LD present.
    2. Open public/tools/budget-planner/budget-planner.js — confirm CSAITool.init is called with toolId 'budget-planner' and collectParams returns { situation: ... }.
    3. Run: cd /home/user/cyberscryb && node scripts/audit-inventory.js — confirm exits 0 and the report shows no remaining orphans (documented exceptions allowed).
    4. Open public/sitemap.xml — confirm both /tools/budget-planner/ and /distill/ are present.
    5. Open public/tools.html line 11 area — confirm canonical uses /tools (no .html).
    6. Read the AUDIT-INVENTORY.md ## Triage Decisions table and confirm every disposition has been acted on.
    7. Confirm tool counts: grep for the chosen number N in index.html (hero, trust bar, stat counter contexts) and tools.html (meta, og:description, JSON-LD numberOfItems) — all should match.
    8. Read AUDIT-INVENTORY.md ## Existing-Page Sweep section — confirm at least 10 tool pages had missing nav/JSON-LD/breadcrumbs fixed, or that the remaining gaps are documented as structural exceptions / deferred to Phase 2.
    9. (Optional, requires deploy) After push to main and GitHub Actions completes, visit https://cyberscryb.com/tools/budget-planner/ and submit a real prompt to confirm the end-to-end flow returns a budget plan from Gemini.
  </how-to-verify>
  <resume-signal>Type "approved" when verified, or describe what's missing.</resume-signal>
</task>

</tasks>

<verification>
- node scripts/audit-inventory.js exits 0 with orphan sections empty (documented exceptions only)
- public/tools/budget-planner/index.html and budget-planner.js exist, follow the Life Tool template, and use CSAITool.init({ toolId: 'budget-planner' })
- public/tools.html and public/index.html report a consistent tool count N
- public/sitemap.xml contains entries for /tools/budget-planner/ and /distill/
- public/tools.html canonical points to https://cyberscryb.com/tools (no .html)
- Legacy humanizer/index_v1.html is removed or explicitly documented
- ai-writing-suite is either removed or fully wired
- Human checkpoint confirms the visible-to-user wins before phase closes
</verification>

<success_criteria>

- Phase 1 success criterion #5 ("no orphan tools or orphan prompts") is verifiable by running scripts/audit-inventory.js
- Phase 1 success criterion #4 ("every tool page has working nav, footer, JSON-LD, breadcrumbs") is closed for the new budget-planner page AND for every existing tool page the inventory flagged as missing those elements (sweep applied in task 4.4)
- One new Life Tool ships and hits cyberscryb.com after the next push to main
- Tool count inconsistency (CONCERNS.md INFO) is resolved
- Distill is now indexable by Google (CONCERNS.md INFO resolved)
- tools.html canonical SEO issue (CONCERNS.md INFO resolved)
  </success_criteria>

<output>
Create .planning/phases/01-audit-triage/01-D-SUMMARY.md when done, summarizing: final tool count N chosen, files deleted vs kept, ai-writing-suite resolution path taken, any "41" replacements that were ambiguous and skipped (surfaced for human review), and a confirmation that scripts/audit-inventory.js now exits 0.
</output>
