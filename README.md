# CyberScryb

Source for [cyberscryb.com](https://cyberscryb.com).

Free tools. No accounts, signup gates, or paywalls. Voluntary support through
[Ko-fi](https://ko-fi.com/cyberscryb) never changes access. AI capacity limits
apply equally to everyone: 10 requests per IP per UTC day, 500 sitewide.

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
