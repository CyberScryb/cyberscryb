# Coding Conventions

**Analysis Date:** 2026-05-20

## HTML Structure — Tool Page Template

Every AI tool page follows the summarizer template at `public/tools/summarizer/index.html`. Required sections in order:

1. `<head>` — charset, viewport, title, description meta, og:image, canonical, Google Fonts preconnect, `../../css/style.css`, deferred GA4, deferred AdSense
2. Breadcrumb nav — inline-styled `<nav aria-label="Breadcrumb">` above the main `<header>`
3. `<header>` with `.navbar` → `.nav-container` → `.nav-logo` + `.nav-menu` + `.hamburger`
4. `<main>` → `.hero` section (min-height: 40vh) → `.tool-content` section → `.container`
5. Two-panel layout inside `.humanizer-container`: `.panel.input-panel` (left) + `.panel.output-panel` (right)
6. Required output panel elements: `#output-text.output-content`, `#email-gate.email-gate.hidden`, `#loading-indicator.hidden`, `#copy-btn`
7. `#upgrade-tiers` section (3-tier pricing: Free / Pro $5/mo / Pro Annual $29/yr)
8. FAQ block — `<div class="faq-item"><h4>...</h4><p>...</p></div>` × 5 questions
9. Related tools inline text (`<div class="related-tools">`) + Related Tools grid section
10. First AdSense unit (`<section>` before footer, slot 9198647442)
11. `<footer>` with `.footer-container` → `.footer-content` → `.footer-brand` + `.footer-links`
12. Second AdSense unit after footer (slot 9198647442)
13. Schema.org JSON-LD (`SoftwareApplication` type, `price: "0"`, `priceCurrency: "USD"`)
14. Scripts in order: `../../js/script.js`, `../shared/ai-tool.js`, `{tool-name}.js`, `../shared/affiliate-panel.js`, `/js/cs-pro-widget.js?v=2` (defer)

### Nav Menu Links (required order)

```html
<li><a href="../../index.html">Home</a></li>
<li><a href="../../tools.html">Tools</a></li>
<li><a href="../../guides/index.html">Guides</a></li>
<li><a href="../../about.html">About</a></li>
<li><a href="/blog/">Blog</a></li>
```

The Blog link uses an absolute path (`/blog/`) — not a relative path.

### Footer Links (required)

`../../privacy.html`, `../../terms.html`, `../../disclosure.html`, `../../guides/index.html`, `../../contact.html`

## Path Conventions — Critical

**Root-level pages** (`index.html`, `tools.html`, `about.html`, etc.) MUST use absolute paths:

- `/css/style.css` not `css/style.css`
- `/js/script.js` not `js/script.js`
- `/favicon.svg` not `favicon.svg`

**Tool pages** (`public/tools/{tool-name}/index.html`) use relative paths (2 levels deep):

- `../../css/style.css`
- `../../js/script.js`
- `../../favicon.svg`
- `../../index.html` for nav links
- `../shared/ai-tool.js` for shared scripts

**Blog pages** use `../css/style.css` (1 level deep).

Never use `./css/...` — Firebase `cleanUrls: true` + `trailingSlash: true` changes effective paths.

## GA4 and AdSense Loading Pattern

Both scripts are deferred to protect LCP. This pattern is mandatory on every page — do not add them synchronously:

```html
<!-- GA4: inline stub first, async tag after -->
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag() {
    dataLayer.push(arguments);
  }
  if (localStorage.getItem('cs_cookie_consent') === 'declined') {
    window['ga-disable-G-73LQZEDNR6'] = true;
  }
  gtag('js', new Date());
  gtag('config', 'G-73LQZEDNR6');
</script>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-73LQZEDNR6"></script>

<!-- AdSense: delay 2.5s after load OR on first user interaction -->
<script>
  (function () {
    function loadAdsense() {
      if (window._adsenseLoaded) return;
      window._adsenseLoaded = true;
      var s = document.createElement('script');
      s.async = true;
      s.src =
        'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5721233331247292';
      s.crossOrigin = 'anonymous';
      document.head.appendChild(s);
    }
    if (document.readyState === 'complete') {
      setTimeout(loadAdsense, 2500);
    } else {
      window.addEventListener('load', function () {
        setTimeout(loadAdsense, 2500);
      });
    }
    ['scroll', 'mousemove', 'touchstart', 'click'].forEach(function (ev) {
      window.addEventListener(ev, loadAdsense, { once: true, passive: true });
    });
  })();
</script>
```

IDs: GA4 = `G-73LQZEDNR6`, AdSense = `ca-pub-5721233331247292`. Never use any other IDs.

## The CSAITool.init Pattern

All AI tools delegate to the shared core at `public/tools/shared/ai-tool.js`. The tool's own JS file only calls `CSAITool.init()` with a config object.

**Minimum required config:**

```javascript
// public/tools/{tool-name}/{tool-name}.js
document.addEventListener('DOMContentLoaded', () => {
  window.CSAITool.init({
    toolId: 'tool-name', // Must match key in AI_PROMPTS in functions/index.js
    emptyMessage: 'Please ...', // Alert text if input is empty
    collectInput: () => {
      // Returns the raw input string
      return document.getElementById('tool-input').value.trim();
    },
    collectParams: () => {
      // Returns extra params object (optional)
      return { key: value };
    },
    onStats: text => {
      // Called after output renders (optional)
      // Update word count, reduction %, etc.
    },
  });
});
```

**What CSAITool.init handles automatically:**

- Email gate overlay (shows after first free use, before subscribing)
- Cookie `cs_subscribed=1` (365-day, set on email submit)
- localStorage daily usage counter (`cs_{toolId}_usage`)
- Free tier limits: 500 chars input, 3 uses/day after subscription
- One fully free trial before the gate (`cs_free_trial_used` localStorage key)
- Typewriter animation for output (`escapeHtml` per character)
- Copy button behavior
- Loading spinner show/hide
- POST to `/api/ai-generate` with `{ tool: toolId, input, params }`
- Error display in output area (red span)
- Upgrade tier section highlight on daily limit exceeded

**Required DOM IDs** (must exist in the HTML for CSAITool to function):

- `generate-btn` — submit button
- `output-text` — output display div
- `loading-indicator` — spinner wrapper
- `copy-btn` — copy button
- `email-gate` — gate overlay div
- `gate-email-form` — gate form
- `gate-email-input` — gate email input
- `gate-status` — gate status message span
- `upgrade-tiers` — pricing section (for scroll-on-limit-reached)
- `usage-counter` — shows remaining uses (optional but expected)

## JavaScript Patterns

**Module style:** Vanilla ES5-compatible IIFEs for shared scripts. Tool-specific scripts use `document.addEventListener('DOMContentLoaded', () => { ... })` wrapper.

**No build step.** No transpilation, no bundling. Files are served as-is.

**Testable functions** export via CommonJS guard at the bottom of the file:

```javascript
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { functionName, anotherFunction };
}
```

See `public/tools/json-csv-converter/script.js` line 355, `public/tools/password-checker/script.js` line 291.

**Security: use `crypto.getRandomValues()`** for any randomness in security-sensitive tools (password generator). `Math.random()` is banned for security use — documented known issue in password-checker.

**Error responses from Cloud Functions:** ALL errors must use `res.status(N).json({ error: '...' })`. Never use `res.send()` for errors — the frontend always calls `.json()` on the response.

**Referer check in functions:** Use `new URL(referer).hostname` against an allowlist, not `string.includes()`. The `includes()` pattern is bypassable via query params.

## CSS Architecture

**Single global stylesheet:** `public/css/style.css`. No preprocessor. No scoped CSS per component.

**Design tokens** defined as CSS custom properties on `:root`:

```css
--bg-base:
  #000000 --bg-surface: #0a0a0a --bg-elevated: #111111 --border-subtle: rgba(255, 255, 255, 0.06)
    --border-strong: rgba(255, 255, 255, 0.12) --text-primary: #ededed --text-muted: #878787
    --text-faint: #555555 --accent: #34f5c5 --accent-glow: rgba(52, 245, 197, 0.5)
    --font-mono: 'JetBrains Mono',
  ui-monospace, ...;
```

**Typography:**

- Headings: `Orbitron` (Google Font), weights 400/700/900
- Body: `Inter`, system-ui fallbacks
- Code/mono: `JetBrains Mono` via `--font-mono`

**Per-tool CSS overrides:** Some tools (e.g., humanizer) have their own `style.css` loaded alongside the global sheet. New AI tools that need minor overrides can add inline `style=` attributes rather than separate files — the summarizer does this extensively.

**Affiliate panel styles** are injected at runtime by `public/tools/shared/affiliate-panel.js` via a `<style>` tag with `id="affiliate-panel-styles"`. Not in `style.css`.

## Naming Conventions

**Tool directories:** `kebab-case` matching the `toolId` used in `CSAITool.init` and the key in `AI_PROMPTS` in `functions/index.js`.

- `public/tools/hardship-letter/`
- `public/tools/json-csv-converter/`

**Tool JS files:** Either `{tool-name}.js` (AI tools) or `script.js` (dev tools). Examples:

- `public/tools/summarizer/summarizer.js` (AI tool)
- `public/tools/json-csv-converter/script.js` (dev tool)

**HTML files:** Always `index.html` inside the tool directory.

**CSS IDs and classes:** Shared utility classes use BEM-ish patterns (`.panel`, `.input-panel`, `.output-panel`, `.panel-header`). Inline styles are common on tool pages for layout overrides.

**Constants:** `SCREAMING_SNAKE_CASE` in JS (e.g., `FREE_CHAR_LIMIT`, `FREE_DAILY_LIMIT`, `AFFILIATE_CONFIG`).

**Functions:** `camelCase` (e.g., `collectInput`, `collectParams`, `submitGateEmail`, `updateUsageDisplay`).

## Comment Style

**File-level comments** identify the module and usage. Format:

```javascript
// Shared AI Tool Core — email gate, usage tracking, typewriter, API caller
// Usage: window.CSAITool.init({ toolId, collectInput, collectParams, onStats, loadingText, placeholderText })
```

**JSDoc blocks** used for `affiliate-panel.js` (multi-line `/** */` at top with affiliate URL hints).

**Inline section dividers** used in `affiliate-panel.js`:

```javascript
// ─── Configuration ───
// ─── Detect which tool we're on ───
// ─── Create the affiliate panel HTML ───
```

**Test-only comments:** Test files use `// ──` dividers to separate `describe` blocks.

**Practical comments on non-obvious behavior** (good example from `ai-tool.js`):

```javascript
// Give every browser ONE genuinely free full result before gating.
// This proves the tool works before asking for an email — the email
// gate exists because every AI call costs real money on the backend.
```

Avoid comments that just restate the code. Comments explain the WHY.

## Brand Voice Rules (applies to all user-facing copy)

- Direct. Short sentences. No hedging.
- Use contractions and "you/your".
- No corporate speak. No fluff.
- Never use: leverage, utilize, delve, tapestry, landscape, foster, moreover, furthermore, cutting-edge, game-changer, revolutionary, robust, seamless, innovative, empower, holistic, synergy, unlock, harness, thin, elevate, pivotal, nuanced.
- Never fabricate stats, founder stories, or testimonials.
- Cite current info with date stamps when relevant.

## SEO Requirements for Every Tool Page

- `<title>` format: `{Tool Name} — Free Online Tool | CyberScryb`
- `<meta name="description">` targeting the tool's primary keyword
- `<meta property="og:image" content="https://cyberscryb.com/og-image.svg">`
- `<link rel="canonical" href="https://cyberscryb.com/tools/{tool-name}/">`
- Schema.org `SoftwareApplication` JSON-LD (minimum: name, applicationCategory, operatingSystem, offers)
- `BreadcrumbList` JSON-LD (present on many tools, not yet universal — should be on all)
- 5-question FAQ block with `<div class="faq-item">` markup

---

_Convention analysis: 2026-05-20_
