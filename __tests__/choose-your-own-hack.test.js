/**
 * Choose Your Own Hack — story graph, endings, and the browser shell.
 * No network. Discovered ending ids are the only thing the page writes locally.
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const logic = require('../content-site/tools/choose-your-own-hack/logic');

function play(scenario, choiceIds) {
  let state = { scenarioId: scenario.id, nodeId: scenario.start, history: [] };
  choiceIds.forEach(choiceId => {
    const next = logic.applyChoice(scenario, state, choiceId);
    expect(next).not.toBeNull();
    state = next;
  });
  return state;
}

describe('story graph', () => {
  test('has four original scenarios and a shared ending catalog', () => {
    expect(logic.SCENARIOS.map(item => item.id)).toEqual([
      'harborline-text',
      'cedar-wifi',
      'helio-call',
      'no-signal',
    ]);
    expect(logic.endingIds().length).toBeGreaterThanOrEqual(16);
    const ids = logic.SCENARIOS.flatMap(item => Object.keys(item.nodes));
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('every node is reachable, every path ends, and no choice points at a missing node', () => {
    logic.SCENARIOS.forEach(scenario => {
      const report = logic.graphReport(scenario);
      expect(report.deadLinks).toEqual([]);
      expect(report.unreachable).toEqual([]);
      expect(report.cycles).toEqual([]);
      expect(report.deadEnds).toEqual([]);
      expect(report.ok).toBe(true);

      const endings = new Set(logic.endingIds(scenario));
      const seen = new Set();
      const walked = logic.paths(scenario);
      expect(walked.length).toBeGreaterThan(8);
      walked.forEach(trail => {
        expect(trail[0]).toBe(scenario.start);
        expect(trail.length).toBeGreaterThan(1);
        const last = logic.getNode(scenario, trail[trail.length - 1]);
        expect(logic.isEnding(last)).toBe(true);
        expect(endings.has(last.id)).toBe(true);
        trail.forEach(id => seen.add(id));
        for (let i = 0; i < trail.length - 1; i++) {
          const node = logic.getNode(scenario, trail[i]);
          const nextId = trail[i + 1];
          expect((node.choices || []).some(choice => choice.next === nextId)).toBe(true);
        }
      });
      expect([...seen].sort()).toEqual(Object.keys(scenario.nodes).sort());
    });
  });

  test('every choice teaches something, and every scenario can end safe or compromised', () => {
    logic.SCENARIOS.forEach(scenario => {
      const tones = new Set();
      Object.values(scenario.nodes).forEach(node => {
        expect(node.title.length).toBeGreaterThan(3);
        expect(node.body.length).toBeGreaterThan(40);
        if (logic.isEnding(node)) {
          expect(['safe', 'close', 'compromised']).toContain(node.tone);
          expect(node.checklist.length).toBeGreaterThanOrEqual(3);
          expect(node.choices).toEqual([]);
          tones.add(node.tone);
          return;
        }
        expect(node.choices.length).toBeGreaterThanOrEqual(2);
        const choiceIds = node.choices.map(choice => choice.id);
        expect(new Set(choiceIds).size).toBe(choiceIds.length);
        node.choices.forEach(choice => {
          expect(choice.label.length).toBeGreaterThan(8);
          expect(choice.lesson.length).toBeGreaterThan(40);
          expect(['safer', 'riskier']).toContain(choice.tone);
          expect(logic.getNode(scenario, choice.next)).not.toBeNull();
        });
      });
      expect(tones.has('safe')).toBe(true);
      expect(tones.has('compromised')).toBe(true);
    });
  });

  test('a safe path and a bad path recap the lessons without mutating the previous state', () => {
    const scenario = logic.getScenario('harborline-text');
    const start = { scenarioId: scenario.id, nodeId: scenario.start, history: [] };
    const ignored = logic.applyChoice(scenario, start, 'no-such-choice');
    expect(ignored).toBeNull();
    expect(start.history).toEqual([]);

    const safe = play(scenario, ['bank-app', 'bank-app-ignore']);
    const safeRecap = logic.recap(scenario, safe.history);
    expect(safe.nodeId).toBe('bank-end-app');
    expect(safeRecap.tone).toBe('safe');
    expect(safeRecap.lessons).toHaveLength(2);
    expect(safeRecap.steps.map(step => step.choiceId)).toEqual(['bank-app', 'bank-app-ignore']);
    expect(safeRecap.checklist.length).toBeGreaterThanOrEqual(3);

    const burned = play(scenario, ['bank-tap', 'bank-type']);
    const burnedRecap = logic.recap(scenario, burned.history);
    expect(burnedRecap.endingId).toBe('bank-end-typed');
    expect(burnedRecap.tone).toBe('compromised');
    expect(logic.recap(scenario, safe.history).endingId).toBe('bank-end-app');

    const line = logic.shareLine(
      scenario,
      logic.getNode(scenario, 'bank-end-app'),
      1,
      logic.endingIds().length
    );
    expect(line).toContain('The app you already had');
    expect(line).toContain('The Text From Harborline');
    expect(line).toContain(`1/${logic.endingIds().length}`);
    expect(line).toContain(logic.SHARE_URL);
  });

  test('local ending memory keeps known ids only', () => {
    expect(logic.unpackFound('not-json')).toEqual([]);
    expect(logic.unpackFound({ endings: ['bank-end-app', 'bank-end-app', 'nope', 4] })).toEqual([
      'bank-end-app',
    ]);
    const packed = logic.packFound(['wifi-end-cell', 'made-up', 'wifi-end-cell']);
    expect(JSON.parse(packed)).toEqual({ endings: ['wifi-end-cell'] });
  });
});

describe('page and catalog', () => {
  const root = path.join(__dirname, '..');
  const read = file => fs.readFileSync(path.join(root, file), 'utf8');
  const page = read('content-site/tools/choose-your-own-hack/index.html');
  const script = read('content-site/tools/choose-your-own-hack/script.js');
  const source = read('content-site/tools/choose-your-own-hack/logic.js');
  const style = read('content-site/tools/choose-your-own-hack/style.css');

  function boot() {
    const dom = new JSDOM(page, {
      url: 'https://cyberscryb.com/tools/choose-your-own-hack/',
      runScripts: 'outside-only',
    });
    dom.window.CYHLogic = logic;
    dom.window.eval(script);
    if (dom.window.document.readyState === 'loading') {
      dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
    }
    return dom;
  }

  test('does not fetch, and stores ending ids rather than the path', () => {
    [script, source].forEach(file => {
      expect(file).not.toMatch(/\bfetch\s*\(/);
      expect(file).not.toMatch(/XMLHttpRequest/);
      expect(file).not.toMatch(/sendBeacon/);
      expect(file).not.toMatch(/\bgtag\s*\(/);
      expect(file).not.toMatch(/innerHTML/);
      expect(file).not.toMatch(/\b(paypal|google|microsoft|apple|amazon|chase)\b/i);
    });
    expect(source).not.toMatch(/localStorage/);
    expect(script).toContain('cs_cyh_endings_v1');
    expect(style).toContain('prefers-reduced-motion');
    const urls = source.match(/https?:\/\/[^\s'")]+/g) || [];
    expect(urls).toEqual([logic.SHARE_URL]);
  });

  test('ships the canonical URL, draft opt-out, and the four doors', () => {
    expect(page).toContain('data-no-draft');
    expect(page).toContain(
      'rel="canonical" href="https://cyberscryb.com/tools/choose-your-own-hack/"'
    );
    expect(page).toContain(
      'property="og:url" content="https://cyberscryb.com/tools/choose-your-own-hack/"'
    );
    expect(page).not.toMatch(/<meta[^>]+name=["']robots["'][^>]+noindex/i);
    const title = page.match(/<title>([^<]+)<\/title>/)[1];
    expect(title.length).toBeLessThanOrEqual(60);
    const description = page.match(/name="description"\s+content="([^"]+)"/)[1];
    expect(description.length).toBeGreaterThanOrEqual(120);
    expect(description.length).toBeLessThanOrEqual(160);
    logic.SCENARIOS.forEach(item => {
      expect(page).toContain(`data-scenario="${item.id}"`);
      expect(page).toContain(item.title.replace(/&/g, '&amp;'));
    });
    expect(page).toContain('/tools/phishing-inbox-simulator/');
    expect(page).toContain('/tools/is-this-link-safe/');
  });

  test('plays a path with the keyboard, then keeps only the ending id', async () => {
    const dom = boot();
    const doc = dom.window.document;
    expect(doc.querySelectorAll('.cyh-card')).toHaveLength(logic.SCENARIOS.length);
    expect(doc.querySelector('#cyh-story').hidden).toBe(true);
    expect(doc.querySelector('#cyh-found').textContent).toContain(
      `0 of ${logic.endingIds().length}`
    );

    doc.querySelector('[data-scenario="harborline-text"]').click();
    expect(doc.querySelector('#cyh-picker').hidden).toBe(true);
    expect(doc.querySelector('#cyh-scene-title').textContent).toBe('A text from Harborline');
    const first = doc.querySelector('[data-choice]');
    first.focus();
    first.dispatchEvent(
      new dom.window.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })
    );
    expect(doc.activeElement.dataset.choice).toBe('bank-call-text');

    doc.querySelector('[data-choice="bank-app"]').click();
    expect(doc.querySelector('#cyh-lesson').hidden).toBe(false);
    expect(doc.querySelector('.cyh-lesson-body').textContent.length).toBeGreaterThan(40);
    expect(doc.querySelector('[data-choice="bank-tap"]').disabled).toBe(true);
    doc.querySelector('#cyh-continue').click();
    doc.querySelector('[data-choice="bank-app-ignore"]').click();
    doc.querySelector('#cyh-continue').click();

    expect(doc.querySelector('#cyh-scene-title').textContent).toBe('The app you already had');
    expect(doc.querySelector('.cyh-tone').textContent).toBe('You stayed safe');
    expect(doc.querySelectorAll('.cyh-recap li')).toHaveLength(2);
    expect(doc.querySelectorAll('.cyh-lessons li').length).toBeGreaterThan(1);
    expect(doc.querySelectorAll('.cyh-check li').length).toBeGreaterThanOrEqual(3);
    const share = doc.querySelector('#cyh-share').textContent;
    expect(share).toContain('The app you already had');
    expect(share).toContain(logic.SHARE_URL);
    expect(share).toContain(`1/${logic.endingIds().length}`);

    const stored = dom.window.localStorage.getItem('cs_cyh_endings_v1');
    expect(JSON.parse(stored)).toEqual({ endings: ['bank-end-app'] });
    expect(stored).not.toContain('password');
    expect(stored).not.toContain('attacker');

    let copied = '';
    dom.window.navigator.clipboard = {
      writeText(text) {
        copied = text;
        return Promise.resolve();
      },
    };
    doc.querySelector('#cyh-copy').click();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(copied).toBe(share);
    expect(doc.querySelector('#cyh-copy-status').textContent).toBe('Copied the share line.');

    doc.querySelector('#cyh-again').click();
    expect(doc.querySelector('#cyh-scene-title').textContent).toBe('A text from Harborline');
    expect(doc.querySelector('.cyh-lesson-body')).toBeNull();
    doc.querySelector('[data-choice="bank-tap"]').click();
    doc.querySelector('#cyh-continue').click();
    doc.querySelector('[data-choice="bank-type"]').click();
    doc.querySelector('#cyh-continue').click();
    expect(doc.querySelector('.cyh-tone').textContent).toBe('In this story, they got in');
    expect(JSON.parse(dom.window.localStorage.getItem('cs_cyh_endings_v1')).endings).toEqual([
      'bank-end-app',
      'bank-end-typed',
    ]);

    doc
      .querySelector('#cyh-menu')
      .dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(doc.querySelector('#cyh-picker').hidden).toBe(false);
    expect(doc.querySelector('[data-score="harborline-text"]').textContent).toContain('2 of');
    dom.window.close();
  });

  test('is listed under Security & Quizzes in the catalog, sitemap, allowlist, and generator', () => {
    const tools = read('content-site/tools.html');
    const home = read('content-site/index.html');
    const sitemap = read('content-site/sitemap.xml');
    const generator = read('generate-pages.js');
    expect(tools).toContain('data-category="security"');
    expect(tools).toContain('Security &amp; Quizzes');
    expect(tools).toContain('href="/tools/choose-your-own-hack/"');
    expect(tools).toContain("'choose-your-own-hack': ['security']");
    expect(home).toContain('choose-your-own-hack');
    expect(sitemap).toContain('https://cyberscryb.com/tools/choose-your-own-hack/');
    expect(generator.match(/'choose-your-own-hack'/g)).toHaveLength(2);
    expect(read('content-site/llms.txt')).toContain('/tools/choose-your-own-hack/');
    expect(read('content-site/tools/phishing-inbox-simulator/index.html')).toContain(
      '/tools/choose-your-own-hack/'
    );
    expect(read('content-site/tools/is-this-link-safe/index.html')).toContain(
      '/tools/choose-your-own-hack/'
    );
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
    expect(hrefs).toContain('/tools/choose-your-own-hack/');
    expect(hrefs).toContain('/tools/phishing-inbox-simulator/');
    expect(hrefs).toContain('/tools/is-this-link-safe/');
    expect(hrefs).not.toContain('/tools/subscription-leak-calculator/');
    expect(doc.querySelector('[data-category="security"]').getAttribute('aria-pressed')).toBe(
      'true'
    );
    dom.window.close();
  });
});
