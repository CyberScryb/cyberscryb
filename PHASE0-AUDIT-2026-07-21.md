# CyberScryb.com — Rebuild Phase 0 Baseline Audit
*Run 2026-07-21, against `main` @ 17ee583, live cyberscryb.com. Per `Rebuild.CLAUDE.md`: this is the mandatory pre-Phase-1 gate. No design/code changes made — findings only.*

## P0 items from the brief — status

| # | Brief's ask | Status |
|---|---|---|
| 1 | Verify/fix `/pro/` pricing + Stripe discrepancy | **Already fixed, verified clean.** See §1. |
| 2 | Fix `tool_use`/`tool_used` analytics split | **Confirmed real, root-caused.** Not yet fixed. See §2. |
| 3 | One tool count, one price, templated | **Price: clean. Tool count: still 3-way split.** See §3. |
| 4 | One canonical nav component | **Largely clean** (Products link fully removed, Curator Prime present broadly) — not exhaustively verified page-by-page. See §4. |
| 5 | Scope/remove "data never leaves browser" claim per tool | **One confirmed violation** (about.html), one to verify (voice-writer). See §5. |
| 6 | Full technical + search baseline | **Technical: done. Search (Ahrefs/Semrush): blocked this session.** See §6, §7. |

---

## 1. `/pro/` pricing — the brief's "don't wait for Phase 1" item is a non-issue now

Checked copy (repo source + live page via rendered browser, not just cache) and the actual Stripe objects behind both checkout links:

- **Lifetime** (`buy.stripe.com/eVq6oJ7eucX4aupaRn0sU08`): Stripe `type: "one_time"`, `unit_amount: 2900`, `recurring: null`. Genuinely a one-time $29 charge.
- **Monthly** (`buy.stripe.com/fZu4gBbuKg9geKFaRn0sU0b`): Stripe `type: "recurring"`, `unit_amount: 500`, `interval: "month"`. Genuinely a $5/mo subscription.
- Grepped every `buy.stripe.com` reference in `public/` (13 occurrences across pro.html, cs-pro-widget.js, gig-auto-pilot.js, humanizer.js, ai-tool.js) — all 13 point at these same two correct links. No stray annual link anywhere on `/pro/` or elsewhere.
- Title/meta/H1 all say $5/mo or $29 lifetime — no "$29/year" anywhere, live or in source.

**Read:** the outside review that produced the brief's flagged issue predates commit `444c7d3` ("fix(pricing): unify Pro as $5/mo or $29 lifetime site-wide"). It's stale. No action needed. Only oddity: 3 other Stripe Payment Links exist with `subscription_data` set (recurring) that aren't referenced anywhere in the repo — dead links sitting in the Stripe dashboard, harmless but worth deleting for hygiene.

## 2. `tool_use` vs `tool_used` — confirmed, precisely root-caused

Two disconnected analytics code paths fire under different event names:

- **14 standalone dev-tool pages** (case-converter, cron-builder, epoch-converter, hash-generator, html-entity, jwt-decoder, lorem-ipsum, qr-generator, regex-tester, slug-generator, text-diff, url-encoder, uuid-generator, word-counter) call `gtag('event', 'tool_use', {...})` **directly**, bypassing the site's own tracking wrapper entirely — so these also skip the `ga-disable-G-LS46B9J1XK` opt-out check that the wrapper enforces.
- **The AI-tool framework** (`ai-tool.js`, `humanizer.js` — covers Humanizer, Gig Auto-Pilot, hardship/appeal/custody tools, etc.) calls `trackEvent('tool_used', {...})` through `script.js`'s wrapper, which is the documented convention (`// GA4: tool_used, email_captured, result_copied, pro_checkout_click, paywall_shown`).

Net effect: any GA4 report or "most popular tool" calculation filtered on one event name silently misses the other half of the site. Bug exists identically in both `public/` and `content-site/` trees. **Fix is mechanical** — rename the 14 raw `gtag()` calls to route through `trackEvent('tool_used', ...)` like everything else (also gets them the consent-opt-out check for free). Recommend doing this before trusting any "most popular tool" claim, per the brief's own instruction.

## 3. Tool count — confirmed 3-way split, here's the real number

- `index.html` (×4: meta description, hero copy, proof stat, H2) and `about.html` and one blog post say **"40+"**
- `tools.html` search placeholder says **"50+"**
- `pro.html`'s schema.org `Product` description says **"29+"**
- Actual count: **51 tool directories** under `public/tools/`.

Recommend: pick "51" (or round to "50+" if you don't want to re-template every time a tool ships), source it from one place (a build-time constant `generate-pages.js` could inject), stop hardcoding it per-page.

## 4. Nav consistency

- `>Products<` nav link: **0 matches anywhere in `public/`.** Cleanly removed — matches the `e6a757c` commit. `/products/` itself 301s (not 404), so no dead link either way.
- "Curator Prime": present on at least about/tools/privacy/terms/distill-privacy (footer, presumably). Didn't exhaustively diff nav markup across all 117 pages — if you want the literal "one shared component, byte-identical everywhere" verified, that's a Phase 1 task anyway since it's the actual fix, not just the audit.

## 5. "Never leaves your browser" / privacy-first claims

- **Confirmed violation:** `about.html:157` — *"Everything runs client-side in your browser. I do not see your inputs."* This is a blanket, page-wide claim on the About/trust page. It's false for every AI tool (Humanizer, Gig Auto-Pilot, AI Detector, hardship/appeal/custody generators, etc.) — those route through the Cloudflare Worker (`cloudflare-worker/worker.js`) to either Cloudflare Workers AI or Firebase Functions → Gemini, which is inherently server-side. This is the highest-visibility instance since About is a trust page, not a tool page.
- **To verify, not confirmed:** `voice-writer/index.html:450` says *"Privacy-first — nothing is stored"* — narrower claim than "never leaves your browser" (not-stored ≠ not-transmitted), so it may be technically accurate depending on whether voice-writer's backend persists anything. Didn't read voice-writer's JS to confirm; flag for Phase 1.
- The dev-tool pages that legitimately run 100% client-side (password-checker, word-counter, url-encoder, uuid-generator, etc. — confirmed no server call in their JS) are fine keeping the claim.
- `js/script.js`'s shared footer ("Free, privacy-first developer tools.") templates onto 51 pages including AI-tool-adjacent static pages — worth a one-word gut check on whether "developer tools" framing undersells the Life Tools / AI writing side, but that's a positioning call for Phase 1, not a factual-accuracy issue like the above.

## 6. Technical baseline

**Full crawl (actually run, not sampled):** fetched live `sitemap.xml` (95 URLs), curled every single one. **95/95 return 200.** Zero broken links, zero redirect hops in the sitemap.

**Canonical tags:** checked every HTML file in `public/` for a canonical tag pointing at `https://cyberscryb.com`. 100% clean — the only file with no canonical is `google0a31a4bf6dd0cebf.html` (Google Search Console site-verification file, correctly has none).

**robots.txt — the finding that matters most for your stated 2026 strategy:**
```
Content-Signal: search=yes,ai-train=no,use=reference
Disallow: / for Amazonbot, Applebot-Extended, Bytespider, CCBot, ClaudeBot,
          CloudflareBrowserRenderingCrawler, Google-Extended, GPTBot, meta-externalagent
```
This is Cloudflare's managed "AI Crawl Control," not something in this repo — it's set at the Cloudflare dashboard level. **It blocks ClaudeBot and GPTBot from crawling the site at all.** Your own `CLAUDE.md` cites "ChatGPT/Claude cite Reddit at 7% conversion vs Google's 5%" as part of the growth strategy, and the site already ships an `llms.txt` clearly intending to be AI-discoverable — but the crawlers that would need to fetch pages to cite them in ChatGPT/Claude answers are currently blocked at the edge. This also explains a 403 I hit earlier this session using an automated fetch tool against `/pro/` (plain curl with a browser UA got 200 fine — it's fingerprint/ASN-based bot detection, not a UA string check). **This needs your explicit call, not mine** — it's a legitimate deliberate choice for a lot of site owners (stops your content training competitors' models), but it directly conflicts with citing-engine visibility if that's a channel you want. Search indexing itself (`search=yes`) is unaffected either way.

**Core Web Vitals / Lighthouse accessibility:** PageSpeed Insights keyless API is rate-limited in this environment (429 on every request) — same wall a prior session hit. Last known number: **mobile Performance = 45**, captured *before* the `defer` fix that shipped 2026-06-27 (script.js was render-blocking on 27 pages; now deferred). No fresh score exists to confirm the lift. A rough in-browser proxy on the homepage only: TTFB 390ms, DOMContentLoaded 574ms, load 745ms, 8KB transfer — fast, but this is a single data-center fetch, not 75th-percentile real-user Chrome data, so treat it as a sanity check, not a CWV number. **Need either a PSI API key or you running Lighthouse locally to get real per-template numbers before Phase 1 commits to a performance floor.**

**Accessibility labeling:** the 16 pages using the shared AI-tool template (hardship-letter, appeal-letter, custody-document, caregiver-report, bio-generator, email-writer, product-description, paraphraser, meta-description, resume-bullets, summarizer, tweet-generator, ai-detector, voice-writer, budget-planner, code-explainer) all have proper `<label>`/`aria-labelledby` wiring on their main input — that part's clean. The 2026-06-27 session hand-fixed 3 of the ~20 standalone dev-tool pages (password-checker, json-csv-converter, base64-tool) and explicitly noted the rest as a follow-up ("grep `placeholder=` without a paired `<label>` across all 51 tools") that never happened. No shared input-ID convention across those dev tools, so each needs individual review — budget for it in Phase 1's accessibility pass. Also: homepage's one `<img>` (`mascot-icon.webp`) has no `alt` text.

**Analytics:** `G-LS46B9J1XK` is the only GA4 ID in `public/` (confirmed clean, matches the 2026-05-30 fix holding). No trace of the stray `G-Z347WYM5ZZ` Connected Site Tag in code — still a GA4-Admin-side cleanup, not a repo issue.

## 7. Search baseline — blocked this session, need your action

Both connected data sources refused to serve data:
- **Semrush:** "active subscription, but does not have enough API units." → semrush.com/mcp-access
- **Ahrefs:** every endpoint (domain rating, site metrics, top pages, even the GSC bridge) returned `"Insufficient plan"` — the connected plan tier doesn't cover Site Explorer API access.

Per the brief's own fallback: **please export directly from GSC** (or top up/upgrade whichever of Ahrefs/Semrush you'd rather use) — top 50 pages by traffic with keyword+position, DR/authority trend, top referring domains, indexed-vs-live page count. I can't respond to a `site:cyberscryb.com` search query with real coverage numbers (that's a curated web-search API, not Google's actual index — not reliable enough to report as a finding, so I didn't).

## 8. Brand voice guide — doesn't actually exist yet

Searched Notion per the brief's instruction. Found a page literally titled "Tone & Voice" under Design System → Startup in a Box — it's an **unfilled Notion template**: *"This is sample content that you can replace with your own... At Acme Corp, we always speak in a way that reflects our brand..."* Nobody has written CyberScryb's actual voice guide. Phase 1 will need to either reverse-engineer the voice that's already working in the shipped copy (plain-English, confident, no-fluff — e.g. pro.html's FAQ answers, about.html's founder story) or you write one from scratch. Don't let Phase 1 stall waiting for a document that isn't coming.

## 9. One thing outside the brief's checklist, flagged because your own CLAUDE.md calls this pattern a failure

`privacy-check.html` — orphan page, legacy styling, not in sitemap, unlinked — has been "OPEN DECISION: promote vs. noindex/delete" across at least three prior sessions (2026-06-01, referenced again 2026-06-27) without resolution. Your CLAUDE.md: *"If the same issue appears in two consecutive sessions without being resolved, that's a failure."* This is now three. **Pick one now:** noindex+leave it, or delete it, or tell me to promote it into the real IA. I didn't touch it — genuinely your call, not a technical question — but it shouldn't ride into Phase 1 unresolved a fourth time.

---

## What I did NOT do (by design)
No design tokens, no code changes, no deploys, no branch created — this is the audit only, per the brief's explicit gate. `Rebuild.CLAUDE.md` stays as its own file; I didn't overwrite `CLAUDE.md` since it holds operational memory (IDs, deploy protocol, asset map) this brief doesn't cover — added a pointer instead so future sessions find both.

## Recommended immediate action items (cheap, don't need Phase 1 design work)
1. Fix the `tool_use`/`tool_used` split (§2) — mechanical, ~14 line changes, unblocks trustworthy usage data before any "most popular" homepage decision.
2. Decide the AI-crawler-blocking question (§6) — one Cloudflare dashboard toggle, but it's a strategy call only you can make.
3. Fix `about.html`'s privacy claim (§5) — one sentence, real liability as written.
4. Pick a tool count and template it (§3).
5. Resolve `privacy-check.html` (§9) — three-session-old decision.
6. Get me a PSI API key, or run Lighthouse locally, so Phase 1 has a real performance floor instead of a 45 from before the last fix.
7. Top up Ahrefs or Semrush (or export GSC manually) so Phase 1's SEO-preservation protocol has real numbers to protect.

**Waiting on your review before Phase 1 starts, per the brief.**
