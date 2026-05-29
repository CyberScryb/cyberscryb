#!/usr/bin/env node
/**
 * Backfill missing Open Graph + Twitter Card meta tags on tool pages, and
 * swap the SVG og:image (rejected by Facebook/LinkedIn/Slack) for the PNG
 * site-wide.
 *
 * Idempotent: only inserts tags that are absent. Derives og:title from the
 * page <title> (minus the " | CyberScryb" suffix) and descriptions from the
 * existing meta description. Run: node scripts/seo-fix-tags.js
 */
const fs = require('fs');
const path = require('path');

const PNG = 'https://cyberscryb.com/og-image.png';
const root = path.join(__dirname, '..', 'public');

function toolPages() {
  const dir = path.join(root, 'tools');
  return fs.readdirSync(dir)
    .map((n) => path.join(dir, n, 'index.html'))
    .filter((p) => fs.existsSync(p));
}

function firstMatch(re, s) { const m = s.match(re); return m ? m[1].trim() : null; }

let tagsAdded = 0;
let imgSwapped = 0;

// 1) Swap og:image / twitter:image SVG -> PNG across the whole site.
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.html')) {
      let c = fs.readFileSync(p, 'utf8');
      if (c.includes('og-image.svg')) {
        c = c.replace(/og-image\.svg/g, 'og-image.png');
        fs.writeFileSync(p, c);
        imgSwapped++;
      }
    }
  }
}
walk(root);

// 2) Backfill OG/Twitter tags on tool pages.
for (const file of toolPages()) {
  let c = fs.readFileSync(file, 'utf8');

  let title = firstMatch(/<title>([\s\S]*?)<\/title>/i, c) || 'CyberScryb';
  title = title.replace(/\s*[|—-]\s*CyberScryb\s*$/i, '').trim();
  const desc = firstMatch(/<meta\s+name="description"[\s\S]*?content="([\s\S]*?)"\s*\/?>/i, c)
    || `${title} — free on CyberScryb. No signup.`;
  const url = firstMatch(/<link\s+rel="canonical"\s+href="([\s\S]*?)"/i, c) || 'https://cyberscryb.com/';

  const esc = (s) => s.replace(/"/g, '&quot;');
  const want = [
    ['og:title', `<meta property="og:title" content="${esc(title)}">`],
    ['og:description', `<meta property="og:description" content="${esc(desc)}">`],
    ['og:url', `<meta property="og:url" content="${esc(url)}">`],
    ['og:type', `<meta property="og:type" content="website">`],
    ['twitter:card', `<meta name="twitter:card" content="summary_large_image">`],
    ['twitter:title', `<meta name="twitter:title" content="${esc(title)}">`],
    ['twitter:description', `<meta name="twitter:description" content="${esc(desc)}">`],
    ['twitter:image', `<meta name="twitter:image" content="${PNG}">`],
  ];

  const missing = want.filter(([key]) => {
    const attr = key.startsWith('og:') ? 'property' : 'name';
    return !new RegExp(`${attr}="${key}"`).test(c);
  });
  if (missing.length === 0) continue;

  const block = '\n    ' + missing.map(([, tag]) => tag).join('\n    ');
  // Insert after the og:image meta (present on every page); fall back to description.
  const anchor = c.match(/<meta\s+property="og:image"[^>]*>/i)
    || c.match(/<meta\s+name="description"[\s\S]*?>/i);
  c = c.slice(0, anchor.index + anchor[0].length) + block + c.slice(anchor.index + anchor[0].length);

  fs.writeFileSync(file, c);
  tagsAdded += missing.length;
  console.log(`  +${missing.length} tags: ${path.relative(root, file)}`);
}

console.log(`\nog:image SVG→PNG swapped in ${imgSwapped} files; ${tagsAdded} meta tags added.`);
