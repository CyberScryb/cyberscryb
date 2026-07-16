/**
 * CyberScryb tools registry — source of truth for SEO metadata, chaining,
 * share policy, and offline eligibility.
 *
 * Consumed by:
 *   - scripts/emit-tools-registry.js → content-site/tools/shared/tools-registry.js
 *   - scripts/seo-assert.js
 *
 * Live tool URLs stay at /tools/{slug}/ (do not rename ranked slugs).
 */

'use strict';

const tools = [
  {
    id: 'json-formatter',
    slug: 'json-formatter',
    title: 'JSON Formatter',
    metaDescription:
      'Pretty print, validate, and clean up JSON payloads instantly in your browser. Free, no signup.',
    schemaCategory: 'DeveloperApplication',
    indexable: true,
    offline: true,
    shareKind: 'code',
    chainsTo: [
      { id: 'base64-tool', label: 'Encode as Base64', map: { 'tool-input': 'output' } },
      { id: 'json-csv-converter', label: 'Convert to CSV', map: { 'tool-input': 'output' } },
      { id: 'regex-tester', label: 'Test with Regex', map: { 'test-string': 'output' } },
    ],
  },
  {
    id: 'json-csv-converter',
    slug: 'json-csv-converter',
    title: 'JSON ↔ CSV Converter',
    metaDescription:
      'Convert JSON to CSV and CSV to JSON in your browser. Nested objects flattened. Free.',
    schemaCategory: 'DeveloperApplication',
    indexable: true,
    offline: true,
    shareKind: 'code',
    chainsTo: [
      { id: 'json-formatter', label: 'Format JSON', map: { 'tool-input': 'output' } },
      { id: 'base64-tool', label: 'Base64 encode', map: { 'tool-input': 'output' } },
    ],
  },
  {
    id: 'regex-tester',
    slug: 'regex-tester',
    title: 'Regex Tester',
    metaDescription:
      'Test and debug regular expressions in real time with match highlighting. Free and private.',
    schemaCategory: 'DeveloperApplication',
    indexable: true,
    offline: true,
    shareKind: 'code',
    chainsTo: [
      { id: 'slug-generator', label: 'Build a slug', map: { 'tool-input': 'output' } },
    ],
  },
  {
    id: 'base64-tool',
    slug: 'base64-tool',
    title: 'Base64 Encode & Decode',
    metaDescription: 'Encode and decode Base64 strings entirely in your browser. Free, no upload.',
    schemaCategory: 'DeveloperApplication',
    indexable: true,
    offline: true,
    shareKind: 'code',
    chainsTo: [
      { id: 'url-encoder', label: 'URL-encode', map: { 'tool-input': 'output' } },
      { id: 'hash-generator', label: 'Hash it', map: { 'tool-input': 'output' } },
    ],
  },
  {
    id: 'password-checker',
    slug: 'password-checker',
    title: 'Password Strength Checker',
    metaDescription:
      'Test password entropy and crack-time estimates locally — nothing leaves your browser.',
    schemaCategory: 'SecurityApplication',
    indexable: true,
    offline: true,
    shareKind: 'metric',
    persistPolicy: 'metrics-only',
    chainsTo: [],
  },
  {
    id: 'url-encoder',
    slug: 'url-encoder',
    title: 'URL Encoder / Decoder',
    metaDescription: 'Encode or decode URL components instantly in your browser.',
    schemaCategory: 'DeveloperApplication',
    indexable: true,
    offline: true,
    shareKind: 'code',
    chainsTo: [
      { id: 'base64-tool', label: 'Base64 encode', map: { 'tool-input': 'output' } },
    ],
  },
  {
    id: 'hash-generator',
    slug: 'hash-generator',
    title: 'Hash Generator',
    metaDescription: 'Generate MD5, SHA-1, SHA-256 hashes in your browser. Free and private.',
    schemaCategory: 'DeveloperApplication',
    indexable: true,
    offline: true,
    shareKind: 'code',
    chainsTo: [],
  },
  {
    id: 'slug-generator',
    slug: 'slug-generator',
    title: 'Slug Generator',
    metaDescription: 'Turn titles into clean URL slugs instantly. Free, client-side.',
    schemaCategory: 'DeveloperApplication',
    indexable: true,
    offline: true,
    shareKind: 'text',
    chainsTo: [
      { id: 'url-encoder', label: 'URL-encode slug', map: { 'tool-input': 'output' } },
    ],
  },
  {
    id: 'jwt-decoder',
    slug: 'jwt-decoder',
    title: 'JWT Decoder',
    metaDescription: 'Decode JSON Web Tokens and inspect headers and claims in your browser.',
    schemaCategory: 'DeveloperApplication',
    indexable: true,
    offline: true,
    shareKind: 'code',
    shareRequiresConfirm: true,
    chainsTo: [
      { id: 'json-formatter', label: 'Format claims JSON', map: { 'tool-input': 'output' } },
    ],
  },
  {
    id: 'markdown-html',
    slug: 'markdown-html',
    title: 'Markdown → HTML',
    metaDescription: 'Convert Markdown to HTML instantly in your browser. Free, no signup.',
    schemaCategory: 'DeveloperApplication',
    indexable: true,
    offline: true,
    shareKind: 'code',
    chainsTo: [
      { id: 'html-entity', label: 'HTML entities', map: { 'tool-input': 'output' } },
    ],
  },
  {
    id: 'html-entity',
    slug: 'html-entity',
    title: 'HTML Entity Encoder',
    metaDescription: 'Encode and decode HTML entities client-side. Free and private.',
    schemaCategory: 'DeveloperApplication',
    indexable: true,
    offline: true,
    shareKind: 'code',
    chainsTo: [],
  },
  {
    id: 'word-counter',
    slug: 'word-counter',
    title: 'Word Counter',
    metaDescription: 'Count words, characters, sentences, and reading time in your browser.',
    schemaCategory: 'DeveloperApplication',
    indexable: true,
    offline: true,
    shareKind: 'metric',
    chainsTo: [
      { id: 'summarizer', label: 'Summarize text', map: { 'tool-input': 'output' } },
    ],
  },
  {
    id: 'seo-tag-generator',
    slug: 'seo-tag-generator',
    title: 'SEO Meta Tag Generator',
    metaDescription: 'Generate title, description, Open Graph, and Twitter Card tags. Free.',
    schemaCategory: 'DeveloperApplication',
    indexable: true,
    offline: true,
    shareKind: 'code',
    chainsTo: [],
  },
  {
    id: 'humanizer',
    slug: 'humanizer',
    title: 'AI Text Humanizer',
    metaDescription:
      'Rewrite AI-generated text to sound natural. Free preview — runs with privacy in mind.',
    schemaCategory: 'BusinessApplication',
    indexable: true,
    offline: false,
    shareKind: 'text',
    shareRequiresConfirm: true,
    chainsTo: [
      { id: 'ai-detector', label: 'Check for AI patterns', map: { 'tool-input': 'output' } },
      { id: 'paraphraser', label: 'Paraphrase again', map: { 'tool-input': 'output' } },
      { id: 'summarizer', label: 'Summarize', map: { 'tool-input': 'output' } },
    ],
  },
  {
    id: 'ai-detector',
    slug: 'ai-detector',
    title: 'AI Text Detector',
    metaDescription: 'Check text for common AI writing patterns. Free educational detector.',
    schemaCategory: 'BusinessApplication',
    indexable: true,
    offline: false,
    shareKind: 'metric',
    chainsTo: [
      { id: 'humanizer', label: 'Humanize this text', map: { 'tool-input': 'output' } },
    ],
  },
  {
    id: 'summarizer',
    slug: 'summarizer',
    title: 'Text Summarizer',
    metaDescription: 'Summarize long text into short or bullet form with AI. Free daily uses.',
    schemaCategory: 'BusinessApplication',
    indexable: true,
    offline: false,
    shareKind: 'text',
    chainsTo: [
      { id: 'email-writer', label: 'Email this summary', map: { 'tool-input': 'output' } },
      { id: 'tweet-generator', label: 'Make a post', map: { 'tool-input': 'output' } },
    ],
  },
  {
    id: 'email-writer',
    slug: 'email-writer',
    title: 'Email Writer',
    metaDescription: 'Draft clear professional emails from a short brief. Free AI assist.',
    schemaCategory: 'BusinessApplication',
    indexable: true,
    offline: false,
    shareKind: 'text',
    shareRequiresConfirm: true,
    chainsTo: [
      { id: 'humanizer', label: 'Make it more human', map: { 'tool-input': 'output' } },
    ],
  },
  {
    id: 'paraphraser',
    slug: 'paraphraser',
    title: 'Paraphraser',
    metaDescription: 'Rewrite text in a new voice while keeping meaning. Free AI paraphraser.',
    schemaCategory: 'BusinessApplication',
    indexable: true,
    offline: false,
    shareKind: 'text',
    chainsTo: [
      { id: 'humanizer', label: 'Humanize further', map: { 'tool-input': 'output' } },
      { id: 'ai-detector', label: 'Run AI check', map: { 'tool-input': 'output' } },
    ],
  },
  {
    id: 'tweet-generator',
    slug: 'tweet-generator',
    title: 'Post / Tweet Generator',
    metaDescription: 'Turn an idea into a short social post. Free AI writing assist.',
    schemaCategory: 'BusinessApplication',
    indexable: true,
    offline: false,
    shareKind: 'text',
    chainsTo: [],
  },
  {
    id: 'hardship-letter',
    slug: 'hardship-letter',
    title: 'Hardship Letter Generator',
    metaDescription:
      'Draft a clear hardship letter for real situations. Free AI assist — review before you send.',
    schemaCategory: 'BusinessApplication',
    indexable: true,
    offline: false,
    shareKind: null,
    shareRequiresConfirm: true,
    chainsTo: [
      { id: 'appeal-letter', label: 'Turn into an appeal', map: { 'tool-input': 'output' } },
      { id: 'budget-planner', label: 'Build a survival budget', map: { 'tool-input': 'output' } },
    ],
  },
  {
    id: 'appeal-letter',
    slug: 'appeal-letter',
    title: 'Appeal Letter Generator',
    metaDescription: 'Draft appeal letters with structure and clarity. Free AI assist.',
    schemaCategory: 'BusinessApplication',
    indexable: true,
    offline: false,
    shareKind: null,
    shareRequiresConfirm: true,
    chainsTo: [
      { id: 'hardship-letter', label: 'Hardship letter version', map: { 'tool-input': 'output' } },
    ],
  },
  {
    id: 'budget-planner',
    slug: 'budget-planner',
    title: 'Budget Planner',
    metaDescription: 'Build a survival budget plan from your situation. Free AI assist.',
    schemaCategory: 'BusinessApplication',
    indexable: true,
    offline: false,
    shareKind: null,
    shareRequiresConfirm: true,
    chainsTo: [],
  },
  {
    id: 'caregiver-report',
    slug: 'caregiver-report',
    title: 'Caregiver Shift Report',
    metaDescription: 'Turn rough shift notes into a clear caregiver report. Free AI assist.',
    schemaCategory: 'BusinessApplication',
    indexable: true,
    offline: false,
    shareKind: null,
    shareRequiresConfirm: true,
    chainsTo: [],
  },
  {
    id: 'bio-generator',
    slug: 'bio-generator',
    title: 'Bio Generator',
    metaDescription: 'Generate social bios from a short background. Free AI writing tool.',
    schemaCategory: 'BusinessApplication',
    indexable: true,
    offline: false,
    shareKind: 'text',
    chainsTo: [],
  },
  {
    id: 'code-explainer',
    slug: 'code-explainer',
    title: 'Code Explainer',
    metaDescription: 'Explain code in plain language. Free AI assist for developers.',
    schemaCategory: 'DeveloperApplication',
    indexable: true,
    offline: false,
    shareKind: 'text',
    chainsTo: [
      { id: 'summarizer', label: 'Summarize explanation', map: { 'tool-input': 'output' } },
    ],
  },
  {
    id: 'resume-bullets',
    slug: 'resume-bullets',
    title: 'Resume Bullet Writer',
    metaDescription: 'Rewrite accomplishments into strong resume bullets. Free AI assist.',
    schemaCategory: 'BusinessApplication',
    indexable: true,
    offline: false,
    shareKind: 'text',
    shareRequiresConfirm: true,
    chainsTo: [],
  },
  {
    id: 'product-description',
    slug: 'product-description',
    title: 'Product Description Writer',
    metaDescription: 'Write benefit-focused product copy from a short brief. Free AI assist.',
    schemaCategory: 'BusinessApplication',
    indexable: true,
    offline: false,
    shareKind: 'text',
    chainsTo: [],
  },
  {
    id: 'meta-description',
    slug: 'meta-description',
    title: 'Meta Description Writer',
    metaDescription: 'Generate SEO meta descriptions in the right character range. Free AI.',
    schemaCategory: 'DeveloperApplication',
    indexable: true,
    offline: false,
    shareKind: 'text',
    chainsTo: [
      { id: 'seo-tag-generator', label: 'Full meta tag pack', map: { 'tool-input': 'output' } },
    ],
  },
  {
    id: 'custody-document',
    slug: 'custody-document',
    title: 'Custody Document Helper',
    metaDescription:
      'Structure parenting plans and custody notes. Free AI assist — not legal advice.',
    schemaCategory: 'BusinessApplication',
    indexable: true,
    offline: false,
    shareKind: null,
    shareRequiresConfirm: true,
    chainsTo: [],
  },
  {
    id: 'voice-writer',
    slug: 'voice-writer',
    title: 'Voice Writer',
    metaDescription: 'Write in a consistent voice from a topic or outline. Free AI assist.',
    schemaCategory: 'BusinessApplication',
    indexable: true,
    offline: false,
    shareKind: 'text',
    chainsTo: [
      { id: 'humanizer', label: 'Humanize output', map: { 'tool-input': 'output' } },
    ],
  },
];

function getToolById(id) {
  return tools.find((t) => t.id === id) || null;
}

function getToolBySlug(slug) {
  return tools.find((t) => t.slug === slug) || null;
}

function indexableTools() {
  return tools.filter((t) => t.indexable !== false);
}

function offlineTools() {
  return tools.filter((t) => t.offline);
}

function buildWebApplicationJsonLd(tool) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: tool.title,
    url: 'https://cyberscryb.com/tools/' + tool.slug + '/',
    description: tool.metaDescription,
    applicationCategory: tool.schemaCategory || 'DeveloperApplication',
    operatingSystem: 'Any',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    browserRequirements: 'Requires JavaScript. Client-side processing where noted.',
    author: { '@type': 'Organization', name: 'CyberScryb', url: 'https://cyberscryb.com' },
  };
}

module.exports = {
  tools,
  getToolById,
  getToolBySlug,
  indexableTools,
  offlineTools,
  buildWebApplicationJsonLd,
};
