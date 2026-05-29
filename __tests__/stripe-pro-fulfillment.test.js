process.env.NODE_ENV = 'test';

// ─── Mock Firestore (chainable collection/doc with set + get) ────────────
// A single in-memory store keyed by `${collection}/${docId}` lets us assert
// what the webhook wrote and seed docs for verify-pro. Prefixed `mock` so the
// jest.mock factory is allowed to reference it.
const mockStore = new Map();

jest.mock('firebase-admin', () => {
    const firestore = () => ({
        collection: (col) => ({
            doc: (id) => ({
                set: jest.fn(async (data, opts) => {
                    const key = `${col}/${id}`;
                    const prev = (opts && opts.merge && mockStore.get(key)) || {};
                    mockStore.set(key, { ...prev, ...data });
                }),
                get: jest.fn(async () => {
                    const key = `${col}/${id}`;
                    return { exists: mockStore.has(key), data: () => mockStore.get(key) };
                }),
            }),
            // .add()/.where() used elsewhere in index.js — harmless stubs
            add: jest.fn(async () => ({ id: 'generated' })),
            where: jest.fn(() => ({ limit: () => ({ get: async () => ({ empty: true, docs: [] }) }) })),
        }),
    });
    firestore.FieldValue = { serverTimestamp: () => '__SERVER_TS__' };
    return { initializeApp: jest.fn(), firestore };
});

jest.mock('firebase-functions/v1', () => ({
    https: { onRequest: jest.fn() },
    runWith: jest.fn(() => ({ https: { onRequest: jest.fn() } })),
    config: jest.fn(() => ({
        stripe: { secret_key: 'sk_test_dummy', webhook_secret: 'whsec_dummy' },
    })),
    pubsub: {
        schedule: jest.fn(() => ({ timeZone: jest.fn(() => ({ onRun: jest.fn() })) })),
    },
}));

// ─── Mock Stripe SDK ─────────────────────────────────────────────────────
// constructEvent throws on the sentinel bad signature, otherwise returns a
// pre-built event. customers.retrieve resolves a known email.
const mockConstructEvent = jest.fn();
const mockCustomersRetrieve = jest.fn();

jest.mock('stripe', () => {
    return jest.fn(() => ({
        webhooks: { constructEvent: mockConstructEvent },
        customers: { retrieve: mockCustomersRetrieve },
    }));
});

const {
    handleStripeWebhook,
    handleVerifyPro,
    resolvePlan,
} = require('../functions/index.js').__testing;

// ─── Test helpers ────────────────────────────────────────────────────────
function makeRes() {
    const res = {};
    res.statusCode = 200;
    res.body = undefined;
    res.status = jest.fn((code) => { res.statusCode = code; return res; });
    res.json = jest.fn((payload) => { res.body = payload; return res; });
    res.set = jest.fn(() => res);
    return res;
}

beforeEach(() => {
    mockStore.clear();
    mockConstructEvent.mockReset();
    mockCustomersRetrieve.mockReset();
});

// ─── Webhook: signature failure ──────────────────────────────────────────

describe('stripeWebhook — signature verification', () => {
    test('invalid signature returns 400 (json error)', async () => {
        mockConstructEvent.mockImplementation(() => {
            throw new Error('No signatures found matching the expected signature');
        });

        const req = {
            method: 'POST',
            headers: { 'stripe-signature': 'bad' },
            rawBody: Buffer.from('{}'),
            body: {},
        };
        const res = makeRes();
        await handleStripeWebhook(req, res);

        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual({ error: 'Invalid signature' });
        // Nothing written
        expect(mockStore.size).toBe(0);
    });

    test('non-POST returns 405', async () => {
        const res = makeRes();
        await handleStripeWebhook({ method: 'GET', headers: {} }, res);
        expect(res.statusCode).toBe(405);
    });
});

// ─── Webhook: checkout.session.completed writes pro_subscribers ───────────

describe('stripeWebhook — checkout.session.completed', () => {
    test('valid event writes active subscriber to pro_subscribers', async () => {
        mockConstructEvent.mockReturnValue({
            type: 'checkout.session.completed',
            data: {
                object: {
                    id: 'cs_test_123',
                    customer: 'cus_abc',
                    customer_details: { email: 'Buyer@Example.com' },
                    amount_total: 500,
                },
            },
        });

        const req = {
            method: 'POST',
            headers: { 'stripe-signature': 'good' },
            rawBody: Buffer.from('{}'),
            body: {},
        };
        const res = makeRes();
        await handleStripeWebhook(req, res);

        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({ received: true, fulfilled: true });

        const stored = mockStore.get('pro_subscribers/buyer@example.com');
        expect(stored).toBeDefined();
        expect(stored.email).toBe('buyer@example.com');
        expect(stored.status).toBe('active');
        expect(stored.plan).toBe('monthly');
        expect(stored.stripeCustomerId).toBe('cus_abc');
        expect(stored.stripeSessionId).toBe('cs_test_123');
    });

    test('event without email is acknowledged but not fulfilled', async () => {
        mockConstructEvent.mockReturnValue({
            type: 'checkout.session.completed',
            data: { object: { id: 'cs_test_456', customer_details: {} } },
        });
        const req = { method: 'POST', headers: { 'stripe-signature': 'good' }, rawBody: Buffer.from('{}') };
        const res = makeRes();
        await handleStripeWebhook(req, res);

        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({ received: true, fulfilled: false });
        expect(mockStore.size).toBe(0);
    });
});

// ─── Webhook: customer.subscription.deleted cancels subscriber ───────────

describe('stripeWebhook — customer.subscription.deleted', () => {
    test('resolves email via Stripe customer and marks canceled', async () => {
        mockStore.set('pro_subscribers/buyer@example.com', {
            email: 'buyer@example.com', status: 'active', plan: 'monthly',
        });
        mockCustomersRetrieve.mockResolvedValue({ email: 'Buyer@Example.com' });
        mockConstructEvent.mockReturnValue({
            type: 'customer.subscription.deleted',
            data: { object: { customer: 'cus_abc' } },
        });

        const req = { method: 'POST', headers: { 'stripe-signature': 'good' }, rawBody: Buffer.from('{}') };
        const res = makeRes();
        await handleStripeWebhook(req, res);

        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({ received: true, canceled: true });
        expect(mockStore.get('pro_subscribers/buyer@example.com').status).toBe('canceled');
    });
});

// ─── Webhook: missing secrets ────────────────────────────────────────────

describe('stripeWebhook — config guard', () => {
    test('returns 500 when secrets are absent', async () => {
        const functions = require('firebase-functions/v1');
        functions.config.mockReturnValueOnce({}); // no stripe config
        const oldKey = process.env.STRIPE_SECRET_KEY;
        const oldHook = process.env.STRIPE_WEBHOOK_SECRET;
        delete process.env.STRIPE_SECRET_KEY;
        delete process.env.STRIPE_WEBHOOK_SECRET;

        const res = makeRes();
        await handleStripeWebhook({ method: 'POST', headers: {} }, res);
        expect(res.statusCode).toBe(500);

        if (oldKey) process.env.STRIPE_SECRET_KEY = oldKey;
        if (oldHook) process.env.STRIPE_WEBHOOK_SECRET = oldHook;
    });
});

// ─── verify-pro ──────────────────────────────────────────────────────────

describe('verifyPro', () => {
    test('unknown email returns { pro: false, plan: null }', async () => {
        const req = { method: 'GET', query: { email: 'nobody@example.com' } };
        const res = makeRes();
        await handleVerifyPro(req, res);
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({ pro: false, plan: null });
    });

    test('seeded active email returns { pro: true, plan }', async () => {
        mockStore.set('pro_subscribers/member@example.com', {
            email: 'member@example.com', status: 'active', plan: 'annual',
            stripeCustomerId: 'cus_secret', stripeSessionId: 'cs_secret',
        });
        const req = { method: 'POST', body: { email: 'Member@Example.com' } };
        const res = makeRes();
        await handleVerifyPro(req, res);
        expect(res.statusCode).toBe(200);
        // Only pro + plan — no leaked stripe ids
        expect(res.body).toEqual({ pro: true, plan: 'annual' });
        expect(Object.keys(res.body).sort()).toEqual(['plan', 'pro']);
    });

    test('canceled subscriber returns pro: false', async () => {
        mockStore.set('pro_subscribers/ex@example.com', {
            email: 'ex@example.com', status: 'canceled', plan: 'monthly',
        });
        const req = { method: 'GET', query: { email: 'ex@example.com' } };
        const res = makeRes();
        await handleVerifyPro(req, res);
        expect(res.body).toEqual({ pro: false, plan: null });
    });

    test('invalid email returns 400', async () => {
        const req = { method: 'GET', query: { email: 'not-an-email' } };
        const res = makeRes();
        await handleVerifyPro(req, res);
        expect(res.statusCode).toBe(400);
    });
});

// ─── resolvePlan ─────────────────────────────────────────────────────────

describe('resolvePlan', () => {
    test('prefers metadata.plan', () => {
        expect(resolvePlan({ metadata: { plan: 'lifetime' }, amount_total: 500 })).toBe('lifetime');
    });
    test('maps known amounts', () => {
        expect(resolvePlan({ amount_total: 500 })).toBe('monthly');
        expect(resolvePlan({ amount_total: 2900 })).toBe('annual');
    });
    test('falls back to pro', () => {
        expect(resolvePlan({ amount_total: 9999 })).toBe('pro');
        expect(resolvePlan({})).toBe('pro');
    });
});
