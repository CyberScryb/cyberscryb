/**
 * Screen Time Reality Check — week, year, lifetime, equivalents, and the page.
 * No network. Hours are the only local write.
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const axe = require('axe-core');
const logic = require('../content-site/tools/screen-time-reality-check/logic');

function byId(items, id) {
  return items.find(item => item.id === id);
}

describe('time math and equivalents', () => {
  test('turns 4 hours a day into a week, a year, and a lifetime', () => {
    const result = logic.compute({
      mode: 'total',
      total: 4,
      age: 30,
      expectancy: 80,
      reclaim: 20,
    });
    expect(result.daily).toBe(4);
    expect(result.week).toBe(28);
    expect(result.month).toBe(120);
    expect(result.yearHours).toBe(1460);
    expect(result.daysPerYear).toBeCloseTo(1460 / 24, 8);
    expect(result.yearsLeft).toBe(50);
    expect(result.lifetimeYears).toBeCloseTo((4 / 24) * 50, 8);
    expect(result.lifetimeHours).toBe(1460 * 50);
    expect(result.overDay).toBe(false);
    expect(result.dayShareLabel).toBe('16.7% of a 24-hour day');
    expect(result.reclaim.perDay).toBeCloseTo(0.8, 8);
    expect(result.reclaim.perWeek).toBeCloseTo(5.6, 8);
    expect(result.reclaim.daysPerYear).toBeCloseTo(12.166666, 4);
    expect(result.summary).toContain('Daily: 4 hours');
    expect(result.summary).toContain('Week: 28 hours');
    expect(result.summary).toContain('Month: 120 hours (30-day month)');
    expect(result.summary).toContain('Year: 1,460 hours, about 60.8 days (365-day year)');
    expect(result.summary).toContain('Lifetime: about 8.3 years of the 50 years from age 30 to 80');
    expect(result.summary).toContain('Give back 20%: 0.8 hours a day, about 12.2 days a year');
    expect(result.summary).toContain('Entered as one total from a phone report.');
    expect(result.plan.intro).toContain('5.6 hours this week');
    expect(result.plan.intro).toContain('Name the largest slice');
    expect(result.plan.intro).not.toContain('biggest slices');
    expect(result.share).toBe(
      'About 4 hours a day on screens, about 60.8 days a year. Screen Time Reality Check https://cyberscryb.com/tools/screen-time-reality-check/'
    );
  });

  test('states the book, language, marathon, and movie assumptions', () => {
    const result = logic.compute({ mode: 'total', total: 4, age: 30, expectancy: 80, reclaim: 20 });
    const books = byId(result.equivalents, 'books');
    const languages = byId(result.equivalents, 'languages');
    const marathons = byId(result.equivalents, 'marathons');
    const movies = byId(result.equivalents, 'movies');
    expect(books.count).toBe(1460 / 8);
    expect(books.valueLabel).toBe('182.5 books');
    expect(books.assumption).toContain('8 hours');
    expect(languages.count).toBeCloseTo(1460 / 600, 8);
    expect(languages.valueLabel).toBe('2.43 languages');
    expect(languages.assumption).toContain('600 hours');
    expect(marathons.count).toBe(1460 / 80);
    expect(marathons.valueLabel).toBe('18.25 marathons');
    expect(marathons.assumption).toContain('80 hours');
    expect(movies.count).toBe(730);
    expect(movies.valueLabel).toBe('730 movies');
    expect(movies.assumption).toContain('2 hours');
    expect(result.summary).toContain(
      'Same year as: 182.5 books, 2.43 languages, 18.25 marathons, 730 movies'
    );
    expect(byId(result.reclaim.equivalents, 'books').valueLabel).toBe('36.5 books');
    expect(byId(result.reclaim.equivalents, 'movies').count).toBe(146);
  });

  test('sums categories, caps a day that runs long, and builds a plan from the largest slices', () => {
    const sample = logic.compute(logic.sampleInput());
    expect(sample.input.mode).toBe('categories');
    expect(sample.daily).toBe(4);
    expect(sample.input.total).toBe(4.5);
    expect(sample.plan.steps.map(step => step.id)).toEqual(['social', 'video', 'games']);
    expect(sample.plan.steps[0].tip).toContain('Two check-ins');
    expect(sample.plan.steps[0].giveback).toContain('1.75 hours back this week');
    expect(sample.plan.intro).toContain('5.6 hours this week');
    expect(sample.summary).toContain('Social: 1.25 hours a day');
    expect(sample.summary).not.toContain('Entered as one total');
    expect(sample.share).not.toContain('Social');

    const tied = logic.compute({
      mode: 'categories',
      hours: { games: 1, messaging: 1, social: 0.25 },
      reclaim: 20,
    });
    expect(tied.plan.steps.map(step => step.id)).toEqual(['games', 'messaging', 'social']);

    const long = logic.compute({
      mode: 'categories',
      hours: { social: 4, video: 4, games: 4, news: 4, messaging: 4, work: 4, other: 4 },
    });
    expect(long.daily).toBe(28);
    expect(long.overDay).toBe(true);
    expect(long.dayShareLabel).toBe('More than a full day');
    expect(long.yearHours).toBe(28 * 365);

    const capped = logic.normalizeInput({
      mode: 'nope',
      hours: { social: 40, video: -2, news: 'nope' },
      total: 30,
      age: 4,
      expectancy: 200,
      reclaim: 99,
    });
    expect(capped.mode).toBe('categories');
    expect(capped.hours.social).toBe(16);
    expect(capped.hours.video).toBe(0);
    expect(capped.hours.news).toBe(0);
    expect(capped.total).toBe(24);
    expect(capped.age).toBe(10);
    expect(capped.expectancy).toBe(120);
    expect(capped.reclaim).toBe(60);

    const spent = logic.compute({ mode: 'total', total: 3, age: 80, expectancy: 80, reclaim: 0 });
    expect(spent.yearsLeft).toBe(0);
    expect(spent.lifetimeYears).toBe(0);
    expect(spent.plan.intro).toContain('0%');
    expect(spent.reclaim.perDay).toBe(0);

    const empty = logic.compute(null);
    expect(empty.daily).toBe(0);
    expect(empty.plan.steps).toEqual([]);
    expect(empty.share).toBe(
      'Screen Time Reality Check https://cyberscryb.com/tools/screen-time-reality-check/'
    );
    expect(JSON.stringify(logic.compute({ hours: { social: '<script>' } }))).not.toContain(
      '<script>'
    );
  });

  test('stores numbers only and drops a tampered or outdated save', () => {
    const payload = logic.storedPayload(logic.sampleInput());
    expect(payload).toEqual({
      v: 1,
      mode: 'categories',
      hours: logic.SAMPLE_HOURS,
      total: 4.5,
      age: 30,
      expectancy: 80,
      reclaim: 20,
    });
    expect(JSON.stringify(payload)).not.toMatch(/tip|summary|book/);
    const restored = logic.normalizeStored({
      v: 1,
      mode: 'total',
      hours: logic.SAMPLE_HOURS,
      total: 2,
      age: 40,
      expectancy: 90,
      reclaim: 22,
      summary: '<script>alert(1)</script>',
    });
    expect(restored.mode).toBe('total');
    expect(restored.total).toBe(2);
    expect(restored.reclaim).toBe(20);
    expect(JSON.stringify(restored)).not.toContain('<script>');
    expect(logic.normalizeStored(null)).toBeNull();
    expect(logic.normalizeStored(['4'])).toBeNull();
    expect(logic.normalizeStored({ v: 2, mode: 'total', hours: {}, total: 4 })).toBeNull();
    expect(logic.normalizeStored({ v: 1, mode: 'categories', hours: null })).toBeNull();
    expect(logic.normalizeStored({ v: 1, mode: 'later', hours: {} })).toBeNull();
  });
});

describe('page and catalog', () => {
  const root = path.join(__dirname, '..');
  const read = file => fs.readFileSync(path.join(root, file), 'utf8');
  const page = read('content-site/tools/screen-time-reality-check/index.html');
  const script = read('content-site/tools/screen-time-reality-check/script.js');
  const source = read('content-site/tools/screen-time-reality-check/logic.js');
  const style = read('content-site/tools/screen-time-reality-check/style.css');

  function boot(options) {
    const opts = options || {};
    const dom = new JSDOM(page, {
      url: 'https://cyberscryb.com/tools/screen-time-reality-check/',
      runScripts: 'outside-only',
    });
    if (opts.stored)
      dom.window.localStorage.setItem('cs_screen_time_v1', JSON.stringify(opts.stored));
    dom.window.matchMedia = () => ({
      matches: opts.reduce !== false,
      addEventListener() {},
      removeEventListener() {},
    });
    dom.window.STLogic = logic;
    dom.window.eval(script);
    if (dom.window.document.readyState === 'loading') {
      dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
    }
    return dom;
  }

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('does not fetch, and the only stored value is the hours', () => {
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
    expect(storeKey).toBe('cs_screen_time_v1');
    expect(storeKey).not.toMatch(/pass(?:wd|word|code|phrase)|secret|oauth|\bmfa\b/i);
    expect(script).toContain('localStorage.removeItem(STORE_KEY)');
    expect(script).toContain('prefers-reduced-motion');
    expect(style).toContain('prefers-reduced-motion');
    expect(style).toContain('position: static');
    expect(page).toContain('data-no-draft');
    expect(page).toContain('aria-live="polite"');
    expect(page).not.toMatch(/type="password"/);
    const description = page.match(/name="description"\s+content="([^"]+)"/)[1];
    expect(description.length).toBeGreaterThanOrEqual(120);
    expect(description.length).toBeLessThanOrEqual(155);
    const title = page.match(/<title>([^<]+)<\/title>/)[1];
    expect(title.length).toBeLessThanOrEqual(60);
    expect(page).toContain('href="https://cyberscryb.com/tools/screen-time-reality-check/"');
    expect(page).toContain('content="https://cyberscryb.com/tools/screen-time-reality-check/"');
    expect(page).toContain(logic.MATH_NOTE.replace(/\s+/g, ' ').slice(0, 40));
    expect(page).not.toMatch(/\b(guilt|shame|addict|waste)\b/i);
    expect(source).not.toMatch(/\b(guilt|shame|addict|waste)\b/i);
  });

  test('fills a sample day, copies it, and clears the save', () => {
    const dom = boot({ reduce: true });
    const doc = dom.window.document;
    const copied = [];
    dom.window.navigator.clipboard = {
      writeText: text => {
        copied.push(text);
        return Promise.resolve();
      },
    };
    expect(doc.querySelector('#st-daily').textContent).toBe('0');
    expect(doc.querySelector('#st-categories').hidden).toBe(false);
    doc.querySelector('#st-sample').click();
    expect(doc.querySelector('#st-daily').textContent).toBe('4');
    expect(doc.querySelector('#st-social-out').textContent).toBe('1 hour 15 min');
    expect(doc.querySelector('#st-week').textContent).toBe('28 hours');
    expect(doc.querySelector('#st-month').textContent).toBe('120 hours');
    expect(doc.querySelector('#st-year').textContent).toBe('1,460 hours');
    expect(doc.querySelector('#st-days').textContent).toBe('60.8 days');
    expect(doc.querySelector('#st-life').textContent).toContain('8.3 years');
    expect(doc.querySelector('#st-life').textContent).toContain('age 30 to 80');
    expect(doc.querySelector('#st-day-share').textContent).toBe('16.7% of a 24-hour day');
    expect(doc.querySelector('#st-equiv').textContent).toContain('182.5 books');
    expect(doc.querySelector('#st-equiv').textContent).toContain('8 hours');
    expect(doc.querySelector('#st-equiv').textContent).toContain('600 hours');
    expect(doc.querySelector('#st-equiv').textContent).toContain('80 hours');
    expect(doc.querySelector('#st-equiv').textContent).toContain('730 movies');
    expect(doc.querySelector('#st-reclaim-result').textContent).toContain('0.8 hours a day');
    expect(doc.querySelector('#st-reclaim-result').textContent).toContain('12.2 days a year');
    expect([...doc.querySelectorAll('#st-plan-steps h3')].map(node => node.textContent)).toEqual([
      'Social',
      'Video',
      'Games',
    ]);
    expect(doc.querySelector('#st-reality').classList.contains('is-fresh')).toBe(false);
    const saved = JSON.parse(dom.window.localStorage.getItem('cs_screen_time_v1'));
    expect(saved.hours.social).toBe(1.25);
    expect(saved.summary).toBeUndefined();

    doc.querySelector('#st-total').value = '5';
    doc.querySelector('input[name="st-mode"][value="total"]').checked = true;
    doc
      .querySelector('input[name="st-mode"][value="total"]')
      .dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    expect(doc.querySelector('#st-categories').hidden).toBe(true);
    expect(doc.querySelector('#st-total-panel').hidden).toBe(false);
    expect(doc.querySelector('#st-daily').textContent).toBe('5');
    expect(doc.querySelector('#st-summary').textContent).toContain('one total from a phone report');

    doc.querySelector('#st-copy').click();
    doc.querySelector('#st-copy-share').click();
    return Promise.resolve().then(() => {
      expect(copied[0]).toContain('1,825 hours');
      expect(copied[1]).toContain('5 hours a day');
      expect(copied[1]).not.toContain('Social');
      doc.querySelector('#st-clear').click();
      expect(dom.window.localStorage.getItem('cs_screen_time_v1')).toBeNull();
      expect(doc.querySelector('#st-daily').textContent).toBe('0');
      expect(doc.querySelector('#st-storage').textContent).toContain('Cleared on this device');
      expect(doc.querySelector('#st-social').value).toBe('0');
      dom.window.close();
    });
  });

  test('restores a save, explains a lifetime of zero, and reports a failed save', () => {
    const dom = boot({
      reduce: false,
      stored: {
        v: 1,
        mode: 'categories',
        hours: logic.SAMPLE_HOURS,
        total: 9,
        age: 30,
        expectancy: 80,
        reclaim: 20,
        summary: '<script>alert(1)</script>',
      },
    });
    const doc = dom.window.document;
    expect(doc.querySelector('#st-daily').textContent).toBe('4');
    expect(doc.body.textContent).not.toContain('<script>');
    doc.querySelector('#st-sample').click();
    expect(doc.querySelector('#st-reality').classList.contains('is-fresh')).toBe(true);

    doc.querySelector('#st-age').value = '90';
    doc.querySelector('#st-age').dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    expect(doc.querySelector('#st-life-note').hidden).toBe(false);
    expect(doc.querySelector('#st-life').textContent).toContain('0 years');

    logic.CATEGORY_IDS.forEach(id => {
      const slider = doc.querySelector('#st-' + id);
      slider.value = '4';
    });
    doc.querySelector('input[name="st-mode"][value="categories"]').checked = true;
    doc.querySelector('#st-other').dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    expect(doc.querySelector('#st-over').hidden).toBe(false);
    expect(doc.querySelector('#st-over').textContent).toContain('more than 24');
    expect(doc.querySelector('#st-daily').textContent).toBe('28');

    dom.window.eval(
      'Object.getPrototypeOf(localStorage).setItem = function () { throw new Error("quota"); };'
    );
    doc.querySelector('#st-sample').click();
    expect(doc.querySelector('#st-storage').textContent).toBe(
      'This browser is not keeping the latest numbers.'
    );
    dom.window.close();

    const ignored = boot({ stored: { v: 2, mode: 'total', hours: {}, total: 8 } });
    expect(ignored.window.document.querySelector('#st-daily').textContent).toBe('0');
    ignored.window.close();
  });

  test('is listed under Life Tools and linked from the related tools', () => {
    const tools = read('content-site/tools.html');
    const home = read('content-site/index.html');
    const sitemap = read('content-site/sitemap.xml');
    const generator = read('generate-pages.js');
    expect(tools).toContain('data-category="life"');
    expect(tools).toContain('href="/tools/screen-time-reality-check/"');
    expect(tools).toContain("'screen-time-reality-check': ['life']");
    expect(tools).toMatch(/'screen-time-reality-check': '[^']*\bscreen time\b/);
    expect(home).toContain('screen-time-reality-check');
    expect(sitemap).toContain('https://cyberscryb.com/tools/screen-time-reality-check/');
    expect(generator.match(/'screen-time-reality-check'/g)).toHaveLength(2);
    expect(read('content-site/llms.txt')).toContain('/tools/screen-time-reality-check/');
    [
      'content-site/tools/sleep-cycle-calculator/index.html',
      'content-site/tools/study-plan-generator/index.html',
      'content-site/tools/digital-footprint/index.html',
      'content-site/tools/which-tech-era/index.html',
    ].forEach(file => {
      expect(read(file)).toContain('/tools/screen-time-reality-check/');
    });
    expect(page).toContain('/tools/sleep-cycle-calculator/');
    expect(page).toContain('/tools/study-plan-generator/');
    expect(page).toContain('/tools/digital-footprint/');
    expect(page).toContain('/tools/which-tech-era/');
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
    expect(hrefs).toContain('/tools/screen-time-reality-check/');
    expect(hrefs).toContain('/tools/budget-planner/');
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
