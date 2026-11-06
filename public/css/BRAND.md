# CyberScryb brand — Digital Obsidian

Dark-first design system. This is the live brand. (A previous "Linen & Terracotta"
light-theme draft lived here; it was never shipped and contradicted the live site.)

## Surfaces

- **Obsidian bg:** `#09090b` (`--bg`)
- **Elevated:** `#18181b` (`--bg-elevated`)
- **Cards:** `#121215` (`--card`)

## Type

- **Text:** `#fafafa` (`--text`)
- **Muted:** `#d4d4d8` (`--text-muted`)
- **Faint:** `#a1a1aa` (`--text-faint`)
- **UI:** Outfit
- **Wordmark/brand:** Cormorant Garamond

## Brand accents

- **Primary accent:** `#ef4444` / `#f97316` (`--primary`) — CTAs, links, focus (`css/style.css` defines `--primary: #ef4444` with `#f97316` warm accent; hover: `--primary-hover: #dc2626`).
- **Attention blue:** `#38bdf8` (`--attention`) — sparing secondary accent only, never the main CTA.
- **Danger:** `#ef4444`

## Rules

1. Dark theme everywhere. No light-theme pages, no white cards on dark surfaces.
2. Primary brand tokens (`--primary`: `#ef4444` / `#f97316`). The legacy terracotta `#c2410c` and purple `#a855f7` are retired; do not introduce new uses.
3. Main CTAs use `--primary`. Blue is never the primary action.
4. Free forever: no paywalls, no pricing tiers, no subscription language anywhere.
