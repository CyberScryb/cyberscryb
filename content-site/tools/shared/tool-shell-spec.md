# CyberScryb Tool Shell — Canonical Spec

Status: **spec only** — nothing in this repo has been rewritten to match it yet. This document
defines the target shape. Applying it to live tool pages (humanizer, hardship-letter,
json-csv-converter, password-checker, and the other ~50 tool pages) is a separate, later pass.

Scope of the audit behind this spec: `public/tools/humanizer/index.html`,
`public/tools/hardship-letter/index.html`, `public/tools/json-csv-converter/index.html`,
`public/tools/password-checker/index.html`, plus their JS/CSS
(`humanizer.js`, `hardship-letter.js`, `tools/shared/ai-tool.js`, `tools/shared/ai-tool.css`,
`json-csv-converter/script.js`, `password-checker/script.js`, `humanizer/style.css`,
`humanizer/DECISIONS.md`).

---

## 1. Audit — what's actually inconsistent today

This is evidence from reading the four pages side by side, not a general impression. Every
claim below points at a real file.

### 1.1 Layout / markup

|                      | Humanizer                                                                                                                    | Hardship Letter                                                                                                                                                                                                                                              | JSON↔CSV                                                                                          | Password Checker                                                                                |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Structure            | Single column: input pane → action bar (mode chips + CTA) → output pane. Deliberate choice, see `humanizer/DECISIONS.md` §1. | Two-column: `.humanizer-container` > `.input-panel` + `.output-panel` side by side.                                                                                                                                                                          | Two-column: `.panels` > `.panel.input-panel` + `.convert-section` + `.panel.output-panel`.        | Single card, no input/output split — it's live analysis of one field, not a transform.          |
| CSS source of layout | Real classes in `/tools/humanizer/style.css` (`.hz-shell`, `.hz-workspace`, `.hz-pane`, etc.)                                | **Almost entirely inline `style="..."` attributes.** The semantic classes it uses (`.panel`, `.input-panel`, `.output-panel`, `.humanizer-container`, `.step-badge`, `.icon-btn`, `.stats-bar`) are not styled by anything the page loads — see 1.1.1 below. | Dedicated `/tools/json-csv-converter/style.css`, self-consistent, not shared with any other tool. | Dedicated `/tools/password-checker/style.css`, self-consistent, not shared with any other tool. |

**1.1.1 — Orphaned shared stylesheet (concrete bug, not just "inconsistency").**
`public/tools/shared/ai-tool.css` exists, defines `.panel`, `.panel-header`, `.step-badge`,
`.output-wrapper`, `.output-content`, `.icon-btn`, `.stats-bar`, `#loading-indicator`,
`.email-gate*`, `#upgrade-tiers`, `.faq-section` — and its own header comment claims it's
"used by summarizer, email-writer, bio-generator, code-explainer, product-description." It is
**not `<link>`ed by any of those pages, nor by hardship-letter**, which uses the identical class
vocabulary. Even if it were linked, its grid class is named `.ai-tool-container` while every
page that would use it writes `.humanizer-container` in the markup — the names don't match, so
the two-column grid rule (`grid-template-columns: 1fr 1fr`) would never apply. Net effect:
hardship-letter's entire panel chrome (backgrounds, borders, radii, button gradient, pricing
cards, FAQ box) is hand-duplicated inline, one tool page at a time, approximating what
`ai-tool.css` already expresses once. That's the actual mechanism behind "per-tool
improvisation" — there's a shared system on disk, it's just disconnected.

### 1.2 Loading state

All four pages currently do one of two things, and neither is designed:

- **Humanizer / hardship-letter** (`.hz-loading` / `#loading-indicator`): an absolute-position
  overlay, near-opaque dark background, a CSS spinner, and **one static line of text**
  (`"Working…"` on humanizer, `"Drafting your letter with Gemini 3.1 Pro..."` on hardship-letter).
  The text never changes for the duration of the call — a 1s response and an 8s response render
  identically. No skeleton, no progress signal, no streaming.
- **JSON↔CSV / password-checker**: no loading state at all, because both are synchronous
  client-side operations. JSON↔CSV invented a one-off substitute — a `.converting` class that
  disables pointer events and flashes a green `box-shadow` on the button for 600ms
  (`json-csv-converter/script.js` `convert()`) — rather than reusing any shared concept.
  Password-checker needs nothing; it re-analyzes on every keystroke.

Result: three different "in-progress" treatments across four pages, none of which communicate
real progress, and the two AI tools — the ones with actual multi-second network latency — have
the least informative one.

### 1.3 Error state

- **Humanizer** (`humanizer.js`, `catch` block): on fetch failure, replaces the output pane's
  contents with `<span style="color:#B91C1C;">Error: ...</span>`. Plain text, no container, no
  icon, no retry action. `showResultActions(false)` also hides the "Run again" button on error,
  so there is no recovery affordance at all — the user has to notice the red text and manually
  re-trigger Humanize.
- **Hardship-letter** (via shared `tools/shared/ai-tool.js`, `catch` block): same pattern,
  different hardcoded color: `<span style="color:#ef4444;">...</span>`. **This is a real,
  measurable color drift** — humanizer's red (`#B91C1C`) is the site's actual `--danger` token
  (defined in `public/css/style.css`); hardship-letter's red (`#ef4444`) matches no token
  anywhere in the codebase. Two tools, two reds, neither chosen on purpose to differ.
- Both tools also fall back to a **native `alert()`** for two specific cases: empty input
  (`ai-tool.js` line ~347: `alert(config.emptyMessage || 'Please provide some input.')`) and
  over-the-free-character-limit (`ai-tool.js` and `humanizer.js` both call `alert(...)` directly).
  Humanizer's own `runHumanize()` handles _empty_ input better than the shared core does — it
  shakes/highlights the textarea (`.input-error` class) instead of alerting — but still uses a
  blocking `alert()` for the char-limit case.
- **JSON↔CSV** has the best-designed error of the four: a dedicated `.error-bar` component with
  an icon, message, slide-in animation, and a tinted background box (`json-csv-converter/style.css`
  lines ~481–497). It just happens to be on the tool with the lowest-stakes failure mode (bad
  JSON paste), while the tools where a real API/network failure can happen have the weakest
  treatment.
- **Password-checker** has no error state — nothing async can fail.

Also worth flagging: `hardship-letter/index.html`'s inline `printLetter()` still uses
`alert('Generate a letter first, then print.')` for its own separate empty-output guard — a
third native alert on the same page.

### 1.4 Cap-reached / upgrade-to-Pro state

This is the one place the site has already done real design work, on humanizer specifically —
worth preserving, not reinventing:

- Free trial = one full result, no email required.
- On the _next_ generation, output is cut to a real, substantive preview (not a one-line teaser
  — `PREVIEW_RATIO` is 0.42 on humanizer, 0.28 in the shared core), typed in, then the bottom of
  the pane blurs into a card: icon, headline, one-line value prop, an email-unlock form, and
  Pro/Lifetime CTAs injected below it.
- The card's copy changes depending on _why_ the user is gated (`setGateMode('email')` vs
  `setGateMode('pro_only')`) — first-time-without-email vs already-used-today's-email-unlock.
- On a hard daily-limit hit, `showHardLimitMessage()` additionally flashes a violet border
  around the `#upgrade-tiers` pricing block and smooth-scrolls to it.

This is good and the canonical shell keeps its shape. What's inconsistent/weak:

- The Pro/Lifetime CTA buttons inside the gate card are **not part of the page's HTML** — they're
  built as a DOM side-effect (`ensureProButtons()`) in both `humanizer.js` and `ai-tool.js`,
  **independently, with different markup and different copy** in each file. Reading the HTML
  source of either page does not show you the real, final state of the highest-intent moment on
  the site.
- Stripe URLs get their UTM params built two different ways on the same page: humanizer's static
  pricing section below the fold hardcodes
  `?utm_source=humanizer&utm_medium=pricing&utm_campaign=pro_conversion` directly in the HTML
  `href`, while the JS-injected gate buttons build the same kind of URL through a `stripeUrl()`
  helper function. Two code paths generating the same class of link — if the Stripe link ever
  changes, one of them is easy to forget.
- Hardship-letter's _static_ pricing block (`#upgrade-tiers`, always visible below the tool, not
  the in-context gate) is fully hand-inlined — three pricing cards worth of gradient/border/badge
  styling duplicated from scratch — rather than reusing humanizer's `.hz-pricing`/`.hz-price-card`
  classes, which already express the identical layout.
- JSON↔CSV and password-checker have **no cap-reached state at all**, which is correct (they're
  free client-side utility tools per `CLAUDE.md`'s product list, not gated AI tools) — but the
  shell needs to make that omission a deliberate, structural option, not just "this tool didn't
  get built out yet."

### 1.5 Design tokens — three live accent systems, not one

- `public/css/style.css` defines a real `:root` token set: `--bg`, `--card`, `--text`,
  `--text-muted`, `--primary: #0F4D32` (dark green), `--primary-soft: #2A6B4A`,
  `--danger: #B91C1C`, `--border`, `--radius`, etc.
- `humanizer/style.css` scopes a **second, parallel** token set on `.hz-app` (`--hz-bg`,
  `--hz-surface`, `--hz-text`, `--hz-green`, `--hz-border`...) whose _values_ are copy-pasted
  from the global tokens above (`--hz-green: #0F4D32` is exactly `--primary`, `--hz-border` is
  exactly `--border`'s rgba string) but under entirely different names. Same values, no shared
  source.
- Hardship-letter, JSON↔CSV, password-checker, `ai-tool.js`, and `ai-tool.css` all instead use a
  **third, different accent**: violet `#7b2cff`, hardcoded inline or as `--accent` in each tool's
  own local `:root`. This value appears nowhere in the global token set.

So "primary/accent color" currently means dark green on the flagship tool, violet everywhere
else, with no shared variable connecting them. This is exactly the situation `tokens.css` is
being built to fix — the shell spec below intentionally does not add a fourth value to this
list.

### 1.6 Two parallel "shared" cores, not one

`hardship-letter.js` calls into `tools/shared/ai-tool.js` — a real shared core handling free
trial / email gate / Pro unlimited / usage tracking. `humanizer.js` does not use it. Instead it
re-implements the same state machine top to bottom under different function names
(`typeInto` vs `typeText`, `showPreviewWithGate` in both, `unlockFullResult` in both,
`ensureProButtons` in both) with different constants (`PREVIEW_RATIO` 0.42 vs 0.28, typing speed
6/4ms vs 10/5ms) and the color drift noted in 1.3. Whatever caused the fork (humanizer needed
mode chips and a mobile bar the shared core didn't support) is a real product need — but the
fork carried 300+ lines of near-identical paywall/usage logic with it. The shell/state-machine
in §3–4 is written so both tool types (chip-driven and plain) can sit on one core again.

### 1.7 Flagged — needs a decision, not guessed at here

`public/tools/humanizer/DECISIONS.md` (dated 2026-07-19, referenced directly in a comment at the
top of `humanizer/index.html`) documents two choices that **do not match the CSS actually
shipping today**:

1. §2 of that doc: _"Humanizer workspace is light (near-white editors, dark text)... Dark cyber
   UI signals 'dev toy,' not 'I trust this with client copy.'"_ — but `humanizer/style.css`'s
   `.hz-app` tokens are `--hz-bg: #0A0A0A`, `--hz-surface: #161616`, `--hz-text: #E8E2D6`: a dark
   near-black surface with light cream text. That's the opposite of what the decisions doc
   describes.
2. §3 of that doc: _"Keep violet/purple as the only strong accent (don't invent a new brand
   palette)... Competing neon cyan+red+purple splits attention."_ — but the same stylesheet's
   own header comment reads `/* Humanizer — near-black canvas, green actions, amber rare pay */`,
   and its primary interactive color token is `--hz-green: #0F4D32`, not violet.

I'm not resolving this in a spec-only pass — it's a real product decision (was the light/violet
version shipped and then reverted without updating the doc, or was the doc aspirational and
never built?). The canonical shell below is written token-agnostic specifically so it works
either way. **Flagging for you to settle before this shell gets applied to humanizer.**

---

## 2. Canonical shell — HTML structure

One DOM shape, two supported profiles:

- **Gated AI tool** (humanizer, hardship-letter, appeal-letter, gig-auto-pilot, etc.): uses the
  full shell below, including the usage pill, loading, error, and paywall states.
- **Ungated client-side utility** (JSON↔CSV, password-checker, base64, regex tester, etc.): uses
  the same shell with the topbar usage pill, `.cs-tool-paywall`, and the "Open Pro" result-action
  omitted entirely (not hidden — not rendered). Loading state is still present but is only
  surfaced by JS if an operation runs long enough to need it (see §4.3).

```html
<section
  class="cs-tool-shell"
  aria-label="[Tool name] editor"
  data-tool-state="idle"
  data-tool-profile="gated"
>
  <!-- Sticky top chrome: title + live free-usage status. Gated profile only. -->
  <div class="cs-tool-topbar">
    <div class="cs-tool-brand">
      <h1>[Tool Name]</h1>
      <p class="cs-tool-tagline" id="cs-tool-tagline">[one-line value prop / empty-state hint]</p>
    </div>
    <div class="cs-tool-topbar-actions">
      <!-- Always-visible free-usage status, not just shown after the cap is hit -->
      <span class="cs-tool-usage-pill" id="cs-tool-usage" role="status" aria-live="polite"
        >1 free full result</span
      >
      <kbd class="cs-tool-kbd">⌘/Ctrl+Enter</kbd>
      <a href="/pro/" class="cs-tool-link-pro">Get Pro</a>
    </div>
  </div>

  <div class="cs-tool-workspace">
    <!-- ───────── INPUT AREA ───────── -->
    <div class="cs-tool-pane cs-tool-pane-input">
      <div class="cs-tool-pane-head">
        <span class="cs-tool-pane-title"
          >[e.g. "Original text" / "Your situation" / "Input JSON"]</span
        >
        <span class="cs-tool-meta" id="cs-tool-input-meta">0 / 500 free</span>
      </div>

      <textarea class="cs-tool-editor" id="cs-tool-input" placeholder="…" rows="10"></textarea>

      <!-- Structured tools only (letter type, addressed-to, calculator fields, etc.) -->
      <div class="cs-tool-fields" id="cs-tool-fields" hidden>
        <!-- <div class="cs-tool-field"><label>…</label><select>…</select></div> -->
      </div>

      <!-- Inline validation error — NOT part of the output-pane state machine in §3.
           Can be shown/hidden independently of loading/result/error/paywall. -->
      <p class="cs-tool-field-error" id="cs-tool-field-error" role="alert" hidden></p>

      <div class="cs-tool-pane-foot">
        <div class="cs-tool-foot-left">
          <button type="button" class="cs-tool-ghost-btn" id="cs-tool-sample-btn">
            Try sample
          </button>
          <!-- optional: style-match drawer, advanced-options toggle, etc. -->
        </div>
        <span class="cs-tool-hint" id="cs-tool-input-hint"
          >Free: 500 characters · Ctrl/⌘+Enter to run</span
        >
      </div>
    </div>

    <!-- ───────── ACTION BAR / PRIMARY CTA ───────── -->
    <div class="cs-tool-actionbar" role="toolbar" aria-label="[Tool] options">
      <div class="cs-tool-modes" role="group" aria-label="Options" id="cs-tool-modes" hidden>
        <!-- optional mode chips, e.g. Natural / Professional / Shorter -->
      </div>
      <button type="button" class="cs-tool-primary-btn" id="cs-tool-run-btn">
        <span class="btn-text">[verb: "Humanize" / "Generate Letter" / "Convert"]</span>
        <span class="btn-icon" aria-hidden="true">→</span>
      </button>
    </div>

    <!-- ───────── OUTPUT AREA ───────── -->
    <div class="cs-tool-pane cs-tool-pane-output">
      <div class="cs-tool-pane-head">
        <span class="cs-tool-pane-title">Result</span>
        <span class="cs-tool-meta" id="cs-tool-output-meta">0 words</span>
      </div>

      <!-- Exactly one child of this wrapper is visible at a time, governed entirely by
           [data-tool-state] on .cs-tool-shell — see §3. This is the fix for the current
           bug-risk where loading/gate/error are three independently-toggled .hidden
           classes with no shared source of truth. -->
      <div class="cs-tool-output-wrap">
        <div
          class="cs-tool-output-content"
          id="cs-tool-output"
          contenteditable="true"
          role="textbox"
          aria-label="Result"
        >
          <span class="cs-tool-placeholder">Nothing here yet. …</span>
        </div>

        <!-- LOADING — see §4.1 -->
        <div class="cs-tool-loading" id="cs-tool-loading">
          <div class="cs-tool-skeleton" aria-hidden="true">
            <span class="cs-tool-skeleton-line"></span>
            <span class="cs-tool-skeleton-line"></span>
            <span class="cs-tool-skeleton-line cs-tool-skeleton-line--short"></span>
          </div>
          <p class="cs-tool-loading-msg" id="cs-tool-loading-msg" role="status" aria-live="polite">
            Reading your input…
          </p>
        </div>

        <!-- ERROR (request-level) — see §4.2 -->
        <div class="cs-tool-error" id="cs-tool-error" role="alert">
          <div class="cs-tool-error-icon" aria-hidden="true">!</div>
          <p class="cs-tool-error-title">Something went wrong</p>
          <p class="cs-tool-error-msg" id="cs-tool-error-msg">…</p>
          <button type="button" class="cs-tool-ghost-btn" id="cs-tool-retry-btn">Try again</button>
        </div>

        <!-- CAP-REACHED / UPGRADE — see §4.3. Gated profile only. -->
        <div class="cs-tool-paywall" id="cs-tool-paywall">
          <div class="cs-tool-paywall-blur" aria-hidden="true"></div>
          <div class="cs-tool-paywall-card">
            <div class="cs-tool-paywall-icon" aria-hidden="true">✦</div>
            <h3 class="cs-tool-paywall-title" id="cs-tool-paywall-title">
              Rest of your result is ready
            </h3>
            <p class="cs-tool-paywall-body" id="cs-tool-paywall-body">
              You can read the start above. …
            </p>

            <form class="cs-tool-gate-form" id="cs-tool-gate-form">
              <label class="cs-tool-sr-only" for="cs-tool-gate-input">Email</label>
              <input
                type="email"
                class="cs-tool-gate-input"
                id="cs-tool-gate-input"
                placeholder="you@example.com"
                required
                autocomplete="email"
              />
              <button type="submit" class="cs-tool-gate-submit" id="cs-tool-gate-submit">
                Unlock free
              </button>
            </form>
            <p
              class="cs-tool-gate-status"
              id="cs-tool-gate-status"
              role="status"
              aria-live="polite"
            ></p>

            <!-- Always part of the markup — not JS-injected. See 1.4. -->
            <div class="cs-tool-paywall-benefits">
              <p>Unlimited full results · no daily cap · cancel anytime</p>
            </div>
            <div class="cs-tool-paywall-actions">
              <a
                class="cs-tool-cta-primary"
                id="cs-tool-cta-monthly"
                href="#"
                target="_blank"
                rel="noopener"
                >Go Pro · $5/mo</a
              >
              <a
                class="cs-tool-cta-secondary"
                id="cs-tool-cta-lifetime"
                href="#"
                target="_blank"
                rel="noopener"
                >Lifetime · $29</a
              >
            </div>
            <p class="cs-tool-gate-fine">
              Stripe secure · 14-day refund · <a href="/pro-restore/">Already paid?</a>
            </p>
          </div>
        </div>
      </div>

      <div class="cs-tool-result-actions" id="cs-tool-result-actions" hidden>
        <button type="button" class="cs-tool-action-btn" id="cs-tool-copy-btn">Copy</button>
        <button type="button" class="cs-tool-action-btn" id="cs-tool-download-btn">Download</button>
        <button type="button" class="cs-tool-action-btn" id="cs-tool-again-btn">Run again</button>
        <!-- Gated profile only -->
        <a href="/pro/" class="cs-tool-action-btn cs-tool-action-pro">Open Pro</a>
      </div>
    </div>
  </div>

  <!-- Mobile sticky CTA (small viewports only — see §5.3) -->
  <div class="cs-tool-mobile-bar" aria-label="Quick actions">
    <button type="button" class="cs-tool-primary-btn" id="cs-tool-run-btn-mobile">[verb]</button>
    <a href="/pro/" class="cs-tool-link-pro">Pro</a>
  </div>
</section>

<!-- Static pricing block, below the tool. Same component for every gated tool —
     replaces hand-inlined per-tool pricing cards. See §4.4. -->
<div class="cs-tool-pricing" id="cs-tool-pricing">
  <div class="cs-tool-pricing-head">
    <h2>Unlimited when you need it</h2>
    <p>Full results every time. Cancel anytime.</p>
  </div>
  <div class="cs-tool-price-grid">
    <div class="cs-tool-price-card">
      <div class="cs-tool-price-name">Free</div>
      <div class="cs-tool-price-amt">$0</div>
      <ul>
        <li>1 free full result</li>
        <li>1 email unlock / day</li>
        <li>500 character limit</li>
      </ul>
    </div>
    <div class="cs-tool-price-card cs-tool-price-featured">
      <div class="cs-tool-price-badge">Popular</div>
      <div class="cs-tool-price-name">Pro</div>
      <div class="cs-tool-price-amt">$5<span>/mo</span></div>
      <ul>
        <li>Unlimited full results</li>
        <li>Longer inputs</li>
        <li>All AI tools included</li>
        <li>14-day refund</li>
      </ul>
      <a
        class="cs-tool-price-cta"
        id="cs-tool-price-cta-monthly"
        href="#"
        target="_blank"
        rel="noopener"
        >Go Pro</a
      >
    </div>
    <div class="cs-tool-price-card">
      <div class="cs-tool-price-name">Lifetime</div>
      <div class="cs-tool-price-amt">$29</div>
      <ul>
        <li>Everything in Pro</li>
        <li>One payment</li>
        <li>No renewals</li>
      </ul>
      <a
        class="cs-tool-price-cta cs-tool-price-cta-outline"
        id="cs-tool-price-cta-lifetime"
        href="#"
        target="_blank"
        rel="noopener"
        >Buy lifetime</a
      >
    </div>
  </div>
  <p class="cs-tool-restore">
    Already paid? <a href="/pro-restore/">Restore Pro on this device</a>
  </p>
</div>
```

---

## 3. State contract

`data-tool-state` lives on `.cs-tool-shell` (or at minimum on `.cs-tool-pane-output`) and is the
**single** source of truth for which overlay is visible. One attribute, one place to read it,
instead of three separately-managed `.hidden` classes:

```
idle            → placeholder text visible, everything else hidden
loading         → .cs-tool-loading visible
result          → real output visible, .cs-tool-result-actions visible
preview-gated   → cut preview visible behind it, .cs-tool-paywall visible (mode: email)
hard-capped     → .cs-tool-paywall visible (mode: pro_only)
error           → .cs-tool-error visible
```

```css
.cs-tool-loading,
.cs-tool-error,
.cs-tool-paywall {
  display: none;
}

.cs-tool-shell[data-tool-state='loading'] .cs-tool-loading {
  display: flex;
}
.cs-tool-shell[data-tool-state='error'] .cs-tool-error {
  display: flex;
}
.cs-tool-shell[data-tool-state='preview-gated'] .cs-tool-paywall,
.cs-tool-shell[data-tool-state='hard-capped'] .cs-tool-paywall {
  display: flex;
}
```

Changing state is a single `shell.dataset.toolState = 'loading'` from JS. This directly closes
the gap in the current code: neither `ai-tool.js`'s nor `humanizer.js`'s error `catch` block
hides the email gate, so today it's structurally possible (not just theoretical) for a stale
paywall card to still be sitting behind a freshly-rendered error message. A single attribute
makes that class of bug unrepresentable — setting one state always implies clearing the others.

`cs-tool-field-error` (inline, next to the input) is intentionally **outside** this state
machine — it's about the input's validity, not the output pane's contents, and should never be
shown via `alert()`.

---

## 4. Component notes

All colors, spacing, radii, and fonts below are written as **placeholder token names**
describing intent, not final values — swap them for whatever `public/css/tokens.css` actually
ships with. Per the brief for this doc: nothing here should become a fourth competing color
system alongside the three already found in §1.5.

### 4.1 Loading state — what changes from today

Current state (both AI tools): opaque overlay, spinner, one static caption, for the entire
duration of the call. Target state:

- **Skeleton, not just a spinner.** Three shimmering placeholder lines (`.cs-tool-skeleton-line`)
  in the output pane, sized like real paragraph text, rather than a spinner on a near-solid
  black overlay. Reads as "your result is forming" instead of "something is frozen."

  ```css
  .cs-tool-skeleton-line {
    display: block;
    height: 0.9em;
    border-radius: var(--radius-token /* tokens.css radius-sm */);
    background: linear-gradient(
      90deg,
      var(--surface-token) 25%,
      var(--surface-highlight-token) 50%,
      var(--surface-token) 75%
    );
    background-size: 200% 100%;
    animation: cs-tool-shimmer 1.4s ease-in-out infinite;
  }
  .cs-tool-skeleton-line--short {
    width: 60%;
  }
  @keyframes cs-tool-shimmer {
    from {
      background-position: 200% 0;
    }
    to {
      background-position: -200% 0;
    }
  }
  ```

- **Rotating status messages, not one static line.** `#cs-tool-loading-msg` advances through a
  short array on an interval (~1.8–2.5s) instead of sitting on one sentence:
  `"Reading your input…"` → `"Drafting with [model]…"` → `"Polishing the wording…"` →
  `"Almost done…"`. This is honest progress-_feel_ without faking a literal percentage we can't
  actually compute from a single non-streaming response — and it's the direct answer to a
  static caption looking identical for a 1s and an 8s call.
- **Minimum-duration guard for instant tools.** JSON↔CSV and any other synchronous client-side
  tool should only ever enter `data-tool-state="loading"` if the operation is _still running_
  after roughly 150ms (a short `setTimeout` before flipping state). Most conversions finish
  well under that and should go straight to `result` — this is what replaces JSON↔CSV's current
  one-off `.converting` button-flash with the same shared concept every other tool uses, instead
  of a bespoke substitute.
- **Where streaming plugs in.** If `/api/rewrite` or `/api/ai-generate` ever moves to a streamed
  response (SSE or chunked fetch), the loading state's job shrinks to covering only the gap
  before the _first_ token — typically much shorter than full-completion wait. From the first
  chunk onward, state goes straight to `result` and tokens append directly into
  `#cs-tool-output`, with a blinking `.cs-tool-stream-cursor` at the tail end of the text to
  signal "still writing." No separate design is needed for that later — it's the same `result`
  state, just filled in incrementally instead of all at once.

### 4.2 Error state — what changes from today

- Never a native `alert()`. Both remaining `alert()` calls in `ai-tool.js`/`humanizer.js` (empty
  input, over character limit) become `.cs-tool-field-error` inline messages next to the input —
  the same pattern humanizer's own textarea-shake already does for empty input, just formalized
  and given a real message instead of only a visual shake.
- Request-level failures (network error, non-2xx from `/api/rewrite` / `/api/ai-generate`,
  timeout) render into `.cs-tool-error`: icon + short human title + the specific message + a
  **Try again** button that re-invokes whatever the primary CTA just did. Today's version has no
  retry affordance at all once `showResultActions(false)` hides the action row on error.
- One color, everywhere: whatever `tokens.css` calls its danger/error token. This directly
  retires the `#B91C1C` vs `#ef4444` split documented in §1.3 — there should be exactly one
  danger value, not two that drifted apart because they were hand-typed in two files.
- Validation errors (`.cs-tool-field-error`) and request errors (`.cs-tool-error`) are
  deliberately two different components, not one — a bad paste and a failed API call are
  different problems for the user and shouldn't compete for the same box.

### 4.3 Cap-reached / upgrade-to-Pro state — the highest-intent moment on the site

This state gets the most design attention on purpose — per the brief, it's the single
highest-intent conversion moment on the whole site, and it should never regress to a flat "block
screen." Carried forward from humanizer (the one part of the current site that already does this
well) and formalized:

- **Earned preview, never a hard wall.** The user always sees a real, substantive chunk of their
  actual result before any gate appears — never a one-line teaser, never a 100%-blocked box. The
  gate sits _after_ value was already delivered, not in front of it.
- **Contextual copy, not one generic message.** `.cs-tool-paywall-title`/`-body` text depends on
  _why_ the user landed here — first free result already used (offer email unlock) vs. today's
  email unlock already used too (offer Pro only, hide the email form). This is the one part of
  the current implementation that's already correct and just needs to stay that way.
- **The CTA block is permanent markup, not a JS side-effect.** `.cs-tool-paywall-actions` (Pro +
  Lifetime buttons), `.cs-tool-paywall-benefits` (what Pro actually includes), and the trust line
  (Stripe secure / 14-day refund / restore-purchase link) all live in the HTML from §2, always.
  Today, `ensureProButtons()` is called from JS on page load specifically because this content
  isn't in the markup — meaning reading either page's HTML source doesn't show you the real final
  state of the most important screen on the site. Making it static markup fixes that and removes
  the duplicate hand-rolled version of this function that currently exists in both
  `humanizer.js` and `ai-tool.js`.
- **One way to build a Stripe link, not two.** A single helper (something like
  `stripeUrl(base, toolId, placement)`, which already exists in both JS files independently)
  should be the _only_ thing that ever produces a Stripe href with UTM params — including the
  static pricing block in §2, which today gets its UTM string hand-typed directly into HTML on
  humanizer and would otherwise silently drift from the JS-built version the same page also uses.
- **Always-visible usage status.** `.cs-tool-usage-pill` in the topbar (§2) is not new — humanizer
  already has `#usage-counter` — but it's promoted from "a nice touch on one tool" to a required
  part of the gated-profile shell, so the cap is signaled proactively ("1 free full result" /
  "1/1 free today") rather than only discovered when the user slams into it.
- **Reinforce, then scroll, on a hard stop.** Keep humanizer's existing flourish: on
  `hard-capped`, briefly outline `.cs-tool-pricing` and smooth-scroll it into view. Small, but it
  turns "you're blocked" into "here's exactly what removes the block."

### 4.4 Static pricing block (`.cs-tool-pricing`)

One component, used by every gated tool, replacing each tool's hand-inlined pricing cards
(hardship-letter's version is ~40 lines of inline `style=""` reproducing what humanizer's
`.hz-pricing`/`.hz-price-card` classes already do). Content differences between tools (e.g. a
tool-specific benefit in the Pro tier's `<ul>`) are data, not markup forks.

### 4.5 Tool profiles

- `data-tool-profile="gated"` — renders the usage pill, paywall states, static pricing block, and
  "Open Pro" result action.
- `data-tool-profile="ungated"` — the topbar usage pill, `.cs-tool-paywall`, `.cs-tool-pricing`,
  and the "Open Pro" action button are **not rendered** (not just hidden with CSS — omit them
  from the page). Loading and error states still apply, subject to the instant-tool guard in
  §4.1. This is the explicit, structural version of what JSON↔CSV and password-checker already
  do implicitly by simply not having that markup — now it's a named, intentional mode of the
  same shell instead of an accident of two tools never having been built out.

---

## 5. Before → after, by inconsistency

| Found in audit (§1)                                                                                | Resolved by                                                                                                                                                                     |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hardship-letter's panel/button/pricing chrome is hand-duplicated inline; `ai-tool.css` is orphaned | One shell (§2) with real classes; nothing hand-inlined per tool                                                                                                                 |
| Two-column vs one-column with no documented reasoning behind the difference                        | Single canonical structure follows humanizer's documented, conversion-tested choice (`DECISIONS.md` §1); still supports a dev-tool two-pane variant via CSS, not markup forking |
| Loading = static spinner + one caption, identical for 1s and 8s calls                              | Skeleton + rotating status messages (§4.1)                                                                                                                                      |
| JSON↔CSV invented its own `.converting` flash instead of a shared concept                          | Same `data-tool-state="loading"`, gated by a 150ms minimum-duration guard so instant tools rarely show it                                                                       |
| No streaming story                                                                                 | Explicit note on where it plugs into the `result` state (§4.1)                                                                                                                  |
| Error = plain red `<span>`, two different hardcoded reds (`#B91C1C` vs `#ef4444`)                  | One `.cs-tool-error` component, one token-driven color                                                                                                                          |
| `alert()` used for empty input / char limit on both AI tools                                       | `.cs-tool-field-error`, inline, never blocking                                                                                                                                  |
| No retry action after a failed request                                                             | `#cs-tool-retry-btn` in `.cs-tool-error`                                                                                                                                        |
| Paywall CTA markup is JS-injected, duplicated across two files                                     | `.cs-tool-paywall-actions`/`-benefits` are permanent HTML (§2, §4.3)                                                                                                            |
| Stripe UTM links built two different ways on the same page                                         | One `stripeUrl()` helper, used everywhere a Stripe link appears                                                                                                                 |
| Hardship-letter's pricing cards hand-inlined from scratch                                          | `.cs-tool-pricing` (§4.4), one component                                                                                                                                        |
| Three live accent systems (`--primary` green, `.hz-*` green, `#7b2cff` violet)                     | Shell uses placeholder token names only; no fourth value invented here (§1.5, §4 intro)                                                                                         |
| `humanizer/DECISIONS.md` vs shipped CSS disagree on theme lightness and accent hue                 | Explicitly flagged (§1.7), not silently resolved                                                                                                                                |
| Two parallel paywall/usage cores (`humanizer.js` vs `ai-tool.js`)                                  | Shell + state contract (§3) designed so both tool shapes (chip-driven and plain) can run on one core                                                                            |

---

## 6. Non-goals of this document

- Does not rewrite `humanizer/index.html`, `hardship-letter/index.html`,
  `json-csv-converter/index.html`, or `password-checker/index.html`. That's the follow-up step.
- Does not pick final token names or values — that's `tokens.css`'s job, being built in parallel.
- Does not resolve the `DECISIONS.md`-vs-shipped-CSS conflict in §1.7 — flagged for a decision,
  not guessed at.
- Does not mandate collapsing every dev-utility tool into single-column; humanizer's single-column
  choice was made for a _conversion_ tool with a paywall funnel, and that reasoning doesn't
  automatically transfer to a bidirectional converter where seeing both formats at once is a real
  feature, not just legacy layout.
- Does not merge `humanizer.js` and `ai-tool.js` into one file — that's implementation, this is
  the shape they should both be able to sit on.
