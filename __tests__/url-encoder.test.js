/**
 * URL Encoder/Decoder Tests
 */

const {
  urlEncodeComponent,
  urlEncodeFull,
  urlDecode,
} = require('../public/tools/url-encoder/script');

// ── urlEncodeComponent ───────────────────────────────────

describe('urlEncodeComponent', () => {
  test('encodes space as %20', () => {
    expect(urlEncodeComponent('hello world')).toBe('hello%20world');
  });

  test('encodes ? character', () => {
    expect(urlEncodeComponent('search?q=test')).toContain('%3F');
  });

  test('encodes & character', () => {
    expect(urlEncodeComponent('a&b')).toBe('a%26b');
  });

  test('encodes = character', () => {
    expect(urlEncodeComponent('key=value')).toBe('key%3Dvalue');
  });

  test('encodes # character', () => {
    expect(urlEncodeComponent('page#section')).toBe('page%23section');
  });

  test('encodes reserved characters: ?&=#', () => {
    const result = urlEncodeComponent('?&=#');
    expect(result).toBe('%3F%26%3D%23');
  });

  test('does not encode unreserved characters (letters, digits, -_.~)', () => {
    expect(urlEncodeComponent('hello-world_test.txt~')).toBe('hello-world_test.txt~');
  });

  test('encodes unicode characters', () => {
    const result = urlEncodeComponent('café');
    expect(result).toContain('%');
    expect(result).not.toBe('café');
  });
});

// ── urlEncodeFull ────────────────────────────────────────

describe('urlEncodeFull', () => {
  test('does not encode : / ? # in a full URL', () => {
    const url = 'https://example.com/path?q=test#section';
    const result = urlEncodeFull(url);
    expect(result).toContain('https://');
    expect(result).toContain('/path');
  });

  test('encodes spaces in full URL', () => {
    const result = urlEncodeFull('https://example.com/hello world');
    expect(result).toBe('https://example.com/hello%20world');
  });
});

// ── urlDecode ────────────────────────────────────────────

describe('urlDecode', () => {
  test('decodes %20 to space', () => {
    expect(urlDecode('hello%20world')).toBe('hello world');
  });

  test('decodes + as space', () => {
    expect(urlDecode('hello+world')).toBe('hello world');
  });

  test('decodes encoded reserved chars', () => {
    expect(urlDecode('%3F%26%3D%23')).toBe('?&=#');
  });

  test('decodes encoded unicode', () => {
    const encoded = urlEncodeComponent('café');
    const decoded = urlDecode(encoded);
    expect(decoded).toBe('café');
  });

  test('returns unchanged string if nothing to decode', () => {
    expect(urlDecode('hello-world')).toBe('hello-world');
  });
});

// ── Round-trip ───────────────────────────────────────────

describe('encode/decode round-trip', () => {
  test('encodeComponent then decode restores original', () => {
    const original = 'search?q=test&lang=en#results';
    const encoded = urlEncodeComponent(original);
    const decoded = urlDecode(encoded);
    expect(decoded).toBe(original);
  });

  test('unicode round-trip', () => {
    const original = 'Héllo Wörld 日本語';
    const encoded = urlEncodeComponent(original);
    const decoded = urlDecode(encoded);
    expect(decoded).toBe(original);
  });

  test('emoji round-trip', () => {
    const original = 'hello 🎉 world';
    const encoded = urlEncodeComponent(original);
    const decoded = urlDecode(encoded);
    expect(decoded).toBe(original);
  });
});
