const fs = require('fs');
const html = fs.readFileSync('public/tools.html', 'utf8');

// Extract categoryMapping from the page script
const mapMatch = html.match(/const categoryMapping = \{([\s\S]*?)\n\s*\};/);
if (!mapMatch) {
  console.error('categoryMapping not found');
  process.exit(1);
}
// eslint-disable-next-line no-eval
const categoryMapping = eval('({' + mapMatch[1] + '})');
const keys = Object.keys(categoryMapping).sort((a, b) => b.length - a.length);

const re = /<h3><a href="([^"]+)"[^>]*>([^<]*)<\/a><\/h3>/g;
let m;
const ai = [];
const byCat = { ai: 0, developer: 0, legal: 0, writing: 0, finance: 0 };
let total = 0;

while ((m = re.exec(html))) {
  total++;
  const href = m[1];
  const title = m[2].replace(/&amp;/g, '&');
  const cats = new Set();
  let matched = false;
  for (const key of keys) {
    if (href.includes('/' + key + '/') || href.endsWith('/' + key)) {
      categoryMapping[key].forEach(c => cats.add(c));
      matched = true;
      break;
    }
  }
  if (/\bai\b/i.test(title)) cats.add('ai');
  if (href.includes('curator.cyberscryb.com')) cats.add('ai');
  if (!matched && cats.size === 0) cats.add('developer');

  for (const c of cats) {
    if (byCat[c] !== undefined) byCat[c]++;
  }
  if (cats.has('ai')) ai.push({ title, href: href, cats: [...cats].join(',') });
}

// unique by href for AI
const seen = new Set();
const uniqueAi = ai.filter(x => {
  if (seen.has(x.href)) return false;
  seen.add(x.href);
  return true;
});

console.log('Total tool cards (incl Popular dupes):', total);
console.log('Category card counts (with multi-tag):', byCat);
console.log('Unique AI tools:', uniqueAi.length);
uniqueAi
  .sort((a, b) => a.title.localeCompare(b.title))
  .forEach(x => {
    console.log('  -', x.title, '→', x.cats);
  });

// tools on disk not linked
const dirs = fs
  .readdirSync('public/tools', { withFileTypes: true })
  .filter(d => d.isDirectory() && d.name !== 'shared' && d.name !== 'distill')
  .map(d => d.name);
const onPage = new Set();
const hrefRe = /href="\/tools\/([^"/]+)\/"/g;
let h;
while ((h = hrefRe.exec(html))) onPage.add(h[1]);
const missing = dirs.filter(d => !onPage.has(d));
console.log('Dirs not on tools page:', missing.length ? missing.join(', ') : '(none)');
