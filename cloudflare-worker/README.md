# AI endpoint proxy

The Worker forwards every generation request to Firebase, where tool validation and the shared Firestore quotas run. It does not invoke Workers AI or cache responses. Quota failures and `Retry-After` pass through to callers; personal responses use `Cache-Control: no-store`.

Firebase Hosting and Functions deploy from the repository's `main` workflow. That workflow does **not** deploy this Worker. If the route in `wrangler.toml` is active, deploy this directory separately using an authorized Cloudflare account:

```bash
cd cloudflare-worker
npx wrangler deploy
```

Use Cloudflare's supported login or secret-management flow; never commit credentials. After deployment, verify that `/api/ai-generate` responses identify the Firebase provider, do not have an edge-cache hit, and preserve quota failures. The absence of this separate deployment means a previously deployed Worker can continue using its old behavior.
