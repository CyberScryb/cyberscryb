/**
 * Case Converter Tests
 */

const { tokenize, convert } = require('../public/tools/case-converter/script');

// ── tokenize ─────────────────────────────────────────────

describe('tokenize', () => {
  test('splits simple space-separated words', () => {
    expect(tokenize('hello world')).toEqual(['hello', 'world']);
  });

  test('returns empty array for empty string', () => {
    expect(tokenize('')).toEqual([]);
  });

  test('splits camelCase into words', () => {
    expect(tokenize('helloWorld')).toEqual(['hello', 'World']);
  });

  test('splits PascalCase into words', () => {
    expect(tokenize('HelloWorld')).toEqual(['Hello', 'World']);
  });

  test('splits on non-alphanumeric characters', () => {
    expect(tokenize('hello-world_foo')).toEqual(['hello', 'world', 'foo']);
  });

  test('filters empty tokens', () => {
    expect(tokenize('  hello   world  ')).toEqual(['hello', 'world']);
  });
});

// ── convert — word-based cases ───────────────────────────

describe('convert — word-based cases', () => {
  const input = 'the quick brown fox';

  test('camelCase', () => {
    expect(convert(input, 'camel')).toBe('theQuickBrownFox');
  });

  test('PascalCase', () => {
    expect(convert(input, 'pascal')).toBe('TheQuickBrownFox');
  });

  test('snake_case', () => {
    expect(convert(input, 'snake')).toBe('the_quick_brown_fox');
  });

  test('kebab-case', () => {
    expect(convert(input, 'kebab')).toBe('the-quick-brown-fox');
  });

  test('CONSTANT_CASE', () => {
    expect(convert(input, 'constant')).toBe('THE_QUICK_BROWN_FOX');
  });

  test('Title Case', () => {
    expect(convert(input, 'title')).toBe('The Quick Brown Fox');
  });
});

// ── convert — character-based cases ─────────────────────

describe('convert — character-based cases', () => {
  test('UPPERCASE', () => {
    expect(convert('hello world', 'upper')).toBe('HELLO WORLD');
  });

  test('lowercase', () => {
    expect(convert('HELLO WORLD', 'lower')).toBe('hello world');
  });

  test('aLtErNaTiNg case (starts lowercase)', () => {
    expect(convert('hello', 'alt')).toBe('hElLo');
  });

  test('iNVERSE case', () => {
    expect(convert('Hello', 'inverse')).toBe('hELLO');
  });

  test('sentence case', () => {
    expect(convert('hello world. foo bar.', 'sentence')).toBe('Hello world. Foo bar.');
  });
});

// ── convert — edge cases ─────────────────────────────────

describe('convert — edge cases', () => {
  test('empty string returns empty string for word-based', () => {
    expect(convert('', 'camel')).toBe('');
  });

  test('single word camelCase stays lowercase', () => {
    expect(convert('hello', 'camel')).toBe('hello');
  });

  test('camelCase input converts correctly to snake_case', () => {
    expect(convert('helloWorld', 'snake')).toBe('hello_world');
  });

  test('PascalCase input converts correctly to kebab-case', () => {
    expect(convert('HelloWorld', 'kebab')).toBe('hello-world');
  });
});
