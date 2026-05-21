# CLAUDE.md — CyberScryb Project Rules

**Last updated:** 2026-05-16
**Purpose:** Prevent repeat mistakes and wasted time. Read this FIRST every session.

---

## About this project

**Site:** cyberscryb.com
**Owner:** Nate Ady (sole founder, operating CyberScryb LLC)
**Stack:** Firebase Hosting + Cloud Functions + Cloudflare CDN, vanilla JS, no build step
**Goal:** Traffic + revenue. Owner is in financial hardship — every decision should serve that.

### What the site is
- 38+ tools: developer utilities, AI writing tools, and **Life Tools** (hardship letters, appeal letters, custody docs, caregiver reports)
- 21 SEO guides, blog section (currently empty — fake posts were deleted)
- AdSense on every page (publisher ID active, re-review submitted ~May 14 2026 after denial for low-quality content — site was fully overhauled, awaiting approval), affiliate panels on select tools, email gate on AI tools, Pro tier buttons (Stripe not wired up yet)
- Cloudflare AI chatbot on every page

### Brand voice (CRITICAL)
Direct. No-BS. Short sentences. Like texting a smart friend. Use contractions. Use "you" and "your". Slightly confrontational when warranted. No corporate speak. No fluff.

**Never use AI-slop words:** leverage, utilize, delve, tapestry, landscape, foster, moreover, furthermore, cutting-edge, game-changer, revolutionary, robust, seamless, innovative, empower, holistic, synergy, unlock, harness, thin, elevate, pivotal, nuanced

---

## CRITICAL IDs & CREDENTIALS

| Thing | Value |
|---|---|
| Firebase project ID | `gen-lang-client-0384486156` |
| Google Analytics 4 | `G-73LQZEDNR6` |
| Google AdSense | `ca-pub-5721233331247292` |
| Cloudflare AI chatbot | `722da820-be39-4721-bc14-4e498d45d78b.search.ai.cloudflare.com` |
| Google Search Console | `40UhuvQCBj2dtn1E2FNte0dCBASfDc91zI-FTjEKQ24` |
| Dev branch | `claude/edit-cyberscryb-website-p3pnz` (but currently pushing to `main`) |

**AI model in use:** `gemini-3.1-pro-preview` (all AI tools). **CRITICAL: Must use the `-preview` suffix.** Gemini 3.1 Pro is in preview status as of April 2026 — the stable name `gemini-3.1-pro` does NOT exist and returns 404 from Google API. User has $10 prepaid + $100 cap on Google Cloud billing.

---

## DEPLOYMENT (the thing that's burned the most time)

### Auto-deploy is active
GitHub Actions workflow at `.github/workflows/deploy.yml` deploys BOTH hosting AND functions on every push to `main`. This was broken until 2026-04-14 — it only deployed hosting. Now it deploys both.

### To trigger a deploy:
1. `git add -A && git commit -m "..." && git push origin main`
2. Check status at `github.com/CyberScryb/cyberscryb/actions`
3. Auto-deploys in 3-5 min

### If you need to manually deploy from Nate's PowerShell:
```
cd cyberscryb
git pull origin main
npx firebase deploy --project gen-lang-client-0384486156
```
(Omit `--token` flag — local login is already saved.)

### You CANNOT deploy from the Claude Code web environment
Google Cloud API returns **403 Forbidden** to requests from this environment. Don't waste time trying. Either use GitHub Actions or have Nate deploy locally.

---

## CRITICAL TECHNICAL RULES

### 1. `firebase.json` uses `trailingSlash: true` + `cleanUrls: true`
This means URLs become `/tools/foo/` (with slash). **Root-level pages (tools.html, about.html, etc.) MUST use absolute paths** for CSS/JS/favicon or they'll 404:
- ✅ `/css/style.css`, `/js/script.js`, `/favicon.svg`
- ❌ `css/style.css`, `js/script.js`, `favicon.svg`

Tool pages in subdirectories can use `../../css/style.css` because they're 2 levels deep.

### 2. Cloud Functions need their own deploy
`firebase deploy --only hosting` does NOT deploy new AI prompts in `functions/index.js`. The GitHub Actions workflow now deploys both, but if you're debugging why a new AI tool returns "Something went wrong" — it's almost always because functions weren't deployed.

### 3. `functions/` directory needs `npm install` before deploy
Missing `firebase-functions` package causes deploy errors. GitHub Actions now runs `npm install` in `./functions` automatically.

### 4. GA4 measurement ID must be `G-73LQZEDNR6`
The correct property is `G-73LQZEDNR6`. The other ID `G-Z347WYM5ZZ` is a different property — do not use it.

### 5. Cloudflare OWASP Core Ruleset
Nate has it enabled. It CAN block legitimate tool usage (pasting JSON, code, etc. can trigger it). If users report random blocks, suggest turning it off — but he decided to leave it on.

### 6. Cloudflare challenge loop on dash.cloudflare.com
Nate's PC had this issue caused by NextDNS filtering Turnstile. Phone works fine. Not a site issue.

### 7. Performance optimizations in place (don't undo them)
- AdSense deferred 2.5s or until first user interaction
- GA4 deferred 1.5s after load
- Google Fonts load async via `<link rel="preload" ... onload=...>`
- Don't add blocking third-party scripts to `<head>`

---

## CONTENT RULES (content mistakes have been the most painful)

### NEVER
- **Never fabricate a founder story** — the fake "why-i-built-cyberscryb.html" was deleted. Don't recreate.
- **Never make up stats or numbers** — if you don't know, say "a lot" or skip it. Don't invent "73% of developers..."
- **Never use outdated model names** — check current Claude, Gemini, GPT versions via WebSearch before mentioning them.
- **Never write blog content without WebSearch first** — always verify current facts, prices, competitor info before writing.

### ALWAYS
- **WebSearch before writing blog posts** — models, prices, stats, competitors change fast.
- **Use Nate's real voice** — direct, no-BS, short sentences. Writing that reads like AI is worse than no writing.
- **Cite current info** — date-stamped facts (e.g., "as of April 2026") are better than undated claims.

### Current model landscape (April 2026 — verify before writing about)
- Claude Opus 4.6 (released Feb 5, 2026)
- GPT-5.4 (released March 5, 2026)
- Gemini 3.1 Pro (released Feb 2026)
- Claude Sonnet 4.6, GPT-5.3-Codex, Gemini 2.5 Pro/Flash

### Blog posts are CURRENTLY DELETED
All 8 original posts were AI slop with outdated info. Starting fresh with real research required.

---

## SITE STRUCTURE

```
public/
├── index.html              # Homepage (uses absolute paths)
├── tools.html              # All tools listing (uses absolute paths)
├── about.html, contact.html, privacy.html, terms.html, disclosure.html, 404.html
├── css/style.css           # Global styles, unified button system
├── js/script.js            # Global scripts + Cloudflare chatbot loader
├── favicon.svg, og-image.svg, robots.txt, sitemap.xml, feed.xml
├── tools/
│   ├── {tool-name}/
│   │   ├── index.html      # Uses ../../css/style.css
│   │   └── {tool-name}.js or script.js
│   └── shared/
│       ├── ai-tool.js          # Shared AI tool core (CSAITool.init)
│       ├── ai-tool.css         # AI tool styles
│       ├── affiliate-panel.js  # Contextual affiliate recommendations
│       └── email-capture.js    # Email capture bar
├── blog/
│   └── index.html          # (All blog posts deleted — need to write new ones)
└── guides/                 # 21 SEO guide pages (generated by generate-pages.js)

functions/
└── index.js                # Cloud Functions: rewriteText, generateGigWork, generateAI, subscribeEmail
                            # AI_PROMPTS object has 14 tool prompts

.github/workflows/
└── deploy.yml              # Auto-deploys hosting + functions on push to main

firebase.json               # trailingSlash:true, cleanUrls:true
.firebaserc                 # { "default": "gen-lang-client-0384486156" }
generate-pages.js           # Generates SEO guide pages
```

### AI tools follow the summarizer pattern
Use `public/tools/summarizer/index.html` + `summarizer.js` as the template for any new AI tool:
- Deferred AdSense/GA4 in head
- Two-panel layout (input left, output right)
- Email gate overlay via `../shared/ai-tool.js` `CSAITool.init()`
- Breadcrumbs, navbar with Blog link, footer
- Schema.org SoftwareApplication + BreadcrumbList JSON-LD
- 2 AdSense units, Related Tools section, FAQ with 5 questions

### Adding a new AI tool
1. Add prompt to `AI_PROMPTS` in `functions/index.js` with `toolId` key
2. Create `public/tools/{tool-id}/index.html` following summarizer template
3. Create `public/tools/{tool-id}/{tool-id}.js` calling `CSAITool.init({toolId: ...})`
4. Add to `public/tools.html` tool grid
5. Add to `public/sitemap.xml`
6. Add option to homepage dropdown in `public/index.html`
7. Push to main — auto-deploys hosting + functions

---

## STRATEGIC RULES

### What CyberScryb is differentiating on
The dev tools space (JSON converter, Base64, password checker, AI humanizer) is SATURATED. Competing there is losing.

**The differentiator: "Life Tools"** — AI-powered tools for real life situations where no good free tool exists:
- Hardship letters (mortgage, medical, immigration, student loans)
- Appeal letters (unemployment, insurance, housing)
- Custody documents (parenting plans, declarations)
- Caregiver shift reports

These target audiences that generic dev tool sites don't reach: caregivers (53M in US), co-parents in custody situations, people in financial hardship. Low competition, high demand, built from Nate's lived experience (former CNA, dealt with custody, currently in hardship).

### Distribution is the bottleneck
Building more tools won't move the needle alone. The site has 3,000+ unique visitors/month (as of May 2026). Getting TRAFFIC is the blocker. Options:
- Reddit posts (niche subreddits for each tool)
- Product Hunt launch
- Dev.to articles
- Hacker News Show HN
- Organic SEO (takes 2-12 weeks to rank)

### Don't suggest more of the same genre
If asked for expansion ideas, don't keep suggesting tools in the same genre the site already has. Look for different audiences and lived-experience niches.

---

## WORKING STYLE RULES

### Voice when responding to Nate
- Direct. Don't hedge.
- If I'm wrong, I'm wrong. Admit it. Don't defend.
- Don't use filler words or corporate hedging.
- Short sentences > long ones.

### Before stating facts
- WebSearch first if the claim is time-sensitive (prices, versions, stats, features)
- Don't dismiss something Nate says just because I don't recognize it — look it up
- My knowledge cutoff is behind current date — assume I'm outdated on anything post-May 2025

### When making mistakes
- Acknowledge them directly. Don't explain them away.
- Fix the mistake. Don't just apologize.
- If the same pattern happens twice, add a rule to this file.

### Commit discipline
- Always commit and push after meaningful work (triggers auto-deploy)
- Use descriptive commit messages with context
- If a commit is blocked by hooks, fix the issue — don't bypass with `--no-verify`

### Never leave Nate work I can do myself
- Nate is paying for Claude. The point is to take work off his plate, not generate todo lists.
- Before asking Nate to do something, check whether I have an MCP/tool to do it myself:
  - **Stripe products / prices / payment links** → `mcp__fce2083b-...` (create_product, create_price, create_payment_link, list_products, list_prices, etc.)
  - **GitHub issues / PRs / actions** → `gh` CLI via Bash
  - **Firebase deploys** → push to main, GitHub Actions handles it
  - **File edits, refactors, content writes** → Edit/Write tools
  - **WebSearch / WebFetch** for any time-sensitive fact
- If a connector is disconnected/expired, say so explicitly and ask him to reconnect — don't pretend I can't do the task.
- Only ask Nate to do something himself when it's *genuinely* blocked: a password he needs to type, a billing decision only he can make, a creative direction call, or a security-sensitive action Claude is prohibited from (per system prompt: bank data, ID data, creating accounts, modifying access controls).
- "I need X from you" is the last resort, not the first.

### When launching parallel agents
- Agents time out on long tasks — keep scope focused per agent
- Blog posts with WebSearch + 1000+ word output TEND to time out. Break into smaller chunks.
- Commit after each agent completes, not at the end

---

## OPEN TODOS / UNFINISHED WORK

1. **Blog posts:** All 8 deleted. Need new ones written with research. Topics to consider:
   - "Life Happens: Why I Built CyberScryb's Life Tools" (Life Tools spotlight, NOT fake founder story)
   - Honest AI tool comparisons (current models)
   - Guides for the 4 Life Tools (hardship letter examples, appeal letter strategies, etc.)
2. **Stripe payment links:** WIRED but products charge the WRONG price. Current Stripe products are $9/mo and $29 lifetime. Site copy advertises $5/mo and $29/yr (the intended price). Need to create new Stripe products at $5/mo recurring and $29/yr recurring, then swap the URLs in `public/js/cs-pro-widget.js` (STRIPE_MONTHLY, STRIPE_LIFETIME — rename to STRIPE_ANNUAL) and `public/pro.html` (2 button hrefs + 2 schema.org offer urls). Use the Stripe MCP to do this — don't hand it back to Nate.
3. **Affiliate programs:** Affiliate panel has placeholder URLs. Need real links after Nate applies to CJ Affiliate, Impact, etc.
4. **Usage counter:** Backend has 9 AI prompts but no Firestore counter or `/api/stats` endpoint yet.
5. **OWASP ruleset:** User-aware, decided to leave on.

---

## HISTORICAL MISTAKES (don't repeat)

| Mistake | What to do instead |
|---|---|
| Claimed Gemini 3.1 Pro didn't exist | WebSearch when user mentions an unfamiliar version |
| Used outdated model names in blog content | WebSearch current model versions before writing |
| Made up AdSense RPM estimates ($1-5 instead of $5-15+ for tech) | WebSearch current niche CPMs before quoting |
| Got DigitalOcean affiliate structure wrong | WebSearch affiliate terms before quoting payouts |
| GitHub Actions only deployed hosting | Workflow now deploys both hosting + functions |
| Root-level pages broke with trailingSlash:true | Use absolute paths for root pages |
| Made relative paths from Google Fonts preload | `../css/style.css` for blog/, absolute for root |
| Created fake founder story | NEVER fabricate personal history |
| Wrote AI-slop blog content | Use banned word list, write in Nate's direct voice |
| Suggested more of the same genre when asked to expand | Think about different audiences and lived experience |
| Didn't check AdSense approval before assuming ads show | Ads take 24-72h after approval to serve |
| Kept trying to deploy from Claude Code web env | It's blocked by Google — use GitHub Actions or local |
| Used `gemini-3.1-pro` as model name (wrong) | Correct name is `gemini-3.1-pro-preview` — the model is in preview |
| Cloud Function returned plain text errors, frontend tried to JSON.parse | ALL error responses must use `res.status(N).json({ error: '...' })` never `res.send()` |
| Used `referer.includes('cyberscryb.com')` for security check | Use `new URL(referer).hostname` against allowlist — string.includes is bypassable via query params |
| Used `Math.random()` in password generator | Use `crypto.getRandomValues()` for anything security-related |
| Edited blog post pricing to match an audit report without verifying the actual Stripe products | Always verify against the source of truth (Stripe API via MCP) before editing pricing/product copy |
| Told Nate "you need to create Stripe products" when the Stripe MCP was available to do it myself | Check for an MCP tool first. Only ask Nate for something a connected tool can't do. |
| Assumed Stripe was "still going to `#`" because `CLAUDE.md` said so, without checking the live site | Stale notes in CLAUDE.md aren't truth. Grep the actual codebase or hit the live URL when the fact is verifiable. |
| Defended the current dated cyberpunk aesthetic when Nate said v2 (Vercel/Raycast/Perplexity style) looked sharper | Nate's design instincts are usually right. Concede the aesthetic argument fast and focus on *how to ship it safely*, not whether to. |

---

## BUILD THIS FILE OVER TIME

Every time a new mistake happens or a new rule emerges, add it here. This file is the project's institutional memory.

---

## POST-CHANGE AUDIT REQUIREMENT (MANDATORY)

**After ANY change to the site (tools, content, design, config), run a multi-agent audit.** Do not consider work "done" until the audit runs.

### Audit workflow (launch in parallel via Agent tool)

**Agent 1 — Broken Things Audit:**
- Check every page modified or added for: missing CSS links, missing JS links, broken `href` paths, 404s
- Verify nav includes Blog link on all tool pages
- Verify deferred AdSense + GA4 loaders present
- Check for Schema.org JSON-LD on tool pages (SoftwareApplication)
- Check for trailing slash issues (root pages must use `/css/style.css`, not relative)
- Test that any new AI tool's `toolId` matches a key in `AI_PROMPTS` in `functions/index.js`
- Verify `/api/ai-generate`, `/api/rewrite`, `/api/subscribe` rewrites in `firebase.json`
- Look for leftover placeholder text, TODO comments, or broken images

**Agent 2 — Value Improvement Opportunities:**
- What's missing that could drive traffic? (new tools, missing guides, missing internal links)
- What's underperforming? (old meta descriptions, thin content, weak CTAs)
- What could convert better? (email gates, Pro upsells, affiliate panels)
- Are there audience segments we're missing? (specifically for Life Tools — caregivers, co-parents, hardship)
- Suggest 5-10 specific improvements ranked by impact

**Agent 3 — Consistency Check:**
- Are all tool cards in tools.html linked correctly?
- Does the homepage dropdown include every new tool?
- Is the sitemap.xml up to date?
- Are meta descriptions consistent length (120-160 chars)?
- Are og:image tags present on every page?
- Any pages still using outdated model names, old GA4 ID, or fake content?

### After audit:
1. Present findings to user with CRITICAL / WARNING / INFO priority
2. Fix CRITICAL issues immediately
3. Add WARNING items to a running TODO list
4. Save INFO suggestions for future improvement rounds

### Never skip this. Every time.
