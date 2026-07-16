# Session Changelog — 2026-07-16 (Sprint A + B)

## Shipped (local — not pushed)

### Sprint A — registry & deploy hygiene
- Added `scripts/toolsConfig.js` (30 tools: metadata, chains, share/offline flags)
- Added `scripts/emit-tools-registry.js` → `content-site` + `public` `tools-registry.js`
- Added `scripts/seo-assert.js` (duplicate slug / broken chain checks)
- Removed **v2 React build** from `.github/workflows/deploy.yml` (folder kept)
- `package.json`: `emit:registry`, `seo:assert`, `test:growth`; dropped `build:v2`
- `test.yml`: runs seo-assert + emit after Jest

### Sprint B — workspace & chaining
- `content-site/tools/shared/workspace.js` + `workspace.css` (mirrored to public)
- Zero-auth draft save/restore (`cs_ws_{toolId}`, 7-day TTL)
- Bridge handoff (`sessionStorage cs_bridge`) + chain bar UI
- Auto-load on `/tools/*` via end of `js/script.js`
- `ai-tool.js`: save draft before generate; show chain bar after full result / unlock

## Verified
- `node scripts/seo-assert.js` → 30 tools, 0 errors, 0 warnings
- `node scripts/emit-tools-registry.js` → wrote both registries

## Follow-up (review fixes — same PR branch)

Fixed all PR #39 review bugs:
- `primaryInputId` / `primaryOutputId` on every tool; chains resolve to real DOM ids
- Bridge merges over draft (force apply on handoff fields)
- Offline tools: click/output hooks show chain bar without per-tool copy/paste
- Humanizer: `notifyResult` after rewrite; input id `robotic-text`
- Sensitive tools: `persistPolicy: 'none'`
- seo-assert validates field ids in HTML + registry drift
- CI: emit registry then assert

## Not done (later sprints)
- Satori OG share pipeline
- PWA
- Alias landing pages / delete `v2/` folder

## Note
PR branch auto-updates on push. Merge to `main` still deploys production.
