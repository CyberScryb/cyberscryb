/**
 * Add aria-label to tool textareas/inputs that only have placeholders.
 * Skips elements that already have aria-label, aria-labelledby, or a matching <label for>.
 */
const fs = require('fs');
const path = require('path');

const toolsDir = path.join(__dirname, '..', 'public', 'tools');
let fixed = 0;

function walk(d, acc = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory() && e.name !== 'shared') walk(p, acc);
    else if (e.name === 'index.html') acc.push(p);
  }
  return acc;
}

for (const file of walk(toolsDir)) {
  let html = fs.readFileSync(file, 'utf8');
  const orig = html;

  // textarea with id + placeholder, no aria-label
  html = html.replace(
    /<textarea([^>]*\bid=["']([^"']+)["'][^>]*)>/gi,
    (full, attrs, id) => {
      if (/aria-label\s*=/i.test(attrs) || /aria-labelledby\s*=/i.test(attrs)) return full;
      if (new RegExp(`<label[^>]+for=["']${id}["']`, 'i').test(html)) return full;
      const ph = (attrs.match(/placeholder=["']([^"']*)["']/i) || [])[1] || 'Text input';
      const label = ph.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
      if (/aria-label/i.test(full)) return full;
      return `<textarea${attrs} aria-label="${label}">`;
    }
  );

  // input text/search with placeholder, no aria-label, no label
  html = html.replace(
    /<input([^>]*\btype=["'](?:text|search|email|url|password)["'][^>]*)>/gi,
    (full, attrs) => {
      if (/aria-label\s*=/i.test(attrs) || /aria-labelledby\s*=/i.test(attrs)) return full;
      const idM = attrs.match(/\bid=["']([^"']+)["']/i);
      if (idM && new RegExp(`<label[^>]+for=["']${idM[1]}["']`, 'i').test(html)) return full;
      const ph = (attrs.match(/placeholder=["']([^"']*)["']/i) || [])[1];
      if (!ph) return full;
      return `<input${attrs} aria-label="${ph.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}">`;
    }
  );

  if (html !== orig) {
    fs.writeFileSync(file, html, 'utf8');
    fixed++;
    console.log('a11y', path.relative(toolsDir, file));
  }
}
console.log('files fixed', fixed);
