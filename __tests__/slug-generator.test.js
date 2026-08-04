/**
 * Slug Generator Tests
 */

const { slugify, STOP_WORDS } = require('../public/tools/slug-generator/script');

// ── Basic slugification ──────────────────────────────────

describe('slugify — basic', () => {
  test('"Hello World!" becomes "hello-world"', () => {
    expect(slugify('Hello World!')).toBe('hello-world');
  });

  test('simple lowercase', () => {
    expect(slugify('hello world')).toBe('hello-world');
  });

  test('empty string returns empty string', () => {
    expect(slugify('')).toBe('');
  });

  test('null/undefined returns empty string', () => {
    expect(slugify(null)).toBe('');
    expect(slugify(undefined)).toBe('');
  });

  test('numbers are preserved', () => {
    expect(slugify('Version 2.0')).toBe('version-2-0');
  });

  test('multiple spaces collapse to single separator', () => {
    expect(slugify('hello   world')).toBe('hello-world');
  });

  test('leading and trailing spaces are trimmed', () => {
    expect(slugify('  hello world  ')).toBe('hello-world');
  });

  test('special characters become separators', () => {
    expect(slugify('Hello, World!')).toBe('hello-world');
  });
});

// ── Diacritic stripping ──────────────────────────────────

describe('slugify — diacritics', () => {
  test('"Café Naïve" strips accents to "cafe-naive"', () => {
    expect(slugify('Café Naïve')).toBe('cafe-naive');
  });

  test('handles ß -> ss replacement', () => {
    expect(slugify('Straße')).toBe('strasse');
  });

  test('handles æ ligature -> ae', () => {
    const result = slugify('Æther');
    expect(result).toBe('aether');
  });

  test('handles ø -> o', () => {
    const result = slugify('Øst');
    expect(result).toBe('ost');
  });
});

// ── Options ──────────────────────────────────────────────

describe('slugify — options', () => {
  test('custom separator _ instead of -', () => {
    expect(slugify('Hello World', { sep: '_' })).toBe('hello_world');
  });

  test('maxLen truncates output', () => {
    const result = slugify('The Quick Brown Fox Jumps Over The Lazy Dog', { maxLen: 20 });
    expect(result.length).toBeLessThanOrEqual(20);
  });

  test('lower: false preserves case', () => {
    expect(slugify('Hello World', { lower: false })).toBe('Hello-World');
  });

  test('removeStopWords removes stop words', () => {
    const result = slugify('the quick brown fox', { removeStopWords: true });
    expect(result).not.toContain('the');
    expect(result).toContain('quick');
    expect(result).toContain('brown');
    expect(result).toContain('fox');
  });

  test('leading/trailing dashes are not produced', () => {
    const result = slugify('!!hello world!!');
    expect(result).not.toMatch(/^-/);
    expect(result).not.toMatch(/-$/);
  });
});

// ── STOP_WORDS set ───────────────────────────────────────

describe('STOP_WORDS', () => {
  test('contains common stop words', () => {
    expect(STOP_WORDS.has('the')).toBe(true);
    expect(STOP_WORDS.has('and')).toBe(true);
    expect(STOP_WORDS.has('a')).toBe(true);
    expect(STOP_WORDS.has('is')).toBe(true);
  });

  test('does not contain normal content words', () => {
    expect(STOP_WORDS.has('developer')).toBe(false);
    expect(STOP_WORDS.has('tool')).toBe(false);
  });
});
