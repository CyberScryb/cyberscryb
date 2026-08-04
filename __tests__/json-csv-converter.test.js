/**
 * JSON ↔ CSV Converter Tests
 * Tests pure conversion logic: jsonToCsv, csvToJson, parseCsvLines, escapeCsvField
 *
 * @jest-environment jsdom
 */

// Create DOM elements the script expects at load time — must exist before require()
document.body.innerHTML = `
    <textarea id="input-area"></textarea>
    <textarea id="output-area"></textarea>
    <span id="input-stats"></span>
    <span id="output-stats"></span>
    <div id="error-bar" class="hidden"><span id="error-msg"></span></div>
    <button id="convert-btn"></button>
    <button id="copy-btn"></button>
`;

const {
  jsonToCsv,
  csvToJson,
  parseCsvLines,
  escapeCsvField,
} = require('../public/tools/json-csv-converter/script');

// ── escapeCsvField ──────────────────────────────────────

describe('escapeCsvField', () => {
  test('returns plain string unchanged', () => {
    expect(escapeCsvField('hello')).toBe('hello');
  });

  test('wraps field containing comma in quotes', () => {
    expect(escapeCsvField('hello, world')).toBe('"hello, world"');
  });

  test('wraps field containing double quote and escapes it', () => {
    expect(escapeCsvField('say "hi"')).toBe('"say ""hi"""');
  });

  test('wraps field containing newline', () => {
    expect(escapeCsvField('line1\nline2')).toBe('"line1\nline2"');
  });

  test('wraps field containing carriage return', () => {
    expect(escapeCsvField('line1\rline2')).toBe('"line1\rline2"');
  });

  test('handles empty string', () => {
    expect(escapeCsvField('')).toBe('');
  });

  test('handles string with comma AND quote', () => {
    expect(escapeCsvField('a "b", c')).toBe('"a ""b"", c"');
  });
});

// ── parseCsvLines ───────────────────────────────────────

describe('parseCsvLines', () => {
  test('parses simple CSV', () => {
    const result = parseCsvLines('a,b,c\n1,2,3');
    expect(result).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ]);
  });

  test('handles quoted fields', () => {
    const result = parseCsvLines('name,city\nAlice,"New York"');
    expect(result).toEqual([
      ['name', 'city'],
      ['Alice', 'New York'],
    ]);
  });

  test('handles escaped quotes (double quotes)', () => {
    const result = parseCsvLines('quote\n"He said ""hello"""');
    expect(result).toEqual([['quote'], ['He said "hello"']]);
  });

  test('handles newlines inside quoted fields (RFC 4180)', () => {
    const result = parseCsvLines('text\n"line1\nline2"');
    expect(result).toEqual([['text'], ['line1\nline2']]);
  });

  test('handles CRLF line endings', () => {
    const result = parseCsvLines('a,b\r\n1,2');
    expect(result).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  test('handles empty fields', () => {
    const result = parseCsvLines('a,,c\n1,,3');
    expect(result).toEqual([
      ['a', '', 'c'],
      ['1', '', '3'],
    ]);
  });

  test('handles single row', () => {
    const result = parseCsvLines('a,b,c');
    expect(result).toEqual([['a', 'b', 'c']]);
  });

  test('handles commas inside quoted field', () => {
    const result = parseCsvLines('name,address\nBob,"123 Main St, Apt 4"');
    expect(result).toEqual([
      ['name', 'address'],
      ['Bob', '123 Main St, Apt 4'],
    ]);
  });
});

// ── jsonToCsv ───────────────────────────────────────────

describe('jsonToCsv', () => {
  test('converts simple array of objects', () => {
    const json = JSON.stringify([
      { name: 'Alice', age: 30 },
      { name: 'Bob', age: 25 },
    ]);
    const result = jsonToCsv(json);
    expect(result).toBe('name,age\nAlice,30\nBob,25');
  });

  test('converts single object (wraps in array)', () => {
    const json = JSON.stringify({ name: 'Alice', age: 30 });
    const result = jsonToCsv(json);
    expect(result).toBe('name,age\nAlice,30');
  });

  test('handles null and undefined values as empty string', () => {
    const json = JSON.stringify([{ a: 1, b: null }, { a: 2 }]);
    const result = jsonToCsv(json);
    expect(result).toBe('a,b\n1,\n2,');
  });

  test('handles nested objects by stringifying', () => {
    const json = JSON.stringify([{ name: 'Alice', meta: { role: 'admin' } }]);
    const result = jsonToCsv(json);
    expect(result).toContain('name,meta');
    expect(result).toContain('Alice');
    // Nested JSON gets stringified then CSV-escaped (quotes doubled)
    expect(result).toContain('"role"');
  });

  test('collects all unique keys across objects', () => {
    const json = JSON.stringify([{ a: 1 }, { a: 2, b: 3 }]);
    const result = jsonToCsv(json);
    const lines = result.split('\n');
    expect(lines[0]).toBe('a,b');
    expect(lines[1]).toBe('1,');
    expect(lines[2]).toBe('2,3');
  });

  test('escapes fields with commas', () => {
    const json = JSON.stringify([{ name: 'Doe, John', age: 30 }]);
    const result = jsonToCsv(json);
    expect(result).toBe('name,age\n"Doe, John",30');
  });

  test('throws on invalid JSON', () => {
    expect(() => jsonToCsv('not json')).toThrow('Invalid JSON');
  });

  test('throws on empty array', () => {
    expect(() => jsonToCsv('[]')).toThrow('empty');
  });

  test('throws on primitive value', () => {
    expect(() => jsonToCsv('"hello"')).toThrow();
  });

  test('throws on array of primitives', () => {
    expect(() => jsonToCsv('[1, 2, 3]')).toThrow();
  });
});

// ── csvToJson ───────────────────────────────────────────

describe('csvToJson', () => {
  test('converts simple CSV to JSON', () => {
    const result = JSON.parse(csvToJson('name,age\nAlice,30\nBob,25'));
    expect(result).toEqual([
      { name: 'Alice', age: 30 },
      { name: 'Bob', age: 25 },
    ]);
  });

  test('auto-detects number types', () => {
    const result = JSON.parse(csvToJson('val\n42\n3.14\n0'));
    expect(result[0].val).toBe(42);
    expect(result[1].val).toBe(3.14);
    expect(result[2].val).toBe(0);
  });

  test('auto-detects boolean types', () => {
    const result = JSON.parse(csvToJson('flag\ntrue\nfalse'));
    expect(result[0].flag).toBe(true);
    expect(result[1].flag).toBe(false);
  });

  test('converts empty fields to null', () => {
    const result = JSON.parse(csvToJson('a,b\n1,\n,2'));
    expect(result[0].b).toBeNull();
    expect(result[1].a).toBeNull();
  });

  test('auto-detects nested JSON objects in fields', () => {
    const result = JSON.parse(csvToJson('name,meta\nAlice,"{""role"":""admin""}"'));
    expect(result[0].meta).toEqual({ role: 'admin' });
  });

  test('skips empty lines', () => {
    const result = JSON.parse(csvToJson('name\nAlice\n\nBob'));
    expect(result).toHaveLength(2);
  });

  test('throws on header-only CSV', () => {
    expect(() => csvToJson('name,age')).toThrow('at least a header row and one data row');
  });

  test('handles fields with fewer columns than headers', () => {
    const result = JSON.parse(csvToJson('a,b,c\n1'));
    expect(result[0]).toEqual({ a: 1, b: null, c: null });
  });
});

// ── Roundtrip Tests ─────────────────────────────────────

describe('roundtrip: JSON → CSV → JSON', () => {
  test('simple data survives roundtrip', () => {
    const original = [
      { name: 'Alice', age: 30, active: true },
      { name: 'Bob', age: 25, active: false },
    ];
    const csv = jsonToCsv(JSON.stringify(original));
    const result = JSON.parse(csvToJson(csv));
    expect(result).toEqual(original);
  });

  test('data with special characters survives roundtrip', () => {
    const original = [{ name: "O'Brien, Jr.", city: 'New York' }];
    const csv = jsonToCsv(JSON.stringify(original));
    const result = JSON.parse(csvToJson(csv));
    expect(result[0].name).toBe("O'Brien, Jr.");
    expect(result[0].city).toBe('New York');
  });
});
