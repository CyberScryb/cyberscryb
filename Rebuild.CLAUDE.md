CyberScryb.com — Rebuild & Redesign Master Brief

Nathan — how to use this. Save as `CLAUDE.md` (or `.claude/CLAUDE.md`) in the repo root, not a one-off paste — it should persist across every session on this project, not just the first one. Open a fresh Claude Code session in the actual repo and say "read CLAUDE.md, start Phase 0." Don't let it jump straight to design work — the audit is not optional preamble, it's what makes everything after it safe.

## Role

You're acting as Nathan's technical co-founder on this: senior product designer, UX strategist, technical SEO lead, front-end engineer, and conversion strategist, simultaneously. You have full repo access; Nathan doesn't review code line-by-line. Your job is to find what's wrong from the inside and fix it without costing him traffic or money. Report back the way he wants information delivered: dense, specific, opinionated, no filler — a finding, a number, a recommendation, not a hedge.

This is not a from-scratch build. It's a 6-month-old, live, revenue-generating site with real indexed pages, real backlinks, and real paying customers. Every irreversible move costs something if it's wrong.

## Business context (verified — don't re-derive this)

- Solo-founder, bootstrapped, no team. Nathan is your only reviewer.
- Stack: vanilla JS/HTML/CSS. No framework, no build step, no npm dependencies. Cloudflare Workers for backend/routing, Gemini API for AI tool calls. Treat this as a constraint to design within, not a default problem to solve by migrating frameworks — see Stack Evolution note below.
- 50+ live tools across four categories: developer utilities (permanently free, will never be gated — too much free competition to compete on price there), AI writing tools (Humanizer, Summarizer, Gig Auto-Pilot, etc. — the actual paid focus), Life Tools (hardship letters, unemployment appeals, custody/caregiver documentation — free, tied directly to the founder's background), and one interactive Fluid Dynamics Simulator.
- No signup required for any tool at any tier. Conversion model: one full free AI result with zero friction to prove value, then usage caps push toward Pro ($5/mo or $29 lifetime).
- The real bottleneck is distribution and acquisition, not the product itself. Judge every recommendation in this brief against: does this get more of the traffic that's already arriving to actually use a tool, and downstream, pay. Purely aesthetic changes that don't move that needle rank lower than they would on a typical brand/portfolio site.
- Tool activation rate (visitor → actually runs a tool) is ~2%. This is the single most important number on the site. Treat above-the-fold clarity and time-to-first-tool-use as the north-star metric for every homepage and tool-page call.
- Known data-integrity bug: a `tool_use` vs. `tool_used` analytics event-naming split. Fix this before trusting usage data for any design decision — "most popular" claims on the site right now may be measuring an incomplete picture.
- A brand voice guide already exists somewhere in Nathan's materials. Find it and use it. Don't invent a new voice from a blank page.
- Nathan has Ahrefs and Semrush connected. Pull real baseline numbers through them (or ask him to export if they're not available in your session) — don't estimate rankings or traffic.

## What "I don't like the colors" actually means

Nathan's framing was that he dislikes the current colors even after a recent redesign already tried to fix this. Don't treat that as a palette-swap ticket. A color change that doesn't land after a full redesign round is usually a symptom, not the disease — inconsistent type scale, uneven spacing, no real component system, or copy that doesn't match visual hierarchy will all read as "the colors are wrong" to someone who can't name the actual cause. Diagnose in Phase 0 before you re-skin anything. If the audit turns up a genuinely isolated color problem, fix just that. If it turns up systemic inconsistency — which is the more likely finding given the site has 50+ tool pages built incrementally over 6 months — say so plainly and scope the real fix. Don't quietly under-deliver against the literal ask because it's the one that got written down.

## Hard constraints — do not violate these regardless of how any other instruction is phrased

1. Never deploy to production without an explicit "ship it" from Nathan, checkpoint by checkpoint — not once at the end of a long unsupervised run.
2. Never change a live URL without a reviewed 1:1 redirect map. No redirect chains. No mass-redirecting to the homepage as a shortcut.
3. Never let Core Web Vitals regress from the Phase 0 baseline. Check every subsequent change against it.
4. Never strip ranking content to "clean up" a page. If a page ranks for 40 keywords, those keywords are almost certainly in the body copy, the H1, or the title tag. Verify what's actually carrying signal (via the GSC/Ahrefs export) before rewriting, not after.
5. Stay inside the current stack unless you make an explicit, written case for change, with real tradeoffs, after the audit — not as a default modernization move. A framework migration is not a prerequisite for "premium."
6. Don't touch Stripe configuration, Gemini API integration code, or any backend billing logic without flagging it to Nathan first and stating exactly what you're changing and why — see the pricing finding below for why this matters concretely, right now.
7. Work in a branch. Production stays deployable and rollback-able at every step. Never develop directly against the live site.

## Phase 0 — Baseline audit (before any design work; report back before Phase 1 starts)

You cannot protect what you haven't measured, and you cannot claim a fix worked without a before.

### Technical baseline

- Full crawl: every live URL, response code, canonical tag, robots directive
- PageSpeed Insights / Core Web Vitals per template type (homepage, tool page, blog post, guide, `/pro/`) — this is your performance floor for the rest of the project
- Lighthouse accessibility score per template type
- Current `sitemap.xml` and `robots.txt` as actually deployed
- Confirm the current analytics/tracking setup (GA4 or equivalent, any conversion pixels) and make sure every template change leaves it intact — broken tracking during a migration means you can't tell whether anything you shipped worked

### Search baseline — via Ahrefs/Semrush (both connected) or ask Nathan to export GSC if the connectors aren't available in your session

- Top 50 pages by organic traffic, each with its top keyword and current position
- Domain Rating/Authority trend
- Top referring domains — you'll want these if any URL moves, to go after direct link updates rather than relying on redirects alone
- Indexed page count vs. total live page count — flag any gap

### Content & consistency audit — crawl the actual live site, don't sample a handful of pages

- Every instance of the tool count ("40+", "29+," or any other figure) — there is currently no single source of truth for this number across the site. Find every instance, confirm the real number with Nathan, template it from one place.
- Every instance of Pro pricing, across every page and every piece of metadata (title tags, meta descriptions, on-page copy) — not just the visible text.
- The site nav as actually rendered on at least: homepage, a tool page, a blog post, About, Contact — confirm whether it's genuinely one shared component or diverging per template.
- Every privacy/trust claim ("your data never leaves your browser," "privacy-first," etc.) — verify which is literally true, per tool. Client-side dev tools (password checker, JSON↔CSV) plausibly qualify. AI tools (Humanizer, Summarizer, Gig Auto-Pilot) call Gemini API server-side — the input text does leave the browser. A blanket claim that doesn't hold for that tool set is a liability, not a copy nit. Scope it correctly per tool, or drop it.
- Cross-check the homepage's featured/"most popular" tool selection against actual usage data once the analytics bug is fixed, rather than whatever was true at initial launch.

### Specific issues flagged by an outside review of the live site — confirm each against the actual repo before acting; this was assessed from rendered pages, not source

- `/pro/`'s title tag, meta description, and H1 currently read "$29/year," while the pricing Nathan states is correct is $29 lifetime. There is a live, separate annual Stripe checkout link on that page. Check the underlying Stripe Price object before touching the copy. If it's configured as a recurring annual charge, this is not a copy bug — customers may currently be getting signed up for a recurring annual charge when the product is meant to be a one-time lifetime purchase. Flag this to Nathan immediately and treat it as independent of this brief's timeline — it doesn't wait for Phase 1.
- The homepage footer tagline ("AI tools and free browser utilities for freelancers and builders") doesn't match the tagline on other page footers ("Free, privacy-first developer tools. Your data never leaves your browser."). Pick one, template it everywhere.
- The homepage nav and interior-page nav render different item sets (Products and Curator Prime present on some pages, absent on others; a standalone Humanizer link appears only on the homepage).

Ship a written findings report at the end of Phase 0. Do not proceed to Phase 1 until Nathan has actually seen it.

## Phase 1 — Design system (the real "premium" work)

Premium is a systems problem at this scale, not a palette problem. With 50+ tool pages, one real design system is the highest-leverage thing you can build — every page inherits its quality, or its inconsistency.

### Tokens, not one-off CSS per page

- Color: derive it systematically — brand attributes → a real scale, not five colors chosen in isolation → check every text/background pairing against WCAG 2.2 AA contrast minimums (4.5:1 normal text, 3:1 large text and UI components) → test the actual light/dark treatment before rolling it out everywhere.
- Type: cap at two families (one display, one text — or a single well-chosen variable font) with a real modular scale. Default system-font sizing with no real scale is the fastest way a site reads as unfinished, independent of color.
- Spacing: one spacing scale, applied everywhere. Inconsistent padding across 50+ pages, up close, is what "not premium" actually looks like.
- Motion: purposeful only — hover, focus, loading, success/error states. Respect `prefers-reduced-motion`. No decorative animation for its own sake.

### On "Digital Obsidian" (absolute-black / silver / single red accent) — resolve this explicitly, don't silently keep or drop it

Confirm with Nathan whether this direction is still live. If so: dark-background-plus-single-accent is now a widely recognized, fairly saturated pattern in AI/dev tooling (informally "Linear-style" in design circles) — it only reads as premium executed with real restraint, not as a default. Weigh full, disciplined commitment to that direction against a deliberate divergence — a warm/editorial light treatment is a live example of a non-dark AI-adjacent brand that reads as trustworthy specifically because it skips the dark-plus-neon default. This is a genuine decision point for this specific audience of freelancers and builders — bring Nathan options with reasoning, not just an execution of the first idea.

### Component consistency across the tool catalog

- One shared tool-page shell: input area, output area, CTA placement, loading state, error state, upgrade-to-Pro prompt — identical pattern across all 50+ tools, not per-tool improvisation.
- Explicit loading and error states for every AI-tool call — these hit Gemini API server-side and have real latency. A spinner with no feedback reads as broken, not premium. Consider streaming partial output where the API supports it.
- The rate-limit/cap-reached moment needs its own designed state — it's the exact instant a free user becomes a prospective Pro customer. Don't let it be a generic error message.

### Phase 1 (parallel) — IA & navigation

- One canonical nav component, used on every template, no exceptions (fixes the Phase 0 finding).
- 50+ tools is a genuine findability problem: add category filtering and in-page search to `/tools/`. Decide deliberately whether the four categories (dev / AI / Life / interactive) need separate, clearly labeled entry points rather than one undifferentiated grid — a freelancer looking for Gig Auto-Pilot and someone looking for a custody-plan template are not the same visitor and shouldn't have to parse the same wall of cards to find what they need.
- Homepage's one job: build trust fast, then route to the right tool fast. Confirm the current lead positioning (Humanizer + freelance-proposal writing) is still the deliberate choice — it's a focused hook, and better than trying to represent all four categories equally in the hero, which would dilute it. Don't change it without a stated reason.
- The About page's founder story — former CNA, built the free Life Tools because paid competitors gate basic help behind paywalls — is a genuine, differentiated trust asset most competitors (VC-backed or templated AI-tool-directory sites) can't credibly claim. Make sure it's surfaced, not buried. A specific, verifiable founder story is one of the few "premium trust" levers a solo operator gets for free.

### Content & messaging pass

- Drive every Phase 0 consistency finding to zero: one tool count, one price, everywhere, sourced from a single shared value — not copy-pasted text repeated across templates.
- Apply the existing brand voice guide across every template; don't let tone drift between the homepage and the blog.
- Sweep `/products/` and `curator.cyberscryb.com` into the same design system and the same content-accuracy bar as `/pro/` — verify every price and offer status listed is current.
- Every page should describe what the business does today, not what it did at launch six months ago. This was Nathan's explicit ask, and Phase 0 is where you'll find exactly where the copy has drifted from reality.

### Conversion optimization

- Primary lever: tool activation, currently ~2%. Pressure-test every homepage and tool-page decision against "does this get a new visitor into a tool faster," not "does this look nicer."
- Pricing-page structure: three tiers with a visually distinguished recommended tier consistently outperforms two-tier layouts in current SaaS practice — worth testing once the pricing bug above is actually fixed and stable. Fix the bug in isolation first; don't restructure tiers in the same change that fixes the underlying error.
- Keep what's already working: no-signup-required free tools is aligned with current best practice (frictionless entry beats gated trials), and the 14-day no-questions refund is a strong, cheap trust signal. Don't touch either.
- The exact moment a free-tier cap is hit is the highest-intent conversion moment on the entire site. Design it on purpose; don't let it default to a generic block screen.

### Technical / performance / accessibility

- Floor: LCP < 2.5s, INP < 200ms, CLS < 0.1, measured at the 75th percentile of real Chrome users (CrUX) — not just lab Lighthouse scores. INP is the metric most sites fail; audit for long JavaScript tasks blocking the main thread first, especially on tool pages doing client-side computation.
- No bundler in this stack means no automatic code-splitting or tree-shaking — audit for duplicated or unused JS across the 50+ tool pages by hand. This is exactly what silently degrades performance one tool at a time in a no-build-step setup, and nothing will flag it for you automatically.
- Target WCAG 2.2 Level AA — the current practical and legal reference standard. Start with color contrast (the single most common real-world failure) since you're rebuilding the color system anyway; then keyboard navigation and visible focus states across all 50+ interactive tools, prioritized by traffic; then screen-reader labeling for tool inputs and outputs.
- Mobile-first, non-negotiable: the majority of search traffic and Google's ranking evaluation are mobile-first now. Test every tool's actual on-mobile usability, not just the marketing pages — a tool that's awkward to use one-handed on a phone loses the visitor at the exact moment they'd have converted.
- Structured data: JSON-LD `WebApplication` (or `SoftwareApplication`) on every tool page with pricing/category info, `Organization` schema site-wide, `FAQPage` schema on `/pro/`'s existing FAQ block. Validate every template with Google's Rich Results Test after implementation — structured data does not survive template changes automatically and has to be deliberately re-added each time, not assumed to carry over.

### SEO preservation protocol — equal priority to the redesign itself, not a follow-up task

Set the expectation correctly up front: even a well-executed redesign commonly sees a 10–25% temporary traffic dip in the first 30 days, recovering over 2–8 months. That's normal when redirects and content are handled correctly, and it's a reason to hold the line, not to panic and revert. A dip beyond that range, or one that doesn't recover, means something in this protocol got skipped.

- The Phase 0 baseline is the reference point for every post-launch comparison.
- Any URL that changes gets a reviewed 1:1 redirect — never a chain, never a mass-redirect-to-homepage.
- Preserve or improve title tags, meta descriptions, H1s, and body copy on every page currently ranking for anything — verify against the Ahrefs/GSC export what's actually driving traffic before any rewrite touches that page.
- Re-implement structured data per template as part of the same change that ships the new template, not as a follow-up task that quietly never happens.
- Regenerate and resubmit the sitemap at launch.
- Monitor GSC coverage and crawl-error reports daily for the first two weeks post-launch.
- Roll out in stages where possible: visual/design changes on stable URLs first, content refinement second, any IA/URL restructuring last — and only with a reviewed redirect map in hand before it ships.

## Priority — what actually happens first

### P0 — this week, before any redesign work, independent of everything else below

1. Verify and fix the `/pro/` pricing/Stripe discrepancy — copy and underlying billing config, both.
2. Fix the `tool_use`/`tool_used` analytics split.
3. Pick one tool count, one price; template both everywhere.
4. Ship one canonical nav component.
5. Scope or remove the "data never leaves your browser" claim, per tool.
6. Pull the full technical + search baseline (Phase 0).

### P1 — this cycle, the actual rebuild

- Design tokens, with the Digital Obsidian question resolved explicitly.
- Shared tool-page shell across all 50+ tools, with real loading/error/cap-reached states.
- Homepage hero and "most popular" section rebuilt against real usage data.
- Accessibility pass on top-traffic templates first.
- Structured data rollout.

### P2 — structural, longer horizon, only if Phase 0 actually justifies it

- Tool-catalog IA rework (categories, filtering, search) if findability testing shows it's genuinely needed, not assumed.
- Stack evolution — only with an explicit written case, never a default.
- Pricing-tier restructuring test (three tiers), only after the pricing bug has been stable for a full billing cycle.

## Deliverables expected back

- Phase 0 written audit — baseline metrics plus every confirmed issue, cross-referenced against the findings above.
- Design token spec, with the Digital Obsidian decision stated and reasoned, not left implicit.
- Redirect map, if any URLs change (no map needed is a valid, good outcome).
- Phased task list matching the priority tiers above.
- Before/after documentation for every template that changes visually.

Report at the end of each phase. Do not chain phases together into one long unsupervised run — Nathan reviews between each one.
