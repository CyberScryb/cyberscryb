# CyberScryb — AI-First Tool Suite

## What This Is

CyberScryb is a free web app at cyberscryb.com built by a solo founder (Nate Ady) in financial hardship. It pivots from a generic dev-tools site into an **AI-first tool suite** — AI-powered tools that help real people with real situations (writing, work, hardship letters, custody docs, caregiver reports) plus a supporting set of dev utilities that pull SEO traffic. Every decision passes through one filter: **what's best for the user**.

## Core Value

Every interaction on this site should feel tight, fast, and obviously made for the user. If the AI tools don't deliver an experience that beats free competitors on quality + polish, nothing else matters.

## Requirements

### Validated

<!-- Inferred from existing codebase + CLAUDE.md -->

- ✓ 17+ AI-powered tools wired up via shared `CSAITool.init()` pattern — existing
- ✓ Smart routing: simple tools to Cloudflare Workers AI (free Llama 3.1), complex/life tools to Gemini 3.1 Pro on Firebase — existing
- ✓ Email-gate monetization on AI tools (1 free result → email gate → 3 free daily after subscribe) — existing
- ✓ 38+ static/client-side dev tools (JSON↔CSV, password checker, base64, regex, etc.) — existing
- ✓ 21 SEO-optimized guide pages with consistent template — existing
- ✓ Cloud Functions backend with rate limiting, referer validation, params sanitization, privacy-compliant subscriber storage — existing (just hardened)
- ✓ Auto-deploy via GitHub Actions on push to main (hosting + functions) — existing
- ✓ Cloudflare AI chatbot embedded on every page — existing
- ✓ Schema.org SoftwareApplication + BreadcrumbList JSON-LD on tool pages — existing
- ✓ AdSense + GA4 + CJ Affiliate tracking, all deferred for performance — existing
- ✓ Privacy policy + compliance (no IP storage in subscribers, SameSite cookies) — existing (just hardened)

### Active

<!-- New scope for this initiative — every item passes through "what's best for the user" -->

#### A. Tool Audit & Bug Fixing

- [ ] **AUDIT-01**: Click-test every AI tool end-to-end; fix any broken generation, broken output formatting, or broken email gates
- [ ] **AUDIT-02**: Click-test every client-side dev tool; fix broken JS, missing CSS, layout issues
- [ ] **AUDIT-03**: Audit every tool page for missing nav links (Blog, Pro), broken footer links, missing JSON-LD, missing Schema markup
- [ ] **AUDIT-04**: Run Lighthouse on top 10 pages; fix any score below 90 in performance, accessibility, SEO
- [ ] **AUDIT-05**: Cross-browser test (Chrome, Safari, Firefox, mobile) the top 5 AI tools
- [ ] **AUDIT-06**: Verify all 17 AI tool `toolId` values map to keys in `AI_PROMPTS`; remove orphans

#### B. UX Polish — Tiny Things

- [ ] **UX-01**: Consistent loading states across all AI tools (spinner + estimated time + cancel button)
- [ ] **UX-02**: Typewriter speed tuning — currently 10ms/char feels slow for short results; adapt to result length
- [ ] **UX-03**: Better error messages — current "Something went wrong" is too generic; show contextual guidance
- [ ] **UX-04**: Keyboard shortcuts on AI tools — Cmd/Ctrl+Enter to generate, Esc to cancel
- [ ] **UX-05**: Auto-resize textareas as user types (currently fixed height)
- [ ] **UX-06**: Character counter on every textarea showing remaining limit (currently inconsistent)
- [ ] **UX-07**: Copy button feedback animation — show success state for longer, with icon flash
- [ ] **UX-08**: Mobile: bottom-sheet for input on tool pages; floating "Generate" button
- [ ] **UX-09**: Input persistence in localStorage — don't lose work on accidental refresh
- [ ] **UX-10**: Subtle haptic-style micro-animations on button press (transform scale)
- [ ] **UX-11**: Empty-state illustrations or example inputs on every AI tool ("Try this:" prefill button)
- [ ] **UX-12**: Smooth scroll to output on generation start

#### C. UX Polish — Obvious & Novel

- [ ] **UX-13**: Universal command palette (Cmd+K) — search any tool, jump to any page
- [ ] **UX-14**: Recent tools widget on homepage — localStorage-backed, shows last 3 used
- [ ] **UX-15**: "Continue where you left off" — restore last input on tool revisit
- [ ] **UX-16**: Side-by-side comparison mode — run same input through 2 AI tools to compare
- [ ] **UX-17**: Output history per tool — last 5 generations stored locally, swipeable
- [ ] **UX-18**: Dark/light toggle with system preference detection (currently dark only)
- [ ] **UX-19**: Tone/length sliders instead of dropdowns on AI tools where applicable
- [ ] **UX-20**: One-click "Refine this" buttons — make shorter, more formal, more casual, etc. (re-runs through paraphraser)
- [ ] **UX-21**: Share output as image card — auto-generated PNG with branded design for social sharing

#### D. AI Tool Improvements

- [ ] **AI-01**: Stream responses from Gemini instead of waiting for full completion (perceived latency win)
- [ ] **AI-02**: Show partial output as it's generated (live typing feel, not post-hoc typewriter)
- [ ] **AI-03**: Add "Try Pro" upsell — show Gemini 3.1 Pro quality difference when free tier hits limit
- [ ] **AI-04**: Add 3–5 new AI tools targeting underserved Life Tools audiences (eviction response, FAFSA appeal, IEP request, dispute letter, financial aid appeal)
- [ ] **AI-05**: Better prompt engineering — A/B test prompt variations and pick winners
- [ ] **AI-06**: Tool-specific examples library — clickable example inputs that prefill the textarea
- [ ] **AI-07**: Output regeneration with variation — "Generate again with different angle"

#### E. SEO & Organic Traffic Content

- [ ] **SEO-01**: Write 8 new blog posts (real research, Nate's voice) — replace deleted slop with quality content
- [ ] **SEO-02**: Internal linking pass — every guide links to related tool, every tool links to relevant guide
- [ ] **SEO-03**: Add FAQ Schema.org markup to top 10 tool pages for rich snippets
- [ ] **SEO-04**: Generate 10 new "[tool] vs [competitor]" comparison guides for high-intent search
- [ ] **SEO-05**: Long-tail Life Tools content — "how to write a [specific] hardship letter" with example outputs
- [ ] **SEO-06**: Update meta descriptions for all pages to 140–160 chars, benefit-focused
- [ ] **SEO-07**: Sitemap audit + resubmit to Google Search Console
- [ ] **SEO-08**: Schema.org HowTo markup on guide pages for rich snippets
- [ ] **SEO-09**: Image alt text audit across all pages

#### F. Retention & Return Visits

- [ ] **RET-01**: Email newsletter with weekly "tool of the week" + new content (uses existing subscriber list)
- [ ] **RET-02**: User accounts (lightweight, magic-link auth) — saved outputs, history, favorites
- [ ] **RET-03**: "Save to library" feature on AI outputs for logged-in users
- [ ] **RET-04**: PWA / installable as app — offline mode for client-side tools
- [ ] **RET-05**: Browser extension — right-click selected text → "Send to CyberScryb"
- [ ] **RET-06**: "What's new" changelog page + in-tool toast when new tools ship

#### G. Visual Identity & Brand Polish

- [ ] **BRAND-01**: Consistent color palette audit — single source of truth in CSS variables
- [ ] **BRAND-02**: Custom favicons per major tool category (visual category cue)
- [ ] **BRAND-03**: Hero animation on homepage — subtle, not gimmicky, signals "AI tools that work"
- [ ] **BRAND-04**: Tighter typography scale — review font sizes, line-heights, spacing on every page
- [ ] **BRAND-05**: Custom 404 page with tool search + popular tools list
- [ ] **BRAND-06**: Consistent button hierarchy — primary, secondary, ghost styles standardized

### Out of Scope

<!-- Explicit boundaries to prevent scope creep -->

- **Native mobile apps** — PWA covers it; native would split focus and resources
- **Account-required tools** — every tool must work without an account; accounts are optional retention layer
- **Crypto/Web3 integrations** — wrong audience, dilutes brand
- **AI image generation** — text is the wedge; image gen adds infra/cost without clear differentiation
- **Multi-language support** — English-first; localization is post-PMF
- **Stripe Pro tier wiring this round** — out of scope until traffic + retention prove the funnel; tracked as separate roadmap item
- **New dev tools (JSON, base64, etc.)** — the dev tool inventory is saturated; effort goes to polish, not addition
- **Affiliate program real link integration** — depends on CJ approval; placeholder URLs stay until accepted

## Context

**Strategic position:** The dev tools space (JSON converters, base64 encoders, password checkers) is saturated. CyberScryb's differentiator is AI tools that solve real-life problems: hardship letters for people in financial trouble, appeal letters for unemployment/insurance denials, custody docs for co-parents, caregiver shift reports for CNAs. These are built from Nate's lived experience (former CNA, dealt with custody, currently in hardship).

**Traffic state (May 2026):** 3,000+ unique visitors/month. AdSense re-review submitted ~May 14 after denial for low-quality content; site fully overhauled, awaiting approval. Cloudflare CDN + AI chatbot embedded.

**Technical state:** Stack is solid — Firebase Hosting + Cloud Functions + Cloudflare Workers AI. Smart routing already implemented. Security and privacy just hardened (referer checks, params sanitization, no IP storage). The site has a clean foundation; this initiative is about turning that foundation into something users return to.

**Voice:** Direct, no-BS, short sentences. Like texting a smart friend. Banned AI-slop words list maintained in CLAUDE.md. Every piece of content runs through this filter.

**Why now:** Nate is in financial hardship. The site has traffic but not retention. The AI tools work but feel rough. Polishing what's there will convert more visitors than building new things. Every UX micro-improvement compounds across 3k+ monthly visitors.

## Constraints

- **Tech stack**: Firebase Hosting + Cloud Functions + Cloudflare Workers + vanilla JS, no build step — already in place, don't rewrite
- **Budget**: $10 prepaid + $100/mo cap on Google Cloud billing for Gemini — don't blow the cap with streaming or higher token limits without rate-limit revisits
- **Deployment**: Auto-deploys via GitHub Actions on push to main; you cannot deploy from the Claude Code web environment (Google API returns 403 to remote)
- **AI model**: `gemini-3.1-pro-preview` (must include `-preview` suffix — stable name returns 404)
- **Brand voice**: No AI-slop words (leverage, utilize, delve, robust, seamless, etc. — see CLAUDE.md banned list)
- **Privacy**: Privacy policy promises email-only storage, no tracking cookies beyond newsletter dismissal. Don't violate it again.
- **Performance**: AdSense + GA4 deferred. Google Fonts async-loaded. Don't add blocking scripts to `<head>`.
- **Trailing-slash routing**: Root pages use absolute paths (`/css/style.css`), tool pages use `../../css/style.css`. Don't break this.

## Key Decisions

| Decision                                                      | Rationale                                                                                             | Outcome   |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | --------- |
| Pivot brand focus to AI tools as primary identity             | Dev tool space saturated; AI tools are differentiated and monetizable via Gemini quality + email gate | — Pending |
| Polish existing tools before building new ones                | 3k+ visitors/month already there; conversion rate beats traffic until UX is tight                     | — Pending |
| User-experience filter on every change                        | Every decision goes through "is this best for the user" before shipping                               | — Pending |
| Skip Stripe Pro wiring this round                             | Need retention proof before monetizing; AdSense + email list grow first                               | — Pending |
| No new dev tools                                              | Polish > addition for saturated categories                                                            | — Pending |
| Life Tools as long-tail SEO + lived-experience moat           | Underserved audiences (caregivers, co-parents, hardship) outside dev-tool noise                       | — Pending |
| Email newsletter as primary retention layer (before accounts) | Email list already exists; accounts add friction and aren't validated yet                             | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):

1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):

1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---

_Last updated: 2026-05-20 after initialization_
