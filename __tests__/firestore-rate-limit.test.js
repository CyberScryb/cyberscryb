/**
 * Firestore-Backed Rate Limiter Tests
 *
 * Verifies the cross-instance rate limiting in functions/index.js
 * (checkRateLimitFirestore). The old in-memory limiter could not enforce a
 * global cap across multiple Cloud Functions instances; these tests exercise
 * the Firestore-backed replacement.
 *
 * We mock firebase-admin's Firestore with an in-memory store so no real
 * Firestore (or Gemini) calls happen.
 */

process.env.NODE_ENV = 'test';

// ── In-memory Firestore mock ────────────────────────────
// Models the subset of the Firestore API the limiter uses:
//   db.collection(name).doc(id).set({...}, {merge}) / .get()
//   admin.firestore.FieldValue.increment(n) / .serverTimestamp()
//
// Everything the jest.mock factory closes over must be `mock`-prefixed
// (Jest hoists the factory above all other code). State + controls are
// exposed on the mocked module's `__mock` object so tests can drive them.
jest.mock('firebase-admin', () => {
    const mockStore = new Map(); // key: `${collection}/${docId}` -> data object
    const ctrl = { failSet: false, failCollection: null };
    const INCREMENT = Symbol('increment');
    const SERVER_TS = Symbol('serverTimestamp');

    const applyValue = (existing, value) => {
        if (value && value.__op === INCREMENT) {
            return (typeof existing === 'number' ? existing : 0) + value.n;
        }
        if (value && value.__op === SERVER_TS) return Date.now();
        return value;
    };

    const makeDocRef = (key) => ({
        async set(data, options) {
            const merge = options && options.merge;
            const current = merge ? (mockStore.get(key) || {}) : {};
            const next = { ...current };
            for (const [k, v] of Object.entries(data)) {
                next[k] = applyValue(current[k], v);
            }
            mockStore.set(key, next);
        },
        async get() {
            const data = mockStore.get(key);
            return { exists: data !== undefined, data: () => data };
        },
    });

    const firestoreFn = () => ({
        collection: (col) => ({
            doc: (id) => {
                const key = `${col}/${id}`;
                const ref = makeDocRef(key);
                if (ctrl.failSet || (ctrl.failCollection && col === ctrl.failCollection)) {
                    return { set: async () => { throw new Error('Firestore unavailable'); }, get: ref.get };
                }
                return ref;
            },
        }),
    });
    firestoreFn.FieldValue = {
        increment: (n) => ({ __op: INCREMENT, n }),
        serverTimestamp: () => ({ __op: SERVER_TS }),
    };

    return {
        initializeApp: jest.fn(),
        firestore: firestoreFn,
        // Test-only handles (not part of the real firebase-admin API).
        __mock: { store: mockStore, ctrl },
    };
});

const admin = require('firebase-admin');
const store = admin.__mock.store;
const ctrl = admin.__mock.ctrl;
function resetStore() { store.clear(); }

jest.mock('firebase-functions/v1', () => ({
    https: { onRequest: jest.fn() },
    runWith: jest.fn(() => ({ https: { onRequest: jest.fn() } })),
    config: jest.fn(() => ({})),
    pubsub: {
        schedule: jest.fn(() => ({
            timeZone: jest.fn(() => ({ onRun: jest.fn() })),
        })),
    },
}));

const {
    checkRateLimitFirestore,
    hashIp,
    utcDayString,
    GLOBAL_DAILY_CAP,
    PER_IP_DAILY_CAP,
} = require('../functions/index.js').__testing;

function reqWithIp(ip) {
    return { headers: { 'x-forwarded-for': ip }, connection: {} };
}

beforeEach(() => {
    resetStore();
    ctrl.failSet = false;
    ctrl.failCollection = null;
});

// ── hashIp (privacy) ────────────────────────────────────

describe('hashIp', () => {
    test('hashes the IP (never returns the raw IP)', () => {
        const h = hashIp(reqWithIp('203.0.113.7'));
        expect(h).not.toContain('203.0.113.7');
        expect(h).toMatch(/^[a-f0-9]{32}$/);
    });

    test('is deterministic for the same IP', () => {
        expect(hashIp(reqWithIp('1.2.3.4'))).toBe(hashIp(reqWithIp('1.2.3.4')));
    });

    test('differs across IPs', () => {
        expect(hashIp(reqWithIp('1.2.3.4'))).not.toBe(hashIp(reqWithIp('5.6.7.8')));
    });

    test('uses the first IP in x-forwarded-for', () => {
        expect(hashIp(reqWithIp('1.2.3.4, 5.6.7.8'))).toBe(hashIp(reqWithIp('1.2.3.4')));
    });
});

// ── Fresh day / IP is allowed + counter increments ──────

describe('checkRateLimitFirestore — fresh day/IP', () => {
    test('allows a fresh request', async () => {
        const result = await checkRateLimitFirestore(reqWithIp('1.2.3.4'), 'anonymous');
        expect(result.allowed).toBe(true);
        expect(result.globalCount).toBe(1);
        expect(result.ipCount).toBe(1);
    });

    test('increments the global daily counter at usage/daily-{date}', async () => {
        await checkRateLimitFirestore(reqWithIp('1.2.3.4'), 'anonymous');
        await checkRateLimitFirestore(reqWithIp('5.6.7.8'), 'anonymous');
        const day = utcDayString();
        expect(store.get(`usage/daily-${day}`).count).toBe(2);
    });

    test('increments a per-IP counter at rateLimits/{ipHash}-{date}', async () => {
        const req = reqWithIp('1.2.3.4');
        await checkRateLimitFirestore(req, 'anonymous');
        await checkRateLimitFirestore(req, 'anonymous');
        const day = utcDayString();
        const key = `rateLimits/${hashIp(req)}-${day}`;
        expect(store.get(key).count).toBe(2);
    });

    test('different IPs get separate per-IP counters', async () => {
        await checkRateLimitFirestore(reqWithIp('1.2.3.4'), 'anonymous');
        const r = await checkRateLimitFirestore(reqWithIp('5.6.7.8'), 'anonymous');
        expect(r.allowed).toBe(true);
        expect(r.ipCount).toBe(1); // fresh for the second IP
    });
});

// ── Global cap enforcement ──────────────────────────────

describe('checkRateLimitFirestore — global daily cap', () => {
    test('blocks with a 429-style limit result once the global cap is exceeded', async () => {
        const day = utcDayString();
        // Pre-seed the global counter at the cap.
        store.set(`usage/daily-${day}`, { count: GLOBAL_DAILY_CAP });

        const result = await checkRateLimitFirestore(reqWithIp('9.9.9.9'), 'anonymous');
        expect(result.allowed).toBe(false);
        expect(result.reason).toMatch(/capacity/i);
        expect(result.retryAfter).toBeGreaterThan(0);
    });

    test('allows the request that lands exactly on the cap, blocks the next', async () => {
        const day = utcDayString();
        store.set(`usage/daily-${day}`, { count: GLOBAL_DAILY_CAP - 1 });

        const onCap = await checkRateLimitFirestore(reqWithIp('1.1.1.1'), 'subscribed');
        expect(onCap.allowed).toBe(true); // count becomes exactly GLOBAL_DAILY_CAP

        const over = await checkRateLimitFirestore(reqWithIp('2.2.2.2'), 'subscribed');
        expect(over.allowed).toBe(false);
    });
});

// ── Per-IP cap enforcement ──────────────────────────────

describe('checkRateLimitFirestore — per-IP daily cap', () => {
    test('blocks once a single IP exceeds its tier cap', async () => {
        const req = reqWithIp('7.7.7.7');
        const day = utcDayString();
        // Seed the per-IP counter at the anonymous cap so the next call exceeds it.
        store.set(`rateLimits/${hashIp(req)}-${day}`, { count: PER_IP_DAILY_CAP.anonymous });

        const result = await checkRateLimitFirestore(req, 'anonymous');
        expect(result.allowed).toBe(false);
        expect(result.reason).toMatch(/daily limit/i);
    });

    test('subscribed tier gets a higher per-IP cap than anonymous', async () => {
        expect(PER_IP_DAILY_CAP.subscribed).toBeGreaterThan(PER_IP_DAILY_CAP.anonymous);
    });
});

// ── Fail behavior on Firestore error ────────────────────

describe('checkRateLimitFirestore — Firestore failure modes', () => {
    test('fails CLOSED for the global counter (blocks when Firestore write throws)', async () => {
        ctrl.failSet = true;
        const result = await checkRateLimitFirestore(reqWithIp('4.4.4.4'), 'anonymous');
        expect(result.allowed).toBe(false);
        expect(result.reason).toMatch(/capacity/i);
    });

    test('fails OPEN for the per-IP counter (allows when only the per-IP write throws)', async () => {
        // Global counter writes succeed; only the rateLimits collection errors.
        ctrl.failCollection = 'rateLimits';
        const result = await checkRateLimitFirestore(reqWithIp('8.8.8.8'), 'anonymous');
        expect(result.allowed).toBe(true);
        // Global cap is still enforced (counter was incremented before the IP error).
        expect(result.globalCount).toBe(1);
    });
});
