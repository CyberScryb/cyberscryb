# Legacy maintenance scripts

One-off, Windows-origin maintenance scripts kept for reference. They are **not**
part of the build, deploy, or test pipeline and nothing in the repo references
them.

| Script | Purpose |
|--------|---------|
| `fix-canonicals.ps1` | Bulk-fix canonical tags across HTML |
| `fix-feed.ps1` | Patch `feed.xml` |
| `fix-guide-css.ps1` | Normalize guide page CSS links |
| `fix-guide-nav.ps1` | Normalize guide page nav |
| `fix-html-links.ps1` | Repair internal HTML links |
| `fix-jsonld.ps1` | Patch JSON-LD blocks |
| `fix-sitemap.ps1` | Regenerate/patch `sitemap.xml` |
| `fix-tools-jsonld.ps1` | Patch tool-page JSON-LD |
| `deploy_site.bat` | Old local Firebase deploy shortcut (superseded by GitHub Actions) |
| `replace-domain.js` | Bulk domain string replacement |
| `crop_mascot.py` | Crop/resize the mascot into icon/hero/social variants (needs Pillow) |

Prefer editing files directly or using the generators in `scripts/` (e.g.
`gen-og-image.py`, `seo-fix-tags.js`). Deploys happen automatically on push to
`main` via `.github/workflows/deploy.yml`.
