const fs = require('fs');
const path = require('path');

function walk(d, acc = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name.endsWith('.html')) acc.push(p);
  }
  return acc;
}

const files = walk('public');
const missing = new Map();
const hrefRe = /href=["'](\/[^"'#?]+)/g;

for (const f of files) {
  const html = fs.readFileSync(f, 'utf8');
  let m;
  while ((m = hrefRe.exec(html))) {
    const href = m[1];
    if (href.startsWith('//')) continue;

    if (/\.(css|js|png|jpg|jpeg|webp|svg|xml|json|ico|txt|woff2?|gif|map)$/i.test(href)) {
      const assetPath = path.join('public', href.replace(/^\//, ''));
      if (!fs.existsSync(assetPath)) {
        if (!missing.has(href)) missing.set(href, []);
        if (missing.get(href).length < 2) missing.get(href).push(f);
      }
      continue;
    }

    const rel = href.replace(/\/$/, '') || '/index';
    const cands = [
      path.join('public', rel.slice(1) + '.html'),
      path.join('public', rel.slice(1), 'index.html'),
      path.join('public', rel.slice(1)),
    ];
    if (!cands.some(c => fs.existsSync(c))) {
      if (!missing.has(href)) missing.set(href, []);
      if (missing.get(href).length < 2) missing.get(href).push(f);
    }
  }
}

console.log('Broken internal links:', missing.size);
[...missing.entries()]
  .sort((a, b) => a[0].localeCompare(b[0]))
  .forEach(([k, v]) => console.log(k, '←', v.join(', ')));
