/** @jest-environment jsdom */
const fs = require('fs');
const path = require('path');
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
  window.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ result }) });
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
