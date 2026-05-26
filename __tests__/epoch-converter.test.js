/**
 * Epoch Converter Tests
 */

const { epochToISO, isoToEpoch, tsToDate, relativeTime } = require('../public/tools/epoch-converter/script');

// ── epochToISO ───────────────────────────────────────────

describe('epochToISO', () => {
    test('epoch 0 returns "1970-01-01T00:00:00.000Z"', () => {
        expect(epochToISO(0)).toBe('1970-01-01T00:00:00.000Z');
    });

    test('known epoch returns correct ISO string', () => {
        // 2026-01-01T00:00:00.000Z = 1735689600
        expect(epochToISO(1735689600)).toBe('2026-01-01T00:00:00.000Z');
    });

    test('returns a string ending in Z (UTC)', () => {
        const result = epochToISO(1000000);
        expect(result).toMatch(/Z$/);
    });

    test('returns ISO 8601 format', () => {
        const result = epochToISO(1000000);
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
});

// ── isoToEpoch ───────────────────────────────────────────

describe('isoToEpoch', () => {
    test('"1970-01-01T00:00:00.000Z" returns 0', () => {
        expect(isoToEpoch('1970-01-01T00:00:00.000Z')).toBe(0);
    });

    test('"2026-01-01T00:00:00.000Z" returns correct timestamp', () => {
        expect(isoToEpoch('2026-01-01T00:00:00.000Z')).toBe(1735689600);
    });

    test('returns an integer (floor of milliseconds/1000)', () => {
        const result = isoToEpoch('2026-06-15T12:30:45.000Z');
        expect(Number.isInteger(result)).toBe(true);
    });
});

// ── Round-trip ───────────────────────────────────────────

describe('round-trip', () => {
    test('epochToISO then isoToEpoch returns original epoch', () => {
        const original = 1735689600;
        const iso = epochToISO(original);
        const back = isoToEpoch(iso);
        expect(back).toBe(original);
    });

    test('isoToEpoch then epochToISO returns original ISO string', () => {
        const original = '2026-03-15T08:30:00.000Z';
        const epoch = isoToEpoch(original);
        const back = epochToISO(epoch);
        expect(back).toBe(original);
    });
});

// ── tsToDate ─────────────────────────────────────────────

describe('tsToDate', () => {
    test('seconds timestamp (10 digits) returns correct Date', () => {
        const date = tsToDate(0);
        expect(date.toISOString()).toBe('1970-01-01T00:00:00.000Z');
    });

    test('milliseconds timestamp (13 digits) returns correct Date', () => {
        const date = tsToDate(1735689600000);
        expect(date.toISOString()).toBe('2026-01-01T00:00:00.000Z');
    });

    test('auto-detects ms vs seconds correctly', () => {
        const secDate = tsToDate(1735689600);
        const msDate = tsToDate(1735689600000);
        expect(secDate.toISOString()).toBe(msDate.toISOString());
    });
});

// ── relativeTime ─────────────────────────────────────────

describe('relativeTime', () => {
    test('past date shows "X seconds ago"', () => {
        const past = new Date(Date.now() - 30 * 1000);
        const result = relativeTime(past);
        expect(result).toMatch(/seconds ago$/);
    });

    test('future date shows "in X seconds"', () => {
        const future = new Date(Date.now() + 30 * 1000);
        const result = relativeTime(future);
        expect(result).toMatch(/^in \d+ seconds$/);
    });

    test('past 2 minutes shows "X minutes ago"', () => {
        const past = new Date(Date.now() - 2 * 60 * 1000);
        const result = relativeTime(past);
        expect(result).toMatch(/minutes ago$/);
    });

    test('past 3 hours shows "X hours ago"', () => {
        const past = new Date(Date.now() - 3 * 3600 * 1000);
        const result = relativeTime(past);
        expect(result).toMatch(/hours ago$/);
    });
});
