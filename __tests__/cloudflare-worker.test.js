const fs = require('fs');
const path = require('path');
const vm = require('vm');

let worker;
let upstream;
beforeEach(() => {
  upstream = jest.fn(async () => new Response(JSON.stringify({ result: 'A result' })));
  const context = {
    module: { exports: {} },
    fetch: upstream,
    URL,
    Headers,
    Response,
    Set,
  };
  const source = fs
    .readFileSync(path.join(__dirname, '../cloudflare-worker/worker.js'), 'utf8')
    .replace('export default', 'module.exports =');
  vm.runInNewContext(source, context);
  worker = context.module.exports;
});

function request(body = { tool: 'summarizer', input: 'Example input' }, headers = {}) {
  return new Request('https://cyberscryb.com/api/ai-generate', {
    method: 'POST',
    headers: {
      Origin: 'https://cyberscryb.com',
      'Content-Type': 'application/json',
      'CF-Connecting-IP': '192.0.2.1',
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

test('every repeat request reaches the authoritative backend, with no shared response cache', async () => {
  for (let i = 0; i < 2; i++) {
    const response = await worker.fetch(
      request({ tool: 'insurance-denial-appeal', input: 'Synthetic appeal' })
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(await response.json()).toEqual({ result: 'A result' });
  }
  expect(upstream).toHaveBeenCalledTimes(2);
});

test('passes backend quota failures and retry information through unchanged', async () => {
  upstream.mockResolvedValue(
    new Response(JSON.stringify({ error: 'Daily limit reached' }), {
      status: 429,
      headers: { 'Retry-After': '3600' },
    })
  );
  const response = await worker.fetch(request());
  expect(response.status).toBe(429);
  expect(response.headers.get('Retry-After')).toBe('3600');
  expect(await response.json()).toEqual({ error: 'Daily limit reached' });
});

test('forwards the Cloudflare client IP rather than a forged forwarded header', async () => {
  await worker.fetch(request(undefined, { 'X-Forwarded-For': '203.0.113.2' }));
  expect(upstream.mock.calls[0][1].headers['X-Forwarded-For']).toBe('192.0.2.1');
});

test.each([null, [], 3, { tool: 'summarizer', input: 'x'.repeat(4001) }])(
  'rejects malformed or oversized input without calling AI: %p',
  async body => {
    expect((await worker.fetch(request(body))).status).toBe(400);
    expect(upstream).not.toHaveBeenCalled();
  }
);

test('rejects other origins without wildcard CORS or upstream work', async () => {
  const response = await worker.fetch(request(undefined, { Origin: 'https://other.example' }));
  expect(response.status).toBe(403);
  expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
  expect(upstream).not.toHaveBeenCalled();
});

test('returns a non-cacheable service error when the backend is unavailable', async () => {
  upstream.mockRejectedValue(new Error('Network unavailable'));
  const response = await worker.fetch(request());
  expect(response.status).toBe(502);
  expect(response.headers.get('Cache-Control')).toBe('no-store');
});
