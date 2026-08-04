/**
 * Hash Generator Tests
 * Tests MD5, SHA-1, SHA-256, SHA-512 hashing functions.
 * SHA-256 of 'hello' = 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824
 *
 * @jest-environment node
 */

const { md5, bufToHex, subtleHash, hashText } = require('../public/tools/hash-generator/script');

// ── md5 ─────────────────────────────────────────────────

describe('md5', () => {
  test('md5("hello") returns known hash', () => {
    expect(md5('hello')).toBe('5d41402abc4b2a76b9719d911017c592');
  });

  test('md5("") returns known empty hash', () => {
    expect(md5('')).toBe('d41d8cd98f00b204e9800998ecf8427e');
  });

  test('md5("abc") returns known hash', () => {
    expect(md5('abc')).toBe('900150983cd24fb0d6963f7d28e17f72');
  });

  test('returns a 32-character lowercase hex string', () => {
    const result = md5('test');
    expect(result).toMatch(/^[0-9a-f]{32}$/);
  });

  test('different inputs produce different hashes', () => {
    expect(md5('hello')).not.toBe(md5('world'));
  });

  test('handles UTF-8 / unicode input', () => {
    const result = md5('café');
    expect(result).toMatch(/^[0-9a-f]{32}$/);
  });
});

// ── bufToHex ─────────────────────────────────────────────

describe('bufToHex', () => {
  test('converts empty buffer to empty string', () => {
    const buf = new Uint8Array(0).buffer;
    expect(bufToHex(buf)).toBe('');
  });

  test('converts known bytes to hex', () => {
    const bytes = new Uint8Array([0x00, 0xff, 0x10, 0xab]);
    expect(bufToHex(bytes.buffer)).toBe('00ff10ab');
  });

  test('pads single-digit hex values', () => {
    const bytes = new Uint8Array([0x01, 0x0f]);
    expect(bufToHex(bytes.buffer)).toBe('010f');
  });
});

// ── subtleHash ────────────────────────────────────────────

describe('subtleHash', () => {
  test('SHA-256 of "hello" = known value', async () => {
    const encoder = new TextEncoder();
    const bytes = encoder.encode('hello');
    const result = await subtleHash('SHA-256', bytes);
    expect(result).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
  });

  test('SHA-1 of "hello" = known value', async () => {
    const encoder = new TextEncoder();
    const bytes = encoder.encode('hello');
    const result = await subtleHash('SHA-1', bytes);
    expect(result).toBe('aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d');
  });

  test('SHA-512 returns 128-char hex string', async () => {
    const encoder = new TextEncoder();
    const bytes = encoder.encode('hello');
    const result = await subtleHash('SHA-512', bytes);
    expect(result).toMatch(/^[0-9a-f]{128}$/);
  });
});

// ── hashText ─────────────────────────────────────────────

describe('hashText', () => {
  test('returns object with all four hash fields', async () => {
    const result = await hashText('hello');
    expect(result).toHaveProperty('md5');
    expect(result).toHaveProperty('sha1');
    expect(result).toHaveProperty('sha256');
    expect(result).toHaveProperty('sha512');
  });

  test('sha256 of "hello" matches known value', async () => {
    const result = await hashText('hello');
    expect(result.sha256).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
  });

  test('md5 of "hello" matches known value', async () => {
    const result = await hashText('hello');
    expect(result.md5).toBe('5d41402abc4b2a76b9719d911017c592');
  });

  test('all hashes are non-empty strings', async () => {
    const result = await hashText('CyberScryb');
    expect(typeof result.md5).toBe('string');
    expect(typeof result.sha1).toBe('string');
    expect(typeof result.sha256).toBe('string');
    expect(typeof result.sha512).toBe('string');
    expect(result.md5.length).toBeGreaterThan(0);
    expect(result.sha256.length).toBeGreaterThan(0);
  });

  test('different inputs produce different sha256 hashes', async () => {
    const r1 = await hashText('hello');
    const r2 = await hashText('world');
    expect(r1.sha256).not.toBe(r2.sha256);
  });
});
