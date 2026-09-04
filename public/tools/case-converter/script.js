/* Case Converter — Pure functions */

/**
 * Tokenize text into words by splitting on non-alphanumeric boundaries
 * and camelCase/PascalCase boundaries.
 * @param {string} text
 * @returns {string[]}
 */
function tokenize(text) {
  if (!text) return [];
  return text
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean);
}

/**
 * Convert text to the specified case type.
 * @param {string} text
 * @param {string} type - 'camel'|'pascal'|'snake'|'kebab'|'constant'|'title'|'upper'|'lower'|'alt'|'inverse'|'sentence'
 * @returns {string}
 */
function convert(text, type) {
  if (type === 'upper') return text.toUpperCase();
  if (type === 'lower') return text.toLowerCase();
  if (type === 'alt') {
    return text
      .split('')
      .map((c, i) => (i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()))
      .join('');
  }
  if (type === 'inverse') {
    return text
      .split('')
      .map(c => (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase()))
      .join('');
  }
  if (type === 'sentence') {
    return text.toLowerCase().replace(/(^\s*\w|[.!?]\s+\w)/g, s => s.toUpperCase());
  }

  const words = tokenize(text);
  if (words.length === 0) return '';

  switch (type) {
    case 'camel':
      return words
        .map((w, i) =>
          i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
        )
        .join('');
    case 'pascal':
      return words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('');
    case 'snake':
      return words.map(w => w.toLowerCase()).join('_');
    case 'kebab':
      return words.map(w => w.toLowerCase()).join('-');
    case 'constant':
      return words.map(w => w.toUpperCase()).join('_');
    case 'title':
      return words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  }
  return text;
}

// ── Module Exports (for testing) ─────────────────────────────────────────────
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { tokenize, convert };
}
