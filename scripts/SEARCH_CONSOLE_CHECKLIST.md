# Search Console / Bing — do once after this deploy

These steps need your login (no API credentials in the agent environment).

## Google Search Console

1. Open https://search.google.com/search-console
2. Property: `https://cyberscryb.com/`
3. **Sitemaps** → submit or resubmit `https://cyberscryb.com/sitemap.xml`
4. **URL inspection** → test and request indexing for:
   - `https://cyberscryb.com/tools/`
   - `https://cyberscryb.com/llms.txt`
   - Each new guide under `/guides/*-letter*` and `upwork-proposal-template-that-wins`
5. Optional: export top 50 pages by clicks for the next SEO pass

## Bing Webmaster Tools

1. https://www.bing.com/webmasters
2. Submit the same sitemap URL
3. Enable “Import from Google Search Console” if not already

## Cloudflare (already done by you)

- AI training bots allowed
- Managed robots.txt off / open

## Stripe hygiene (owner only)

Dashboard → Payment Links → archive unused annual/orphan links not referenced in the repo.
Do **not** delete live `$5/mo` or `$29` lifetime links used on `/pro/`.
