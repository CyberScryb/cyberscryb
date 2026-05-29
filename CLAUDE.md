# CyberScryb / Lazy Hustler — Working Memory
*Last updated: 2026-05-29 · Tuned for Claude Opus 4.8*

---

## ⚡ OPERATING DIRECTIVE — read first, every session

**Act, don't advise.** Find a problem → fix it. See an obvious improvement → make it. Never hand back a patch file when you can edit the file and push the commit. Push through to the *live* state.

**"Done" = live + confirmed + logged**, never "I created a file you need to paste." After a change lands, add a row to *Recent Changes* below.

**Ask first only when:** the action is irreversible, ambiguous in intent, or touches money/security/auth. Everything else: just do it.

**No repeat loops.** If the same issue shows up two sessions running, that's a failure — escalate it or find a different path, don't re-note it.

**Don't recap or pad.** The user can see the previous message. Skip summaries, skip "you could consider" — if it's worth saying, it's worth doing. Spend tokens on execution.

### Decision rule when you find an issue
| Situation | Action |
|---|---|
| Fixable + low-risk | Fix now, log it |
| Fixable but ambiguous | One-sentence problem + proposed fix → yes/no → execute |
| Irreversible / payments / security / auth | Ask before touching |

---

## 🎯 THE MISSION

A real business on a real story: a CNA on night shifts who shipped 29 AI tools between patient rounds. That origin is the moat — no VC or agency can fake it, and Google/Reddit/humans reward it. Put it everywhere.

**North star:** tools so useful people would miss them if they vanished. The humanizer saves a student's grade. The hardship letter keeps someone's lights on. The CNA shift report sends an exhausted worker home ten minutes earlier. Those people are the point.

**Every decision filter:** Does it make the product better for the user, help more people find it, or make them trust it more? Yes → do it. No → cut it.

**The bar:** would a first-time visitor trust this with their resume, their hardship letter, their reputation — *immediately*? If less than yes, fix it. Fast tools, honest copy, zero dark patterns, no black-hat SEO. Build for next year's foundation, not today's metric.

**Current #1 priority — organic reach.** Every session moves at least one needle: fix on-page SEO directly in the repo, build content for real search queries (blog/FAQ/landing/long-tail/programmatic), distribute where the audience is (Reddit, Quora, Product Hunt, niche forums), strengthen schema + internal linking. Nothing spammy, nothing penalty-risking.

---

## 🛠 TECHNICAL REFERENCE

**Stack:** Static site — vanilla HTML/CSS/JS, **no build step, no framework**. Every tool runs 100% client-side (privacy = the product promise). Firebase Hosting + Cloud Functions. Cloudflare in front. Jest (JS) + pytest (Python) for tests.

**Repo layout:**
| Path | What |
|---|---|
| `public/` | The live site (Firebase `hosting.public`). `cleanUrls` + `trailingSlash` on. |
| `public/tools/<name>/index.html` | One self-contained tool per dir (~40 dirs). Edit these for tool/SEO fixes. |
| `public/tools/shared/` | Shared tool assets |
| `public/{blog,guides,distill}/` | Content pages |
| `functions/index.js` | Cloud Functions (Node 20) — the only server-side code (e.g. AI generate handler) |
| `__tests__/` | Jest specs for tools + functions |
| `freelance-pipeline/tests/` | pytest suite |
| `generate-pages.js`, `expand-guides.js` | Page generators (run with node; large) |
| `scripts/audit-inventory.js` | Inventory audit |
| `fix-*.ps1` | Legacy PowerShell maintenance scripts (Windows origin — prefer editing files directly here) |
| `firebase.json` | Hosting config + security headers (CSP, X-Frame-Options). Touch CSP carefully — it gates which external scripts load. |

**Commands:**
```bash
npm test                 # Jest (all JS tests)
npx jest <file>          # single suite
python -m pytest freelance-pipeline/tests/ -v
firebase emulators:start --only functions   # local functions (from functions/)
```

**Deploy:** Automatic. Push to `main` → `.github/workflows/deploy.yml` runs `firebase deploy --only hosting,functions` to project `gen-lang-client-0384486156`. `test.yml` runs Jest + pytest on every push/PR to `main`. **CI is the gate — keep it green.**

**Conventions:** match the surrounding file (these are hand-written static pages). When adding/editing a tool page, keep canonical tag, OG + Twitter tags, and JSON-LD schema intact — SEO depends on them. No new runtime dependencies without reason; the zero-dependency client-side promise is a selling point.

---

## 🤖 EFFICIENCY — agents, tokens, tools

**Sub-agents — delegate, don't hoard.** Spawn when work is parallel, specialized, or isolatable:
- Parallel independent tasks (e.g. audit 5 tool pages at once — launch in one message)
- Research + execution simultaneously
- Specialized passes (SEO audit, code review, content/brand voice)
- A fresh-context verification agent after significant changes (catches what the author misses)
- Heavy multi-file reading — delegate so the main context stays clean

Don't spawn for: trivial one-step tasks, pure conversation, anything needing live back-and-forth.

**Tokens:** batch independent tool calls into one message (one round-trip, not five). Don't re-read unchanged files. Skip verification reads for trivial edits — trust the tool's success. Don't open with a recap.

**Tools/skills first.** Before doing something by hand, check for an MCP tool or skill. The connected stack covers most workflows: **GitHub** (commits/PRs — use it, don't make patch files), **Ahrefs + Semrush** (SEO/keywords/backlinks), **Vercel/Netlify/Cloudflare** (deploy/infra), **Gmail + calendar**, **Notion**, **Slack**, **HubSpot + ActiveCampaign**, **Stripe** (when reconnected). When a workflow repeats 2+ times, build a skill for it.

**Automation, not reminders.** A good scheduled task produces a commit, a sent message, or a live change — not a note telling Nathan to do something. Goal: Nathan describes the outcome, finds it done. Every manual step is a candidate for automation.

---

## 📦 Reference Data

### Who
**Nathan Ady** (Nathaniel Ady) — cyberscryb@gmail.com · CNA, night shifts · author *The Lazy Hustler's Playbook* · brands **CyberScryb LLC** (tools/SaaS) + **Lazy Hustler** (content/newsletter) · 68+ AI systems, 229 Suno tracks.

### Products — cyberscryb.com, 29 AI tools
**Hero (commercial value):** Anti-AI Humanizer (most popular; rivals charge $20–50/mo) · Gig Auto-Pilot (Upwork proposals) · AI Text Detector (pairs w/ humanizer) · Resume Bullet Writer · **Caregiver Shift Report Generator** (the wedge — CNA-built, no competitor has it) · Hardship Letter · Appeal Letter.
**Dev tools (bundle filler):** JSON↔CSV, regex, cron, base64, markdown→HTML, color palette, password checker, privacy-policy gen, SEO meta gen, + more.

### Pricing
| Tier | Price | Link |
|---|---|---|
| Monthly | $5/mo | cyberscryb.com/pro |
| Annual | $29/yr | cyberscryb.com/pro |
| CNA Resume Kit | $39 once | https://buy.stripe.com/00w3cx56m3mueKF3oV0sU01 |
| Pro (lifetime promo) | on site | https://buy.stripe.com/eVq6oJ7eucX4aupaRn0sU08 |

Active monthly checkout: `https://buy.stripe.com/fZu4gBbuKg9geKFaRn0sU0b`. A $29 lifetime + $19 CNA pack were **deactivated Apr 2026** (conflicted with $29/yr).

### Critical IDs
- Firebase project: `gen-lang-client-0384486156`
- GA4: `G-LS46B9J1XK` (confirmed property — 2026-05-26)
- AdSense publisher: `ca-pub-5721233331247292`
- Gemini model: `gemini-3.1-pro-preview` — **must keep `-preview` suffix** (stable name 404s)
- Stripe product prefix: `fce2083b` (needs Stripe MCP reconnected)

### Automations (scheduled tasks)
| Task | When | Status |
|---|---|---|
| Reddit opportunity monitor | Daily 7:09 AM | ✅ scans 13 subs → ranked email + draft replies |
| CyberScryb weekly content | Sundays | ✅ SEO post + newsletter draft |
| Lazy Hustler content pipeline | Mondays | ✅ newsletter + 5 social + Notion |
| Daily briefing | Daily | ✅ |
| Gmail opportunity scanner | Daily | ✅ |
| Daily revenue check | Daily | ❌ BROKEN — Stripe MCP (`fce2083b`) disconnected |

Each session: scan this list. Broken → fix. Missing-but-should-exist → build.

### Key files / links
- `STORY-POST.md` — 3-version launch post (Indie Hackers / X / r/CNA), ready to publish
- `LAUNCH-TONIGHT.md` — original launch plan (partially executed)
- Notion — Command Center: https://app.notion.com/p/f8bcfddc1cc748e7819049b183fff3aa · Newsletter: https://app.notion.com/p/3259ea9bcd7a81448127ea1fe44943fe

---

## 🔴 Open Items (work these down)
1. **Reconnect Stripe MCP** — daily revenue check failing. Cowork → Connectors → Stripe → reconnect.
2. **Dependabot: 9 vulns** (4 high, 4 mod, 1 low). `npm audit fix` / review github.com/CyberScryb/cyberscryb/security. Clear highs first.
3. **Publish the story post** — highest-leverage human action. Fill 2 blanks (unit type, state) in `STORY-POST.md`, post the IH version.
4. **Launch newsletter container** — Beehiiv/Substack not live; weekly packs piling up unread.
5. **Pro landing page** — not yet conversion-optimized.

## 2026 Strategy (research-backed)
- Traditional SEO is eroding — AI Overviews cut CTR ~34.5%, ~60% zero-click.
- **Personal brand = SEO**: Google E-E-A-T rewards real human expertise/story.
- ~80.5% of AI-tool traffic is direct → brand + repeat users beat search.
- Reddit ranks for commercial-intent queries; authentic comments compound over weeks. ChatGPT/Claude cite Reddit (~7% conv. vs Google ~5%).
- The wedge: "CNA on night shift who shipped 29 AI tools between patient rounds" — uncopyable.

---

## Recent Changes
| Date | File | Change |
|------|------|--------|
| 2026-05-29 | `CLAUDE.md` | Restructured + tuned for Opus 4.8: deduped 5 overlapping directive sections into one, added Technical Reference (stack/commands/deploy/layout), preserved all reference data. |
| 2026-05-21 | `public/pro.html` | Fixed dead monthly checkout → `fZu4gBbuKg9geKFaRn0sU0b` ($5/mo). Schema price 9.00 → 5.00. |
| 2026-05-21 | `public/tools/humanizer/index.html` | Canonical + full OG/Twitter, schema → WebApplication + featureList, +1,000-word SEO block + FAQ. |
| 2026-05-21 | commit `3af1f5f` | Pushed to `main`. |
