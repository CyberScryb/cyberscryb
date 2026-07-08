# Palette's Journal

## 2026-07-08 - Icon-only buttons hide behind `title`, not `aria-label`
**Learning:** This codebase's convention for icon-only buttons (no visible text, just an emoji/glyph) is a `title` tooltip attribute alone — e.g. `<button class="icon-btn" title="Copy to Clipboard">📋</button>` on the flagship Humanizer tool (3 pages sharing `humanizer.js`). `title` is not a reliable accessible name (many screen readers skip it or read it inconsistently), so these buttons had no accessible name at all. Most other `icon-btn` instances site-wide are safe because they pair the icon with visible text ("Copy", "Print / PDF") — only check for `aria-label` gaps on buttons that are icon/emoji-*only*, don't flag every `title`-only button as broken.
**Action:** When a copy/action button's icon changes on success (📋→✅), also swap the `aria-label` in the same handler (not just `innerText`) — otherwise the accessible name goes stale relative to the visual state during the success window.
