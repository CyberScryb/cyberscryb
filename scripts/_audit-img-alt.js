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
const noAltSamples = [];
const emptyAltSamples = [];
for (const f of walk('public')) {
  const h = fs.readFileSync(f, 'utf8').replace(/<script[\s\S]*?<\/script>/gi, '');
  const imgs = [...h.matchAll(/<img\b[^>]*>/gi)];
  for (const m of imgs) {
    const tag = m[0];
    if (!/\balt\s*=/.test(tag)) {
      noAlt++;
      if (noAltSamples.length < 15) noAltSamples.push('no-alt ' + f + ': ' + tag.slice(0, 100));
    } else if (/\balt\s*=\s*["']\s*["']/.test(tag)) {
      emptyAlt++;
      if (emptyAltSamples.length < 20)
        emptyAltSamples.push('empty ' + f + ': ' + tag.slice(0, 100));
    }
  }
}
console.log({ noAlt, emptyAlt });
noAltSamples.forEach(s => console.log(s));
emptyAltSamples.forEach(s => console.log(s));
