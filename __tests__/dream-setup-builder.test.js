/**
 * Build Your Dream Setup — totals, ergonomics, validation, and the page.
 * No network. The setup is the only local write.
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const axe = require('axe-core');
const logic = require('../content-site/tools/dream-setup-builder/logic');

function picks(overrides) {
  return Object.assign(logic.defaultPicks(), overrides || {});
}

function richest() {
  const chosen = {};
  logic.CATEGORY_IDS.forEach(id => {
    const top = logic
      .optionsFor(id)
      .slice()
      .sort((a, b) => b.low - a.low || b.high - a.high)[0];
    chosen[id] = top.id;
  });
  return chosen;
}

describe('totals', () => {
  test('starts at zero and sums a coding sample as an estimate range', () => {
    const empty = logic.analyze(logic.defaultState());
    expect(empty.totals).toEqual({ low: 0, high: 0, label: '$0', added: 0 });
    expect(empty.fit.status).toBe('under');
    expect(empty.fit.text).toContain('Starter range of $200–$600');

    const coding = logic.analyze(Object.assign({ budget: 'solid' }, logic.sampleFor('coding')));
    expect(coding.totals).toEqual({ low: 708, high: 1585, label: '$708–$1,585', added: 9 });
    expect(coding.fit.status).toBe('within');
    expect(coding.fit.text).toContain('Solid range of $600–$1,600');
    expect(logic.formatMoney(1600)).toBe('$1,600');
    expect(logic.formatRange(40, 40)).toBe('$40');
  });

  test('classifies under, within, and over against the budget edges', () => {
    const starter = logic.budgetById('starter');
    expect(logic.budgetFit({ low: 0, high: 199 }, starter).status).toBe('under');
    expect(logic.budgetFit({ low: 200, high: 200 }, starter).status).toBe('within');
    expect(logic.budgetFit({ low: 600, high: 900 }, starter).status).toBe('within');
    expect(logic.budgetFit({ low: 601, high: 900 }, starter).status).toBe('over');

    const rich = logic.analyze({ use: 'gaming', budget: 'starter', picks: richest() });
    expect(rich.totals.low).toBeGreaterThan(logic.budgetById('starter').high);
    expect(rich.fit.status).toBe('over');
    expect(rich.fit.text).toContain('above the Starter range');

    const solid = logic.analyze({ use: 'gaming', budget: 'solid', picks: richest() });
    expect(solid.fit.status).toBe('within');
  });

  test('drops an unknown piece back to the baseline instead of inventing a price', () => {
    const result = logic.analyze({
      use: 'nope',
      budget: 'nope',
      picks: { monitor: '<script>', chair: 'mesh' },
    });
    expect(result.use.id).toBe('wfh');
    expect(result.budget.id).toBe('starter');
    expect(result.picks.monitor.id).toBe('laptop');
    expect(result.picks.chair.id).toBe('mesh');
    expect(result.totals.low).toBe(logic.optionById('chair', 'mesh').low);
    expect(result.checklist).not.toContain('<script>');
    expect(result.share).not.toContain('<');
  });
});

describe('ergonomics', () => {
  test('weights the screen, the chair, and the keyboard, and rounds the score', () => {
    expect(Object.values(logic.WEIGHTS).reduce((sum, weight) => sum + weight, 0)).toBe(100);
    const blank = logic.analyze(logic.defaultState());
    expect(blank.ergo.score).toBe(34);
    expect(blank.ergo.band).toEqual({ id: 'rough', label: 'This setup will fight you' });
    expect(blank.ergo.parts.map(part => part.id)).toEqual([
      'monitor',
      'chair',
      'keyboard',
      'mouse',
      'lighting',
    ]);
    expect(blank.ergo.parts.map(part => part.weight)).toEqual([30, 30, 20, 10, 10]);
    expect(blank.ergo.tips.map(part => part.id)).toEqual([
      'monitor',
      'chair',
      'keyboard',
      'mouse',
      'lighting',
    ]);
    expect(blank.ergo.parts.find(part => part.id === 'monitor').tip).toMatch(/eye level/);
    expect(blank.ergo.parts.find(part => part.id === 'keyboard').tip).toMatch(/keyboard/i);

    const coding = logic.analyze(Object.assign({ budget: 'solid' }, logic.sampleFor('coding')));
    expect(coding.ergo.score).toBe(93);
    expect(coding.ergo.band.label).toBe('Easy on the body');
    expect(coding.ergo.tips.map(part => part.id)).toEqual(['monitor', 'chair', 'keyboard']);
  });

  test('gives a drafting stool a bonus only when the desk can rise', () => {
    const standing = logic.analyze({
      use: 'wfh',
      budget: 'solid',
      picks: picks({ chair: 'stool', desk: 'electric' }),
    });
    const fixed = logic.analyze({
      use: 'wfh',
      budget: 'solid',
      picks: picks({ chair: 'stool', desk: 'fixed' }),
    });
    expect(standing.ergo.parts.find(part => part.id === 'chair').score).toBe(70);
    expect(fixed.ergo.parts.find(part => part.id === 'chair').score).toBe(46);
    expect(standing.ergo.score).toBe(49);
    expect(fixed.ergo.score).toBe(41);
    expect(standing.ergo.score).toBeGreaterThan(fixed.ergo.score);
  });
});

describe('vibe and callouts', () => {
  test('names the vibe from the mix, with the stronger read first', () => {
    expect(logic.analyze(logic.defaultState()).vibe).toEqual({ id: 'blank', label: 'Blank slate' });
    expect(
      logic.analyze(Object.assign({ budget: 'solid' }, logic.sampleFor('wfh'))).vibe.label
    ).toBe('Soft desk');
    expect(
      logic.analyze(Object.assign({ budget: 'dream' }, logic.sampleFor('gaming'))).vibe.label
    ).toBe('Night-shift arcade');
    expect(
      logic.analyze(Object.assign({ budget: 'solid' }, logic.sampleFor('creator'))).vibe.label
    ).toBe('Small studio');
    expect(
      logic.analyze(Object.assign({ budget: 'solid' }, logic.sampleFor('coding'))).vibe.label
    ).toBe('Quiet terminal');
    expect(
      logic.analyze(Object.assign({ budget: 'starter' }, logic.sampleFor('student'))).vibe.label
    ).toBe('Dorm command post');

    const calm = logic.analyze({
      use: 'wfh',
      budget: 'dream',
      picks: picks({ chair: 'mesh', desk: 'electric', decor: 'plants-art', lighting: 'ambient' }),
    });
    expect(calm.vibe).toEqual({ id: 'calm', label: 'Calm office' });

    const loft = logic.analyze({
      use: 'student',
      budget: 'solid',
      picks: picks({ decor: 'plants-art', lighting: 'ambient' }),
    });
    expect(loft.vibe).toEqual({ id: 'greenhouse', label: 'Greenhouse loft' });
  });

  test('flags must-haves that are still the piece you already have', () => {
    const blank = logic.analyze(logic.defaultState());
    expect(blank.gaps).toBe(5);
    expect(blank.callouts.filter(row => row.status === 'gap').map(row => row.categoryId)).toEqual([
      'monitor',
      'chair',
      'desk',
      'lighting',
      'camera',
    ]);
    expect(blank.callouts[0].headline).toBe('Must-have still open');
    expect(blank.callouts.some(row => row.status === 'quiet')).toBe(false);

    const coding = logic.analyze(Object.assign({ budget: 'solid' }, logic.sampleFor('coding')));
    expect(coding.gaps).toBe(0);
    expect(coding.callouts.find(row => row.categoryId === 'monitor').status).toBe('met');
    expect(coding.callouts.find(row => row.categoryId === 'monitor').text).toContain(
      '27-inch, 144 Hz'
    );
    expect(coding.callouts.find(row => row.categoryId === 'camera')).toBeUndefined();
    expect(coding.callouts.find(row => row.categoryId === 'decor').status).toBe('extra');
    expect(coding.checklist).toContain('Split keyboard');
    expect(coding.checklist).toContain('Must-have');
    expect(coding.checklist).toContain(logic.ESTIMATE_NOTE);
    expect(coding.checklist).toContain('Using what you have: Built-in camera and mic.');
    expect(coding.share).toBe(
      'Coding setup, Solid budget, estimate $708–$1,585, vibe Quiet terminal. Build Your Dream Setup https://cyberscryb.com/tools/dream-setup-builder/'
    );
    expect(coding.scene.alt).toContain('Monitor: 27-inch, 144 Hz');
    expect(coding.scene.show).toEqual(
      expect.arrayContaining(['mon-one', 'chair-ergo', 'desk-standing', 'key-split', 'mouse-vert'])
    );
    expect(coding.scene.show).not.toContain('desk-lift');
  });
});

describe('data validation', () => {
  test('catalog ids, prices, baselines, and priorities stay consistent', () => {
    expect(new Set(logic.CATEGORY_IDS).size).toBe(logic.CATEGORY_IDS.length);
    logic.CATEGORY_IDS.forEach(id => {
      const options = logic.optionsFor(id);
      const ids = options.map(option => option.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(options.filter(option => option.baseline)).toHaveLength(1);
      options.forEach(option => {
        expect(Number.isInteger(option.low)).toBe(true);
        expect(Number.isInteger(option.high)).toBe(true);
        expect(option.low).toBeGreaterThanOrEqual(0);
        expect(option.high).toBeGreaterThanOrEqual(option.low);
        expect(option.label.length).toBeGreaterThan(0);
        expect(Array.isArray(option.scene)).toBe(true);
      });
      ['monitor', 'chair', 'keyboard', 'mouse', 'lighting'].forEach(scored => {
        if (id !== scored) return;
        options.forEach(option => {
          expect(option.ergo).toBeGreaterThanOrEqual(0);
          expect(option.ergo).toBeLessThanOrEqual(100);
          expect(option.tip.length).toBeGreaterThan(20);
        });
      });
    });
    logic.USES.forEach(use => {
      expect(Object.keys(use.priorities).sort()).toEqual(logic.CATEGORY_IDS.slice().sort());
      logic.CATEGORY_IDS.forEach(id => {
        expect(['must', 'nice', 'optional']).toContain(use.priorities[id]);
        expect(use.reasons[id].length).toBeGreaterThan(20);
      });
      const sample = logic.sampleFor(use.id);
      logic.CATEGORY_IDS.forEach(id => {
        expect(logic.optionById(id, sample.picks[id])).not.toBeNull();
      });
    });
    logic.BUDGETS.forEach(budget => {
      expect(budget.low).toBeLessThan(budget.high);
    });
  });

  test('rejects a bad save and ignores fields that are not part of the setup', () => {
    expect(logic.normalizeStored(null)).toBeNull();
    expect(logic.normalizeStored(['wfh'])).toBeNull();
    expect(logic.normalizeStored({ v: 2, use: 'wfh', budget: 'starter', picks: {} })).toBeNull();
    expect(logic.normalizeStored({ v: 1, use: 'later', budget: 'starter', picks: {} })).toBeNull();
    expect(logic.normalizeStored({ v: 1, use: 'wfh', budget: 'starter', picks: null })).toBeNull();
    expect(
      logic.normalizeStored({
        v: 1,
        use: 'wfh',
        budget: 'starter',
        picks: { monitor: '<script>alert(1)</script>' },
      })
    ).toBeNull();

    const stored = logic.normalizeStored({
      v: 1,
      use: 'coding',
      budget: 'solid',
      picks: logic.sampleFor('coding').picks,
      note: '<script>alert(1)</script>',
    });
    expect(stored.v).toBe(1);
    expect(stored.picks.keyboard).toBe('split');
    expect(JSON.stringify(stored)).not.toContain('<script>');
    expect(Object.keys(stored).sort()).toEqual(['budget', 'picks', 'use', 'v']);

    const partial = logic.normalizeStored({
      v: 1,
      use: 'student',
      budget: 'dream',
      picks: { chair: 'basic' },
    });
    expect(partial.picks.chair).toBe('basic');
    expect(partial.picks.monitor).toBe(logic.defaultPicks().monitor);
  });

  test('copy stays free of brand names and store links', () => {
    const brands =
      /\b(ikea|logitech|herman miller|secretlab|steelcase|razer|corsair|dell|samsung|asus|benq|autonomous|uplift|amazon|best buy|newegg|walmart|keychron|sony|bose|elgato|shure|nvidia|amd|apple)\b/i;
    const blob = JSON.stringify({
      uses: logic.USES,
      budgets: logic.BUDGETS,
      options: logic.OPTIONS,
      note: logic.ESTIMATE_NOTE,
    });
    expect(blob).not.toMatch(brands);
    expect(blob).not.toMatch(/https?:\/\//);
    expect(logic.ESTIMATE_NOTE).toMatch(/planning estimates/);
  });
});

describe('page and catalog', () => {
  const root = path.join(__dirname, '..');
  const read = file => fs.readFileSync(path.join(root, file), 'utf8');
  const page = read('content-site/tools/dream-setup-builder/index.html');
  const script = read('content-site/tools/dream-setup-builder/script.js');
  const source = read('content-site/tools/dream-setup-builder/logic.js');
  const style = read('content-site/tools/dream-setup-builder/style.css');

  function boot(options) {
    const opts = options || {};
    const dom = new JSDOM(page, {
      url: 'https://cyberscryb.com/tools/dream-setup-builder/',
      runScripts: 'outside-only',
    });
    if (opts.stored) {
      dom.window.localStorage.setItem('cs_dream_setup_v1', JSON.stringify(opts.stored));
    }
    dom.window.matchMedia = () => ({
      matches: opts.reduce !== false,
      addEventListener() {},
      removeEventListener() {},
    });
    dom.window.DSLogic = logic;
    dom.window.eval(script);
    return dom;
  }

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('does not fetch, and the only stored value is the setup', () => {
    [script, source].forEach(file => {
      expect(file).not.toMatch(/\bfetch\s*\(/);
      expect(file).not.toMatch(/XMLHttpRequest/);
      expect(file).not.toMatch(/sendBeacon/);
      expect(file).not.toMatch(/\bgtag\s*\(/);
      expect(file).not.toMatch(/innerHTML/);
      expect(file).not.toMatch(/type\s*=\s*['"]password['"]/);
    });
    expect(source).not.toMatch(/localStorage/);
    const storeKey = script.match(/STORE_KEY = '([^']+)'/)[1];
    expect(storeKey).toBe('cs_dream_setup_v1');
    expect(storeKey).not.toMatch(/pass(?:wd|word|code|phrase)|secret|oauth|\bmfa\b/i);
    expect(script).toContain('localStorage.removeItem(STORE_KEY)');
    expect(script).toContain('prefers-reduced-motion');
    expect(style).toContain('prefers-reduced-motion');
    expect(style).toContain('position: static');
    expect(page).toContain('data-no-draft');
    expect(page).toContain('aria-live="polite"');
    expect(page).toContain('role="img"');
    expect(page).toContain('aria-labelledby="ds-scene-text"');
    expect(page).not.toMatch(/type="password"/);
    const description = page.match(/name="description"\s+content="([^"]+)"/)[1];
    expect(description.length).toBeGreaterThanOrEqual(120);
    expect(description.length).toBeLessThanOrEqual(155);
    const title = page.match(/<title>([^<]+)<\/title>/)[1];
    expect(title.length).toBeLessThanOrEqual(60);
    expect(page).toContain('href="https://cyberscryb.com/tools/dream-setup-builder/"');
    expect(page).toContain('content="https://cyberscryb.com/tools/dream-setup-builder/"');
    expect(page.replace(/\s+/g, ' ')).toContain(logic.ESTIMATE_NOTE);
  });

  test('every choice on the page matches the catalog, including the estimate', () => {
    const dom = new JSDOM(page, { runScripts: 'outside-only' });
    const doc = dom.window.document;
    logic.USES.forEach(use => {
      const input = doc.querySelector(`input[name="ds-use"][value="${use.id}"]`);
      expect(input).not.toBeNull();
      expect(input.closest('label').textContent).toContain(use.label);
    });
    logic.BUDGETS.forEach(budget => {
      const input = doc.querySelector(`input[name="ds-budget"][value="${budget.id}"]`);
      expect(input.closest('label').textContent).toContain(
        'Estimate ' + logic.formatRange(budget.low, budget.high)
      );
    });
    logic.CATEGORY_IDS.forEach(id => {
      const radios = [...doc.querySelectorAll(`input[name="ds-${id}"]`)];
      expect(radios.map(node => node.value).sort()).toEqual(
        logic
          .optionsFor(id)
          .map(option => option.id)
          .sort()
      );
      radios.forEach(input => {
        const option = logic.optionById(id, input.value);
        const text = input.closest('label').textContent;
        expect(text).toContain(option.label);
        expect(text).toContain('Estimate ' + logic.formatRange(option.low, option.high));
      });
    });
    expect(doc.querySelectorAll('input[type="radio"]').length).toBeGreaterThan(50);
    expect([...doc.querySelectorAll('button')].every(button => button.type === 'button')).toBe(
      true
    );
    dom.window.close();
  });

  test('fills a sample, copies it, and clears the save', () => {
    const dom = boot({ reduce: true });
    const doc = dom.window.document;
    const copied = [];
    dom.window.navigator.clipboard = {
      writeText: text => {
        copied.push(text);
        return Promise.resolve();
      },
    };
    expect(doc.querySelector('#ds-total').textContent).toBe('$0');
    expect(doc.querySelector('#ds-ergo-score').textContent).toBe('34');
    expect(doc.querySelector('#ds-vibe-label').textContent).toBe('Blank slate');
    expect(doc.querySelector('#ds-scene-text').textContent).toContain('Laptop screen only');
    expect(doc.querySelector('[data-part="mon-laptop"]').hidden).toBe(false);
    expect(doc.querySelector('[data-part="mon-one"]').hidden).toBe(true);
    expect(doc.querySelector('#ds-scene').classList.contains('is-glow')).toBe(false);

    doc.querySelector('input[name="ds-budget"][value="solid"]').checked = true;
    doc
      .querySelector('input[name="ds-budget"][value="solid"]')
      .dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    doc.querySelector('input[name="ds-use"][value="coding"]').checked = true;
    doc
      .querySelector('input[name="ds-use"][value="coding"]')
      .dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    doc.querySelector('#ds-sample').click();

    expect(doc.querySelector('#ds-total').textContent).toBe('$708–$1,585');
    expect(doc.querySelector('#ds-ergo-score').textContent).toBe('93');
    expect(doc.querySelector('#ds-ergo-band').textContent).toBe('Easy on the body');
    expect(doc.querySelector('#ds-vibe-label').textContent).toBe('Quiet terminal');
    expect(doc.querySelector('#ds-fit').dataset.status).toBe('within');
    expect(doc.querySelector('#ds-gaps').textContent).toBe(
      'Every must-have for this use is covered.'
    );
    expect(doc.querySelector('#ds-scene-text').textContent).toContain('Split keyboard');
    expect(doc.querySelector('[data-part="key-split"]').hidden).toBe(false);
    expect(doc.querySelector('[data-part="desk-table"]').hidden).toBe(true);
    expect(doc.querySelector('#ds-meter').getAttribute('aria-valuenow')).toBe('93');
    expect([...doc.querySelectorAll('#ds-tips strong')].map(node => node.textContent)).toEqual([
      'Monitor height',
      'Chair',
      'Keyboard placement',
    ]);
    expect(doc.querySelector('#ds-callouts').textContent).toContain('Must-have covered');
    const saved = JSON.parse(dom.window.localStorage.getItem('cs_dream_setup_v1'));
    expect(saved.picks.keyboard).toBe('split');
    expect(saved.note).toBeUndefined();

    doc.querySelector('#ds-copy').click();
    doc.querySelector('#ds-copy-share').click();
    return Promise.resolve().then(() => {
      expect(copied[0]).toContain('Estimate $708–$1,585');
      expect(copied[0]).toContain(logic.ESTIMATE_NOTE);
      expect(copied[1]).toContain('Quiet terminal');
      expect(copied[1]).not.toContain('<');
      doc.querySelector('#ds-clear').click();
      expect(dom.window.localStorage.getItem('cs_dream_setup_v1')).toBeNull();
      expect(doc.querySelector('#ds-total').textContent).toBe('$0');
      expect(doc.querySelector('#ds-storage').textContent).toContain('Cleared on this device');
      expect(doc.querySelector('input[name="ds-use"][value="wfh"]').checked).toBe(true);
      dom.window.close();
    });
  });

  test('restores a save and reports a failed save', () => {
    const sample = logic.sampleFor('wfh');
    const dom = boot({
      reduce: false,
      stored: {
        v: 1,
        use: 'wfh',
        budget: 'solid',
        picks: sample.picks,
        note: '<script>alert(1)</script>',
      },
    });
    const doc = dom.window.document;
    expect(doc.querySelector('#ds-total').textContent).toBe('$573–$1,410');
    expect(doc.querySelector('#ds-vibe-label').textContent).toBe('Soft desk');
    expect(doc.body.textContent).not.toContain('<script>');
    expect(doc.querySelector('#ds-scene').classList.contains('is-glow')).toBe(true);
    expect(doc.querySelector('#ds-storage').textContent).toContain('Loaded the setup');

    dom.window.eval(
      'Object.getPrototypeOf(localStorage).setItem = function () { throw new Error("quota"); };'
    );
    doc.querySelector('#ds-sample').click();
    expect(doc.querySelector('#ds-storage').textContent).toBe(
      'This browser is not keeping the latest setup.'
    );
    dom.window.close();

    const ignored = boot({
      stored: { v: 2, use: 'coding', budget: 'dream', picks: logic.sampleFor('coding').picks },
    });
    expect(ignored.window.document.querySelector('#ds-total').textContent).toBe('$0');
    ignored.window.close();
  });

  test('is listed under Life Tools and linked from the related tools', () => {
    const tools = read('content-site/tools.html');
    const home = read('content-site/index.html');
    const sitemap = read('content-site/sitemap.xml');
    const generator = read('generate-pages.js');
    expect(tools).toContain('data-category="life"');
    expect(tools).toContain('href="/tools/dream-setup-builder/"');
    expect(tools).toContain("'dream-setup-builder': ['life']");
    expect(tools).toMatch(/'dream-setup-builder': '[^']*\bdream setup\b/);
    expect(home).toContain('dream-setup-builder');
    expect(sitemap).toContain('https://cyberscryb.com/tools/dream-setup-builder/');
    expect(generator.match(/'dream-setup-builder'/g)).toHaveLength(2);
    expect(read('content-site/llms.txt')).toContain('/tools/dream-setup-builder/');
    [
      'content-site/tools/screen-time-reality-check/index.html',
      'content-site/tools/subscription-leak-calculator/index.html',
      'content-site/tools/budget-planner/index.html',
      'content-site/tools/sleep-cycle-calculator/index.html',
      'content-site/tools/which-tech-era/index.html',
    ].forEach(file => {
      expect(read(file)).toContain('/tools/dream-setup-builder/');
    });
    expect(page).toContain('/tools/screen-time-reality-check/');
    expect(page).toContain('/tools/subscription-leak-calculator/');
    expect(page).toContain('/tools/budget-planner/');
    expect(page).toContain('/tools/sleep-cycle-calculator/');
    expect(page).toContain('/tools/which-tech-era/');
    const brands =
      /\b(ikea|logitech|herman miller|secretlab|steelcase|razer|corsair|dell|samsung|asus|benq|amazon|best buy|walmart|keychron|sony|bose|nvidia)\b/i;
    expect(page).not.toMatch(brands);
  });

  test('the Life Tools filter shows this tool', () => {
    const dom = new JSDOM(read('content-site/tools.html'), {
      url: 'https://cyberscryb.com/tools/?cat=life',
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
    expect(hrefs).toContain('/tools/dream-setup-builder/');
    expect(hrefs).toContain('/tools/screen-time-reality-check/');
    expect(hrefs).not.toContain('/tools/base64-tool/');
    expect(hrefs).not.toContain('/tools/which-tech-era/');
    expect(doc.querySelector('[data-category="life"]').getAttribute('aria-pressed')).toBe('true');
    dom.window.close();
  });

  test('has no serious accessibility violations in the static page', async () => {
    const dom = new JSDOM(page, { runScripts: 'outside-only' });
    const results = await axe.run(dom.window.document.documentElement, {
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(results.violations).toEqual([]);
    dom.window.close();
  });
});
