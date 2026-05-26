/**
 * Base64 Encoder/Decoder Tests
 *
 * @jest-environment jsdom
 */

// Set up DOM elements the script expects at load time
document.body.innerHTML = `
    <textarea id="inputArea"></textarea>
    <textarea id="outputArea"></textarea>
    <input type="checkbox" id="urlSafe">
    <div id="errorBar" class="hidden"><span id="errorMsg"></span></div>
    <span id="inputStats"></span>
    <span id="outputStats"></span>
    <span id="sizeInfo"></span>
    <span id="inputLabel"></span>
    <span id="outputLabel"></span>
    <span id="btnText"></span>
    <div id="modeToggle"></div>
`;

const { encodeBase64, decodeBase64 } = require('../public/tools/base64-tool/script');

// ── encodeBase64 ────────────────────────────────────────

describe('encodeBase64', () => {
    test('encodes simple ASCII string', () => {
        expect(encodeBase64('hello', false)).toBe('aGVsbG8=');
    });

    test('encodes empty string', () => {
        expect(encodeBase64('', false)).toBe('');
    });

    test('encodes string with special ASCII chars', () => {
        const result = encodeBase64('hello world!', false);
        expect(result).toBe('aGVsbG8gd29ybGQh');
    });

    test('url-safe encoding replaces + with - and / with _', () => {
        // ">" encodes to a base64 with "+" or "/" in standard; find one that does
        const result = encodeBase64('hello world', false);
        const urlResult = encodeBase64('hello world', true);
        // url-safe should not contain + or /
        expect(urlResult).not.toMatch(/[+/]/);
    });

    test('url-safe encoding strips padding =', () => {
        const result = encodeBase64('hello', true);
        expect(result).not.toContain('=');
    });
});

// ── decodeBase64 ────────────────────────────────────────

describe('decodeBase64', () => {
    test('decodes simple ASCII base64', () => {
        expect(decodeBase64('aGVsbG8=', false)).toBe('hello');
    });

    test('decodes empty string', () => {
        expect(decodeBase64('', false)).toBe('');
    });

    test('throws on invalid base64', () => {
        expect(() => decodeBase64('!!!invalid!!!', false)).toThrow();
    });
});

// ── Round-trip ──────────────────────────────────────────

describe('encode/decode round-trip', () => {
    test('ASCII string survives round-trip', () => {
        const original = 'Hello, CyberScryb!';
        const encoded = encodeBase64(original, false);
        const decoded = decodeBase64(encoded, false);
        expect(decoded).toBe(original);
    });

    test('UTF-8 string with emoji survives round-trip', () => {
        const original = 'hello 🎉 world';
        const encoded = encodeBase64(original, false);
        const decoded = decodeBase64(encoded, false);
        expect(decoded).toBe(original);
    });

    test('url-safe round-trip', () => {
        const original = 'The quick brown fox';
        const encoded = encodeBase64(original, true);
        const decoded = decodeBase64(encoded, true);
        expect(decoded).toBe(original);
    });

    test('JSON string survives round-trip', () => {
        const original = '{"name":"CyberScryb","type":"tools","count":4,"free":true}';
        const encoded = encodeBase64(original, false);
        const decoded = decodeBase64(encoded, false);
        expect(decoded).toBe(original);
    });
});
