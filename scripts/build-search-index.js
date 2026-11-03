// Builds search-index.json from the site's tools, guides, and blog posts.
// Run during the build (sync_and_build.py, after generate-pages.js) reading the
// final public/ tree, so pages the robots manager noindexed are excluded.
// The index powers the site-wide search page (/search/) and the homepage intent finder.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
// Source tree: argv[2] or public/ (post robots-manager). Writes next to the source.
const SITE = process.argv[2] ? path.resolve(ROOT, process.argv[2]) : path.join(ROOT, 'public');

const HTML_ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  mdash: '—',
  ndash: '–',
  hellip: '…',
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“',
};

function decodeEntities(text) {
  return text.replace(/&(#\d+|#x[0-9a-fA-F]+|[a-zA-Z]+);/g, (m, code) => {
    if (code[0] === '#') {
      const n =
        code[1] === 'x' || code[1] === 'X'
          ? parseInt(code.slice(2), 16)
          : parseInt(code.slice(1), 10);
      return Number.isNaN(n) ? m : String.fromCodePoint(n);
    }
    return Object.prototype.hasOwnProperty.call(HTML_ENTITIES, code) ? HTML_ENTITIES[code] : m;
  });
}

function stripTags(html) {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

function pickTitle(html) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? stripTags(m[1]) : '';
}

function pickDescription(html) {
  const m = html.match(/<meta[^>]+name=["']description["'][^>]*>/i);
  if (!m) return '';
  const c = m[0].match(/content=["']([\s\S]*?)["']/i);
  return c ? stripTags(c[1]) : '';
}

function pickH1(html) {
  const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return m ? stripTags(m[1]) : '';
}

function entriesFrom(dir, urlPrefix, type, skipNames) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    if (skipNames.has(name)) continue;
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    let file = null;
    let slug = null;
    if (stat.isDirectory()) {
      slug = name;
      file = path.join(full, 'index.html');
    } else if (stat.isFile() && name.endsWith('.html')) {
      slug = name.replace(/\.html$/, '');
      file = full;
    } else {
      continue;
    }
    if (!fs.existsSync(file)) continue;
    const html = fs.readFileSync(file, 'utf8');
    // Skip noindex pages; they should not surface in search.
    if (/<meta[^>]+name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html)) continue;
    const title = pickTitle(html);
    if (!title) continue;
    out.push({
      type,
      title,
      url: `${urlPrefix}${slug}/`,
      description: pickDescription(html) || pickH1(html),
    });
  }
  return out;
}

function main() {
  const tools = entriesFrom(path.join(SITE, 'tools'), '/tools/', 'tool', new Set(['shared']));
  const guides = entriesFrom(
    path.join(SITE, 'guides'),
    '/guides/',
    'guide',
    new Set(['index.html'])
  );
  const blog = entriesFrom(path.join(SITE, 'blog'), '/blog/', 'blog', new Set(['index.html']));
  const entries = [...tools, ...guides, ...blog];
  entries.sort((a, b) => a.url.localeCompare(b.url));
  const payload = {
    generated: new Date().toISOString().slice(0, 10),
    count: entries.length,
    entries,
  };
  const dest = path.join(SITE, 'search-index.json');
  fs.writeFileSync(dest, JSON.stringify(payload, null, 1) + '\n', 'utf8');
  console.log(
    `  🔎 search-index.json: ${entries.length} entries (${tools.length} tools, ${guides.length} guides, ${blog.length} blog)`
  );
}

main();
