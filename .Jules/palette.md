# Palette's Journal

## 2026-10-06 - HTML entities in DOM `textContent` render literal text strings

**Learning:** Assigning HTML entity strings like `&mdash;` or `&middot;` to Node.textContent or Element.textContent does not unescape the entity. The DOM literally renders `&mdash;` or `&middot;` as visible text on screen to users.
**Action:** Always use raw unescaped unicode characters (e.g., `'—'`, `'·'`) when setting `textContent`, or use `innerHTML` if HTML entity parsing is required.

## 2026-07-08 - Icon-only buttons hide behind `title`, not `aria-label`

**Learning:** This codebase's convention for icon-only buttons (no visible text, just an emoji/glyph) is a `title` tooltip attribute alone — e.g. `<button class="icon-btn" title="Copy to Clipboard">📋</button>` on the flagship Humanizer tool (3 pages sharing `humanizer.js`). `title` is not a reliable accessible name (many screen readers skip it or read it inconsistently), so these buttons had no accessible name at all. Most other `icon-btn` instances site-wide are safe because they pair the icon with visible text ("Copy", "Print / PDF") — only check for `aria-label` gaps on buttons that are icon/emoji-_only_, don't flag every `title`-only button as broken.
**Action:** When a copy/action button's icon changes on success (📋→✅), also swap the `aria-label` in the same handler (not just `innerText`) — otherwise the accessible name goes stale relative to the visual state during the success window.
