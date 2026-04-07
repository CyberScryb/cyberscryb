/**
 * Firebase Cloud Functions Tests
 * Tests: rate limiter, email validation, IP extraction, referer check
 *
 * These test the pure logic extracted from functions/index.js.
 * Since the module has side effects (admin.initializeApp, setInterval),
 * we test the logic patterns directly rather than importing the module.
 */

// ── getClientIP logic ───────────────────────────────────

describe('getClientIP logic', () => {
    function getClientIP(req) {
        return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
               req.connection?.remoteAddress || 'unknown';
    }

    test('extracts first IP from x-forwarded-for', () => {
        const req = { headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' }, connection: {} };
        expect(getClientIP(req)).toBe('1.2.3.4');
    });

    test('trims whitespace from forwarded IP', () => {
        const req = { headers: { 'x-forwarded-for': '  1.2.3.4 , 5.6.7.8' }, connection: {} };
        expect(getClientIP(req)).toBe('1.2.3.4');
    });

    test('falls back to remoteAddress', () => {
        const req = { headers: {}, connection: { remoteAddress: '10.0.0.1' } };
        expect(getClientIP(req)).toBe('10.0.0.1');
    });

    test('returns unknown when no IP available', () => {
        const req = { headers: {}, connection: {} };
        expect(getClientIP(req)).toBe('unknown');
    });

    test('handles single IP in x-forwarded-for', () => {
        const req = { headers: { 'x-forwarded-for': '1.2.3.4' }, connection: {} };
        expect(getClientIP(req)).toBe('1.2.3.4');
    });
});

// ── checkRateLimit logic ────────────────────────────────

describe('checkRateLimit logic', () => {
    const RATE_LIMIT = {
        perIpPerMinute: 10,
        globalPerDay: 500,
    };

    let rateLimitStore;
    let globalDailyCount;
    let globalDayReset;

    function checkRateLimit(ip) {
        const now = Date.now();

        if (now > globalDayReset) {
            globalDailyCount = 0;
            globalDayReset = now + 86400000;
        }

        if (globalDailyCount >= RATE_LIMIT.globalPerDay) {
            return { allowed: false, reason: 'Daily limit reached. Try again tomorrow.' };
        }

        if (!rateLimitStore[ip] || now > rateLimitStore[ip].resetTime) {
            rateLimitStore[ip] = { count: 0, resetTime: now + 60000 };
        }

        if (rateLimitStore[ip].count >= RATE_LIMIT.perIpPerMinute) {
            return { allowed: false, reason: 'Too many requests. Please wait a minute.' };
        }

        rateLimitStore[ip].count++;
        globalDailyCount++;
        return { allowed: true };
    }

    beforeEach(() => {
        rateLimitStore = {};
        globalDailyCount = 0;
        globalDayReset = Date.now() + 86400000;
    });

    test('allows first request', () => {
        expect(checkRateLimit('1.2.3.4')).toEqual({ allowed: true });
    });

    test('allows up to 10 requests per IP per minute', () => {
        for (let i = 0; i < 10; i++) {
            expect(checkRateLimit('1.2.3.4').allowed).toBe(true);
        }
    });

    test('blocks 11th request from same IP', () => {
        for (let i = 0; i < 10; i++) {
            checkRateLimit('1.2.3.4');
        }
        const result = checkRateLimit('1.2.3.4');
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('Too many requests');
    });

    test('different IPs have separate limits', () => {
        for (let i = 0; i < 10; i++) {
            checkRateLimit('1.2.3.4');
        }
        expect(checkRateLimit('1.2.3.4').allowed).toBe(false);
        expect(checkRateLimit('5.6.7.8').allowed).toBe(true);
    });

    test('blocks when global daily limit reached', () => {
        globalDailyCount = 500;
        const result = checkRateLimit('new-ip');
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain('Daily limit');
    });

    test('resets global counter after 24h', () => {
        globalDailyCount = 500;
        globalDayReset = Date.now() - 1; // Expired
        const result = checkRateLimit('1.2.3.4');
        expect(result.allowed).toBe(true);
    });
});

// ── Email Validation Regex ──────────────────────────────

describe('email validation regex', () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    test('accepts valid emails', () => {
        expect(emailRegex.test('user@example.com')).toBe(true);
        expect(emailRegex.test('user.name@domain.co')).toBe(true);
        expect(emailRegex.test('user+tag@example.org')).toBe(true);
    });

    test('rejects invalid emails', () => {
        expect(emailRegex.test('')).toBe(false);
        expect(emailRegex.test('notanemail')).toBe(false);
        expect(emailRegex.test('@domain.com')).toBe(false);
        expect(emailRegex.test('user@')).toBe(false);
        expect(emailRegex.test('user @domain.com')).toBe(false);
    });

    test('rejects emails with spaces', () => {
        expect(emailRegex.test('user name@domain.com')).toBe(false);
        expect(emailRegex.test('user@dom ain.com')).toBe(false);
    });
});

// ── Referer Security Check ──────────────────────────────

describe('referer security check', () => {
    // Current implementation (VULNERABLE)
    function currentRefererCheck(referer) {
        return !referer ||
            referer.includes('cyberscryb.com') ||
            referer.includes('localhost') ||
            referer.includes('web.app');
    }

    // Proposed fix (SECURE)
    function secureRefererCheck(referer) {
        if (!referer) return true;
        try {
            const hostname = new URL(referer).hostname;
            return hostname === 'cyberscryb.com' ||
                   hostname.endsWith('.cyberscryb.com') ||
                   hostname === 'localhost' ||
                   hostname.endsWith('.web.app');
        } catch {
            return false;
        }
    }

    test('VULNERABILITY: current check allows spoofed referer', () => {
        // An attacker can bypass the current check with a crafted referer
        const maliciousReferer = 'https://evil.com?fake=cyberscryb.com';
        expect(currentRefererCheck(maliciousReferer)).toBe(true); // BUG: should be false
    });

    test('secure check blocks spoofed referer', () => {
        const maliciousReferer = 'https://evil.com?fake=cyberscryb.com';
        expect(secureRefererCheck(maliciousReferer)).toBe(false);
    });

    test('secure check allows legitimate referers', () => {
        expect(secureRefererCheck('https://cyberscryb.com/tools/humanizer')).toBe(true);
        expect(secureRefererCheck('http://localhost:5000/test')).toBe(true);
        expect(secureRefererCheck('https://gen-lang-client-0384486156.web.app/page')).toBe(true);
    });

    test('secure check allows null/undefined referer', () => {
        expect(secureRefererCheck(null)).toBe(true);
        expect(secureRefererCheck(undefined)).toBe(true);
    });

    test('secure check blocks other domains', () => {
        expect(secureRefererCheck('https://evil.com')).toBe(false);
        expect(secureRefererCheck('https://notcyberscryb.com')).toBe(false);
    });
});
