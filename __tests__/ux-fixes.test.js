/** @jest-environment jsdom */
const fs = require('fs');
const path = require('path');

const read = rel => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('upwork proposal generator actions', () => {
  const html = read('content-site/tools/gig-auto-pilot/index.html');
  const source = read('content-site/tools/gig-auto-pilot/gig-auto-pilot.js');
  const css = read('content-site/tools/gig-auto-pilot/style.css');

  test('keeps the SEO title and description', () => {
    expect(html).toContain(
      '<title>Free AI Upwork Proposal Generator – In Seconds | CyberScryb</title>'
    );
    expect(html).toContain(
      'Paste an Upwork job post and get a proposal written for that job in seconds. Free AI proposal generator, no account needed.'
    );
  });

  test('uses plain headings and the custody action set on every result tab', () => {
    expect(html).not.toMatch(/🚀|📋|💎|⚡/);
    expect(html).toContain('Freelance proposals');
    expect(html).toContain('Job details');
    expect(html).toContain('Your proposal');
    ['output-proposal', 'output-draft', 'output-interview'].forEach(id => {
      expect(html).toContain(`class="copy-btn" data-target="${id}"`);
      expect(html).toContain(`class="download-btn" data-target="${id}"`);
      expect(html).toContain(`class="print-btn" data-target="${id}"`);
      expect(html).toContain(`class="regen-btn" data-target="${id}"`);
    });
    expect(source).toContain('Generate a proposal first, then print.');
    expect(source).toContain("gtag('event', 'result_regenerated'");
    expect(css).toContain('.output-wrapper.is-loading .placeholder');
    expect(html).toContain('color: #ffffff');
    expect(html).not.toContain('color: #000');
  });
});

describe('parenting plan titles', () => {
  const html = read('content-site/tools/custody-document/index.html');
  const title = 'Free Parenting Plan Generator – Draft a Custody Schedule | Cyberscryb';
  const description =
    "Draft a parenting plan and custody schedule for free, no signup. Bring it to mediation or court. It's a starting draft, not legal advice.";

  test('title, description, and social tags match, and the legal notice stays', () => {
    expect(html).toContain(`<title>${title}</title>`);
    expect(html).toContain(`content="${description}"`);
    expect(html).toContain(`property="og:title" content="${title}"`);
    expect(html).toContain(`property="og:description" content="${description}"`);
    expect(html).toContain(`name="twitter:title" content="${title}"`);
    expect(html).toContain(`name="twitter:description" content="${description}"`);
    expect(html).toContain('>Free Parenting Plan Generator</h1>');
    expect(html).toMatch(/NOT legal advice/i);
    expect(html).not.toMatch(/<h2[^>]*>\s*<svg/);
    expect(html).not.toMatch(/<div class="badge"[^>]*>\s*<svg/);
  });
});

describe('password checker labels', () => {
  const html = read('content-site/tools/password-checker/index.html');
  const css = read('content-site/tools/password-checker/style.css');

  test('uses sentence case and does not put emoji on the privacy pill or generate button', () => {
    expect(html).toContain('Private: your password never leaves your browser');
    expect(html).toContain('>Generate</button>');
    expect(html).not.toMatch(/🔐|⚡/);
    expect(html).toContain('Your password never leaves your browser');
    expect(css).toMatch(/\.badge \{[^}]*text-transform:\s*none/s);
    expect(css).toMatch(/\.generate-btn \{[^}]*text-transform:\s*none/s);
  });
});

describe('privacy banner', () => {
  const css = read('content-site/css/consent.css');
  const source = read('content-site/js/consent.js');

  test('is a full-width bottom bar and still offers the same choice', () => {
    expect(css).toMatch(/\.cs-cookie-banner \{[^}]*bottom:\s*0/s);
    expect(css).toMatch(/\.cs-cookie-banner \{[^}]*width:\s*100%/s);
    expect(css).not.toMatch(/translateX/);
    expect(source).toContain('localStorage.setItem(KEY, value)');
    expect(source).toContain('id="cs-cookie-accept"');
    expect(source).toContain('id="cs-cookie-decline"');
  });
});

describe('tools catalog and recent drafts', () => {
  const tools = read('content-site/tools.html');
  const home = read('content-site/index.html');
  const shared = read('content-site/tools/shared/ai-tool.js');

  test('keeps every catalog link in the HTML and can fold long sections', () => {
    const links = tools.match(/href="\/tools\/[a-z0-9-]+\/"/g) || [];
    expect(links.length).toBeGreaterThan(40);
    expect(tools).toContain('Show all ');
    expect(tools).toContain('data-filter-scope="catalog"');
    expect(tools).toContain('catalog-toolbar');
  });

  test('homepage recent drafts stay hidden until this browser has local history', () => {
    expect(home).toContain('id="recent-drafts" hidden');
    expect(home).toContain('Your recent drafts');
    expect(home).toContain("localStorage.getItem('cs_recent_drafts')");
    expect(home).toContain("key.indexOf('cs_draft_/tools/')");
    expect(shared).toContain('CSRecentDrafts');
    expect(shared).toContain("source: 'result'");
  });
});

describe('recent draft index', () => {
  test('saves a typed draft only in localStorage', () => {
    jest.useFakeTimers();
    window.history.pushState({}, '', '/tools/appeal-letter/');
    document.body.innerHTML =
      '<header><button class="hamburger"></button><ul class="nav-menu"></ul></header><main><h1>Appeal Letter</h1><textarea id="tool-input"></textarea></main>';
    window.matchMedia = () => ({ matches: true });
    localStorage.clear();
    window.eval(read('content-site/js/script.js'));
    document.dispatchEvent(new Event('DOMContentLoaded'));
    const input = document.querySelector('#tool-input');
    input.value = 'A private note about a bill';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    jest.advanceTimersByTime(600);
    const saved = JSON.parse(localStorage.getItem('cs_recent_drafts'));
    expect(saved).toHaveLength(1);
    expect(saved[0].href).toBe('/tools/appeal-letter/');
    expect(saved[0].name).toBe('Appeal Letter');
    expect(saved[0].preview).toContain('private note');
    expect(saved[0].source).toBe('draft');
    jest.useRealTimers();
  });
});
