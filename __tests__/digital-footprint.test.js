/**
 * Digital Footprint Check — scoring, the cleanup plan, and the page.
 * No network. The checklist and checked steps are the only local write.
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const logic = require('../content-site/tools/digital-footprint/logic');

function answersFor(stateId) {
  const answers = {};
  logic.ITEMS.forEach(item => {
    answers[item.id] = stateId;
  });
  return answers;
}

describe('scoring and the cleanup plan', () => {
  test('scores a fully handled checklist as a quiet footprint', () => {
    const result = logic.scoreAudit(answersFor('handled'));
    expect(logic.contentIssues()).toEqual([]);
    expect(result.complete).toBe(true);
    expect(result.score).toBe(0);
    expect(result.max).toBe(54);
    expect(result.percent).toBe(0);
    expect(result.tier).toBe('Quiet footprint');
    expect(result.tierId).toBe('quiet');
    expect(result.fixes).toHaveLength(0);
    expect(result.leads.map(item => item.id)).toEqual([
      'breaches-reuse',
      'breaches-factor',
      'brokers-optout',
    ]);
    expect(result.leads.every(item => item.kind === 'keep')).toBe(true);
    result.leads.forEach(item => {
      expect(item.why.length).toBeGreaterThan(20);
      expect(item.how.length).toBeGreaterThan(20);
      expect(item.links.length).toBeGreaterThan(0);
      expect(item.lead).toBe(true);
    });
    expect(result.areas).toHaveLength(9);
    expect(result.areas.every(area => area.word === 'quiet' && area.score === 0)).toBe(true);
    expect(result.radar.axes.every(axis => axis.ratio === 0)).toBe(true);
  });

  test('puts the three widest exposures first when every row is open', () => {
    const result = logic.scoreAudit(answersFor('open'));
    expect(result.score).toBe(54);
    expect(result.percent).toBe(100);
    expect(result.tier).toBe('Wide open');
    expect(result.fixes).toHaveLength(27);
    expect(result.leads.map(item => item.id)).toEqual([
      'breaches-reuse',
      'breaches-factor',
      'brokers-optout',
    ]);
    expect(result.leads.every(item => item.kind === 'fix' && item.points === 2)).toBe(true);
    const priorities = result.fixes.map(item => item.priority);
    expect(priorities).toEqual(priorities.slice().sort((a, b) => b - a));
    expect(result.radar.axes).toHaveLength(9);
    expect(result.radar.axes.every(axis => axis.ratio === 1)).toBe(true);
    result.radar.axes.forEach(axis => {
      expect(axis.point).toEqual(axis.edge);
    });
    expect(result.areas.every(area => area.score === 6 && area.word === 'open')).toBe(true);
  });

  test('ranks an open row above a partial row with a lower base priority', () => {
    const answers = answersFor('handled');
    answers['brokers-contact'] = 'open';
    answers['breaches-reuse'] = 'partial';
    const mixed = logic.scoreAudit(answers);
    expect(mixed.score).toBe(3);
    expect(mixed.tier).toBe('Quiet footprint');
    expect(mixed.fixes.map(item => item.id)).toEqual(['brokers-contact', 'breaches-reuse']);
    expect(mixed.fixes[0].priority).toBeGreaterThan(mixed.fixes[1].priority);
    expect(mixed.leads.map(item => item.kind)).toEqual(['fix', 'fix', 'keep']);

    const secret = 'jane@example.com';
    const dropped = logic.scoreAudit({
      'social-posts': secret,
      'brokers-optout': 'handled',
      email: secret,
      address: '1 Main Street',
      notes: '<script>alert(1)</script>',
    });
    expect(dropped.answered).toBe(1);
    expect(dropped.score).toBe(0);
    expect(dropped.complete).toBe(false);
    expect(JSON.stringify(dropped.answers)).not.toContain(secret);
    expect(JSON.stringify(dropped.answers)).not.toContain('Main Street');
    expect(JSON.stringify(dropped)).not.toContain('<script>');
  });

  test('names the tiers on the exposure boundaries', () => {
    expect(logic.tierFor(0, 54).id).toBe('quiet');
    expect(logic.tierFor(5, 54).name).toBe('Quiet footprint');
    expect(logic.tierFor(6, 54).name).toBe('Mostly tucked in');
    expect(logic.tierFor(16, 54).name).toBe('Mostly tucked in');
    expect(logic.tierFor(17, 54).name).toBe('Some trails');
    expect(logic.tierFor(30, 54).name).toBe('Some trails');
    expect(logic.tierFor(31, 54).name).toBe('Easy to find');
    expect(logic.tierFor(42, 54).name).toBe('Easy to find');
    expect(logic.tierFor(43, 54).name).toBe('Wide open');
    expect(logic.tierFor(54, 54).name).toBe('Wide open');
    expect(logic.tierFor(-4, 54).name).toBe('Quiet footprint');
    expect(logic.exposureWord(0, 6)).toBe('quiet');
    expect(logic.exposureWord(3, 6)).toBe('some');
    expect(logic.exposureWord(4, 6)).toBe('open');
    expect(logic.exposureWord(null, 6)).toBe('unanswered');
    const factor = logic.itemById('breaches-factor');
    expect(factor.states.find(state => state.id === 'partial').label).toContain('Text messages');
    expect(factor.states.find(state => state.id === 'handled').label).toContain(
      'Not a text message'
    );
    expect(factor.detail).toContain('text message is a partial step');
    const partial = logic.scoreAudit(answersFor('partial'));
    expect(partial.score).toBe(27);
    expect(partial.tier).toBe('Some trails');
  });

  test('stores choice ids and checked step ids, and rebuilds a tampered score', () => {
    const open = logic.scoreAudit(answersFor('open'));
    const payload = logic.storedPayload(answersFor('open'), [
      'breaches-reuse',
      'not-a-step',
      'breaches-reuse',
      '<script>',
    ]);
    expect(payload.v).toBe(1);
    expect(payload.answers).toEqual(answersFor('open'));
    expect(payload.done).toEqual(['breaches-reuse']);
    expect(JSON.stringify(payload)).not.toMatch(/why|how|@|street|password/i);
    expect(logic.storedPayload({}, [])).toBeNull();

    const stored = logic.normalizeStored({
      v: 1,
      answers: answersFor('handled'),
      done: ['breaches-reuse'],
      score: 54,
      tier: 'Wide open',
    });
    expect(stored.score).toBe(0);
    expect(stored.tier).toBe('Quiet footprint');
    expect(stored.done).toEqual([]);
    expect(stored.complete).toBe(true);
    expect(logic.normalizeStored(null)).toBeNull();
    expect(logic.normalizeStored(['handled'])).toBeNull();
    expect(logic.normalizeAnswers({ 'social-posts': 'nope', email: 'a@b.c' })).toEqual({});

    const toggled = logic.toggleDone([], 'brokers-optout', true, open);
    expect(toggled).toEqual(['brokers-optout']);
    expect(logic.toggleDone(toggled, 'brokers-optout', false, open)).toEqual([]);
    expect(logic.filterDone(['jane@example.com', 'apps-unused'], open)).toEqual(['apps-unused']);
  });

  test('writes a share line from the score and not from the answers', () => {
    const line = logic.shareLine({ score: 18, max: 54, tier: 'Some trails' });
    expect(line).toBe(
      'My digital footprint scored 18/54 exposure (Some trails) on the CyberScryb Digital Footprint Check. https://cyberscryb.com/tools/digital-footprint/'
    );
    logic.ITEMS.forEach(item => {
      expect(line).not.toContain(item.prompt);
      item.states.forEach(state => {
        expect(line).not.toContain(state.label);
      });
    });
    expect(line).not.toContain('<');
    expect(logic.shareLine({})).toBe(
      'Digital Footprint Check. https://cyberscryb.com/tools/digital-footprint/'
    );
  });

  test('rejects a question that asks for an identifier', () => {
    expect(logic.asksForIdentity('Type your email')).toBe(true);
    expect(logic.asksForIdentity('Enter your phone number')).toBe(true);
    expect(logic.asksForIdentity('What is your home address')).toBe(true);
    expect(logic.asksForIdentity('Paste your name')).toBe(true);
    expect(logic.asksForIdentity('Do not type a name or an address into this page.')).toBe(false);
    expect(logic.AREAS).toHaveLength(9);
    expect(logic.ITEMS).toHaveLength(27);
    expect(logic.linkIssue('http://haveibeenpwned.com/')).toBe('protocol');
    expect(logic.linkIssue('https://evil.example/opt-out')).toBe('host');
    logic.ITEMS.forEach(item => {
      item.fix.links.concat(item.keep.links).forEach(itemLink => {
        expect(itemLink.href.startsWith('https://')).toBe(true);
        expect(logic.ALLOWED_HOSTS).toContain(new URL(itemLink.href).hostname);
      });
    });
  });
});

describe('page and catalog', () => {
  const root = path.join(__dirname, '..');
  const read = file => fs.readFileSync(path.join(root, file), 'utf8');
  const page = read('content-site/tools/digital-footprint/index.html');
  const script = read('content-site/tools/digital-footprint/script.js');
  const source = read('content-site/tools/digital-footprint/logic.js');
  const style = read('content-site/tools/digital-footprint/style.css');

  function boot(options) {
    const opts = options || {};
    const dom = new JSDOM(page, {
      url: 'https://cyberscryb.com/tools/digital-footprint/',
      runScripts: 'outside-only',
    });
    if (opts.stored) {
      dom.window.localStorage.setItem('cs_footprint_audit_v1', JSON.stringify(opts.stored));
    }
    if (opts.reduce) {
      dom.window.matchMedia = () => ({
        matches: true,
        addEventListener() {},
        removeEventListener() {},
      });
    }
    dom.window.DFLogic = logic;
    dom.window.eval(script);
    if (dom.window.document.readyState === 'loading') {
      dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
    }
    return dom;
  }

  function choose(doc, stateId) {
    doc.querySelectorAll(`input[value="${stateId}"]`).forEach(input => {
      input.checked = true;
      input.dispatchEvent(new doc.defaultView.Event('change', { bubbles: true }));
    });
  }

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('does not fetch, and the only stored fields are choice ids and step ids', () => {
    [script, source].forEach(file => {
      expect(file).not.toMatch(/\bfetch\s*\(/);
      expect(file).not.toMatch(/XMLHttpRequest/);
      expect(file).not.toMatch(/sendBeacon/);
      expect(file).not.toMatch(/\bgtag\s*\(/);
      expect(file).not.toMatch(/innerHTML/);
      expect(file).not.toMatch(/type\s*=\s*['"](?:password|email|tel)['"]/);
    });
    expect(source).not.toMatch(/localStorage/);
    const storeKey = script.match(/STORE_KEY = '([^']+)'/)[1];
    expect(storeKey).toBe('cs_footprint_audit_v1');
    expect(storeKey).not.toMatch(/email|phone|address|name|secret|password/i);
    expect(script).toContain('localStorage.removeItem(STORE_KEY)');
    expect(script).toContain('prefers-reduced-motion');
    expect(style).toContain('prefers-reduced-motion');
    expect(style).toContain('position: static');
    expect(page).toContain('<section class="df-hero">');
    expect(page).not.toContain('<header class="df-hero">');
    expect(page).toContain('aria-live="polite"');
    expect(page).not.toMatch(/type="(?:password|email|tel|text|search|url)"/);
    expect(page).not.toMatch(/<textarea/i);
  });

  test('ships the canonical URL, draft opt-out, and FAQ data', () => {
    expect(page).toContain('data-no-draft');
    expect(page).toContain(
      'rel="canonical" href="https://cyberscryb.com/tools/digital-footprint/"'
    );
    expect(page).toContain(
      'property="og:url" content="https://cyberscryb.com/tools/digital-footprint/"'
    );
    expect(page).toContain('property="og:title"');
    expect(page).toContain('name="twitter:card" content="summary_large_image"');
    expect(page).toContain('"@type": "FAQPage"');
    expect(page).toContain('"@type": "WebApplication"');
    expect(page).not.toMatch(/<meta[^>]+name=["']robots["'][^>]+noindex/i);
    const title = page.match(/<title>([^<]+)<\/title>/)[1];
    expect(title.length).toBeLessThanOrEqual(60);
    expect(title).toContain('Digital Footprint Check');
    const description = page.match(/name="description"\s+content="([^"]+)"/)[1];
    expect(description.length).toBeGreaterThanOrEqual(120);
    expect(description.length).toBeLessThanOrEqual(160);
    expect(source).toContain('https://haveibeenpwned.com/');
    expect(source).toContain('https://myactivity.google.com/results-about-you');
  });

  test('walks the checklist, saves checks, copies the result, and clears it', () => {
    const dom = boot();
    const doc = dom.window.document;
    expect(doc.querySelector('#df-progress').textContent).toBe('Area 1 of 9');
    expect(doc.querySelector('[data-action="back"]')).toBeNull();
    expect(doc.querySelector('[data-action="next"]').disabled).toBe(true);
    expect(doc.querySelector('#df-recall').hidden).toBe(true);
    expect(doc.querySelector('input[type="email"]')).toBeNull();
    expect(doc.querySelector('input[type="text"]')).toBeNull();

    const secret = doc.querySelector('input[type="radio"]');
    const originalValue = secret.value;
    secret.value = 'jane@example.com';
    secret.checked = true;
    secret.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    expect(doc.querySelector('[data-action="next"]').disabled).toBe(true);
    expect(dom.window.localStorage.getItem('cs_footprint_audit_v1')).toBeNull();
    secret.value = originalValue;
    secret.checked = false;

    const firstRow = doc.querySelector('fieldset.df-item');
    doc.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: '2', bubbles: true }));
    expect(firstRow.querySelector('input[value="partial"]').checked).toBe(true);
    firstRow.querySelector('input[value="partial"]').focus();
    doc.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: '1', bubbles: true }));
    expect(firstRow.querySelector('input[value="handled"]').checked).toBe(true);

    for (let area = 0; area < 9; area++) {
      expect(doc.querySelectorAll('fieldset.df-item')).toHaveLength(3);
      choose(doc, 'open');
      expect(doc.querySelector('[data-action="next"]').disabled).toBe(false);
      doc.querySelector('[data-action="next"]').click();
    }

    expect(doc.querySelector('#df-rank').textContent).toBe('Wide open');
    expect(doc.querySelector('#df-score-num').textContent).toContain('54 of 54');
    expect(doc.querySelectorAll('.df-bars li')).toHaveLength(9);
    expect(doc.querySelector('.df-radar')).not.toBeNull();
    expect(doc.querySelectorAll('.df-leads .df-action')).toHaveLength(3);
    expect(doc.querySelector('.df-leads').textContent).toContain('Why');
    expect(doc.querySelector('.df-leads').textContent).toContain('How');
    const official = doc.querySelector('.df-links a');
    expect(official.getAttribute('href')).toMatch(/^https:\/\//);
    expect(official.getAttribute('target')).toBe('_blank');
    expect(official.getAttribute('rel')).toContain('noopener');
    expect(doc.querySelector('#df-share').textContent).toContain(
      'https://cyberscryb.com/tools/digital-footprint/'
    );
    expect(doc.querySelector('.df-checker a').getAttribute('href')).toBe(
      '/tools/password-habit-quiz/'
    );

    const box = doc.querySelector('input[type="checkbox"]');
    const stepId = box.dataset.step;
    box.checked = true;
    box.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    expect(doc.querySelector('#df-done-count').textContent).toContain('1 of 27');
    let saved = JSON.parse(dom.window.localStorage.getItem('cs_footprint_audit_v1'));
    expect(saved.v).toBe(1);
    expect(saved.done).toEqual([stepId]);
    expect(saved.answers['breaches-reuse']).toBe('open');
    expect(JSON.stringify(saved)).not.toContain('jane@');
    expect(JSON.stringify(saved)).not.toContain('Why');

    box.checked = false;
    box.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    saved = JSON.parse(dom.window.localStorage.getItem('cs_footprint_audit_v1'));
    expect(saved.done).toEqual([]);

    let copied = '';
    dom.window.navigator.clipboard = {
      writeText(text) {
        copied = text;
        return Promise.resolve();
      },
    };
    doc.querySelector('[data-action="copy"]').click();
    return Promise.resolve().then(() => {
      expect(copied).toContain('54/54');
      expect(copied).toContain('Wide open');
      expect(copied).not.toContain('Who can see');
      expect(copied).not.toContain('jane@');
      doc.querySelector('[data-action="clear"]').click();
      expect(dom.window.localStorage.getItem('cs_footprint_audit_v1')).toBeNull();
      expect(doc.querySelector('#df-saved').textContent).toContain('Nothing saved');
      expect(doc.querySelector('#df-progress').textContent).toBe('Area 1 of 9');
      expect(doc.querySelector('#df-card input[type="radio"]:checked')).toBeNull();
      dom.window.close();
    });
  });

  test('warns when a cleanup check cannot be saved', () => {
    const dom = boot({ stored: { v: 1, answers: answersFor('open'), done: [] } });
    const doc = dom.window.document;
    doc.querySelector('[data-action="saved"]').click();
    expect(doc.querySelector('#df-saved').textContent).toContain('Saved on this device');
    const proto = Object.getPrototypeOf(dom.window.localStorage);
    const original = proto.setItem;
    proto.setItem = function () {
      throw new Error('blocked');
    };
    try {
      const box = doc.querySelector('input[type="checkbox"]');
      box.checked = true;
      box.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
      expect(doc.querySelector('#df-done-count').textContent).toContain('1 of 27');
      expect(doc.querySelector('#df-saved').textContent).toContain('not keeping the latest');
      expect(doc.querySelector('#df-saved').textContent).not.toContain('Saved on this device');
      expect(doc.querySelector('#df-recall-text').textContent).toContain('not keeping the latest');
    } finally {
      proto.setItem = original;
      dom.window.close();
    }
  });

  test('leaves the saved checklist in place when clearing is blocked', () => {
    const dom = boot({ stored: { v: 1, answers: answersFor('handled'), done: [] } });
    const doc = dom.window.document;
    const proto = Object.getPrototypeOf(dom.window.localStorage);
    const original = proto.removeItem;
    proto.removeItem = function () {
      throw new Error('blocked');
    };
    try {
      doc.querySelector('[data-action="clear"]').click();
      expect(dom.window.localStorage.getItem('cs_footprint_audit_v1')).toContain('"handled"');
      expect(doc.querySelector('#df-recall').hidden).toBe(false);
    } finally {
      proto.removeItem = original;
      dom.window.close();
    }
  });

  test('restores a saved result, continues a partial checklist, and skips motion', () => {
    const quiet = boot({
      reduce: true,
      stored: { v: 1, answers: answersFor('handled'), score: 54, tier: 'Wide open' },
    });
    const quietDoc = quiet.window.document;
    expect(quietDoc.querySelector('#df-card').classList.contains('is-fresh')).toBe(false);
    expect(quietDoc.querySelector('#df-recall').hidden).toBe(false);
    expect(quietDoc.querySelector('#df-recall-text').textContent).toContain('Quiet footprint');
    expect(quietDoc.querySelector('#df-recall-text').textContent).toContain('0 of 54');
    quietDoc.querySelector('[data-action="saved"]').click();
    expect(quietDoc.querySelector('#df-rank').textContent).toBe('Quiet footprint');
    expect(quietDoc.querySelector('#df-done-count').textContent).toContain('Nothing to check off');
    quietDoc.querySelector('[data-action="again"]').click();
    expect(quietDoc.querySelector('#df-progress').textContent).toBe('Area 1 of 9');
    expect(quietDoc.querySelector('input[value="handled"]').checked).toBe(true);
    quiet.window.close();

    const partialAnswers = {};
    logic.AREAS[0].items.forEach(item => {
      partialAnswers[item.id] = 'handled';
    });
    const partial = boot({ stored: { v: 1, answers: partialAnswers, done: [] } });
    const partialDoc = partial.window.document;
    expect(partialDoc.querySelector('#df-progress').textContent).toBe('Area 2 of 9');
    expect(partialDoc.querySelector('[data-action="saved"]').hidden).toBe(true);
    partialDoc.querySelector('[data-action="back"]').click();
    expect(partialDoc.querySelector('#df-progress').textContent).toBe('Area 1 of 9');
    expect(partialDoc.querySelectorAll('input[value="handled"]:checked')).toHaveLength(3);
    partial.window.close();
  });

  test('is listed under Security & Quizzes and cross-linked from the other security tools', () => {
    const tools = read('content-site/tools.html');
    const home = read('content-site/index.html');
    const sitemap = read('content-site/sitemap.xml');
    const generator = read('generate-pages.js');
    expect(tools).toContain('data-category="security"');
    expect(tools).toContain('Security &amp; Quizzes');
    expect(tools).toContain('href="/tools/digital-footprint/"');
    expect(tools).toContain("'digital-footprint': ['security']");
    expect(home).toContain('digital-footprint');
    expect(sitemap).toContain('https://cyberscryb.com/tools/digital-footprint/');
    expect(generator.match(/'digital-footprint'/g)).toHaveLength(2);
    expect(read('content-site/llms.txt')).toContain('/tools/digital-footprint/');
    expect(page).toContain('/tools/password-habit-quiz/');
    expect(page).toContain('/tools/password-checker/');
    expect(page).toContain('/tools/phishing-inbox-simulator/');
    expect(page).toContain('/tools/is-this-link-safe/');
    expect(page).toContain('/tools/tech-myth-or-fact/');
    expect(page).toContain('/tools/choose-your-own-hack/');
    [
      'content-site/tools/password-habit-quiz/index.html',
      'content-site/tools/password-checker/index.html',
      'content-site/tools/phishing-inbox-simulator/index.html',
      'content-site/tools/is-this-link-safe/index.html',
      'content-site/tools/tech-myth-or-fact/index.html',
      'content-site/tools/choose-your-own-hack/index.html',
    ].forEach(file => {
      expect(read(file)).toContain('/tools/digital-footprint/');
    });
  });

  test('the Security & Quizzes filter shows this tool', () => {
    const dom = new JSDOM(read('content-site/tools.html'), {
      url: 'https://cyberscryb.com/tools/?cat=security',
      runScripts: 'outside-only',
    });
    const catalogScript = [...dom.window.document.scripts].find(el =>
      el.textContent.includes('const categoryMapping')
    );
    dom.window.eval(catalogScript.textContent);
    dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
    const doc = dom.window.document;
    const hrefs = [...doc.querySelectorAll('.posts-grid .blog-card')]
      .filter(card => card.style.display !== 'none')
      .map(card => card.querySelector('h3 a').getAttribute('href'));
    expect(hrefs).toContain('/tools/digital-footprint/');
    expect(hrefs).toContain('/tools/password-habit-quiz/');
    expect(hrefs).toContain('/tools/phishing-inbox-simulator/');
    expect(hrefs).not.toContain('/tools/subscription-leak-calculator/');
    expect(doc.querySelector('[data-category="security"]').getAttribute('aria-pressed')).toBe(
      'true'
    );
    dom.window.close();
  });
});
