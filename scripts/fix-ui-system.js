/**
 * Normalize status badges on tools.html + category badges on guides/index.html
 * - Rainbow NEW/AI badges → class tool-status-badge (brand terracotta only)
 * - Inline HARDSHIP/APPEALS/etc solid blocks → blog-tag + data-cat
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'public');

// ── tools.html status badges ──────────────────────────────────────
const toolsPath = path.join(root, 'tools.html');
let tools = fs.readFileSync(toolsPath, 'utf8');

// Match colored status divs that look like NEW / AI · NEW badges
const badgeRe =
  /<div\s+style="background:\s*[^"]+;\s*color:\s*[^"]+;\s*padding:\s*2px 8px;\s*border-radius:\s*4px;\s*display:\s*inline-block;\s*margin-bottom:\s*0\.5rem;\s*font-size:\s*0\.[78]rem;\s*font-weight:\s*700;"\s*>([\s\S]*?)<\/div>/gi;

tools = tools.replace(badgeRe, (full, inner) => {
  const text = inner
    .replace(/&middot;/g, '·')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  // Keep legal/life solid attention chips as structured tags where useful
  const lower = text.toLowerCase();
  if (
    lower.includes('new') ||
    lower.includes('ai') ||
    lower.includes('advanced') ||
    lower.includes('popular') ||
    lower.includes('interactive') ||
    lower.includes('life')
  ) {
    return `<span class="tool-status-badge">${inner.trim()}</span>`;
  }
  // LEGAL · FREE style → map to free tag + status
  if (lower.includes('legal') || lower.includes('free')) {
    return `<span class="tool-status-badge">${inner.trim()}</span>`;
  }
  return `<span class="tool-status-badge">${inner.trim()}</span>`;
});

// Bump CSS cache on tools page
tools = tools.replace(/style\.css\?v=[^"']+/, 'style.css?v=20260723ui-system');

fs.writeFileSync(toolsPath, tools, 'utf8');
console.log('tools.html badges normalized');

// ── guides/index.html category badges ─────────────────────────────
const guidesPath = path.join(root, 'guides', 'index.html');
let guides = fs.readFileSync(guidesPath, 'utf8');

const map = [
  [/HARDSHIP/i, 'hardship', 'Hardship'],
  [/APPEALS/i, 'appeals', 'Appeals'],
  [/FAMILY COURT|CUSTODY|PARENTING/i, 'family', 'Family Court'],
  [/CAREGIVER|MEMORY CARE|CNA/i, 'caregiver', 'Caregiver'],
  [/LIFE TOOLS|Life Tools/i, 'life', 'Life Tools'],
  [/DEVELOPER|Developer/i, 'developer', 'Developer'],
  [/SEO/i, 'seo', 'SEO'],
  [/JSON|CSV|Base64|Password|Color|Markdown|JWT/i, 'developer', 'Developer'],
  [/FREELANCE|Upwork/i, 'freelance', 'Freelance'],
  [/FINANCE|Payment|Budget/i, 'finance', 'Finance'],
];

// Inline solid badge divs
guides = guides.replace(
  /<div\s+style="background:\s*[^"]+;\s*color:\s*[^"]+;\s*padding:\s*2px 8px;\s*border-radius:\s*4px;\s*display:\s*inline-block;\s*margin-bottom:\s*0\.5rem;\s*font-size:\s*0\.75rem;\s*font-weight:\s*700;"\s*>([\s\S]*?)<\/div>/gi,
  (full, inner) => {
    const raw = inner.replace(/<[^>]+>/g, '').trim();
    for (const [re, cat, label] of map) {
      if (re.test(raw)) {
        return `<span class="blog-tag" data-cat="${cat}">${label}</span>`;
      }
    }
    return `<span class="blog-tag" data-cat="life">${raw}</span>`;
  }
);

// Ensure existing blog-tag Life Tools keep data-cat=life (already do)

guides = guides.replace(/style\.css\?v=[^"']+/, 'style.css?v=20260723ui-system');

// Inject price legend after hero if missing
if (!guides.includes('price-legend') && guides.includes('hero-title')) {
  const legend = `
            <ul class="price-legend" aria-label="Pricing labels" style="margin-top:1rem;">
                <li><span class="tag-free">Free</span> browser tools &amp; guides</li>
                <li><span class="tag-sample">Free sample</span> AI tools (then limits)</li>
                <li><span class="tag-pro">Pro</span> unlimited AI · $5/mo</li>
            </ul>`;
  guides = guides.replace(/(<\/div>\s*<\/section>)/, (m, g1, offset) => {
    // first hero close only — crude: replace first occurrence after Guides h1
    return legend + '\n        ' + g1;
  });
  // only first — redo carefully
}

// Simpler legend inject after first hero-container close
if ((guides.match(/price-legend/g) || []).length === 0) {
  guides = guides.replace(
    /(<h1[^>]*>[\s\S]*?<\/h1>\s*<p[^>]*>[\s\S]*?<\/p>)/,
    `$1
            <ul class="price-legend" aria-label="Pricing labels" style="margin-top:1.25rem;">
                <li><span class="tag-free">Free</span> guides &amp; browser tools</li>
                <li><span class="tag-sample">Free sample</span> AI tools (then limits)</li>
                <li><span class="tag-pro">Pro</span> unlimited AI · $5/mo</li>
            </ul>`
  );
}

fs.writeFileSync(guidesPath, guides, 'utf8');
console.log('guides/index.html badges + legend');

// ── blog index: ad slot class + css version ────────────────────────
const blogPath = path.join(root, 'blog', 'index.html');
let blog = fs.readFileSync(blogPath, 'utf8');
blog = blog.replace(/style\.css\?v=[^"']+/g, 'style.css?v=20260723ui-system');
// Wrap top adsense in collapsible slot
if (!blog.includes('blog-ad-slot')) {
  blog = blog.replace(
    /<!-- Top AdSense Unit -->\s*<section style="max-width: 900px; margin: 0 auto 1\.5rem; padding: 0 1rem; text-align: center;">/,
    `<!-- Top AdSense Unit -->
        <section class="blog-ad-slot" style="max-width: 900px; margin: 0 auto 0.75rem; padding: 0 1rem; text-align: center; min-height: 0;">`
  );
}
// Curator nav class
blog = blog.replace(
  /href="https:\/\/curator\.cyberscryb\.com"([^>]*)>/g,
  'href="https://curator.cyberscryb.com" class="nav-curator"$1>'
);
// avoid double class
blog = blog.replace(/class="nav-curator" class="nav-curator"/g, 'class="nav-curator"');
blog = blog.replace(
  /class="nav-curator" target="_blank" style="color:var\(--attention\);font-weight:600;"/g,
  'class="nav-curator" target="_blank" rel="noopener"'
);
fs.writeFileSync(blogPath, blog, 'utf8');
console.log('blog/index.html ad slot + css bump');

// ── homepage legend under free tools + css bump ───────────────────
const homePath = path.join(root, 'index.html');
let home = fs.readFileSync(homePath, 'utf8');
home = home.replace(/style\.css\?v=[^"']+/g, 'style.css?v=20260723ui-system');
if (!home.includes('id="free-tools-legend"') && home.includes('id="free-tools-heading"')) {
  home = home.replace(
    /(<h2 id="free-tools-heading">Free tools<\/h2>\s*)/,
    `$1
                    <ul class="price-legend" id="free-tools-legend" aria-label="Pricing labels" style="justify-content:flex-start;margin:0.5rem 0 1rem;">
                        <li><span class="tag-free">Free</span> no account</li>
                        <li><span class="tag-sample">Free sample</span> AI (then limits)</li>
                        <li><span class="tag-pro">Pro</span> unlimited · $5/mo</li>
                    </ul>
`
  );
}
// Curator in nav if present
home = home.replace(
  /href="https:\/\/curator\.cyberscryb\.com"(?![^>]*nav-curator)/g,
  'href="https://curator.cyberscryb.com" class="nav-curator"'
);
fs.writeFileSync(homePath, home, 'utf8');
console.log('index.html free-tools legend');

console.log('done');
