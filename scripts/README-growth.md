# Growth stack (Sprint A + B)

## What this is

Foundation for treating tools as the marketing engine:

- **toolsConfig.js** — source of truth (SEO fields, chains, offline flags)
- **workspace.js** — zero-auth draft restore + one-click tool chaining
- **v2** not built/deployed (static site remains the product)

## Commands

```bash
npm run seo:assert      # config integrity
npm run emit:registry   # write tools-registry.js to content-site + public
npm run test:growth     # both
```

## How tools load the stack

Any page under `/tools/` that includes `/js/script.js` auto-loads:

1. `workspace.css`
2. `tools-registry.js`
3. `workspace.js`

AI tools also call `CSWorkspace.showChainBar` after a successful generate (and after email-gate unlock).

## Deploy note

Pushing to `main` still auto-deploys Firebase hosting + functions.  
Do **not** push until you review. Prefer a PR from a branch.

## Not in this sprint

- Dynamic OG / Satori share cards
- PWA service worker
- Programmatic alias HTML pages
- Deleting the `v2/` folder (only removed from CI)
