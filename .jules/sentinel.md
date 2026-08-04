## 2026-07-08 - [XSS via dangerouslySetInnerHTML]

**Vulnerability:** Found two instances of `dangerouslySetInnerHTML` being used with potentially unsafe content (user-provided SVG markup and AI-generated text).
**Learning:** React's `dangerouslySetInnerHTML` is a common vector for XSS. Even AI-generated text should be treated as untrusted if it can be manipulated via prompts or if the AI itself is compromised.
**Prevention:** Always prefer standard React rendering. For SVGs, using an `<img>` tag with a data URI is a safer alternative to inlining if CSS manipulation isn't strictly required. For text with newlines, use `white-space: pre-wrap` instead of manual `<br/>` injection.
