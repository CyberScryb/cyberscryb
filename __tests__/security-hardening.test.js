process.env.NODE_ENV = 'test';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { JSDOM } = require('jsdom');

jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
}));
jest.mock('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => ({
    collection: jest.fn(() => ({
      where: jest.fn(() => ({
        limit: jest.fn(() => ({
          get: jest.fn(async () => ({ empty: true, docs: [] })),
        })),
      })),
      add: jest.fn(async () => ({})),
      doc: jest.fn(() => ({})),
    })),
    batch: jest.fn(() => ({
      set: jest.fn(),
      commit: jest.fn(async () => {}),
    })),
  })),
  FieldValue: {
    increment: jest.fn(n => n),
    serverTimestamp: jest.fn(() => 'SERVER_TIMESTAMP'),
  },
}));
jest.mock('../functions/node_modules/cors', () => () => (req, res, cb) => cb());
jest.mock('firebase-functions/v1', () => ({
  https: { onRequest: fn => fn },
  runWith: () => ({ https: { onRequest: fn => fn } }),
  config: () => ({}),
  pubsub: {
    schedule: () => ({
      timeZone: () => ({
        onRun: fn => fn,
      }),
    }),
  },
}));

const functionsMod = require('../functions/index.js');

describe('1. Privacy Policy Generator DOM XSS & Accessibility Hardening', () => {
  test('escapes HTML/JS payloads in site-name, site-url, and contact-email before rendering HTML preview', () => {
    const html = fs.readFileSync(
      path.join(__dirname, '../content-site/tools/privacy-generator/index.html'),
      'utf8'
    );
    const dom = new JSDOM(html, {
      url: 'https://cyberscryb.com/tools/privacy-generator/',
      runScripts: 'dangerously',
    });
    const { window } = dom;
    const { document } = window;

    try {
      expect(document.getElementById('format-select').getAttribute('aria-label')).toBe(
        'Output format'
      );

      document.getElementById('site-name').value = 'Acme <img src=x onerror=alert(1)>';
      document.getElementById('site-url').value = 'https://example.com/<script>alert(2)</script>';
      document.getElementById('contact-email').value = 'sec"<svg onload=alert(3)>@example.com';

      window.generatePolicy();

      const preview = document.getElementById('preview-content');
      expect(preview.querySelector('script')).toBeNull();
      expect(preview.querySelector('img')).toBeNull();
      expect(preview.querySelector('svg')).toBeNull();
      expect(preview.innerHTML).toContain('&lt;img src=x onerror=alert(1)&gt;');
      expect(preview.innerHTML).toContain('&lt;script&gt;alert(2)&lt;/script&gt;');
      expect(preview.innerHTML).toContain('&lt;svg onload=alert(3)&gt;');
    } finally {
      window.close();
    }
  });
});

describe('2. Markdown-to-HTML Converter XSS & URL Sanitization', () => {
  let ctx;

  beforeEach(() => {
    const scriptSrc = fs.readFileSync(
      path.join(__dirname, '../content-site/tools/markdown-html/script.js'),
      'utf8'
    );
    ctx = {
      document: {
        getElementById: () => ({
          value: '',
          innerHTML: '',
          textContent: '',
          addEventListener: () => {},
          classList: { add: () => {}, remove: () => {}, toggle: () => {} },
        }),
        querySelectorAll: () => [],
      },
    };
    vm.runInNewContext(scriptSrc, ctx);
  });

  test('sanitizeUrl blocks javascript:, data:, and vbscript: URLs while allowing safe schemes', () => {
    expect(ctx.sanitizeUrl('javascript:alert(1)')).toBe('#');
    expect(ctx.sanitizeUrl('  JAVASCRIPT:alert(1)  ')).toBe('#');
    expect(ctx.sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBe('#');
    expect(ctx.sanitizeUrl('vbscript:msgbox(1)')).toBe('#');
    expect(ctx.sanitizeUrl('https://cyberscryb.com/tools/')).toBe('https://cyberscryb.com/tools/');
    expect(ctx.sanitizeUrl('http://example.com')).toBe('http://example.com');
    expect(ctx.sanitizeUrl('mailto:hello@cyberscryb.com')).toBe('mailto:hello@cyberscryb.com');
    expect(ctx.sanitizeUrl('/tools/markdown-html/')).toBe('/tools/markdown-html/');
    expect(ctx.sanitizeUrl('#section-1')).toBe('#section-1');
  });

  test('markdownToHtml neutralizes dangerous link/image URLs and escapes quotes', () => {
    const out = ctx.markdownToHtml(
      '[Click me](javascript:alert(1)) and ![x" onerror="alert(2)](data:text/html,evil)'
    );
    expect(out).toContain('href="#"');
    expect(out).toContain('src="#"');
    expect(out).not.toContain('javascript:');
    expect(out).not.toContain('onerror="alert');
    expect(out).toContain('&quot;');
  });
});

describe('3. Backend Cloud Functions Hardening (rewriteText, analyticsEvent, subscribeEmail)', () => {
  function makeRes() {
    const res = {
      statusCode: 200,
      body: null,
      headers: {},
      set(k, v) {
        this.headers[k] = v;
        return this;
      },
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        return this;
      },
    };
    return res;
  }

  function makeReq({
    method = 'POST',
    referer = 'https://cyberscryb.com/tools/humanizer/',
    ip = '198.51.100.42',
    body = {},
  } = {}) {
    return {
      method,
      headers: {
        referer,
        'x-forwarded-for': ip,
      },
      connection: { remoteAddress: ip },
      body,
      get(headerName) {
        if (headerName.toLowerCase() === 'referer') return referer;
        return this.headers[headerName.toLowerCase()];
      },
    };
  }

  beforeEach(() => {
    functionsMod.__testing.burstLimitStore.clear();
    functionsMod.__testing.analyticsStore.events.length = 0;
  });

  test('rewriteText rejects non-string or oversized (>1500 chars) style parameter with 400', async () => {
    const resTooLong = makeRes();
    await functionsMod.rewriteText(
      makeReq({
        body: { text: 'Sample text to rewrite.', style: 's'.repeat(1501) },
      }),
      resTooLong
    );
    expect(resTooLong.statusCode).toBe(400);
    expect(resTooLong.body.error).toMatch(/Invalid style parameter/i);

    const resNonString = makeRes();
    await functionsMod.rewriteText(
      makeReq({
        body: { text: 'Sample text to rewrite.', style: { nested: true } },
      }),
      resNonString
    );
    expect(resNonString.statusCode).toBe(400);
  });

  test('analyticsEvent enforces Referer check, burst rate limit, and metadata sanitization', async () => {
    // 1. Missing/unauthorized Referer -> 403
    const resForbidden = makeRes();
    await functionsMod.analyticsEvent(
      makeReq({ referer: 'https://evil.example/', body: { event: 'page_view' } }),
      resForbidden
    );
    expect(resForbidden.statusCode).toBe(403);

    // 2. Oversized event name -> 400
    const resBadEvent = makeRes();
    await functionsMod.analyticsEvent(
      makeReq({ ip: '198.51.100.50', body: { event: 'e'.repeat(65) } }),
      resBadEvent
    );
    expect(resBadEvent.statusCode).toBe(400);

    // 3. Sanitizes metadata (caps to 5 keys, truncates strings to 100 chars, drops nested objects)
    const resOk = makeRes();
    await functionsMod.analyticsEvent(
      makeReq({
        ip: '198.51.100.51',
        body: {
          event: 'tool_click',
          metadata: {
            k1: 'x'.repeat(150),
            k2: 42,
            k3: true,
            k4: { nested: 'dropped' },
            k5: 'kept',
            k6: 'dropped_sixth_key',
          },
        },
      }),
      resOk
    );
    expect(resOk.statusCode).toBe(200);
    const logged = functionsMod.__testing.analyticsStore.events[0];
    expect(logged.type).toBe('tool_click');
    expect(logged.k1).toHaveLength(100);
    expect(logged.k2).toBe(42);
    expect(logged.k3).toBe(true);
    expect(logged.k4).toBeUndefined();
    expect(logged.k5).toBe('kept');
    expect(logged.k6).toBeUndefined();

    // 4. Burst rate limit -> 429 on 6th request from same IP
    for (let i = 0; i < 5; i++) {
      const r = makeRes();
      await functionsMod.analyticsEvent(
        makeReq({ ip: '198.51.100.99', body: { event: 'ping' } }),
        r
      );
      expect(r.statusCode).toBe(200);
    }
    const resRateLimited = makeRes();
    await functionsMod.analyticsEvent(
      makeReq({ ip: '198.51.100.99', body: { event: 'ping' } }),
      resRateLimited
    );
    expect(resRateLimited.statusCode).toBe(429);
  });

  test('subscribeEmail enforces Referer check and 254-char email cap', async () => {
    const resForbidden = makeRes();
    await functionsMod.subscribeEmail(
      makeReq({ referer: '', body: { email: 'user@example.com' } }),
      resForbidden
    );
    expect(resForbidden.statusCode).toBe(403);

    const resOversizedEmail = makeRes();
    const longEmail = `${'a'.repeat(245)}@example.com`;
    await functionsMod.subscribeEmail(
      makeReq({ ip: '198.51.100.77', body: { email: longEmail } }),
      resOversizedEmail
    );
    expect(resOversizedEmail.statusCode).toBe(400);
  });
});

describe('4. Client Persistence: data-no-draft & 14-Day TTL Enforcement', () => {
  test('CSRecentDrafts respects data-no-draft and prunes entries older than 14 days', () => {
    const dom = new JSDOM('<body data-no-draft><main><textarea></textarea></main></body>', {
      url: 'https://cyberscryb.com/tools/summarizer/',
      runScripts: 'outside-only',
    });
    const { window } = dom;
    window.matchMedia = () => ({ matches: true });

    try {
      const fifteenDaysAgo = Date.now() - 15 * 24 * 60 * 60 * 1000;
      const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000;
      window.localStorage.setItem(
        'cs_recent_drafts',
        JSON.stringify([
          {
            href: '/tools/old-tool/',
            name: 'Old',
            preview: 'Expired',
            at: fifteenDaysAgo,
            source: 'draft',
          },
          {
            href: '/tools/fresh-tool/',
            name: 'Fresh',
            preview: 'Kept',
            at: twoDaysAgo,
            source: 'draft',
          },
        ])
      );

      window.eval(fs.readFileSync(path.join(__dirname, '../content-site/js/script.js'), 'utf8'));

      // 14-day TTL pruning on read()
      const current = window.CSRecentDrafts.read();
      expect(current).toHaveLength(1);
      expect(current[0].href).toBe('/tools/fresh-tool/');

      // remember() is a no-op when data-no-draft is on <body>
      window.CSRecentDrafts.remember({
        href: '/tools/summarizer/',
        name: 'Summarizer',
        preview: 'Should not be saved',
        source: 'draft',
      });
      expect(window.CSRecentDrafts.read()).toHaveLength(1);
    } finally {
      window.close();
    }
  });

  test('CSWorkspace.save and CSProfile.save are no-ops when data-no-draft is set', () => {
    const dom = new JSDOM(
      '<body data-no-draft><input id="state-in" data-cs-share="state" value="California"></body>',
      {
        url: 'https://cyberscryb.com/tools/utility-shutoff-letter/',
        runScripts: 'outside-only',
      }
    );
    const { window } = dom;

    try {
      window.eval(
        fs.readFileSync(path.join(__dirname, '../content-site/tools/shared/cs-context.js'), 'utf8')
      );
      window.CSWorkspace.save('utility-shutoff-letter');
      window.CSProfile.save('utility-shutoff-letter');
      expect(window.localStorage.getItem('cs_profile_v1')).toBeNull();
    } finally {
      window.close();
    }
  });

  test('LifeTool skips saving and restoring drafts when data-no-draft is set', () => {
    jest.useFakeTimers();
    const dom = new JSDOM(
      `<body data-no-draft>
        <input id="mode-value" value="standard">
        <input id="field-a" value="">
        <textarea id="tool-input"></textarea>
        <button id="generate-btn"></button>
        <div id="output-text"></div>
      </body>`,
      {
        url: 'https://cyberscryb.com/tools/appeal-letter/',
        runScripts: 'outside-only',
      }
    );
    const { window } = dom;
    window.CSAITool = { init: jest.fn() };
    const draftKey = 'cs_lt_draft_appeal-letter';
    window.localStorage.setItem(
      draftKey,
      JSON.stringify({
        mode: 'urgent',
        story: 'Should not restore',
        fields: { 'field-a': 'Private' },
        ts: Date.now(),
      })
    );

    try {
      window.eval(
        fs.readFileSync(path.join(__dirname, '../content-site/tools/shared/life-tool.js'), 'utf8')
      );
      window.LifeTool.mount({
        toolId: 'appeal-letter',
        fieldIds: ['field-a'],
      });

      // Did not restore onto the form
      expect(window.document.getElementById('tool-input').value).toBe('');
      expect(window.document.getElementById('field-a').value).toBe('');

      // Typing does not overwrite or save draft
      window.localStorage.removeItem(draftKey);
      const input = window.document.getElementById('tool-input');
      input.value = 'Sensitive medical appeal details';
      input.dispatchEvent(new window.Event('input', { bubbles: true }));
      jest.advanceTimersByTime(1000);
      expect(window.localStorage.getItem(draftKey)).toBeNull();
    } finally {
      window.close();
      jest.useRealTimers();
    }
  });

  test('ai-writing-suite opts out of draft persistence via data-no-draft and removes aws_draft storage', () => {
    const html = fs.readFileSync(
      path.join(__dirname, '../content-site/tools/ai-writing-suite/index.html'),
      'utf8'
    );
    const appJs = fs.readFileSync(
      path.join(__dirname, '../content-site/tools/ai-writing-suite/app.js'),
      'utf8'
    );
    expect(html).toMatch(/<body[^>]*\bdata-no-draft\b/i);
    expect(appJs).not.toMatch(/localStorage\.(setItem|getItem)\(['"]aws_draft['"]/);
  });
});
