# Humanizer conversion design decisions (2026-07-19)

Every choice below is judged only on: **does this make a stranger more likely to try the tool and pay for Pro?**

## 1. Single column (input → action → output), not side-by-side

**Choice:** Stack full-width: Original → modes + Humanize → Result.

**Why (conversion):**
- Writing tools that monetize (QuillBot, Grammarly, Wordtune) use a **linear “paste → process → get text”** flow. Matching category expectations reduces bounce.
- Side-by-side forces constant eye travel and shrinks each pane; long AI dumps need **vertical reading width**.
- Paywall sits **on the result** after the user already invested (time + paste). That sequencing uses the same logic as freemium “value first, then gate” — not a pricing wall before value.

**Rejected:** Fancy multi-column dashboard chrome (looks “product-y” but slows first success).

## 2. Light editor surface (not full-site rebrand)

**Choice:** Humanizer workspace is **light** (near-white editors, dark text). Site nav can stay as-is for now.

**Why (conversion):**
- Category leaders for *writing/rewrite* are light. Dark cyber UI signals “dev toy,” not “I trust this with client copy.”
- Payment friction drops when the UI looks like software people already pay for (SaaS norms: Stripe, Notion docs, Grammarly).
- Body text contrast on light surfaces is easier for long paste/review (fewer abandonments mid-task).

**Rejected now:** Repainting the entire CyberScryb homepage/tools park.
- **Why not:** Zero A/B data; free-tool SEO pages are a different job (scan/use/leave). Recoloring 40 pages burns time without evidence it creates Pro buyers.
- **When to reconsider:** After Humanizer has checkout clicks and we can A/B home separately.

## 3. Keep violet/purple as the only strong accent (don’t invent a new brand palette)

**Choice:** Primary CTA stays high-contrast **violet → white text**. Neutrals are slate/gray on white.

**Why (conversion):**
- One accent = one obvious “do this next” (Humanize / Go Pro). Competing neon cyan+red+purple splits attention (classic conversion anti-pattern: multiple equal CTAs).
- Brand recognition already uses purple on Pro; changing rainbow colors mid-funnel confuses “is this the same product I almost bought?”
- WCAG: purple buttons with white text can pass contrast; neon-on-black often fails readability.

**Rejected:** Orange “buy” buttons sitewide without testing (can work, but unproven here and breaks continuity with existing Pro/Stripe pages).

## 4. Mode chips only if they change the real API

**Choice:** Three chips — **Natural**, **Professional**, **Shorter** — each sets a different `style` string sent to `/api/rewrite`.

**Why (conversion):**
- QuillBot-like modes increase “this is a real product” perception (completeness heuristic).
- Fake modes that do nothing destroy trust when users notice — trust loss kills pay.

**Rejected:** 8 decorative tones with no backend difference.

## 5. What we deliberately do *not* change yet

| Idea | Why not now |
|------|-------------|
| Sitewide light theme | No evidence free-tool traffic pays more; risk to brand consistency across SEO pages |
| One-time price > monthly | Already rejected; hurts perceived fairness |
| Heavy illustration/mascot in editor | Competes with the text task; writing tools win with whitespace |
| More SEO text above the tool | Delays first paste → fewer tool_used → fewer paywalls |

## Success metrics (only these)

1. `tool_used` on humanizer  
2. `paywall_shown`  
3. `pro_checkout_click`  
4. Non-self Stripe payment  

If (1)↑ but (3) flat → offer/trust. If (1) flat → traffic/layout still blocking try.
