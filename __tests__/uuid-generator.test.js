/**
 * UUID Generator Tests
 * CRITICAL security: source must NOT use Math.random()
 *
 * @jest-environment jsdom
 */

const fs = require('fs');
const path = require('path');

// Set up minimal DOM for crypto globals
const { generateUUID } = require('../public/tools/uuid-generator/script');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ── Format validation ────────────────────────────────────

describe('generateUUID — format', () => {
    test('generated UUID matches RFC 4122 v4 format', () => {
        const uuid = generateUUID();
        expect(uuid).toMatch(UUID_REGEX);
    });

    test('version nibble is 4', () => {
        const uuid = generateUUID();
        // 13th character (index 14) must be '4'
        expect(uuid[14]).toBe('4');
    });

    test('variant bits are correct (8, 9, a, or b at position 19)', () => {
        const uuid = generateUUID();
        // Character at index 19 (after 3rd hyphen) must be 8, 9, a, or b
        expect(uuid[19]).toMatch(/^[89ab]$/i);
    });

    test('UUID is 36 characters long', () => {
        const uuid = generateUUID();
        expect(uuid.length).toBe(36);
    });

    test('hyphens are in correct positions', () => {
        const uuid = generateUUID();
        expect(uuid[8]).toBe('-');
        expect(uuid[13]).toBe('-');
        expect(uuid[18]).toBe('-');
        expect(uuid[23]).toBe('-');
    });
});

// ── Uniqueness ───────────────────────────────────────────

describe('generateUUID — uniqueness', () => {
    test('100 generated UUIDs are all unique', () => {
        const uuids = new Set();
        for (let i = 0; i < 100; i++) {
            uuids.add(generateUUID());
        }
        expect(uuids.size).toBe(100);
    });

    test('two consecutive UUIDs are not equal', () => {
        expect(generateUUID()).not.toBe(generateUUID());
    });
});

// ── CRITICAL security test ───────────────────────────────

describe('security audit', () => {
    test('CRITICAL: source file does NOT call Math.random()', () => {
        const sourcePath = path.resolve(__dirname, '../public/tools/uuid-generator/script.js');
        const source = fs.readFileSync(sourcePath, 'utf8');
        // Strip comments first, then check for Math.random() calls in actual code
        const noComments = source
            .replace(/\/\*[\s\S]*?\*\//g, '')   // remove block comments
            .replace(/\/\/.*/g, '');              // remove line comments
        expect(noComments).not.toContain('Math.random');
    });

    test('source file uses crypto.getRandomValues()', () => {
        const sourcePath = path.resolve(__dirname, '../public/tools/uuid-generator/script.js');
        const source = fs.readFileSync(sourcePath, 'utf8');
        expect(source).toContain('crypto.getRandomValues');
    });
});
