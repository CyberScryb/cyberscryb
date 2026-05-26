#!/usr/bin/env node
/**
 * audit-inventory.js
 * Cross-references every tool on CyberScryb against all registries it should appear in.
 * Usage: node scripts/audit-inventory.js [--check]
 * --check: silent mode, exits 1 if new orphans exist outside the known exceptions allowlist
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CHECK_MODE = process.argv.includes('--check');

// ─── Known exceptions allowlist (exit 0 for these in --check mode) ───────────
const KNOWN_EXCEPTIONS = new Set([
  'humanizer',        // uses /api/rewrite endpoint, not /api/ai-generate
  'gig-auto-pilot',   // uses /api/gig endpoint
  'distill',          // landing page only (no index.html in dir yet)
  'fluid-sim',        // visual/interactive tool, no AI prompt needed
  'shared',           // helper directory, not a tool
  'ai-writing-suite', // complete tool, needs wiring — not an orphan
]);

// ─── AI prompt keys that use different API routes (not orphans) ──────────────
const NON_STANDARD_API_PROMPTS = new Set([
  // These are in AI_PROMPTS but tool frontends exist and use different API routes
]);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return '';
  }
}

function extractAIPromptKeys(functionsIndexJs) {
  const keys = [];
  // Match lines like: 'key-name': { at the top level of AI_PROMPTS
  // We find the AI_PROMPTS block first
  const aiPromptsMatch = functionsIndexJs.match(/const AI_PROMPTS\s*=\s*\{([\s\S]*?)^\};/m);
  if (!aiPromptsMatch) {
    // Fallback: match all quoted keys followed by colon and opening brace
    const fallback = functionsIndexJs.matchAll(/^\s+'([a-z][a-z0-9-]*)'\s*:\s*\{/gm);
    for (const m of fallback) keys.push(m[1]);
    return keys;
  }
  const block = aiPromptsMatch[1];
  const keyPattern = /^\s+'([a-z][a-z0-9-]*)'\s*:/gm;
  let m;
  while ((m = keyPattern.exec(block)) !== null) {
    keys.push(m[1]);
  }
  return keys;
}

function extractToolsHtmlHrefs(toolsHtml) {
  const tools = new Set();
  const pattern = /href="\/tools\/([^/"]+)\/"/g;
  let m;
  while ((m = pattern.exec(toolsHtml)) !== null) {
    tools.add(m[1]);
  }
  return tools;
}

function extractSitemapLocs(sitemapXml) {
  const tools = new Set();
  const pattern = /<loc>https?:\/\/[^/]+\/tools\/([^/"<]+)\/<\/loc>/g;
  let m;
  while ((m = pattern.exec(sitemapXml)) !== null) {
    tools.add(m[1]);
  }
  return tools;
}

function extractHomepageDropdown(indexHtml) {
  const tools = new Set();
  // Match <option value="tools/tool-name/index.html"> or similar
  const pattern = /<option\s+value="tools\/([^/"]+)\/[^"]*"/g;
  let m;
  while ((m = pattern.exec(indexHtml)) !== null) {
    tools.add(m[1]);
  }
  return tools;
}

function getToolDirs() {
  const toolsDir = path.join(ROOT, 'public', 'tools');
  try {
    return fs.readdirSync(toolsDir).filter(name => {
      const full = path.join(toolsDir, name);
      return fs.statSync(full).isDirectory();
    });
  } catch {
    return [];
  }
}

function guessCategory(toolName, aiPromptKeys) {
  const lifeTools = new Set([
    'hardship-letter', 'appeal-letter', 'custody-document',
    'caregiver-report', 'budget-planner',
  ]);
  const aiWritingTools = new Set([
    'summarizer', 'email-writer', 'bio-generator', 'product-description',
    'code-explainer', 'meta-description', 'ai-detector', 'paraphraser',
    'tweet-generator', 'resume-bullets', 'voice-writer', 'humanizer',
    'linkedin-post', 'cold-email', 'job-description', 'press-release',
    'seo-title',
  ]);
  const devTools = new Set([
    'base64-tool', 'json-formatter', 'json-csv-converter', 'password-checker',
    'hash-generator', 'uuid-generator', 'url-encoder', 'jwt-decoder',
    'regex-tester', 'epoch-converter', 'case-converter', 'lorem-ipsum',
    'markdown-html', 'html-entity', 'text-diff', 'slug-generator',
    'seo-tag-generator', 'color-palette', 'qr-generator', 'cron-builder',
    'word-counter', 'privacy-generator',
  ]);
  const specialTools = new Set([
    'ai-writing-suite', 'distill', 'fluid-sim', 'gig-auto-pilot', 'shared',
  ]);

  if (lifeTools.has(toolName)) return 'life-tool';
  if (aiWritingTools.has(toolName)) return 'ai-writing';
  if (devTools.has(toolName)) return 'dev-tool';
  if (specialTools.has(toolName)) return 'special';
  if (aiPromptKeys.includes(toolName)) return 'ai-writing';
  return 'dev-tool';
}

function checkToolAttributes(toolName) {
  const toolDir = path.join(ROOT, 'public', 'tools', toolName);
  const indexPath = path.join(toolDir, 'index.html');

  const hasDir = fs.existsSync(toolDir);
  const hasIndexHtml = fs.existsSync(indexPath);

  let hasJsonLd = false;
  let hasBlogNavLink = false;
  let hasBreadcrumbs = false;
  let hasCanonical = false;
  let legacyFiles = [];

  if (hasIndexHtml) {
    const content = readFile(indexPath);
    hasJsonLd = content.includes('"@type": "SoftwareApplication"') ||
                content.includes('"@type":"SoftwareApplication"');
    hasBlogNavLink = /href="[^"]*\/blog\//i.test(content) ||
                     /href="[^"]*\/blog"/i.test(content);
    hasBreadcrumbs = /breadcrumb/i.test(content);
    hasCanonical = content.includes('rel="canonical"');
  }

  // Check for legacy files: index_v*.html alongside index.html
  if (hasDir) {
    try {
      const files = fs.readdirSync(toolDir);
      legacyFiles = files.filter(f => /^index_v\d+.*\.html$/.test(f));
    } catch {
      legacyFiles = [];
    }
  }

  return {
    hasDir,
    hasIndexHtml,
    hasJsonLd,
    hasBlogNavLink,
    hasBreadcrumbs,
    hasCanonical,
    legacyFiles,
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  // Load source files
  const functionsIndexJs = readFile(path.join(ROOT, 'functions', 'index.js'));
  const toolsHtml = readFile(path.join(ROOT, 'public', 'tools.html'));
  const sitemapXml = readFile(path.join(ROOT, 'public', 'sitemap.xml'));
  const indexHtml = readFile(path.join(ROOT, 'public', 'index.html'));

  // Extract registries
  const aiPromptKeys = extractAIPromptKeys(functionsIndexJs);
  const inToolsHtml = extractToolsHtmlHrefs(toolsHtml);
  const inSitemap = extractSitemapLocs(sitemapXml);
  const inHomepageDropdown = extractHomepageDropdown(indexHtml);

  // Get all tool directories
  const toolDirs = getToolDirs();

  // Build a superset of all known tool names
  const allToolNames = new Set([
    ...toolDirs,
    ...aiPromptKeys,
    ...Array.from(inToolsHtml),
    ...Array.from(inSitemap),
    ...Array.from(inHomepageDropdown),
  ]);

  // Build per-tool report rows
  const rows = [];
  for (const toolName of Array.from(allToolNames).sort()) {
    const attrs = checkToolAttributes(toolName);
    const category = guessCategory(toolName, aiPromptKeys);

    rows.push({
      tool: toolName,
      category,
      has_directory: attrs.hasDir ? 'yes' : 'no',
      in_AI_PROMPTS: aiPromptKeys.includes(toolName) ? 'yes' : 'no',
      in_tools_html: inToolsHtml.has(toolName) ? 'yes' : 'no',
      in_sitemap: inSitemap.has(toolName) ? 'yes' : 'no',
      in_homepage_dropdown: inHomepageDropdown.has(toolName) ? 'yes' : 'no',
      has_index_html: attrs.hasIndexHtml ? 'yes' : 'no',
      has_json_ld: attrs.hasJsonLd ? 'yes' : 'no',
      has_blog_nav_link: attrs.hasBlogNavLink ? 'yes' : 'no',
      has_breadcrumbs: attrs.hasBreadcrumbs ? 'yes' : 'no',
      has_canonical: attrs.hasCanonical ? 'yes' : 'no',
      legacy_files: attrs.legacyFiles.length > 0 ? attrs.legacyFiles.join(', ') : '',
    });
  }

  // ─── Derived findings ───────────────────────────────────────────────────────

  // Orphan AI_PROMPTS: key in AI_PROMPTS but no public/tools/[key]/ directory
  const orphanAIPrompts = aiPromptKeys.filter(k => {
    const row = rows.find(r => r.tool === k);
    return row && row.has_directory === 'no';
  });

  // Orphan Frontends: directory exists, NOT in any registry (tools.html, sitemap, dropdown, AI_PROMPTS)
  const orphanFrontends = toolDirs.filter(t => {
    if (KNOWN_EXCEPTIONS.has(t)) return false;
    const row = rows.find(r => r.tool === t);
    if (!row) return false;
    return row.in_AI_PROMPTS === 'no' &&
           row.in_tools_html === 'no' &&
           row.in_sitemap === 'no' &&
           row.in_homepage_dropdown === 'no';
  });

  // Tool count drift
  const homepageCountMatch = indexHtml.match(/(\d+)\+?\s*[Ff]ree\s*[Tt]ools/);
  const toolsHtmlCountMatch = toolsHtml.match(/content="(\d+)\+?\s*free.*?tools/i);
  const homepageH1Match = indexHtml.match(/(\d+)\+?\s*Free Tools/i);
  const actualToolCount = toolDirs.filter(t => t !== 'shared' && t !== 'distill').length;

  const countDrift = {
    actual: actualToolCount,
    homepage_meta: homepageCountMatch ? homepageCountMatch[1] : 'unknown',
    homepage_h1: homepageH1Match ? homepageH1Match[1] : 'unknown',
    tools_html_meta: toolsHtmlCountMatch ? toolsHtmlCountMatch[1] : 'unknown',
  };

  // Legacy files
  const legacyFileRows = rows.filter(r => r.legacy_files !== '');

  // ─── Orphan check for --check mode ────────────────────────────────────────
  const newOrphanAIPrompts = orphanAIPrompts.filter(k => !KNOWN_EXCEPTIONS.has(k));
  const newOrphanFrontends = orphanFrontends.filter(t => !KNOWN_EXCEPTIONS.has(t));

  if (CHECK_MODE) {
    const hasNewOrphans = newOrphanAIPrompts.length > 0 || newOrphanFrontends.length > 0;
    if (hasNewOrphans) {
      console.error('FAIL: New orphans found outside known exceptions allowlist:');
      if (newOrphanAIPrompts.length > 0) {
        console.error('  Orphan AI_PROMPTS:', newOrphanAIPrompts.join(', '));
      }
      if (newOrphanFrontends.length > 0) {
        console.error('  Orphan Frontends:', newOrphanFrontends.join(', '));
      }
      process.exit(1);
    }
    process.exit(0);
  }

  // ─── Build Markdown report ─────────────────────────────────────────────────

  const HEADER = `# CyberScryb Tool Inventory Audit

**Generated:** ${new Date().toISOString().replace('T', ' ').slice(0, 19)} UTC
**Total tool directories:** ${toolDirs.length} (including \`shared\`)
**AI_PROMPTS keys:** ${aiPromptKeys.length}
**tools.html entries:** ${inToolsHtml.size}
**sitemap.xml tool entries:** ${inSitemap.size}
**Homepage dropdown options:** ${inHomepageDropdown.size}

---

## Tool Inventory Table

| tool | category | has_directory | in_AI_PROMPTS | in_tools_html | in_sitemap | in_homepage_dropdown | has_index_html | has_json_ld | has_blog_nav_link | has_breadcrumbs | has_canonical | legacy_files |
|------|----------|---------------|---------------|---------------|------------|----------------------|----------------|-------------|-------------------|-----------------|---------------|--------------|
`;

  const tableRows = rows.map(r =>
    `| ${r.tool} | ${r.category} | ${r.has_directory} | ${r.in_AI_PROMPTS} | ${r.in_tools_html} | ${r.in_sitemap} | ${r.in_homepage_dropdown} | ${r.has_index_html} | ${r.has_json_ld} | ${r.has_blog_nav_link} | ${r.has_breadcrumbs} | ${r.has_canonical} | ${r.legacy_files} |`
  ).join('\n');

  // ─── Section: Orphan AI_PROMPTS ────────────────────────────────────────────
  const orphanAISection = `
## Orphan AI_PROMPTS

AI_PROMPTS keys with no matching \`public/tools/[key]/\` directory.
These prompts are defined in \`functions/index.js\` but have no frontend UI.

| key | in_tools_html | in_sitemap | in_homepage_dropdown | exception? |
|-----|---------------|------------|----------------------|------------|
${orphanAIPrompts.map(k => {
  const row = rows.find(r => r.tool === k);
  return `| ${k} | ${row ? row.in_tools_html : 'no'} | ${row ? row.in_sitemap : 'no'} | ${row ? row.in_homepage_dropdown : 'no'} | ${KNOWN_EXCEPTIONS.has(k) ? 'yes' : 'no'} |`;
}).join('\n') || '| — | — | — | — | — |'}

**New orphans (not in allowlist):** ${newOrphanAIPrompts.length > 0 ? newOrphanAIPrompts.join(', ') : 'none'}
`;

  // ─── Section: Orphan Frontends ─────────────────────────────────────────────
  const allOrphanFrontends = toolDirs.filter(t => {
    const row = rows.find(r => r.tool === t);
    if (!row) return false;
    return row.in_AI_PROMPTS === 'no' &&
           row.in_tools_html === 'no' &&
           row.in_sitemap === 'no' &&
           row.in_homepage_dropdown === 'no';
  });

  const orphanFrontendsSection = `
## Orphan Frontends

Tool directories that exist on disk but are missing from ALL registries
(AI_PROMPTS, tools.html, sitemap.xml, and homepage dropdown).

| tool | has_index_html | has_json_ld | exception? |
|------|----------------|-------------|------------|
${allOrphanFrontends.map(t => {
  const row = rows.find(r => r.tool === t);
  return `| ${t} | ${row ? row.has_index_html : 'no'} | ${row ? row.has_json_ld : 'no'} | ${KNOWN_EXCEPTIONS.has(t) ? 'yes' : 'no'} |`;
}).join('\n') || '| — | — | — | — |'}

**New orphans (not in allowlist):** ${newOrphanFrontends.length > 0 ? newOrphanFrontends.join(', ') : 'none'}
`;

  // ─── Section: Tool Count Drift ─────────────────────────────────────────────
  const driftSection = `
## Tool Count Drift

Discrepancies between the advertised tool count and the actual directory count.

| source | claimed count |
|--------|--------------|
| \`public/index.html\` meta description | ${countDrift.homepage_meta} |
| \`public/index.html\` H1 text | ${countDrift.homepage_h1} |
| \`public/tools.html\` meta description | ${countDrift.tools_html_meta}+ |
| Actual tool directories (excluding \`shared\` + \`distill\`) | **${countDrift.actual}** |

**Finding:** index.html claims "41" tools and tools.html meta says "39+" — actual functional tool directories (excluding \`shared\` helper and \`distill\` landing page) total **${countDrift.actual}**. Count drift exists across multiple pages.
`;

  // ─── Section: Legacy Files ─────────────────────────────────────────────────
  const legacySection = `
## Legacy Files

Tool directories containing \`index_v*.html\` files alongside the current \`index.html\`.
These should be removed to avoid confusion.

| tool | legacy_files |
|------|--------------|
${legacyFileRows.map(r => `| ${r.tool} | ${r.legacy_files} |`).join('\n') || '| — | — |'}
`;

  const fullReport = HEADER + tableRows + '\n' + orphanAISection + orphanFrontendsSection + driftSection + legacySection;

  // Write to output file
  // Preserve the ## Triage Decisions section if it already exists in the current file
  const outputPath = path.join(ROOT, '.planning', 'phases', '01-audit-triage', 'AUDIT-INVENTORY.md');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  let triageSection = '';
  if (fs.existsSync(outputPath)) {
    const existing = fs.readFileSync(outputPath, 'utf-8');
    const triageIdx = existing.indexOf('\n## Triage Decisions');
    if (triageIdx !== -1) {
      triageSection = existing.slice(triageIdx);
    }
  }

  fs.writeFileSync(outputPath, fullReport + triageSection, 'utf-8');

  console.log(`Audit inventory written to: ${outputPath}`);
  console.log(`Total tools inventoried: ${rows.length}`);
  console.log(`Orphan AI_PROMPTS: ${orphanAIPrompts.length} (${newOrphanAIPrompts.length} new)`);
  console.log(`Orphan Frontends: ${allOrphanFrontends.length} (${newOrphanFrontends.length} new)`);
  console.log(`Legacy files: ${legacyFileRows.length} tools with legacy files`);
  console.log(`Tool count drift: actual=${countDrift.actual}, homepage claims ${countDrift.homepage_meta}`);
}

main();
