# CyberScryb v2

React + Vite app built into `public/v2/` during CI.

## Local

```bash
npm ci
npm run dev
npm run build
```

Add `GEMINI_API_KEY` to `v2/.env.local` only if you need Gemini-backed flows. Local builds stay local; production changes only after a push to `main`.
