const fs = require('fs');
const path = require('path');

function walk(d, a = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, a);
    else if (e.name.endsWith('.html')) a.push(p);
  }
  return a;
}

let emptyAlt = 0,
  noAlt = 0;
const samples = [];
for (const f of walk('public')) {
  const h = fs.readFileSync(f, 'utf8');
  const imgs = [...h.matchAll(/<img\b[^>]*>/gi)];
  for (const m of imgs) {
    const tag = m[0];
    if (!/\balt\s*=/.test(tag)) {
      noAlt++;
      if (samples.length < 15) samples.push('no-alt ' + f + ': ' + tag.slice(0, 100));
    } else if (/\balt\s*=\s*["']\s*["']/.test(tag)) {
      emptyAlt++;
      if (samples.length < 20) samples.push('empty ' + f + ': ' + tag.slice(0, 100));
    }
  }
}
console.log({ noAlt, emptyAlt });
samples.forEach((s) => console.log(s));
