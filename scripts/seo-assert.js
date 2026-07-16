/**
 * Growth/SEO config integrity checks.
 * Usage: node scripts/seo-assert.js
 *
 * Fails on: duplicate slugs, chainsTo → unknown tool id
 * Warns on: missing content-site/tools/{slug}/index.html
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { tools, getToolById } = require('./toolsConfig');

const root = path.join(__dirname, '..');
const toolsDir = path.join(root, 'content-site', 'tools');

let errors = 0;
let warnings = 0;

const slugs = new Map();
const ids = new Set();

for (const t of tools) {
  if (ids.has(t.id)) {
    console.error('ERROR: duplicate tool id:', t.id);
    errors++;
  }
  ids.add(t.id);

  if (slugs.has(t.slug)) {
    console.error('ERROR: duplicate slug:', t.slug, '→', t.id, 'and', slugs.get(t.slug));
    errors++;
  }
  slugs.set(t.slug, t.id);

  const indexPath = path.join(toolsDir, t.slug, 'index.html');
  if (!fs.existsSync(indexPath)) {
    console.warn('WARN: missing page', path.relative(root, indexPath));
    warnings++;
  }

  for (const chain of t.chainsTo || []) {
    if (!getToolById(chain.id)) {
      console.error('ERROR: chainsTo unknown id', chain.id, 'from', t.id);
      errors++;
    }
  }
}

console.log('--- seo-assert summary ---');
console.log('tools:', tools.length);
console.log('errors:', errors);
console.log('warnings:', warnings);

if (errors > 0) {
  process.exit(1);
}
console.log('seo-assert: ok');
