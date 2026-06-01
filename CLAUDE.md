# CyberScryb / Lazy Hustler — Working Memory
*Last updated: 2026-05-21*

---

## ⚡ OPERATING DIRECTIVE — READ THIS FIRST, EVERY SESSION

### How Claude Works on This Project

**Act, don't advise.** If there's a problem, fix it. If there's an obvious improvement, make it. Stop creating patch files and handing them back — find the file, edit it, deploy it, confirm it's live. The only time to ask first is when the action is irreversible, ambiguous in its intent, or touches money. Everything else: do it.

**No more loops.** If the same issue appears in two consecutive sessions without being resolved, that's a failure. Escalate it, make noise, find a different path — don't just note it again.

**Own the outcome.** Don't stop at "I created a file you need to paste." That's half a job. Push through to the live state. Use GitHub, Vercel, Netlify, Cloudflare, Stripe — whatever MCP is available — to make the change land in production.

**GitHub is connected.** Authenticate via `/mcp` if the GitHub MCP shows unauthenticated. Once connected, commit changes directly to the repo. Don't create patch files when you can push commits.

---

## 🎯 THE MISSION — What We're Actually Building

This isn't a side project. This is a real business built on a real story — a CNA on night shifts who shipped 29 AI tools between patient rounds. That story is the competitive moat. No VC-backed competitor can replicate it. No agency can fake it. It's the kind of authentic origin that Google, Reddit, and real humans respond to, and it needs to be everywhere.

**The north star:** Build tools so genuinely useful that users would miss them if they disappeared. Not "another AI wrapper" — tools that solve real problems for real people who are struggling, working, hustling, and need help fast. The humanizer helps a student avoid a failing grade. The hardship letter helps someone keep their lights on. The CNA shift report helps an exhausted healthcare worker go home ten minutes earlier. That's what we're doing. Those people are the point.

**Every decision runs through this filter:** Does this make the product better for the user? Does it get more people to discover it? Does it make them trust it more? If yes, do it. If no, cut it.

---

## 🚦 ACTION PROTOCOL

### When Claude finds an issue:
- **Clearly fixable + low-risk** → Fix it immediately, note what was done
- **Fixable but ambiguous** → State the issue and proposed fix in one sentence, ask for a yes/no, then execute
- **Irreversible or touches payments/security** → Always ask before touching it

### What "done" means:
Not "I created a file." Not "here's what you need to do." Done means: the change is live, confirmed, and noted in this CLAUDE.md under recent changes.

### Organic traffic is the current #1 priority:
Every session should move at least one needle on organic reach. This means:
- Fix SEO issues on pages that have them (directly in the repo, not in patch files)
- Build content (blog posts, FAQs, landing pages) that targets real search queries
- Distribute on platforms where the audience already is (Reddit, Quora, Product Hunt, niche forums)
- Pursue every legitimate organic technique: schema markup, internal linking, content depth, long-tail keyword pages, programmatic SEO for tool variations, community engagement
- Nothing spammy. Nothing that risks a Google penalty. Everything that a real business with real users would do.

### Build for longevity:
Don't optimize for today's metric at the expense of next year's foundation. No black-hat shortcuts. No dark patterns on users. Build the kind of product that earns loyalty — fast tools, honest copy, zero dark patterns, real value delivery. Users are not a means to revenue. Revenue is a byproduct of genuinely serving users.

---

## 🔥 WHAT GREAT LOOKS LIKE HERE

Not adequate. Not "fine for a one-person shop." Actually great. Every page should load fast, look clean, and do exactly what it promises. Every tool should work on the first try. Every email, every landing page, every Reddit comment — written like someone cares, because someone does.

The standard is: would a first-time visitor trust this with their resume, their hardship letter, their professional reputation? If the answer is anything less than "immediately, yes" — fix it.

Innovate where it matters. The AI humanizer isn't just a text rewriter — it could be the tool that learns your voice over time, gets smarter with every use, becomes genuinely irreplaceable. The CNA tools aren't just templates — they're a product built by someone who has done the job, and that shows in every field and every phrase. Push on those differentiators. That's where competitors can't follow.

---

## 🛑 THINGS THAT MUST STOP

- Creating files and calling it done
- Identifying the same issue across multiple sessions without resolving it
- Writing "here's what you need to do" when the tools exist to do it directly
- Spending tokens on analysis and recaps instead of execution
- Any recommendation that starts with "you could consider" — if it's worth saying, it's worth doing
- **Auto-picking files from Downloads when there's ambiguity.** 2026-05-26: grabbed a random PNG instead of asking which file = "alien" on the homepage. If multiple candidate files exist, ASK before deploying.
- **Drawing the mascot from scratch in SVG.** Nathan rejected three different SVG approximations I made ("the ones you made are shit"). Always use his actual raster files (`mascot.webp`, `mascot-hero.png`, `mascot-icon.png/webp`). If a new size is needed, crop from the source via `crop_mascot.py` — don't redraw.
- **Putting big illustrations on every page hero.** 2026-05-26: big mascot on home + about + 404 was overkill. Pattern: big illustration on **homepage hero only**, navbar icon + favicon carry the brand everywhere else.
- **Using raster images with baked-in backgrounds on gradient pages.** A mascot with pure `#000` bg on a `#0a0a0a` page renders as a hard black square. Either make the image transparent (PIL flood-fill from corners) or match the page bg exactly. Always preview against the actual page bg before declaring a swap done.
- **Pitching speed as a feature.** Quality always — don't rank options by "faster to ship." See `~/.claude/projects/C--claude/memory/feedback_quality_over_speed.md`.
- **Treating CLAUDE.md updates as optional.** "Every time a new mistake happens or a new rule emerges, add it here." Update CLAUDE.md in the same commit as the fix — not next session.

---

## 🤖 EFFICIENCY SYSTEM — Agents, Tokens, Tools, Automation

### Sub-Agents: Use Them, Don't Hoard the Work

Spawn sub-agents when work is parallelizable, specialized, or would benefit from isolation. Concrete triggers:

- **Parallel independent tasks** — e.g., auditing 5 tool pages for SEO at the same time, not sequentially. Launch them in one message as parallel agents.
- **Heavy research + execution simultaneously** — one agent researches while another deploys.
- **Specialized work** — use `searchfit-seo` agents for deep SEO analysis, `engineering` agents for code review, `brand-voice` agents for content generation. Don't reinvent what a skill already does well.
- **Verification** — always spawn a verification agent after significant changes rather than self-reviewing. Fresh context catches things the original agent misses.
- **Long file analysis** — if reading + analyzing multiple large files, delegate to a `general-purpose` agent rather than burning the main context window.

When NOT to spawn: simple one-step tasks, pure conversation, anything that needs real-time back-and-forth with Nathan.

### Token Cost — Save Without Cutting Quality

**Cache aggressively.** CLAUDE.md is read every session — its content hits the cache after the first read. Keep it well-structured so repeated reads stay cheap. Don't re-read files that haven't changed.

**Batch tool calls.** Independent tool calls (file reads, web fetches, API calls) go in a single message block. Never fire them sequentially when they can run in parallel. One round-trip instead of five.

**Don't recap.** Never open a response with a summary of what was just done. The user can see the previous message. Get to the next action.

**Skip intermediate verification for simple changes.** A single-line string replacement doesn't need a 200-line file re-read to confirm. Trust the tool's success response. Reserve verification reads for complex multi-step changes.

**Use the right model.** Haiku-tier tasks (formatting, simple lookups, short writes) don't need Sonnet. When spawning sub-agents for lightweight tasks, note the task is simple so the agent can use lighter inference.

**Compact proactively.** When context is getting long (approaching 80% of the window) and there's a natural pause — end of a major task, before starting a new unrelated one — trigger `/compact`. Don't wait to be asked. Note the compact happened in the next message so Nathan knows.

### Tools and Skills — Discover, Use, Create

**Before doing something manually, check if a tool exists for it.** Search MCP registry before scraping manually. Check available skills before writing from scratch. The installed plugin stack (Ahrefs, Semrush, Stripe, Vercel, Cloudflare, Netlify, Notion, Slack, Gmail, HubSpot, ActiveCampaign, and more) covers most workflows — use them.

**Create skills when a workflow repeats.** If the same sequence of steps happens more than twice (e.g., "audit a tool page and push SEO fixes"), build a skill for it. Skills live at `C:\Users\natea\AppData\Roaming\Claude\local-agent-mode-sessions\skills-plugin\...\skills\`. Use the `skill-creator` skill to scaffold them properly.

**Scheduled tasks are automation, not reminders.** If something needs to happen regularly, create a scheduled task that actually does the work — not one that reminds Nathan to do it. The difference: a good scheduled task produces a commit, a sent message, or a live change. A bad one produces a note saying "you should do X."

**The automation stack already running:**
- Reddit opportunity monitor → daily 7:09 AM (scans 13 subs, emails ranked list + pre-written replies)
- Weekly content generator → Sundays (SEO blog post + newsletter draft)
- Lazy Hustler content pipeline → Mondays
- Daily briefing → daily
- Gmail opportunity scanner → daily
- Daily revenue check → ❌ BROKEN (Stripe MCP disconnected — reconnect via Cowork → Connectors)

Every session: look at this list. If something is broken, fix it. If something is missing that should be automated, build it.

### The Automation Dream

The goal is: Nathan describes what he wants, it gets done, he finds the result waiting for him. Zero back-and-forth on execution. He reviews outcomes, not steps. Every session should move closer to that. Every manual step Nathan currently does is a candidate for automation. Every file Claude creates manually is a candidate for a scheduled task. Every SEO fix that took 30 minutes is a candidate for a skill that does it in 2.

---

## Recent Changes (Session 2026-06-01)

**GSC index-coverage follow-up (branch `fix/gsc-redirects-canonicals-20260601`).** Triggered by `cyberscryb.com-Coverage-2026-06-01.zip` (chart ends 2026-05-28, so counts are mostly the *pre-* PR#13/#14 state). Re-scanned the whole `public/` tree for crawl offenders and fixed the code-level ones:

| File | Change |
|------|--------|
| `tools/humanizer/index.html` | 2 inline "Related:" links `*.html` → trailing-slash (redirect hops PR#14 missed because they're inside the SEO block, not the nav/sitemap path the crawl followed) |
| `tools/humanizer/remove-ai-detection.html` | Added self-canonical + fixed `.html` redirect link |
| `tools/humanizer/rewrite-chatgpt-text.html` | Added self-canonical + fixed `.html` redirect link |
| `tools/ai-writing-suite/index.html` | 3 footer links `../../X.html` → `/X/` (redirect hops; this page is an orphan — not in sitemap, only reachable via the homepage dropdown) |
| `pro-success/index.html` | Added `<meta name="robots" content="noindex">` — post-Stripe success page should never be indexed |
| `index.html` | 28 tool-jumper dropdown `value="tools/X/index.html"` → `/tools/X/` — each selection was firing a 301 hop for real users (not a crawl issue; `<option>` values aren't crawled) |

**Result:** ZERO internal `.html` links remain site-wide (grep-verified). cleanUrls+trailingSlash means any `*.html` or `index.html` internal link is a guaranteed 301 — keep all internal links in `/path/` form.

**NOT code-fixable — Nathan's action:**
- **404×36 + redirect-bucket remainder** = stale pre-fix URLs Google still holds (no broken internal links exist in the repo now). → Click **Validate Fix** in GSC on the 404 + redirect issues, then wait for re-crawl.
- **403×19** = the disabled `security-shield` worker. Clears on re-crawl.
- **5xx×14** = transient API cold-starts, not reproducible.
- **`privacy-check.html`** = orphan page (legacy inline styling + legacy `#00d4ff`, not in sitemap, unlinked). **OPEN DECISION:** promote (add to sitemap + canonical) vs. noindex/delete. Pulled from this PR pending intent — don't guess.
- Brand nit spotted, out of scope: `tools.html:767` still uses legacy cyan `#00d4ff` on the AI Writing Suite "Launch Tool" link.

**Pro pricing $9→$5 fix (branch `fix/pro-pricing-5-dollars`).** Nathan reported "says $5 then click shows $9." Root cause: the WHOLE site advertises `$5/month` (index.html:229, about, all blogs/guides, disclosure) + schema says `5.00` + the active Stripe link `fZu4gBbuKg9geKFaRn0sU0b` is $5 — but `pro.html` alone still had stale `$9` in the visible monthly price (line 85) and meta description (line 7). Fixed both → `$5`. **This ALSO fixes the GSC `/pro/` Product-snippet validation** ("Item: CyberScryb Pro — Lifetime Access / Cannot continue validation"): Google requires schema price to match visible price; `$9` visible vs `5.00` schema was the mismatch. ⚠️ Could NOT verify the live Stripe checkout amount (Stripe MCP still disconnected) — Nathan must confirm the checkout page itself charges $5.

**✅ Pro activation FIX SHIPPED (branch `fix/pro-activation-stripe-secret`, Nathan approved).** `pro-success/` was spinning forever on "Activating Your Pro Access." Root cause in `functions/index.js` `validateStripeSession`: (1) the Stripe secret was read via `functions.config().stripe.secret` with NO `process.env` fallback — unlike every other secret (GOOGLE_API_KEY 366/605/1168, ANALYTICS_SECRET 1333) which all have `|| process.env.X`. firebase-functions is **v6.3.2** where `functions.config()` is dead → Stripe read returned nothing while AI tools kept working via their env fallback. (2) No try/catch around the async handler → any throw left the HTTP response unsent → infinite client spinner. (3) No timeout on the Stripe `https.request`, the JSON.parse, or the client fetch. **Fixes applied:** secret now `process.env.STRIPE_SECRET || functions.config().stripe?.secret` (env first, so it never even calls the dead config when the env var is set); whole handler wrapped in try/catch that always responds (`!res.headersSent` guard); JSON.parse wrapped in try/catch; `req2.setTimeout(15000)`; client `pro-success/` fetch now uses an `AbortController` 20s timeout → shows a "contact support / payment may still be processing" message instead of hanging. **⚠️ STILL REQUIRES Nathan to set `STRIPE_SECRET=sk_live_…` in the gitignored `functions/.env`** (same file holding GOOGLE_API_KEY) — until then activation fails *gracefully* (clean error + support email) instead of hanging, but won't actually unlock. After setting it, the deploy that ships this code activates Pro end-to-end.

**⚡ Performance fix — homepage hero image (branch `perf/hero-image-webp`).** Nathan flagged PageSpeed/Lighthouse mobile Performance = **45**. PSI keyless API quota was exhausted, so diagnosed from assets directly. Head was already well-tuned (preconnect, async fonts, preloaded CSS, delayed AdSense; CSS gzips 43KB→8KB fine). **The killer: `mascot-hero.png` was 276 KB but displayed at 180px wide** — and it's the LCP element (`fetchpriority="high"`). Source was 1024×720 RGBA. **Fix:** generated `public/mascot-hero.webp` (360×253, 2× retina, quality 82 via PIL) = **14.9 KB (−94.6%, saves 261 KB on LCP)**; updated `index.html` img to the webp + corrected `width/height` to `360×253` (true 1.42:1 ratio, was wrongly 180×180) to kill CLS. Only `index.html` referenced the hero. **Rule: any new raster shipped to a page must be sized to ~2× its display px and saved as WebP — never ship a 1024px source for a 180px slot.** Re-run PageSpeed after deploy to confirm the lift. Remaining perf headroom (smaller): CSS is render-blocking (8KB gz, acceptable), 3rd-party JS (GA/AdSense/Ahrefs) adds some TBT but is already deferred/async.

## Recent Changes (Session 2026-05-26)

**Phase 1 of full site overhaul (responding to competitor audit).** 11 commits, all pushed to main.

| Area | Change |
|------|--------|
| Life Tool guides | Created 10 long-form guides in `/guides/` (mortgage/medical/student-loan hardship, unemployment/insurance/housing appeals, parenting plan, custody modification, caregiver handoff, cognitive decline). 2,000-3,500 words each with full schema (Article + FAQPage + BreadcrumbList + SoftwareApplication + speakable). Real WebSearch research from HUD, CFPB, FCRA, ERISA, Joint Commission sources. |
| Blog rebrand | All 5 existing blog posts (`public/blog/*.html`) + blog index rebranded from legacy cyan/purple to V2 mint/teal, then again to red (see below). |
| **Brand color** | **Switched site accent from mint/teal `#34F5C5` BACK to red `#c41e1e`** to stop clashing with the new togabot mascot. Site has been: cyan/purple → red → mint/teal → red. The mascot is now the brand anchor. |
| Mascot variants | Source `mascot.webp` (1024×1024 full lockup) cropped via `crop_mascot.py` into purpose-built sizes — see "Mascot Asset Map" below. |
| Big mascot placement | **Homepage hero only.** Removed from about and 404 because putting big mascot on every page is amateur — navbar icon + favicon already carry brand presence everywhere. |
| sitemap.xml | 10 new guide URLs at priority 0.9 |
| `guides/index.html` | New "Life Tools" section at top of guides directory |

### Mascot Asset Map (use the right file for the right job)

| File | Purpose | Notes |
|------|---------|-------|
| `public/mascot.webp` | Full original lockup (bot + wordmark + black bg) | Use for OG image, social profiles, email sigs |
| `public/mascot-hero.png` | Bot + toga, **transparent bg** | Homepage hero only — alpha channel prevents the hard black square against page gradient |
| `public/mascot-bot.webp` | Bot + toga, no wordmark, **black bg** | On disk but not currently referenced. Use only where page bg is pure `#000`. |
| `public/mascot-icon.png` | Head-only square 256×256 | Favicon `<link rel="icon">` — PNG for universal browser support |
| `public/mascot-icon.webp` | Head-only square 256×256 | Navbar 32×32 small icon next to wordmark |
| `public/favicon.svg` | Legacy hand-drawn fallback | Kept on disk; not currently referenced |
| `crop_mascot.py` | Reproducible cropping pipeline (PIL) | Run from repo root to regenerate variants from source |

### Pending punch list (next session)
- Phase 2: Build 4 missing tools the audit flagged — child-support-calculator (all 50 states), spousal-support-calculator (all 50 states), med-administration-log (real MAR fields), behavioral-log (ABC framework)
- Phase 3: 5 audit-recommended blog posts (dementia/custody evidence, vanilla JS architecture, unemployment Board of Review hearing, why SEO generators gate meta tags, behavioral spike tracking in memory care)
- Phase 4: Meta/schema/internal-link tightening pass
- ✅ DONE (2026-05-30, branch `fix/ga4-property-drift`) GA4 ID drift — standardized all 10 guides `G-73LQZEDNR6` → `G-LS46B9J1XK`. `public/**/*.html` now contains only the correct ID (verified, 0 stray).
- ⚠️ OPEN — GA4 third property `G-Z347WYM5ZZ` fires page_views during navigation but is **NOT in the codebase** (grepped public + js for literal, fragments, dynamic concat, atob/base64, GTM — nothing). Almost certainly a **Connected Site Tag / linked Google tag set in GA4 Admin** for `G-LS46B9J1XK` (Google auto-forwards to it when the correct tag loads). Remove in GA4 Admin → Data Streams → web stream → Google tag → *Configure tag settings* → *Manage connected site tags*. Not fixable in code; legacy `content-site/` (not deployed) still hardcodes `G-73LQZEDNR6` if that tree is ever revived.
- "POPULAR"/"NEW" pill bg is red after rebrand; some still have black text. Should be white for legibility.
- Verify homepage hero looks right (transparent mascot on gradient bg) — last unresolved aesthetic feedback

---

## Recent Changes (Session 2026-05-21)
| File | Change |
|------|--------|
| `public/pro.html` | Fixed dead monthly checkout link → `https://buy.stripe.com/fZu4gBbuKg9geKFaRn0sU0b` ($5/mo active). Schema price corrected 9.00 → 5.00. |
| `public/tools/humanizer/index.html` | Added canonical, full OG tags, Twitter card, upgraded schema to WebApplication + featureList, injected 1,000-word SEO content block + FAQ section. |
| `CLAUDE.md` (repo) | Merged lesson entries from both session and remote. |
| Commit | `3af1f5f` pushed to `main` on `github.com/CyberScryb/cyberscryb` |

**Pending:** GitHub Dependabot flagged 9 vulnerabilities (4 high, 4 moderate, 1 low) on the repo. Run `npm audit fix` or review at github.com/CyberScryb/cyberscryb/security. Address high severity items next session.

---

## Who You Are
- **Nathan Ady** (Nathaniel Ady) — cyberscryb@gmail.com
- CNA (Certified Nursing Assistant), works night shifts
- Author: "The Lazy Hustler's Playbook"
- Brands: **CyberScryb LLC** (tools/SaaS) + **Lazy Hustler** (content/newsletter)
- Stats: 68+ AI systems, 229 Suno music tracks

## CyberScryb Products
**Site:** cyberscryb.com — 29 AI tools total

### Hero Tools (highest commercial value)
| Tool | Notes |
|------|-------|
| Anti-AI Humanizer | Most popular tool; competitors charge $20-50/mo |
| Gig Auto-Pilot | Freelance proposal generator; Upwork market |
| AI Text Detector | Pairs with humanizer |
| Resume Bullet Writer | |
| Caregiver Shift Report Generator | **Unique wedge** — CNA-built, no competitor has it |
| Hardship Letter Generator | |
| Appeal Letter Generator | |

### Dev Tools (bundle filler)
JSON↔CSV, regex tester, cron builder, base64, markdown→HTML, color palette, password checker, privacy policy gen, SEO meta tag gen, and others.

## Pricing (as of session)
| Tier | Price | Link |
|------|-------|------|
| Monthly | $5/mo | cyberscryb.com/pro |
| Annual | $29/yr | cyberscryb.com/pro |
| CNA Resume Kit | $39 one-time | https://buy.stripe.com/00w3cx56m3mueKF3oV0sU01 |
| CyberScryb Pro (lifetime promo) | listed on site | https://buy.stripe.com/eVq6oJ7eucX4aupaRn0sU08 |

**Note:** A $29 lifetime and $19 CNA pack were created and then **deactivated** in April 2026 because they conflicted with existing $29/yr tier.

## Automated Systems (Scheduled Tasks)
| Task | Schedule | Status |
|------|----------|--------|
| Reddit opportunity monitor | Daily 7:09 AM | ✅ Running — scans 13 subs, emails ranked list + pre-written replies |
| Cyberscryb weekly content generator | Weekly (Sundays) | ✅ Running — SEO blog post + newsletter draft |
| Weekly content pipeline (Lazy Hustler) | Mondays | ✅ Running — newsletter + 5 social posts + Notion update |
| Daily briefing | Daily | ✅ Running |
| Gmail opportunity scanner | Daily | ✅ Running |
| Daily revenue check | Daily | ❌ BROKEN — Stripe MCP (fce2083b) disconnected |

## Critical Open Items
1. **Reconnect Stripe MCP** — daily revenue check failing. Go to Cowork → Connectors → find Stripe and reconnect.
2. **Publish the story post** — 3 versions drafted in STORY-POST.md (Indie Hackers long-form, X thread, r/CNA). This is highest-leverage single action. Fill in 2 blanks (unit type, state) and post IH version.
3. **Launch newsletter container** — Beehiiv or Substack still not live as of late April. Weekly content packs are generating unread inventory.
4. **cyberscryb.com Pro landing page** — hasn't been optimized for conversion.

## 2026 Strategy (research-backed)
- **Traditional SEO is broken** — AI Overviews cut CTR 34.5%, 60% zero-click searches
- **Personal brand = SEO** — Google E-E-A-T rewards real human expertise/story
- **80.5% of AI tool traffic is direct** — brand + repeat users > search
- **Reddit ranks on Google** for commercial intent queries — authentic comments compound over weeks
- **Your wedge:** "CNA on night shift who shipped 29 AI tools between patient rounds" — no competitor can copy this angle
- **ChatGPT/Claude cite Reddit** at 7% conversion vs Google's 5%

## Active Revenue Channels
- CyberScryb Pro subscriptions ($5/mo, $29/yr)
- CNA Resume Kit ($39)
- AdSense on tool pages (revenue = traffic indicator; amount unknown)
- Stripe product ID prefix: `fce2083b` (when Stripe MCP reconnected)

## Critical IDs
- Firebase project: `gen-lang-client-0384486156`
- GA4 measurement ID: `G-LS46B9J1XK` (confirmed correct property — updated 2026-05-26). NOTE: `G-Z347WYM5ZZ` shows up as a stray Connected Site Tag (configured in GA4 Admin, not in code) — remove via GA4 Admin if unwanted.
- AdSense publisher: `ca-pub-5721233331247292`
- Gemini model: `gemini-3.1-pro-preview` (MUST use `-preview` suffix — stable name returns 404)

## Key Files (from previous sessions)
- STORY-POST.md — `local_3aeaca2c` outputs — 3-version launch post, ready to publish
- LAUNCH-TONIGHT.md — `local_3aeaca2c` outputs — original launch plan (partially executed)
- Weekly content packs — `local_dc107099` outputs — content already written

## Notion
- CyberScryb Command Center: https://app.notion.com/p/f8bcfddc1cc748e7819049b183fff3aa
- Lazy Hustler Newsletter: https://app.notion.com/p/3259ea9bcd7a81448127ea1fe44943fe

## Context for New Sessions
Start any new session by reading this file. Key constraint: **Stripe MCP must be reconnected** before revenue monitoring works. The Reddit monitor is the core compounding automation — check its daily email output to know if it's driving engagement. The story post is the single highest-leverage human action still pending.
