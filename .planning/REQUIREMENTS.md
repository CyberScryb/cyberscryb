# Requirements: CyberScryb — AI-First Tool Suite

**Defined:** 2026-05-20
**Core Value:** Every interaction on this site should feel tight, fast, and obviously made for the user. If the AI tools don't deliver an experience that beats free competitors on quality + polish, nothing else matters.

## v1 Requirements

Requirements for the AI-first pivot and UX polish release. Each maps to roadmap phases.

### A. Audit & Bug Fixing

- [ ] **AUDIT-01**: Every AI tool generates output end-to-end with no errors (17 tools click-tested through the email gate flow)
- [ ] **AUDIT-02**: Every client-side dev tool functions correctly across Chrome, Safari, Firefox, and mobile viewport
- [ ] **AUDIT-03**: Every tool page has correct nav (Blog + Pro links), working footer, Schema.org JSON-LD, and breadcrumbs
- [ ] **AUDIT-04**: Top 10 pages score ≥90 on Lighthouse performance, accessibility, and SEO
- [ ] **AUDIT-05**: Top 5 AI tools verified working on Chrome, Safari, Firefox, and mobile (375px+ viewport)
- [ ] **AUDIT-06**: Every AI tool's `toolId` maps to a key in `AI_PROMPTS`; orphan tools removed or wired

### B. UX Polish — Micro

- [ ] **UX-01**: Loading state on every AI tool shows a spinner, estimated time, and cancel button
- [ ] **UX-02**: Typewriter animation speed adapts to output length (faster for short, slower for long)
- [ ] **UX-03**: Error messages give contextual guidance instead of generic "Something went wrong"
- [ ] **UX-04**: Cmd/Ctrl+Enter triggers generate, Esc cancels — on every AI tool
- [ ] **UX-05**: Textareas auto-resize as user types (no fixed height clipping)
- [ ] **UX-06**: Character counter on every textarea shows remaining input limit
- [ ] **UX-07**: Copy button shows success state for 1.5s with icon flash
- [ ] **UX-08**: Mobile layout for AI tools uses a sticky generate button and full-width input
- [ ] **UX-09**: User input persists in localStorage and restores on accidental refresh
- [ ] **UX-10**: Buttons have a press-state micro-animation (scale 0.97 on active)
- [ ] **UX-11**: Every AI tool has an "Example input" button that prefills with a demo
- [ ] **UX-12**: Page smooth-scrolls to output area on generation start

### C. UX Polish — Novel

- [ ] **UX-13**: Cmd+K command palette lets users search any tool or jump to any page from anywhere on the site
- [ ] **UX-14**: Homepage shows "Recent tools" widget backed by localStorage (last 3 used)
- [ ] **UX-15**: AI tools restore last input when revisited ("Continue where you left off")
- [ ] **UX-16**: Comparison mode runs the same input through 2 AI tools side-by-side
- [ ] **UX-17**: Output history per tool stores last 5 generations locally, navigable with arrows
- [ ] **UX-18**: Light/dark theme toggle respects system preference and persists choice
- [ ] **UX-19**: Sliders replace dropdowns for tone/length on tools where it improves clarity
- [ ] **UX-20**: One-click "Refine: shorter / formal / casual" buttons re-run output through paraphraser
- [ ] **UX-21**: "Share as image" button generates branded PNG card from any AI tool output

### D. AI Tool Improvements

- [ ] **AI-01**: Gemini responses stream to the client instead of waiting for full completion
- [ ] **AI-02**: Streamed output renders live as it arrives (no post-hoc typewriter)
- [ ] **AI-03**: Upsell card surfaces Pro tier benefits when free tier hits daily/char limit
- [ ] **AI-04**: 3 new Life Tools shipped (eviction response, FAFSA appeal, IEP request)
- [ ] **AI-05**: Each AI tool prompt A/B-tested with at least 2 variants; winner committed
- [ ] **AI-06**: Every AI tool ships with a clickable examples library (3+ examples per tool)
- [ ] **AI-07**: "Regenerate with different angle" button on every AI tool output

### E. SEO & Organic Traffic

- [ ] **SEO-01**: 8 new blog posts published — researched, in Nate's voice, no AI slop
- [ ] **SEO-02**: Every guide page links to its related tool; every tool page links to relevant guides
- [ ] **SEO-03**: Top 10 tool pages have FAQ Schema.org markup for rich snippets
- [ ] **SEO-04**: 10 comparison guides published ("CyberScryb [tool] vs [competitor]")
- [ ] **SEO-05**: 5 long-tail Life Tools guides published with full example outputs
- [ ] **SEO-06**: Every page has a meta description 140–160 chars, benefit-focused
- [ ] **SEO-07**: Sitemap.xml audited, regenerated, and resubmitted to Google Search Console
- [ ] **SEO-08**: Guide pages with step-by-step content have HowTo Schema.org markup
- [ ] **SEO-09**: Every image on the site has descriptive alt text

### F. Retention

- [ ] **RET-01**: Weekly newsletter sends to existing subscriber list with new tools + content
- [ ] **RET-02**: Magic-link auth ships — users can log in with email, no password
- [ ] **RET-03**: Logged-in users can save AI outputs to a personal library
- [ ] **RET-04**: Site installable as a PWA with offline support for client-side tools
- [ ] **RET-05**: Browser extension ships — right-click selected text → "Send to CyberScryb"
- [ ] **RET-06**: "What's new" changelog page exists; in-tool toast notifies users of new tools

### G. Visual Identity & Brand

- [ ] **BRAND-01**: CSS custom properties define a single color palette source of truth; all usages migrated
- [ ] **BRAND-02**: Each major tool category has a custom favicon variant for the tab
- [ ] **BRAND-03**: Homepage hero has a subtle, performant animation (no layout shift, GPU-friendly)
- [ ] **BRAND-04**: Typography scale standardized — modular sizes, consistent line-heights across all pages
- [ ] **BRAND-05**: 404 page includes tool search input and links to top 10 popular tools
- [ ] **BRAND-06**: Button styles consolidated into primary/secondary/ghost variants with consistent states

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Monetization

- **MON-01**: Stripe Pro tier wired ($5/mo, $29/yr) with subscription management
- **MON-02**: Real affiliate links replace placeholders after CJ Affiliate approval
- **MON-03**: Usage counter backend (Firestore-backed) replaces in-memory rate limiting
- **MON-04**: `/api/stats` endpoint returns total tools used / generations served (social proof on homepage)

### Account Features

- **ACCT-01**: User dashboard shows usage history and saved outputs
- **ACCT-02**: Account deletion + GDPR data export
- **ACCT-03**: Email notification preferences (frequency, topics)

### Advanced AI

- **ADVAI-01**: Multi-step AI workflows ("write hardship letter → format as PDF → email it")
- **ADVAI-02**: Custom voice training — users upload writing samples for personalized tone
- **ADVAI-03**: Document upload + analysis (PDF, DOCX)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature                                      | Reason                                                                         |
| -------------------------------------------- | ------------------------------------------------------------------------------ |
| Native mobile apps (iOS/Android)             | PWA covers it; native would split focus and resources                          |
| Account-required tools                       | Every tool must work without an account; accounts are optional retention layer |
| Crypto/Web3 integrations                     | Wrong audience, dilutes brand                                                  |
| AI image generation                          | Text is the wedge; image gen adds infra/cost without clear differentiation     |
| Multi-language support                       | English-first; localization is post-PMF                                        |
| Stripe Pro tier wiring (this round)          | Needs retention proof first; tracked as v2                                     |
| New dev tools (JSON, base64, etc.)           | Category saturated; effort goes to polish, not addition                        |
| Real affiliate link integration (this round) | Depends on CJ approval; placeholders stay until accepted                       |

## Traceability

| Requirement | Phase   | Status  |
| ----------- | ------- | ------- |
| AUDIT-01    | Phase 1 | Pending |
| AUDIT-02    | Phase 1 | Pending |
| AUDIT-03    | Phase 1 | Pending |
| AUDIT-04    | Phase 1 | Pending |
| AUDIT-05    | Phase 1 | Pending |
| AUDIT-06    | Phase 1 | Pending |
| UX-01       | Phase 2 | Pending |
| UX-02       | Phase 2 | Pending |
| UX-03       | Phase 2 | Pending |
| UX-04       | Phase 2 | Pending |
| UX-05       | Phase 2 | Pending |
| UX-06       | Phase 2 | Pending |
| UX-07       | Phase 2 | Pending |
| UX-08       | Phase 2 | Pending |
| UX-09       | Phase 2 | Pending |
| UX-10       | Phase 2 | Pending |
| UX-11       | Phase 2 | Pending |
| UX-12       | Phase 2 | Pending |
| BRAND-01    | Phase 2 | Pending |
| BRAND-04    | Phase 2 | Pending |
| BRAND-06    | Phase 2 | Pending |
| AI-01       | Phase 3 | Pending |
| AI-02       | Phase 3 | Pending |
| AI-03       | Phase 3 | Pending |
| AI-04       | Phase 3 | Pending |
| AI-05       | Phase 3 | Pending |
| AI-06       | Phase 3 | Pending |
| AI-07       | Phase 3 | Pending |
| UX-13       | Phase 4 | Pending |
| UX-14       | Phase 4 | Pending |
| UX-15       | Phase 4 | Pending |
| UX-16       | Phase 4 | Pending |
| UX-17       | Phase 4 | Pending |
| UX-18       | Phase 4 | Pending |
| UX-19       | Phase 4 | Pending |
| UX-20       | Phase 4 | Pending |
| UX-21       | Phase 4 | Pending |
| SEO-01      | Phase 5 | Pending |
| SEO-02      | Phase 5 | Pending |
| SEO-03      | Phase 5 | Pending |
| SEO-04      | Phase 5 | Pending |
| SEO-05      | Phase 5 | Pending |
| SEO-06      | Phase 5 | Pending |
| SEO-07      | Phase 5 | Pending |
| SEO-08      | Phase 5 | Pending |
| SEO-09      | Phase 5 | Pending |
| BRAND-02    | Phase 6 | Pending |
| BRAND-03    | Phase 6 | Pending |
| BRAND-05    | Phase 6 | Pending |
| RET-01      | Phase 7 | Pending |
| RET-02      | Phase 7 | Pending |
| RET-03      | Phase 7 | Pending |
| RET-04      | Phase 7 | Pending |
| RET-05      | Phase 7 | Pending |
| RET-06      | Phase 7 | Pending |

**Coverage:**

- v1 requirements: 55 total
- Mapped to phases: 55 (100%)
- Unmapped: 0 ✓

---

_Requirements defined: 2026-05-20_
_Last updated: 2026-05-20 — traceability populated by roadmapper_
