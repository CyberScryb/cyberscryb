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
    expect(home).not.toContain('a.href=item.href');
    expect(home).not.toContain('link.href=last.url');
    expect(home).toContain("return '/tools/'+TOOL_SLUGS[i]+'/'");
    const listed = (home.match(/var TOOL_SLUGS=\('([^']+)'\)/) || [])[1].split(' ').sort();
    const slugs = fs
      .readdirSync(path.join(__dirname, '..', 'content-site/tools'), { withFileTypes: true })
      .filter(
        entry =>
          entry.isDirectory() &&
          entry.name !== 'shared' &&
          fs.existsSync(path.join(__dirname, '..', 'content-site/tools', entry.name, 'index.html'))
      )
      .map(entry => entry.name)
      .sort();
    expect(listed).toEqual(slugs);
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

  test('links recent drafts only through the known tool allowlist', () => {
    localStorage.clear();
    localStorage.setItem(
      'cs_recent_drafts',
      JSON.stringify([
        { href: 'javascript:alert(1)', name: 'Bad <b>name</b>', preview: '<img src=x>' },
        { href: '/tools/appeal-letter/', name: 'Appeal Letter', preview: 'a private note' },
        { href: '/tools/not-a-real-tool/', name: 'Missing', preview: 'nope' },
        { href: 'https://evil.example/tools/humanizer/', name: 'Evil', preview: 'nope' },
      ])
    );
    localStorage.setItem('cs_draft_/tools/password-checker', 'stays in the browser');
    localStorage.setItem('cs_draft_/tools/not-a-real-tool', 'should not link');
    localStorage.setItem(
      'cs_last_tool',
      JSON.stringify({ name: 'Stolen', url: 'javascript:alert(1)' })
    );
    document.open();
    document.write(read('content-site/index.html'));
    document.close();
    const links = [...document.querySelectorAll('#recent-drafts-list a')];
    expect(links.map(link => link.getAttribute('href'))).toEqual([
      '/tools/appeal-letter/',
      '/tools/password-checker/',
    ]);
    expect(links[0].textContent).toBe('Appeal Letter');
    expect(document.getElementById('recent-drafts-list').innerHTML).not.toContain('<b>');
    expect(document.getElementById('recent-drafts-list').textContent).toContain('a private note');
    expect(document.getElementById('recent-drafts').hidden).toBe(false);
    expect(document.getElementById('continue-link').getAttribute('href')).toBe('#');
  });
});

describe('glassmorphism background selector accessibility', () => {
  const html = read('content-site/tools/glassmorphism-generator/index.html');
  const scriptContent = read('content-site/tools/glassmorphism-generator/script.js');

  test('background preset buttons have type, aria-label, group role, and aria-pressed attributes', () => {
    expect(html).toContain(
      '<div class="bg-selector" role="group" aria-label="Canvas background presets">'
    );
    const bgBtns = html.match(/<button[^>]*class="[^"]*bg-btn[^"]*"[^>]*>/g) || [];
    expect(bgBtns.length).toBe(5);
    bgBtns.forEach(btn => {
      expect(btn).toContain('type="button"');
      expect(btn).toMatch(/aria-label="[^"]+ background"/);
      expect(btn).toMatch(/aria-pressed="(true|false)"/);
    });
  });

  test('clicking preset button toggles active class and updates aria-pressed', () => {
    document.body.innerHTML = `
      <input type="range" id="blurSlider" value="12">
      <input type="range" id="opacitySlider" value="0.25">
      <input type="range" id="borderWidthSlider" value="1">
      <input type="range" id="borderOpacitySlider" value="0.15">
      <input type="range" id="radiusSlider" value="16">
      <input type="range" id="shadowOpacitySlider" value="0.20">
      <input type="color" id="glassColor" value="#ffffff">
      <input type="text" id="glassColorHex" value="#ffffff">
      <input type="color" id="borderColor" value="#ffffff">
      <input type="text" id="borderColorHex" value="#ffffff">
      <span id="blurVal"></span>
      <span id="opacityVal"></span>
      <span id="borderWidthVal"></span>
      <span id="borderOpacityVal"></span>
      <span id="radiusVal"></span>
      <span id="shadowOpacityVal"></span>
      <div id="glassCard"></div>
      <div id="canvasBox" class="canvas-container bg-neon"></div>
      <pre id="cssOutput"></pre>
      <pre id="htmlOutput"></pre>
      <button id="btnCopyCss"></button>
      <button id="btnCopyHtml"></button>
      <div class="bg-selector" role="group" aria-label="Canvas background presets">
        <button type="button" class="bg-btn active" data-bg="neon" title="Neon Sunset" aria-label="Neon Sunset background" aria-pressed="true">🌆</button>
        <button type="button" class="bg-btn" data-bg="ocean" title="Deep Sea" aria-label="Deep Sea background" aria-pressed="false">🌊</button>
      </div>
    `;
    window.eval(scriptContent);
    document.dispatchEvent(new Event('DOMContentLoaded'));

    const btns = document.querySelectorAll('.bg-btn');
    const oceanBtn = btns[1];
    expect(btns[0].getAttribute('aria-pressed')).toBe('true');
    expect(oceanBtn.getAttribute('aria-pressed')).toBe('false');

    oceanBtn.click();
    expect(btns[0].classList.contains('active')).toBe(false);
    expect(btns[0].getAttribute('aria-pressed')).toBe('false');
    expect(oceanBtn.classList.contains('active')).toBe(true);
    expect(oceanBtn.getAttribute('aria-pressed')).toBe('true');
    expect(document.getElementById('canvasBox').classList.contains('bg-ocean')).toBe(true);
  });
});
