## 2026-07-08 - [XSS via dangerouslySetInnerHTML]

**Vulnerability:** Found two instances of `dangerouslySetInnerHTML` being used with potentially unsafe content (user-provided SVG markup and AI-generated text).
**Learning:** React's `dangerouslySetInnerHTML` is a common vector for XSS. Even AI-generated text should be treated as untrusted if it can be manipulated via prompts or if the AI itself is compromised.
**Prevention:** Always prefer standard React rendering. For SVGs, using an `<img>` tag with a data URI is a safer alternative to inlining if CSS manipulation isn't strictly required. For text with newlines, use `white-space: pre-wrap` instead of manual `<br/>` injection.

## 2026-10-05 - [Authorization Bypass via Query Params]

**Vulnerability:** The analytics-related endpoints (`analyticsReport`, `getMetrics`, `substackBackfill`) were accepting the `ANALYTICS_SECRET` via a URL query parameter (`?secret=...`). This is a security risk because query parameters are often logged in plaintext in server logs, browser histories, and proxy logs.
**Learning:** Secrets and tokens should never be passed in the URL.
**Prevention:** Always use standard authorization headers (e.g. `Authorization: Bearer <secret>`) or a secure, HTTP-only cookie for passing secrets and authentication tokens.
