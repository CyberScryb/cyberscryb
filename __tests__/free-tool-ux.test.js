/** @jest-environment jsdom */
const fs = require('fs');
const path = require('path');
// jsdom does not provide TextDecoder; real browsers do. Shim from Node.
if (typeof TextDecoder === 'undefined') {
  global.TextDecoder = require('util').TextDecoder;
}
const load = file =>
  window.eval(fs.readFileSync(path.join(__dirname, '..', 'content-site', file), 'utf8'));

beforeEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '<main></main><footer></footer>';
  delete window.CSSupport;
  localStorage.clear();
  window.gtag = jest.fn();
});

test('optional support stays outside the copyable result and appears only once', () => {
  document.querySelector('main').innerHTML =
    '<div class="output-panel"><div id="output-text">My complete result</div></div>';
  load('tools/shared/support.js');
  document.dispatchEvent(
    new CustomEvent('cs:tool-result', { detail: { outputId: 'output-text' } })
  );
  document.dispatchEvent(
    new CustomEvent('cs:tool-result', { detail: { outputId: 'output-text' } })
  );
  expect(document.querySelector('#output-text').textContent).toBe('My complete result');
  expect(document.querySelectorAll('#cs-result-support')).toHaveLength(1);
  const link = document.querySelector('#cs-result-support a');
  expect(link.href).toBe('https://ko-fi.com/cyberscryb');
  expect(document.querySelector('form')).toBeNull();
  link.click();
  expect(window.gtag).not.toHaveBeenCalled();
  localStorage.setItem('cs_cookie_consent', 'accepted');
  link.click();
  expect(window.gtag).toHaveBeenCalledWith('event', 'donation_click', expect.any(Object));
});

test('anonymous visitors receive the entire AI result immediately, with safe text rendering', async () => {
  jest.useFakeTimers();
  document.querySelector('main').innerHTML =
    '<textarea id="tool-input">An example request</textarea><button id="generate-btn">Generate</button><div id="loading-indicator" class="hidden"></div><div id="output-text"></div>';
  const result = '<img src=x onerror=alert(1)>\n' + 'A complete response. '.repeat(120);
  window.fetch = jest.fn().mockResolvedValue({
    ok: true,
    headers: { get: () => 'application/json' },
    body: null,
    text: async () => JSON.stringify({ result }),
    json: async () => ({ result }),
  });
  load('tools/shared/ai-tool.js');
  window.CSAITool.init({ toolId: 'email-writer', collectInput: () => 'An example request' });
  document.querySelector('#generate-btn').click();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  expect(document.querySelector('#output-text').textContent).toBe(result);
  expect(document.querySelector('#output-text img')).toBeNull();
  expect(document.querySelector('#output-text').getAttribute('aria-busy')).toBe('false');
  expect(document.querySelector('input[type=email]')).toBeNull();
  expect(window.fetch).toHaveBeenCalledTimes(1);
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

test('SSE body with a rewritten content-type is parsed without a second request', async () => {
  jest.useFakeTimers();
  document.querySelector('main').innerHTML =
    '<textarea id="tool-input">An example request</textarea><button id="generate-btn">Generate</button><div id="loading-indicator" class="hidden"></div><div id="output-text"></div>';
  // Mirrors production: the Cloudflare worker forces application/json while
  // delivering the SSE event body (previously this threw in response.json()
  // and triggered a second non-streaming generation).
  const sseBody =
    ': ' +
    ' '.repeat(16) +
    '\n\ndata: {"text":"Hello "}\n\ndata: {"text":"world"}\n\ndata: {"done":true}\n\n';
  window.fetch = jest.fn().mockResolvedValue({
    ok: true,
    headers: { get: () => 'application/json' },
    body: null,
    text: async () => sseBody,
  });
  load('tools/shared/ai-tool.js');
  window.CSAITool.init({ toolId: 'email-writer', collectInput: () => 'An example request' });
  document.querySelector('#generate-btn').click();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  expect(document.querySelector('#output-text').textContent).toBe('Hello world');
  // No non-streaming retry: exactly one request.
  expect(window.fetch).toHaveBeenCalledTimes(1);
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

test('mobile navigation opens the styled menu and Escape returns focus', () => {
  document.body.innerHTML =
    '<header><button id="nav-toggle" class="hamburger" aria-expanded="false">Menu</button><ul id="nav-menu" class="nav-menu"><li><a href="/tools/">Tools</a></li></ul></header><main></main><script></script>';
  window.mixpanel = {
    __SV: true,
    init: jest.fn(),
    register: jest.fn(),
    track: jest.fn(),
    opt_out_tracking: jest.fn(),
    opt_in_tracking: jest.fn(),
    people: { set: jest.fn() },
  };
  window.matchMedia = jest.fn(() => ({ matches: true }));
  load('js/script.js');
  document.dispatchEvent(new Event('DOMContentLoaded'));
  const toggle = document.querySelector('#nav-toggle');
  toggle.click();
  expect(document.querySelector('#nav-menu').classList.contains('open')).toBe(true);
  expect(toggle.getAttribute('aria-expanded')).toBe('true');
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
  expect(document.querySelector('#nav-menu').classList.contains('open')).toBe(false);
  expect(document.activeElement).toBe(toggle);
  expect(document.querySelector('.cs-skip-link')).not.toBeNull();
});

test('caregiver PDF has a visible direct download without running JavaScript', () => {
  const html = fs.readFileSync(
    path.join(__dirname, '..', 'content-site/tools/caregiver-printable-pack/index.html'),
    'utf8'
  );
  const dom = new DOMParser().parseFromString(html, 'text/html');
  expect(dom.querySelector('#pack-download a[download]').getAttribute('href')).toMatch(/\.pdf$/);
  expect(dom.querySelector('#pack-download').style.display).toBe('block');
  expect(dom.querySelector('input[type=email]')).toBeNull();
});

test('catalog search filters every section and clear filters restores the tools', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'content-site/tools.html'), 'utf8');
  const dom = new DOMParser().parseFromString(html, 'text/html');
  document.body.innerHTML = dom.body.innerHTML;
  const code = Array.from(dom.querySelectorAll('script')).find(s =>
    s.textContent.includes('const categoryMapping')
  );
  window.eval(code.textContent);
  document.dispatchEvent(new Event('DOMContentLoaded'));
  const search = document.querySelector('#tool-search');
  search.value = 'zzzz-no-such-tool';
  search.dispatchEvent(new Event('input', { bubbles: true }));
  expect(
    Array.from(document.querySelectorAll('.posts-grid .blog-card')).every(
      card => card.style.display === 'none'
    )
  ).toBe(true);
  expect(document.querySelector('#tool-filter-count').textContent).toMatch(/No tools match/);
  const reset = document.querySelector('#tool-filter-reset');
  expect(reset.hidden).toBe(false);
  reset.click();
  expect(search.value).toBe('');
  expect(reset.hidden).toBe(true);
  expect(document.querySelector('.posts-grid .blog-card').style.display).toBe('');
  document.querySelector('[data-category="life"]').click();
  expect(document.querySelector('[data-category="life"]').getAttribute('aria-pressed')).toBe(
    'true'
  );
  expect(document.querySelector('[data-category="all"]').getAttribute('aria-pressed')).toBe(
    'false'
  );
});

test('streaming renders tokens progressively and Stop keeps partial output', async () => {
  jest.useFakeTimers();
  document.querySelector('main').innerHTML =
    '<textarea id="tool-input">An example request</textarea><button id="generate-btn">Generate</button><div id="loading-indicator" class="hidden"></div><div id="output-text"></div>';

  // Minimal ReadableStream-backed SSE response mock.
  const sseBody = 'data: {"text":"Hello "}\n\ndata: {"text":"world"}\n\ndata: {"done":true}\n\n';
  const chunks = [Buffer.from(sseBody, 'utf8')];
  const fakeBody = {
    getReader() {
      let i = 0;
      return {
        read: async () => {
          if (i >= chunks.length) return { done: true, value: undefined };
          return { done: false, value: chunks[i++] };
        },
      };
    },
  };
  window.fetch = jest.fn().mockResolvedValue({
    ok: true,
    headers: { get: () => 'text/event-stream' },
    body: fakeBody,
    json: async () => {
      throw new Error('should not parse JSON on SSE path');
    },
  });
  load('tools/shared/ai-tool.js');
  window.CSAITool.init({ toolId: 'email-writer', collectInput: () => 'An example request' });

  const btn = document.querySelector('#generate-btn');
  const origHTML = btn.innerHTML;
  btn.click();
  // Let the async streaming flow run to completion.
  for (let i = 0; i < 20; i++) await Promise.resolve();
  jest.runOnlyPendingTimers();

  // Full streamed text rendered, cursor removed, button restored.
  expect(document.querySelector('#output-text').textContent).toBe('Hello world');
  expect(document.querySelector('#output-text .cs-stream-cursor')).toBeNull();
  expect(btn.innerHTML).toBe(origHTML);
  expect(btn.classList.contains('cs-stopping')).toBe(false);
  expect(document.querySelector('#output-text').getAttribute('aria-busy')).toBe('false');
  expect(window.fetch).toHaveBeenCalledTimes(1);
  const sentBody = JSON.parse(window.fetch.mock.calls[0][1].body);
  expect(sentBody.stream).toBe(true);
  jest.useRealTimers();
});

test('Stop button aborts the stream and keeps partial text', async () => {
  jest.useFakeTimers();
  document.querySelector('main').innerHTML =
    '<textarea id="tool-input">An example request</textarea><button id="generate-btn">Generate</button><div id="loading-indicator" class="hidden"></div><div id="output-text"></div>';

  // Never-resolving stream: the test stops it mid-flight.
  let abortSignal = null;
  const fakeBody = {
    getReader() {
      return {
        read: () =>
          new Promise((resolve, reject) => {
            if (abortSignal && abortSignal.aborted) {
              const err = new Error('aborted');
              err.name = 'AbortError';
              reject(err);
              return;
            }
            // First chunk, then hang until abort.
            setTimeout(() => {
              if (abortSignal && abortSignal.aborted) {
                const err = new Error('aborted');
                err.name = 'AbortError';
                reject(err);
              } else {
                resolve({
                  done: false,
                  value: Buffer.from('data: {"text":"Partial "}\n\n', 'utf8'),
                });
              }
            }, 10);
          }),
      };
    },
  };
  window.fetch = jest.fn().mockImplementation((url, opts) => {
    abortSignal = opts.signal;
    // Abort the in-flight read when the signal fires.
    opts.signal.addEventListener('abort', () => {});
    return Promise.resolve({
      ok: true,
      headers: { get: () => 'text/event-stream' },
      body: fakeBody,
      json: async () => ({}),
    });
  });
  load('tools/shared/ai-tool.js');
  window.CSAITool.init({ toolId: 'email-writer', collectInput: () => 'An example request' });

  const btn = document.querySelector('#generate-btn');
  btn.click();
  for (let i = 0; i < 10; i++) await Promise.resolve();
  jest.advanceTimersByTime(20);
  for (let i = 0; i < 10; i++) await Promise.resolve();

  // Button is now in Stop mode; clicking it aborts.
  expect(btn.classList.contains('cs-stopping')).toBe(true);
  expect(btn.textContent).toContain('Stop');
  btn.click();
  for (let i = 0; i < 20; i++) await Promise.resolve();
  jest.runOnlyPendingTimers();
  // Let the abort rejection propagate through the client's await chain.
  for (let i = 0; i < 30; i++) await Promise.resolve();

  // Partial text kept, button restored to Generate.
  expect(document.querySelector('#output-text').textContent).toContain('Partial');
  expect(btn.classList.contains('cs-stopping')).toBe(false);
  expect(document.querySelector('#output-text').getAttribute('aria-busy')).toBe('false');
  jest.useRealTimers();
});

test('action buttons in ai-tool.js have valid aria-labels and update aria-label on feedback', async () => {
  jest.useFakeTimers();
  document.querySelector('main').innerHTML =
    '<button id="sample-btn">Try Sample</button>' +
    '<textarea id="tool-input">Sample text</textarea>' +
    '<button id="generate-btn">Generate</button>' +
    '<div id="output-text">Output result</div>' +
    '<button id="copy-btn">Copy</button>';

  Object.defineProperty(HTMLElement.prototype, 'innerText', {
    get() {
      return this.textContent;
    },
    set(val) {
      this.textContent = val;
    },
    configurable: true,
  });

  Object.defineProperty(navigator, 'clipboard', {
    value: {
      writeText: jest.fn().mockResolvedValue(),
    },
    configurable: true,
  });

  load('tools/shared/ai-tool.js');
  window.CSAITool.init({ toolId: 'summarizer', collectInput: () => 'Sample text' });

  const clearBtn = document.querySelector('#clear-btn');
  const copyBtn = document.querySelector('#copy-btn');
  const dlBtn = document.querySelector('#download-btn');
  const regenBtn = document.querySelector('#regen-btn');
  const shareBtn = document.querySelector('#share-btn');

  expect(clearBtn.getAttribute('aria-label')).toBe('Clear input');
  expect(copyBtn.getAttribute('aria-label')).toBe('Copy to Clipboard');
  expect(dlBtn.getAttribute('aria-label')).toBe('Download as .txt');
  expect(regenBtn.getAttribute('aria-label')).toBe('Generate again for a different result');
  expect(shareBtn.getAttribute('aria-label')).toBe('Share this result');

  // Trigger copy
  copyBtn.click();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();

  expect(copyBtn.getAttribute('aria-label')).toBe('Copied to clipboard');
  expect(copyBtn.textContent).toBe('Copied! ✓');

  jest.advanceTimersByTime(1700);

  expect(copyBtn.getAttribute('aria-label')).toBe('Copy to Clipboard');
  expect(copyBtn.textContent).toBe('Copy');

  jest.useRealTimers();
});
