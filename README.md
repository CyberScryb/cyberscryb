# CyberScryb

Source for [cyberscryb.com](https://cyberscryb.com).

- `content-site/` - source HTML content
- `public/` - deployed static output
- `functions/` - Firebase Cloud Functions
- `v2/` - React app (not deployed, dev only)
- `tools/` - shared static tool source
- `__tests__/` - Jest coverage
- `freelance-pipeline/` - Python automation

## Common commands

```bash
npm ci
npm test
python -m pytest freelance-pipeline/tests/ -v
python sync_and_build.py
npm --prefix functions ci
```

## Deployment

Pushes to `main` run GitHub Actions for tests and Firebase deploys. Local builds and tests do not deploy anything by themselves.
