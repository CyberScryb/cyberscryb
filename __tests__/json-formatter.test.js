/**
 * JSON Formatter Tests
 */

const { prettyPrint, minify, validate } = require('../public/tools/json-formatter/script');

// ── prettyPrint ──────────────────────────────────────────

describe('prettyPrint', () => {
  test('formats compact JSON with 2-space indent', () => {
    const result = prettyPrint('{"a":1}');
    expect(result).toContain('\n');
    expect(result).toContain('  ');
  });

  test('output matches JSON.stringify with indent', () => {
    const result = prettyPrint('{"a":1,"b":2}', 2);
    expect(result).toBe('{\n  "a": 1,\n  "b": 2\n}');
  });

  test('handles array input', () => {
    const result = prettyPrint('[1,2,3]', 2);
    expect(result).toBe('[\n  1,\n  2,\n  3\n]');
  });

  test('supports tab indentation', () => {
    const result = prettyPrint('{"a":1}', '\t');
    expect(result).toContain('\t');
  });

  test('throws SyntaxError on invalid JSON', () => {
    expect(() => prettyPrint('not json')).toThrow();
  });

  test('throws on empty input', () => {
    expect(() => prettyPrint('')).toThrow();
  });

  test('handles nested objects', () => {
    const result = prettyPrint('{"a":{"b":1}}', 2);
    expect(result).toContain('"b": 1');
  });
});

// ── minify ───────────────────────────────────────────────

describe('minify', () => {
  test('removes whitespace from pretty-printed JSON', () => {
    const result = minify('{\n  "a": 1\n}');
    expect(result).toBe('{"a":1}');
  });

  test('minifies JSON with multiple keys', () => {
    const result = minify('{\n  "name": "CyberScryb",\n  "count": 20\n}');
    expect(result).toBe('{"name":"CyberScryb","count":20}');
  });

  test('minifies arrays', () => {
    const result = minify('[\n  1,\n  2,\n  3\n]');
    expect(result).toBe('[1,2,3]');
  });

  test('throws SyntaxError on invalid JSON', () => {
    expect(() => minify('{invalid}')).toThrow();
  });

  test('handles null values', () => {
    const result = minify('{"a": null}');
    expect(result).toBe('{"a":null}');
  });

  test('handles boolean values', () => {
    const result = minify('{"a": true, "b": false}');
    expect(result).toBe('{"a":true,"b":false}');
  });
});

// ── validate ─────────────────────────────────────────────

describe('validate', () => {
  test('valid object JSON returns valid:true and type "object"', () => {
    const result = validate('{"a":1}');
    expect(result.valid).toBe(true);
    expect(result.type).toBe('object');
    expect(result.error).toBeNull();
  });

  test('valid array JSON returns valid:true and type "array"', () => {
    const result = validate('[1, 2, 3]');
    expect(result.valid).toBe(true);
    expect(result.type).toBe('array');
  });

  test('invalid JSON returns valid:false with error message', () => {
    const result = validate('not json');
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
    expect(result.type).toBeNull();
  });

  test('empty string returns valid:false', () => {
    const result = validate('');
    expect(result.valid).toBe(false);
  });

  test('string value returns valid:true and type "string"', () => {
    const result = validate('"hello"');
    expect(result.valid).toBe(true);
    expect(result.type).toBe('string');
  });

  test('number value returns valid:true and type "number"', () => {
    const result = validate('42');
    expect(result.valid).toBe(true);
    expect(result.type).toBe('number');
  });
});

// ── Round-trip ───────────────────────────────────────────

describe('prettyPrint/minify round-trip', () => {
  test('minify(prettyPrint(json)) === minify(json)', () => {
    const original = '{"name":"CyberScryb","tools":20,"active":true}';
    const pretty = prettyPrint(original, 2);
    const reMinified = minify(pretty);
    expect(reMinified).toBe(minify(original));
  });

  test('complex nested JSON survives round-trip', () => {
    const original = '{"a":{"b":[1,2,3]},"c":null,"d":true}';
    const pretty = prettyPrint(original, 4);
    const minified = minify(pretty);
    expect(JSON.parse(minified)).toEqual(JSON.parse(original));
  });
});
