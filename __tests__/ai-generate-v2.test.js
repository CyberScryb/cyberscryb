process.env.NODE_ENV = 'test';
process.env.GOOGLE_API_KEY = 'test-key-for-unit-tests';

// Mocks must be registered before requiring the functions module.
jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
}));
jest.mock('firebase-admin/firestore', () => ({
  // Functional enough for checkFirestoreRateLimit's transaction: snapshots
  // report non-existent docs, so counts stay 0 and requests are allowed.
  getFirestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({})),
    })),
    runTransaction: jest.fn(async txFn =>
      txFn({
        get: async () => ({ exists: false, data: () => ({}) }),
        set: jest.fn(),
      })
    ),
    batch: jest.fn(() => ({ set: jest.fn(), commit: async () => {} })),
  })),
  FieldValue: { increment: jest.fn(), serverTimestamp: jest.fn() },
}));
jest.mock('firebase-functions/v1', () => ({
  https: { onRequest: jest.fn(h => h) },
  runWith: jest.fn(() => ({ https: { onRequest: jest.fn(h => h) } })),
  config: jest.fn(() => ({})),
  pubsub: {
    schedule: jest.fn(() => ({
      timeZone: jest.fn(() => ({
        onRun: jest.fn(),
      })),
    })),
  },
}));
jest.mock('firebase-functions/v2/https', () => ({
  onRequest: jest.fn((opts, handler) => handler),
}));
// NOTE: `jest.mock('cors')` from this test file does not intercept the copy
// resolved inside functions/node_modules, so the real cors middleware runs.
// mockReq/mockRes below are compatible with it (origin header + setHeader).
jest.mock('cors', () => jest.fn(() => jest.fn((req, res, next) => next())));

const v2https = require('firebase-functions/v2/https');
const mod = require('../functions/index.js');
const generateAI = mod.generateAI;

// Safety: no test in this file may touch the real network. The streaming
// describe installs its own fetch mock in beforeEach.
global.fetch = jest.fn(async () => {
  throw new Error('fetch called without a mock in ai-generate-v2.test.js');
});

function mockReq({
  method = 'POST',
  body = {},
  referer = 'https://cyberscryb.com/tools/poem-generator/',
  ip = '10.0.0.1',
} = {}) {
  return {
    method,
    body,
    headers: { 'x-forwarded-for': ip, origin: 'https://cyberscryb.com' },
    connection: {},
    get: h => (h === 'Referer' ? referer : undefined),
    on: jest.fn(),
  };
}

function mockRes() {
  const res = {
    writes: [],
    statusCode: null,
    jsonBody: undefined,
    headers: {},
    ended: false,
    status(code) {
      res.statusCode = code;
      return res;
    },
    json(obj) {
      res.jsonBody = obj;
      return res;
    },
    set(h) {
      if (typeof h === 'object' && h !== null) Object.assign(res.headers, h);
      return res;
    },
    // Express-style aliases used by the real cors middleware.
    setHeader(name, value) {
      res.headers[String(name).toLowerCase()] = value;
      return res;
    },
    getHeader(name) {
      return res.headers[String(name).toLowerCase()];
    },
    removeHeader(name) {
      delete res.headers[String(name).toLowerCase()];
      return res;
    },
    write(chunk) {
      res.writes.push(chunk);
      return true;
    },
    end() {
      res.ended = true;
      return res;
    },
    socket: { setNoDelay: jest.fn() },
  };
  return res;
}

// The inner handler is async; flush microtasks/tasks until res settles.
async function invoke(req, res) {
  generateAI(req, res);
  for (let i = 0; i < 200 && !res.ended && res.statusCode === null; i++) {
    await new Promise(r => setImmediate(r));
  }
  // One more drain for paths that return without res.end() (JSON branches).
  await new Promise(r => setImmediate(r));
  await new Promise(r => setImmediate(r));
}

// ─── v2 registration contract ───────────────────────────────────────────────

describe('generateAI v2 registration', () => {
  test('is registered via firebase-functions/v2 onRequest', () => {
    expect(v2https.onRequest).toHaveBeenCalledTimes(1);
  });

  test('uses streaming-safe v2 options matching the v1 deployment', () => {
    expect(v2https.onRequest).toHaveBeenCalledWith(
      {
        region: 'us-central1',
        timeoutSeconds: 120,
        memory: '256MiB',
        invoker: 'public',
      },
      expect.any(Function)
    );
  });

  test('export is the request handler function', () => {
    expect(typeof generateAI).toBe('function');
  });

  test('export is the exact handler passed to v2 onRequest', () => {
    const handler = v2https.onRequest.mock.calls[0][1];
    expect(mod.generateAI).toBe(handler);
  });
});

// ─── API contract: validation branches ──────────────────────────────────────

describe('generateAI API contract (validation)', () => {
  test('405 on non-POST', async () => {
    const res = mockRes();
    await invoke(mockReq({ method: 'GET' }), res);
    expect(res.statusCode).toBe(405);
    expect(res.jsonBody).toEqual({ error: 'Method Not Allowed' });
  });

  test('400 on missing/invalid JSON body', async () => {
    const res = mockRes();
    await invoke(mockReq({ body: null }), res);
    expect(res.statusCode).toBe(400);
    expect(res.jsonBody).toEqual({ error: 'Invalid JSON body' });
  });

  test('403 on disallowed referer', async () => {
    const res = mockRes();
    await invoke(
      mockReq({ body: { tool: 'poem-generator', input: 'hi' }, referer: 'https://evil.com/' }),
      res
    );
    expect(res.statusCode).toBe(403);
    expect(res.jsonBody).toEqual({ error: 'Unauthorized Source' });
  });

  test('403 when referer is missing (fail closed)', async () => {
    const res = mockRes();
    // NB: pass null, not undefined — undefined would trigger the mock's default param.
    const req = mockReq({ body: { tool: 'poem-generator', input: 'hi' }, referer: null });
    await invoke(req, res);
    expect(res.statusCode).toBe(403);
  });

  test('400 on unknown tool', async () => {
    const res = mockRes();
    await invoke(mockReq({ body: { tool: 'nope-not-a-tool', input: 'hi' } }), res);
    expect(res.statusCode).toBe(400);
    expect(String(res.jsonBody.error).startsWith('Invalid tool')).toBe(true);
  });

  test('400 on missing input', async () => {
    const res = mockRes();
    await invoke(mockReq({ body: { tool: 'poem-generator', input: '' } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.jsonBody).toEqual({ error: 'Input text is required' });
  });

  test('400 on input over 4000 chars', async () => {
    const res = mockRes();
    await invoke(mockReq({ body: { tool: 'poem-generator', input: 'x'.repeat(4001) } }), res);
    expect(res.statusCode).toBe(400);
    expect(res.jsonBody).toEqual({ error: 'Input too long. Max 4000 characters.' });
  });
});

// ─── API contract: streaming path ───────────────────────────────────────────

describe('generateAI streaming contract', () => {
  const ssePayload =
    'data: {"candidates": [{"content": {"parts": [{"text": "Hello "}]}}]}\n\n' +
    'data: {"candidates": [{"content": {"parts": [{"text": "world"}]}}]}\n\n';

  beforeEach(() => {
    global.fetch = jest.fn(async () => new Response(ssePayload, { status: 200 }));
  });

  afterEach(() => {
    delete global.fetch;
  });

  test('stream:true commits SSE headers and emits token events then done', async () => {
    const res = mockRes();
    const req = mockReq({
      body: { tool: 'poem-generator', input: 'write about the sea', params: {}, stream: true },
      ip: '10.0.0.9',
    });
    await invoke(req, res);

    // SSE headers committed (streaming-safe contract).
    expect(res.headers['Content-Type']).toBe('text/event-stream');
    expect(res.headers['X-Accel-Buffering']).toBe('no');
    // Nagle disabled so token writes flush immediately.
    expect(res.socket.setNoDelay).toHaveBeenCalledWith(true);

    // First write is the padding comment that primes the stream.
    expect(res.writes.length).toBeGreaterThan(0);
    expect(String(res.writes[0]).startsWith(':')).toBe(true);

    const frames = res.writes.map(String).join('');
    expect(frames).toContain('data: {"text":"Hello "}');
    expect(frames).toContain('data: {"text":"world"}');
    // Terminal event is last.
    const lastData = res.writes
      .map(String)
      .filter(w => w.startsWith('data:'))
      .pop();
    expect(lastData).toBe('data: {"done":true}\n\n');
    expect(res.ended).toBe(true);
  });

  test('upstream URL requests Gemini SSE format', async () => {
    const res = mockRes();
    const req = mockReq({
      body: { tool: 'poem-generator', input: 'hi', stream: true },
      ip: '10.0.0.10',
    });
    await invoke(req, res);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const url = global.fetch.mock.calls[0][0];
    expect(url).toMatch(/streamGenerateContent\?alt=sse&key=/);
  });

  test('stream:true with upstream failure keeps the JSON error contract', async () => {
    global.fetch = jest.fn(
      async () =>
        new Response(JSON.stringify({ error: { message: 'boom' } }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        })
    );
    const res = mockRes();
    const req = mockReq({
      body: { tool: 'poem-generator', input: 'hi', stream: true },
      ip: '10.0.0.11',
    });
    await invoke(req, res);
    // Headers not committed before upstream accepted: normal JSON error shape.
    expect(res.statusCode).toBe(500);
    expect(res.jsonBody.error).toBeDefined();
    expect(res.jsonBody.retryable).toBe(true);
  });
});
