process.env.NODE_ENV = 'test';

// In-memory fake Firestore supporting doc().get()/set() and runTransaction
function createFakeDb() {
    const store = new Map();

    const makeDocRef = (path) => ({
        path,
        get: async () => {
            const data = store.get(path);
            return {
                exists: data !== undefined,
                data: () => data,
            };
        },
        set: async (data) => {
            const existing = store.get(path) || {};
            let count = existing.count || 0;
            if (data.count && data.count.__increment !== undefined) {
                count += data.count.__increment;
            } else if (typeof data.count === 'number') {
                count = data.count;
            }
            store.set(path, { ...existing, ...data, count });
        },
    });

    const db = {
        collection: (name) => ({
            doc: (id) => makeDocRef(`${name}/${id}`),
        }),
        runTransaction: async (fn) => {
            const tx = {
                get: async (ref) => ref.get(),
                set: (ref, data, opts) => {
                    const existing = store.get(ref.path) || {};
                    let count = existing.count || 0;
                    if (data.count && data.count.__increment !== undefined) {
                        count += data.count.__increment;
                    } else if (typeof data.count === 'number') {
                        count = data.count;
                    }
                    store.set(ref.path, { ...existing, ...data, count });
                },
            };
            return fn(tx);
        },
        __store: store,
    };
    return db;
}

let mockFakeDb;

jest.mock('firebase-admin', () => {
    const FieldValue = {
        increment: (n) => ({ __increment: n }),
        serverTimestamp: () => 'SERVER_TIMESTAMP',
    };
    return {
        initializeApp: jest.fn(),
        firestore: Object.assign(jest.fn(() => mockFakeDb), { FieldValue }),
    };
});

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

describe('Firestore-backed rate limiting', () => {
    let checkFirestoreRateLimit, getIpHash, getDateString, GLOBAL_DAILY_CAP, FIRESTORE_TIER_CAPS;

    beforeEach(() => {
        mockFakeDb = createFakeDb();
        jest.resetModules();
        const mod = require('../functions/index.js');
        ({ checkFirestoreRateLimit, getIpHash, getDateString, GLOBAL_DAILY_CAP, FIRESTORE_TIER_CAPS } = mod.__testing);
    });

    function makeReq({ ip = '1.2.3.4', cookies = {}, headers = {} } = {}) {
        return {
            headers: { 'x-forwarded-for': ip, ...headers },
            connection: { remoteAddress: ip },
            cookies,
        };
    }

    test('fresh day/IP is allowed', async () => {
        const result = await checkFirestoreRateLimit(makeReq());
        expect(result.allowed).toBe(true);
    });

    test('global and per-IP counters increment at correct doc paths', async () => {
        const req = makeReq({ ip: '5.6.7.8' });
        await checkFirestoreRateLimit(req);

        const dateStr = getDateString();
        const ipHash = getIpHash(req);

        const globalDoc = mockFakeDb.__store.get(`usage/daily-${dateStr}`);
        expect(globalDoc).toBeDefined();
        expect(globalDoc.count).toBe(1);

        const ipDoc = mockFakeDb.__store.get(`rateLimits/${ipHash}-${dateStr}`);
        expect(ipDoc).toBeDefined();
        expect(ipDoc.count).toBe(1);
    });

    test('exceeding global cap blocks with 429-style response shape', async () => {
        const dateStr = getDateString();
        mockFakeDb.__store.set(`usage/daily-${dateStr}`, { count: GLOBAL_DAILY_CAP });

        const result = await checkFirestoreRateLimit(makeReq({ ip: '9.9.9.9' }));
        expect(result.allowed).toBe(false);
        expect(result.reason).toMatch(/capacity/i);
        expect(typeof result.retryAfter).toBe('number');
    });

    test('exceeding per-IP tier cap blocks', async () => {
        const req = makeReq({ ip: '10.10.10.10' });
        const dateStr = getDateString();
        const ipHash = getIpHash(req);
        const cap = FIRESTORE_TIER_CAPS.anonymous;

        mockFakeDb.__store.set(`rateLimits/${ipHash}-${dateStr}`, { count: cap, tier: 'anonymous' });

        const result = await checkFirestoreRateLimit(req);
        expect(result.allowed).toBe(false);
        expect(result.reason).toMatch(/daily limit/i);
    });

    test('per-IP tier cap respects subscribed tier', async () => {
        const req = makeReq({ ip: '11.11.11.11', cookies: { cs_subscribed: '1' } });
        const dateStr = getDateString();
        const ipHash = getIpHash(req);

        // Set count just under the subscribed cap - should be allowed
        mockFakeDb.__store.set(`rateLimits/${ipHash}-${dateStr}`, { count: FIRESTORE_TIER_CAPS.subscribed - 1, tier: 'subscribed' });

        const result = await checkFirestoreRateLimit(req);
        expect(result.allowed).toBe(true);

        // Now at cap - should block
        mockFakeDb.__store.set(`rateLimits/${ipHash}-${dateStr}`, { count: FIRESTORE_TIER_CAPS.subscribed, tier: 'subscribed' });
        const result2 = await checkFirestoreRateLimit(req);
        expect(result2.allowed).toBe(false);
    });

    test('IP hashing is deterministic and never contains the raw IP', () => {
        const req = makeReq({ ip: '123.45.67.89' });
        const hash1 = getIpHash(req);
        const hash2 = getIpHash(req);
        expect(hash1).toBe(hash2);
        expect(hash1).not.toContain('123.45.67.89');
        expect(hash1).toMatch(/^[a-f0-9]{64}$/); // sha256 hex
    });

    test('different IPs produce different hashes', () => {
        const hashA = getIpHash(makeReq({ ip: '1.1.1.1' }));
        const hashB = getIpHash(makeReq({ ip: '2.2.2.2' }));
        expect(hashA).not.toBe(hashB);
    });

    test('global cap check fails CLOSED on Firestore error', async () => {
        // per-IP transaction succeeds; global get/set throws
        const realCollection = mockFakeDb.collection.bind(mockFakeDb);
        mockFakeDb.collection = (name) => {
            const col = realCollection(name);
            if (name === 'usage') {
                return {
                    doc: (id) => ({
                        ...col.doc(id),
                        get: async () => { throw new Error('Firestore unavailable'); },
                    }),
                };
            }
            return col;
        };

        const result = await checkFirestoreRateLimit(makeReq({ ip: '7.7.7.7' }));
        expect(result.allowed).toBe(false);
        expect(typeof result.retryAfter).toBe('number');
    });

    test('per-IP cap check fails OPEN on Firestore error, global still increments', async () => {
        const dateStr = getDateString();
        // per-IP transaction throws; global get/set succeeds normally
        mockFakeDb.runTransaction = async () => {
            throw new Error('Firestore unavailable for per-IP doc');
        };

        const result = await checkFirestoreRateLimit(makeReq({ ip: '8.8.8.8' }));
        expect(result.allowed).toBe(true);

        // global counter still incremented
        const globalDoc = mockFakeDb.__store.get(`usage/daily-${dateStr}`);
        expect(globalDoc.count).toBe(1);
    });
});
