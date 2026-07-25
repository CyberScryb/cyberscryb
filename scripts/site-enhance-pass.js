/**
 * CyberScryb site enhancement pass
 * - Internal linking: ensure blog/guides have tool CTAs
 * - FAQPage schema injection where HTML FAQs exist without JSON-LD
 * - Related-tool panels for key tools missing them
 * - Footer brand line consistency on sitewide pages
 * - Sitemap coverage for new SEO pages
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'public');
let changed = 0;

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name.endsWith('.html')) acc.push(p);
  }
  return acc;
}

function writeIfChanged(file, next) {
  const prev = fs.readFileSync(file, 'utf8');
  if (prev === next) return false;
  fs.writeFileSync(file, next, 'utf8');
  changed++;
  console.log('updated', path.relative(ROOT, file));
  return true;
}

// ── Content → primary tool map ─────────────────────────────────────
const CONTENT_TOOL_MAP = {
  // blog
  'how-to-make-ai-text-sound-human-2026.html': {
    tool: '/tools/humanizer/',
    label: 'Open AI Humanizer (free sample)',
    related: [
      ['/tools/ai-writing-suite/', 'AI Writing Suite'],
      ['/tools/paraphraser/', 'AI Paraphraser'],
      ['/tools/ai-detector/', 'AI Detector'],
    ],
  },
  'free-upwork-proposal-generator-2026.html': {
    tool: '/tools/gig-auto-pilot/',
    label: 'Open Gig Auto-Pilot (free sample)',
    related: [
      ['/tools/resume-bullets/', 'Resume Bullets'],
      ['/tools/email-writer/', 'Email Writer'],
      ['/tools/bio-generator/', 'Bio Generator'],
    ],
  },
  'how-to-write-a-hardship-letter-2026.html': {
    tool: '/tools/hardship-letter/',
    label: 'Write a hardship letter free',
    related: [
      ['/tools/utility-shutoff-letter/', 'Utility Shutoff Letter'],
      ['/tools/appeal-letter/', 'Appeal Letter'],
      ['/tools/budget-planner/', 'Budget Planner'],
    ],
  },
  'how-to-appeal-unemployment-denial-2026.html': {
    tool: '/tools/appeal-letter/',
    label: 'Draft your unemployment appeal free',
    related: [
      ['/tools/hardship-letter/', 'Hardship Letter'],
      ['/tools/sap-appeal-letter/', 'SAP Aid Appeal'],
      ['/tools/insurance-denial-appeal/', 'Insurance Appeal'],
    ],
  },
  'unemployment-hearing-checklist-2026.html': {
    tool: '/tools/appeal-letter/',
    label: 'Open Appeal Letter Generator',
    related: [['/tools/hardship-letter/', 'Hardship Letter']],
  },
  'what-goes-in-a-caregiver-shift-report-2026.html': {
    tool: '/tools/caregiver-report/',
    label: 'Generate a caregiver shift report',
    related: [
      ['/tools/behavioral-log/', 'ABC Behavioral Log'],
      ['/tools/med-administration-log/', 'Med Admin Log'],
    ],
  },
  'court-admissible-parenting-plan-guide.html': {
    tool: '/tools/custody-document/',
    label: 'Draft a parenting plan',
    related: [
      ['/tools/child-support-calculator/', 'Child Support Calculator'],
      ['/tools/spousal-support-calculator/', 'Spousal Support Calculator'],
    ],
  },
  'dementia-custody-evidence-guide-2026.html': {
    tool: '/tools/custody-document/',
    label: 'Open Custody Document Drafter',
    related: [
      ['/tools/behavioral-log/', 'ABC Behavioral Log'],
      ['/tools/caregiver-report/', 'Caregiver Report'],
    ],
  },
  'behavioral-spike-tracking-memory-care-2026.html': {
    tool: '/tools/behavioral-log/',
    label: 'Open ABC Behavioral Log',
    related: [
      ['/tools/caregiver-report/', 'Caregiver Report'],
      ['/tools/med-administration-log/', 'Med Admin Log'],
    ],
  },
  'free-password-strength-checker-2026.html': {
    tool: '/tools/password-checker/',
    label: 'Check password strength (local)',
    related: [['/tools/hash-generator/', 'Hash Generator']],
  },
  'seo-tag-generators-gate-meta-2026.html': {
    tool: '/tools/seo-tag-generator/',
    label: 'Generate SEO meta tags free',
    related: [
      ['/tools/meta-description/', 'AI Meta Descriptions'],
      ['/tools/slug-generator/', 'Slug Generator'],
    ],
  },
  'cron-expression-builder-online-2026.html': {
    tool: '/tools/cron-builder/',
    label: 'Open Cron Expression Builder',
    related: [],
  },
  'why-vanilla-js-no-frameworks-2026.html': {
    tool: '/tools/',
    label: 'Browse free browser tools',
    related: [
      ['/tools/json-formatter/', 'JSON Formatter'],
      ['/tools/regex-tester/', 'Regex Tester'],
    ],
  },
  // guides
  'how-to-write-a-mortgage-hardship-letter.html': {
    tool: '/tools/hardship-letter/',
    label: 'Generate mortgage hardship letter',
    related: [['/tools/budget-planner/', 'Budget Planner']],
  },
  'how-to-write-a-medical-hardship-letter.html': {
    tool: '/tools/hardship-letter/',
    label: 'Generate medical hardship letter',
    related: [['/tools/insurance-denial-appeal/', 'Insurance Appeal']],
  },
  'how-to-write-a-student-loan-hardship-letter.html': {
    tool: '/tools/hardship-letter/',
    label: 'Generate student loan hardship letter',
    related: [['/tools/sap-appeal-letter/', 'SAP Appeal']],
  },
  'how-to-appeal-an-unemployment-denial.html': {
    tool: '/tools/appeal-letter/',
    label: 'Write unemployment appeal free',
    related: [],
  },
  'how-to-appeal-an-insurance-claim-denial.html': {
    tool: '/tools/insurance-denial-appeal/',
    label: 'Draft insurance denial appeal',
    related: [['/tools/appeal-letter/', 'General Appeal Letter']],
  },
  'how-to-appeal-a-housing-denial.html': {
    tool: '/tools/appeal-letter/',
    label: 'Write housing appeal letter',
    related: [['/tools/landlord-tenant-letter/', 'Landlord & Tenant Letters']],
  },
  'how-to-write-a-parenting-plan.html': {
    tool: '/tools/custody-document/',
    label: 'Draft parenting plan free',
    related: [['/tools/child-support-calculator/', 'Child Support Calculator']],
  },
  'when-to-request-a-custody-modification.html': {
    tool: '/tools/custody-document/',
    label: 'Draft custody modification request',
    related: [],
  },
  'caregiver-shift-handoff-standards.html': {
    tool: '/tools/caregiver-report/',
    label: 'Generate shift report free',
    related: [['/tools/behavioral-log/', 'Behavioral Log']],
  },
  'documenting-cognitive-decline-for-doctors-and-courts.html': {
    tool: '/tools/behavioral-log/',
    label: 'Open ABC Behavioral Log',
    related: [['/tools/caregiver-report/', 'Caregiver Report']],
  },
  'json-to-csv.html': {
    tool: '/tools/json-csv-converter/',
    label: 'Convert JSON ↔ CSV free',
    related: [['/tools/json-formatter/', 'JSON Formatter']],
  },
  'csv-to-json-converter-online.html': {
    tool: '/tools/json-csv-converter/',
    label: 'Convert CSV ↔ JSON free',
    related: [],
  },
  'how-to-convert-json-to-csv-in-excel.html': {
    tool: '/tools/json-csv-converter/',
    label: 'Use free JSON ↔ CSV converter',
    related: [],
  },
  'json-to-csv-with-nested-objects.html': {
    tool: '/tools/json-csv-converter/',
    label: 'Flatten nested JSON to CSV',
    related: [],
  },
  'json-vs-csv-when-to-use-each.html': {
    tool: '/tools/json-csv-converter/',
    label: 'Open JSON ↔ CSV tool',
    related: [],
  },
  'how-to-format-json-data.html': {
    tool: '/tools/json-formatter/',
    label: 'Format & validate JSON free',
    related: [],
  },
  'how-strong-is-my-password.html': {
    tool: '/tools/password-checker/',
    label: 'Check password strength (local)',
    related: [],
  },
  'password-entropy-explained.html': {
    tool: '/tools/password-checker/',
    label: 'Test password entropy free',
    related: [],
  },
  'how-to-check-if-password-has-been-leaked.html': {
    tool: '/tools/password-checker/',
    label: 'Open password strength checker',
    related: [],
  },
  'meta-tag-generator-for-seo.html': {
    tool: '/tools/seo-tag-generator/',
    label: 'Generate meta tags free',
    related: [['/tools/meta-description/', 'AI Meta Descriptions']],
  },
  'open-graph-tags-guide.html': {
    tool: '/tools/seo-tag-generator/',
    label: 'Generate Open Graph tags',
    related: [],
  },
  'seo-checklist-for-new-websites.html': {
    tool: '/tools/seo-tag-generator/',
    label: 'SEO meta generator free',
    related: [],
  },
  'base64-encode-decode-guide.html': {
    tool: '/tools/base64-tool/',
    label: 'Encode/decode Base64 free',
    related: [],
  },
  'base64-image-encoder.html': {
    tool: '/tools/base64-tool/',
    label: 'Open Base64 tool',
    related: [],
  },
  'color-contrast-checker-wcag.html': {
    tool: '/tools/contrast-checker/',
    label: 'Check WCAG contrast free',
    related: [['/tools/color-palette/', 'Color Palette']],
  },
  'color-palette-generator-for-websites.html': {
    tool: '/tools/color-palette/',
    label: 'Generate color palette free',
    related: [['/tools/contrast-checker/', 'Contrast Checker']],
  },
  'css-glassmorphism-generator-guide.html': {
    tool: '/tools/glassmorphism-generator/',
    label: 'Open glassmorphism generator',
    related: [],
  },
  'hex-vs-rgb-vs-hsl-color-formats.html': {
    tool: '/tools/color-palette/',
    label: 'Open color palette tool',
    related: [],
  },
  'markdown-to-html-converter-guide.html': {
    tool: '/tools/markdown-html/',
    label: 'Convert Markdown to HTML free',
    related: [],
  },
  'markdown-cheat-sheet.html': {
    tool: '/tools/markdown-html/',
    label: 'Markdown → HTML converter',
    related: [],
  },
  'json-web-token-decoder-hash-generator.html': {
    tool: '/tools/jwt-decoder/',
    label: 'Decode JWT free (local)',
    related: [['/tools/hash-generator/', 'Hash Generator']],
  },
  'best-free-developer-tools-online.html': {
    tool: '/tools/',
    label: 'Browse all free tools',
    related: [
      ['/tools/humanizer/', 'AI Humanizer'],
      ['/tools/json-csv-converter/', 'JSON ↔ CSV'],
    ],
  },
};

function relatedPanel(map) {
  const links = [
    [map.tool, map.label],
    ...(map.related || []),
  ];
  const cards = links
    .map(
      ([href, text]) =>
        `<a class="cs-ilink-card" href="${href}"><strong>${escapeHtml(text)}</strong><span>Open →</span></a>`
    )
    .join('\n');
  return `
<section class="cs-ilink-panel" aria-label="Related tools">
  <style>
    .cs-ilink-panel{max-width:760px;margin:2.5rem auto;padding:1.5rem 1.25rem;border:1px solid rgba(194,65,12,.25);border-radius:14px;background:linear-gradient(145deg,rgba(194,65,12,.06),rgba(255,255,255,.6))}
    .cs-ilink-panel h2{margin:0 0 1rem;font-size:1.15rem;text-align:center;color:var(--text,#2C1810)}
    .cs-ilink-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:.75rem}
    .cs-ilink-card{display:flex;flex-direction:column;gap:.35rem;padding:1rem;border-radius:10px;border:1px solid rgba(22,20,17,.1);background:#fff;text-decoration:none;color:inherit;transition:border-color .15s,transform .15s}
    .cs-ilink-card:hover{border-color:var(--primary,#C2410C);transform:translateY(-2px)}
    .cs-ilink-card strong{color:var(--primary-soft,#E05A2B);font-size:.95rem}
    .cs-ilink-card span{font-size:.8rem;color:var(--text-muted,#6B5344)}
  </style>
  <h2>Use the free tool</h2>
  <div class="cs-ilink-grid">
${cards}
  </div>
</section>`;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function ensureContentInternalLinks() {
  for (const [file, map] of Object.entries(CONTENT_TOOL_MAP)) {
    const blogPath = path.join(ROOT, 'blog', file);
    const guidePath = path.join(ROOT, 'guides', file);
    const filePath = fs.existsSync(blogPath) ? blogPath : fs.existsSync(guidePath) ? guidePath : null;
    if (!filePath) {
      console.warn('missing content file', file);
      continue;
    }
    let html = fs.readFileSync(filePath, 'utf8');
    // Ensure primary tool is linked at least once
    if (!html.includes(map.tool)) {
      console.warn(file, 'missing tool link — will inject panel only');
    }
    if (html.includes('cs-ilink-panel')) continue;
    const panel = relatedPanel(map);
    if (/<\/article>/i.test(html)) {
      html = html.replace(/<\/article>/i, panel + '\n</article>');
    } else if (/<\/main>/i.test(html)) {
      html = html.replace(/<\/main>/i, panel + '\n</main>');
    } else if (/<footer/i.test(html)) {
      html = html.replace(/<footer/i, panel + '\n<footer');
    } else {
      html += panel;
    }
    writeIfChanged(filePath, html);
  }
}

// ── FAQPage schema from visible FAQ blocks ─────────────────────────
function extractFaqsFromHtml(html) {
  const faqs = [];
  // details/summary pattern
  const detailsRe = /<details[^>]*>\s*<summary[^>]*>([\s\S]*?)<\/summary>\s*<p[^>]*>([\s\S]*?)<\/p>\s*<\/details>/gi;
  let m;
  while ((m = detailsRe.exec(html))) {
    faqs.push({ q: stripTags(m[1]), a: stripTags(m[2]) });
  }
  // faq-item h4 + p
  const itemRe = /<div class="faq-item"[^>]*>\s*<h4[^>]*>([\s\S]*?)<\/h4>\s*<p[^>]*>([\s\S]*?)<\/p>\s*<\/div>/gi;
  while ((m = itemRe.exec(html))) {
    faqs.push({ q: stripTags(m[1]), a: stripTags(m[2]) });
  }
  // h2 FAQ then h3/p pairs (blog style)
  if (/<h2[^>]*>\s*FAQ\s*<\/h2>/i.test(html) || /<h2[^>]*>Frequently Asked/i.test(html)) {
    const h3Re = /<h3[^>]*>([\s\S]*?)<\/h3>\s*<p[^>]*>([\s\S]*?)<\/p>/gi;
    // only after FAQ heading - approximate by scanning all h3 near end
    let count = 0;
    while ((m = h3Re.exec(html)) && count < 12) {
      const q = stripTags(m[1]);
      if (q.length > 10 && q.includes('?')) {
        faqs.push({ q, a: stripTags(m[2]) });
        count++;
      }
    }
  }
  // dedupe by question
  const seen = new Set();
  return faqs.filter((f) => {
    const k = f.q.toLowerCase();
    if (seen.has(k) || f.q.length < 8 || f.a.length < 20) return false;
    seen.add(k);
    return true;
  });
}

function stripTags(s) {
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&mdash;/g, '—')
    .replace(/&rsquo;/g, "'")
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function faqSchemaBlock(faqs) {
  const entities = faqs.map((f) => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  }));
  return (
    '\n<script type="application/ld+json">\n' +
    JSON.stringify(
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: entities,
      },
      null,
      2
    ) +
    '\n</script>\n'
  );
}

function ensureFaqSchema() {
  const files = walk(ROOT);
  for (const file of files) {
    let html = fs.readFileSync(file, 'utf8');
    if (html.includes('"@type": "FAQPage"') || html.includes('"@type":"FAQPage"')) continue;
    const faqs = extractFaqsFromHtml(html);
    if (faqs.length < 2) continue;
    const block = faqSchemaBlock(faqs.slice(0, 8));
    if (/<\/head>/i.test(html)) {
      html = html.replace(/<\/head>/i, block + '</head>');
    } else {
      html += block;
    }
    writeIfChanged(file, html);
  }
}

// ── Footer brand line ──────────────────────────────────────────────
const FOOTER_OLD = [
  'Free, privacy-first developer tools. Your data never leaves your browser.',
  'Free, privacy-first developer tools.',
  'No social media. No distractions. Just tools that work.',
];
const FOOTER_NEW = 'Free browser tools and AI writers for freelancers and builders.';

function ensureFooterCopy() {
  for (const file of walk(ROOT)) {
    let html = fs.readFileSync(file, 'utf8');
    let next = html;
    for (const old of FOOTER_OLD) {
      next = next.split(old).join(FOOTER_NEW);
    }
    writeIfChanged(file, next);
  }
}

// ── Fix mojibake related headings ──────────────────────────────────
function fixMojibake() {
  for (const file of walk(ROOT)) {
    let html = fs.readFileSync(file, 'utf8');
    let next = html
      .replace(/Related Guides/g, 'Related Guides')
      .replace(/\?\? Related Guides/g, 'Related Guides')
      .replace(/Try the Tool/g, 'Try the Tool')
      .replace(/\?\?\? Try the Tool/g, 'Try the Tool');
    // common broken arrows
    next = next.replace(/Generator \?<\/a>/g, 'Generator →</a>');
    writeIfChanged(file, next);
  }
}

// ── Sitemap: ensure new SEO hub pages ──────────────────────────────
function ensureSitemapUrls(urls) {
  const smPath = path.join(ROOT, 'sitemap.xml');
  let sm = fs.readFileSync(smPath, 'utf8');
  let added = 0;
  for (const url of urls) {
    if (sm.includes(`<loc>${url}</loc>`)) continue;
    const entry = `  <url><loc>${url}</loc><lastmod>2026-07-22</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>\n`;
    sm = sm.replace('</urlset>', entry + '</urlset>');
    added++;
  }
  if (added) {
    fs.writeFileSync(smPath, sm, 'utf8');
    changed++;
    console.log('sitemap +', added, 'urls');
  }
}

function main() {
  console.log('=== site enhance pass ===');
  ensureContentInternalLinks();
  ensureFaqSchema();
  ensureFooterCopy();
  fixMojibake();
  console.log('files changed:', changed);
}

main();

module.exports = { ensureSitemapUrls, CONTENT_TOOL_MAP };
