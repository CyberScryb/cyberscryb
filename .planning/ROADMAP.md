# Roadmap: CyberScryb — AI-First Tool Suite

**Created:** 2026-05-20
**Granularity:** standard
**Mode:** standard (horizontal layers — brownfield polish)
**Core Value:** Every interaction on this site should feel tight, fast, and obviously made for the user. If the AI tools don't deliver an experience that beats free competitors on quality + polish, nothing else matters.

## Strategy

Polish before addition. The site has 3,000+ visitors/month and 17 working AI tools — every micro-improvement compounds. Sequence ships user-visible wins fast: fix what's broken, polish what's there, upgrade the AI experience, then layer on novel UX, content, and retention. Brand identity work is split: foundation tokens land in Phase 2 (so everything downstream uses them); visual flourishes land in Phase 6 (after the underlying UX has earned them).

## Phases

- [ ] **Phase 1: Audit & Triage** — Click-test every tool, fix what's broken, hit Lighthouse 90+ on top pages
- [ ] **Phase 2: UX Polish Foundation** — Micro-improvements that compound across every tool; CSS tokens + button system as the foundation
- [ ] **Phase 3: AI Tool Quality Upgrades** — Streaming, examples library, regeneration; the AI tools feel alive
- [ ] **Phase 4: Novel UX Features** — Command palette, comparison mode, share-as-image; differentiation the competition lacks
- [ ] **Phase 5: SEO Content Push** — 8 blog posts, 10 comparison guides, 5 Life Tools long-tail; rich snippets across the site
- [ ] **Phase 6: Brand Identity Polish** — Hero animation, custom favicons, 404 page; the visual layer the foundation earned
- [ ] **Phase 7: Retention Layer** — Newsletter, magic-link auth, PWA, extension; users come back

## Phase Details

### Phase 1: Audit & Triage

**Goal**: Every existing tool works correctly across browsers and devices, and the top pages hit performance/accessibility/SEO benchmarks.
**Depends on**: Nothing (first phase)
**Requirements**: AUDIT-01, AUDIT-02, AUDIT-03, AUDIT-04, AUDIT-05, AUDIT-06
**Success Criteria** (what must be TRUE):

1. All 17 AI tools generate output end-to-end without errors through the email gate flow
2. Every client-side dev tool works in Chrome, Safari, Firefox, and mobile (375px+ viewport)
3. Top 10 pages score ≥90 on Lighthouse for performance, accessibility, and SEO
4. Every tool page has working nav (Blog + Pro links), footer, Schema.org JSON-LD, and breadcrumbs
5. Every AI tool's `toolId` maps to a key in `AI_PROMPTS`; no orphan tools or orphan prompts
   **Plans**: TBD
   **UI hint**: yes

### Phase 2: UX Polish Foundation

**Goal**: Every AI tool has consistent, polished interaction patterns; design tokens centralize colors, typography, and buttons so future work compounds.
**Depends on**: Phase 1
**Requirements**: UX-01, UX-02, UX-03, UX-04, UX-05, UX-06, UX-07, UX-08, UX-09, UX-10, UX-11, UX-12, BRAND-01, BRAND-04, BRAND-06
**Success Criteria** (what must be TRUE):

1. Every AI tool shows a consistent loading state (spinner + estimated time + cancel button) and contextual error messages
2. Keyboard shortcuts (Cmd/Ctrl+Enter to generate, Esc to cancel) and auto-resizing textareas work on every AI tool
3. User input persists in localStorage and restores on accidental refresh on every AI tool
4. CSS custom properties define a single color, typography, and button system used across every page
5. Every AI tool has an "Example input" button that prefills with a demo and a character counter showing remaining limit
   **Plans**: TBD
   **UI hint**: yes

### Phase 3: AI Tool Quality Upgrades

**Goal**: The AI tools feel alive — streaming output, examples to bootstrap users, and regeneration that lets users iterate without retyping.
**Depends on**: Phase 2
**Requirements**: AI-01, AI-02, AI-03, AI-04, AI-05, AI-06, AI-07
**Success Criteria** (what must be TRUE):

1. Gemini responses stream to the client and render live as they arrive (no post-hoc typewriter)
2. Every AI tool ships with a clickable examples library (3+ examples per tool) and a "Regenerate with different angle" button
3. 3 new Life Tools (eviction response, FAFSA appeal, IEP request) ship end-to-end and appear on tools.html, homepage dropdown, and sitemap.xml
4. Each AI tool prompt has been A/B tested with at least 2 variants and the winner is committed
5. When the free tier hits its limit, a Pro upsell card surfaces the quality difference
   **Plans**: TBD
   **UI hint**: yes

### Phase 4: Novel UX Features

**Goal**: Differentiating features the competition doesn't have — command palette, side-by-side comparison, output history, share-as-image.
**Depends on**: Phase 3
**Requirements**: UX-13, UX-14, UX-15, UX-16, UX-17, UX-18, UX-19, UX-20, UX-21
**Success Criteria** (what must be TRUE):

1. Cmd+K opens a command palette from anywhere on the site and navigates to any tool or page
2. The homepage shows a "Recent tools" widget (last 3 used, localStorage-backed) and AI tools restore last input on revisit
3. Comparison mode runs the same input through 2 AI tools side-by-side
4. Every AI tool output has "Refine: shorter / formal / casual" buttons and a "Share as image" button that generates a branded PNG
5. Light/dark theme toggle respects system preference and persists user choice
   **Plans**: TBD
   **UI hint**: yes

### Phase 5: SEO Content Push

**Goal**: New content + schema markup that pulls organic traffic — 8 blog posts, 10 comparison guides, 5 long-tail Life Tools guides, and rich-snippet markup across the site.
**Depends on**: Phase 3 (new Life Tools must exist before guides reference them)
**Requirements**: SEO-01, SEO-02, SEO-03, SEO-04, SEO-05, SEO-06, SEO-07, SEO-08, SEO-09
**Success Criteria** (what must be TRUE):

1. 8 new blog posts, 10 comparison guides, and 5 long-tail Life Tools guides are published in Nate's voice with current research
2. Top 10 tool pages have FAQ Schema.org markup and guide pages have HowTo Schema.org markup
3. Every guide links to its related tool and every tool page links to relevant guides
4. Sitemap.xml is regenerated, includes every public page, and has been resubmitted to Google Search Console
5. Every page has a meta description (140–160 chars, benefit-focused) and every image has descriptive alt text
   **Plans**: TBD

### Phase 6: Brand Identity Polish

**Goal**: Visual flourishes the foundation earned — homepage hero animation, category-specific favicons, redesigned 404 page that converts.
**Depends on**: Phase 2 (uses CSS tokens), Phase 5 (404 references real content)
**Requirements**: BRAND-02, BRAND-03, BRAND-05
**Success Criteria** (what must be TRUE):

1. Homepage has a subtle, performant hero animation (no layout shift, GPU-friendly)
2. Each major tool category has a custom favicon variant visible in the browser tab
3. The 404 page includes a tool search input and links to the top 10 popular tools
   **Plans**: TBD
   **UI hint**: yes

### Phase 7: Retention Layer

**Goal**: Users come back — weekly newsletter to the existing list, optional accounts, installable PWA, browser extension, and a changelog that signals momentum.
**Depends on**: Phase 4 (UX is tight enough to retain), Phase 5 (content gives the newsletter something to ship)
**Requirements**: RET-01, RET-02, RET-03, RET-04, RET-05, RET-06
**Success Criteria** (what must be TRUE):

1. A weekly newsletter goes out to existing subscribers with new tools and content
2. Magic-link auth ships — users log in with email, no password, and logged-in users can save outputs to a personal library
3. The site is installable as a PWA with offline support for client-side tools
4. The browser extension ships and lets users right-click selected text to send it to CyberScryb
5. The "What's new" changelog page exists and an in-tool toast notifies users of new tools
   **Plans**: TBD
   **UI hint**: yes

## Progress

| Phase                       | Plans Complete | Status      | Completed |
| --------------------------- | -------------- | ----------- | --------- |
| 1. Audit & Triage           | 4/5            | In Progress |           |
| 2. UX Polish Foundation     | 0/0            | Not started | -         |
| 3. AI Tool Quality Upgrades | 0/0            | Not started | -         |
| 4. Novel UX Features        | 0/0            | Not started | -         |
| 5. SEO Content Push         | 0/0            | Not started | -         |
| 6. Brand Identity Polish    | 0/0            | Not started | -         |
| 7. Retention Layer          | 0/0            | Not started | -         |

## Coverage

- v1 requirements: 50
- Mapped to phases: 50
- Unmapped: 0

---

_Roadmap created: 2026-05-20_
