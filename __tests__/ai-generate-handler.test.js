process.env.NODE_ENV = 'test';

// Mock firebase deps to prevent initializeApp side effects
jest.mock('firebase-admin', () => ({
    initializeApp: jest.fn(),
    firestore: jest.fn(() => ({ collection: jest.fn() })),
}));
jest.mock('firebase-functions/v1', () => ({
    https: { onRequest: jest.fn() },
    runWith: jest.fn(() => ({ https: { onRequest: jest.fn() } })),
    config: jest.fn(() => ({})),
    pubsub: {
        schedule: jest.fn(() => ({
            timeZone: jest.fn(() => ({
                onRun: jest.fn(),
            })),
        })),
    },
}));

const { isAllowedReferer, sanitizeParams, AI_PROMPTS, ALLOWED_HOSTS } = require('../functions/index.js').__testing;

// ─── isAllowedReferer ────────────────────────────────────

describe('isAllowedReferer', () => {
    test('rejects requests with no referer and no origin (fail closed against scripted abuse)', () => {
        expect(isAllowedReferer(null)).toBe(false);
        expect(isAllowedReferer(undefined)).toBe(false);
        expect(isAllowedReferer('')).toBe(false);
    });

    test('falls back to Origin header when Referer is absent', () => {
        expect(isAllowedReferer(null, 'https://cyberscryb.com')).toBe(true);
        expect(isAllowedReferer(undefined, 'https://evil.com')).toBe(false);
    });

    test('allows requests from cyberscryb.com', () => {
        expect(isAllowedReferer('https://cyberscryb.com/')).toBe(true);
        expect(isAllowedReferer('https://cyberscryb.com/tools/summarizer/')).toBe(true);
    });

    test('allows requests from www.cyberscryb.com', () => {
        expect(isAllowedReferer('https://www.cyberscryb.com/')).toBe(true);
    });

    test('allows requests from localhost', () => {
        expect(isAllowedReferer('http://localhost:3000/')).toBe(true);
        expect(isAllowedReferer('http://localhost/')).toBe(true);
    });

    test('allows requests from Firebase hosting domain', () => {
        expect(isAllowedReferer('https://gen-lang-client-0384486156.web.app/')).toBe(true);
    });

    test('blocks requests from unauthorized domains', () => {
        expect(isAllowedReferer('https://evil.com/')).toBe(false);
        expect(isAllowedReferer('https://notcyberscryb.com/')).toBe(false);
        expect(isAllowedReferer('https://fake-cyberscryb.com/')).toBe(false);
    });

    test('blocks attempts to bypass with query-param trick', () => {
        // This would have been allowed by a naive string.includes() check
        // Using new URL().hostname prevents it
        expect(isAllowedReferer('https://evil.com/?ref=cyberscryb.com')).toBe(false);
    });

    test('blocks cyberscryb.com.evil.com subdomain spoofing', () => {
        expect(isAllowedReferer('https://cyberscryb.com.evil.com/')).toBe(false);
    });

    test('allows valid subdomains of allowed hosts', () => {
        // subdomains of cyberscryb.com should be allowed
        expect(isAllowedReferer('https://app.cyberscryb.com/')).toBe(true);
    });

    test('returns false for malformed URLs', () => {
        expect(isAllowedReferer('not-a-url')).toBe(false);
        expect(isAllowedReferer('://broken')).toBe(false);
    });

    test('ALLOWED_HOSTS contains expected entries', () => {
        expect(ALLOWED_HOSTS).toContain('cyberscryb.com');
        expect(ALLOWED_HOSTS).toContain('www.cyberscryb.com');
        expect(ALLOWED_HOSTS).toContain('localhost');
    });
});

// ─── sanitizeParams ───────────────────────────────────────

describe('sanitizeParams', () => {
    test('returns empty object for null/undefined/non-object input', () => {
        expect(sanitizeParams(null)).toEqual({});
        expect(sanitizeParams(undefined)).toEqual({});
        expect(sanitizeParams('string')).toEqual({});
        expect(sanitizeParams([])).toEqual({});
        expect(sanitizeParams(42)).toEqual({});
    });

    test('passes through boolean values unchanged', () => {
        expect(sanitizeParams({ bullet: true })).toEqual({ bullet: true });
        expect(sanitizeParams({ bullet: false })).toEqual({ bullet: false });
    });

    test('clamps numeric values to 1-20 range', () => {
        expect(sanitizeParams({ count: 5 })).toEqual({ count: 5 });
        expect(sanitizeParams({ count: 0 })).toEqual({ count: 1 });
        expect(sanitizeParams({ count: -10 })).toEqual({ count: 1 });
        expect(sanitizeParams({ count: 100 })).toEqual({ count: 20 });
        expect(sanitizeParams({ count: 20 })).toEqual({ count: 20 });
    });

    test('floors float numbers', () => {
        expect(sanitizeParams({ count: 3.9 })).toEqual({ count: 3 });
        expect(sanitizeParams({ count: 1.1 })).toEqual({ count: 1 });
    });

    test('truncates strings to MAX_PARAM_LENGTH (300 chars)', () => {
        const longStr = 'a'.repeat(500);
        const result = sanitizeParams({ role: longStr });
        expect(result.role.length).toBe(300);
    });

    test('passes short strings through unchanged', () => {
        expect(sanitizeParams({ role: 'Software Engineer' })).toEqual({ role: 'Software Engineer' });
    });

    test('allowlists voice parameter', () => {
        expect(sanitizeParams({ voice: 'conversational' })).toEqual({ voice: 'conversational' });
        expect(sanitizeParams({ voice: 'educational' })).toEqual({ voice: 'educational' });
        expect(sanitizeParams({ voice: 'strategic' })).toEqual({ voice: 'strategic' });
        // Invalid voice value is dropped
        expect(sanitizeParams({ voice: 'evil_injection' })).toEqual({});
    });

    test('allowlists platform parameter', () => {
        expect(sanitizeParams({ platform: 'LinkedIn' })).toEqual({ platform: 'LinkedIn' });
        expect(sanitizeParams({ platform: 'Twitter' })).toEqual({ platform: 'Twitter' });
        // Invalid platform is dropped
        expect(sanitizeParams({ platform: 'EvilSite' })).toEqual({});
    });

    test('allowlists docType parameter', () => {
        expect(sanitizeParams({ docType: 'parenting plan' })).toEqual({ docType: 'parenting plan' });
        expect(sanitizeParams({ docType: 'custody declaration' })).toEqual({ docType: 'custody declaration' });
        // Invalid docType is dropped
        expect(sanitizeParams({ docType: 'injection_attempt' })).toEqual({});
    });

    test('handles mixed params correctly', () => {
        const result = sanitizeParams({
            voice: 'conversational',
            count: 3,
            bullet: true,
            role: 'Developer',
        });
        expect(result).toEqual({
            voice: 'conversational',
            count: 3,
            bullet: true,
            role: 'Developer',
        });
    });
});

// ─── AI_PROMPTS structural assertions ─────────────────────

describe('AI_PROMPTS — no missing tool handler (error branch guard)', () => {
    test('all tools have a build function that returns a string', () => {
        for (const [toolId, config] of Object.entries(AI_PROMPTS)) {
            const result = config.build('SAMPLE INPUT', {});
            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
        }
    });

    test('no tool key contains spaces (would break URL routing)', () => {
        for (const toolId of Object.keys(AI_PROMPTS)) {
            expect(toolId).not.toContain(' ');
        }
    });

    test('all tool keys are lowercase with hyphens only', () => {
        for (const toolId of Object.keys(AI_PROMPTS)) {
            expect(toolId).toMatch(/^[a-z0-9-]+$/);
        }
    });

    test('missing tool returns undefined (would trigger 400 in handler)', () => {
        expect(AI_PROMPTS['nonexistent-tool']).toBeUndefined();
    });
});
